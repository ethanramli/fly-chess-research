// Independent replay and source binding for v7 train/validation capture flips.
// This proves candidate validity, not exhaustive discovery or learning readiness.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join,relative,resolve,isAbsolute} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';

const {values:a}=parseArgs({options:{batches:{type:'string'},audit:{type:'string'},report:{type:'string'},out:{type:'string'}}});
assert(a.batches&&a.audit&&a.report&&a.out&&!existsSync(a.out));
const root=resolve('.'),sha=value=>createHash('sha256').update(value).digest('hex');
const splits=['train','validation'],task={objective:'capture-retention',plies:1};
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel));return target;}
function read(path,max){const bytes=readFileSync(local(path));assert(bytes.length<=max);return bytes;}
const uci=move=>move.from+move.to+(move.promotion??'');
function pieces(board){return board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&
  {...piece,square:String.fromCharCode(97+col)+(8-row)}).filter(Boolean));}
function legalStatic(board){
  const kings=pieces(board).filter(piece=>piece.type==='k');if(kings.length!==2)return false;
  const side=board.turn(),king=kings.find(piece=>piece.color!==(side));
  return !board.isCheck()&&!board.isAttacked(king.square,side);
}
function outcome(fen,move){
  const board=new Chess(fen),proof=certifyCaptureRetentionAction(board,move,task);
  const checked=checkCaptureRetentionAction(board,move,task,proof);
  assert.equal(checked.verified,true);assert.notEqual(checked.status,'unknown');return checked.status;
}
function relation(from,to){const dx=Math.abs(from.charCodeAt(0)-to.charCodeAt(0)),dy=Math.abs(Number(from[1])-Number(to[1]));
  const kind=dx===0?'file':dy===0?'rank':dx===dy?'diagonal':dx*dy===2?'knight':'other';
  const distance=Math.max(dx,dy),range=distance===1?'one':distance===2?'two':distance>=3?'long':'same';return `${kind}:${range}`;}
function signature(row){
  const move=row.unchangedCapture,from=move.slice(0,2),to=move.slice(2,4),source=new Chess(row.sourceFen);
  const loss=new Chess(row.sourceOutcome==='failure'?row.sourceFen:row.syntheticFen),actor=source.get(from),target=source.get(to);
  assert(actor&&target&&row.changedPiece);const capture=loss.moves({verbose:true}).find(item=>uci(item)===move);
  assert(capture?.captured);loss.move(capture);
  const recaptures=loss.moves({verbose:true}).filter(item=>item.to===to&&item.captured)
    .map(item=>({type:loss.get(item.from).type,side:loss.get(item.from).color===actor.color?'self':'opponent'}))
    .sort((x,y)=>`${x.side}:${x.type}`.localeCompare(`${y.side}:${y.type}`));
  assert(recaptures.length);
  const changed=row.changedPiece;
  return JSON.stringify({transition:`${row.sourceOutcome}-to-${row.counterfactualOutcome}`,
    actor:actor.type,target:target.type,captureGeometry:relation(from,to),
    mutation:{type:changed.type,side:changed.color===actor.color?'self':'opponent',
      fromTarget:relation(changed.from,to),toTarget:relation(changed.to,to),moveGeometry:relation(changed.from,changed.to)},recaptures});
}
function boardMap(board){return new Map(pieces(board).map(piece=>[piece.square,`${piece.color}:${piece.type}`]));}
function verifyMutation(row){
  const before=new Chess(row.sourceFen),after=new Chess(row.syntheticFen),aMap=boardMap(before),bMap=boardMap(after);
  const {from,to,color,type}=row.changedPiece;
  assert.equal(before.turn(),after.turn());assert.equal(before.fen().split(' ')[2],'-');assert.equal(after.fen().split(' ')[2],'-');
  assert.equal(before.fen().split(' ')[3],'-');assert.equal(after.fen().split(' ')[3],'-');
  assert.equal(aMap.get(from),`${color}:${type}`);assert(!aMap.has(to));
  assert(!bMap.has(from));assert.equal(bMap.get(to),`${color}:${type}`);
  aMap.delete(from);aMap.set(to,`${color}:${type}`);assert.deepEqual([...bMap].sort(),[...aMap].sort());
  assert(legalStatic(before)&&legalStatic(after));
  const move=row.unchangedCapture,action=before.moves({verbose:true}).find(item=>uci(item)===move);
  assert(action?.captured);assert(after.moves({verbose:true}).some(item=>uci(item)===move&&item.captured));
  assert.equal(outcome(row.sourceFen,move),row.sourceOutcome);assert.equal(outcome(row.syntheticFen,move),row.counterfactualOutcome);
  assert.notEqual(row.sourceOutcome,row.counterfactualOutcome);
}

function main(){
  const batchBytes=read(join(a.batches,'manifest.json'),16*2**20),pack=JSON.parse(batchBytes);
  const lessonAuditBytes=read(a.audit,2**20),lessonAudit=JSON.parse(lessonAuditBytes);
  assert.equal(pack.phase,'complete');assert.equal(pack.pending,null);
  assert.equal(lessonAudit.schema,'lichess-csv-lesson-batch-audit-v1');assert.equal(lessonAudit.passed,true);
  assert.equal(lessonAudit.batchManifestSha256,sha(batchBytes));assert.equal(lessonAudit.finalSplitInspected,false);
  assert.equal(lessonAudit.sourceHistoryVerified,true);assert.equal(lessonAudit.consequenceCertificatesRechecked,true);
  const byPuzzle=new Map();let sourceRows=0;
  for(const split of splits){
    const entries=pack.completed.filter(row=>row.job.startsWith(`prepare-${split}-`));assert.equal(entries.length,4);
    for(const entry of entries){
      const dir=join(a.batches,`${split}-chunk-${entry.job.slice(-3)}`),manifestBytes=read(join(dir,'manifest.json'),2**20);
      assert.equal(sha(manifestBytes),entry.manifestSha256);const manifest=JSON.parse(manifestBytes);
      assert.equal(manifest.split,split);const lessonBytes=read(join(dir,'lessons.jsonl'),16*2**20);
      assert.equal(sha(lessonBytes),manifest.outputSha256);
      for(const line of lessonBytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
        const record=JSON.parse(line);sourceRows++;assert.equal(record.split,split);
        assert.equal(byPuzzle.has(`${split}:${record.lesson.puzzleId}`),false);
        byPuzzle.set(`${split}:${record.lesson.puzzleId}`,{record,line,chunk:relative(root,dir).replaceAll('\\','/')});
      }
    }
  }
  assert.equal(sourceRows,256);assert(!pack.completed.some(row=>row.job.includes('final')));
  const reportBytes=read(a.report,64*2**20),report=JSON.parse(reportBytes);
  assert.equal(report.schema,'lichess-v7-stage1-capture-counterfactual-feasibility-v1');
  assert.equal(report.inputs.batchManifestSha256,sha(batchBytes));assert.equal(report.inputs.lessonAuditSha256,sha(lessonAuditBytes));
  assert.equal(report.finalSplitInspected,false);const counts={};const groups={};const seen=new Set();
  for(const split of splits){
    const flips=report.bySplit[split]?.flips;assert(Array.isArray(flips));counts[split]={pairs:0,roots:new Set(),games:new Set()};groups[split]=new Map();
    for(const row of flips){
      assert.equal(row.split,split);const source=byPuzzle.get(`${split}:${row.puzzleId}`);assert(source,'Candidate is not in its pinned source split');
      const record=source.record;assert.equal(record.lesson.stage1DomainEligible,true);
      assert.equal(record.lesson.gameId,row.gameId);assert.equal(record.history.puzzleId,row.puzzleId);
      assert.equal(record.history.historyStatus,'verified-standard-start-prefix');
      assert.equal(record.lesson.context.fen,row.sourceFen);
      assert.equal(row.sourceRecordSha256,sha(Buffer.from(source.line)));
      assert.equal(row.sourceChunk,source.chunk);
      const key=[split,row.puzzleId,row.unchangedCapture,row.changedPiece.from,row.changedPiece.to].join(':');
      assert(!seen.has(key),'Duplicate candidate flip');seen.add(key);verifyMutation(row);
      const familySignature=signature(row),familyId=sha(Buffer.from(familySignature)).slice(0,24);
    if(!groups[split].has(familyId))groups[split].set(familyId,{signature:familySignature,games:new Set(),roots:new Set(),pairs:0});
      const family=groups[split].get(familyId);assert.equal(family.signature,familySignature);
      family.games.add(row.gameId);family.roots.add(row.puzzleId);family.pairs++;
      counts[split].pairs++;counts[split].roots.add(row.puzzleId);counts[split].games.add(row.gameId);
    }
    assert.equal(report.bySplit[split].counts.flipPairs,counts[split].pairs);
    assert.equal(report.bySplit[split].counts.rootsWithFlip,counts[split].roots.size);
  }
  const trainSignatures=new Set([...groups.train.values()].map(row=>row.signature));
  const validationSignatures=new Set([...groups.validation.values()].map(row=>row.signature));
  const overlap=[...trainSignatures].filter(value=>validationSignatures.has(value)).length;
  const summary=Object.fromEntries(splits.map(split=>[split,{candidatePairs:counts[split].pairs,
    sourceRoots:counts[split].roots.size,sourceGames:counts[split].games.size,
    proposedFamilies:groups[split].size,
    familiesRepeatedAcrossGames:[...groups[split].values()].filter(row=>row.games.size>=2).length}]));
  const proposedFamilies=Object.fromEntries(splits.map(split=>[split,[...groups[split].entries()]
    .sort(([a],[b])=>a.localeCompare(b)).map(([familyId,row])=>({familyId,signature:row.signature,
      candidatePairs:row.pairs,sourceRoots:[...row.roots].sort(),sourceGames:[...row.games].sort()}))]));
  const result={schema:'lichess-v7-stage1-capture-counterfactual-audit-v1',passed:true,
    batchManifestSha256:sha(batchBytes),lessonAuditSha256:sha(lessonAuditBytes),reportSha256:sha(reportBytes),
    sourceRows,summary,proposedFamilies,proposedSignatureOverlapAcrossSplits:overlap,
    candidateSignatureDisjointness:overlap===0,semanticFamilyDiversityEstablished:false,
    relationFamilyDisjointnessEstablished:false,eligibleForNeuralTeaching:false,graphLaunchAuthorized:false,
    finalSplitInspected:false,neuralEventsDelivered:0,
    scope:'Independent source binding, one-piece mutation verification, and all reported capture consequence replays for train and validation. It does not prove candidate search exhaustiveness, semantic family validity, runtime readiness, neural learning or reasoning.'};
  const out=local(a.out),bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
  writeFileSync(out+'.partial',bytes,{flag:'wx'});renameSync(out+'.partial',out);
  process.stdout.write(JSON.stringify(result)+'\n');
}
main();

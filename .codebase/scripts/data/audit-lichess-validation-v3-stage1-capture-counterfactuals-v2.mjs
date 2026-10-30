// Independent source binding, one-piece mutation check, and legal recapture replay.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join,relative,resolve,isAbsolute} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';

const {values:a}=parseArgs({options:{prepared:{type:'string'},audit:{type:'string'},report:{type:'string'},out:{type:'string'}}});
assert(a.prepared&&a.audit&&a.report&&a.out&&!existsSync(a.out));
const root=resolve('.'),sha=value=>createHash('sha256').update(value).digest('hex'),task={objective:'capture-retention',plies:1};
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel));return target;}
function read(path,max){const bytes=readFileSync(local(path));assert(bytes.length<=max);return bytes;}
const uci=move=>move.from+move.to+(move.promotion??'');
function pieces(board){return board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&
  {...piece,square:String.fromCharCode(97+col)+(8-row)}).filter(Boolean));}
function legalStatic(board){const kings=pieces(board).filter(piece=>piece.type==='k');if(kings.length!==2)return false;
  // The side to move may legally be in check. Only reject a position where
  // the side that just moved left its own king attacked.
  const side=board.turn(),previousMoverKing=kings.find(piece=>piece.color!==(side));
  return !board.isAttacked(previousMoverKing.square,side);}
function outcome(fen,move){const board=new Chess(fen),proof=certifyCaptureRetentionAction(board,move,task);
  const checked=checkCaptureRetentionAction(board,move,task,proof);assert.equal(checked.verified,true);
  assert.notEqual(checked.status,'unknown');return checked.status;}
function relation(from,to){const dx=Math.abs(from.charCodeAt(0)-to.charCodeAt(0)),dy=Math.abs(Number(from[1])-Number(to[1]));
  const kind=dx===0?'file':dy===0?'rank':dx===dy?'diagonal':dx*dy===2?'knight':'other';
  const distance=Math.max(dx,dy),range=distance===1?'one':distance===2?'two':distance>=3?'long':'same';return `${kind}:${range}`;}
function signature(row){const move=row.unchangedCapture,from=move.slice(0,2),to=move.slice(2,4);
  const source=new Chess(row.sourceFen),loss=new Chess(row.sourceOutcome==='failure'?row.sourceFen:row.syntheticFen);
  const actor=source.get(from),target=source.get(to),changed=row.changedPiece;assert(actor&&target&&changed);
  const capture=loss.moves({verbose:true}).find(item=>uci(item)===move);assert(capture?.captured);loss.move(capture);
  const recaptures=loss.moves({verbose:true}).filter(item=>item.to===to&&item.captured)
    .map(item=>({type:loss.get(item.from).type,side:loss.get(item.from).color===actor.color?'self':'opponent'}))
    .sort((x,y)=>`${x.side}:${x.type}`.localeCompare(`${y.side}:${y.type}`));assert(recaptures.length);
  return JSON.stringify({transition:`${row.sourceOutcome}-to-${row.counterfactualOutcome}`,actor:actor.type,target:target.type,
    captureGeometry:relation(from,to),mutation:{type:changed.type,side:changed.color===actor.color?'self':'opponent',
      fromTarget:relation(changed.from,to),toTarget:relation(changed.to,to),moveGeometry:relation(changed.from,changed.to)},recaptures});}
function boardMap(board){return new Map(pieces(board).map(piece=>[piece.square,`${piece.color}:${piece.type}`]));}
function verifyMutation(row){const before=new Chess(row.sourceFen),after=new Chess(row.syntheticFen),aMap=boardMap(before),bMap=boardMap(after);
  const {from,to,color,type}=row.changedPiece;assert.equal(before.turn(),after.turn());
  assert.equal(before.fen().split(' ')[2],'-');assert.equal(after.fen().split(' ')[2],'-');
  assert.equal(before.fen().split(' ')[3],'-');assert.equal(after.fen().split(' ')[3],'-');
  assert.equal(aMap.get(from),`${color}:${type}`);assert(!aMap.has(to));assert(!bMap.has(from));assert.equal(bMap.get(to),`${color}:${type}`);
  aMap.delete(from);aMap.set(to,`${color}:${type}`);assert.deepEqual([...bMap].sort(),[...aMap].sort());
  assert(legalStatic(before)&&legalStatic(after));const move=row.unchangedCapture;
  assert(before.moves({verbose:true}).some(item=>uci(item)===move&&item.captured));
  assert(after.moves({verbose:true}).some(item=>uci(item)===move&&item.captured));
  assert.equal(outcome(row.sourceFen,move),row.sourceOutcome);assert.equal(outcome(row.syntheticFen,move),row.counterfactualOutcome);
  assert.notEqual(row.sourceOutcome,row.counterfactualOutcome);
}

function main(){
  const prepared=local(a.prepared),manifestBytes=read(join(prepared,'manifest.json'),16*2**20),manifest=JSON.parse(manifestBytes);
  const lessonsBytes=read(join(prepared,'lessons.jsonl'),64*2**20),lines=lessonsBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  const auditBytes=read(a.audit,2*2**20),audit=JSON.parse(auditBytes);
  assert.equal(manifest.schema,'lichess-prepared-lessons-v1');assert.equal(manifest.split,'validation');
  assert.equal(manifest.outputSha256,sha(lessonsBytes));assert.equal(manifest.counts.prepared,1022);
  assert.equal(audit.schema,'lichess-validation-lessons-audit-v3');assert.equal(audit.passed,true);
  assert.equal(audit.preparedManifestSha256,sha(manifestBytes));assert.equal(audit.preparedLessonsSha256,sha(lessonsBytes));
  assert.equal(audit.finalSplitInspected,false);assert.equal(audit.eligibleForNeuralTeaching,false);
  assert.equal(audit.graphLaunchAuthorized,false);assert.equal(audit.stage1DomainEligible,192);assert.equal(lines.length,1022);
  const sources=new Map();for(const line of lines){const record=JSON.parse(line);assert.equal(record.split,'validation');
    assert(!sources.has(record.lesson.puzzleId));sources.set(record.lesson.puzzleId,{record,line});}
  const reportBytes=read(a.report,64*2**20),report=JSON.parse(reportBytes);
  assert.equal(report.schema,'lichess-validation-v3-stage1-capture-counterfactual-feasibility-v1');
  assert.equal(report.inputs.preparedManifestSha256,sha(manifestBytes));
  assert.equal(report.inputs.preparedLessonsSha256,sha(lessonsBytes));assert.equal(report.inputs.lessonAuditSha256,sha(auditBytes));
  assert.equal(report.finalSplitInspected,false);const groups=new Map(),seen=new Set();let pairs=0;
  for(const row of report.flips){
    assert.equal(row.split,'validation');const source=sources.get(row.puzzleId);assert(source);
    assert.equal(source.record.lesson.stage1DomainEligible,true);assert.equal(source.record.lesson.gameId,row.gameId);
    assert.equal(source.record.lesson.context.fen,row.sourceFen);assert.equal(source.record.history.historyStatus,'verified-standard-start-prefix');
    assert.equal(row.sourceRecordSha256,sha(Buffer.from(source.line)));
    const key=[row.puzzleId,row.unchangedCapture,row.changedPiece.from,row.changedPiece.to].join(':');assert(!seen.has(key));seen.add(key);
    verifyMutation(row);const relation=signature(row),familyId=sha(Buffer.from(relation)).slice(0,24);
    if(!groups.has(familyId))groups.set(familyId,{signature:relation,pairs:0,roots:new Set(),games:new Set()});
    const family=groups.get(familyId);assert.equal(family.signature,relation);family.pairs++;family.roots.add(row.puzzleId);family.games.add(row.gameId);pairs++;
  }
  assert.equal(pairs,report.counts.flipPairs);assert.equal(seen.size,pairs);
  const proposedFamilies=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([familyId,f])=>({familyId,
    signature:f.signature,candidatePairs:f.pairs,sourceRoots:[...f.roots].sort(),sourceGames:[...f.games].sort()}));
  const result={schema:'lichess-validation-v3-stage1-capture-counterfactual-audit-v1',passed:true,
    preparedManifestSha256:sha(manifestBytes),preparedLessonsSha256:sha(lessonsBytes),lessonAuditSha256:sha(auditBytes),
    reportSha256:sha(reportBytes),validationRows:lines.length,eligibleRoots:audit.stage1DomainEligible,
    candidatePairs:pairs,sourceRoots:new Set(report.flips.map(row=>row.puzzleId)).size,
    sourceGames:new Set(report.flips.map(row=>row.gameId)).size,proposedFamilies,
    familiesRepeatedAcrossGames:proposedFamilies.filter(f=>f.sourceGames.length>=2).length,
    finalSplitInspected:false,semanticFamilyDiversityEstablished:false,relationFamilyDisjointnessEstablished:false,
    eligibleForNeuralTeaching:false,graphLaunchAuthorized:false,neuralEventsDelivered:0,
    scope:'Independent replay of all reported validation counterfactuals and binding to the audited validation source rows. Does not establish search exhaustiveness, matched training separation, semantic family validity, runtime compatibility, learning or reasoning.'};
  const out=local(a.out),bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
  writeFileSync(out+'.partial',bytes,{flag:'wx'});renameSync(out+'.partial',out);process.stdout.write(JSON.stringify(result)+'\n');
}
main();

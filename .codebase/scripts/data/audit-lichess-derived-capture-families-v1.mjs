// Independent replay of the candidate family grouping and legal recapture flips.
// This intentionally duplicates the signature calculation instead of importing
// the preparer; passing it still does not authorize training or graph launch.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';

const {values:a}=parseArgs({options:{report:{type:'string'},'input-audit':{type:'string'},families:{type:'string'},out:{type:'string'}}});
assert(a.report&&a['input-audit']&&a.families&&a.out,'Usage: audit-lichess-derived-capture-families-v1.mjs --report PATH --input-audit PATH --families PATH --out PATH');
assert(process.execArgv.includes('--max-old-space-size=256'),'Pinned 256 MiB heap required');
const root=resolve('.'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const refs={report:{path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-2026-10-23.json',sha256:'107c56b0ad70aeefc2e271aa09a31b6270304a4abd4eaf631a982b88589e2a9e'},
  inputAudit:{path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-audit-v2-2026-10-23.json',sha256:'1c048e484cf74df1bdcd51da98a33a07f06218885968d17e7d5ba220be9ba3c3'}};
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Path escapes repository');return target;}
function read(path,max){const file=local(path);assert(statSync(file).size<=max,`Input exceeds ${max} bytes`);return readFileSync(file);}
function transform(square,kind){const x=square.charCodeAt(0)-97,y=Number(square[1])-1;let u=x,v=y;
  if(kind>=4)u=7-u;for(let i=0;i<kind%4;i++)[u,v]=[7-v,u];return String.fromCharCode(97+u)+String(v+1);}
function expectedSignature(row){
  const move=row.unchangedCapture,from=move.slice(0,2),to=move.slice(2,4);
  const initial=new Chess(row.sourceFen),losing=new Chess(row.sourceOutcome==='failure'?row.sourceFen:row.syntheticFen);
  const actor=initial.get(from),target=initial.get(to),mutation=row.changedPiece;
  assert(actor&&target&&target.color!==actor.color);assert(mutation&&mutation.type!=='k');
  const capture=losing.moves({verbose:true}).find(candidate=>candidate.from+candidate.to+(candidate.promotion??'')===move);
  assert(capture?.captured);losing.move(capture);
  const replies=losing.moves({verbose:true}).filter(candidate=>candidate.to===to&&candidate.captured)
    .map(candidate=>({type:losing.get(candidate.from).type,
      side:losing.get(candidate.from).color===actor.color?'self':'opponent',square:candidate.from}))
    .sort((left,right)=>JSON.stringify(left).localeCompare(JSON.stringify(right)));
  assert(replies.length>0);
  const kings=initial.board().flatMap((rank,row)=>rank.map((piece,col)=>piece?.type==='k'
    ?{side:piece.color===actor.color?'self':'opponent',square:String.fromCharCode(97+col)+String(8-row)}:null).filter(Boolean));
  const alternatives=[];
  for(let symmetry=0;symmetry<8;symmetry++){
    const point=square=>transform(square,symmetry);
    alternatives.push(JSON.stringify({direction:`${row.sourceOutcome}-to-${row.counterfactualOutcome}`,
      actor:{type:actor.type,side:'self',from:point(from)},target:{type:target.type,side:'opponent',to:point(to)},
      mutation:{type:mutation.type,side:mutation.color===actor.color?'self':'opponent',from:point(mutation.from),to:point(mutation.to)},
      recaptures:replies.map(piece=>({type:piece.type,side:piece.side,square:point(piece.square)}))
        .sort((left,right)=>JSON.stringify(left).localeCompare(JSON.stringify(right))),
      kings:kings.map(piece=>({side:piece.side,square:point(piece.square)}))
        .sort((left,right)=>JSON.stringify(left).localeCompare(JSON.stringify(right)))}));
  }
  return alternatives.sort()[0];
}
function directOutcome(fen,move){const board=new Chess(fen),candidate=board.moves({verbose:true}).find(row=>row.from+row.to+(row.promotion??'')===move);
  if(!candidate?.captured)return null;const target=candidate.to;board.move(candidate);
  return board.moves({verbose:true}).some(reply=>reply.to===target&&reply.captured)?'failure':'success';}
function candidateKey(row){return [row.puzzleId,row.gameId,row.unchangedCapture,row.changedPiece.color,row.changedPiece.type,
  row.changedPiece.from,row.changedPiece.to].join(':');}

const reportBytes=read(a.report,64*2**20),sourceAuditBytes=read(a['input-audit'],2*2**20);
assert.equal(sha(reportBytes),refs.report.sha256);assert.equal(sha(sourceAuditBytes),refs.inputAudit.sha256);
const report=JSON.parse(reportBytes),sourceAudit=JSON.parse(sourceAuditBytes);
assert.equal(report.schema,'lichess-derived-capture-counterfactual-feasibility-v1');
assert.equal(sourceAudit.schema,'lichess-derived-capture-counterfactual-feasibility-audit-v1');
assert.equal(sourceAudit.passed,true);assert.equal(sourceAudit.replayedFlips,report.flips.length);
assert.equal(sourceAudit.graphLaunchAuthorized,false);assert.equal(sourceAudit.finalInspected,false);
const manifestBytes=read(join(a.families,'manifest.json'),2*2**20),manifest=JSON.parse(manifestBytes);
assert.equal(manifest.schema,'lichess-derived-capture-family-candidates-v1');
assert.deepEqual(manifest.inputs.report,refs.report);assert.deepEqual(manifest.inputs.independentAudit,refs.inputAudit);
const familiesBytes=read(join(a.families,'families.jsonl'),32*2**20);
assert.equal(sha(familiesBytes),manifest.output.sha256);assert.equal(familiesBytes.length,manifest.output.bytes);
const families=familiesBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
assert.equal(families.length,manifest.output.families);assert.equal(families.length,manifest.counts.candidateFamilies);
const sourceByKey=new Map(report.flips.map(row=>[candidateKey(row),row])),seen=new Set(),ids=new Set(),groups=new Map();let replayed=0;
for(const family of families){
  assert.equal(family.schema,'lichess-derived-capture-relation-candidate-v1');assert(!ids.has(family.familyId));ids.add(family.familyId);
  assert.equal(sha(Buffer.from(family.signature)).slice(0,24),family.familyId);
  assert(Array.isArray(family.candidates)&&family.candidates.length>0);
  const games=new Set();
  for(const row of family.candidates){
    const key=candidateKey(row),source=sourceByKey.get(key);assert(source,'Candidate does not match pinned feasibility report');
    assert(!seen.has(key),'Duplicate candidate across family rows');seen.add(key);
    for(const field of ['sourceFen','syntheticFen','sourceOutcome','counterfactualOutcome','scope'])
      assert.equal(row[field],source[field],`Candidate changed pinned ${field}`);
    assert.equal(directOutcome(row.sourceFen,row.unchangedCapture),row.sourceOutcome);
    assert.equal(directOutcome(row.syntheticFen,row.unchangedCapture),row.counterfactualOutcome);
    assert.notEqual(row.sourceOutcome,row.counterfactualOutcome);
    assert.equal(expectedSignature(row),family.signature,'Independent structural family signature mismatch');
    games.add(row.gameId);replayed++;
  }
  groups.set(family.familyId,games.size);
}
assert.equal(replayed,report.flips.length);assert.equal(seen.size,report.flips.length);
const multiGameFamilies=[...groups.values()].filter(count=>count>=2).length;
assert.equal(multiGameFamilies,manifest.counts.familiesWithAtLeastTwoSourceGames);
const output={schema:'lichess-derived-capture-family-candidate-audit-v1',passed:true,
  inputs:{report:refs.report,independentCounterfactualAudit:refs.inputAudit,
    candidateManifestSha256:sha(manifestBytes),candidateOutputSha256:sha(familiesBytes)},
  candidatePairs:replayed,candidateFamilies:families.length,familiesWithAtLeastTwoSourceGames:multiGameFamilies,
  familySignatureIndependentlyReplayed:true,trainingOnly:true,validationInspected:false,finalInspected:false,
  semanticFamilyDiversityEstablished:false,relationFamilyDisjointnessEstablished:false,
  eligibleForNeuralTeaching:false,graphLaunchAuthorized:false,neuralEventsDelivered:0,
  scope:'Independent replay validates the candidate structural grouping and each previously audited legal recapture flip. The grouping is a proposed data organization, not a validated cognitive primitive; no training eligibility, cross-split disjointness, runtime binding, neural learning or reasoning is established.'};
const outputPath=local(a.out);assert(!existsSync(outputPath),'Preserve existing candidate audit');
writeFileSync(outputPath+'.partial',JSON.stringify(output,null,2)+'\n',{flag:'wx'});renameSync(outputPath+'.partial',outputPath);
process.stdout.write(JSON.stringify({passed:true,candidatePairs:replayed,candidateFamilies:families.length,
  familiesWithAtLeastTwoSourceGames:multiGameFamilies,graphLaunchAuthorized:false})+'\n');

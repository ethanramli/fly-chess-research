// Independent replay of the causal-role candidate grouping; does not import its producer.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';

const {values:a}=parseArgs({options:{report:{type:'string'},'input-audit':{type:'string'},families:{type:'string'},out:{type:'string'}}});
assert(a.report&&a['input-audit']&&a.families&&a.out,'Usage: audit-lichess-derived-capture-families-v2.mjs --report PATH --input-audit PATH --families PATH --out PATH');
assert(process.execArgv.includes('--max-old-space-size=256'),'Pinned 256 MiB heap required');
const root=resolve('.'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const refs={report:{path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-2026-10-23.json',sha256:'107c56b0ad70aeefc2e271aa09a31b6270304a4abd4eaf631a982b88589e2a9e'},
  audit:{path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-audit-v2-2026-10-23.json',sha256:'1c048e484cf74df1bdcd51da98a33a07f06218885968d17e7d5ba220be9ba3c3'}};
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Path escapes repository');return target;}
function read(path,max){const file=local(path);assert(statSync(file).size<=max,`Input exceeds ${max} bytes`);return readFileSync(file);}
function relation(from,to){const dx=Math.abs(from.charCodeAt(0)-to.charCodeAt(0)),dy=Math.abs(Number(from[1])-Number(to[1]));
  const kind=dx===0?'file':dy===0?'rank':dx===dy?'diagonal':dx*dy===2?'knight':'other';
  const distance=Math.max(dx,dy),range=distance===1?'one':distance===2?'two':distance>=3?'long':'same';return `${kind}:${range}`;}
function expectedSignature(row){const move=row.unchangedCapture,from=move.slice(0,2),to=move.slice(2,4);
  const source=new Chess(row.sourceFen),loss=new Chess(row.sourceOutcome==='failure'?row.sourceFen:row.syntheticFen);
  const actor=source.get(from),target=source.get(to),changed=row.changedPiece;assert(actor&&target&&changed);
  const capture=loss.moves({verbose:true}).find(candidate=>candidate.from+candidate.to+(candidate.promotion??'')===move);
  assert(capture?.captured);loss.move(capture);
  const recaptures=loss.moves({verbose:true}).filter(candidate=>candidate.to===to&&candidate.captured)
    .map(candidate=>({type:loss.get(candidate.from).type,side:loss.get(candidate.from).color===actor.color?'self':'opponent'}))
    .sort((x,y)=>`${x.side}:${x.type}`.localeCompare(`${y.side}:${y.type}`));assert(recaptures.length);
  return JSON.stringify({transition:`${row.sourceOutcome}-to-${row.counterfactualOutcome}`,
    actor:actor.type,target:target.type,captureGeometry:relation(from,to),
    mutation:{type:changed.type,side:changed.color===actor.color?'self':'opponent',
      fromTarget:relation(changed.from,to),toTarget:relation(changed.to,to),moveGeometry:relation(changed.from,changed.to)},recaptures});}
function directOutcome(fen,move){const board=new Chess(fen),candidate=board.moves({verbose:true}).find(row=>row.from+row.to+(row.promotion??'')===move);
  if(!candidate?.captured)return null;const target=candidate.to;board.move(candidate);
  return board.moves({verbose:true}).some(reply=>reply.to===target&&reply.captured)?'failure':'success';}
function key(row){return [row.puzzleId,row.gameId,row.unchangedCapture,row.changedPiece.color,row.changedPiece.type,row.changedPiece.from,row.changedPiece.to].join(':');}

const reportBytes=read(a.report,64*2**20),baseAuditBytes=read(a['input-audit'],2*2**20);
assert.equal(sha(reportBytes),refs.report.sha256);assert.equal(sha(baseAuditBytes),refs.audit.sha256);
const report=JSON.parse(reportBytes),baseAudit=JSON.parse(baseAuditBytes);
assert.equal(baseAudit.passed,true);assert.equal(baseAudit.replayedFlips,report.flips.length);
assert.equal(baseAudit.graphLaunchAuthorized,false);assert.equal(baseAudit.finalInspected,false);
const manifestBytes=read(join(a.families,'manifest.json'),2*2**20),manifest=JSON.parse(manifestBytes);
assert.equal(manifest.schema,'lichess-derived-capture-family-candidates-v2');
assert.deepEqual(manifest.inputs,{report:refs.report,independentAudit:refs.audit});
const familyBytes=read(join(a.families,'families.jsonl'),32*2**20);
assert.equal(sha(familyBytes),manifest.output.sha256);assert.equal(familyBytes.length,manifest.output.bytes);
const families=familyBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
assert.equal(families.length,manifest.counts.candidateFamilies);assert.equal(families.length,manifest.output.families);
const sourceRows=new Map(report.flips.map(row=>[key(row),row])),seen=new Set(),familyIds=new Set(),familySizes=new Map();let pairs=0;
for(const family of families){
  assert.equal(family.schema,'lichess-derived-capture-relation-candidate-v2');assert(!familyIds.has(family.familyId));familyIds.add(family.familyId);
  assert.equal(sha(Buffer.from(family.signature)).slice(0,24),family.familyId);
  assert(Array.isArray(family.candidates)&&family.candidates.length>0);const games=new Set();
  for(const row of family.candidates){const candidateKey=key(row),source=sourceRows.get(candidateKey);
    assert(source&&!seen.has(candidateKey));seen.add(candidateKey);
    for(const field of ['sourceFen','syntheticFen','sourceOutcome','counterfactualOutcome','changedPiece','scope'])assert.deepEqual(row[field],source[field]);
    assert.equal(directOutcome(row.sourceFen,row.unchangedCapture),row.sourceOutcome);
    assert.equal(directOutcome(row.syntheticFen,row.unchangedCapture),row.counterfactualOutcome);
    assert.notEqual(row.sourceOutcome,row.counterfactualOutcome);
    assert.equal(expectedSignature(row),family.signature);games.add(row.gameId);pairs++;
  }
  familySizes.set(family.familyId,games.size);
}
assert.equal(pairs,report.flips.length);assert.equal(seen.size,report.flips.length);
const repeated=[...familySizes.values()].filter(size=>size>=2).length;
assert.equal(repeated,manifest.counts.familiesWithAtLeastTwoSourceGames);
const output={schema:'lichess-derived-capture-family-candidate-audit-v2',passed:true,
  inputs:{report:refs.report,independentCounterfactualAudit:refs.audit,candidateManifestSha256:sha(manifestBytes),candidateOutputSha256:sha(familyBytes)},
  candidatePairs:pairs,candidateFamilies:families.length,familiesWithAtLeastTwoSourceGames:repeated,
  familySignatureIndependentlyReplayed:true,trainingOnly:true,validationInspected:false,finalInspected:false,
  semanticFamilyDiversityEstablished:false,relationFamilyDisjointnessEstablished:false,
  eligibleForNeuralTeaching:false,graphLaunchAuthorized:false,neuralEventsDelivered:0,
  scope:'Independent replay of training-only candidate grouping and every legal recapture flip. Family key remains a hypothesis; no split disjointness, runtime compatibility, learning or reasoning is established.'};
const outputPath=local(a.out);assert(!existsSync(outputPath),'Preserve existing candidate audit');
writeFileSync(outputPath+'.partial',JSON.stringify(output,null,2)+'\n',{flag:'wx'});renameSync(outputPath+'.partial',outputPath);
process.stdout.write(JSON.stringify({passed:true,candidatePairs:pairs,candidateFamilies:families.length,
  familiesWithAtLeastTwoSourceGames:repeated,graphLaunchAuthorized:false})+'\n');

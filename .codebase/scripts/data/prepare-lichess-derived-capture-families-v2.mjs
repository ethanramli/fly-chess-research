// Training-only candidate grouping by causal roles and coarse geometry.
// This is a predeclared family hypothesis, not a neural-training authorization.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';

const {values:a}=parseArgs({options:{report:{type:'string'},audit:{type:'string'},out:{type:'string'}}});
assert(a.report&&a.audit&&a.out,'Usage: prepare-lichess-derived-capture-families-v2.mjs --report PATH --audit PATH --out PATH');
assert(process.execArgv.includes('--max-old-space-size=256'),'Pinned 256 MiB heap required');
const root=resolve('.'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const refs={report:{path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-2026-10-23.json',sha256:'107c56b0ad70aeefc2e271aa09a31b6270304a4abd4eaf631a982b88589e2a9e'},
  audit:{path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-audit-v2-2026-10-23.json',sha256:'1c048e484cf74df1bdcd51da98a33a07f06218885968d17e7d5ba220be9ba3c3'}};
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Path escapes repository');return target;}
function read(path,max){const bytes=readFileSync(local(path));assert(bytes.length<=max,`Input exceeds ${max} bytes`);return bytes;}
function relation(from,to){const dx=Math.abs(from.charCodeAt(0)-to.charCodeAt(0)),dy=Math.abs(Number(from[1])-Number(to[1]));
  const kind=dx===0?'file':dy===0?'rank':dx===dy?'diagonal':dx*dy===2?'knight':'other';
  const distance=Math.max(dx,dy),range=distance===1?'one':distance===2?'two':distance>=3?'long':'same';
  return `${kind}:${range}`;}
function signature(row){const move=row.unchangedCapture,from=move.slice(0,2),to=move.slice(2,4);
  const source=new Chess(row.sourceFen),loss=new Chess(row.sourceOutcome==='failure'?row.sourceFen:row.syntheticFen);
  const actor=source.get(from),target=source.get(to),changed=row.changedPiece;
  assert(actor&&target&&changed);const capture=loss.moves({verbose:true}).find(candidate=>candidate.from+candidate.to+(candidate.promotion??'')===move);
  assert(capture?.captured);loss.move(capture);
  const recaptures=loss.moves({verbose:true}).filter(candidate=>candidate.to===to&&candidate.captured)
    .map(candidate=>({type:loss.get(candidate.from).type,side:loss.get(candidate.from).color===actor.color?'self':'opponent'}))
    .sort((x,y)=>`${x.side}:${x.type}`.localeCompare(`${y.side}:${y.type}`));
  assert(recaptures.length);
  return JSON.stringify({transition:`${row.sourceOutcome}-to-${row.counterfactualOutcome}`,
    actor:actor.type,target:target.type,captureGeometry:relation(from,to),
    mutation:{type:changed.type,side:changed.color===actor.color?'self':'opponent',
      fromTarget:relation(changed.from,to),toTarget:relation(changed.to,to),moveGeometry:relation(changed.from,changed.to)},
    recaptures});}
function outcome(fen,move){const board=new Chess(fen),action=board.moves({verbose:true}).find(row=>row.from+row.to+(row.promotion??'')===move);
  if(!action?.captured)return null;const target=action.to;board.move(action);
  return board.moves({verbose:true}).some(reply=>reply.to===target&&reply.captured)?'failure':'success';}

const reportBytes=read(a.report,64*2**20),auditBytes=read(a.audit,2*2**20);
assert.equal(sha(reportBytes),refs.report.sha256);assert.equal(sha(auditBytes),refs.audit.sha256);
const report=JSON.parse(reportBytes),audit=JSON.parse(auditBytes);
assert.equal(report.schema,'lichess-derived-capture-counterfactual-feasibility-v1');
assert.equal(audit.schema,'lichess-derived-capture-counterfactual-feasibility-audit-v1');
assert.equal(audit.passed,true);assert.equal(audit.graphLaunchAuthorized,false);assert.equal(audit.finalInspected,false);
const groups=new Map();
for(const row of report.flips){
  assert.equal(outcome(row.sourceFen,row.unchangedCapture),row.sourceOutcome);
  assert.equal(outcome(row.syntheticFen,row.unchangedCapture),row.counterfactualOutcome);
  const relationKey=signature(row),familyId=sha(Buffer.from(relationKey)).slice(0,24);
  if(!groups.has(familyId))groups.set(familyId,{schema:'lichess-derived-capture-relation-candidate-v2',familyId,signature:relationKey,candidates:[]});
  groups.get(familyId).candidates.push(row);
}
const families=[...groups.values()].sort((x,y)=>x.familyId.localeCompare(y.familyId));
const repeated=families.filter(family=>new Set(family.candidates.map(row=>row.gameId)).size>=2).length;
const outputDir=local(a.out);assert(!existsSync(outputDir),'Preserve existing output');mkdirSync(outputDir,{recursive:false});
const output=join(outputDir,'families.jsonl'),text=families.map(row=>JSON.stringify(row)).join('\n')+'\n';
assert(Buffer.byteLength(text)<=32*2**20);writeFileSync(output+'.partial',text,{flag:'wx'});renameSync(output+'.partial',output);
const manifest={schema:'lichess-derived-capture-family-candidates-v2',status:'candidate-preparation-complete',
  inputs:{report:refs.report,independentAudit:refs.audit},
  familyDefinition:'Candidate grouping by consequence-flip direction, actor/target piece types, legal recapturer types, and coarse geometry of the capture and relocated piece relative to the target. Exact coordinates are omitted. This is a proposed task-specific relation grouping, not a validated cognitive primitive.',
  counts:{candidatePairs:report.flips.length,candidateFamilies:families.length,familiesWithAtLeastTwoSourceGames:repeated,
    byTransition:Object.fromEntries(Object.entries(report.counts.byStratum).sort())},
  output:{path:relative(root,output).replaceAll('\\','/'),sha256:sha(Buffer.from(text)),bytes:Buffer.byteLength(text),families:families.length},
  trainingOnly:true,validationInspected:false,finalInspected:false,semanticFamilyDiversityEstablished:false,
  relationFamilyDisjointnessEstablished:false,eligibleForNeuralTeaching:false,graphLaunchAuthorized:false,neuralEventsDelivered:0,
  scope:'Candidate family organization of previously independently replayed training-only static positions. No split audit, runtime compatibility, learning or reasoning is established.'};
const manifestPath=join(outputDir,'manifest.json');writeFileSync(manifestPath+'.partial',JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});renameSync(manifestPath+'.partial',manifestPath);
process.stdout.write(JSON.stringify({status:manifest.status,...manifest.counts,graphLaunchAuthorized:false})+'\n');

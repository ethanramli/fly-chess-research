// Group the already-audited training-only static counterfactuals by a
// symmetry-canonical focal-relation signature. This is candidate data only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';

const {values:a}=parseArgs({options:{report:{type:'string'},audit:{type:'string'},out:{type:'string'}}});
assert(a.report&&a.audit&&a.out,'Usage: prepare-lichess-derived-capture-families-v1.mjs --report PATH --audit PATH --out PATH');
assert(process.execArgv.includes('--max-old-space-size=256'),'Pinned 256 MiB heap required');
const root=resolve('.'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const refs={report:{path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-2026-10-23.json',sha256:'107c56b0ad70aeefc2e271aa09a31b6270304a4abd4eaf631a982b88589e2a9e'},
  audit:{path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-audit-v2-2026-10-23.json',sha256:'1c048e484cf74df1bdcd51da98a33a07f06218885968d17e7d5ba220be9ba3c3'}};
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Path escapes repository');return target;}
function read(path,max){const bytes=readFileSync(local(path));assert(bytes.length<=max,`Input exceeds ${max} bytes`);return bytes;}
function transform(square,kind){const x=square.charCodeAt(0)-97,y=Number(square[1])-1;let u=x,v=y;
  if(kind>=4)u=7-u;for(let i=0;i<kind%4;i++)[u,v]=[7-v,u];return String.fromCharCode(97+u)+String(v+1);}
function relationSignature(row){
  const capture=row.unchangedCapture,from=capture.slice(0,2),to=capture.slice(2,4);
  const source=new Chess(row.sourceFen),variant=new Chess(row.syntheticFen),loss=new Chess(row.sourceOutcome==='failure'?row.sourceFen:row.syntheticFen);
  const actor=source.get(from),target=source.get(to),changed=row.changedPiece;
  assert(actor&&target?.color!==actor.color);assert(changed&&changed.type!=='k');
  const lossActor=loss.get(from);assert(lossActor&&lossActor.color===actor.color);
  const action=loss.moves({verbose:true}).find(move=>move.from+move.to+(move.promotion??'')===capture);
  assert(action?.captured);loss.move(action);
  const recaptures=loss.moves({verbose:true}).filter(move=>move.to===to&&move.captured)
    .map(move=>({type:loss.get(move.from).type,side:loss.get(move.from).color===actor.color?'self':'opponent',square:move.from}))
    .sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
  assert(recaptures.length>0);
  const kings=source.board().flatMap((rank,r)=>rank.map((piece,c)=>piece?.type==='k'
    ?{side:piece.color===actor.color?'self':'opponent',square:String.fromCharCode(97+c)+String(8-r)}:null).filter(Boolean));
  const base={direction:`${row.sourceOutcome}-to-${row.counterfactualOutcome}`,
    actor:{type:actor.type,side:'self',from},target:{type:target.type,side:'opponent',to},
    mutation:{type:changed.type,side:changed.color===actor.color?'self':'opponent',from:changed.from,to:changed.to},
    recaptures:recaptures.map(({type,side,square})=>({type,side,square})),kings};
  const alternatives=[];
  for(let kind=0;kind<8;kind++){
    const point=square=>transform(square,kind);
    alternatives.push(JSON.stringify({direction:base.direction,
      actor:{type:actor.type,side:'self',from:point(from)},target:{type:target.type,side:'opponent',to:point(to)},
      mutation:{type:changed.type,side:base.mutation.side,from:point(changed.from),to:point(changed.to)},
      recaptures:base.recaptures.map(piece=>({type:piece.type,side:piece.side,square:point(piece.square)})).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y))),
      kings:kings.map(piece=>({side:piece.side,square:point(piece.square)})).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)))}));
  }
  return alternatives.sort()[0];
}
function outcome(fen,move){const board=new Chess(fen),action=board.moves({verbose:true}).find(row=>row.from+row.to+(row.promotion??'')===move);
  if(!action?.captured)return null;const target=action.to;board.move(action);
  return board.moves({verbose:true}).some(reply=>reply.to===target&&reply.captured)?'failure':'success';}

const reportBytes=read(a.report,64*2**20),auditBytes=read(a.audit,2*2**20);
assert.equal(sha(reportBytes),refs.report.sha256);assert.equal(sha(auditBytes),refs.audit.sha256);
const report=JSON.parse(reportBytes),audit=JSON.parse(auditBytes);
assert.equal(report.schema,'lichess-derived-capture-counterfactual-feasibility-v1');
assert.equal(audit.schema,'lichess-derived-capture-counterfactual-feasibility-audit-v1');
assert.equal(audit.passed,true);assert.equal(audit.replayedFlips,report.flips.length);
assert.equal(audit.graphLaunchAuthorized,false);assert.equal(audit.finalInspected,false);
const groups=new Map();
for(const row of report.flips){
  assert.equal(outcome(row.sourceFen,row.unchangedCapture),row.sourceOutcome);
  assert.equal(outcome(row.syntheticFen,row.unchangedCapture),row.counterfactualOutcome);
  assert.notEqual(row.sourceOutcome,row.counterfactualOutcome);
  const signature=relationSignature(row),familyId=sha(Buffer.from(signature)).slice(0,24);
  if(!groups.has(familyId))groups.set(familyId,{schema:'lichess-derived-capture-relation-candidate-v1',familyId,signature,candidates:[]});
  groups.get(familyId).candidates.push({...row,sourceFen:row.sourceFen,syntheticFen:row.syntheticFen});
}
const families=[...groups.values()].sort((x,y)=>x.familyId.localeCompare(y.familyId));
const qualifying=families.filter(family=>new Set(family.candidates.map(row=>row.gameId)).size>=2);
const outputDir=local(a.out);assert(!existsSync(outputDir),'Preserve existing output');mkdirSync(outputDir,{recursive:false});
const output=join(outputDir,'families.jsonl'),partial=output+'.partial';
const text=families.map(row=>JSON.stringify(row)).join('\n')+'\n';assert(Buffer.byteLength(text)<=32*2**20);
writeFileSync(partial,text,{flag:'wx'});renameSync(partial,output);
const manifest={schema:'lichess-derived-capture-family-candidates-v1',status:'candidate-preparation-complete',
  inputs:{report:{...refs.report},independentAudit:{...refs.audit}},
  familyDefinition:'Candidate structural families group pairs by the symmetry-canonical geometry of the capturing actor, target, one-piece mutation, legal recapturer(s), kings, and consequence-flip direction. Non-focal board pieces are treated as distractors. This is a proposed grouping rule, not a validated cognitive primitive.',
  counts:{candidatePairs:report.flips.length,candidateFamilies:families.length,
    familiesWithAtLeastTwoSourceGames:qualifying.length,
    byTransition:Object.fromEntries(Object.entries(report.counts.byStratum).sort())},
  output:{path:relative(root,output).replaceAll('\\','/'),sha256:sha(Buffer.from(text)),bytes:Buffer.byteLength(text),families:families.length},
  sourceGamesAndTrainingOnly:true,validationInspected:false,finalInspected:false,
  structuralFamilyDiversityEstablished:false,relationFamilyDisjointnessEstablished:false,
  eligibleForNeuralTeaching:false,graphLaunchAuthorized:false,neuralEventsDelivered:0,
  scope:'Training-only structural-family candidates derived from previously audited static counterfactuals. No lesson package, split audit, authentic synthetic-history binding, runtime compatibility, neural teaching or reasoning is established.'};
const manifestPath=join(outputDir,'manifest.json'),manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
writeFileSync(manifestPath+'.partial',manifestBytes,{flag:'wx'});renameSync(manifestPath+'.partial',manifestPath);
process.stdout.write(JSON.stringify({status:manifest.status,...manifest.counts,graphLaunchAuthorized:false})+'\n');

// Independently replay validation-only counterfactual branch families.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,statSync,writeFileSync,renameSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {checkLegalBranchContrast} from '../../src/puzzle-learning/lichess-branch-contrast-check-v2.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{prepared:{type:'string'},audit:{type:'string'},families:{type:'string'},out:{type:'string'}}});
assert(a.prepared&&a.audit&&a.families&&a.out&&!existsSync(a.out)&&process.execArgv.includes('--max-old-space-size=256'));
const root=resolve('.'),started=performance.now(),cpuStart=process.cpuUsage();let lastCpu=process.cpuUsage(),peakRss=0;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function local(path){const actual=resolve(path),delta=relative(root,actual);assert(!isAbsolute(delta)&&delta!=='..'&&!delta.startsWith('..\\')&&!delta.startsWith('../'),'Path escapes workspace');return actual;}
function read(path,max=64*2**20){path=local(path);assert(statSync(path).size<=max,'Audit input exceeds bound');return readFileSync(path);}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'Audit resource guard');assert(performance.now()-started<=600000,'Audit elapsed bound');}
const pace=makeCpuDutyPacer(0.5,guard);
async function paceRow(){guard();const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await pace((used.user+used.system)/1000);guard();}
const preparedBytes=read(join(a.prepared,'manifest.json'),2**20),prepared=JSON.parse(preparedBytes);
const auditBytes=read(a.audit,2**20),audit=JSON.parse(auditBytes);
const familyManifestBytes=read(join(a.families,'manifest.json'),2**20),familyManifest=JSON.parse(familyManifestBytes);
assert.equal(prepared.schema,'lichess-prepared-lessons-v1');assert.equal(prepared.split,'validation');
assert.equal(audit.schema,'lichess-validation-lessons-audit-v3');assert.equal(audit.passed,true);
assert.equal(audit.preparedManifestSha256,sha(preparedBytes));assert.equal(audit.finalSplitInspected,false);
assert.equal(audit.eligibleForNeuralTeaching,false);assert.equal(audit.graphLaunchAuthorized,false);
assert.equal(familyManifest.schema,'lichess-branch-contrast-preparation-v1');assert.equal(familyManifest.split,'validation');
assert.equal(familyManifest.inputs.preparedManifestSha256,sha(preparedBytes));
assert.equal(familyManifest.inputs.auditSha256,sha(auditBytes));assert.equal(familyManifest.finalSplitInspected,false);
assert.equal(familyManifest.neuralEventsDelivered,0);assert.equal(familyManifest.graphLaunchAuthorized,false);
const lessonPath=local(join(a.prepared,'lessons.jsonl')),lessonBytes=read(lessonPath);
assert.equal(sha(lessonBytes),prepared.outputSha256);assert.equal(familyManifest.inputs.lessonsSha256,sha(lessonBytes));
const rows=lessonBytes.toString('utf8').split('\n').filter(Boolean).map(line=>({line,record:JSON.parse(line)}));
const familyBytes=read(join(a.families,'families.jsonl'),32*2**20);assert.equal(sha(familyBytes),familyManifest.outputSha256);
assert.equal(familyBytes.length,familyManifest.outputBytes);assert(familyBytes.length===0||familyBytes.at(-1)===10);
const families=familyBytes.toString('utf8').split('\n').filter(Boolean).map(line=>({line,family:JSON.parse(line)}));
assert.equal(families.length,familyManifest.counts.families);assert(families.length<=familyManifest.bounds.maxFamilies);
const byRecord=new Map(rows.map(({line,record})=>[sha(line),{line,record}])),ids=new Set(),verified=[];
for(const {family} of families){
  guard();assert.equal(family.schema,'lichess-legal-branch-family-v1');assert.equal(family.split,'validation');
  assert.equal(family.stage,1);assert.equal(family.neuralEventsDelivered,0);assert.equal(family.graphLaunchAuthorized,false);
  assert(!ids.has(family.familyId));ids.add(family.familyId);assert.equal(local(family.source.chunk),lessonPath);
  const item=byRecord.get(family.source.recordSha256);assert(item,'Family source row is not in the audited validation lessons');
  const record=item.record,context=record.lesson.context;
  assert.equal(record.split,'validation');assert.equal(record.lesson.stage1DomainEligible,true);
  assert.equal(family.source.puzzleId,record.lesson.puzzleId);assert.equal(family.source.gameId,record.lesson.gameId);
  assert.deepEqual(family.source.rootContext,context);assert.equal(family.source.sourcePgnSha256,record.history.sourcePgnSha256);
  const board=new Chess();board.loadPgn(context.pgn);assert.equal(board.fen(),context.fen);
  assert.equal(board.history({verbose:true})[0].before,DEFAULT_POSITION);
  assert.equal(sha(Buffer.from(board.pgn())),record.history.prefixPgnSha256);
  const checked=checkLegalBranchContrast(board,family,{commonMoveKind:familyManifest.commonMoveKind,
    responseMoveKind:familyManifest.responseMoveKind});
  assert.equal(checked.verified,true);verified.push({familyId:family.familyId,...checked});await paceRow();
}
const result={schema:'lichess-validation-branch-family-audit-v3',passed:true,created:new Date().toISOString(),
  preparedManifestSha256:sha(preparedBytes),lessonAuditSha256:sha(auditBytes),familyManifestSha256:sha(familyManifestBytes),
  familyOutputSha256:sha(familyBytes),validationRows:rows.length,families:verified.length,verified,
  validationLessonContentInspected:true,finalSplitInspected:false,relationFamilyDisjointnessEstablished:false,
  eligibleForNeuralTeaching:false,neuralEventsDelivered:0,graphLaunchAuthorized:false,
  resources:{elapsedSeconds:(performance.now()-started)/1000,peakRssMiB:peakRss/2**20,cpu:process.cpuUsage(cpuStart)},
  scope:'Validation-only legal counterfactual family replay; does not establish cross-split family separation, neural learning, or launch authorization'};
const output=local(a.out),partial=output+'.partial';writeFileSync(partial,JSON.stringify(result,null,2)+'\n',{flag:'wx'});renameSync(partial,output);
console.log(JSON.stringify({passed:true,validationRows:rows.length,families:verified.length,finalSplitInspected:false,graphLaunchAuthorized:false}));

// Independently replay every training-only legal counterfactual family.
// This audit does not establish cross-split separation or authorize learning.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,statSync,writeFileSync,renameSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {checkLichessCounterfactualActionPair} from '../../src/puzzle-learning/lichess-counterfactual-action-pair-check-v1.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{prepared:{type:'string'},audit:{type:'string'},families:{type:'string'},out:{type:'string'}}});
assert(a.prepared&&a.audit&&a.families&&a.out&&!existsSync(a.out)&&process.execArgv.includes('--max-old-space-size=256'));
const root=resolve('.'),started=performance.now(),cpuStart=process.cpuUsage();let lastCpu=process.cpuUsage(),peakRss=0;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function local(path){const actual=resolve(path),delta=relative(root,actual);
  assert(!isAbsolute(delta)&&delta!=='..'&&!delta.startsWith('..\\')&&!delta.startsWith('../'),'Path escapes workspace');return actual;}
function read(path,max=64*2**20){path=local(path);assert(statSync(path).size<=max,'Audit input exceeds bound');return readFileSync(path);}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'Audit resource guard');
  assert(performance.now()-started<=600000,'Audit elapsed bound');}
const pace=makeCpuDutyPacer(0.5,guard);
async function paceRow(){guard();const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await pace((used.user+used.system)/1000);guard();}
const preparedBytes=read(join(a.prepared,'manifest.json'),16*2**20),prepared=JSON.parse(preparedBytes);
const auditBytes=read(a.audit,2*2**20),audit=JSON.parse(auditBytes);
const familyManifestBytes=read(join(a.families,'manifest.json'),2*2**20),familyManifest=JSON.parse(familyManifestBytes);
assert.equal(prepared.schema,'lichess-preparation-batches-v1');assert.equal(prepared.phase,'complete');
assert.equal(audit.schema,'lichess-csv-lesson-batch-audit-v1');assert.equal(audit.passed,true);
assert.equal(audit.batchManifestSha256,sha(preparedBytes));assert.equal(audit.finalSplitInspected,false);
assert.equal(audit.sourceHistoryVerified,true);assert.equal(audit.consequenceCertificatesRechecked,true);
assert.equal(audit.eligibleForNeuralTeaching,false);assert.equal(audit.graphLaunchAuthorized,false);
assert.equal(familyManifest.schema,'lichess-counterfactual-family-preparation-v2');assert.equal(familyManifest.split,'train');
assert.equal(familyManifest.inputs.batchManifestSha256,sha(preparedBytes));
assert.equal(familyManifest.inputs.lessonAuditSha256,sha(auditBytes));
assert.equal(familyManifest.neuralEventsDelivered,0);assert.equal(familyManifest.graphLaunchAuthorized,false);
assert.equal(familyManifest.finalSplitInspected,false);
const chunks=prepared.completed.filter(row=>/^prepare-train-\d{3}$/.test(row.job));assert.equal(chunks.length,4);
const rows=[],chunkHashes=[];
for(const entry of chunks){
  guard();const directory=join(a.prepared,entry.job.replace(/^prepare-train-/,'train-chunk-'));
  const manifestBytes=read(join(directory,'manifest.json'),2**20),manifest=JSON.parse(manifestBytes);
  assert.equal(sha(manifestBytes),entry.manifestSha256);assert.equal(manifest.split,'train');
  const path=local(join(directory,'lessons.jsonl')),bytes=read(path,16*2**20);assert.equal(sha(bytes),manifest.outputSha256);
  const lines=bytes.toString('utf8').split(/\r?\n/).filter(Boolean);assert.equal(lines.length,32);
  chunkHashes.push({job:entry.job,manifestSha256:entry.manifestSha256,lessonsSha256:sha(bytes),rows:lines.length});
  for(const line of lines)rows.push({path,line,record:JSON.parse(line)});
}
assert.equal(rows.length,128);assert.deepEqual(familyManifest.inputs.inputChunks,chunkHashes);
const familiesBytes=read(join(a.families,'families.jsonl'),32*2**20);
assert.equal(sha(familiesBytes),familyManifest.outputSha256);assert.equal(familiesBytes.length,familyManifest.outputBytes);
assert(familiesBytes.length===0||familiesBytes.at(-1)===10);
const families=familiesBytes.toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
assert.equal(families.length,familyManifest.counts.families);assert(families.length<=familyManifest.bounds.maxFamilies);
const byRecord=new Map(rows.map(row=>[sha(Buffer.from(row.line)),row])),ids=new Set(),verified=[];
for(const family of families){
  guard();assert.equal(family.schema,'lichess-legal-counterfactual-family-v2');assert.equal(family.split,'train');
  assert.equal(family.stage,1);assert.equal(family.neuralEventsDelivered,0);assert.equal(family.graphLaunchAuthorized,false);
  assert(!ids.has(family.familyId));ids.add(family.familyId);
  const item=byRecord.get(family.source.recordSha256);assert(item,'Family source row is outside audited training rows');
  assert.equal(local(family.source.chunk),item.path);
  const record=item.record,context=record.lesson.context;
  assert.equal(record.split,'train');assert.equal(record.lesson.stage1DomainEligible,true);
  assert.equal(family.source.puzzleId,record.lesson.puzzleId);assert.equal(family.source.gameId,record.lesson.gameId);
  assert.deepEqual(family.source.rootContext,context);assert.equal(family.source.sourcePgnSha256,record.history.sourcePgnSha256);
  const board=new Chess();board.loadPgn(context.pgn);assert.equal(board.fen(),context.fen);
  assert.equal(board.history({verbose:true})[0].before,DEFAULT_POSITION);
  assert.equal(sha(Buffer.from(context.pgn)),record.history.prefixPgnSha256);
  const checked=checkLichessCounterfactualActionPair(board,family);assert.equal(checked.verified,true);
  verified.push({familyId:family.familyId,...checked});await paceRow();
}
const result={schema:'lichess-training-counterfactual-family-audit-v5',passed:true,created:new Date().toISOString(),
  batchManifestSha256:sha(preparedBytes),lessonAuditSha256:sha(auditBytes),familyManifestSha256:sha(familyManifestBytes),
  familyOutputSha256:sha(familiesBytes),trainingRows:rows.length,families:verified.length,verified,
  trainingLessonContentInspected:true,validationLessonContentInspected:false,finalSplitInspected:false,
  relationFamilyDisjointnessEstablished:false,eligibleForNeuralTeaching:false,neuralEventsDelivered:0,graphLaunchAuthorized:false,
  resources:{elapsedSeconds:(performance.now()-started)/1000,peakRssMiB:peakRss/2**20,cpu:process.cpuUsage(cpuStart)},
  scope:'Independent replay of training-only legal counterfactual families; cross-split family separation, receiver readiness and neural teaching remain unproven.'};
const output=local(a.out),partial=output+'.partial';
writeFileSync(partial,JSON.stringify(result,null,2)+'\n',{flag:'wx'});renameSync(partial,output);
console.log(JSON.stringify({passed:true,trainingRows:rows.length,families:verified.length,
  relationFamilyDisjointnessEstablished:false,graphLaunchAuthorized:false,finalSplitInspected:false}));

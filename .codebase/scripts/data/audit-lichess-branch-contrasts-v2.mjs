// Independent legal derivation replay against an audited source package.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,statSync,realpathSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,join,dirname} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {checkLegalBranchContrast} from '../../src/puzzle-learning/lichess-branch-contrast-check-v2.mjs';
import {makeCpuDutyPacer,publishAtomicJson} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{config:{type:'string'},out:{type:'string'}}});
assert(a.config&&a.out&&!existsSync(a.out));
assert(process.execArgv.includes('--max-old-space-size=256'));
const root=realpathSync('.'),started=performance.now(),cpuStart=process.cpuUsage();
let peakRss=0,lastCpu=process.cpuUsage();
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'Memory guard');
  assert(performance.now()-started<300000,'Audit elapsed bound');}
const pacer=makeCpuDutyPacer(0.5,guard);
async function pace(){const cpu=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await pacer((cpu.user+cpu.system)/1000);guard();}
const sha=b=>createHash('sha256').update(b).digest('hex');
function local(p){const actual=realpathSync(p),delta=relative(root,actual);
  assert(!isAbsolute(delta)&&delta!=='..'&&!delta.startsWith('..\\')&&!delta.startsWith('../'),'Path escapes workspace');return actual;}
function read(p,max=65536){guard();p=local(p);assert(statSync(p).size<=max,'Input size bound');return readFileSync(p);}
const configBytes=read(a.config,2**20),config=JSON.parse(configBytes);
for(const [p,expected] of Object.entries(config.pins)){
  assert.equal(sha(read(p,64*2**20)),expected,'Changed pin: '+p);await pace();
}
const packageBytes=read(config.paths.package,16*2**20),pack=JSON.parse(packageBytes);
const auditBytes=read(config.paths.sourceAudit),audit=JSON.parse(auditBytes);
assert.equal(pack.schema,'lichess-preparation-batches-v1');assert.equal(pack.phase,'complete');
assert.equal(audit.schema,'lichess-csv-lesson-batch-audit-v1');assert.equal(audit.passed,true);
assert.equal(audit.batchManifestSha256,sha(packageBytes));assert.equal(audit.finalSplitInspected,false);
const run=local(config.paths.run),manifestBytes=read(join(run,'manifest.json')),manifest=JSON.parse(manifestBytes);
assert.equal(manifest.schema,'lichess-branch-contrast-preparation-v1');
assert.equal(manifest.inputs.packageSha256,sha(packageBytes));assert.equal(manifest.inputs.auditSha256,sha(auditBytes));
assert.equal(manifest.neuralEventsDelivered,0);assert.equal(manifest.graphLaunchAuthorized,false);
assert.equal(manifest.validationLessonContentInspected,false);assert.equal(manifest.finalSplitInspected,false);
assert(['king','any-quiet'].includes(manifest.commonMoveKind));
assert(Number.isSafeInteger(manifest.counts.families)&&manifest.counts.families>=0&&manifest.counts.families<=16);
const familyBytes=read(join(run,'families.jsonl'),32*2**20);
assert.equal(sha(familyBytes),manifest.outputSha256);assert.equal(familyBytes.length,manifest.outputBytes);
assert(familyBytes.length===0||familyBytes.at(-1)===10,'Truncated family output');
const families=familyBytes.toString('utf8').split('\n').filter(Boolean);
assert.equal(families.length,manifest.counts.families);
const wanted=new Map();const verified=[];const ids=new Set();
for(const line of families){assert(Buffer.byteLength(line)<=2*2**20);const family=JSON.parse(line);
  assert.equal(family.schema,'lichess-legal-branch-family-v1');assert.equal(family.split,'train');assert.equal(family.stage,1);
  assert.equal(family.neuralEventsDelivered,0);assert.equal(family.graphLaunchAuthorized,false);
  assert(!ids.has(family.familyId));ids.add(family.familyId);
  const chunk=local(family.source.chunk);assert.equal(sha(read(chunk,64*2**20)),manifest.inputs.trainingChunks[chunk]);
  const list=wanted.get(chunk)??[];list.push(family);wanted.set(chunk,list);
}
for(const entry of pack.completed){
  const bytes=read(entry.manifest);assert.equal(sha(bytes),entry.manifestSha256);const m=JSON.parse(bytes);
  if(m.split!=='train')continue;
  const path=local(join(dirname(entry.manifest),'lessons.jsonl')),list=wanted.get(path);if(!list)continue;
  const bytesRows=read(path,64*2**20);assert.equal(sha(bytesRows),m.outputSha256);
  for(const line of bytesRows.toString('utf8').split('\n').filter(Boolean)){
    assert(Buffer.byteLength(line)<=2*2**20);const record=JSON.parse(line);
    for(const family of list.filter(f=>f.source.recordSha256===sha(line))){
      assert.equal(record.split,'train');assert.equal(family.source.puzzleId,record.lesson.puzzleId);
      assert.equal(family.source.gameId,record.lesson.gameId);assert.deepEqual(family.source.rootContext,record.lesson.context);
      assert.equal(family.source.sourcePgnSha256,record.history.sourcePgnSha256);
      assert.equal(record.history.historyStatus,'verified-standard-start-prefix');
      const source=new Chess();source.loadPgn(record.lesson.context.pgn);
      assert.equal(source.fen(),record.lesson.context.fen);assert.equal(source.history({verbose:true})[0].before,DEFAULT_POSITION);
      assert.equal(sha(source.pgn()),record.history.prefixPgnSha256);
      const check=checkLegalBranchContrast(source,family,{commonMoveKind:manifest.commonMoveKind,
        responseMoveKind:manifest.responseMoveKind});
      verified.push({familyId:family.familyId,...check});await pace();
    }
  }
  wanted.delete(path);
}
assert.equal(wanted.size,0,'Unregistered source chunk');assert.equal(verified.length,families.length,'Missing or duplicate source record');
guard();publishAtomicJson(resolve(a.out),{schema:'lichess-legal-branch-audit-v1',passed:true,
  configSha256:sha(configBytes),manifestSha256:sha(manifestBytes),verified,
  coverageClaim:'Replayed emitted families only; did not repeat or independently certify search coverage.',
  relationFamilyDisjointnessEstablished:false,graphLaunchAuthorized:false,neuralEventsDelivered:0,finalSplitInspected:false,
  resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20},
  scope:'Audited source-record binding, legal continuations and immediate-task counterfactuals; no neural learning or transfer result.'});
console.log(JSON.stringify({passed:true,families:verified.length,graphLaunchAuthorized:false}));

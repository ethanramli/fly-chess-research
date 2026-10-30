// Independently bind validation-only branch families to audited source rows.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream,readFileSync,statSync,realpathSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,join,dirname} from 'node:path';
import {createInterface} from 'node:readline';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {checkLegalBranchContrast} from '../../src/puzzle-learning/lichess-branch-contrast-check-v2.mjs';
import {makeCpuDutyPacer,publishAtomicJson} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{config:{type:'string'},out:{type:'string'}}});
assert(a.config&&a.out&&!existsSync(a.out)&&process.execArgv.includes('--max-old-space-size=256'));
const root=realpathSync('.'),started=performance.now(),cpuStart=process.cpuUsage();let lastCpu=process.cpuUsage(),peakRss=0;
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'Audit memory guard');
  assert(performance.now()-started<=300000,'Audit elapsed bound');}
const pacer=makeCpuDutyPacer(0.5,guard);
async function pace(){guard();const cpu=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await pacer((cpu.user+cpu.system)/1000);guard();}
const sha=b=>createHash('sha256').update(b).digest('hex');
function local(path){const actual=realpathSync(path),delta=relative(root,actual);
  assert(!isAbsolute(delta)&&delta!=='..'&&!delta.startsWith('..\\')&&!delta.startsWith('../'),'Path escapes workspace');return actual;}
function read(path,max=65536){guard();path=local(path);assert(statSync(path).size<=max,'Audit input bound');return readFileSync(path);}
const configBytes=read(a.config,2**20),config=JSON.parse(configBytes);
for(const [path,expected] of Object.entries(config.pins)){assert.equal(sha(read(path,64*2**20)),expected,'Changed pin: '+path);await pace();}
const packageBytes=read(config.paths.package,16*2**20),pack=JSON.parse(packageBytes);
const sourceAuditBytes=read(config.paths.sourceAudit),sourceAudit=JSON.parse(sourceAuditBytes);
assert.equal(pack.schema,'lichess-preparation-batches-v1');assert.equal(pack.phase,'complete');
assert.equal(sourceAudit.schema,'lichess-csv-lesson-batch-audit-v1');assert.equal(sourceAudit.passed,true);
assert.equal(sourceAudit.batchManifestSha256,sha(packageBytes));assert.equal(sourceAudit.finalSplitInspected,false);
const run=local(config.paths.run),manifestBytes=read(join(run,'manifest.json')),manifest=JSON.parse(manifestBytes);
assert.equal(manifest.schema,'lichess-branch-contrast-preparation-v1');assert.equal(manifest.split,'validation');
assert.equal(manifest.inputs.packageSha256,sha(packageBytes));assert.equal(manifest.inputs.auditSha256,sha(sourceAuditBytes));
assert.equal(manifest.validationLessonContentInspected,true);assert.equal(manifest.finalSplitInspected,false);
assert.equal(manifest.neuralEventsDelivered,0);assert.equal(manifest.graphLaunchAuthorized,false);
const familyBytes=read(join(run,'families.jsonl'),32*2**20);
assert.equal(sha(familyBytes),manifest.outputSha256);assert.equal(familyBytes.length,manifest.outputBytes);
assert(familyBytes.length===0||familyBytes.at(-1)===10,'Truncated family output');
const families=familyBytes.toString('utf8').split('\n').filter(Boolean);
assert.equal(families.length,manifest.counts.families);
const ids=new Set(),needed=new Map(),verified=[];
for(const line of families){
  assert(Buffer.byteLength(line)<=2*2**20);const family=JSON.parse(line);
  assert.equal(family.schema,'lichess-legal-branch-family-v1');assert.equal(family.split,'validation');
  assert.equal(family.stage,1);assert.equal(family.neuralEventsDelivered,0);assert.equal(family.graphLaunchAuthorized,false);
  assert(!ids.has(family.familyId),'Duplicate validation family');ids.add(family.familyId);
  const chunk=local(family.source.chunk);assert.equal(sha(read(chunk,64*2**20)),manifest.inputs.validationChunks[chunk]);
  const key=family.source.recordSha256;const list=needed.get(chunk)??new Map();
  assert(!list.has(key),'Duplicate family source row');list.set(key,family);needed.set(chunk,list);
}
for(const entry of pack.completed){
  const manifestSourceBytes=read(entry.manifest);assert.equal(sha(manifestSourceBytes),entry.manifestSha256);
  const source=JSON.parse(manifestSourceBytes);if(source.split!=='validation')continue;
  const path=local(join(dirname(entry.manifest),'lessons.jsonl')),wanted=needed.get(path);if(!wanted)continue;
  const rows=read(path,64*2**20);assert.equal(sha(rows),source.outputSha256);
  for(const line of rows.toString('utf8').split('\n').filter(Boolean)){
    const family=wanted.get(sha(line));if(!family)continue;
    const record=JSON.parse(line);assert.equal(record.split,'validation');
    assert.equal(record.lesson.stage1DomainEligible,true);
    assert.equal(family.source.puzzleId,record.lesson.puzzleId);assert.equal(family.source.gameId,record.lesson.gameId);
    assert.deepEqual(family.source.rootContext,record.lesson.context);
    assert.equal(family.source.sourcePgnSha256,record.history.sourcePgnSha256);
    assert.equal(record.history.historyStatus,'verified-standard-start-prefix');
    const board=new Chess();board.loadPgn(record.lesson.context.pgn);
    assert.equal(board.fen(),record.lesson.context.fen);assert.equal(board.history({verbose:true})[0].before,DEFAULT_POSITION);
    assert.equal(sha(board.pgn()),record.history.prefixPgnSha256);
    const checked=checkLegalBranchContrast(board,family,{commonMoveKind:manifest.commonMoveKind,
      responseMoveKind:manifest.responseMoveKind});
    assert.equal(checked.verified,true);verified.push({familyId:family.familyId,...checked});wanted.delete(sha(line));await pace();
  }
  assert.equal(wanted.size,0,'Family did not bind exactly one source lesson');needed.delete(path);
}
assert.equal(needed.size,0,'Unregistered validation source chunk');assert.equal(verified.length,families.length);
guard();publishAtomicJson(resolve(a.out),{schema:'lichess-validation-branch-family-audit-v1',passed:true,
  configSha256:sha(configBytes),manifestSha256:sha(manifestBytes),verified,
  validationLessonContentInspected:true,finalSplitInspected:false,
  relationFamilyDisjointnessEstablished:false,graphLaunchAuthorized:false,neuralEventsDelivered:0,
  scope:'Independent validation source/history and exact legal counterfactual replay; does not establish cross-split relation-family disjointness or authorize training.',
  resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20,cpuDuty:0.5}});
console.log(JSON.stringify({passed:true,validationFamilies:verified.length,finalSplitInspected:false,
  relationFamilyDisjointnessEstablished:false,graphLaunchAuthorized:false}));

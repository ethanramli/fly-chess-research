// Build training-only counterfactual families from independently audited lessons.
// This prepares teacher-side stimuli; it does not train or authorize the learner.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFileSync,existsSync,mkdirSync,readFileSync,renameSync,statSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {findLichessCounterfactualActionPair} from '../../src/puzzle-learning/lichess-counterfactual-action-pairs-v2.mjs';
import {makeCpuDutyPacer,publishAtomicJson} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{prepared:{type:'string'},audit:{type:'string'},out:{type:'string'}}});
assert(a.prepared&&a.audit&&a.out&&!existsSync(a.out)&&process.execArgv.includes('--max-old-space-size=256'));
const sha=b=>createHash('sha256').update(b).digest('hex');
function read(path,max){assert(statSync(path).size<=max,`Input exceeds ${max} bytes: ${path}`);return readFileSync(path);}
const packageBytes=read(join(a.prepared,'manifest.json'),16*2**20),pack=JSON.parse(packageBytes);
const auditBytes=read(a.audit,2**20),audit=JSON.parse(auditBytes);
assert.equal(pack.schema,'lichess-preparation-batches-v1');assert.equal(pack.phase,'complete');
assert.equal(pack.pending,null);assert.equal(pack.neuralEventsDelivered,0);assert.equal(pack.graphLaunchAuthorized,false);
assert.equal(audit.schema,'lichess-csv-lesson-batch-audit-v1');assert.equal(audit.passed,true);
assert.equal(audit.batchManifestSha256,sha(packageBytes));assert.equal(audit.finalSplitInspected,false);
assert.equal(audit.sourceHistoryVerified,true);assert.equal(audit.consequenceCertificatesRechecked,true);
assert.equal(audit.totals?.train?.rows,128);
const completed=pack.completed.filter(row=>/^prepare-train-\d{3}$/.test(row.job));
assert.equal(completed.length,4,'Expected the four pinned training chunks');
const records=[],inputChunks=[];
for(const entry of completed){
  // The registered batch producer names its output directories train-chunk-NNN.
  const directory=join(a.prepared,entry.job.replace(/^prepare-train-/,'train-chunk-'));
  const manifestBytes=read(join(directory,'manifest.json'),2**20),manifest=JSON.parse(manifestBytes);
  assert.equal(sha(manifestBytes),entry.manifestSha256);assert.equal(manifest.split,'train');
  const lessonBytes=read(join(directory,'lessons.jsonl'),16*2**20);
  assert.equal(sha(lessonBytes),manifest.outputSha256);
  const lines=lessonBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length,32);inputChunks.push({job:entry.job,manifestSha256:entry.manifestSha256,
    lessonsSha256:sha(lessonBytes),rows:lines.length});
  for(const line of lines)records.push({line,record:JSON.parse(line),chunk:directory});
}
assert.equal(records.length,128);assert.equal(new Set(records.map(row=>row.record.lesson?.puzzleId)).size,128);
assert.equal(records.filter(row=>row.record.lesson?.stage1DomainEligible===true).length,audit.totals.train.eligible);

const out=resolve(a.out);mkdirSync(out);const partial=join(out,'families.jsonl.partial');writeFileSync(partial,'',{flag:'wx'});
const bounds={maxTrainingRows:128,maxBranches:4096,maxFamilies:16,maxSeconds:2700,maxRssMiB:2048,
  minFreeMiB:256,cpuDuty:0.5,heapMiB:256,maxFamilyBytes:2*2**20,maxOutputBytes:32*2**20};
const counts={trainingRows:0,eligibleRows:0,branches:0,families:0,unknownBranches:0,oversizedFamilies:0};
const started=performance.now(),cpuStart=process.cpuUsage();let lastCpu=process.cpuUsage(),peakRss=0,outputBytes=0;
let reason='training-roots-exhausted';const outputHash=createHash('sha256');class BoundStop extends Error{}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
  if(peakRss>bounds.maxRssMiB*2**20||os.freemem()<bounds.minFreeMiB*2**20)throw new BoundStop('memory-bound');
  if(performance.now()-started>bounds.maxSeconds*1000)throw new BoundStop('elapsed-bound');}
const pacer=makeCpuDutyPacer(bounds.cpuDuty,guard);
async function pace(){guard();const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();
  await pacer((used.user+used.system)/1000);guard();}
const inputs={batchManifestSha256:sha(packageBytes),lessonAuditSha256:sha(auditBytes),inputChunks};
try{
  outer:for(const {line,record,chunk} of records){
    guard();assert(Buffer.byteLength(line)<=2*2**20&&line);
    if(counts.trainingRows>=bounds.maxTrainingRows){reason='training-row-bound';break;}
    assert.equal(record.split,'train');counts.trainingRows++;
    if(record.lesson?.stage1DomainEligible!==true)continue;
    counts.eligibleRows++;
    const context=record.lesson.context,board=new Chess();board.loadPgn(context.pgn);
    assert.equal(board.fen(),context.fen);assert.equal(record.history.prefixPgnSha256,sha(Buffer.from(context.pgn)));
    assert.equal(record.history.historyStatus,'verified-standard-start-prefix');
    assert.equal(board.history({verbose:true})[0].before,DEFAULT_POSITION);
    assert(board.board().flat().filter(Boolean).length<=6);
    const result=await findLichessCounterfactualActionPair(board,{maxBranches:bounds.maxBranches-counts.branches,
      commonMoveKind:'any-quiet',responseMoveKind:'any-quiet',
      onBranch:async()=>{counts.branches++;await pace();}});
    counts.unknownBranches+=result.unknown;
    if(result.pair){
      const family={schema:'lichess-legal-counterfactual-family-v2',split:'train',stage:1,
        familyId:record.lesson.puzzleId+'-'+result.pair.variants.map(v=>v.branch.join('-')).join('_')+'-'+result.pair.probeMoves.join('_'),
        source:{puzzleId:record.lesson.puzzleId,gameId:record.lesson.gameId,recordSha256:sha(Buffer.from(line)),
          chunk:join(chunk,'lessons.jsonl'),rootContext:context,sourcePgnSha256:record.history.sourcePgnSha256},
        ...result.pair,responseMoveKind:'any-quiet',neuralEventsDelivered:0,graphLaunchAuthorized:false,
        scope:'Training-only pair of legal teacher-generated quiet plies from audited Lichess history; no neural teaching.'};
      const text=JSON.stringify(family)+'\n',bytes=Buffer.byteLength(text);
      if(bytes>bounds.maxFamilyBytes){counts.oversizedFamilies++;continue;}
      assert(outputBytes+bytes<=bounds.maxOutputBytes);appendFileSync(partial,text);outputHash.update(text);
      outputBytes+=bytes;counts.families++;
      console.log(JSON.stringify({milestone:'training-family-prepared',families:counts.families,branches:counts.branches}));
      if(counts.families===bounds.maxFamilies){reason='family-bound';break outer;}
    }
    await pace();
  }
}catch(error){if(!(error instanceof BoundStop))throw error;reason=error.message;}
guard();renameSync(partial,join(out,'families.jsonl'));
publishAtomicJson(join(out,'manifest.json'),{schema:'lichess-counterfactual-family-preparation-v2',split:'train',inputs,bounds,counts,
  commonMoveKind:'any-quiet',responseMoveKind:'any-quiet',stoppingBound:reason,outputSha256:outputHash.digest('hex'),outputBytes,
  resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20},
  neuralEventsDelivered:0,graphLaunchAuthorized:false,independentFamilyAuditPassed:false,
  trainingLessonContentInspected:true,finalSplitInspected:false,
  scope:'Bounded training-only counterfactual construction; needs independent legal/family replay and a separate cross-split audit before any learning.'});
console.log(JSON.stringify({counts,stoppingBound:reason,finalSplitInspected:false,graphLaunchAuthorized:false}));

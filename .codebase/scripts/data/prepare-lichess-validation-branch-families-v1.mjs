// Build validation-only counterfactual families from audited Lichess lessons.
// This is teacher-side stimulus construction, not learner search or feedback.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream,readFileSync,writeFileSync,appendFileSync,statSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {join,dirname,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {findKingGuardContrast} from '../../src/puzzle-learning/lichess-branch-contrast-v3.mjs';
import {makeCpuDutyPacer,publishAtomicJson} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{package:{type:'string'},audit:{type:'string'},out:{type:'string'}}});
assert(a.package&&a.audit&&a.out&&!existsSync(a.out));
assert(process.execArgv.includes('--max-old-space-size=256'));
const sha=b=>createHash('sha256').update(b).digest('hex');
function read(path,max){assert(statSync(path).size<=max);return readFileSync(path);}
const packageBytes=read(a.package,16*2**20),pack=JSON.parse(packageBytes);
const auditBytes=read(a.audit,65536),audit=JSON.parse(auditBytes);
assert.equal(pack.schema,'lichess-preparation-batches-v1');assert.equal(pack.phase,'complete');
assert.equal(pack.completed.filter(e=>e.job.startsWith('prepare-validation-')).length,4);
assert.equal(pack.completed.reduce((sum,e)=>sum+e.counts.prepared,0),256);
assert.equal(audit.schema,'lichess-csv-lesson-batch-audit-v1');assert.equal(audit.passed,true);
assert.equal(audit.batchManifestSha256,sha(packageBytes));assert.equal(audit.finalSplitInspected,false);

const out=resolve(a.out);mkdirSync(out);
const partial=join(out,'families.jsonl.partial');writeFileSync(partial,'',{flag:'wx'});
const bounds={maxValidationRows:128,maxBranches:4096,maxFamilies:16,maxSeconds:2700,maxRssMiB:2048,
  minFreeMiB:256,cpuDuty:0.5,heapMiB:256,maxFamilyBytes:2*2**20,maxOutputBytes:32*2**20};
const counts={validationRows:0,eligibleRows:0,branches:0,families:0,unknownBranches:0,oversizedFamilies:0};
const started=performance.now(),cpuStart=process.cpuUsage();let lastCpu=process.cpuUsage(),peakRss=0;
let reason='validation-roots-exhausted',outputBytes=0;const outputHash=createHash('sha256');
class BoundStop extends Error{}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
  if(peakRss>bounds.maxRssMiB*2**20||os.freemem()<bounds.minFreeMiB*2**20)throw new BoundStop('memory-bound');
  if(performance.now()-started>bounds.maxSeconds*1000)throw new BoundStop('elapsed-bound');}
const pacer=makeCpuDutyPacer(bounds.cpuDuty,guard);
async function pace(){guard();const cpu=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();
  await pacer((cpu.user+cpu.system)/1000);guard();}
const inputs={packageSha256:sha(packageBytes),auditSha256:sha(auditBytes),validationChunks:{}};
try{
  outer:for(const entry of pack.completed){
    const mBytes=read(entry.manifest,65536);assert.equal(sha(mBytes),entry.manifestSha256);
    const m=JSON.parse(mBytes);if(m.split!=='validation')continue;
    const path=join(dirname(entry.manifest),'lessons.jsonl');
    const body=read(path,64*2**20);assert.equal(sha(body),m.outputSha256);inputs.validationChunks[path]=m.outputSha256;
    for await(const line of createInterface({input:createReadStream(path),crlfDelay:Infinity})){
      guard();assert(Buffer.byteLength(line)<=2*2**20&&line.length);
      if(counts.validationRows>=bounds.maxValidationRows){reason='validation-row-bound';break outer;}
      const record=JSON.parse(line);assert.equal(record.split,'validation');counts.validationRows++;
      if(record.lesson?.stage1DomainEligible!==true)continue;
      counts.eligibleRows++;
      const context=record.lesson.context,board=new Chess();board.loadPgn(context.pgn);
      assert.equal(board.fen(),context.fen);assert.equal(record.history.prefixPgnSha256,sha(context.pgn));
      assert.equal(record.history.historyStatus,'verified-standard-start-prefix');
      const history=board.history({verbose:true});assert(history.length>0&&history.length<=510);
      assert.equal(history[0].before,DEFAULT_POSITION);
      assert(board.board().flat().filter(Boolean).length<=6);
      const result=await findKingGuardContrast(board,{maxBranches:bounds.maxBranches-counts.branches,
        commonMoveKind:'any-quiet',responseMoveKind:'any-quiet',
        onBranch:async()=>{counts.branches++;await pace();}});
      counts.unknownBranches+=result.unknown;
      if(result.pair){
        const family={schema:'lichess-legal-branch-family-v1',split:'validation',stage:1,
          familyId:record.lesson.puzzleId+'-'+result.pair.variants.map(v=>v.branch.join('-')).join('_'),
          source:{puzzleId:record.lesson.puzzleId,gameId:record.lesson.gameId,recordSha256:sha(line),
            chunk:path,rootContext:context,sourcePgnSha256:record.history.sourcePgnSha256},
          ...result.pair,responseMoveKind:'any-quiet',neuralEventsDelivered:0,graphLaunchAuthorized:false,
          scope:'Validation-only pair of legal teacher-generated quiet plies from audited Lichess history; no learner training or final-set access.'};
        const text=JSON.stringify(family)+'\n',bytes=Buffer.byteLength(text);
        if(bytes>bounds.maxFamilyBytes){counts.oversizedFamilies++;continue;}
        assert(outputBytes+bytes<=bounds.maxOutputBytes);appendFileSync(partial,text);
        outputHash.update(text);outputBytes+=bytes;counts.families++;
        console.log(JSON.stringify({milestone:'validation-family-prepared',families:counts.families,branches:counts.branches}));
        if(counts.families===bounds.maxFamilies){reason='family-bound';break outer;}
      }
      await pace();
    }
  }
}catch(error){if(!(error instanceof BoundStop))throw error;reason=error.message;}
guard();renameSync(partial,join(out,'families.jsonl'));
publishAtomicJson(join(out,'manifest.json'),{schema:'lichess-branch-contrast-preparation-v1',split:'validation',inputs,bounds,counts,
  commonMoveKind:'any-quiet',responseMoveKind:'any-quiet',stoppingBound:reason,
  outputSha256:outputHash.digest('hex'),outputBytes,
  resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20},
  neuralEventsDelivered:0,graphLaunchAuthorized:false,independentFamilyAuditPassed:false,
  validationLessonContentInspected:true,finalSplitInspected:false,
  scope:'Bounded validation-only counterfactual construction; requires separate family partition audit and does not authorize graph training.'});
console.log(JSON.stringify({counts,stoppingBound:reason,finalSplitInspected:false,graphLaunchAuthorized:false}));

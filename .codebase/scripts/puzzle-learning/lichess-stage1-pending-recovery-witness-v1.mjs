// Stage 1 pending-receipt recovery witness v1 (2026-10-30; review W03, gate D8 pendingReceiptExactlyOnce).
// Read-only replay of one registered informative-lineage training block: an uninterrupted run, then an
// injected interruption after the pending receipt is published and after it is appended, each resumed.
// Training blocks only; validation/final families and evaluation outputs are never read; writes only --out.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {runCurriculumBlock} from '../../src/puzzle-learning/curriculum-block-runner.mjs';
import {paceFactory} from './run-lichess-curriculum-matrix-v6.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const MiB=2**20;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileSha256=path=>sha256(readFileSync(path));
// Same new-work ceiling as the matrix runner's guard: 2048 MiB RSS, 256 MiB free system memory.
function guard(){
  const rssMiB=process.memoryUsage().rss/MiB,freeMiB=os.freemem()/MiB;
  if(rssMiB>2048||freeMiB<256)throw Error(`resource-guard rssMiB=${rssMiB.toFixed(1)} freeMiB=${freeMiB.toFixed(1)}`);
}
function atomicJson(path,value){
  const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,JSON.stringify(value,null,1));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

async function main(){
  assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with node --max-old-space-size=256');
  const {values:args}=parseArgs({options:{result:{type:'string'},registration:{type:'string'},replica:{type:'string'},
    block:{type:'string'},out:{type:'string'},'cpu-duty':{type:'string'}}});
  const started=Date.now(),block=Number(args.block),duty=Number(args['cpu-duty']);
  assert(args.result&&args.registration&&args.replica&&args.out,
    'Usage: --result PATH --registration PATH --replica rN --block N --out DIR --cpu-duty 0.75');
  assert(Number.isSafeInteger(block)&&block>=0,'Block index must be a non-negative integer');
  assert([0.5,0.75,1].includes(duty),'CPU duty must be 0.5, 0.75 or 1');
  const out=resolve(root,args.out);
  assert(!existsSync(out),'Preserve existing witness output');

  // Matrix result checks as replayLichessCurriculumReplica performs them (its helpers are not exported).
  const resultBytes=readFileSync(resolve(root,args.result)),result=JSON.parse(resultBytes);
  const registrationBytes=readFileSync(resolve(root,args.registration)),registration=JSON.parse(registrationBytes);
  assert.equal(result.schema,'lichess-curriculum-matrix-result-v1');assert.equal(result.status,'training-complete');
  assert.equal(result.stage,1);assert.equal(result.registrationSha256,sha256(registrationBytes),'Result belongs to another registration');
  assert(result.replicas.includes(args.replica),'Replica is not in the matrix result');
  const lineageKey=`${args.replica}:informative`;
  const entry=Object.values(result.lineageResults).find(row=>row.lineageKey===lineageKey);
  assert(entry&&entry.replica===args.replica&&entry.condition==='informative','Matrix result lacks the informative lineage');
  const lineageResult=JSON.parse(readFileSync(entry.resultPath,'utf8'));
  assert.equal(digest(lineageResult),entry.resultSha256,'A lineage result changed after matrix publication');
  assert.equal(lineageResult.status,'training-complete');assert.equal(lineageResult.lineageKey,lineageKey);
  assert.equal(lineageResult.identity,entry.identity);assert.equal(lineageResult.checkpoint,entry.checkpoint);
  assert.deepEqual(lineageResult.initialMemoryHashes,{[lineageKey]:result.initialMemoryHashes[lineageKey]});
  assert.deepEqual(lineageResult.finalMemoryHashes,{[lineageKey]:result.finalMemoryHashes[lineageKey]});

  // Runtime factory, loaded as the matrix runner loads it: pinned path and hash, then createReplayArm.
  const factoryPath=resolve(root,registration.runtimeFactory.path);
  assert.equal(sha256(readFileSync(factoryPath)),registration.runtimeFactory.sha256,'Pinned runtime factory changed');
  const factory=await import(pathToFileURL(factoryPath).href);
  // ponytail: the block runner calls pace() without an elapsed value, which paceFactory treats as zero work,
  // so frames run unpaced here and in training. Recorded for review; the registered pacing call is kept.
  const pace=paceFactory(()=>duty,guard);
  const arm=await factory.createReplayArm({entry,registration,guard,pace});

  // Stage checkpoint and block pins, checked as lichess-curriculum-stage-audit checks them.
  const {history,maxBlocks,condition,stageAccepted,lineageKey:stageLineageKey}=decodeCheckpoint(readFileSync(entry.checkpoint));
  assert.equal(stageAccepted,false);assert.equal(stageLineageKey,lineageKey);assert.equal(condition,'informative');
  assert.equal(history.length,maxBlocks,'Only a complete registered stage can be replayed');
  const h=history[block];assert(h&&h.blockIndex===block,'Block is outside the registered stage history');
  assert.equal(fileSha256(h.stageStartCheckpoint),h.stageStartCheckpointSha256,'Stage prefix checkpoint changed');
  assert.equal(fileSha256(h.checkpoint),h.checkpointSha256,'Block checkpoint changed');
  const prefix=decodeCheckpoint(readFileSync(h.stageStartCheckpoint));
  const saved=decodeCheckpoint(readFileSync(h.checkpoint));
  assert.equal(prefix.block.completedBlocks,block);assert.equal(prefix.lineageKey??null,lineageKey);
  assert.equal(saved.schema,'curriculum-block-run-v1');assert.equal(saved.startBlock,block);
  assert.equal(saved.block.completedBlocks,block+1);assert.equal(saved.pendingReceipt,null);
  assert.equal(saved.planSha256,h.planSha256);assert.equal(saved.receiptCount,h.receiptCount);assert.equal(saved.chainHash,h.chainHash);
  const {plan,shuffledStatuses}=saved;
  const rt=await arm.createReplayBlock({stageCheckpoint:prefix,blockIndex:block});
  assert.equal(rt.selectionPresentations,plan.selectionPresentations,'Replay selection exposure differs from the plan');

  // ponytail: training assesses every panel before accounting exposure; createReplayArm does not expose the panels,
  // so the audit path ({replay:true}, curriculum-block-audit.mjs) stands in. Step 4's digest checks verify it.
  const startAttempt=()=>{
    rt.block.restore(prefix.block);
    rt.block.session.accountSelectionPresentations(plan.planSha256,rt.selectionPresentations,{replay:true});
  };
  const run=extra=>runCurriculumBlock({block:rt.block,plan,shuffledStatuses,identity:saved.identity,
    assess:rt.assess,guard,pace,...extra});
  const receiptsOf=dir=>join(out,dir,'receipts.jsonl');
  const receiptsSha=dir=>fileSha256(receiptsOf(dir));

  mkdirSync(out,{recursive:false});
  startAttempt();
  const A=await run({outputDir:join(out,'uninterrupted')});
  const uninterruptedDigest=digest(rt.block.snapshot());
  // The witness must reproduce training before any interruption result means anything.
  assert.equal(A.chainHash,saved.chainHash,'Witness error: uninterrupted replay chain differs from training');
  assert.equal(A.receiptCount,saved.receiptCount,'Witness error: uninterrupted receipt count differs from training');
  assert.equal(uninterruptedDigest,digest(saved.block),'Witness error: uninterrupted final block state differs from training');

  const rows=readFileSync(receiptsOf('uninterrupted'),'utf8').trimEnd().split('\n').map(line=>JSON.parse(line));
  const frame=rows.find(row=>row.kind==='frame');assert(frame,'Uninterrupted run has no neural frame receipt');
  const k=frame.sequence;

  const attempts={};
  for(const kind of ['afterPending','afterAppend']){
    startAttempt();
    const injection=kind==='afterPending'?{interruptAfterPending:k}:{interruptAfterAppend:k};
    let interrupted=null;
    try{await run({outputDir:join(out,kind),...injection});}
    catch(error){if(error?.code!=='CURRICULUM_INTERRUPTED')throw error;interrupted=error;}
    assert(interrupted,`${kind}: injected interruption did not occur`);
    const logRows=readFileSync(receiptsOf(kind),'utf8').split('\n').length-1;
    assert.equal(logRows,kind==='afterPending'?k:k+1,`${kind}: interruption landed at the wrong receipt`);
    const pendingState=decodeCheckpoint(readFileSync(interrupted.checkpoint));
    // ponytail: as block v3, no accounting before resume; runCurriculumBlock restores the checkpoint, which already holds it.
    const R=await run({outputDir:join(out,`${kind}-resumed`),resumeFrom:interrupted.checkpoint});
    attempts[kind]={interruptedCheckpoint:basename(interrupted.checkpoint),interruptedLogRows:logRows,
      pendingSequence:pendingState.pendingReceipt?.sequence??null,chainHash:R.chainHash,receiptCount:R.receiptCount,
      finalBlockSha256:digest(rt.block.snapshot()),receiptsSha256:receiptsSha(`${kind}-resumed`)};
  }

  const same=x=>x.chainHash===A.chainHash&&x.receiptCount===A.receiptCount&&x.finalBlockSha256===uninterruptedDigest
    &&x.receiptsSha256===receiptsSha('uninterrupted');
  const pendingReceiptExactlyOnce=same(attempts.afterPending)&&same(attempts.afterAppend);
  const elapsedMs=Date.now()-started;
  const doc={schema:'stage1-pending-recovery-witness-v1',replica:args.replica,lineageKey,block,k,receiptKindAtK:frame.kind,
    original:{chainHash:saved.chainHash,receiptCount:saved.receiptCount,finalBlockSha256:digest(saved.block)},
    uninterrupted:{chainHash:A.chainHash,receiptCount:A.receiptCount,finalBlockSha256:uninterruptedDigest,
      receiptsSha256:receiptsSha('uninterrupted')},
    afterPending:attempts.afterPending,afterAppend:attempts.afterAppend,pendingReceiptExactlyOnce,resumeAccounting:'skipped on resume, as block v3',
    inputs:{resultSha256:sha256(resultBytes),registrationSha256:sha256(registrationBytes),
      runtimeFactorySha256:registration.runtimeFactory.sha256,planSha256:plan.planSha256,
      stageCheckpointSha256:fileSha256(entry.checkpoint),stageStartCheckpointSha256:h.stageStartCheckpointSha256,
      blockCheckpointSha256:h.checkpointSha256},
    cpuDuty:duty,elapsedMs,peakRssMiB:process.resourceUsage().maxRSS/1024,
    scope:'Read-only pending-receipt recovery witness for one registered training block; no learning, retention or stage acceptance claim'};
  atomicJson(join(out,'witness.json'),doc);
  process.stdout.write(JSON.stringify({schema:doc.schema,status:'complete',replica:args.replica,block,k,
    pendingReceiptExactlyOnce,elapsedMs,peakRssMiB:Math.round(doc.peakRssMiB),witness:join(out,'witness.json')})+'\n');
}

main().catch(error=>{process.stderr.write(JSON.stringify({status:'witness-error',error:String(error).slice(0,1000)})+'\n');
  process.exitCode=2;});

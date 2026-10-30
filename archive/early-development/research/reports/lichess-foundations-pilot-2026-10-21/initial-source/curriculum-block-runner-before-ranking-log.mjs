// One bounded block, using the existing immutable-checkpoint/pending-receipt
// pattern. The campaign caller supplies pinned identities, guards and pacing.
// This runner does not authorize experiments, advance stages or accept results.
import assert from 'node:assert/strict';
import {existsSync,statSync,mkdirSync,readFileSync,copyFileSync,openSync,closeSync,
  writeFileSync,writeSync,readSync,fsyncSync,renameSync} from 'node:fs';
import {join,dirname,basename,resolve} from 'node:path';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {encodeCheckpoint,decodeCheckpoint} from '../runtime/checkpoint-codec.mjs';
import {streamRows} from '../runtime/storage.mjs';

const MAX_FILE=16*2**20,MAX_LINE=2**20,MAX_LOG=64*2**20;
const isHash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);

export async function runCurriculumBlock({block,plan,shuffledStatuses=null,identity,outputDir,
  resumeFrom=null,assess,guard,pace,interruptAfterPending=null,interruptAfterAppend=null}){
  assert(isHash(identity),'Require pinned campaign identity');
  assert.equal(typeof assess,'function');assert.equal(typeof guard,'function');assert.equal(typeof pace,'function');
  assert(!existsSync(outputDir),'Run/resume requires a fresh directory');
  assert(isHash(plan?.planSha256));const {planSha256,...planBody}=plan;assert.equal(planSha256,digest(planBody));
  assert(Array.isArray(plan.events)&&plan.events.length===4);
  const frameCounts=plan.events.map((event,index)=>{
    const checked=block.session.verify(event.experience,block.options(shuffledStatuses,index));
    assert.equal(checked.learningAllowed,true);assert(checked.frames.length>=1&&checked.frames.length<=32);
    return checked.frames.length;
  });
  const maxRecords=9+frameCounts.reduce((a,b)=>a+b,0),maxCheckpoints=1+2*maxRecords;
  for(const injection of [interruptAfterPending,interruptAfterAppend])
    assert(injection===null||Number.isSafeInteger(injection)&&injection>=0&&injection<maxRecords);
  guard();
  let state={schema:'curriculum-block-run-v1',identity,blockIdentity:block.identity,
    planSha256,shuffledStatuses:structuredClone(shuffledStatuses),startBlock:plan.blockIndex,
    sequence:0,receiptCount:0,logBytes:0,chainHash:digest({identity,blockIdentity:block.identity}),
    pendingReceipt:null,block:block.snapshot()};
  if(resumeFrom){
    assert(/^checkpoint-\d{6}\.json\.gz$/.test(basename(resumeFrom)),'Require complete checkpoint publication');
    assert.notEqual(resolve(outputDir),resolve(dirname(resumeFrom)),'Preserve parent run');
    assert(statSync(resumeFrom).size<=MAX_FILE,'Checkpoint exceeds bound');
    const saved=decodeCheckpoint(readFileSync(resumeFrom));
    assert.equal(saved.schema,state.schema);assert.equal(saved.identity,identity);
    assert.equal(saved.blockIdentity,block.identity);assert.equal(saved.planSha256,planSha256);
    assert.deepEqual(saved.shuffledStatuses,shuffledStatuses);assert.equal(saved.startBlock,plan.blockIndex);
    assert(Number.isSafeInteger(saved.sequence)&&saved.sequence>=1&&saved.sequence<=maxCheckpoints);
    assert.equal(Number(basename(resumeFrom).slice(11,17)),saved.sequence);
    assert(Number.isSafeInteger(saved.receiptCount)&&saved.receiptCount>=0&&saved.receiptCount<=maxRecords);
    assert(Number.isSafeInteger(saved.logBytes)&&saved.logBytes>=0&&saved.logBytes<=MAX_LOG);
    assert(isHash(saved.chainHash));
    assert(saved.pendingReceipt===null||typeof saved.pendingReceipt==='object'&&saved.pendingReceipt!==null);
    assert.equal(saved.sequence,1+2*saved.receiptCount+Number(saved.pendingReceipt!==null));
    if(saved.pendingReceipt){
      assert.equal(saved.pendingReceipt.schema,'curriculum-block-record-v1');
      assert.equal(saved.pendingReceipt.identity,identity);assert.equal(saved.pendingReceipt.planSha256,planSha256);
      assert.equal(saved.pendingReceipt.sequence,saved.receiptCount);
      assert.equal(saved.pendingReceipt.previousChainHash,saved.chainHash);
      assert.equal(saved.pendingReceipt.blockStateSha256,digest(saved.block));
    }
    const source=join(dirname(resumeFrom),'receipts.jsonl');
    if(existsSync(source))assert(statSync(source).size<=MAX_LOG,'Receipt log exceeds bound');
    let count=0,bytes=0,chain=digest({identity,blockIdentity:block.identity});
    if(existsSync(source))for await(const row of streamRows(source)){
      guard();const line=JSON.stringify(row)+'\n';assert(Buffer.byteLength(line)<=MAX_LINE);
      assert.equal(row.sequence,count);assert.equal(row.previousChainHash,chain);
      assert.equal(row.schema,'curriculum-block-record-v1');assert.equal(row.identity,identity);
      assert.equal(row.planSha256,planSha256);
      if(count===saved.receiptCount)assert.deepEqual(row,saved.pendingReceipt,'Conflicting pending receipt');
      else assert(count<saved.receiptCount,'Unexpected future receipt');
      chain=digest(row);count++;bytes+=Buffer.byteLength(line);
      if(count===saved.receiptCount){
        assert.equal(chain,saved.chainHash);assert.equal(bytes,saved.logBytes);
        if(saved.pendingReceipt===null)assert.equal(row.blockStateSha256,digest(saved.block));
      }
    }
    assert(count===saved.receiptCount||saved.pendingReceipt!==null&&count===saved.receiptCount+1,
      'Missing acknowledged receipt');
    if(saved.receiptCount===0){assert.equal(saved.logBytes,0);assert.equal(saved.chainHash,state.chainHash);}
    assert.equal(existsSync(source)?statSync(source).size:0,bytes,'Noncanonical or partial receipt log');
    assert(saved.block.completedBlocks===saved.startBlock||saved.block.completedBlocks===saved.startBlock+1);
    assert(!(saved.block.completedBlocks===saved.startBlock+1&&saved.pendingReceipt===null),'Block already acknowledged');
    if(saved.block.pending)assert.equal(saved.block.pending.plan.planSha256,planSha256);
    block.restore(saved.block);state=saved;
    mkdirSync(outputDir,{recursive:false});if(existsSync(source))copyFileSync(source,join(outputDir,'receipts.jsonl'));
  }else{
    assert.equal(block.completedBlocks,plan.blockIndex);assert.equal(block.pending,null);
    mkdirSync(outputDir,{recursive:false});
  }
  let lastCheckpoint=null;
  function save(){
    guard();assert(state.sequence<maxCheckpoints,'Single-block checkpoint budget exceeded');
    state.sequence++;const bytes=encodeCheckpoint(state);assert(bytes.length<=MAX_FILE);
    const target=join(outputDir,`checkpoint-${String(state.sequence).padStart(6,'0')}.json.gz`);
    const partial=target+'.partial',fd=openSync(partial,'wx');
    try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(partial,target);lastCheckpoint=target;
  }
  function injected(kind){
    const error=new Error(`Injected interruption ${kind}`);error.code='CURRICULUM_INTERRUPTED';
    error.checkpoint=lastCheckpoint;throw error;
  }
  function acknowledge(){
    const receipt=state.pendingReceipt;if(receipt===null)return;
    const line=JSON.stringify(receipt)+'\n',bytes=Buffer.from(line);assert(bytes.length<=MAX_LINE);
    assert(state.logBytes+bytes.length<=MAX_LOG,'Receipt log exceeds bound');
    const path=join(outputDir,'receipts.jsonl'),size=existsSync(path)?statSync(path).size:0;
    if(size===state.logBytes){
      const fd=openSync(path,'a');try{assert.equal(writeSync(fd,bytes),bytes.length);fsyncSync(fd);}finally{closeSync(fd);}
    }else{
      assert.equal(size,state.logBytes+bytes.length,'Partial or extra receipt log; refuse recovery');
      const actual=Buffer.alloc(bytes.length),fd=openSync(path,'r');
      try{assert.equal(readSync(fd,actual,0,actual.length,state.logBytes),actual.length);}finally{closeSync(fd);}
      assert(actual.equals(bytes),'Conflicting pending receipt');
    }
    if(interruptAfterAppend===receipt.sequence)injected('after receipt append');
    state.logBytes+=bytes.length;state.receiptCount++;state.chainHash=digest(receipt);state.pendingReceipt=null;save();
  }
  function publish(kind,value){
    assert.equal(state.pendingReceipt,null);assert(state.receiptCount<maxRecords);
    state.block=block.snapshot();state.pendingReceipt={schema:'curriculum-block-record-v1',identity,
      planSha256,sequence:state.receiptCount,previousChainHash:state.chainHash,
      blockStateSha256:digest(state.block),kind,value};
    save();if(interruptAfterPending===state.receiptCount)injected('after pending publication');acknowledge();
  }
  // Recover a saved update before performing any new assessment or neural frame.
  acknowledge();
  if(state.sequence===0)save();
  if(!block.pending&&block.completedBlocks===state.startBlock){
    publish('block-start',block.startBlock(plan,{shuffledStatuses}));
  }
  while(block.pending){
    guard();
    if(block.session.pending===null){
      const before=digest(block.snapshot()),assessment=await assess(block.nextContext());
      assert.equal(digest(block.snapshot()),before,'Assessment changed learning state');
      guard();publish('event-start',block.startEvent(assessment));
    }else if(block.session.pending.cursor<block.session.pending.plan.frames.length){
      await pace();guard();publish('frame',block.step());
    }else publish('event-finish',block.finishEvent());
  }
  assert.equal(block.completedBlocks,state.startBlock+1);
  return {completedBlocks:block.completedBlocks,receiptCount:state.receiptCount,
    checkpoint:lastCheckpoint??resumeFrom,chainHash:state.chainHash,
    scope:'Completed bounded block publication; independent replay and stage acceptance still required'};
}

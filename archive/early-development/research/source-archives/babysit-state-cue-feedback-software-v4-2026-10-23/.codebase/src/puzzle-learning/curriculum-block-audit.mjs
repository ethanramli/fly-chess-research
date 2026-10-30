// Separate replay bookkeeping: never calls the block runner or its coordinator
// transitions. Reuses the neural session and independent consequence checkers.
// Integrity of one block is not a learning, transfer or stage acceptance gate.
import assert from 'node:assert/strict';
import {readFileSync,statSync,readdirSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {decodeCheckpoint} from '../runtime/checkpoint-codec.mjs';
import {streamRows} from '../runtime/storage.mjs';

export async function auditCurriculumBlock({block,plan,shuffledStatuses=null,identity,runDir,checkpoint,assess,selectionPresentations=null,guard,pace}){
  assert.equal(typeof assess,'function');assert.equal(typeof guard,'function');assert.equal(typeof pace,'function');
  assert(/^[a-f0-9]{64}$/.test(identity));assert.equal(block.pending,null);assert.equal(block.session.pending,null);
  const {planSha256,...body}=plan;assert.equal(planSha256,digest(body));
  assert.equal(plan.schema,'curriculum-rehearsal-block-v1');assert.equal(plan.ready,true);
  assert.equal(plan.blockIndex,block.completedBlocks);assert(plan.blockIndex>=0&&plan.blockIndex<32);
  assert.equal(plan.currentStage,block.currentStage);assert.equal(plan.registrationSha256,digest(block.registeredPanels));
  assert(Array.isArray(plan.events)&&plan.events.length===4);
  assert.deepEqual(plan.events.map(e=>e.experience.status),['failure','success','success','failure']);
  assert.deepEqual(plan.outcomeCounts,{success:2,failure:2});assert.notEqual(plan.targetPanelId,plan.sentinelPanelId);
  assert.deepEqual(plan.events.map(e=>e.panelId),[plan.targetPanelId,plan.targetPanelId,plan.sentinelPanelId,plan.sentinelPanelId]);
  assert(block.condition==='shuffled'?Array.isArray(shuffledStatuses)&&shuffledStatuses.length===4
    &&shuffledStatuses.every(s=>['success','failure'].includes(s)):shuffledStatuses===null);
  const session=block.session,options=index=>block.options(shuffledStatuses,index);
  if(typeof session.accountSelectionPresentations==='function'){
    assert.equal(selectionPresentations,plan.selectionPresentations,'Independent selection exposure mismatch');
    session.accountSelectionPresentations(plan.planSha256,selectionPresentations,{replay:true});
  }
  let expectedRecords=9;
  for(const [index,event] of plan.events.entries()){
    const registered=block.registeredPanels.find(p=>p.panelId===event.panelId);
    assert(registered&&registered.stage===event.stage);assert.equal(event.index,index);
    assert(index<2?event.stage===block.currentStage:block.currentStage===1?event.stage===1:event.stage<block.currentStage);
    const verified=session.verify(event.experience,options(index));assert.equal(verified.learningAllowed,true);
    assert(verified.frames.length>=1&&verified.frames.length<=32);expectedRecords+=verified.frames.length;
  }
  const nextCounts=Object.fromEntries(block.registeredPanels.map(p=>[p.panelId,block.selectionCounts[p.panelId]
    +Number(p.panelId===plan.targetPanelId)+Number(p.panelId===plan.sentinelPanelId)]));
  assert.deepEqual(plan.nextSelectionCounts,nextCounts);
  const log=join(runDir,'receipts.jsonl');assert(statSync(log).size<=64*2**20);
  let count=0,bytes=0,logChain=digest({identity,blockIdentity:block.identity});
  let completedBlocks=block.completedBlocks,selectionCounts=structuredClone(block.selectionCounts);
  let pending=null,eventChain=block.chainHash;
  const snapshot=()=>({schema:'curriculum-block-session-v1',identity:block.identity,completedBlocks,
    selectionCounts:structuredClone(selectionCounts),chainHash:eventChain,pending:structuredClone(pending),session:session.snapshot()});
  for await(const row of streamRows(log)){
    guard();assert(count<expectedRecords,'Extra block receipt');assert.equal(row.sequence,count);
    assert.equal(row.schema,'curriculum-block-record-v1');assert.equal(row.identity,identity);
    assert.equal(row.planSha256,planSha256);assert.equal(row.previousChainHash,logChain);
    let expected;
    if(row.kind==='block-start'){
      assert.equal(count,0);const hash=digest(session.memory.snapshot());
      if(block.condition==='informative')assert.equal(plan.memoryHash,hash);
      pending={plan:structuredClone(plan),shuffledStatuses:structuredClone(shuffledStatuses),beforeMemoryHash:hash,
        lastFinishedMemoryHash:hash,startChainHash:eventChain,finishedEvents:[]};
      expected={planSha256,blockIndex:completedBlocks,eventCount:4,selectionMemoryHash:plan.memoryHash,conditionMemoryHash:hash};
    }else{
      assert(pending,'Receipt outside a block');const index=pending.finishedEvents.length;
      const event=plan.events[index];assert(event,'Extra event');
      if(row.kind==='event-start'){
        assert.equal(session.pending,null);assert.equal(digest(session.memory.snapshot()),pending.lastFinishedMemoryHash);
        const before=digest(session.snapshot()),assessment=await assess(structuredClone(event.experience.context));
        assert.equal(digest(session.snapshot()),before,'Audit assessment changed learning state');
        assert.deepEqual(row.value.assessment,assessment,'Unaided assessment replay mismatch');
        expected={assessment,result:session.start(event.experience,assessment,options(index))};
      }else if(row.kind==='frame'){
        assert(session.pending);await pace();guard();
        expected={blockPlanSha256:planSha256,blockIndex:completedBlocks,eventIndex:index,receipt:await session.step()};
      }else{
        assert.equal(row.kind,'event-finish');assert(session.pending);
        const blockComplete=index===3;
        const receipt={schema:'curriculum-event-receipt-v1',blockPlanSha256:planSha256,blockIndex:completedBlocks,
          eventIndex:index,condition:block.condition,blockComplete,selectionMemoryHash:plan.memoryHash,
          receipt:session.finish(),previousChainHash:eventChain};
        eventChain=digest(receipt);expected={...receipt,chainHash:eventChain};
        pending.lastFinishedMemoryHash=receipt.receipt.afterMemoryHash;pending.finishedEvents.push(expected);
        // The independently checked values match nextCounts; preserve the
        // pinned plan's key order because checkpoint hashes use JSON bytes.
        if(blockComplete){selectionCounts=structuredClone(plan.nextSelectionCounts);completedBlocks++;pending=null;}
      }
    }
    assert.deepEqual(row.value,expected,'Block replay receipt mismatch');
    assert.equal(row.blockStateSha256,digest(snapshot()),
      `Block state replay mismatch: ${block.condition}, block ${plan.blockIndex}, record ${row.sequence} (${row.kind})`);
    const line=JSON.stringify(row)+'\n';assert(Buffer.byteLength(line)<=2**20);
    bytes+=Buffer.byteLength(line);count++;logChain=digest(row);
  }
  assert.equal(count,expectedRecords);assert.equal(bytes,statSync(log).size,'Partial/noncanonical receipt log');
  assert.equal(completedBlocks,plan.blockIndex+1);assert.equal(pending,null);
  assert.equal(resolve(dirname(checkpoint)),resolve(runDir));assert(/^checkpoint-\d{6}\.json\.gz$/.test(basename(checkpoint)));
  assert(statSync(checkpoint).size<=16*2**20);
  const publications=readdirSync(runDir).filter(name=>/^checkpoint-\d{6}\.json\.gz$/.test(name)).sort();
  assert.equal(publications.at(-1),basename(checkpoint),'Not the latest complete checkpoint');
  const saved=decodeCheckpoint(readFileSync(checkpoint));
  assert.equal(saved.schema,'curriculum-block-run-v1');assert.equal(saved.identity,identity);assert.equal(saved.blockIdentity,block.identity);
  assert.equal(saved.planSha256,planSha256);assert.deepEqual(saved.plan,plan);assert.deepEqual(saved.shuffledStatuses,shuffledStatuses);
  assert.equal(saved.startBlock,plan.blockIndex);assert.equal(saved.sequence,1+2*count);
  assert.equal(Number(basename(checkpoint).slice(11,17)),saved.sequence);
  assert.equal(saved.receiptCount,count);assert.equal(saved.logBytes,bytes);assert.equal(saved.chainHash,logChain);
  assert.equal(saved.pendingReceipt,null);assert.deepEqual(saved.block,snapshot());
  return {schema:'curriculum-block-replay-audit-v1',fullNeuralReplay:true,stageAccepted:false,
    identity,planSha256,receiptCount:count,chainHash:logChain,finalBlockSha256:digest(snapshot()),
    scope:'One-block receipt/checkpoint integrity and neural replay; no G0, biological, learning or reasoning acceptance'};
}

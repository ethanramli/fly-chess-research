import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,resolve,sep,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {Chess} from 'chess.js';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {CaptureRetentionTemporalFeedbackSession} from '../../src/puzzle-learning/capture-retention-feedback.mjs';
import {planCurriculumRehearsalBlock} from '../../src/puzzle-learning/curriculum-rehearsal-plan.mjs';
import {CurriculumBlockSession} from '../../src/puzzle-learning/curriculum-block-session.mjs';
import {runCurriculumBlock} from '../../src/puzzle-learning/curriculum-block-runner.mjs';
import {auditCurriculumBlock} from '../../src/puzzle-learning/curriculum-block-audit.mjs';
import {runLichessCurriculumBlock,runLichessCurriculumStage} from '../../src/puzzle-learning/lichess-curriculum-block.mjs';
import {auditLichessCurriculumStage} from '../../src/puzzle-learning/lichess-curriculum-stage-audit.mjs';
import {assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {runLichessCurriculumStageMatrix,auditLichessCurriculumStageMatrix} from '../../src/puzzle-learning/lichess-curriculum-matrix.mjs';

// Four rate-array cells and synthetic reset histories: software recovery only.
// No connectome execution, learned ranking, disk durability or scientific gate.
const panels=[{panelId:'panel-a',stage:1},{panelId:'panel-b',stage:1}];
const task={objective:'capture-retention',plies:1};
function fixture(condition='informative',timing={cueFrame:2,leadFrames:2,tailFrames:5,current:1.5}){
  const model={n:4,steps:2,saturation:10,config:{fixture:true},calls:0,fail:false,
    graph:{col:Int32Array.from([0,1]),sign:Int8Array.from([1,1])},
    params:{magnitude:Float32Array.from([0.5,0.4])},h:Array.from({length:3},()=>new Float32Array(4)),
    setMagnitude(e,v){this.params.magnitude[e]=v;},
    forward(input,stimulation,state){
      this.calls++;this.h[0].set(state);
      for(let t=1;t<=2;t++){
        this.h[t].set(this.h[t-1].map(v=>v*0.5));
        for(const c of stimulation)this.h[t][c.index]+=c.current;
      }
      if(this.fail)this.h[2][2]=NaN;
    }};
  const mapping={schema:'gamma2-rate-timing-map-v1',groups:[{mbonType:'MBON12',danType:'PPL103',
    kc:[0,1],kcTypes:['KCg-m','KCg-m'],edges:[0,1],dan:[{index:2}]}]};
  const memory=new RateTimingMemory(model,mapping,new Float32Array(4),{
    referenceMode:'fixed-unstimulated-model',tauKC:0.4,tauShort:0.6,tauLong:1,
    stepDuration:0.1,eta:0.5,minGain:0.2,maxGain:1.8,activityScale:1});
  const session=new CaptureRetentionTemporalFeedbackSession({model,memory,mapping,
    encoder:{encode:()=>({stimulation:[{index:0,current:1.5}]})},
    timing,identity:digest({fixture:'block-session',timing})});
  const block=new CurriculumBlockSession({session,currentStage:1,registeredPanels:panels,condition,
    shuffleIdentity:condition==='shuffled'?'b'.repeat(64):null});
  return {model,memory,session,block};
}
function assess(context,memory,correct=false){
  const board=new Chess();board.loadPgn(context.pgn);
  const choice=correct?'a1a4':'a1a2';
  return {...context,memoryHash:digest(memory.snapshot()),choice,
    rows:board.moves({verbose:true}).map(m=>{
      const move=m.from+m.to+(m.promotion??'');return {move,score:move===choice?1:0};
    })};
}
function plan(f){
  const observations=panels.map((panel,index)=>{
    const board=new Chess(index?'6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1':'6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1');
    const context={fen:board.fen(),pgn:board.pgn(),task};
    const experiences=board.moves({verbose:true}).map(m=>{
      const move=m.from+m.to+(m.promotion??''),proof=certifyCaptureRetentionAction(board,move,task);
      return {context,move,proof,...checkCaptureRetentionAction(board,move,task,proof)};
    });
    return {...panel,split:'train',assessment:assess(context,f.memory,index===1),experiences};
  });
  return planCurriculumRehearsalBlock(observations,digest(f.memory.snapshot()),{
    currentStage:1,blockIndex:f.block.completedBlocks,registeredPanels:panels,selectionCounts:f.block.selectionCounts});
}
function startEvent(f){return f.block.startEvent(assess(f.block.nextContext(),f.memory));}
function next(f){
  if(!f.session.pending)return {kind:'start',receipt:startEvent(f)};
  if(f.session.pending.cursor<8)return {kind:'frame',receipt:f.block.step()};
  return {kind:'finish',receipt:f.block.finishEvent()};
}
function finish(f){const rows=[];while(f.block.pending)rows.push(next(f));return rows;}

test('four-event learning block commits exposure counts only on completion',()=>{
  const f=fixture(),p=plan(f);f.block.startBlock(p);
  const context=f.block.nextContext();context.fen='changed';assert.notEqual(f.block.nextContext().fen,'changed');
  const rows=[];
  while(f.block.pending){
    assert.equal(f.block.completedBlocks,0);assert.deepEqual(f.block.selectionCounts,{'panel-a':0,'panel-b':0});
    rows.push(next(f));
  }
  assert.equal(rows.filter(r=>r.kind==='frame').length,32);assert.equal(f.memory.events,32);
  assert.equal(f.block.completedBlocks,1);assert.deepEqual(f.block.selectionCounts,{'panel-a':1,'panel-b':1});
  const receipts=rows.filter(r=>r.kind==='finish').map(r=>r.receipt);
  assert.deepEqual(receipts.map(r=>r.blockComplete),[false,false,false,true]);
  for(const [i,r] of receipts.entries()){
    const {chainHash,...body}=r;assert.equal(chainHash,digest(body));
    if(i)assert.equal(r.previousChainHash,receipts[i-1].chainHash);
  }
  assert.throws(()=>f.block.startBlock(p),/blockIndex|0 !== 1/);
});

test('Lichess panels feed fresh choices into the planner and temporal block runner',async t=>{
  const root=workspace(t),f=fixture(),familyRegistrationSha256='f'.repeat(64);
  const panelRows=panels.map((registered,index)=>{
    const board=new Chess(index?'6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1':'6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1');
    const context={fen:board.fen(),pgn:board.pgn(),task};
    const experiences=board.moves({verbose:true}).map(move=>{
      const uci=move.from+move.to+(move.promotion??''),proof=certifyCaptureRetentionAction(board,uci,task);
      return {context,move:uci,proof,...checkCaptureRetentionAction(board,uci,task,proof)};
    });
    return {...registered,split:'train',familyRegistrationSha256,context,experiences};
  });
  const brain={memory:f.memory,memoryFingerprint:()=>digest(f.memory.snapshot()),async assess(board,moves){
    const panel=panelRows.find(row=>row.context.fen===board.fen());assert(panel);
    const preferred=panel.experiences.find(row=>row.status==='success').move;
    const rows=moves.map(move=>{const uci=move.from+move.to+(move.promotion??'');return {move:uci,score:uci===preferred?1:0};});
    const best=Math.max(...rows.map(row=>row.score)),tiedTopMoves=rows.filter(row=>row.score===best).map(row=>row.move);
    return {rows,choice:tiedTopMoves.length===1?tiedTopMoves[0]:null,tiedTopMoves};
  }};
  const result=await runLichessCurriculumBlock({panels:panelRows,block:f.block,brain,familyRegistrationSha256,
    identity:digest({test:'lichess curriculum block'}),outputDir:join(root,'integrated'),guard:()=>{},pace:async()=>{}});
  assert.equal(result.ready,true);assert.equal(result.completedBlocks,1);assert.equal(result.receiptCount,41);
  assert.equal(f.memory.events,32);assert.equal(f.block.completedBlocks,1);
  const control=fixture('disabled');
  const yoked=await runLichessCurriculumBlock({panels:panelRows,block:control.block,brain:{...brain,memory:control.memory,
    memoryFingerprint:()=>digest(control.memory.snapshot())},familyRegistrationSha256,plan:result.plan,
    planFamilyRegistrationSha256:result.planFamilyRegistrationSha256,
    identity:digest({test:'lichess curriculum block control'}),outputDir:join(root,'yoked'),guard:()=>{},pace:async()=>{}});
  assert.equal(yoked.plan.planSha256,result.plan.planSha256);
  assert.equal(yoked.completedBlocks,1);assert.equal(control.memory.events,0);
});

test('stage runner completes registered blocks and restores the final stage checkpoint',async t=>{
  const root=workspace(t),f=fixture(),familyRegistrationSha256='a'.repeat(64);
  const panelRows=panels.map((registered,index)=>{
    const board=new Chess(index?'6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1':'6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1');
    const context={fen:board.fen(),pgn:board.pgn(),task};
    const experiences=board.moves({verbose:true}).map(move=>{
      const uci=move.from+move.to+(move.promotion??''),proof=certifyCaptureRetentionAction(board,uci,task);
      return {context,move:uci,proof,...checkCaptureRetentionAction(board,uci,task,proof)};
    });
    return {...registered,split:'train',familyRegistrationSha256,context,experiences};
  });
  const brain={memory:f.memory,memoryFingerprint:()=>digest(f.memory.snapshot()),async assess(board,moves){
    const panel=panelRows.find(row=>row.context.fen===board.fen());assert(panel);
    const preferred=panel.experiences.find(row=>row.status==='success').move;
    const rows=moves.map(move=>{const uci=move.from+move.to+(move.promotion??'');return {move:uci,score:uci===preferred?1:0};});
    const best=Math.max(...rows.map(row=>row.score)),tiedTopMoves=rows.filter(row=>row.score===best).map(row=>row.move);
    return {rows,choice:tiedTopMoves.length===1?tiedTopMoves[0]:null,tiedTopMoves};
  }};
  const initialMemorySha256=digest(f.memory.snapshot());
  const stageDir=join(root,'stage'),identity=digest({test:'two-block stage'}),first=await runLichessCurriculumStage({panels:panelRows,block:f.block,
    brain,familyRegistrationSha256,identity,lineageKey:'replica1:informative',outputDir:stageDir,maxBlocks:2,guard:()=>{},pace:async()=>{}});
  assert.equal(first.status,'training-complete');assert.equal(first.completedBlocks,2);
  assert.equal(JSON.parse(readFileSync(join(stageDir,'result.json'),'utf8')).status,'training-complete');
  assert.equal(first.history.length,2);assert.equal(first.stageAccepted,false);assert.equal(f.memory.events,64);
  assert.equal(first.initialMemorySha256,initialMemorySha256);
  assert.equal(first.finalMemorySha256,digest(f.memory.snapshot()));
  assert.deepEqual(first.initialMemoryHashes,{'replica1:informative':first.initialMemorySha256});
  assert.deepEqual(first.finalMemoryHashes,{'replica1:informative':first.finalMemorySha256});
  assert.equal(existsSync(first.checkpoint),true);
  const auditPath=join(stageDir,'audit.json'),audit=await auditLichessCurriculumStage({checkpoint:first.checkpoint,identity,
    auditOutputPath:auditPath,
    deriveAcceptanceEvidence:async()=>({prerequisites:{}}),
    createReplayBlock:async()=>{
      const replay=fixture(),replayBrain={...brain,memory:replay.memory,
        memoryFingerprint:()=>digest(replay.memory.snapshot())};
      return {block:replay.block,assess:async context=>{
        const panel=panelRows.find(row=>row.context.fen===context.fen);assert(panel);
        const board=new Chess();board.loadPgn(context.pgn);
        return (await assessLichessTrainingPanel(panel,replayBrain)).assessment;
      }};
    },guard:()=>{},pace:async()=>{}});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.memoryContinuityVerified,true);
  assert.equal(audit.completedBlocks,2);
  assert.equal(audit.stageAccepted,false);assert.equal(audit.acceptanceStatus,'unknown');
  assert.equal(audit.initialMemorySha256,first.initialMemorySha256);
  assert.equal(audit.finalMemorySha256,first.finalMemorySha256);
  assert.deepEqual(audit.initialMemoryHashes,first.initialMemoryHashes);
  assert.deepEqual(audit.finalMemoryHashes,first.finalMemoryHashes);
  assert.equal(JSON.parse(readFileSync(auditPath,'utf8')).identity,identity);
  const recovered=fixture();
  const resumed=await runLichessCurriculumStage({panels:panelRows,block:recovered.block,
    brain:{...brain,memory:recovered.memory,memoryFingerprint:()=>digest(recovered.memory.snapshot())},
    familyRegistrationSha256,identity,lineageKey:'replica1:informative',outputDir:join(root,'stage-resumed'),maxBlocks:2,
    resumeStageFrom:first.checkpoint,guard:()=>{},pace:async()=>{}});
  assert.equal(resumed.status,'training-complete');assert.equal(resumed.completedBlocks,2);
  assert.equal(resumed.history.length,2);assert.equal(recovered.memory.events,64);
  assert.equal(resumed.initialMemorySha256,first.initialMemorySha256);
  assert.equal(resumed.finalMemorySha256,first.finalMemorySha256);
  assert.equal(JSON.parse(readFileSync(join(root,'stage-resumed','result.json'),'utf8')).status,'training-complete');
  const changedLineage=fixture();
  await assert.rejects(runLichessCurriculumStage({panels:panelRows,block:changedLineage.block,
    brain:{...brain,memory:changedLineage.memory,memoryFingerprint:()=>digest(changedLineage.memory.snapshot())},
    familyRegistrationSha256,identity,lineageKey:'replica1:absent',outputDir:join(root,'stage-wrong-lineage'),
    maxBlocks:2,resumeStageFrom:first.checkpoint,guard:()=>{},pace:async()=>{}}),/Changed memory lineage key/);
  assert.equal(existsSync(join(root,'stage-wrong-lineage')),false);
});

test('condition matrix yokes controls to informative plans and audits every memory lineage',async t=>{
  const root=workspace(t),familyRegistrationSha256='c'.repeat(64),calls=[];
  const panelRows=panels.map((registered,index)=>{
    const board=new Chess(index?'6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1':'6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1');
    const context={fen:board.fen(),pgn:board.pgn(),task};
    const experiences=board.moves({verbose:true}).map(move=>{
      const uci=move.from+move.to+(move.promotion??''),proof=certifyCaptureRetentionAction(board,uci,task);
      return {context,move:uci,proof,...checkCaptureRetentionAction(board,uci,task,proof)};
    });
    return {...registered,split:'train',familyRegistrationSha256,context,experiences};
  });
  const makeBrain=f=>({memory:f.memory,memoryFingerprint:()=>digest(f.memory.snapshot()),async assess(board,moves){
    const panel=panelRows.find(row=>row.context.fen===board.fen());assert(panel);
    const preferred=panel.experiences.find(row=>row.status==='success').move;
    const rows=moves.map(move=>{const uci=move.from+move.to+(move.promotion??'');return {move:uci,score:uci===preferred?1:0};});
    const best=Math.max(...rows.map(row=>row.score)),tiedTopMoves=rows.filter(row=>row.score===best).map(row=>row.move);
    return {rows,choice:tiedTopMoves.length===1?tiedTopMoves[0]:null,tiedTopMoves};
  }});
  let interruptDisabled=true,disabledChecks=0;const progressRows=[];
  const createArm=async({condition,lineageKey,plans,outputDir,identity,resumeStageFrom,resumeBlockFrom})=>{
      calls.push({condition,plans,resumeStageFrom,resumeBlockFrom});const f=fixture(condition);
      return {panels:panelRows,block:f.block,brain:makeBrain(f),familyRegistrationSha256,identity,
        outputDir,resumeStageFrom,maxBlocks:1,guard:()=>{
          if(condition==='disabled'&&interruptDisabled&&++disabledChecks===8)throw Error('fixture interruption');
        },pace:async()=>{}};
  };
  const options={stage:1,replicas:['replica-a'],conditions:['informative','absent','disabled'],
    maxBlocks:1,registrationSha256:'d'.repeat(64),createArm,guard:()=>{},pace:async()=>{},
    protocolBytes:Buffer.from('{"fixture":true}'),onProgress:row=>progressRows.push(row)};
  await assert.rejects(runLichessCurriculumStageMatrix({...options,outputDir:join(root,'matrix')}),/fixture interruption/);
  const priorState=join(root,'matrix','matrix-state.json');
  assert.equal(readFileSync(join(root,'matrix','protocol.json'),'utf8'),'{"fixture":true}');
  const result=await runLichessCurriculumStageMatrix({...options,outputDir:join(root,'matrix-resumed'),resumeStatePath:priorState});
  assert.equal(result.status,'training-complete');assert.equal(Object.keys(result.finalMemoryHashes).length,3);
  assert.equal(readFileSync(join(root,'matrix-resumed','protocol.json'),'utf8'),'{"fixture":true}');
  assert(progressRows.some(row=>row.event==='lineage-started'&&row.condition==='disabled'));
  assert(progressRows.some(row=>row.event==='lineage-complete'&&row.completedLineages===3));
  assert(progressRows.some(row=>row.event==='matrix-complete'&&row.totalLineages===3));
  interruptDisabled=false;
  assert.deepEqual(calls.map(row=>row.condition),['informative','absent','disabled','disabled']);
  assert(calls[3].resumeStageFrom,'Interrupted lineage did not resume from its published stage checkpoint');
  assert(calls[3].resumeBlockFrom,'Interrupted lineage did not resume from its pending block checkpoint');
  const informativePlan=JSON.parse(readFileSync(result.lineageResults['replica-a/informative'].resultPath,'utf8')).history[0].planSha256;
  for(const condition of ['absent','disabled']){
    assert.equal(calls.find(row=>row.condition===condition).plans.length,1);
    const controlPlan=JSON.parse(readFileSync(result.lineageResults[`replica-a/${condition}`].resultPath,'utf8')).history[0].planSha256;
    assert.equal(controlPlan,informativePlan);
  }
  const audit=await auditLichessCurriculumStageMatrix({resultPath:join(root,'matrix-resumed','result.json'),
    outputPath:join(root,'matrix-resumed','audit.json'),
    createReplayArm:async entry=>{
      const f=fixture(entry.condition),brain=makeBrain({...f});
      return {checkpoint:entry.checkpoint,identity:entry.identity,createReplayBlock:async()=>({block:f.block,
        assess:async context=>{
          const panel=panelRows.find(row=>row.context.fen===context.fen);assert(panel);
          const board=new Chess();board.loadPgn(context.pgn);
          return (await assessLichessTrainingPanel(panel,brain)).assessment;
        }})};
    },deriveAcceptanceEvidence:async()=>({stageAccepted:false,reason:'fixture gate deliberately not accepted'}),
    guard:()=>{},pace:async()=>{}});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.memoryContinuityVerified,true);
  assert.equal(audit.stageAccepted,false);assert.equal(audit.status,'gate-failed');
  assert.deepEqual(Object.keys(audit.finalMemoryHashes).sort(),Object.keys(result.finalMemoryHashes).sort());
});

test('readiness-blocked stage atomically publishes the campaign result',async t=>{
  const root=workspace(t),f=fixture(),familyRegistrationSha256='b'.repeat(64),stageDir=join(root,'blocked-stage');
  const panelRows=panels.map((registered,index)=>{
    const board=new Chess(index?'7k/8/8/8/8/8/8/K7 w - - 0 1':'7k/8/8/8/8/8/K7/8 w - - 0 1');
    const context={fen:board.fen(),pgn:board.pgn(),task};
    const experiences=board.moves({verbose:true}).map(move=>{
      const uci=move.from+move.to+(move.promotion??''),proof=certifyCaptureRetentionAction(board,uci,task);
      return {context,move:uci,proof,...checkCaptureRetentionAction(board,uci,task,proof)};
    });
    return {...registered,split:'train',familyRegistrationSha256,context,experiences};
  });
  const brain={memory:f.memory,memoryFingerprint:()=>digest(f.memory.snapshot()),async assess(board,moves){
    const rows=moves.map(move=>({move:move.from+move.to+(move.promotion??''),score:0}));
    return {rows,choice:null,tiedTopMoves:rows.map(row=>row.move)};
  }};
  const result=await runLichessCurriculumStage({panels:panelRows,block:f.block,brain,familyRegistrationSha256,
    identity:digest({test:'readiness-blocked stage'}),outputDir:stageDir,maxBlocks:1,guard:()=>{},pace:async()=>{}});
  assert.equal(result.status,'readiness-blocked');
  assert.equal(JSON.parse(readFileSync(join(stageDir,'result.json'),'utf8')).status,'readiness-blocked');
  assert.equal(existsSync(join(stageDir,'readiness-stop.json')),true);
});

test('JSON checkpoint prefixes resume identical receipts without repeating neural frames',()=>{
  const original=fixture();original.block.startBlock(plan(original));
  const snapshots=[{state:original.block.snapshot(),offset:0}],rows=[];
  while(original.block.pending){
    rows.push(next(original));
    if([1,4,9,10,14,20,29,39,40].includes(rows.length))snapshots.push({state:original.block.snapshot(),offset:rows.length});
  }
  for(const {state,offset} of snapshots){
    const restored=fixture();restored.block.restore(JSON.parse(JSON.stringify(state)));
    assert.deepEqual(finish(restored),rows.slice(offset));
    assert.deepEqual(restored.block.snapshot(),original.block.snapshot());
    assert.equal(restored.model.calls,rows.slice(offset).filter(r=>r.kind==='frame').length);
  }
});

test('stale ranking, changed plans, incomplete events and failed frames preserve state',()=>{
  const f=fixture();f.block.startBlock(plan(f));const stale=assess(f.block.nextContext(),f.memory);
  startEvent(f);const before=f.block.snapshot();
  assert.throws(()=>f.block.finishEvent(),/Incomplete/);assert.deepEqual(f.block.snapshot(),before);
  f.model.fail=true;assert.throws(()=>f.block.step(),/Nonfinite/);assert.deepEqual(f.block.snapshot(),before);f.model.fail=false;
  while(f.session.pending.cursor<8)f.block.step();f.block.finishEvent();
  const idle=f.block.snapshot();assert.throws(()=>f.block.startEvent(stale),/Stale/);assert.deepEqual(f.block.snapshot(),idle);
  f.block.pending.plan.events[1].role='tampered';assert.throws(()=>f.block.step(),/Changed block plan/);
  f.block.restore(idle);assert.deepEqual(f.block.snapshot(),idle);
});

test('corrupt checkpoint histories and incompatible identities reject transactionally',()=>{
  const f=fixture();f.block.startBlock(plan(f));startEvent(f);
  for(let i=0;i<8;i++)f.block.step();f.block.finishEvent();startEvent(f);f.block.step();
  const good=f.block.snapshot();
  for(const change of [s=>{s.completedBlocks++;},s=>{s.selectionCounts['panel-a']++;},
    s=>{s.pending.finishedEvents=[];},s=>{s.pending.finishedEvents[0].receipt.afterMemoryHash='c'.repeat(64);},
    s=>{s.pending.startChainHash='c'.repeat(64);},s=>{s.pending.shuffledStatuses=['success'];},
    s=>{s.session.pending.cursor++;},s=>{s.session.episode.state[0]=NaN;},s=>{s.identity='c'.repeat(64);}
  ]){
    const bad=structuredClone(good);change(bad);assert.throws(()=>f.block.restore(bad));
    assert.deepEqual(f.block.snapshot(),good);
  }
});

test('controls replay the informative plan with their own fresh memory assessments',()=>{
  const info=fixture(),p=plan(info),disabled=fixture('disabled');
  // Simulate a different valid control state before selection; no shared state.
  disabled.memory.events=7;const initial=disabled.memory.snapshot();
  const selected=disabled.block.startBlock(p);assert.notEqual(selected.conditionMemoryHash,selected.selectionMemoryHash);
  const rows=finish(disabled);assert.deepEqual(disabled.memory.snapshot(),initial);
  assert.equal(disabled.block.completedBlocks,1);assert.equal(rows.filter(r=>r.kind==='frame').length,32);
  const absent=fixture('absent');absent.block.startBlock(p);
  assert(finish(absent).filter(r=>r.kind==='frame').every(r=>r.receipt.receipt.stimulation.every(c=>c.index!==2)));
  assert.equal(absent.memory.events,32);
  const stale=fixture();stale.memory.events=7;assert.throws(()=>stale.block.startBlock(p),/Stale informative/);
});

test('shuffled feedback is pinned, resumable and does not change verified outcomes',()=>{
  const f=fixture('shuffled'),p=plan(f),statuses=['success','failure','failure','success'];
  assert.throws(()=>f.block.startBlock(p),/shuffle/);
  f.block.startBlock(p,{shuffledStatuses:statuses});startEvent(f);f.block.step();
  const restored=fixture('shuffled');restored.block.restore(f.block.snapshot());
  const a=finish(f),b=finish(restored);assert.deepEqual(a,b);
  const receipts=a.filter(r=>r.kind==='finish').map(r=>r.receipt.receipt.plan);
  assert.deepEqual(receipts.map(r=>r.teachingStatus),statuses);
  assert.deepEqual(receipts.map(r=>r.verifiedStatus),['failure','success','success','failure']);
  assert.throws(()=>fixture().block.restore(f.block.snapshot()),{code:'ERR_ASSERTION'});
});

function workspace(t){
  const root=mkdtempSync(join(tmpdir(),'fly-curriculum-block-'));
  assert(resolve(root).startsWith(resolve(tmpdir())+sep));
  t.after(()=>rmSync(root,{recursive:true,force:true}));return root;
}
function runOptions(f,p,outputDir){return {block:f.block,plan:p,outputDir,identity:'d'.repeat(64),
  assess:async context=>assess(context,f.memory),guard:()=>{},pace:async()=>{}};}

test('async lesson transactions recover and independently replay without a duplicate update',async t=>{
  const root=workspace(t),initial=fixture(),p=plan(initial),originalStep=initial.session.step.bind(initial.session);
  initial.session.step=async()=>{await Promise.resolve();return originalStep();};
  let interrupted;
  try{await runCurriculumBlock({...runOptions(initial,p,join(root,'interrupted')),interruptAfterPending:2});}
  catch(error){interrupted=error;}
  assert.equal(interrupted?.code,'CURRICULUM_INTERRUPTED');assert(interrupted.checkpoint);
  assert.equal(initial.memory.events,1);

  const resumed=fixture(),resumedStep=resumed.session.step.bind(resumed.session);
  resumed.session.step=async()=>{await Promise.resolve();return resumedStep();};
  const out=join(root,'resumed'),result=await runCurriculumBlock({...runOptions(resumed,p,out),resumeFrom:interrupted.checkpoint});
  assert.equal(resumed.memory.events,32);assert.equal(result.receiptCount,41);
  const replay=fixture(),replayStep=replay.session.step.bind(replay.session);
  replay.session.step=async()=>{await Promise.resolve();return replayStep();};
  const audit=await auditCurriculumBlock({...runOptions(replay,p,null),runDir:out,checkpoint:result.checkpoint});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.finalBlockSha256,digest(resumed.block.snapshot()));
  assert.equal(replay.memory.events,32);
});

test('disk publications recover pending and already appended receipts exactly once',async t=>{
  const root=workspace(t),baseline=fixture(),p=plan(baseline);
  const expected=await runCurriculumBlock(runOptions(baseline,p,join(root,'baseline')));
  assert.equal(expected.receiptCount,41);assert.equal(baseline.model.calls,32);
  const expectedLog=readFileSync(join(root,'baseline','receipts.jsonl'),'utf8');
  const replay=fixture(),audit=await auditCurriculumBlock({...runOptions(replay,p,null),
    runDir:join(root,'baseline'),checkpoint:expected.checkpoint});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.stageAccepted,false);
  assert.equal(audit.receiptCount,41);assert.equal(replay.model.calls,32);
  for(const injection of ['interruptAfterPending','interruptAfterAppend'])for(const sequence of [0,2,9,20,39,40]){
    const original=fixture(),parent=join(root,`${injection}-${sequence}`);let stopped;
    await assert.rejects(runCurriculumBlock({...runOptions(original,p,parent),[injection]:sequence}),error=>{
      stopped=error;return error.code==='CURRICULUM_INTERRUPTED';
    });
    assert(stopped.checkpoint);const parentLog=existsSync(join(parent,'receipts.jsonl'))?readFileSync(join(parent,'receipts.jsonl')):null;
    const restored=fixture(),out=parent+'-resumed';
    const result=await runCurriculumBlock({...runOptions(restored,p,out),resumeFrom:stopped.checkpoint});
    assert.equal(result.receiptCount,41);assert.equal(result.chainHash,expected.chainHash);
    assert.equal(readFileSync(join(out,'receipts.jsonl'),'utf8'),expectedLog);
    assert.deepEqual(restored.block.snapshot(),baseline.block.snapshot());
    assert.equal(original.model.calls+restored.model.calls,32);
    if(parentLog)assert.deepEqual(readFileSync(join(parent,'receipts.jsonl')),parentLog);
    assert(existsSync(result.checkpoint));
  }
});

test('disk recovery refuses partial logs, changed identity and incomplete publications',async t=>{
  const root=workspace(t),f=fixture(),p=plan(f),parent=join(root,'parent');let stopped;
  await assert.rejects(runCurriculumBlock({...runOptions(f,p,parent),interruptAfterPending:2}),error=>{
    stopped=error;return error.code==='CURRICULUM_INTERRUPTED';
  });
  for(const patch of [{resumeFrom:stopped.checkpoint+'.partial'},{identity:'e'.repeat(64)}]){
    const restored=fixture(),before=restored.block.snapshot(),out=join(root,'rejected');
    await assert.rejects(runCurriculumBlock({...runOptions(restored,p,out),resumeFrom:stopped.checkpoint,...patch}));
    assert.deepEqual(restored.block.snapshot(),before);assert(!existsSync(out));
  }
  const log=join(parent,'receipts.jsonl');writeFileSync(log,'{"partial":',{flag:'a'});
  const restored=fixture(),before=restored.block.snapshot();
  await assert.rejects(runCurriculumBlock({...runOptions(restored,p,join(root,'bad-log')),resumeFrom:stopped.checkpoint}));
  assert.deepEqual(restored.block.snapshot(),before);assert(!existsSync(join(root,'bad-log')));
});

test('disk record budget follows the pinned temporal frame schedule',async t=>{
  const root=workspace(t),timing={cueFrame:2,leadFrames:2,tailFrames:7,current:1.5};
  const f=fixture('informative',timing),p=plan(f);
  const result=await runCurriculumBlock(runOptions(f,p,join(root,'longer')));
  assert.equal(f.model.calls,40);assert.equal(result.receiptCount,49);
  assert(result.checkpoint.endsWith('checkpoint-000099.json.gz'));
});

test('separate replay rejects rehashed false neural records and false unaided rankings',async t=>{
  const root=workspace(t),f=fixture(),p=plan(f),out=join(root,'original');
  const result=await runCurriculumBlock(runOptions(f,p,out));
  const original=readFileSync(join(out,'receipts.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
  for(const [index,change,expected] of [
    [0,rows=>{rows.find(r=>r.kind==='frame').value.receipt.afterMemoryHash='e'.repeat(64);},/Block replay receipt mismatch/],
    [1,rows=>{rows.find(r=>r.kind==='event-start').value.assessment.rows[0].score+=0.5;},/Unaided assessment replay mismatch/],
  ]){
    const bad=join(root,`tampered-${index}`);mkdirSync(bad);const rows=structuredClone(original);
    change(rows);let chain=digest({identity:'d'.repeat(64),blockIdentity:f.block.identity});
    for(const row of rows){row.previousChainHash=chain;chain=digest(row);}
    writeFileSync(join(bad,'receipts.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
    const checkpoint=join(bad,basename(result.checkpoint));copyFileSync(result.checkpoint,checkpoint);
    const replay=fixture();await assert.rejects(auditCurriculumBlock({...runOptions(replay,p,null),runDir:bad,checkpoint}),expected);
  }
});

test('separate replay checks absent, disabled and registered shuffled conditions',async t=>{
  const root=workspace(t),p=plan(fixture());
  for(const condition of ['absent','disabled','shuffled']){
    const f=fixture(condition),out=join(root,condition),shuffledStatuses=condition==='shuffled'?['success','failure','failure','success']:null;
    const result=await runCurriculumBlock({...runOptions(f,p,out),shuffledStatuses});
    const replay=fixture(condition);
    const audit=await auditCurriculumBlock({...runOptions(replay,p,null),shuffledStatuses,runDir:out,checkpoint:result.checkpoint});
    assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.chainHash,result.chainHash);
    if(condition==='disabled')assert.equal(replay.memory.events,0);
  }
});

test('a later block preserves earlier exposure counts and the event chain in replay',async t=>{
  const root=workspace(t),f=fixture();await runCurriculumBlock(runOptions(f,plan(f),join(root,'first')));
  const initial=f.block.snapshot(),p=plan(f),out=join(root,'second');assert.equal(p.blockIndex,1);
  const result=await runCurriculumBlock(runOptions(f,p,out));
  const replay=fixture();replay.block.restore(initial);
  const audit=await auditCurriculumBlock({...runOptions(replay,p,null),runDir:out,checkpoint:result.checkpoint});
  assert.equal(audit.finalBlockSha256,digest(f.block.snapshot()));
  assert.equal(f.block.completedBlocks,2);assert.deepEqual(f.block.selectionCounts,{'panel-a':2,'panel-b':2});
});

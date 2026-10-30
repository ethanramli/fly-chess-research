import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {evaluateStage1Acceptance,evaluateStage1ReplicasAcceptance} from '../../src/puzzle-learning/curriculum-stage-acceptance.mjs';
import {evaluateStage1ReplicasAcceptance as evaluateStage1ReplicasAcceptanceV2}
  from '../../src/puzzle-learning/curriculum-stage1-acceptance-v2.mjs';

const hash='a'.repeat(64);
const strata=['open-defender','blocked-defender','absent-defender','pinned-apparent-defender'];
const pin=value=>createHash('sha256').update(value).digest('hex');
function choice(trialId,familyId,stratum,correct=true){return {trialId,familyId,stratum,taskCriterion:'capture-retention',
  positionSha256:pin(`position:${trialId}`),boardHistorySha256:pin(`history:${trialId}`),
  candidateSetSha256:pin(`candidates:${trialId}`),certificateSha256:pin(`certificate:${trialId}`),
  selectedAction:`move-${trialId}`,correct,unique:true,unaided:true};}
function fixture(){
  const trainingChoices=Array.from({length:24},(_,i)=>choice(`train-${i}`,`train-family-${i}`,strata[i%4],i!==23));
  const validationChoices=Array.from({length:16},(_,i)=>choice(`val-${i}`,`val-family-${i}`,strata[Math.floor(i/4)],
    i%4<(Math.floor(i/4)<2?4:3)));
  const finalChoices=[];for(let family=0;family<8;family++)for(let stratum=0;stratum<4;stratum++)for(let pair=0;pair<2;pair++){
    const i=finalChoices.length;finalChoices.push(choice(`final-${i}`,`final-family-${family}`,strata[stratum],
      !(pair===1&&stratum===family%4)));
  }
  const controls=Object.fromEntries(['scratch','absent','shuffled','disabled'].map(name=>[name,
    finalChoices.map((row,i)=>({...row,correct:i%8<5}))]));
  controls['outcome-only']=finalChoices.map((row,i)=>({...row,correct:i%8<5}));
  controls['stockfish-shuffled']=finalChoices.map((row,i)=>({...row,correct:i%8<5}));
  const consequenceProbes=Array.from({length:128},(_,i)=>{const board=finalChoices[Math.floor(i/2)];return {boardId:board.trialId,
    actionId:`action-${i%2}`,positionSha256:board.positionSha256,boardHistorySha256:board.boardHistorySha256,
    expectedSign:i%2===0?1:-1,predictedSign:i<4?0:(i%2===0?1:-1),certificateSha256:hash};});
  const counterfactualPairs=Array.from({length:32},(_,i)=>({pairId:`cf-${i}`,familyId:`final-family-${i%8}`,
    first:choice(`cf-${i}-a`,`final-family-${i%8}`,strata[i%4],i<28),
    second:choice(`cf-${i}-b`,`final-family-${i%8}`,strata[i%4],i<28),probeOrderingReversed:true}));
  return {prerequisites:{receiverAccepted:true,familySplitsDisjoint:true,sourceCertificatesReplayed:true,
      finalSetSealedUntilFreeze:true,independentStageReplay:true,memoryContinuityVerified:true},
    trainingChoices,validationChoices,finalChoices,consequenceProbes,counterfactualPairs,controls,
    retention:{validationChoices:Array.from({length:16},(_,i)=>choice(`ret-${i}`,`ret-family-${i}`,strata[Math.floor(i/4)],i<14)),
      earlierPrinciples:[],sentinels:[]},
    stateAudit:{removalLosesAcquiredAdvantage:true,restoreReproducesIdenticalRankings:true,fixedIdentitiesUnchanged:true,
      certificateAndUpdateReplay:true,pendingReceiptExactlyOnce:true,unaidedAndSearchSeparated:true}};
}

test('accepts Stage 1 only when frozen D1-D8 thresholds and prerequisites pass',()=>{
  const result=evaluateStage1Acceptance(fixture());
  assert.equal(result.status,'accepted',JSON.stringify(result.checks));assert.equal(result.stageAccepted,true);
  assert.deepEqual(Object.values(result.checks),Array(8).fill(true));
  assert.equal(result.metrics.finalCorrect,56);assert.equal(result.metrics.consequenceSignCorrect,124);
  assert.equal(result.metrics.pairedFamilyBootstrap.scratch.resamples,10_000);
  assert.equal(result.metrics.pairedFamilyBootstrap.scratch.lower95,16);
  assert.equal(result.metrics.pairedFamilyBootstrap.scratch.rng,'xorshift32');
});

test('missing or overlapping audit evidence stays unknown, while a measured prerequisite failure fails closed',()=>{
  assert.equal(evaluateStage1Acceptance(null).status,'unknown');
  const overlap=fixture();overlap.validationChoices[0].familyId=overlap.trainingChoices[0].familyId;
  assert.equal(evaluateStage1Acceptance(overlap).status,'unknown');
  const failed=fixture();failed.prerequisites.receiverAccepted=false;
  const result=evaluateStage1Acceptance(failed);
  assert.equal(result.status,'gate-failed');assert.equal(result.stageAccepted,false);
  assert.deepEqual(result.missingPrerequisites,['receiverAccepted']);
});

test('policy B defers only the registered Stage 1 D7; other missing retention stays unknown',()=>{
  const deferred=fixture();delete deferred.retention;deferred.retentionDeferral='stage1-d7-rechecked-by-stage2-v1';
  const result=evaluateStage1Acceptance(deferred);
  assert.equal(result.status,'accepted',JSON.stringify(result));assert.deepEqual(result.deferred,['D7']);
  assert.equal('D7' in result.checks,false);assert.equal(result.metrics.retentionCorrect,null);
  const missing=fixture();delete missing.retention;missing.retentionDeferral='any-other-reason';
  assert.equal(evaluateStage1Acceptance(missing).status,'unknown');
  const failing=fixture();failing.retentionDeferral='stage1-d7-rechecked-by-stage2-v1';failing.trainingChoices[0].correct=false;
  failing.trainingChoices[1].correct=false;failing.trainingChoices[2].correct=false;
  assert.equal(evaluateStage1Acceptance(failing).status,'gate-failed','deferral never rescues another gate');
});

test('ties and zero consequence predictions count as incorrect rather than missing',()=>{
  const evidence=fixture();evidence.finalChoices[0].unique=false;evidence.finalChoices[0].selectedAction=null;
  evidence.consequenceProbes[0].predictedSign=0;
  const result=evaluateStage1Acceptance(evidence);
  assert.equal(result.status,'accepted',JSON.stringify(result.checks));assert.equal(result.metrics.finalCorrect,55);
  assert.equal(result.metrics.consequenceSignCorrect,124);
});

test('fails causal gate when any matched control erases the required advantage',()=>{
  const evidence=fixture();evidence.controls.shuffled=evidence.finalChoices.map(row=>({...row}));
  const result=evaluateStage1Acceptance(evidence);
  assert.equal(result.status,'gate-failed');assert.equal(result.checks.D6,false);
  assert(result.failed.includes('D6'));
});

test('rejects mismatched control records and counterfactuals without reversal',()=>{
  const evidence=fixture();evidence.controls.absent[0].familyId='wrong-family';
  assert.equal(evaluateStage1Acceptance(evidence).status,'unknown');
  const reversal=fixture();reversal.counterfactualPairs[0].probeOrderingReversed=false;
  const result=evaluateStage1Acceptance(reversal);
  assert.equal(result.checks.D5,false);assert(result.failed.includes('D5'));
});

test('replica acceptance requires the pinned count and every replica to pass',()=>{
  const good=fixture(),bad=fixture();bad.stateAudit.pendingReceiptExactlyOnce=false;
  assert.equal(evaluateStage1ReplicasAcceptance({replicas:[good],requiredReplicaCount:2}).status,'unknown');
  const result=evaluateStage1ReplicasAcceptance({replicas:[good,bad],requiredReplicaCount:2});
  assert.equal(result.status,'gate-failed');assert.equal(result.stageAccepted,false);
  assert.deepEqual(result.failedReplicas,[2]);
  const allPass=evaluateStage1ReplicasAcceptance({replicas:[good,fixture()],requiredReplicaCount:2});
  assert.equal(allPass.status,'accepted');assert.equal(allPass.acceptedReplicas,2);
});

test('D9 requires the informative arm to beat both outcome-only and shuffled-Stockfish controls',()=>{
  const evidence=fixture();
  const accepted=evaluateStage1ReplicasAcceptanceV2({replicas:[evidence],requiredReplicaCount:1});
  assert.equal(accepted.status,'accepted');
  assert.equal(accepted.reports[0].checks.D9,true);
  assert.equal(accepted.reports[0].metrics.stockfishAssistance['outcome-only'].advantage,16);
  assert.equal(accepted.reports[0].metrics.stockfishAssistance['stockfish-shuffled'].advantage,16);

  const matched=fixture();matched.controls['outcome-only']=matched.finalChoices.map(row=>({...row}));
  const failed=evaluateStage1ReplicasAcceptanceV2({replicas:[matched],requiredReplicaCount:1});
  assert.equal(failed.status,'gate-failed');assert.equal(failed.reports[0].checks.D9,false);
  assert(failed.failedReplicas.includes(1));
});

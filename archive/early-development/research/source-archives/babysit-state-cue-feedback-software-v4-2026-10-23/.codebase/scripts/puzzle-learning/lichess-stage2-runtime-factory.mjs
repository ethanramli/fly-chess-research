// Stage 2 runtime for the shared resumable Lichess matrix/block pipeline.
// It consumes only pinned training panels and pre-collected Stockfish reviews.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Chess} from 'chess.js';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {createLichessStage2Brain} from '../../src/puzzle-learning/lichess-stage2-brain-factory.mjs';
import {bindLichessStage2AvoidMatePanel} from '../../src/puzzle-learning/lichess-stage2-avoid-mate-panel.mjs';
import {bindLichessTrainingPanel,assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {bindLichessStockfishReview} from '../../src/puzzle-learning/lichess-stockfish-review.mjs';
import {CoupledStockfishSession} from '../../src/puzzle-learning/coupled-stockfish-session.mjs';
import {CurriculumBlockSession} from '../../src/puzzle-learning/curriculum-block-session.mjs';
import {restoreCurriculumStageMemory} from '../../src/puzzle-learning/curriculum-memory-handoff.mjs';
import {runCurriculumRetentionChallenge,auditCurriculumRetentionChallenge} from '../../src/puzzle-learning/curriculum-retention-challenge.mjs';
import {registeredOutcomeShuffle} from '../../src/puzzle-learning/curriculum-outcome-shuffle.mjs';
import {observePostInterferenceRetention} from '../../src/puzzle-learning/curriculum-retention-observations.mjs';
import {publishRetentionPromotion} from '../../src/puzzle-learning/curriculum-retention-promotion.mjs';

const repositoryRoot=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const contextKey=context=>digest({fen:context.fen,pgn:context.pgn,task:context.task,
  historyKind:context.historyKind??'standard-start-pgn',parentSourceRecordSha256:context.parentSourceRecordSha256??null});
const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

function pinnedBytes(root,ref,maxBytes){
  assert(typeof ref?.path==='string'&&/^[A-Za-z0-9._/-]+$/.test(ref.path));assert(isHash(ref.sha256));
  const path=resolve(root,ref.path),rel=relative(resolve(root),path);
  assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Stage 2 input escapes repository');
  const bytes=readFileSync(path);assert(bytes.length<=maxBytes,`Stage 2 input exceeds ${maxBytes} bytes`);
  assert.equal(sha256(bytes),ref.sha256,`Pinned Stage 2 input changed: ${ref.path}`);return bytes;
}

function readRows(root,group){
  assert(Array.isArray(group?.files)&&group.files.length>=1&&group.files.length<=8);
  const rows=[];
  for(const ref of group.files){
    for(const line of pinnedBytes(root,ref,16*2**20).toString('utf8').split(/\r?\n/))if(line)rows.push(JSON.parse(line));
  }
  const byPuzzle=new Map();
  for(const row of rows){
    assert.equal(row.split,'train');assert(row.lesson?.puzzleId&&row.history?.puzzleId===row.lesson.puzzleId);
    const id=row.lesson.lessonId??row.lesson.puzzleId;assert(!byPuzzle.has(id),'Duplicate Stage 2 lesson');byPuzzle.set(id,row);
  }
  return byPuzzle;
}

function loadAssets(registration,root){
  assert.equal(registration?.stage,2,'Stage 2 runtime only');
  const dataAudit=JSON.parse(pinnedBytes(root,registration.dataAudit,8*2**20));
  assert.equal(dataAudit.schema,registration.dataAudit.schema);
  for(const gate of ['eligibleForNeuralTeaching','relationFamilyDisjointnessEstablished','graphLaunchAuthorized'])
    assert.equal(dataAudit[gate],true,`Stage 2 data audit denies ${gate}`);
  assert.equal(dataAudit.finalSplitInspected,false,'Stage 2 final split must remain sealed during training');
  const familyBytes=pinnedBytes(root,registration.trainingFamilies,8*2**20);
  const familyDoc=JSON.parse(familyBytes),familyRegistrationSha256=sha256(familyBytes);
  assert.equal(familyDoc.schema,'lichess-stage2-training-families-v1');
  assert.equal(dataAudit.familyRegistrationSha256,familyRegistrationSha256);
  assert(Array.isArray(familyDoc.assignments)&&familyDoc.assignments.length>=2&&familyDoc.assignments.length<=64);
  assert(familyDoc.assignments.every(row=>row.split==='train'&&[1,2].includes(row.stage)
    &&typeof row.puzzleId==='string'&&typeof row.panelId==='string'&&typeof row.familyId==='string'));
  assert([1,2].every(stage=>familyDoc.assignments.some(row=>row.stage===stage)),
    'Stage 2 requires current lessons and earlier Stage 1 rehearsal panels');
  const rows=readRows(root,registration.trainingRows);
  const panels=familyDoc.assignments.map(family=>{
    const row=rows.get(family.lessonId??family.puzzleId);assert(row,'Stage 2 family points outside pinned lesson rows');
    const binding={...family,registrationSha256:familyRegistrationSha256};
    if(family.stage===1)return bindLichessTrainingPanel(row,binding);
    assert.equal(row.lesson.stage2DomainEligible,true);
    return bindLichessStage2AvoidMatePanel(row,binding);
  });
  assert.equal(new Set(panels.map(row=>row.panelId)).size,panels.length,'Duplicate Stage 2 panel');

  const reviewBytes=pinnedBytes(root,registration.stockfishReviews,64*2**20);
  const reviewDoc=JSON.parse(reviewBytes);
  assert.equal(reviewDoc.schema,'lichess-stage2-stockfish-reviews-v1');
  assert.equal(reviewDoc.familyRegistrationSha256,familyRegistrationSha256);
  assert(Array.isArray(reviewDoc.reviews)&&reviewDoc.reviews.length===panels.length);
  const rawReviews=new Map(reviewDoc.reviews.map(row=>[row.panelId,row.review]));
  assert.equal(rawReviews.size,panels.length,'Duplicate or missing Stage 2 Stockfish review');
  const panelReviews=panels.map(panel=>{
    const review=rawReviews.get(panel.panelId);assert(review,'Missing Stage 2 Stockfish review');
    const boundReview=bindLichessStockfishReview(panel,review);assert.equal(boundReview.ready,true);
    return {panel,boundReview};
  });
  const selectionPresentations=panels.reduce((total,panel)=>{
    const board=new Chess();board.loadPgn(panel.context.pgn);assert.equal(board.fen(),panel.context.fen);
    const legal=board.moves({verbose:true});assert(legal.length>0&&legal.length<=256);return total+legal.length;
  },0);
  return {panels,panelReviews,familyRegistrationSha256,selectionPresentations,
    inputHashes:{dataAudit:registration.dataAudit.sha256,trainingFamilies:registration.trainingFamilies.sha256,
      trainingRows:registration.trainingRows.files.map(row=>row.sha256),stockfishReviews:registration.stockfishReviews.sha256}};
}

async function buildArm({registration,replica,condition,lineageKey,outputDir,identity,guard,pace,sourceMemory=null}){
  assert.equal(registration.feedbackProtocol,'verified-outcome-plus-stockfish-v2');
  assert(hashLineage(lineageKey)&&isHash(identity));assert.equal(typeof outputDir,'string');
  guard();
  const loaded=loadAssets(registration,repositoryRoot);
  const assets=sourceMemory===null?loaded:{...loaded,
    panels:loaded.panels.filter(panel=>panel.stage<2),
    panelReviews:loaded.panelReviews.filter(row=>row.panel.stage<2)};
  if(sourceMemory!==null){
    assert(assets.panels.length>=2,'Retention requires two earlier training panels');
    assets.selectionPresentations=assets.panels.reduce((count,panel)=>count+panel.experiences.length,0);
  }
  guard();
  const learner=createLichessStage2Brain({registration,replica,repositoryRoot,guard,pace});
  const initialMemoryHandoff=restoreCurriculumStageMemory({registration,replica,condition,
    repositoryRoot,brain:learner.brain,guard});
  if(sourceMemory!==null){learner.memory.restore(sourceMemory);assert.equal(learner.brain.memoryFingerprint(),digest(sourceMemory));}
  const outcomeShuffle=condition==='shuffled'?registeredOutcomeShuffle(registration.outcomeShuffle):null;
  const shuffleIdentity=condition==='stockfish-shuffled'?registration.stockfishShuffle?.sha256:null;
  if(condition==='stockfish-shuffled')assert(isHash(shuffleIdentity),'Missing Stage 2 Stockfish shuffle schedule');
  const sessionIdentity=digest({schema:'lichess-stage2-session-v1',runtimeIdentity:learner.identity,
    familyRegistrationSha256:assets.familyRegistrationSha256,
    panelReviews:assets.panelReviews.map(row=>row.boundReview.identity),condition,lineageKey,shuffleIdentity,
    initialMemoryHandoff,phase:sourceMemory===null?'acquisition':'retention',
    selectedSourceMemorySha256:sourceMemory===null?null:digest(sourceMemory),
    outcomeShuffleIdentity:outcomeShuffle?.identity??null});
  const session=new CoupledStockfishSession({brain:learner.brain,panelReviews:assets.panelReviews,
    identity:sessionIdentity,stockfishShuffleIdentity:shuffleIdentity,feedbackProtocol:registration.feedbackProtocol});
  const registeredPanels=assets.panels.map(panel=>({panelId:panel.panelId,stage:panel.stage}));
  const block=new CurriculumBlockSession({session,currentStage:sourceMemory===null?2:1,registeredPanels,condition,
    shuffleIdentity:condition==='stockfish-shuffled'?shuffleIdentity:outcomeShuffle?.identity??null});
  return {panels:assets.panels,block,brain:learner.brain,familyRegistrationSha256:assets.familyRegistrationSha256,
    identity,outputDir,guard,pace,assets,constructed:learner,initialMemoryHandoff,
    shuffledStatusesForBlock:outcomeShuffle?.statusesForBlock??(()=>null)};
}

function hashLineage(value){return typeof value==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(value);}

export async function createTrainingArm(context){
  assert.equal(context.stage,2);return buildArm({...context,registration:context.registration});
}

export async function createReplayArm({entry,registration,guard,pace}){
  const runtime=await buildArm({registration,replica:entry.replica,condition:entry.condition,
    lineageKey:entry.lineageKey,outputDir:entry.attempt,identity:entry.identity,guard,pace});
  return replayArm(runtime,entry);
}

function replayArm(runtime,entry){
  const panelsByContext=new Map(runtime.panels.map(panel=>[contextKey(panel.context),panel]));
  return {checkpoint:entry.checkpoint,identity:runtime.identity,createReplayBlock:async({stageCheckpoint})=>{
    assert.equal(stageCheckpoint?.schema,'lichess-curriculum-stage-v1');
    assert.equal(stageCheckpoint.identity,entry.identity);assert.equal(stageCheckpoint.lineageKey,entry.lineageKey);
    assert.equal(stageCheckpoint.condition,entry.condition);assert.equal(stageCheckpoint.stage,runtime.block.currentStage);
    return {block:runtime.block,selectionPresentations:runtime.assets.selectionPresentations,
      shuffledStatusesForBlock:runtime.shuffledStatusesForBlock,assess:async context=>{
      const panel=panelsByContext.get(contextKey(context));assert(panel,'Replay context outside Stage 2 registered panels');
      return (await assessLichessTrainingPanel(panel,runtime.brain)).assessment;
    }};
  }};
}

export async function runRetentionChallenge({registration,selected,outputDir,resumeStatePath=null,
  parentRegistrationSha256,guard,pace,onProgress=()=>{}}){
  assert.equal(registration.stage,2);
  return runCurriculumRetentionChallenge({stage:2,replicas:registration.replicas,selected,repositoryRoot,
    parentRegistrationSha256,outputDir,resumeStatePath,guard,pace,onProgress,
    createArm:context=>buildArm({...context,registration,guard,pace})});
}

export async function auditRetentionChallenge({registration,selected,resultPath,outputPath,
  parentRegistrationSha256,evaluationPanels=null,guard,pace}){
  assert.equal(registration.stage,2);
  return auditCurriculumRetentionChallenge({stage:2,replicas:registration.replicas,selected,repositoryRoot,
    parentRegistrationSha256,resultPath,outputPath,guard,pace,createReplayArm:async({entry,sourceMemory})=>{
      const runtime=await buildArm({registration,replica:entry.replica,condition:entry.condition,
        lineageKey:entry.lineageKey,outputDir:entry.attempt,identity:entry.identity,guard,pace,sourceMemory});
      return replayArm(runtime,entry);
    },observePostInterference:evaluationPanels===null?null:async({entry,selectedMemory,postMemory})=>{
      const runtime=await buildArm({registration,replica:entry.replica,condition:entry.condition,
        lineageKey:entry.lineageKey,outputDir:entry.attempt,identity:entry.identity,guard,pace});
      const baselineMemory=runtime.brain.memory.snapshot();
      return observePostInterferenceRetention({stage:2,replica:entry.replica,condition:entry.condition,
        brain:runtime.brain,baselineMemory,selectedMemory,postMemory,panels:evaluationPanels,guard});
    }});
}

export async function deriveAcceptanceEvidence({result,lineageAudits,registration,guard=()=>{},pace=async()=>{}}){
  const expected=result.replicas.flatMap(replica=>result.conditions.map(condition=>`${replica}:${condition}`)).sort();
  assert.deepEqual(Object.keys(lineageAudits).sort(),expected);
  const ref=registration.stageAcceptanceEvaluator;
  if(!ref)return {schema:'lichess-stage2-acceptance-evidence-v1',status:'unknown',stageAccepted:false,
    unknown:['Registration lacks a pinned independent Stage 2 acceptance evaluator']};
  guard();const bytes=pinnedBytes(repositoryRoot,ref,8*2**20);
  const evaluator=await import(pathToFileURL(resolve(repositoryRoot,ref.path)).href);
  assert.equal(typeof evaluator.deriveStage2AcceptanceObservations,'function');
  assert.equal(typeof evaluator.evaluateStage2ReplicasAcceptance,'function');
  const observations=await evaluator.deriveStage2AcceptanceObservations({result,lineageAudits,registration,
    repositoryRoot,guard,pace,createEvaluationArm:async({entry})=>buildArm({registration,replica:entry.replica,
      condition:entry.condition,lineageKey:entry.lineageKey,outputDir:entry.attempt,identity:entry.identity,guard,pace}),
    runRetentionChallenge:options=>runRetentionChallenge({...options,registration,
      parentRegistrationSha256:result.registrationSha256,guard,pace}),
    auditRetentionChallenge:options=>auditRetentionChallenge({...options,registration,
      parentRegistrationSha256:result.registrationSha256,guard,pace}),
    publishRetentionPromotion:options=>publishRetentionPromotion({...options,repositoryRoot,parentResult:result,guard})});
  assert.equal(observations.schema,'lichess-stage2-acceptance-observations-v1');
  assert.equal(observations.stage,2);assert.equal(observations.matrixResultSha256,digest(result));
  assert.equal(observations.registrationSha256,result.registrationSha256);
  assert.equal(observations.replicas.length,result.replicas.length);
  const evidence=observations.replicas.map((row,index)=>{
    const replica=result.replicas[index],keys=result.conditions.map(condition=>`${replica}:${condition}`).sort();
    assert.equal(String(row.replica),String(replica));
    const initial={},final={};for(const key of keys){
      const audit=lineageAudits[key];assert(audit?.fullNeuralReplay&&audit?.memoryContinuityVerified);
      initial[key]=audit.initialMemoryHashes[key];final[key]=audit.finalMemoryHashes[key];
    }
    assert.deepEqual(row.initialMemoryHashes,initial);assert.deepEqual(row.finalMemoryHashes,final);
    assert(row.evidence&&typeof row.evidence==='object');
    return {...row.evidence,prerequisites:{...row.evidence.prerequisites,
      independentStageReplay:true,memoryContinuityVerified:true}};
  });
  const acceptance=evaluator.evaluateStage2ReplicasAcceptance({replicas:evidence,requiredReplicaCount:result.replicas.length});
  return {...acceptance,promotionMemoryHashes:observations.promotionMemoryHashes??null,
    checkpointSelection:observations.checkpointSelection??null,retentionPromotion:observations.retentionPromotion??null,evaluatorSha256:sha256(bytes),
    observationsSha256:digest(observations),matrixResultSha256:digest(result),
    registrationSha256:result.registrationSha256};
}

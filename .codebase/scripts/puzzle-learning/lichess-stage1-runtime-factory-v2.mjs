// Production-facing Stage 1 arm factory v2 (2026-10-24): identical to
// lichess-stage1-runtime-factory.mjs (pinned by earlier runs) except that it
// builds the learner with lichess-stage1-brain-factory-v2.mjs (action-relative cue
// v2 and coupled brain v3; fix goal reviewer finding 2).
// It consumes training-only prepared rows and pre-collected Stockfish reviews;
// it never starts an engine or derives a scientific acceptance pass.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFileSync,closeSync,existsSync,fsyncSync,mkdirSync,openSync,readFileSync,readdirSync,renameSync,statSync,writeFileSync} from 'node:fs';
import {dirname,relative,resolve,isAbsolute,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Chess} from 'chess.js';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {createLichessStage1BrainV2 as createLichessStage1Brain} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v2.mjs';
import {bindLichessTrainingPanel,assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {bindLichessStockfishReview} from '../../src/puzzle-learning/lichess-stockfish-review.mjs';
import {CoupledStockfishSession} from '../../src/puzzle-learning/coupled-stockfish-session.mjs';
import {collectLichessStockfishReview} from '../../src/puzzle-learning/stockfish-review-collector.mjs';
import {CurriculumBlockSession} from '../../src/puzzle-learning/curriculum-block-session.mjs';
import {evaluateStage1ReplicasAcceptance} from '../../src/puzzle-learning/curriculum-stage1-acceptance-v2.mjs';
import {registeredOutcomeShuffle} from '../../src/puzzle-learning/curriculum-outcome-shuffle.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const repositoryRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const contextKey=context=>digest({fen:context.fen,pgn:context.pgn,task:context.task,
  historyKind:context.historyKind??'standard-start-pgn',parentSourceRecordSha256:context.parentSourceRecordSha256??null});

function pinnedFile(root,ref,maxBytes){
  assert(typeof ref?.path==='string'&&/^[A-Za-z0-9._/-]+$/.test(ref.path));
  assert(hash(ref.sha256));
  const path=resolve(root,ref.path),rel=relative(resolve(root),path);
  assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Registered runtime input escapes repository');
  const bytes=readFileSync(path);
  assert(bytes.length<=maxBytes,`Registered runtime input exceeds ${maxBytes} bytes: ${ref.path}`);
  assert.equal(sha256(bytes),ref.sha256,`Registered runtime input changed: ${ref.path}`);
  return bytes;
}

function atomicJson(path,value){
  mkdirSync(dirname(path),{recursive:true});const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

async function bindReviews(registration,panels,root,guard,pace){
  if(registration.stockfishReviews){
    const reviewBytes=pinnedFile(root,registration.stockfishReviews,64*2**20);
    const reviewDoc=JSON.parse(reviewBytes);
    assert.equal(reviewDoc.schema,'lichess-stage1-stockfish-reviews-v1');
    return {reviews:reviewDoc,sourceSha256:registration.stockfishReviews.sha256};
  }
  const config=registration.stockfishCollection;
  assert.equal(config?.schema,'registered-stockfish-collection-v1',
    'Register either a pinned review file or a resumable Stockfish collection');
  assert(typeof config.executable==='string'&&config.executable.length>0);
  assert(isAbsolute(config.executable),'Pin an absolute Stockfish executable path');
  assert(hash(config.binarySha256));
  assert(Array.isArray(config.budgets)&&config.budgets.length>=2&&config.budgets.length<=4);
  assert(config.budgets.every(Number.isSafeInteger)&&new Set(config.budgets).size===config.budgets.length);
  assert(Array.isArray(config.args??[])&&(config.args??[]).every(value=>typeof value==='string'));
  assert(typeof config.cacheDir==='string'&&/^[A-Za-z0-9._/-]+$/.test(config.cacheDir));
  const cacheDir=resolve(root,config.cacheDir),relativeCache=relative(resolve(root),cacheDir);
  assert(relativeCache!==''&&!relativeCache.startsWith('..')&&!isAbsolute(relativeCache),
    'Stockfish review cache must be a fresh repository-local run directory');
  assert(relativeCache.startsWith(`runs${process.platform==='win32'?'\\':'/'}`),
    'Stockfish review cache must be preserved under runs/');
  const configIdentity=digest({schema:config.schema,binarySha256:config.binarySha256,
    budgets:config.budgets,search:config.search??'nodes',timeoutMs:config.timeoutMs,maxElapsedMs:config.maxElapsedMs,
    hashMiB:config.hashMiB,args:config.args??[],panels:panels.map(panel=>({panelId:panel.panelId,
      context:panel.context,familyRegistrationSha256:panel.familyRegistrationSha256,
      experiences:panel.experiences.map(row=>({move:row.move,certificateSha256:row.certificateSha256}))}))});
  const identityPath=join(cacheDir,'identity.json'),manifestPath=join(cacheDir,'manifest.json');
  if(existsSync(cacheDir)){
    assert(existsSync(identityPath),'Incomplete Stockfish cache has no identity; preserve it and register a new cache directory');
    const cacheIdentity=JSON.parse(readFileSync(identityPath,'utf8'));
    assert.equal(cacheIdentity.schema,'lichess-stage1-stockfish-cache-identity-v1');
    assert.equal(cacheIdentity.configIdentity,configIdentity,'Stockfish cache belongs to another engine or panel set');
    assert.deepEqual(cacheIdentity.panelIds,panels.map(panel=>panel.panelId));
    if(existsSync(manifestPath)){
      const cached=JSON.parse(readFileSync(manifestPath,'utf8'));
      assert.equal(cached.schema,'lichess-stage1-stockfish-cache-v1');
      assert.equal(cached.configIdentity,configIdentity);
      assert.equal(cached.panels.length,panels.length);
      const reviews=cached.panels.map((entry,index)=>{
        assert.equal(entry.panelId,panels[index].panelId);
        assert(/^[a-f0-9]{24}\.review\.json$/.test(entry.file));
        const path=join(cacheDir,entry.file),bytes=readFileSync(path);
        assert.equal(sha256(bytes),entry.sha256,'Cached Stockfish review changed');
        const review=JSON.parse(bytes),boundReview=bindLichessStockfishReview(panels[index],review);
        assert.equal(boundReview.ready,true,'Cached Stockfish review is incomplete');
        assert.equal(boundReview.identity,entry.reviewIdentity,'Cached review binding identity changed');
        assert(Array.isArray(entry.rawLogs)&&entry.rawLogs.length>=1);
        for(const log of entry.rawLogs){
          assert(/^[a-f0-9]{24}\.attempt-[0-9]{3}\.uci\.jsonl$/.test(log.file));
          const rawBytes=readFileSync(join(cacheDir,log.file));assert.equal(rawBytes.length,log.bytes);
          assert.equal(sha256(rawBytes),log.sha256,'Cached Stockfish raw log changed');
        }
        return {panel:panels[index],boundReview};
      });
      return {reviews:{schema:'lichess-stage1-stockfish-reviews-v1',familyRegistrationSha256:panels[0].familyRegistrationSha256,
        reviews:cached.panels.map(entry=>({panelId:entry.panelId,review:JSON.parse(readFileSync(join(cacheDir,entry.file),'utf8'))}))},
        sourceSha256:sha256(readFileSync(manifestPath)),panelReviews:reviews};
    }
  }else{
    mkdirSync(cacheDir,{recursive:true});
    atomicJson(identityPath,{schema:'lichess-stage1-stockfish-cache-identity-v1',configIdentity,
      familyRegistrationSha256:panels[0].familyRegistrationSha256,panelIds:panels.map(panel=>panel.panelId)});
  }
  const panelRows=[];const panelReviews=[];
  for(const panel of panels){
    guard();const stem=sha256(Buffer.from(panel.panelId)).slice(0,24),file=`${stem}.review.json`;
    const reviewPath=join(cacheDir,file);
    let review,boundReview,elapsedMs=0;
    if(existsSync(reviewPath)){
      assert(!existsSync(reviewPath+'.partial'),'Preserve incomplete Stockfish review publication');
      review=JSON.parse(readFileSync(reviewPath,'utf8'));
      boundReview=bindLichessStockfishReview(panel,review);
      assert.equal(boundReview.ready,true);
    }else{
      assert(!existsSync(reviewPath+'.partial'),'Preserve incomplete Stockfish review publication');
      const logs=readdirSync(cacheDir).filter(name=>name.startsWith(stem+'.attempt-')&&name.endsWith('.uci.jsonl'));
      const attempts=logs.map(name=>Number(name.match(/\.attempt-(\d{3})\.uci\.jsonl$/)?.[1]??0));
      const attempt=Math.max(0,...attempts)+1;assert(attempt<=999,'Stockfish collection retry limit reached');
      const rawLog=`${stem}.attempt-${String(attempt).padStart(3,'0')}.uci.jsonl`,rawPath=join(cacheDir,rawLog);
      let rawBytes=0;const started=performance.now();
      const previousAttempts=logs.sort();
      appendFileSync(rawPath,JSON.stringify({direction:'meta',line:'collection-attempt-start',
        retryOf:previousAttempts})+'\n',{flag:'wx'});
      rawBytes=statSync(rawPath).size;
      // The collector returns the bound review; cache the raw review it bound.
      const collected=await collectLichessStockfishReview(panel,{executable:config.executable,
        binarySha256:config.binarySha256,budgets:config.budgets,search:config.search??'nodes',timeoutMs:config.timeoutMs,
        maxElapsedMs:config.maxElapsedMs,hashMiB:config.hashMiB,args:config.args??[],guard,
        record:(direction,line)=>{
          const row=JSON.stringify({direction,line:String(line)})+'\n';rawBytes+=Buffer.byteLength(row);
          assert(rawBytes<=64*2**20,'Stockfish raw transcript exceeds the registered per-panel limit');
          appendFileSync(rawPath,row);
        }});
      assert.equal(collected.ready,true,`Stockfish review incomplete for panel ${panel.panelId}: ${collected.reason} (move ${collected.blockedMove})`);
      assert.equal(collected.engine.binarySha256,config.binarySha256);
      const board=new Chess();board.loadPgn(panel.context.pgn);
      review={criterion:'full-game-expected-score',context:collected.context,actor:board.turn(),
        engine:collected.engine,analyses:collected.analyses};
      boundReview=bindLichessStockfishReview(panel,review);
      assert.equal(boundReview.ready,true,`Stockfish review incomplete for panel ${panel.panelId}`);
      assert.equal(boundReview.identity,collected.identity,'Cached raw review does not reproduce the collected binding');
      // Windows refuses to flush a read-only handle (EPERM); 'r+' never truncates.
      const logFd=openSync(rawPath,'r+');try{fsyncSync(logFd);}finally{closeSync(logFd);}
      elapsedMs=performance.now()-started;
      atomicJson(reviewPath,review);
    }
    const rawLogs=readdirSync(cacheDir).filter(name=>name.startsWith(stem+'.attempt-')&&name.endsWith('.uci.jsonl'))
      .sort().map(name=>{assert(/^[a-f0-9]{24}\.attempt-[0-9]{3}\.uci\.jsonl$/.test(name));
        const bytes=readFileSync(join(cacheDir,name));return {file:name,bytes:bytes.length,sha256:sha256(bytes)};});
    assert(rawLogs.length>=1,'Completed Stockfish review lacks its raw UCI logs');
    assert(rawLogs.reduce((sum,row)=>sum+row.bytes,0)<=64*2**20,'Stockfish raw transcript exceeds the registered per-panel limit');
    panelRows.push({panelId:panel.panelId,file,sha256:sha256(readFileSync(reviewPath)),rawLogs,
      reviewIdentity:boundReview.identity,elapsedMs});
    panelReviews.push({panel,boundReview});
    if(elapsedMs>0)await pace(elapsedMs);
  }
  const manifest={schema:'lichess-stage1-stockfish-cache-v1',configIdentity,
    familyRegistrationSha256:panels[0].familyRegistrationSha256,panels:panelRows,
    scope:'Registered all-legal Stockfish estimates; independently certified task consequences remain separate'};
  atomicJson(join(cacheDir,'manifest.json'),manifest);
  const reviews={schema:'lichess-stage1-stockfish-reviews-v1',
    familyRegistrationSha256:panels[0].familyRegistrationSha256,
    reviews:panelReviews.map(({panel},index)=>({panelId:panel.panelId,review:JSON.parse(readFileSync(join(cacheDir,panelRows[index].file),'utf8'))}))};
  return {reviews,sourceSha256:sha256(readFileSync(join(cacheDir,'manifest.json'))),panelReviews};
}

async function loadAssets(registration,root,guard,pace){
  assert.equal(registration?.stage,1,'This runtime factory is Stage 1 only');
  const auditBytes=pinnedFile(root,registration.dataAudit,8*2**20),audit=JSON.parse(auditBytes);
  for(const gate of ['eligibleForNeuralTeaching','relationFamilyDisjointnessEstablished','graphLaunchAuthorized'])
    assert.equal(audit[gate],true,`Stage 1 audit denies ${gate}`);
  assert.equal(audit.finalSplitInspected,false,'Final data must remain sealed during training');
  guard();

  const familyBytes=pinnedFile(root,registration.trainingFamilies,8*2**20);
  const familyDoc=JSON.parse(familyBytes),familyRegistrationSha256=sha256(familyBytes);
  assert.equal(familyDoc.schema,'lichess-stage1-training-families-v1');
  assert.equal(audit.familyRegistrationSha256,familyRegistrationSha256,'Lesson audit does not bind this family registration');
  assert(Array.isArray(familyDoc.assignments)&&familyDoc.assignments.length>=2&&familyDoc.assignments.length<=64);
  assert(familyDoc.assignments.every(row=>row.split==='train'&&row.stage===1
    &&typeof row.puzzleId==='string'&&typeof row.panelId==='string'&&typeof row.familyId==='string'));
  const lessonKey=record=>record.lesson.lessonId??record.lesson.puzzleId;
  const byLesson=new Map(familyDoc.assignments.map(row=>[row.lessonId??row.puzzleId,row]));
  assert.equal(byLesson.size,familyDoc.assignments.length,'Duplicate training-family lesson assignment');
  const records=[];
  assert(Array.isArray(registration.trainingRows?.files)&&registration.trainingRows.files.length>=1
    &&registration.trainingRows.files.length<=8);
  for(const ref of registration.trainingRows.files){
    const bytes=pinnedFile(root,ref,16*2**20),text=bytes.toString('utf8');
    for(const line of text.split(/\r?\n/))if(line)records.push(JSON.parse(line));
  }
  guard();
  const rows=new Map();
  for(const record of records){
    assert.equal(record.split,'train','Only registered training rows may enter the runtime');
    assert(record.lesson?.puzzleId&&record.history?.puzzleId===record.lesson.puzzleId);
    assert(typeof lessonKey(record)==='string'&&lessonKey(record).length>0,'Missing unique lesson identity');
    assert.equal(rows.has(lessonKey(record)),false,'Duplicate task lesson');
    rows.set(lessonKey(record),record);
  }
  const panels=familyDoc.assignments.map(family=>{
    const record=rows.get(family.lessonId??family.puzzleId);assert(record,'Family assignment points outside pinned training rows');
    assert.equal(record.lesson.stage1DomainEligible,true,'Ineligible lesson assigned to Stage 1');
    return bindLichessTrainingPanel(record,{...family,registrationSha256:familyRegistrationSha256});
  });
  const panelIds=new Set(panels.map(panel=>panel.panelId));
  assert.equal(panelIds.size,panels.length,'Duplicate panel identity');

  const {reviews:reviewDoc,sourceSha256:reviewSourceSha256,panelReviews:collectedReviews}=await bindReviews(
    registration,panels,root,guard,pace);
  assert.equal(reviewDoc.schema,'lichess-stage1-stockfish-reviews-v1');
  assert.equal(reviewDoc.familyRegistrationSha256,familyRegistrationSha256);
  assert(Array.isArray(reviewDoc.reviews)&&reviewDoc.reviews.length===panels.length,
    'Require one pre-collected Stockfish review per registered training panel');
  const rawReviews=new Map(reviewDoc.reviews.map(row=>[row.panelId,row.review]));
  assert.equal(rawReviews.size,panels.length,'Duplicate or missing Stockfish review');
  const panelReviews=collectedReviews??panels.map(panel=>{
    const review=rawReviews.get(panel.panelId);assert(review,'Missing Stockfish review for registered panel');
    return {panel,boundReview:bindLichessStockfishReview(panel,review)};
  });
  const selectionPresentations=panels.reduce((total,panel)=>{
    const board=new Chess();board.loadPgn(panel.context.pgn);
    assert.equal(board.fen(),panel.context.fen);
    const legal=board.moves({verbose:true});assert(legal.length>0&&legal.length<=256);
    return total+legal.length;
  },0);
  return {panels,panelReviews,familyRegistrationSha256,selectionPresentations,
    inputHashes:{dataAudit:registration.dataAudit.sha256,trainingFamilies:registration.trainingFamilies.sha256,
      stockfishReviews:reviewSourceSha256,
      trainingRows:registration.trainingRows.files.map(file=>file.sha256)}};
}

async function buildArm(context){
  const {registration,replica,condition,lineageKey,outputDir,identity,repositoryRoot,guard,pace}=context;
  assert.equal(registration.feedbackProtocol,'verified-outcome-plus-stockfish-v2');
  assert.equal(typeof condition,'string');assert(hash(identity));
  assert(/^[A-Za-z0-9._:-]{1,128}$/.test(lineageKey));
  assert.equal(typeof outputDir,'string');
  const assets=await loadAssets(registration,repositoryRoot,guard,pace);
  const constructed=createLichessStage1Brain({registration,replica,repositoryRoot,guard,pace});
  const outcomeShuffle=condition==='shuffled'?registeredOutcomeShuffle(registration.outcomeShuffle):null;
  const stockfishShuffleIdentity=condition==='stockfish-shuffled'
    ?registration.stockfishShuffle?.sha256:null;
  if(condition==='stockfish-shuffled')assert(hash(stockfishShuffleIdentity),'Missing pinned Stockfish shuffle schedule');
  const sessionIdentity=digest({schema:'lichess-stage1-session-v1',runtimeIdentity:constructed.identity,
    familyRegistrationSha256:assets.familyRegistrationSha256,panelReviews:assets.panelReviews.map(row=>row.boundReview.identity),
    condition,lineageKey,stockfishShuffleIdentity,...(outcomeShuffle?{outcomeShuffleIdentity:outcomeShuffle.identity}:{})});
  const session=new CoupledStockfishSession({brain:constructed.brain,panelReviews:assets.panelReviews,
    identity:sessionIdentity,stockfishShuffleIdentity,feedbackProtocol:registration.feedbackProtocol});
  const registeredPanels=assets.panels.map(panel=>({panelId:panel.panelId,stage:panel.stage}));
  const block=new CurriculumBlockSession({session,currentStage:1,registeredPanels,condition,
    shuffleIdentity:condition==='stockfish-shuffled'?stockfishShuffleIdentity:outcomeShuffle?.identity??null});
  // The matrix identity is already bound to registration, stage, replica,
  // condition, schedule and lineage. Keep it stable for independent replay;
  // the checkpoint separately pins the session and brain identities.
  const runtimeIdentity=identity;
  return {panels:assets.panels,block,brain:constructed.brain,familyRegistrationSha256:assets.familyRegistrationSha256,
    identity:runtimeIdentity,outputDir,guard,pace,assets,constructed,
    shuffledStatusesForBlock:outcomeShuffle?.statusesForBlock??(()=>null)};
}

export async function createTrainingArm(context){
  assert.equal(context.stage,1);
  return buildArm({...context,repositoryRoot});
}

export async function createReplayArm({entry,registration,guard,pace}){
  const runtime=await buildArm({registration,replica:entry.replica,condition:entry.condition,
    lineageKey:entry.lineageKey,outputDir:entry.attempt,identity:entry.identity,repositoryRoot,guard,pace});
  assert.equal(runtime.identity,entry.identity,'Reconstructed learner runtime identity changed');
  const checkpoint=entry.checkpoint;
  const selectionPresentations=runtime.assets.selectionPresentations;
  const panelsByContext=new Map(runtime.panels.map(panel=>[contextKey(panel.context),panel]));
  return {checkpoint,identity:runtime.identity,createReplayBlock:async({stageCheckpoint})=>{
    const saved=stageCheckpoint;
    assert.equal(saved?.schema,'lichess-curriculum-stage-v1','Replay factory expects the decoded stage prefix');
    assert.equal(saved.identity,entry.identity);assert.equal(saved.lineageKey,entry.lineageKey);
    assert.equal(saved.condition,entry.condition);assert.equal(saved.stage,1);
    return {block:runtime.block,selectionPresentations,
      shuffledStatusesForBlock:runtime.shuffledStatusesForBlock,assess:async context=>{
      const panel=panelsByContext.get(contextKey(context));assert(panel,'Replay context outside registered training panels');
      return (await assessLichessTrainingPanel(panel,runtime.brain)).assessment;
    }};
  }};
}

export async function deriveAcceptanceEvidence({result,lineageAudits,registration,guard=()=>{},pace=async()=>{}}){
  const expected=result.replicas.flatMap(replica=>result.conditions.map(condition=>`${replica}:${condition}`)).sort();
  assert.deepEqual(Object.keys(lineageAudits).sort(),expected);
  const ref=registration?.stageAcceptanceEvaluator;
  if(!ref)return {schema:'lichess-stage1-acceptance-evidence-v1',status:'unknown',stageAccepted:false,
    unknown:['Registration lacks a pinned independent Stage 1 acceptance evaluator'],
    matrixIdentity:result.identity,registrationSha256:result.registrationSha256,
    replayedLineages:expected.length,scope:'Receipt replay alone cannot establish D1-D8, retention, counterfactual transfer or sealed-family performance'};
  guard();
  const bytes=pinnedFile(repositoryRoot,ref,8*2**20);
  const evaluator=await import(pathToFileURL(resolve(repositoryRoot,ref.path)).href);
  assert.equal(typeof evaluator.deriveStage1AcceptanceObservations,'function',
    'Pinned evaluator must independently derive Stage 1 observations from the completed matrix');
  const observations=await evaluator.deriveStage1AcceptanceObservations({result,lineageAudits,registration,
    repositoryRoot,guard,pace,createEvaluationArm:async({entry})=>buildArm({registration,
      replica:entry.replica,condition:entry.condition,lineageKey:entry.lineageKey,
      outputDir:entry.attempt,identity:entry.identity,repositoryRoot,guard,pace})});
  assert.equal(observations.schema,'lichess-stage1-acceptance-observations-v1');
  assert.equal(observations.stage,1);
  assert.equal(observations.matrixResultSha256,digest(result),'Acceptance observations belong to another training matrix');
  assert.equal(observations.registrationSha256,result.registrationSha256,'Acceptance observations use another registration');
  assert(Array.isArray(observations.replicas));
  assert.equal(observations.replicas.length,result.replicas.length,'Acceptance replica count changed');
  const replicas=observations.replicas.map((row,index)=>{
    const replica=result.replicas[index],replicaKey=String(replica);
    assert.equal(String(row.replica),replicaKey,'Acceptance replica ordering/identity changed');
    const keys=result.conditions.map(condition=>`${replica}:${condition}`).sort();
    const initial={},final={};
    for(const key of keys){
      const audit=lineageAudits[key];assert(audit,'Missing independent replay for acceptance lineage');
      assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.memoryContinuityVerified,true);
      assert.equal(audit.initialMemoryHashes?.[key],result.initialMemoryHashes[key]);
      assert.equal(audit.finalMemoryHashes?.[key],result.finalMemoryHashes[key]);
      initial[key]=audit.initialMemoryHashes[key];final[key]=audit.finalMemoryHashes[key];
    }
    assert.deepEqual(row.initialMemoryHashes,initial,'Acceptance artifact uses another initial-memory lineage');
    assert.deepEqual(row.finalMemoryHashes,final,'Acceptance artifact uses another final-memory lineage');
    const evidence=row.evidence;assert(evidence&&typeof evidence==='object');
    const prerequisites=evidence.prerequisites??{};
    for(const key of ['receiverAccepted','familySplitsDisjoint','sourceCertificatesReplayed','finalSetSealedUntilFreeze'])
      assert.equal(typeof prerequisites[key],'boolean',`Acceptance observation lacks ${key} prerequisite evidence`);
    return {...evidence,prerequisites:{...prerequisites,independentStageReplay:true,memoryContinuityVerified:true}};
  });
  // Failed validation-only selection is a measured D2 shortfall (final stays sealed),
  // not missing evidence; report it per replica with the validation scores.
  if(Array.isArray(observations.selectionFailures)&&observations.selectionFailures.length){
    const reports=result.replicas.map((replica,index)=>{
      const informative=observations.selectionFailures.find(row=>row.lineageKey===`${replica}:informative`);
      const status=!informative?'unknown':informative.status==='gate-failed'?'gate-failed':'unknown';
      return {replica:String(replica),status,stageAccepted:false,failed:status==='gate-failed'?['D2']:[],
        unknown:status==='unknown'?[informative?.reason??'Validation selection passed, but final families stay sealed because another replica failed selection']:[],
        missingPrerequisites:Object.entries(replicas[index].prerequisites).filter(([,value])=>value!==true).map(([key])=>key),
        metrics:{validationByCheckpoint:informative?.candidates??null,trainingByBlock:informative?.trainingByBlock??null,
          controlTraining:Object.fromEntries(observations.selectionFailures
            .filter(row=>row.lineageKey.startsWith(`${replica}:`)&&!row.lineageKey.endsWith(':informative')&&row.trainingByBlock)
            .map(row=>[row.lineageKey.slice(String(replica).length+1),row.trainingByBlock.at(-1)]))}};
    });
    const status=reports.some(row=>row.status==='unknown')?'unknown':'gate-failed';
    return {schema:'curriculum-stage1-replica-acceptance-v2',status,stageAccepted:false,
      requiredReplicaCount:result.replicas.length,acceptedReplicas:0,reports,
      checkpointSelection:observations.checkpointSelection??null,promotionMemoryHashes:null,
      evaluatorSha256:sha256(bytes),observationsSha256:digest(observations),
      matrixResultSha256:digest(result),registrationSha256:result.registrationSha256,
      scope:'Validation-only checkpoint selection failed, so final families stayed sealed and no transfer was measured'};
  }
  const acceptance=evaluateStage1ReplicasAcceptance({replicas,requiredReplicaCount:result.replicas.length});
  return {...acceptance,promotionMemoryHashes:observations.promotionMemoryHashes??null,
    checkpointSelection:observations.checkpointSelection??null,
    evaluatorSha256:sha256(bytes),observationsSha256:digest(observations),
    matrixResultSha256:digest(result),registrationSha256:result.registrationSha256,
    scope:'Pinned independent evaluator derives Stage 1 observations from the replayed matrix and disjoint evaluation data; frozen D1-D8 thresholds are recomputed by the separate acceptance gate'};
}

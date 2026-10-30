// Runner v6 (2026-10-30): runner v5 plus sleep-safe pacing (journal 2026-10-30-audit-stall-after-laptop-sleep). A paced step longer than MAX_PACED_STEP_MS (60 s; a forward pass takes well under a second) is clamped, because a longer wall-clock step means the OS was suspended, not working; the duty is reread during a rest so a charger change takes effect. Also uses matrix v3 (resume selection fix, review W04). Pacing only: it changes elapsed time, never results. Everything else is runner v5:
// Runner v5 (2026-10-29): runner v4 plus parallel replicas (researcher instruction 2026-10-29, decision log).
// `--mode train --replica rX` runs the matrix for one registered replica in its own run directory;
// `--mode merge --parts DIR,...` combines the one-replica results, one per registered replica in order, into the
// matrix result.json that the unchanged audit reads. Controls stay yoked to their own replica's informative arm.
// CPU duty may be 0.5, 0.75 or 1.0. Everything else is runner v4:
// Runner v4 (2026-10-29): runner v3 unchanged except that CPU duty may be 0.5 or 0.75 (researcher instruction
// 2026-10-29, decision log). Pacing only: it changes elapsed time, not learning. Registrations with cpuDuty 0.75 use this runner.
// Pinned CLI bridge v3 (2026-10-27): v2 for the outcome-only protocol (verified-outcome-only-v1;
// Stockfish teaching set aside). Registered arms: informative (verified task pulses only), absent,
// disabled and outcome-shuffled; Stockfish arms are refused. Otherwise identical to v2.
// v2 header: Pinned CLI bridge v2 (2026-10-24, fix goal task 2) from Python babysit jobs to
// the Lichess stage matrix. Same as run-lichess-curriculum-matrix.mjs (pinned by
// earlier runs) plus: registered rehearsal planner v2 (registration.rehearsalPlanner),
// registered informative-arm early stop (registration.earlyStop) and a cooperative
// pause compatible with `fly pause`: a valid <out>/pause-request.json stops the
// matrix at the next block boundary and publishes <out>/paused.json.
// Runtime construction and acceptance derivation remain supplied by a pinned,
// separately reviewed factory module.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,fsyncSync,closeSync,renameSync,readdirSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {resolve,relative,isAbsolute,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import os from 'node:os';
import {runLichessCurriculumStageMatrix,auditLichessCurriculumStageMatrix} from '../../src/puzzle-learning/lichess-curriculum-matrix-v3.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {replayLichessCurriculumReplica,auditLichessCurriculumStageMatrixFromReplays} from '../../src/puzzle-learning/lichess-curriculum-matrix-audit-v2.mjs';
import {registeredOutcomeShuffle} from '../../src/puzzle-learning/curriculum-outcome-shuffle.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
export const OUTCOME_ONLY_CONDITIONS=['informative','absent','disabled','shuffled'];
const cliArgs=()=>parseArgs({options:{registration:{type:'string'},mode:{type:'string'},out:{type:'string'},result:{type:'string'},protocol:{type:'string'},'resume-state':{type:'string'},'cpu-duty':{type:'string'},replica:{type:'string'},parts:{type:'string'},replays:{type:'boolean'}}}).values;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=path=>{
  const target=resolve(root,path);
  const rel=relative(root,target);
  assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Path escapes repository');
  return target;
};
const hashFile=path=>sha256(readFileSync(path));
const valueAt=(object,path)=>path.split('.').reduce((value,key)=>value&&Object.hasOwn(value,key)?value[key]:undefined,object);
function atomicJson(path,value){
  mkdirSync(dirname(path),{recursive:true});const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}
function publishProtocol(outputDir,bytes){
  const path=join(outputDir,'protocol.json'),partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}
function guardFactory(limits){
  return ()=>{
    const rssMiB=process.memoryUsage().rss/2**20,freeMiB=os.freemem()/2**20;
    if(rssMiB>limits.rssMiB||freeMiB<limits.freeMiB)
      throw Error(`resource-guard rssMiB=${rssMiB.toFixed(1)} freeMiB=${freeMiB.toFixed(1)}`);
  };
}
// Registered optional training controls; absent fields keep v1 behaviour.
export function trainingControls(registration){
  const planner=registration.rehearsalPlanner??null,earlyStop=registration.earlyStop??null;
  if(planner!==null){
    assert.equal(planner.schema,'curriculum-rehearsal-plan-v2','Unregistered rehearsal planner');
    assert(Number.isSafeInteger(planner.maxConsecutiveTargets)&&planner.maxConsecutiveTargets>=1
      &&planner.maxConsecutiveTargets<=32,'Invalid consecutive-target cap');
  }
  if(earlyStop!==null){
    assert.equal(earlyStop.schema,'informative-training-progress-v1','Unregistered early-stop rule');
    assert(Number.isSafeInteger(earlyStop.windowBlocks)&&earlyStop.windowBlocks>=1
      &&earlyStop.windowBlocks<registration.maxBlocks,'Early-stop window must be 1..maxBlocks-1 blocks');
    assert(planner!==null,'Early stop uses planner v2 block-start training counts');
  }
  return {planner:planner&&{maxConsecutiveTargets:planner.maxConsecutiveTargets},
    earlyStop:earlyStop&&{windowBlocks:earlyStop.windowBlocks}};
}
// A pause request written by `fly pause` for exactly this run and protocol.
export function pauseRequested(outputDir,protocolSha256){
  const path=join(outputDir,'pause-request.json');
  if(!existsSync(path))return false;
  try{
    const request=JSON.parse(readFileSync(path,'utf8'));
    return request.schema===1&&request.protocolHash===protocolSha256&&resolve(String(request.run))===resolve(outputDir);
  }catch{return false;}
}
// Battery-aware pacing (researcher request 2026-10-29): with registration.batteryCpuDuty, Python babysit writes
// <out>/power-pacing.json ({duty}) from the Windows charger status; the runner rereads it at most every 15 s and
// accepts only the two registered duties. Pacing changes elapsed time, never results.
function dutySource(outputDir,registration,duty){
  const battery=registration.batteryCpuDuty;
  if(battery===undefined)return ()=>duty;
  assert([0.25,0.5].includes(battery)&&battery<duty,'batteryCpuDuty must be 0.25 or 0.5 and below cpuDuty');
  const path=join(outputDir,'power-pacing.json');let current=duty,checked=0;
  return ()=>{const now=Date.now();
    if(now-checked>15000){checked=now;try{const d=JSON.parse(readFileSync(path,'utf8')).duty;if(d===duty||d===battery)current=d;}catch{}}
    return current;};
}
export const MAX_PACED_STEP_MS=60000;
export function paceFactory(dutyNow,guard,sleep=ms=>new Promise(done=>setTimeout(done,ms))){
  return async elapsedMs=>{
    // Work still owed, in step milliseconds; converted to rest with the duty current at each slice.
    let owed=Math.min(Math.max(0,elapsedMs),MAX_PACED_STEP_MS);
    while(owed>0){guard();const factor=1/dutyNow()-1;if(!(factor>0))break;
      const delay=Math.min(250,owed*factor);if(!(delay>0))break;await sleep(delay);owed-=delay/factor;}
    guard();
  };
}

export async function main(args=cliArgs()){
  assert(args.registration&&['train','audit','merge','replay'].includes(args.mode)&&args.out&&args.protocol,
    'Usage: node run-lichess-curriculum-matrix.mjs --registration PATH --mode train|audit|merge|replay --out PATH --protocol PATH [--result PATH] [--resume-state PATH]');
  const registrationPath=inside(args.registration),outputDir=inside(args.out);
  assert(existsSync(registrationPath),'Missing stage registration');
  const protocolBytes=readFileSync(inside(args.protocol));JSON.parse(protocolBytes.toString('utf8'));
  const registrationBytes=readFileSync(registrationPath),registration=JSON.parse(registrationBytes);
  assert.equal(registration.schema,1);assert.equal(registration.paused,false);
  assert(Array.isArray(registration.allowedModes)&&registration.allowedModes.includes({merge:'train',replay:'audit'}[args.mode]??args.mode));
  assert(Number.isSafeInteger(registration.stage)&&registration.stage>=1&&registration.stage<=12);
  assert(Array.isArray(registration.replicas)&&Array.isArray(registration.conditions));
  assert.deepEqual([...registration.conditions].sort(),OUTCOME_ONLY_CONDITIONS.slice().sort(),
    'Outcome-only campaign must register verified-outcome teaching and exactly the matched causal controls');
  assert.equal(registration.scheduleCondition??'informative','informative',
    'The informative arm must define the yoked lesson and rehearsal schedule');
  assert.equal(registration.stockfishShuffle,undefined,'The outcome-only protocol has no Stockfish-error shuffle');
  assert(Number.isSafeInteger(registration.maxBlocks)&&registration.maxBlocks>=1&&registration.maxBlocks<=32);
  assert.equal(registration.runtimeFactory?.schema,'pinned-curriculum-runtime-v1');
  assert(typeof registration.runtimeFactory.path==='string'&&/^[A-Za-z0-9._/-]+$/.test(registration.runtimeFactory.path));
  assert.match(registration.runtimeFactory.sha256,/^[a-f0-9]{64}$/);
  assert(typeof registration.dataAudit?.path==='string'&&/^[A-Za-z0-9._/-]+$/.test(registration.dataAudit.path));
  assert.match(registration.dataAudit.sha256,/^[a-f0-9]{64}$/);
  const dataPath=inside(registration.dataAudit.path);
  assert.equal(hashFile(dataPath),registration.dataAudit.sha256,'Stage data audit changed');
  const dataAudit=JSON.parse(readFileSync(dataPath,'utf8'));
  const missingDataGates=['eligibleForNeuralTeaching','relationFamilyDisjointnessEstablished','graphLaunchAuthorized']
    .filter(gate=>valueAt(dataAudit,gate)!==true);
  if(registration.feedbackProtocol!=='verified-outcome-only-v1')
    missingDataGates.push('coupledFeedbackProtocolPinned');
  try{registeredOutcomeShuffle(registration.outcomeShuffle).statusesForBlock(registration.maxBlocks-1);}
  catch{missingDataGates.push('outcomeShuffleSchedulePinned');}
  if(registration.stage>1&&(typeof registration.dataAudit.schema!=='string'
      ||!registration.dataAudit.schema.startsWith(`lichess-stage${registration.stage}-`)))
    missingDataGates.push('stageDataAuditSchemaPinned');
  else if(registration.dataAudit.schema&&dataAudit.schema!==registration.dataAudit.schema)
    missingDataGates.push('stageDataAuditSchemaMismatch');
  const evaluatorRef=registration.stageAcceptanceEvaluator;let evaluatorLoadError=null;
  if(typeof evaluatorRef?.path!=='string'||!/^[A-Za-z0-9._/-]+$/.test(evaluatorRef.path)
    ||!(/^[a-f0-9]{64}$/).test(evaluatorRef.sha256??'')){
    missingDataGates.push('stageAcceptanceEvaluatorPinned');
  }else{
    const evaluatorPath=inside(evaluatorRef.path);
    if(!existsSync(evaluatorPath)||hashFile(evaluatorPath)!==evaluatorRef.sha256){
      missingDataGates.push('stageAcceptanceEvaluatorPinned');
    }else{
      try{
        const evaluator=await import(pathToFileURL(evaluatorPath).href);
        if(typeof evaluator[`deriveStage${registration.stage}AcceptanceObservations`]!=='function')
          missingDataGates.push('stageAcceptanceEvaluatorExport');
        if(registration.stage>1
          &&typeof evaluator[`evaluateStage${registration.stage}ReplicasAcceptance`]!=='function')
          missingDataGates.push('stageAcceptanceGateExport');
        if(registration.stage>1
          &&typeof evaluator[`selectStage${registration.stage}TrainingCheckpoint`]!=='function')
          missingDataGates.push('validationOnlyCheckpointSelectorExport');
      }catch(error){
        missingDataGates.push('stageAcceptanceEvaluatorLoadable');
        evaluatorLoadError=String(error).slice(0,500);
      }
    }
  }
  const receiverRef=registration.acceptanceData?.audit;
  const receiverSchema=registration.stage===1?'lichess-stage1-acceptance-data-audit-v1':receiverRef?.schema;
  if(!receiverRef||typeof receiverRef.path!=='string'||!(/^[a-f0-9]{64}$/).test(receiverRef.sha256??'')){
    missingDataGates.push('receiverAndEvaluationDataAuditPinned');
  }else if(typeof receiverSchema!=='string'
      ||registration.stage>1&&!receiverSchema.startsWith(`lichess-stage${registration.stage}-`)){
    missingDataGates.push('receiverAndEvaluationDataAuditSchemaPinned');
  }else{
    const receiverPath=inside(receiverRef.path);
    if(!existsSync(receiverPath)||hashFile(receiverPath)!==receiverRef.sha256){
      missingDataGates.push('receiverAndEvaluationDataAuditPinned');
    }else{
      const readiness=JSON.parse(readFileSync(receiverPath,'utf8'));
      if(readiness.schema!==receiverSchema)
        missingDataGates.push('receiverAndEvaluationDataAuditSchema');
      // Receiver acceptance gates stage acceptance, not feedback-enabled training:
      // the audit must state it explicitly, and the acceptance gate requires true.
      if(typeof readiness.receiverAccepted!=='boolean')missingDataGates.push('receiverAcceptanceStated');
      for(const [field,gate] of [['eligibleForNeuralTeaching','acceptanceDataEligible'],
        ['familySplitsDisjoint','familySplitsDisjoint'],['sourceCertificatesReplayed','sourceCertificatesReplayed']])
        if(readiness[field]!==true)missingDataGates.push(gate);
      if(readiness.finalSetInspected!==false)missingDataGates.push('finalSetSealedUntilFreeze');
    }
  }
  if(missingDataGates.length&&['train','merge'].includes(args.mode)){
    assert(!existsSync(outputDir),'Preserve existing stage output');mkdirSync(outputDir,{recursive:false});
    publishProtocol(outputDir,protocolBytes);
    const blocked={schema:'lichess-curriculum-matrix-preflight-v1',status:'readiness-blocked',stage:registration.stage,
      reason:'Pinned data/evaluator prerequisites do not authorize graph teaching',unsatisfiedDataGates:missingDataGates,
      evaluatorLoadError,
      dataAuditSha256:registration.dataAudit.sha256,scope:'No learner runtime was loaded and no neural event was run'};
    atomicJson(join(outputDir,'result.json'),blocked);
    process.stdout.write(JSON.stringify({status:blocked.status,stage:blocked.stage,reason:blocked.reason,
      unsatisfiedDataGates:missingDataGates,result:join(outputDir,'result.json')})+'\n');return;
  }
  assert.deepEqual(missingDataGates,[],'Pinned stage data audit does not pass its graph-teaching gates');
  const factoryPath=inside(registration.runtimeFactory.path);
  assert.equal(registration.runtimeFactory.sha256,hashFile(factoryPath),'Pinned runtime factory changed');
  const limits={rssMiB:2048,freeMiB:256,...registration.resourceLimits};
  assert.equal(limits.rssMiB,2048);assert.equal(limits.freeMiB,256);
  assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with the pinned 256 MiB Node heap limit');
  const duty=registration.cpuDuty??0.5;assert([0.5,0.75,1].includes(duty),'CPU duty must be 0.5, 0.75 or 1');
  assert(args['cpu-duty']===undefined||Number(args['cpu-duty'])===duty,'Command-line CPU duty differs from the registration');
  const guard=guardFactory(limits),pace=paceFactory(dutySource(outputDir,registration,duty),guard);guard();
  const factory=await import(pathToFileURL(factoryPath).href);
  const registrationSha256=sha256(registrationBytes);
  const completionIdentity=registration.stage>1?digestCompletionIdentity(registration):null;
  if(args.mode==='merge'){
    assert.equal(registration.stage,1,'Parallel merge covers stage 1 only (later stages add retention phases)');
    assert(typeof args.parts==='string','Merge mode requires --parts DIR,DIR,...');
    assert(!existsSync(outputDir),'Preserve existing output');
    const schedule=registration.scheduleCondition??'informative',orderedConditions=[schedule,...registration.conditions.filter(c=>c!==schedule)];
    const merged={lineageResults:{},initialMemoryHashes:{},finalMemoryHashes:{}},parallelParts=[];
    // Each part names a replica's base run; Python resumes publish into BASE-resume-NNNN, so use the newest.
    const newest=base=>{const name=base.split(/[\\/]/).pop(),dirs=readdirSync(dirname(base))
      .filter(n=>n===name||new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}-resume-\\d{4}$`).test(n)).sort();
      assert(dirs.length,`Missing replica run ${base}`);return join(dirname(base),dirs.at(-1));};
    for(const dir of args.parts.split(',').map(inside).map(newest)){
      const bytes=readFileSync(join(dir,'result.json')),part=JSON.parse(bytes);
      assert.equal(part.schema,'lichess-curriculum-matrix-result-v1');assert.equal(part.status,'training-complete','A replica run is unfinished or stopped');
      assert.equal(part.registrationSha256,registrationSha256,'Replica run belongs to another registration');assert.equal(part.stage,registration.stage);
      assert(Array.isArray(part.replicas)&&part.replicas.length===1,'Merge parts are one-replica runs');assert.deepEqual(part.conditions,orderedConditions);
      assert.equal(hashFile(join(dir,'protocol.json')),sha256(protocolBytes),'Replica run used another protocol');
      for(const field of Object.keys(merged))for(const [key,value] of Object.entries(part[field])){
        assert(!(key in merged[field]),'Duplicate lineage across parts');merged[field][key]=value;}
      parallelParts.push({replica:part.replicas[0],run:dir,identity:part.identity,resultSha256:sha256(bytes)});
    }
    assert.deepEqual(parallelParts.map(p=>p.replica),registration.replicas,'Merge needs one part per registered replica, in registration order');
    const result={schema:'lichess-curriculum-matrix-result-v1',
      identity:digest({schema:'lichess-curriculum-matrix-v1',stage:registration.stage,replicas:registration.replicas,
        conditions:orderedConditions,maxBlocks:registration.maxBlocks,registrationSha256}),
      stage:registration.stage,status:'training-complete',registrationSha256,conditions:orderedConditions,replicas:registration.replicas,
      ...merged,stageAccepted:false,parallelParts,
      scope:'All registered arms completed on per-replica yoked lesson plans, one replica per process; independent audits and acceptance remain required'};
    mkdirSync(outputDir,{recursive:false});publishProtocol(outputDir,protocolBytes);atomicJson(join(outputDir,'result.json'),result);
    process.stdout.write(JSON.stringify({status:result.status,stage:result.stage,lineages:Object.keys(result.lineageResults).length,
      result:join(outputDir,'result.json'),parts:parallelParts.length})+'\n');return;
  }
  if(args.mode==='train'){
    assert(args.replica===undefined||registration.replicas.includes(args.replica),'--replica must name a registered replica');
    assert.equal(typeof factory.createTrainingArm,'function');
    if(registration.stage>1)assert.equal(typeof factory.completeTraining,'function',
      'Later stages require explicit retention training before audit');
    assert(!existsSync(outputDir),'Preserve existing output');
    const controls=trainingControls(registration),protocolSha256=sha256(protocolBytes);
    const result=await runLichessCurriculumStageMatrix({...controls,
      shouldPause:()=>pauseRequested(outputDir,protocolSha256),stage:registration.stage,
      replicas:args.replica===undefined?registration.replicas:[args.replica],conditions:registration.conditions,
      scheduleCondition:registration.scheduleCondition??'informative',maxBlocks:registration.maxBlocks,
      registrationSha256,resumeStatePath:args['resume-state']?inside(args['resume-state']):null,
      outputDir,createArm:context=>factory.createTrainingArm({...context,registration,guard,pace}),guard,pace,protocolBytes,
      completionIdentity,completeTraining:registration.stage>1?context=>factory.completeTraining({
        ...context,registration,guard,pace,onProgress:row=>process.stdout.write(JSON.stringify(row)+'\n')}):null,
      onProgress:row=>process.stdout.write(JSON.stringify(row)+'\n')});
    if(result.status==='paused'){
      // fly_controls.pause_receipt: checkpoint in the run directory, no pending receipt.
      const statePath=join(outputDir,'matrix-state.json');
      atomicJson(join(outputDir,'paused.json'),{schema:1,phase:'training',run:outputDir,protocolHash:protocolSha256,
        checkpoint:statePath,checkpointSha256:hashFile(statePath),lineageKey:result.lineageKey,
        completedBlocks:result.completedBlocks,stageCheckpoint:result.checkpoint,pausedAt:new Date().toISOString()});
      process.stdout.write(JSON.stringify({status:'paused',stage:result.stage,lineageKey:result.lineageKey,
        completedBlocks:result.completedBlocks,paused:join(outputDir,'paused.json')})+'\n');return;
    }
    process.stdout.write(JSON.stringify({status:result.status,stage:result.stage,lineages:Object.keys(result.lineageResults??{}).length,
      result:join(outputDir,'result.json'),scope:result.scope})+'\n');return;
  }
  assert.equal(typeof factory.createReplayArm,'function');assert.equal(typeof factory.deriveAcceptanceEvidence,'function');
  assert(args.result,'Audit mode requires --result');
  const resultPath=inside(args.result),auditPath=join(outputDir,'audit.json');
  assert(existsSync(outputDir),'Audit must publish into the existing training run directory');
  assert.equal(resolve(resultPath),resolve(outputDir,'result.json'),
    'Campaign audit must consume result.json from the same training run');
  assert.equal(hashFile(join(outputDir,'protocol.json')),sha256(protocolBytes),
    'Run protocol is missing or differs from the pinned Python action protocol');
  assert(!existsSync(auditPath),'Preserve any existing independent stage audit');
  const result=JSON.parse(readFileSync(resultPath,'utf8'));
  let trainingPhases=null;
  if(registration.stage>1){
    trainingPhases=JSON.parse(readFileSync(join(outputDir,'training-phases.json'),'utf8'));
    assert.equal(trainingPhases.schema,'curriculum-training-phases-v1');
    assert.equal(trainingPhases.completionIdentity,completionIdentity);
    assert.equal(trainingPhases.matrixResultSha256,sha256(Buffer.from(JSON.stringify(result))));
    assert.equal(trainingPhases.status,'training-complete','Retention training is unfinished');
  }
  assert.equal(result.registrationSha256,registrationSha256,'Result belongs to another stage registration');
  assert.equal(result.stage,registration.stage,'Result belongs to another curriculum stage');
  const expectedLineages=registration.replicas.flatMap(replica=>registration.conditions.map(condition=>`${replica}:${condition}`)).sort();
  assert.deepEqual(Object.keys(result.finalMemoryHashes??{}).sort(),expectedLineages,'Matrix result omits registered memory lineages');
  assert.deepEqual(Object.keys(result.lineageResults??{}).map(key=>result.lineageResults[key].lineageKey).sort(),
    expectedLineages,'Matrix result omits a registered condition/replica result');
  const createReplayArm=entry=>factory.createReplayArm({entry,registration,guard,pace});
  if(args.mode==='replay'){
    // One replica's independent lineage replay (matrix audit v2); the audit step reads replay-<replica>.json.
    assert.equal(registration.stage,1);assert(registration.replicas.includes(args.replica),'Replay mode requires a registered --replica');
    const replayPath=join(outputDir,`replay-${args.replica}.json`);
    const replay=await replayLichessCurriculumReplica({resultPath,replica:args.replica,outputPath:replayPath,createReplayArm,guard,pace});
    process.stdout.write(JSON.stringify({status:'replayed',replica:args.replica,lineages:Object.keys(replay.lineageAudits).length,replay:replayPath})+'\n');return;
  }
  if(args.replays){
    const audit=await auditLichessCurriculumStageMatrixFromReplays({resultPath,outputPath:auditPath,
      replayPaths:registration.replicas.map(replica=>join(outputDir,`replay-${replica}.json`)),
      deriveAcceptanceEvidence:input=>factory.deriveAcceptanceEvidence({...input,registration,trainingPhases,guard,pace}),guard,pace});
    process.stdout.write(JSON.stringify({status:audit.status,stage:audit.stage,stageAccepted:audit.stageAccepted,
      audit:auditPath,scope:audit.scope})+'\n');return;
  }
  const audit=await auditLichessCurriculumStageMatrix({resultPath,outputPath:auditPath,
    createReplayArm:entry=>factory.createReplayArm({entry,registration,guard,pace}),
    deriveAcceptanceEvidence:input=>factory.deriveAcceptanceEvidence({...input,registration,trainingPhases,guard,pace}),guard,pace});
  process.stdout.write(JSON.stringify({status:audit.status,stage:audit.stage,stageAccepted:audit.stageAccepted,
    audit:auditPath,scope:audit.scope})+'\n');
}

function digestCompletionIdentity(registration){
  return sha256(Buffer.from(JSON.stringify({schema:'curriculum-training-phases-v1',
    factory:registration.runtimeFactory.sha256,stage:registration.stage})));
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
  process.stderr.write(JSON.stringify({status:'runner-error',error:String(error).slice(0,1000)})+'\n');
  process.exitCode=2;
});

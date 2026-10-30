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
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {resolve,relative,isAbsolute,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import os from 'node:os';
import {runLichessCurriculumStageMatrix,auditLichessCurriculumStageMatrix} from '../../src/puzzle-learning/lichess-curriculum-matrix-v2.mjs';
import {registeredOutcomeShuffle} from '../../src/puzzle-learning/curriculum-outcome-shuffle.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
export const OUTCOME_ONLY_CONDITIONS=['informative','absent','disabled','shuffled'];
const cliArgs=()=>parseArgs({options:{registration:{type:'string'},mode:{type:'string'},out:{type:'string'},result:{type:'string'},protocol:{type:'string'},'resume-state':{type:'string'},'cpu-duty':{type:'string'}}}).values;
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
function paceFactory(duty,guard){
  return async elapsedMs=>{
    let remaining=elapsedMs*(1/duty-1);
    while(remaining>0){guard();const delay=Math.min(250,remaining);await new Promise(done=>setTimeout(done,delay));remaining-=delay;}
    guard();
  };
}

export async function main(args=cliArgs()){
  assert(args.registration&&['train','audit'].includes(args.mode)&&args.out&&args.protocol,
    'Usage: node run-lichess-curriculum-matrix.mjs --registration PATH --mode train|audit --out PATH --protocol PATH [--result PATH] [--resume-state PATH]');
  const registrationPath=inside(args.registration),outputDir=inside(args.out);
  assert(existsSync(registrationPath),'Missing stage registration');
  const protocolBytes=readFileSync(inside(args.protocol));JSON.parse(protocolBytes.toString('utf8'));
  const registrationBytes=readFileSync(registrationPath),registration=JSON.parse(registrationBytes);
  assert.equal(registration.schema,1);assert.equal(registration.paused,false);
  assert(Array.isArray(registration.allowedModes)&&registration.allowedModes.includes(args.mode));
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
  if(missingDataGates.length&&args.mode==='train'){
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
  const duty=registration.cpuDuty??0.5;assert.equal(duty,0.5,'CPU duty must remain pinned at 0.5');
  assert(args['cpu-duty']===undefined||Number(args['cpu-duty'])===duty,'Command-line CPU duty differs from the registration');
  const guard=guardFactory(limits),pace=paceFactory(duty,guard);guard();
  const factory=await import(pathToFileURL(factoryPath).href);
  const registrationSha256=sha256(registrationBytes);
  const completionIdentity=registration.stage>1?digestCompletionIdentity(registration):null;
  if(args.mode==='train'){
    assert.equal(typeof factory.createTrainingArm,'function');
    if(registration.stage>1)assert.equal(typeof factory.completeTraining,'function',
      'Later stages require explicit retention training before audit');
    assert(!existsSync(outputDir),'Preserve existing output');
    const controls=trainingControls(registration),protocolSha256=sha256(protocolBytes);
    const result=await runLichessCurriculumStageMatrix({...controls,
      shouldPause:()=>pauseRequested(outputDir,protocolSha256),stage:registration.stage,
      replicas:registration.replicas,conditions:registration.conditions,
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

// Pinned CLI bridge from Python babysit jobs to the Lichess stage matrix.
// Runtime construction and acceptance derivation remain supplied by a pinned,
// separately reviewed factory module.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {resolve,relative,isAbsolute,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import os from 'node:os';
import {runLichessCurriculumStageMatrix,auditLichessCurriculumStageMatrix} from '../../src/puzzle-learning/lichess-curriculum-matrix.mjs';
import {registeredOutcomeShuffle} from '../../src/puzzle-learning/curriculum-outcome-shuffle.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const cliArgs=()=>parseArgs({options:{registration:{type:'string'},mode:{type:'string'},out:{type:'string'},result:{type:'string'},protocol:{type:'string'},'resume-state':{type:'string'}}}).values;
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
  const requiredConditions=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];
  assert(requiredConditions.every(condition=>registration.conditions.includes(condition)),
    'Stage campaign must register verified-outcome plus Stockfish teaching and every matched causal control');
  assert.equal(registration.scheduleCondition??'informative','informative',
    'The informative arm must define the yoked lesson and rehearsal schedule');
  assert.match(registration.stockfishShuffle?.sha256??'',/^[a-f0-9]{64}$/,
    'The Stockfish-error shuffled control requires a pinned schedule identity');
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
  if(registration.feedbackProtocol!=='verified-outcome-plus-stockfish-v1')
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
      for(const [field,gate] of [['receiverAccepted','receiverAccepted'],
        ['eligibleForNeuralTeaching','acceptanceDataEligible'],['familySplitsDisjoint','familySplitsDisjoint'],
        ['sourceCertificatesReplayed','sourceCertificatesReplayed']])
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
  const guard=guardFactory(limits),pace=paceFactory(duty,guard);guard();
  const factory=await import(pathToFileURL(factoryPath).href);
  const registrationSha256=sha256(registrationBytes);
  if(args.mode==='train'){
    assert.equal(typeof factory.createTrainingArm,'function');
    assert(!existsSync(outputDir),'Preserve existing output');
    const result=await runLichessCurriculumStageMatrix({stage:registration.stage,
      replicas:registration.replicas,conditions:registration.conditions,
      scheduleCondition:registration.scheduleCondition??'informative',maxBlocks:registration.maxBlocks,
      registrationSha256,resumeStatePath:args['resume-state']?inside(args['resume-state']):null,
      outputDir,createArm:context=>factory.createTrainingArm({...context,registration,guard,pace}),guard,pace,protocolBytes,
      onProgress:row=>process.stdout.write(JSON.stringify(row)+'\n')});
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
  assert.equal(result.registrationSha256,registrationSha256,'Result belongs to another stage registration');
  assert.equal(result.stage,registration.stage,'Result belongs to another curriculum stage');
  const expectedLineages=registration.replicas.flatMap(replica=>registration.conditions.map(condition=>`${replica}:${condition}`)).sort();
  assert.deepEqual(Object.keys(result.finalMemoryHashes??{}).sort(),expectedLineages,'Matrix result omits registered memory lineages');
  assert.deepEqual(Object.keys(result.lineageResults??{}).map(key=>result.lineageResults[key].lineageKey).sort(),
    expectedLineages,'Matrix result omits a registered condition/replica result');
  const audit=await auditLichessCurriculumStageMatrix({resultPath,outputPath:auditPath,
    createReplayArm:entry=>factory.createReplayArm({entry,registration,guard,pace}),
    deriveAcceptanceEvidence:input=>factory.deriveAcceptanceEvidence({...input,registration,guard,pace}),guard,pace});
  process.stdout.write(JSON.stringify({status:audit.status,stage:audit.stage,stageAccepted:audit.stageAccepted,
    audit:auditPath,scope:audit.scope})+'\n');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
  process.stderr.write(JSON.stringify({status:'runner-error',error:String(error).slice(0,1000)})+'\n');
  process.exitCode=2;
});

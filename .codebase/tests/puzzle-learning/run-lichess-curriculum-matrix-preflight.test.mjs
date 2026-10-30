import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {main as runMatrixCli} from '../../scripts/puzzle-learning/run-lichess-curriculum-matrix.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const conditions=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];

function writePinned(directory,path,value){
  const bytes=Buffer.from(value),absolute=join(directory,path);mkdirSync(join(absolute,'..'),{recursive:true});
  writeFileSync(absolute,bytes);return {path:relative(root,absolute).replaceAll('\\','/'),sha256:hash(bytes)};
}

test('matrix preflight refuses graph training before runtime load without a pinned acceptance evaluator',async t=>{
  const directory=mkdtempSync(join(root,'runs','stage-matrix-preflight-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const runtimeFactory=writePinned(directory,'runtime-sentinel.mjs',"throw new Error('learner runtime was loaded');\n");
  const dataAudit=writePinned(directory,'data-audit.json',JSON.stringify({eligibleForNeuralTeaching:true,
    relationFamilyDisjointnessEstablished:true,graphLaunchAuthorized:true}));
  const receiverAudit=writePinned(directory,'receiver-audit.json',JSON.stringify({
    schema:'lichess-stage1-acceptance-data-audit-v1',receiverAccepted:true,eligibleForNeuralTeaching:true,
    familySplitsDisjoint:true,sourceCertificatesReplayed:true,finalSetInspected:false}));
  const protocol=writePinned(directory,'protocol.json','{"fixture":true}');
  const registration=writePinned(directory,'registration.json',JSON.stringify({schema:1,paused:false,
    allowedModes:['train'],stage:1,replicas:[1],conditions,scheduleCondition:'informative',maxBlocks:1,
    stockfishShuffle:{sha256:'a'.repeat(64)},runtimeFactory:{schema:'pinned-curriculum-runtime-v1',...runtimeFactory},
    dataAudit,acceptanceData:{audit:receiverAudit}}));
  const output=join(directory,'out');
  await runMatrixCli({registration:registration.path,mode:'train',out:relative(root,output),protocol:protocol.path});
  const result=JSON.parse(readFileSync(join(output,'result.json'),'utf8'));
  assert.equal(result.status,'readiness-blocked');
  assert(result.unsatisfiedDataGates.includes('stageAcceptanceEvaluatorPinned'));
  assert.equal(readFileSync(join(output,'protocol.json'),'utf8'),'{"fixture":true}');
  assert.equal(result.scope,'No learner runtime was loaded and no neural event was run');
});

test('an unaccepted receiver gates stage acceptance, not training, but must be stated',async t=>{
  const directory=mkdtempSync(join(root,'runs','stage-matrix-preflight-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const runtimeFactory=writePinned(directory,'runtime-sentinel.mjs',"throw new Error('learner runtime was loaded');\n");
  const dataAudit=writePinned(directory,'data-audit.json',JSON.stringify({eligibleForNeuralTeaching:true,
    relationFamilyDisjointnessEstablished:true,graphLaunchAuthorized:true}));
  const protocol=writePinned(directory,'protocol.json','{"fixture":true}');
  const gatesFor=async(name,receiver)=>{
    const receiverAudit=writePinned(directory,`${name}-receiver.json`,JSON.stringify({
      schema:'lichess-stage1-acceptance-data-audit-v1',...receiver,eligibleForNeuralTeaching:true,
      familySplitsDisjoint:true,sourceCertificatesReplayed:true,finalSetInspected:false}));
    const registration=writePinned(directory,`${name}-registration.json`,JSON.stringify({schema:1,paused:false,
      allowedModes:['train'],stage:1,replicas:[1],conditions,scheduleCondition:'informative',maxBlocks:1,
      stockfishShuffle:{sha256:'a'.repeat(64)},runtimeFactory:{schema:'pinned-curriculum-runtime-v1',...runtimeFactory},
      dataAudit,acceptanceData:{audit:receiverAudit}}));
    const output=join(directory,`${name}-out`);
    await runMatrixCli({registration:registration.path,mode:'train',out:relative(root,output),protocol:protocol.path});
    return JSON.parse(readFileSync(join(output,'result.json'),'utf8')).unsatisfiedDataGates;
  };
  const unaccepted=await gatesFor('unaccepted',{receiverAccepted:false});
  assert(!unaccepted.includes('receiverAccepted')&&!unaccepted.includes('receiverAcceptanceStated'));
  assert((await gatesFor('unstated',{})).includes('receiverAcceptanceStated'));
});

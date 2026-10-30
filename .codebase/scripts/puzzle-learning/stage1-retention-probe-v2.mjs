// Stage 1 retention probe v2 (fix goal task 1, reviewer finding 2). Identical to
// stage1-retention-probe.mjs (v1, pinned by its completed run) except that the
// registered teaching condition comes from the protocol: 'informative' (task and
// Stockfish pulses) or 'outcome-only' (task pulse; the Stockfish frame is presented
// without a DAN pulse), so the probe can be reported with and without that phase.
// Training boards only.
// From scratch: teach board A one failure and one success event through the
// pinned CoupledStockfishSession/ReversalMemory path, then teach 10 other
// training boards the same way, recording A's certified-move rank after every
// lesson. Repeats for each registered eta. Writes only inside --out; reads the
// base registration's existing Stockfish review cache and never collects one.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {closeSync,existsSync,fsyncSync,mkdirSync,openSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {successRank,lessonPair,selectABoards,interferenceOrder,chooseEta} from './stage1-retention-probe.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const CONDITIONS=['informative','outcome-only'];
const inside=path=>{
  const target=resolve(root,path),rel=relative(root,target);
  assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'Path escapes repository');
  return target;
};
function atomicJson(path,value){
  const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,JSON.stringify(value,null,1));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

async function main(){
  const args=parseArgs({options:{protocol:{type:'string'},out:{type:'string'},'cpu-duty':{type:'string'}}}).values;
  assert(args.protocol&&args.out,'Usage: --protocol PATH --out PATH --cpu-duty 0.5');
  assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with the pinned 256 MiB Node heap limit');
  const protocolBytes=readFileSync(inside(args.protocol)),protocol=JSON.parse(protocolBytes);
  assert.equal(protocol.schema,'lichess-stage1-retention-probe-protocol-v2');
  assert(CONDITIONS.includes(protocol.condition),'Register the probe teaching condition');
  assert.equal(Number(args['cpu-duty']),protocol.cpuDuty);assert.equal(protocol.cpuDuty,0.5);
  const limits=protocol.resourceLimits;assert.equal(limits.rssMiB,2048);assert.equal(limits.freeMiB,256);
  const registrationBytes=readFileSync(inside(protocol.baseRegistration.path));
  assert.equal(sha256(registrationBytes),protocol.baseRegistration.sha256,'Base registration changed');
  const base=JSON.parse(registrationBytes);
  assert.equal(base.stage,1);assert(base.replicas.includes(protocol.replica));
  const cache=inside(base.stockfishCollection.cacheDir);
  assert(existsSync(join(cache,'manifest.json')),'Probe reuses a complete Stockfish cache; it never collects reviews');
  const factoryPath=inside(base.runtimeFactory.path);
  assert.equal(sha256(readFileSync(factoryPath)),base.runtimeFactory.sha256,'Pinned runtime factory changed');
  const out=inside(args.out);assert(!existsSync(out),'Preserve existing probe output');
  mkdirSync(out,{recursive:false});
  writeFileSync(join(out,'protocol.json'),protocolBytes,{flag:'wx'});

  let peakRssMiB=0;
  const guard=()=>{
    const rssMiB=process.memoryUsage().rss/2**20,freeMiB=os.freemem()/2**20;peakRssMiB=Math.max(peakRssMiB,rssMiB);
    if(rssMiB>limits.rssMiB||freeMiB<limits.freeMiB)throw Error(`resource-guard rssMiB=${rssMiB.toFixed(1)} freeMiB=${freeMiB.toFixed(1)}`);
  };
  const pace=async elapsedMs=>{
    let remaining=elapsedMs*(1/protocol.cpuDuty-1);
    while(remaining>0){guard();const delay=Math.min(250,remaining);await new Promise(done=>setTimeout(done,delay));remaining-=delay;}
    guard();
  };
  const started=performance.now(),cpuStart=process.cpuUsage();
  const {createTrainingArm}=await import(pathToFileURL(factoryPath).href);
  const armFor=async eta=>{
    const registration={...base,learner:{...base.learner,memory:{...base.learner.memory,eta}}};
    const arm=await createTrainingArm({stage:1,registration,replica:protocol.replica,condition:protocol.condition,
      lineageKey:`retention-probe:${protocol.replica}:${protocol.condition}:${eta}`,outputDir:out,
      identity:digest({schema:protocol.schema,protocol:sha256(protocolBytes),eta}),guard,pace});
    assert.equal(arm.brain.memory.config.eta,eta);
    return arm;
  };
  const emit=row=>process.stdout.write(JSON.stringify(row)+'\n');

  // Scratch assessment (eta does not act before the first update).
  const scratchArm=await armFor(protocol.etas[0]);
  const panels=new Map(scratchArm.panels.map(panel=>[panel.panelId,panel]));
  const scratch=[];
  for(const panel of scratchArm.panels){
    const {assessment}=await assessLichessTrainingPanel(panel,scratchArm.brain);
    scratch.push({panelId:panel.panelId,stratum:panel.stratum,...successRank(assessment,panel.experiences)});
  }
  const aBoards=selectABoards(scratch);
  const initialMemorySha256=scratchArm.brain.memoryFingerprint();
  atomicJson(join(out,'scratch.json'),{schema:'stage1-retention-probe-scratch-v1',replica:protocol.replica,
    initialMemorySha256,correct:scratch.filter(row=>row.correct).length,panels:scratch,aBoards});
  emit({event:'scratch-assessed',status:'running',correct:scratch.filter(row=>row.correct).length,panels:scratch.length});

  const lesson=async(arm,panel,aPanel)=>{
    const before=(await assessLichessTrainingPanel(panel,arm.brain)).assessment;
    const events=[];
    for(const experience of lessonPair(before,panel.experiences)){
      const assessment=(await assessLichessTrainingPanel(panel,arm.brain)).assessment;
      const session=arm.block.session;
      session.start(experience,assessment,{condition:protocol.condition});
      const pulses=[];
      for(let frame=0;frame<3;frame++){
        const receipt=await session.step();
        if(frame>0)pulses.push({phase:receipt.phase,channel:receipt.result.channel,current:receipt.result.current,
          factors:receipt.result.update?.factors??[],changedEdges:receipt.result.update?.changedEdges??0});
      }
      session.finish();
      events.push({move:experience.move,status:experience.status,chosenBefore:assessment.choice,pulses});
    }
    const after=(await assessLichessTrainingPanel(panel,arm.brain)).assessment;
    const aAfter=aPanel===panel?after:(await assessLichessTrainingPanel(aPanel,arm.brain)).assessment;
    return {panelId:panel.panelId,before:successRank(before,panel.experiences),
      after:successRank(after,panel.experiences),events,a:successRank(aAfter,aPanel.experiences)};
  };

  const perEta=[];const total=protocol.etas.length*aBoards.length;let completed=0;
  for(const eta of protocol.etas){
    const arm=eta===protocol.etas[0]?scratchArm:await armFor(eta);
    // Memory identity includes eta, so scratch is checked as unit gains and zero events.
    const fresh=arm.brain.memory.snapshot(),freshSha256=arm.brain.memoryFingerprint();
    assert(fresh.events===0&&fresh.gains.every(gain=>gain===1),'Probe must start from scratch memory');
    const probes=[];
    for(const a of aBoards){
      arm.brain.memory.restore(fresh);arm.brain.presentations=0;
      assert.equal(arm.brain.memoryFingerprint(),freshSha256);
      const aPanel=panels.get(a.panelId),others=interferenceOrder(protocol.interferenceSeed,a.panelId,
        [...panels.keys()],protocol.interferingLessons);
      const lessons=[await lesson(arm,aPanel,aPanel)];
      for(const id of others)lessons.push(await lesson(arm,panels.get(id),aPanel));
      const final=lessons.at(-1).a;
      const probe={schema:'stage1-retention-probe-result-v2',condition:protocol.condition,eta,replica:protocol.replica,aPanelId:a.panelId,
        stratum:a.stratum,interferingPanels:others,scratch:scratch.find(row=>row.panelId===a.panelId),
        aAfterOwnLesson:lessons[0].a,aAfterInterference:final,retained:final.correct,
        aRankTrajectory:lessons.map(row=>row.a.rank),interferingAcquired:lessons.slice(1).filter(row=>row.after.correct).length,
        lessons,presentations:arm.brain.presentations,finalMemorySha256:arm.brain.memoryFingerprint()};
      atomicJson(join(out,`probe-eta${eta}-${a.panelId}.json`),probe);probes.push(probe);completed++;
      emit({event:'probe-completed',status:'running',phase:`eta ${eta}`,lesson:a.panelId,
        retained:final.correct,aRank:final.rank,completedLineages:completed,totalLineages:total});
    }
    perEta.push({eta,retained:probes.filter(row=>row.retained).length,probes:probes.length,
      acquiredOwnLesson:probes.filter(row=>row.aAfterOwnLesson.correct).length,
      aRanks:probes.map(row=>({aPanelId:row.aPanelId,scratch:row.scratch.rank,own:row.aAfterOwnLesson.rank,
        final:row.aAfterInterference.rank,legal:row.aAfterInterference.legal}))});
  }
  const chosenEta=chooseEta(perEta,protocol.decision.requiredRetained);
  const cpu=process.cpuUsage(cpuStart);
  const result={schema:'stage1-retention-probe-v2',condition:protocol.condition,status:chosenEta===null?'no-eta-passes':'eta-chosen',
    protocolSha256:sha256(protocolBytes),baseRegistrationSha256:protocol.baseRegistration.sha256,
    initialMemorySha256,scratchCorrect:scratch.filter(row=>row.correct).length,aBoards,
    perEtaPasses:perEta.map(row=>({eta:row.eta,retained:row.retained,acquiredOwnLesson:row.acquiredOwnLesson,probes:row.probes})),
    perEta,decisionRule:protocol.decision.rule,chosenEta,peakRssMiB:Math.round(peakRssMiB*10)/10,
    elapsedSeconds:Math.round((performance.now()-started)/100)/10,cpuSeconds:Math.round((cpu.user+cpu.system)/1e5)/10,
    scope:'Training boards only, one replica; diagnostic dose probe for ReversalMemory eta, not a gate result or learning claim'};
  atomicJson(join(out,'result.json'),result);
  emit({event:'probe-finished',status:result.status,chosenEta,perEtaPasses:JSON.stringify(result.perEtaPasses)});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
  process.stderr.write(JSON.stringify({status:'probe-error',error:String(error.stack??error).slice(0,2000)})+'\n');
  process.exitCode=2;
});

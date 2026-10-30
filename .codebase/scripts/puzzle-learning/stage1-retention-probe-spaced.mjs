// Stage 1 spaced retention probe (2026-10-26; predeclared fallback "probe v6" in
// research/journal/experiments/2026-10-24-stage1-memory-retention-fix.md).
// Identical to stage1-retention-probe-v2.mjs (pinned by completed runs) except
// the lesson sequence: from scratch, board A is taught once per registered gap,
// each lesson followed by that many lessons on other training boards, all
// distinct (gaps [5,5,10]: A, 5 others, A, 5 others, A, 10 others). A's
// certified-move rank is recorded after every lesson; the decision uses A after
// the final gap. Training boards only. Writes only inside --out; reads the base
// registration's existing Stockfish review cache and never collects one.
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

// Lesson sequence: A, then gaps[0] others, A, gaps[1] others, ... (others used once each, in order).
export function spacedSchedule(aPanelId,others,gaps){
  assert(gaps.length>=1&&gaps.every(gap=>Number.isSafeInteger(gap)&&gap>=1));
  assert.equal(others.length,gaps.reduce((a,b)=>a+b,0),'Require one distinct board per interfering lesson');
  assert(!others.includes(aPanelId)&&new Set(others).size===others.length);
  const sequence=[];let next=0;
  for(const gap of gaps){sequence.push(aPanelId);for(let i=0;i<gap;i++)sequence.push(others[next++]);}
  return sequence;
}

async function main(){
  const args=parseArgs({options:{protocol:{type:'string'},out:{type:'string'},'cpu-duty':{type:'string'}}}).values;
  assert(args.protocol&&args.out,'Usage: --protocol PATH --out PATH --cpu-duty 0.5');
  assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with the pinned 256 MiB Node heap limit');
  const protocolBytes=readFileSync(inside(args.protocol)),protocol=JSON.parse(protocolBytes);
  assert.equal(protocol.schema,'lichess-stage1-retention-probe-protocol-spaced-v1');
  assert(CONDITIONS.includes(protocol.condition),'Register the probe teaching condition');
  assert.equal(Number(args['cpu-duty']),protocol.cpuDuty);assert.equal(protocol.cpuDuty,0.5);
  const limits=protocol.resourceLimits;assert.equal(limits.rssMiB,2048);assert.equal(limits.freeMiB,256);
  const gaps=protocol.gaps,interfering=gaps.reduce((a,b)=>a+b,0);
  assert.equal(protocol.interferingLessons,interfering,'Interfering lesson count must equal the sum of gaps');
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
      lineageKey:`retention-probe-spaced:${protocol.replica}:${protocol.condition}:${eta}`,outputDir:out,
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
          factors:receipt.result.update?.factors??[],alphaFactors:receipt.result.update?.alphaFactors??[],
          changedEdges:receipt.result.update?.changedEdges??0,alphaChangedEdges:receipt.result.update?.alphaChangedEdges??0});
      }
      session.finish();
      events.push({move:experience.move,status:experience.status,chosenBefore:assessment.choice,pulses});
    }
    const after=(await assessLichessTrainingPanel(panel,arm.brain)).assessment;
    const aAfter=aPanel===panel?after:(await assessLichessTrainingPanel(aPanel,arm.brain)).assessment;
    return {panelId:panel.panelId,isA:panel===aPanel,before:successRank(before,panel.experiences),
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
        [...panels.keys()],interfering);
      const lessons=[];
      for(const id of spacedSchedule(a.panelId,others,gaps))lessons.push(await lesson(arm,panels.get(id),aPanel));
      const aLessons=lessons.map((row,index)=>({row,index})).filter(item=>item.row.isA).map(item=>item.index);
      // A just before each re-teach and at the end: the retention after each gap.
      const afterGaps=[...aLessons.slice(1).map(index=>lessons[index-1].a),lessons.at(-1).a];
      const final=lessons.at(-1).a;
      const probe={schema:'stage1-retention-probe-spaced-result-v1',condition:protocol.condition,eta,replica:protocol.replica,
        aPanelId:a.panelId,stratum:a.stratum,gaps,interferingPanels:others,scratch:scratch.find(row=>row.panelId===a.panelId),
        aAfterOwnLessons:aLessons.map(index=>lessons[index].a),aAfterGaps:afterGaps,aAfterInterference:final,retained:final.correct,
        aRankTrajectory:lessons.map(row=>row.a.rank),interferingAcquired:lessons.filter(row=>!row.isA&&row.after.correct).length,
        lessons,presentations:arm.brain.presentations,finalMemorySha256:arm.brain.memoryFingerprint()};
      atomicJson(join(out,`probe-eta${eta}-${a.panelId}.json`),probe);probes.push(probe);completed++;
      emit({event:'probe-completed',status:'running',phase:`eta ${eta}`,lesson:a.panelId,
        retained:final.correct,aRank:final.rank,completedLineages:completed,totalLineages:total});
    }
    perEta.push({eta,retained:probes.filter(row=>row.retained).length,probes:probes.length,
      acquiredFirstLesson:probes.filter(row=>row.aAfterOwnLessons[0].correct).length,
      correctAfterGap:gaps.map((_,gap)=>probes.filter(row=>row.aAfterGaps[gap].correct).length),
      aRanks:probes.map(row=>({aPanelId:row.aPanelId,scratch:row.scratch.rank,own:row.aAfterOwnLessons.map(r=>r.rank),
        afterGaps:row.aAfterGaps.map(r=>r.rank),final:row.aAfterInterference.rank,legal:row.aAfterInterference.legal}))});
  }
  const chosenEta=chooseEta(perEta,protocol.decision.requiredRetained);
  const cpu=process.cpuUsage(cpuStart);
  const result={schema:'stage1-retention-probe-spaced-v1',condition:protocol.condition,status:chosenEta===null?'no-eta-passes':'eta-chosen',
    protocolSha256:sha256(protocolBytes),baseRegistrationSha256:protocol.baseRegistration.sha256,
    initialMemorySha256,scratchCorrect:scratch.filter(row=>row.correct).length,aBoards,gaps,
    perEtaPasses:perEta.map(row=>({eta:row.eta,retained:row.retained,acquiredFirstLesson:row.acquiredFirstLesson,
      correctAfterGap:row.correctAfterGap,probes:row.probes})),
    perEta,decisionRule:protocol.decision.rule,chosenEta,peakRssMiB:Math.round(peakRssMiB*10)/10,
    elapsedSeconds:Math.round((performance.now()-started)/100)/10,cpuSeconds:Math.round((cpu.user+cpu.system)/1e5)/10,
    scope:'Training boards only, one replica; spaced-repetition retention probe, not one-shot retention, a gate result or a learning claim'};
  atomicJson(join(out,'result.json'),result);
  emit({event:'probe-finished',status:result.status,chosenEta,perEtaPasses:JSON.stringify(result.perEtaPasses)});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
  process.stderr.write(JSON.stringify({status:'probe-error',error:String(error.stack??error).slice(0,2000)})+'\n');
  process.exitCode=2;
});

import fs from 'node:fs';
import assert from 'node:assert/strict';
const dest='.codebase/scripts/puzzle-learning/train-stability-feedback-dose.mjs';assert.ok(!fs.existsSync(dest));
let s=fs.readFileSync('.codebase/scripts/puzzle-learning/train-multi-context-stability.mjs','utf8');
s=s.slice(0,s.indexOf('async function search(row, config)'));
s=s.replaceAll('runMultiContextStability','runStabilityFeedbackDose').replaceAll('multi-context-stability-experiment.mjs','stability-feedback-dose-experiment.mjs').replaceAll('research/data/multi-context-stability-v1/protocol.json','research/data/stability-feedback-dose-v1/protocol.json');
s=s.replace('state = saved.state; assert.deepEqual(state.naive, naive);','state = saved.state; assert.deepEqual(state.initial, naive);');
s=s.replace('else state = { naive, memory: naive','else state = { initial: naive, memory: naive');
s+=`
try {
  atomic(join(out, 'run-identity.json'), identity);
  const schedule=read(p.schedulePath);
  const experiences=readFileSync(p.experiencesPath,'utf8').trim().split(/\\r?\\n/).map(JSON.parse);
  const execution=await runStabilityFeedbackDose({brain,experiences,schedule,state,save,publish,guard,maxEvents});
  state=execution.state;
  if(execution.complete){
    const doses=state.results.flatMap(r=>r.doseRefs.map(d=>({condition:r.condition,...d})));
    while(state.evaluationRefs.length<doses.length){
      const d=doses[state.evaluationRefs.length],snapshot=await load(d.ref);
      memory.restore(snapshot.memory);const panels=[];
      for(const row of rows)panels.push(await panel(row));
      state.evaluationRefs.push(await publish('evaluation-'+d.condition+'-'+d.dose+'.json',{condition:d.condition,dose:d.dose,memory:snapshot.memory,panels}));
      memory.restore(state.memory);state.presentations=brain.presentations;await save(state);
    }
  }
  const cpu=process.cpuUsage(cpuStarted);
  const report={schema:p.schema,complete:execution.complete,identity,state,results:state.results,evaluations:await Promise.all(state.evaluationRefs.map(load)),command:{executable:process.execPath,execArgv:process.execArgv,argv:process.argv},resources:{elapsedSeconds:(performance.now()-started)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,peakRssMiB:process.resourceUsage().maxRSS/1024,invocationPresentations,cpuDuty:duty},scope:'Fixed mixed feedback dose on trained positions only; separate no-feedback sibling evaluation and audits required.'};
  atomic(join(out,'report.json'),report);console.log(JSON.stringify({complete:report.complete,events:state.totalEvents,resources:report.resources}));
}catch(error){atomic(join(out,'interruption.json'),{error:String(error.stack),identity,lastPublishedCheckpoint:checkpoint});throw error;}
`;
fs.writeFileSync(dest,s);

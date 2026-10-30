// Parallel replica steps v2 (review W05, ledger L104): identical to v1 except that the generated pins also include every
// file of the source closure of the runner, runtime factory and evaluator (source-closure.mjs), without duplicating existing keys.
// Parallel replica steps v1 (2026-10-29; researcher instruction, decision log): from a registered serial stage step
// file (build-lichess-campaign-v1.mjs), write one train-only step per replica and a merge+audit step, all on runner v5.
// Launch: `fly --config REPLICA_STEP detach train --train-only` per replica (detach prepends babysit and, since 2026-10-30,
// forwards --config); after all three publish
// result.json, `fly --config MERGE_STEP detach merge audit`. Each replica keeps its own resume lineage.
// Usage (repo root): node build-lichess-parallel-steps-v2.mjs --step "python actions/NAME-step.json" [--out-dir DIR]
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {sourceClosure} from '../runtime/source-closure.mjs';

// Runner v6 (sleep-safe pacing, matrix v3 resume fix; ledger L097/L102) for new registrations.
const RUNNER='.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v6.mjs';
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const {values:args}=parseArgs({options:{step:{type:'string'},'out-dir':{type:'string',default:'python actions'}}});
assert(args.step,'Usage: --step STEP_JSON [--out-dir DIR]');
const serial=JSON.parse(readFileSync(args.step,'utf8')),registration=JSON.parse(readFileSync(serial.paths.registration,'utf8'));
assert.equal(serial.recovery?.kind,'lichess-stage-matrix-v1');assert.equal(registration.stage,1,'Parallel merge covers stage 1 only');
const train=serial.jobs.train.argv,duty=train.at(-1);
assert.deepEqual(train.slice(0,5),['node','--max-old-space-size=256','{runner}','--registration','{registration}']);
const withReplica=(argv,replica)=>[...argv.slice(0,5),'--replica',replica,...argv.slice(5)];
const pins={...serial.pins,'{runner}':sha(RUNNER)};
// W05/L104: pin the whole source closure of the runner, runtime factory and evaluator. Existing keys are compared after
// placeholder expansion, so a file already pinned under another key is not duplicated; any byte mismatch stops the build.
const paths={...serial.paths,runner:RUNNER};
const expanded=new Map(Object.entries(pins).map(([key,hash])=>[key.replace(/\{(\w+)\}/g,(_,name)=>paths[name]),hash]));
for(const {path,sha256:digest} of sourceClosure([RUNNER,registration.runtimeFactory.path,registration.stageAcceptanceEvaluator.path,...expanded.keys()].filter(p=>!p.includes('{')))){
  if(expanded.has(path))assert.equal(expanded.get(path),digest,`Pinned ${path} differs from its current bytes`);
  else pins[path]=digest;
}
const write=(name,step)=>{const path=join(args['out-dir'],`${name}-step.json`);assert(!existsSync(path),`Preserve existing ${path}`);
  writeFileSync(path,JSON.stringify(step,null,2)+'\n',{flag:'wx'});return path;};
const common={...serial,pins,pause_control:{supported_executables:[RUNNER]},parallel:{maxGraphProcesses:4},
  ...(registration.batteryCpuDuty===undefined?{}:{power_pacing:{ac:Number(duty),battery:registration.batteryCpuDuty}})};
const out=[];
for(const replica of registration.replicas){
  const run=`${serial.paths.run}-${replica}`,name=`${serial.name}-${replica}`;
  out.push(write(name,{...common,name,paths:{...serial.paths,runner:RUNNER,run,checkpoint:`${run}/matrix-state.json`},
    state_file:serial.state_file.replace(/-state\.json$/,`-${replica}-state.json`),
    jobs:{train:{...serial.jobs.train,argv:withReplica(serial.jobs.train.argv,replica)},
      resume:{...serial.jobs.resume,argv:withReplica(serial.jobs.resume.argv,replica)}},
    artifacts:{result:'{run}/result.json'}}));
}
const parts=registration.replicas.map(replica=>`${serial.paths.run}-${replica}`).join(',');
const name=`${serial.name}-merge`;
out.push(write(name,{...common,name,paths:{...serial.paths,runner:RUNNER},
  state_file:serial.state_file.replace(/-state\.json$/,'-merge-state.json'),
  jobs:{merge:{role:'train',argv:[...train.slice(0,5),'--mode','merge','--out','{run}','--parts',parts,'--protocol','{protocol}','--cpu-duty',duty],
      requires:['{registration}','{protocol}','{runner}'],fresh_output:'{run}'},
    audit:serial.jobs.audit}}));
process.stdout.write(JSON.stringify({steps:out,duty})+'\n');

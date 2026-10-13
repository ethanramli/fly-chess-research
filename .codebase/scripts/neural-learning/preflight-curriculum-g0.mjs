// Static identity/teacher/receiver preflight. Never instantiate or execute the graph.
import assert from 'node:assert/strict';
import {createReadStream,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {parseArgs} from 'node:util';
import {join} from 'node:path';
import os from 'node:os';
import {readNpz} from '../../src/runtime/graph.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {createG0Table,certifyG0,verifyG0,createG0Encoder,planG0Schedule} from '../../src/neural-learning/curriculum-g0.mjs';
import {temporalStimulusFrames} from '../../src/puzzle-learning/temporal-feedback-plan.mjs';

const {values:args}=parseArgs({options:{out:{type:'string'}}});
assert(args.out&&process.execArgv.includes('--max-old-space-size=256'),'Require fresh --out and heap256');
const started=performance.now(),cpuStart=process.cpuUsage();let peakRss=0;
function guard(){
  peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(peakRss<=768*2**20&&os.freemem()>=256*2**20,'Resource guard');
}
guard();mkdirSync(args.out,{recursive:false});
const paths={graph:'.cache/full.npz',annotations:'.cache/flywire-annotations-v2.1.0.tsv',
  mapping:'research/reports/plasticity-timing-candidate-2026-10-09/rate-timing-map.json'};
const mapping=JSON.parse(readFileSync(paths.mapping,'utf8')),hashes={};
for(const [name,path] of Object.entries(paths)){
  const hash=createHash('sha256');for await(const chunk of createReadStream(path)){hash.update(chunk);guard();}
  hashes[name]=hash.digest('hex');
}
assert.equal(hashes.graph,mapping.inputs.graph);assert.equal(hashes.annotations,mapping.inputs.annotations);
const {root_ids:roots}=readNpz(paths.graph,['root_ids']);guard();
const wanted=new Set(mapping.groups.flatMap(g=>[...g.kc,...g.dan.map(c=>c.index)]).map(i=>roots[i].toString()));
const cells=new Map();let header;
for await(const line of createInterface({input:createReadStream(paths.annotations),crlfDelay:Infinity})){
  const fields=line.split('\t');if(!header){header=fields;continue;}
  const get=key=>fields[header.indexOf(key)],root=get('root_id');
  if(wanted.has(root)){
    assert(!cells.has(root),'Duplicate annotation');
    cells.set(root,{type:get('hemibrain_type'),side:get('side'),cellClass:get('cell_class')});
  }
}
for(const g of mapping.groups){
  assert.equal(g.mbonType,'MBON12');assert.equal(g.danType,'PPL103');assert.equal(g.dan.length,1);
  assert.equal(g.kc.length,g.edges.length);assert.equal(g.kc.length,g.kcTypes.length);
  for(let i=0;i<g.kc.length;i++){
    const cell=cells.get(roots[g.kc[i]].toString());assert(cell);
    assert.equal(cell.cellClass,'Kenyon_Cell');assert.equal(cell.side,g.side);
    assert.equal(cell.type,g.kcTypes[i]);assert(/^KCg-/.test(cell.type));
  }
  for(const c of g.dan){
    assert.equal(roots[c.index].toString(),c.rootId);assert.deepEqual(cells.get(c.rootId),
      {type:'PPL103',side:g.side,cellClass:'DAN'});
  }
}
guard();
const table=createG0Table(),schedule=planG0Schedule(table),timing={cueFrame:2,leadFrames:2,tailFrames:16,current:1.5};
const seeds=[20261011,20261012,20261013],replicas=[];
for(const seed of seeds){
  const encoder=createG0Encoder(mapping,{seed});
  const publicInputs=table.rows.map(r=>({cue:r.cue,action:r.action}));
  const cueHashes=publicInputs.map(input=>digest(encoder.encode(input)));
  const stimulationHashes=publicInputs.map(input=>digest(encoder.encode(input).stimulation));
  const byPhase={};
  for(const phase of ['acquisition','interference','reversal']){
    const slots=schedule.filter(s=>s.experience.phase===phase),plans=[];
    for(const slot of slots){
      const checked=verifyG0(table,slot.experience);assert(checked.learningAllowed);
      const cue=encoder.encode(slot.experience.publicInput);
      const arms=Object.fromEntries(['informative','absent','shuffled','disabled'].map(condition=>[condition,
        temporalStimulusFrames(cue,mapping,timing,checked.status,condition==='shuffled'
          ?{condition,shuffledStatus:slot.shuffledStatus}:{condition})]));
      assert.deepEqual(arms.informative.frames,arms.disabled.frames);
      assert.equal(arms.absent.frames.filter(f=>f.hasPulse).length,0);
      assert(arms.absent.plasticityEnabled);assert(!arms.disabled.plasticityEnabled);
      for(const arm of Object.values(arms)){
        assert.equal(arm.frames.length,19);assert.equal(arm.frames.filter(f=>f.hasCue).length,1);
        assert.deepEqual(arm.frames.find(f=>f.hasCue).stimulation.filter(c=>!mapping.groups.some(g=>g.dan[0].index===c.index)),cue.stimulation);
      }
      plans.push({experience:slot.experience,shuffledStatus:slot.shuffledStatus,cue,arms});
    }
    byPhase[phase]={presentations:slots.length,known:slots.length,
      successes:slots.filter(s=>s.experience.status==='success').length,
      shuffledAgreement:slots.filter(s=>s.experience.status===s.shuffledStatus).length,
      planHash:digest(plans)};
    for(const action of ['A','B'])for(const status of ['success','failure'])
      assert.equal(slots.filter(s=>s.experience.publicInput.action===action&&s.experience.status===status).length,
        slots.filter(s=>s.experience.publicInput.action===action&&s.shuffledStatus===status).length);
  }
  replicas.push({seed,encoderIdentity:encoder.identity,cueHashes,stimulationHashes,byPhase,
    evokedResponseDistinction:'unmeasured; different input projections alone do not pass the replica gate'});
}
for(let i=1;i<replicas.length;i++)assert.notDeepEqual(replicas[i].stimulationHashes,replicas[0].stimulationHashes);
const unknown={...schedule[0].experience,status:'unknown',proof:certifyG0(table,'acquisition',schedule[0].experience.publicInput,{maxRows:0})};
assert(!verifyG0(table,unknown).learningAllowed);
const forged=structuredClone(schedule[0].experience);forged.proof.status='failure';assert.throws(()=>verifyG0(table,forged));
const sourcePaths=[
  '.codebase/scripts/neural-learning/preflight-curriculum-g0.mjs',
  '.codebase/src/neural-learning/curriculum-g0.mjs',
  '.codebase/src/neural-learning/association-validation.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs',
  '.codebase/src/neural-learning/neural-episode.mjs',
  '.codebase/src/neural-learning/rate-timing-memory.mjs',
  '.codebase/src/neural-learning/rate-timing-plasticity-candidate.mjs',
  '.codebase/src/puzzle-learning/temporal-feedback-plan.mjs',
  '.codebase/src/puzzle-learning/temporal-feedback-session.mjs',
  '.codebase/tests/neural-learning/curriculum-g0.test.mjs',
];
const sourceHashes=Object.fromEntries(sourcePaths.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
const write=(name,value)=>writeFileSync(join(args.out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
write('contingencies.json',table);write('schedule.json',schedule);
guard();
const report={schema:'curriculum-g0-receiver-preflight-v1',staticChecksPassed:true,graphRunReady:false,
  paths,hashes,sourceHashes,tableHash:digest(table),scheduleHash:digest(schedule),timing,replicas,
  mappedGammaKCs:new Set(mapping.groups.flatMap(g=>g.kc)).size,mappedEdges:mapping.groups.flatMap(g=>g.edges).length,
  checks:['independently reproducible toy contingency','unknown produces no teaching permission','forged evidence rejected',
    '32/16/32 balanced matched exposure','phase/action waveform-class matching','public-only cue projection',
    'released KC/DAN identity and type joins','different frozen input projections'],
  remaining:['freeze graph runner and independent neural replay auditor with complete transitive source pins',
    'verify mapped KC-to-MBON edge endpoints/signs and readout roots against released sparse arrays',
    'measure distinct evoked responses in all three replicas',
    'execute matched acquisition, actual intervening teaching and reversal; evaluate original curriculum gates',
    'fault-test atomic disk pending-receipt recovery in that runner',
    'declare existing compartment/receptor/timing/natural-reward biological approximations'],
  graphDynamicsExecuted:false,learnerTrainingExecuted:false,G0Passed:false,
  command:{argv:process.argv,execArgv:process.execArgv},peakRssMiB:peakRss/2**20,
  elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),
  scope:'Static teacher/receiver readiness only. Inert recovery tests are separate; no acquisition, biological retention, chess transfer or reasoning evidence.'};
write('preflight.json',report);
console.log(JSON.stringify({staticChecksPassed:true,graphRunReady:false,peakRssMiB:report.peakRssMiB,
  mappedEdges:report.mappedEdges,replicas:replicas.length}));

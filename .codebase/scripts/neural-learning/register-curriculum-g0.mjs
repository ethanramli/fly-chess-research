// Freeze a fresh G0 protocol and its complete local import closure before execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,createReadStream} from 'node:fs';
import {resolve,relative,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {readNpz} from '../../src/runtime/graph.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {createG0Table,planG0Schedule} from '../../src/neural-learning/curriculum-g0.mjs';

const {values:a}=parseArgs({options:{out:{type:'string'},fixture:{type:'boolean'}}});assert(a.out&&process.execArgv.includes('--max-old-space-size=256'));
let peakRss=0;function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=768*2**20&&os.freemem()>=256*2**20);}
const json=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
mkdirSync(a.out,{recursive:false});
const old=json('research/data/consequence-value-feasibility-v1/protocol.json'),curriculum=json('research/data/principles-curriculum-v1/curriculum.json');
const p={schema:'curriculum-g0-assay-v1',created:new Date().toISOString(),fixture:Boolean(a.fixture),
  graphPath:old.graphPath,annotationPath:old.annotationPath,mappingPath:old.mappingPath,
  model:old.model,memory:old.memory,timing:old.timing,encoder:{maxCells:8,totalCurrent:12},readout:old.readout,
  projectionSeeds:[20261011,20261012,20261013],shuffleSeed:20261011,phases:['acquisition','interference','reversal'],
  conditions:['informative','absent','shuffled','disabled'],gates:{minCorrectContexts:curriculum.prerequisites.minCorrectContexts,
    minControlAdvantageContexts:curriculum.prerequisites.minControlAdvantageContexts,epsilon:curriculum.prerequisites.epsilon},
  earlyStop:'after-complete-matched-phase-on-any-required-gate-failure',maxPresentations:24000,
  scope:'G0 synthetic contingency prerequisite: acquisition, actual intervening teaching, reversal and causal memory checks. Engineering gamma2 timing hypothesis with symbolic neutral cues and fixed reference-relative readout; no chess learning, natural reward, biological timing/retention or reasoning claim.',
  approximations:['positive existing gamma-KC-to-MBON12 edges; coarse hemisphere/compartment map',
    'synapse-coordinate and receptor-specific identities unmeasured','fixed unstimulated-model local reference and numerical rate normalization',
    'frame-held gains and model-unit intervals; not biological seconds','external favorable/adverse pulse-order code is not natural dopamine reward',
    'engineered direct KC sensory projection and reference subtraction; no modeled eyes or label-fitted decoder'],
  checkpointContract:'Bounded immutable gzip JSON checkpoints include all physiological state, transient episode, next-frame cursor and pending receipt before JSONL acknowledgement. Resume the last completed publication into a new directory, validate receipt chain/pins, acknowledge pending record without neural reapplication. Preserve raw JSONL, all completed publications and partials. Real process recovery, not a power-loss/filesystem guarantee.'};
let mapping;
if(a.fixture){
  mapping={schema:'gamma2-rate-timing-map-v1',groups:[{side:'left',mbonType:'MBON12',danType:'PPL103',kc:[0,1],kcTypes:['KCg-m','KCg-m'],
    edges:[0,1],dan:[{index:2}],mbon:[{index:3},{index:3}]}]};
  p.mappingPath=join(a.out,'mapping.json').replaceAll('\\','/');writeFileSync(p.mappingPath,JSON.stringify(mapping,null,2)+'\n',{flag:'wx'});
  p.fixtureGraph={row:[0,0,0,0,2,3,3],col:[0,1,3],sign:[1,1,1],initial:[1,2,1],input:[5],output:[3,4]};
  p.model={...p.model,steps:2};p.encoder={maxCells:1,totalCurrent:1.5};
  p.readout={cells:{MBON12:[{index:3}],MBON01:[{index:4}]},scale:1,algorithm:old.readout.algorithm};
  p.scope='Small synthetic graph process-recovery fixture only. Does not validate G0, connectome physiology or learning.';
}else{
  mapping=json(p.mappingPath);
  for(const [path,expected] of [[p.graphPath,mapping.inputs.graph],[p.annotationPath,mapping.inputs.annotations]]){
    const h=createHash('sha256');for await(const b of createReadStream(path)){h.update(b);guard();}assert.equal(h.digest('hex'),expected);
  }
  const arrays=readNpz(p.graphPath,['root_ids','csr_indptr','csr_indices','sign']);guard();
  const wanted=new Set([...Object.values(p.readout.cells).flat(),...mapping.groups.flatMap(g=>[...g.dan,...g.mbon])].map(c=>c.rootId));
  const cells=new Map();let header;
  for await(const line of createInterface({input:createReadStream(p.annotationPath),crlfDelay:Infinity})){
    const fields=line.split('\t');if(!header){header=fields;continue;}
    const get=key=>fields[header.indexOf(key)],root=get('root_id');
    if(wanted.has(root)){assert(!cells.has(root));cells.set(root,{type:get('hemibrain_type'),side:get('side')});}
  }
  for(const [type,list] of Object.entries(p.readout.cells))for(const cell of list){
    assert.equal(arrays.root_ids[cell.index].toString(),cell.rootId);assert.equal(cells.get(cell.rootId)?.type,type);
  }
  for(const g of mapping.groups){
    assert.equal(g.kc.length,g.mbon.length);assert.equal(g.kc.length,g.edges.length);
    for(const c of g.dan){assert.equal(arrays.root_ids[c.index].toString(),c.rootId);assert.deepEqual(cells.get(c.rootId),{type:'PPL103',side:g.side});}
    for(let i=0;i<g.edges.length;i++){
      const e=g.edges[i],post=g.mbon[i];assert.equal(arrays.root_ids[post.index].toString(),post.rootId);assert.equal(cells.get(post.rootId)?.type,'MBON12');
      assert.equal(arrays.csr_indices[e],g.kc[i]);assert.equal(arrays.sign[e],1);
      assert(e>=arrays.csr_indptr[post.index]&&e<arrays.csr_indptr[post.index+1]);
    }
  }
  p.staticMappingChecks={passed:true,mappedEdges:mapping.groups.flatMap(g=>g.edges).length,readoutCells:Object.values(p.readout.cells).flat().length,
    scope:'released endpoints/signs/root IDs and MBON/DAN annotation types; no receptor or synapse-coordinate validation'};
}
p.scheduleHash=digest(planG0Schedule(createG0Table(),{shuffleSeed:p.shuffleSeed}));
p.sources={};
const pending=['.codebase/scripts/neural-learning/run-curriculum-g0.mjs','.codebase/scripts/neural-learning/audit-curriculum-g0.mjs',
  '.codebase/scripts/neural-learning/register-curriculum-g0.mjs',p.mappingPath,'research/data/principles-curriculum-v1/curriculum.json'];
while(pending.length){
  const path=pending.pop();if(p.sources[path])continue;const bytes=readFileSync(path);p.sources[path]=createHash('sha256').update(bytes).digest('hex');
  if(!path.endsWith('.mjs'))continue;
  for(const m of bytes.toString('utf8').matchAll(/\b(?:from\s+|import\s*\(\s*|import\s+)['"](\.[^'"]+)['"]/g)){
    const target=relative(process.cwd(),resolve(dirname(path),m[1])).replaceAll('\\','/');assert(!target.startsWith('..'));pending.push(target);
  }
}
p.dependencies=Object.fromEntries(['package-lock.json','node_modules/chess.js/package.json','node_modules/chess.js/dist/esm/chess.js']
  .map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));guard();
p.registrationPeakRssMiB=peakRss/2**20;
writeFileSync(join(a.out,'protocol.json'),JSON.stringify(p,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({protocol:join(a.out,'protocol.json'),fixture:p.fixture,sources:Object.keys(p.sources).length,staticMappingChecks:p.staticMappingChecks,peakRssMiB:p.registrationPeakRssMiB}));

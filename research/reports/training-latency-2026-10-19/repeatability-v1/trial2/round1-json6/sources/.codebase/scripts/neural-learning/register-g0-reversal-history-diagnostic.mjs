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
import {planG0HistoryDiagnostic} from '../../src/neural-learning/g0-reversal-history-diagnostic.mjs';

const {values:a}=parseArgs({options:{out:{type:'string'}}});assert(a.out&&process.execArgv.includes('--max-old-space-size=256'));
let peakRss=0;function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=768*2**20&&os.freemem()>=256*2**20);}
const json=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const fixtureProtocol=json('research/data/g0-history-runner-fixture-v1/protocol.json');
assert.equal(fixtureProtocol.fixture,true);
for(const [path,expected] of Object.entries({...fixtureProtocol.sources,...fixtureProtocol.dependencies}))
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),expected,'Validated fixture bytes changed: '+path);
const evidencePaths=['runs/g0-history-fixture-v1-uninterrupted/audit.json','runs/g0-history-fixture-v1-resumed/audit.json','runs/g0-history-fixture-v1-resumed/recovery-check.json'];
const preflight=Object.fromEntries(evidencePaths.map(path=>{
  const bytes=readFileSync(path),evidence=JSON.parse(bytes);assert.equal(evidence.passed,true,path);
  if(path.endsWith('audit.json')){
    assert.equal(evidence.fullNeuralReplay,true);assert.equal(evidence.receipts,14161);assert.equal(evidence.presentations,15481);
    assert.equal(evidence.auditorSha256,createHash('sha256').update(readFileSync('.codebase/scripts/neural-learning/audit-g0-reversal-history-diagnostic.mjs')).digest('hex'));
  }else assert.deepEqual(evidence.counts,{baselines:1,'stage-start':24,'lesson-start':672,frame:12768,lesson:672,'stage-end':24});
  return [path,createHash('sha256').update(bytes).digest('hex')];
}));
const plan=planG0HistoryDiagnostic();
mkdirSync(a.out,{recursive:false});
const old=json('research/data/consequence-value-feasibility-v1/protocol.json'),curriculum=json('research/data/principles-curriculum-v1/curriculum.json');
const p={schema:'g0-reversal-history-diagnostic-v1',created:new Date().toISOString(),fixture:false,
  graphPath:old.graphPath,annotationPath:old.annotationPath,mappingPath:old.mappingPath,
  model:old.model,memory:old.memory,timing:old.timing,encoder:{maxCells:8,totalCurrent:12},readout:old.readout,
  projectionSeeds:[plan.projectionSeed],shuffleSeeds:plan.shuffleSeeds,conditions:plan.conditions,preflight,gates:{minCorrectContexts:curriculum.prerequisites.minCorrectContexts,
    minControlAdvantageContexts:curriculum.prerequisites.minControlAdvantageContexts,epsilon:curriculum.prerequisites.epsilon},
  stopping:'complete-all-matched-diagnostic-stages',maxPresentations:16000,
  scope:'One-projection causal diagnostic: retained versus explicit complete-memory reset after matched prior teaching, with three independent shuffled histories and causal controls. Synthetic neutral contingencies; cannot pass G0 or authorize C01. No biological forgetting, chess learning or reasoning claim.',
  approximations:['positive existing gamma-KC-to-MBON12 edges; coarse hemisphere/compartment map',
    'synapse-coordinate and receptor-specific identities unmeasured','fixed unstimulated-model local reference and numerical rate normalization',
    'frame-held gains and model-unit intervals; not biological seconds','external favorable/adverse pulse-order code is not natural dopamine reward',
    'engineered direct KC sensory projection and reference subtraction; no modeled eyes or label-fitted decoder'],
  checkpointContract:'Bounded immutable gzip JSON checkpoints include all physiological state, transient episode, next-frame cursor and pending receipt before JSONL acknowledgement. Resume the last completed publication into a new directory, validate receipt chain/pins, acknowledge pending record without neural reapplication. Preserve raw JSONL, all completed publications and partials. Real process recovery, not a power-loss/filesystem guarantee.'};
let mapping;
{
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
p.planHash=digest(plan);
p.parentFailureAudit={path:'runs/curriculum-g0-assay-v1-resumed5/audit.json',sha256:createHash('sha256').update(readFileSync('runs/curriculum-g0-assay-v1-resumed5/audit.json')).digest('hex')};
p.approximations.push('whole-memory reset is an explicit causal intervention, not modeled biological forgetting');
p.sources={};
const pending=['.codebase/scripts/neural-learning/run-g0-reversal-history-diagnostic.mjs','.codebase/scripts/neural-learning/audit-g0-reversal-history-diagnostic.mjs',
  '.codebase/scripts/neural-learning/register-g0-reversal-history-diagnostic.mjs',p.mappingPath,'research/data/principles-curriculum-v1/curriculum.json','documentation/design/neural-learning/g0-reversal-history-diagnostic.md'];
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

// Fresh Stage 2 learner using the existing pinned graph, local plasticity and
// bounded public-frame encoder. This constructs a runtime; it does not pass a gate.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {loadGraph,readNpz} from '../runtime/graph.mjs';
import {SparseTrainer} from '../supervised-baselines/trainer.mjs';
import {ReversalMemory} from '../neural-learning/reversal-memory.mjs';
import {digest,annotationHash} from '../neural-learning/mushroom-body.mjs';
import {fixedStateHash} from '../neural-learning/association-validation.mjs';
import {createPublicStage2CurriculumFrameEncoder} from '../chess-input/public-lesson-frame-cue.mjs';
import {CoupledStockfishBrain} from './coupled-stockfish-brain.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function createLichessStage2Brain({registration,replica,repositoryRoot,guard=()=>{},pace=async()=>{}}){
  assert.equal(registration?.stage,2,'This learner constructor is Stage 2 only');
  const spec=registration.learner;
  assert.equal(spec?.schema,'lichess-stage2-brain-v1');
  assert(typeof replica==='string'&&registration.replicas?.includes(replica));
  assert(typeof repositoryRoot==='string'&&typeof guard==='function'&&typeof pace==='function');
  assert.equal(spec.encoder?.taskFamily,'stage2-with-rehearsal','Stage 2 requires bounded mate tasks and earlier capture rehearsal');
  const seed=spec.replicaSeeds?.[replica];
  assert(Number.isSafeInteger(seed)&&seed>=0&&seed<=0xffffffff,'Require a pinned from-scratch seed');
  const local=ref=>{
    assert(typeof ref?.path==='string'&&/^[A-Za-z0-9._/-]+$/.test(ref.path));
    assert.match(ref.sha256,/^[a-f0-9]{64}$/);
    const path=resolve(repositoryRoot,ref.path);
    assert(path.startsWith(resolve(repositoryRoot)+sep),'Learner input escapes the repository');
    const bytes=readFileSync(path);
    assert.equal(sha256(bytes),ref.sha256,`Pinned learner input changed: ${ref.path}`);
    return {path,bytes};
  };
  guard();
  const graphRef=local(spec.graph),mappingRef=local(spec.mapping),modelRef=local(spec.modelSource);
  const graph=loadGraph(graphRef.path),ids=readNpz(graphRef.path,['root_ids']).root_ids;
  guard();
  const mappingDocument=JSON.parse(mappingRef.bytes),mapping=mappingDocument.mapping;
  const modelSource=JSON.parse(modelRef.bytes),source=modelSource.identity;
  assert.equal(mapping?.schema,'reversal-coarse-mapping-v1');
  assert.equal(mapping.readyForCandidateExperiment,true);
  assert.equal(mappingDocument.inputs?.graph,spec.graph.sha256);
  assert.equal(mappingDocument.inputs?.annotations,annotationHash);
  assert.equal(source?.mappingHash,digest(mapping));
  assert(Object.values(source.inputs??{}).includes(spec.graph.sha256));
  assert(Object.values(source.inputs??{}).includes(annotationHash));
  assert(source.model&&spec.model&&typeof spec.model==='object');
  for(const [key,value] of Object.entries(spec.model))
    if(key!=='seed')assert.equal(value,source.model[key],`Model configuration differs from pinned source: ${key}`);
  assert.deepEqual(Object.keys(source.readouts??{}).sort(),['MBON01','MBON12']);
  for(const cells of Object.values(source.readouts)){
    assert(Array.isArray(cells)&&cells.length>0);
    for(const cell of cells)assert.equal(ids[cell.index]?.toString(),cell.rootId,'Readout root identity mismatch');
  }
  for(const group of mapping.groups){
    assert(['PAM02','PPL103'].includes(group.danType));
    for(const cell of group.dan)assert.equal(ids[cell.index]?.toString(),cell.rootId,'Teaching-cell root identity mismatch');
  }
  assert(mapping.groups.some(group=>group.danType==='PAM02')
    &&mapping.groups.some(group=>group.danType==='PPL103'),'Both registered valence channels are required');

  const model=new SparseTrainer(graph,{...spec.model,seed});
  const memory=new ReversalMemory(model,mapping,spec.memory);
  const invariant=fixedStateHash(model,memory.edges);
  model.forward([0]);
  const rest=Float32Array.from(model.h[model.steps]);
  // Same per-replica public-cue projection as Stage 1, so continued memory sees
  // the same capture cues (the model seed alone does not change responses).
  const encoder=createPublicStage2CurriculumFrameEncoder(mapping,{...spec.encoder,seed});
  const brain=new CoupledStockfishBrain({model,memory,mapping,encoder,readouts:source.readouts,rest,fixedModelIdentity:invariant,
    maxPresentations:spec.maxPresentations,maxLegalMoves:spec.maxLegalMoves,
    priorScale:spec.priorScale,current:spec.current,guard,pace});
  const identity=digest({schema:'lichess-stage2-brain-runtime-v1',replica,seed,graphSha256:spec.graph.sha256,
    mappingSha256:spec.mapping.sha256,modelSourceSha256:spec.modelSource.sha256,
    model:model.config,memory:memory.config,memoryIdentity:memory.identity,
    encoderIdentity:encoder.identity,valueIdentity:brain.valueIdentity,feedbackIdentity:brain.coupledIdentity,readouts:source.readouts,invariant});
  return {graph,ids,model,memory,mapping,readouts:source.readouts,rest,encoder,brain,invariant,identity};
}

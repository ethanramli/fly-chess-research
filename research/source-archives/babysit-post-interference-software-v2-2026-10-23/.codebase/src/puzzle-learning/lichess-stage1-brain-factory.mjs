// Construct a fresh, pinned Stage 1 learner. This does not authorize a run;
// the matrix CLI must pass its independently audited data gates first.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {loadGraph,readNpz} from '../runtime/graph.mjs';
import {SparseTrainer} from '../supervised-baselines/trainer.mjs';
import {ReversalMemory} from '../neural-learning/reversal-memory.mjs';
import {digest,annotationHash} from '../neural-learning/mushroom-body.mjs';
import {fixedStateHash} from '../neural-learning/association-validation.mjs';
import {createPublicLessonFrameEncoder} from '../chess-input/public-lesson-frame-cue.mjs';
import {StockfishValueBrain} from './stockfish-value-brain.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function createLichessStage1Brain({registration,replica,repositoryRoot,guard=()=>{},pace=async()=>{}}){
  assert.equal(registration?.stage,1,'This learner constructor is Stage 1 only');
  const spec=registration.learner;
  assert.equal(spec?.schema,'lichess-stage1-brain-v1');
  assert(typeof replica==='string'&&registration.replicas?.includes(replica),'Require a registered computational replica');
  assert(typeof repositoryRoot==='string'&&typeof guard==='function'&&typeof pace==='function');
  const seed=spec.replicaSeeds?.[replica];
  assert(Number.isSafeInteger(seed)&&seed>=0&&seed<=0xffffffff,'Require a pinned from-scratch seed for this replica');
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
  assert.equal(mapping.readyForCandidateExperiment,true,'Pinned mapping is not candidate-ready');
  assert.equal(mappingDocument.inputs?.graph,spec.graph.sha256,'Mapping was built for another graph');
  assert.equal(mappingDocument.inputs?.annotations,annotationHash,'Mapping uses another annotation revision');
  assert.equal(source?.mappingHash,digest(mapping),'Model source uses another mapping');
  assert(Object.values(source.inputs??{}).includes(spec.graph.sha256),'Model source does not pin this graph');
  assert(Object.values(source.inputs??{}).includes(annotationHash),'Model source does not pin these annotations');
  assert(source.model&&spec.model&&typeof spec.model==='object','Require explicit fresh model configuration');
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
  const encoder=createPublicLessonFrameEncoder(mapping,spec.encoder);
  const brain=new StockfishValueBrain({model,memory,mapping,encoder,readouts:source.readouts,rest,
    maxPresentations:spec.maxPresentations, maxLegalMoves:spec.maxLegalMoves,
    priorScale:spec.priorScale,current:spec.current,guard,pace});
  const identity=digest({schema:'lichess-stage1-brain-runtime-v1',replica,seed,graphSha256:spec.graph.sha256,
    mappingSha256:spec.mapping.sha256,modelSourceSha256:spec.modelSource.sha256,
    model:model.config,memory:memory.config,memoryIdentity:memory.identity,
    encoderIdentity:encoder.identity,valueIdentity:brain.valueIdentity,readouts:source.readouts,invariant});
  return {graph,ids,model,memory,mapping,readouts:source.readouts,rest,encoder,brain,invariant,identity};
}

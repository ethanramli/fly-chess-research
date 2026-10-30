// Stage 1 learner factory v5 (2026-10-26): factory v4 plus the aversive alpha3 store:
// pinned alpha3 mapping combined with the restrained and alpha1 mappings,
// AlphaLobeMemory, the unchanged public-action-relative-cue-v4 and
// CoupledStockfishBrainV5 (MBON07 and MBON14 readouts).
// Factory v4 header: factory v3 plus the alpha1 reward store:
// pinned alpha1 mapping combined with the restrained mapping, AlphaOneMemory,
// public-action-relative-cue-v4 and CoupledStockfishBrainV4 (MBON07 readout).
// Factory v3 header: factory v2 with public-action-relative-cue-v3.
// Factory v2 header follows. Stage 1 learner factory v2: the same
// fresh pinned learner as lichess-stage1-brain-factory.mjs (pinned by earlier
// runs), built with public-action-relative-cue-v2 and CoupledStockfishBrainV3 so
// Stockfish value pulses act on the move's own cue cells. Registrations select it
// through a v2 runtime factory. This does not authorize a run.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {loadGraph,readNpz} from '../runtime/graph.mjs';
import {SparseTrainer} from '../supervised-baselines/trainer.mjs';
import {AlphaLobeMemory,combineAlphaLobeMapping} from '../neural-learning/alpha-lobe-memory.mjs';
import {digest,annotationHash} from '../neural-learning/mushroom-body.mjs';
import {fixedStateHash} from '../neural-learning/association-validation.mjs';
import {createPublicActionRelativeEncoderV4} from '../chess-input/public-action-relative-cue-v4.mjs';
import {CoupledStockfishBrainV5} from './coupled-stockfish-brain-v5.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function createLichessStage1BrainV5({registration,replica,repositoryRoot,guard=()=>{},pace=async()=>{}}){
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
  const graphRef=local(spec.graph),mappingRef=local(spec.mapping),modelRef=local(spec.modelSource),alphaRef=local(spec.alphaOneMapping),alphaThreeRef=local(spec.alphaThreeMapping);
  const graph=loadGraph(graphRef.path),ids=readNpz(graphRef.path,['root_ids']).root_ids;
  guard();
  const mappingDocument=JSON.parse(mappingRef.bytes),restrainedMapping=mappingDocument.mapping;
  const alphaDocument=JSON.parse(alphaRef.bytes),alphaThreeDocument=JSON.parse(alphaThreeRef.bytes);
  assert.equal(alphaDocument.inputs?.graph,spec.graph.sha256,'Alpha1 mapping was built for another graph');
  assert.equal(alphaDocument.inputs?.annotations,annotationHash,'Alpha1 mapping uses another annotation revision');
  assert.equal(alphaThreeDocument.inputs?.graph,spec.graph.sha256,'Alpha3 mapping was built for another graph');
  assert.equal(alphaThreeDocument.inputs?.annotations,annotationHash,'Alpha3 mapping uses another annotation revision');
  assert.equal(alphaThreeDocument.inputs?.alphaOneMapping,spec.alphaOneMapping.sha256,'Alpha3 mapping was checked against another alpha1 mapping');
  const modelSource=JSON.parse(modelRef.bytes),source=modelSource.identity;
  assert.equal(restrainedMapping?.schema,'reversal-coarse-mapping-v1');
  assert.equal(restrainedMapping.readyForCandidateExperiment,true,'Pinned mapping is not candidate-ready');
  assert.equal(mappingDocument.inputs?.graph,spec.graph.sha256,'Mapping was built for another graph');
  assert.equal(mappingDocument.inputs?.annotations,annotationHash,'Mapping uses another annotation revision');
  assert.equal(source?.mappingHash,digest(restrainedMapping),'Model source uses another mapping');
  const mapping=combineAlphaLobeMapping(restrainedMapping,alphaDocument.mapping,alphaThreeDocument.mapping);
  const readouts={...source.readouts,MBON07:alphaDocument.mapping.readouts.MBON07,MBON14:alphaThreeDocument.mapping.readouts.MBON14};
  assert(Object.values(source.inputs??{}).includes(spec.graph.sha256),'Model source does not pin this graph');
  assert(Object.values(source.inputs??{}).includes(annotationHash),'Model source does not pin these annotations');
  assert(source.model&&spec.model&&typeof spec.model==='object','Require explicit fresh model configuration');
  for(const [key,value] of Object.entries(spec.model))
    if(key!=='seed')assert.equal(value,source.model[key],`Model configuration differs from pinned source: ${key}`);
  assert.deepEqual(Object.keys(source.readouts??{}).sort(),['MBON01','MBON12']);
  for(const cells of Object.values(readouts)){
    assert(Array.isArray(cells)&&cells.length>0);
    for(const cell of cells)assert.equal(ids[cell.index]?.toString(),cell.rootId,'Readout root identity mismatch');
  }
  for(const group of mapping.groups){
    assert(['PAM02','PPL103','PAM11','PPL106'].includes(group.danType));
    for(const cell of group.dan)assert.equal(ids[cell.index]?.toString(),cell.rootId,'Teaching-cell root identity mismatch');
  }
  assert(mapping.groups.some(group=>group.danType==='PAM02')
    &&mapping.groups.some(group=>group.danType==='PPL103'),'Both registered valence channels are required');

  const model=new SparseTrainer(graph,{...spec.model,seed});
  const memory=new AlphaLobeMemory(model,mapping,spec.memory);
  const invariant=fixedStateHash(model,memory.edges);
  model.forward([0]);
  const rest=Float32Array.from(model.h[model.steps]);
  // The model seed only touches an input projection that receives zero, so the
  // replica seed must also select the public-cue projection to make replicas differ.
  const {schema:encoderSchema,...encoderConfig}=spec.encoder??{};
  assert.equal(encoderSchema,'public-action-relative-cue-v4','Factory v5 requires the v4 action-relative cue');
  const encoder=createPublicActionRelativeEncoderV4(mapping,{...encoderConfig,seed});
  const brain=new CoupledStockfishBrainV5({model,memory,mapping,encoder,readouts,rest,fixedModelIdentity:invariant,
    maxPresentations:spec.maxPresentations, maxLegalMoves:spec.maxLegalMoves,
    priorScale:spec.priorScale,current:spec.current,guard,pace});
  const identity=digest({schema:'lichess-stage1-brain-runtime-v5',replica,seed,graphSha256:spec.graph.sha256,
    mappingSha256:spec.mapping.sha256,alphaOneMappingSha256:spec.alphaOneMapping.sha256,alphaThreeMappingSha256:spec.alphaThreeMapping.sha256,modelSourceSha256:spec.modelSource.sha256,
    model:model.config,memory:memory.config,memoryIdentity:memory.identity,
    encoderIdentity:encoder.identity,valueIdentity:brain.valueIdentity,feedbackIdentity:brain.coupledIdentity,readouts,invariant});
  return {graph,ids,model,memory,mapping,readouts,rest,encoder,brain,invariant,identity};
}

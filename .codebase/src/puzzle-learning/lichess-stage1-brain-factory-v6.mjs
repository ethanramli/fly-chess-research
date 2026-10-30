// Stage 1 learner factory v6 (2026-10-27, researcher option A): factory v5 (alpha1 reward and
// alpha3 aversive stores, CoupledStockfishBrainV5) with public-attack-map-cue-v1 in place of
// cue v4. Factory v5 is pinned by r11 runs and only accepts cue v4, so v6 builds the v5 learner
// with that cue (the same graph, memory, rest state and readouts) and then replaces its encoder
// and brain; nothing has presented a stimulus or changed memory before the replacement.
import assert from 'node:assert/strict';
import {createLichessStage1BrainV5} from './lichess-stage1-brain-factory-v5.mjs';
import {CoupledStockfishBrainV5} from './coupled-stockfish-brain-v5.mjs';
import {createPublicAttackMapEncoderV1} from '../chess-input/public-attack-map-cue-v1.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';

export function createLichessStage1BrainV6({registration,replica,repositoryRoot,guard=()=>{},pace=async()=>{}}){
  const spec=registration?.learner,{schema:encoderSchema,...encoderConfig}=spec?.encoder??{};
  assert.equal(encoderSchema,'public-attack-map-cue-v1','Factory v6 requires the attack-map cue');
  const base=createLichessStage1BrainV5({registration:{...registration,learner:{...spec,
    encoder:{schema:'public-action-relative-cue-v4',taskFamily:encoderConfig.taskFamily??'capture-retention'}}},replica,repositoryRoot,guard,pace});
  assert.equal(base.brain.presentations,0);
  const {model,memory,mapping,readouts,rest,invariant}=base,seed=spec.replicaSeeds[replica];
  const encoder=createPublicAttackMapEncoderV1(mapping,{...encoderConfig,seed});
  const brain=new CoupledStockfishBrainV5({model,memory,mapping,encoder,readouts,rest,fixedModelIdentity:invariant,
    maxPresentations:spec.maxPresentations,maxLegalMoves:spec.maxLegalMoves,
    priorScale:spec.priorScale,current:spec.current,guard,pace});
  const identity=digest({schema:'lichess-stage1-brain-runtime-v6',replica,seed,graphSha256:spec.graph.sha256,
    mappingSha256:spec.mapping.sha256,alphaOneMappingSha256:spec.alphaOneMapping.sha256,alphaThreeMappingSha256:spec.alphaThreeMapping.sha256,modelSourceSha256:spec.modelSource.sha256,
    model:model.config,memory:memory.config,memoryIdentity:memory.identity,
    encoderIdentity:encoder.identity,valueIdentity:brain.valueIdentity,feedbackIdentity:brain.coupledIdentity,readouts,invariant});
  return {...base,encoder,brain,identity};
}

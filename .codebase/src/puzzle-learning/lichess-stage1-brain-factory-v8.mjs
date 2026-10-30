// Stage 1 learner factory v8 (2026-10-28, researcher decision at stop S2): factory v7 (outcome-only
// receiver, alpha-lobe stores) with public-attack-map-cue-v2 in place of cue v1. Factory v7 is pinned
// by smoke r13, so v8 builds the v7 learner with cue v1 and then replaces its encoder and brain;
// nothing has presented a stimulus or changed memory before the replacement.
import assert from 'node:assert/strict';
import {createLichessStage1BrainV7} from './lichess-stage1-brain-factory-v7.mjs';
import {CoupledOutcomeOnlyBrain} from './coupled-outcome-only-brain.mjs';
import {createPublicAttackMapEncoderV2} from '../chess-input/public-attack-map-cue-v2.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';

export function createLichessStage1BrainV8({registration,replica,repositoryRoot,guard=()=>{},pace=async()=>{}}){
  const spec=registration?.learner,{schema:encoderSchema,...encoderConfig}=spec?.encoder??{};
  assert.equal(encoderSchema,'public-attack-map-cue-v2','Factory v8 requires attack-map cue v2');
  const base=createLichessStage1BrainV7({registration:{...registration,learner:{...spec,
    encoder:{...spec.encoder,schema:'public-attack-map-cue-v1'}}},replica,repositoryRoot,guard,pace});
  assert.equal(base.brain.presentations,0);
  const {model,memory,mapping,readouts,rest,invariant}=base;
  const encoder=createPublicAttackMapEncoderV2(mapping,{...encoderConfig,seed:spec.replicaSeeds[replica]});
  const brain=new CoupledOutcomeOnlyBrain({model,memory,mapping,encoder,readouts,rest,fixedModelIdentity:invariant,
    maxPresentations:spec.maxPresentations,maxLegalMoves:spec.maxLegalMoves,
    priorScale:spec.priorScale,current:spec.current,guard,pace});
  const identity=digest({schema:'lichess-stage1-brain-runtime-v8',base:base.identity,encoderIdentity:encoder.identity,feedbackIdentity:brain.coupledIdentity});
  return {...base,encoder,brain,identity};
}

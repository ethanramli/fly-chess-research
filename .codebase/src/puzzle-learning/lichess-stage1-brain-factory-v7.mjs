// Stage 1 learner factory v7 (2026-10-27): factory v6 (attack-map cue, alpha-lobe stores) with the
// outcome-only coupled receiver in place of CoupledStockfishBrainV5 (Stockfish teaching set aside).
// Factory v6 is pinned by probe v8, so v7 builds the v6 learner and replaces only its brain; nothing
// has presented a stimulus or changed memory before the replacement.
import assert from 'node:assert/strict';
import {createLichessStage1BrainV6} from './lichess-stage1-brain-factory-v6.mjs';
import {CoupledOutcomeOnlyBrain,OUTCOME_ONLY_PROTOCOL} from './coupled-outcome-only-brain.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';

export function createLichessStage1BrainV7({registration,replica,repositoryRoot,guard=()=>{},pace=async()=>{}}){
  assert.equal(registration?.feedbackProtocol,OUTCOME_ONLY_PROTOCOL,'Factory v7 is the outcome-only learner');
  const base=createLichessStage1BrainV6({registration,replica,repositoryRoot,guard,pace}),spec=registration.learner;
  assert.equal(base.brain.presentations,0);
  const {model,memory,mapping,encoder,readouts,rest,invariant}=base;
  const brain=new CoupledOutcomeOnlyBrain({model,memory,mapping,encoder,readouts,rest,fixedModelIdentity:invariant,
    maxPresentations:spec.maxPresentations,maxLegalMoves:spec.maxLegalMoves,
    priorScale:spec.priorScale,current:spec.current,guard,pace});
  const identity=digest({schema:'lichess-stage1-brain-runtime-v7',base:base.identity,feedbackIdentity:brain.coupledIdentity});
  return {...base,brain,identity};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {SparseTrainer} from '../../../../.codebase/src/supervised-baselines/trainer.mjs';
import {SparseTrainer as Candidate} from '../../../../.codebase/src/supervised-baselines/trainer-reuse-candidate.mjs';
import {NeuralEpisode} from '../../../../.codebase/src/neural-learning/neural-episode.mjs';
import {NeuralEpisode as CandidateEpisode} from './candidate-episode.mjs';

test('recovery uses the candidate trainer and explicit frame adapter', () => {
  assert.equal(SparseTrainer, Candidate); assert.equal(NeuralEpisode, CandidateEpisode);
});
const loader = new URL('./candidate-test-loader.mjs', import.meta.url).href;
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --loader=${loader}`.trim();
await import('../../../../.codebase/tests/runtime/checkpoint-resume-fixture.test.mjs');

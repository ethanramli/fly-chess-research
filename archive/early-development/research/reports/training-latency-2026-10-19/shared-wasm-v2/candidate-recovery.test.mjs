// Exercise the existing recovery fixture with the candidate in both processes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {SparseTrainer} from '../../../../.codebase/src/supervised-baselines/trainer.mjs';
import {SparseTrainer as Candidate} from './candidate-trainer.mjs';

test('test loader resolves the original trainer to the staged candidate', () => {
  assert.equal(SparseTrainer, Candidate);
});

// spawnSync in the original fixture inherits NODE_OPTIONS. A file URL is one
// argument even when the Windows workspace path contains spaces.
const loader = new URL('./candidate-test-loader.mjs', import.meta.url).href;
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --loader=${loader}`.trim();
await import('../../../../.codebase/tests/runtime/checkpoint-resume-fixture.test.mjs');

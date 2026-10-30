import {test} from 'node:test';
import assert from 'node:assert/strict';
import {alphaLobeValence,alphaLobeValenceSign} from '../../src/puzzle-learning/alpha-lobe-valence.mjs';

test('alpha-lobe valence is MBON14 minus MBON07', () => {
  assert.equal(alphaLobeValence({MBON07:0.25,MBON14:0.75}), 0.5);
  assert.equal(alphaLobeValenceSign({MBON07:0.25,MBON14:0.75}), 1);
});

test('negative valence gives sign -1', () => {
  assert.equal(alphaLobeValence({MBON07:0.9,MBON14:0.1}), -0.8);
  assert.equal(alphaLobeValenceSign({MBON07:0.9,MBON14:0.1}), -1);
});

test('zero valence gives sign 0 (not -0)', () => {
  assert.equal(alphaLobeValenceSign({MBON07:0.4,MBON14:0.4}), 0);
  assert.ok(Object.is(alphaLobeValenceSign({MBON07:0.4,MBON14:0.4}), 0));
});

test('invalid rows throw', () => {
  assert.throws(() => alphaLobeValence(), /Invalid alpha-lobe valence row/);
  assert.throws(() => alphaLobeValence({MBON07:-0.1,MBON14:0.2}), /Invalid alpha-lobe valence row/);
  assert.throws(() => alphaLobeValence({MBON07:0.1,MBON14:NaN}), /Invalid alpha-lobe valence row/);
  assert.throws(() => alphaLobeValenceSign({MBON07:NaN,MBON14:0}), /Invalid alpha-lobe valence row/);
});

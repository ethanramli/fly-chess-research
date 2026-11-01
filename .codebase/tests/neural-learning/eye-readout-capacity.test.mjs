import test from 'node:test';
import assert from 'node:assert/strict';
import { directContrast, pairBound } from '../../scripts/neural-learning/inspect-eye-readout-capacity.mjs';
const image = i => [{ index: i, current: 1 }];
const keys = ['0/0', '0/1', '0/2', '0/3'], weights = new Map(keys.map(k => [k, 1]));
test('identical cues cannot support opposing margins, while disjoint cues can', () => {
  const original = directContrast(image(0), image(1), weights, keys), reversed = directContrast(image(1), image(0), weights, keys);
  const impossible = pairBound(reversed, original, .1);
  assert(impossible.incompatibleInSurrogate); assert(Math.abs(impossible.upper + .1) < 1e-9);
  const separate = directContrast(image(2), image(3), weights, keys), possible = pairBound(reversed, separate, .2);
  assert(!possible.incompatibleInSurrogate); assert(Math.abs(possible.upper - .4) < 1e-9);
});
test('common-offset sensitivity follows exact relative-response algebra', () => {
  const w = new Map([['0/0', 2], ['0/1', 1]]), c = directContrast(image(0), image(1), w, ['0/0', '0/1']);
  const delta = .3, g = .6, b = .8;
  const margin = .5 * ((b + delta) / c.naiveBad - (g + delta) / c.naiveGood), old = .5 * (b / c.naiveBad - g / c.naiveGood);
  assert(Math.abs(margin - old - delta * c.commonOffsetSensitivity) < 1e-12);
  assert.throws(() => directContrast(image(5), image(1), w, ['0/0', '0/1']));
});

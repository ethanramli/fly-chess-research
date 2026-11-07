import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gainSettings, pairStrength, strengthM, strengthGate, OUTPUT_TYPES } from '../../src/neural-learning/eye-test-v2.mjs';

const TYPES = ['MBON05', 'MBON27', 'MBON09', 'MBON07', 'MBON06'];
const zeros = () => Object.fromEntries(TYPES.map((t) => [t, 0]));

test('gainSettings maps weight signs to reachable gains', () => {
  const { plus, minus } = gainSettings([0.5, -2, 0]);
  assert.deepEqual([...plus], [1, 0.2, 1]);
  assert.deepEqual([...minus], [0.2, 1, 1]);
  for (const v of [...plus, ...minus]) assert.ok(v <= 1);
  assert.throws(() => gainSettings([]), { message: 'Invalid decoder weights' });
  assert.throws(() => gainSettings([NaN]), { message: 'Invalid decoder weights' });
  assert.deepEqual(OUTPUT_TYPES, TYPES);
});

test('pairStrength is zero for equal objects and matches a hand-built case', () => {
  const same = { safePlus: zeros(), unsafePlus: zeros(), safeMinus: zeros(), unsafeMinus: zeros() };
  assert.equal(pairStrength(same), 0);

  // D(MBON05) = 3 via safePlus, D(MBON27) = 4 via safePlus; strength = sqrt(9 + 16) = 5.
  const safePlus = zeros();
  safePlus.MBON05 = 3;
  safePlus.MBON27 = 4;
  assert.equal(pairStrength({ safePlus, unsafePlus: zeros(), safeMinus: zeros(), unsafeMinus: zeros() }), 5);

  const missing = zeros();
  delete missing.MBON06;
  assert.throws(
    () => pairStrength({ safePlus: missing, unsafePlus: zeros(), safeMinus: zeros(), unsafeMinus: zeros() }),
    { message: 'Missing or invalid output activity' },
  );

  const withNaN = zeros();
  withNaN.MBON07 = NaN;
  assert.throws(
    () => pairStrength({ safePlus: withNaN, unsafePlus: zeros(), safeMinus: zeros(), unsafeMinus: zeros() }),
    { message: 'Missing or invalid output activity' },
  );
});

test('strengthM averages within games first, then across games', () => {
  const act = (safeMinusMBON05) => {
    const safeMinus = zeros();
    safeMinus.MBON05 = safeMinusMBON05;
    return { safePlus: zeros(), unsafePlus: zeros(), safeMinus, unsafeMinus: zeros() };
  };
  // Strengths: game A -> 1 and 3 (mean 2); game B -> 5. M = (2 + 5) / 2 = 3.5.
  const pairs = [
    { game: 'A', activity: act(1) },
    { game: 'A', activity: act(3) },
    { game: 'B', activity: act(5) },
  ];
  assert.equal(strengthM(pairs), 3.5);
  assert.throws(() => strengthM([]), { message: 'No pairs' });
});

test('strengthGate applies the 10% rule and reports failed measurements', () => {
  assert.deepEqual(strengthGate(1, 10), { pass: true, ratio: 0.1, reason: null });
  assert.equal(strengthGate(0.99, 10).pass, false);
  assert.deepEqual(strengthGate(1, 0), { pass: false, ratio: null, reason: 'failed measurement' });
  assert.deepEqual(strengthGate(NaN, 1), { pass: false, ratio: null, reason: 'failed measurement' });
});

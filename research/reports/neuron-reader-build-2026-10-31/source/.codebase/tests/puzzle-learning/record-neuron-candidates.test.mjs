import test from 'node:test';
import assert from 'node:assert/strict';
import { recordEyesCandidates } from '../../src/puzzle-learning/record-neuron-candidates.mjs';
import { fixture, collect, hash } from '../neural-learning/neuron-reader-fixture.mjs';

const options = f => ({ ...f, persistentState: () => f.memory, moves: ['e2e4', 'd2d4'],
  guard: () => {}, pace: async () => {} });

test('Eyes → actual rate-model inference → copied endpoint receipts; memory and history stay unchanged', async () => {
  const f = fixture(), before = structuredClone(f.memory), history = f.board.pgn(), config = hash(f.model.params);
  f.model.h[0].fill(7);
  f.model.params.head.fill(5000); // Predictions are irrelevant to endpoint measurement.
  const parameters = hash(f.model.params);
  const first = await collect(recordEyesCandidates(options(f)));
  assert.equal(first.length, 3); assert.equal(first[2].schema, 'neuron-reader-candidate-set-complete-v1');
  assert.equal(first[2].candidates, 2); assert.equal(first[0].observation.scope, 'synthetic');
  assert.equal('score' in first[0], false); assert.equal('score' in first[0].observation, false);
  assert.notDeepEqual(first[0].observation.cells, first[1].observation.cells);
  assert.deepEqual(f.memory, before); assert.equal(f.board.pgn(), history);
  assert.equal(hash(f.model.params), parameters); assert.notEqual(config, parameters);
  const second = await collect(recordEyesCandidates({ ...options(f), moves: ['d2d4', 'e2e4'] }));
  for (const receipt of first.slice(0, 2)) {
    const repeated = second.find(row => row.action === receipt.action);
    assert.deepEqual(repeated.observation, receipt.observation);
    assert.equal(repeated.setIdentity, receipt.setIdentity);
  }
  f.model.h[f.model.steps].fill(0);
  assert(first[0].observation.cells.some(cell => cell.activity > 0));
});

test('any change in gains, traces, slow state, clocks, pending receipts or neural parameters invalidates the set', async () => {
  const mutations = [
    f => f.memory.gains[0] += 0.1,
    f => f.memory.traces[0] += 0.1,
    f => f.memory.slow[0] += 0.1,
    f => f.memory.clock++,
    f => f.memory.pendingReceipt.acknowledged = true,
    f => f.model.params.bias[0] += 0.1,
    f => f.model.signedMagnitude[0] += 0.1,
    f => f.model.grads.bias[0] += 0.1,
    f => f.model.saturation = 8,
    f => f.model.steps = 4,
  ];
  for (const mutate of mutations) {
    const f = fixture(), forward = f.model.forward.bind(f.model);
    f.model.forward = (...args) => { forward(...args); mutate(f); };
    await assert.rejects(() => collect(recordEyesCandidates(options(f))), /changed persistent state/);
  }
});

test('a failure after one receipt cannot publish a completion record or silently restore memory', async () => {
  const f = fixture(), forward = f.model.forward.bind(f.model); let calls = 0;
  f.model.forward = (...args) => { forward(...args); if (++calls === 2) f.memory.clock++; };
  const rows = [];
  await assert.rejects(async () => { for await (const row of recordEyesCandidates(options(f))) rows.push(row); }, /candidate set invalid/);
  assert.equal(rows.length, 1); assert.equal(rows[0].schema, 'neuron-reader-candidate-v1');
  assert.equal(f.memory.clock, 8);
});

test('illegal/duplicate candidates, changed wiring/config, missing guards and incomplete memory identities are rejected', async () => {
  for (const change of [
    o => o.moves = ['e2e5'],
    o => o.moves = ['e2e4', 'e2e4'],
    o => o.model.graph.sign[0] = -1,
    o => o.manifest.config.steps++,
    o => o.guard = undefined,
    o => o.pace = undefined,
    o => o.persistentState = () => ({ identity: hash('different mechanism') }),
  ]) {
    const o = options(fixture()); change(o);
    await assert.rejects(() => collect(recordEyesCandidates(o)));
  }
});

test('mutations by pacing, caller or a failed encoder are detected before further receipts', async () => {
  const paced = fixture();
  await assert.rejects(() => collect(recordEyesCandidates({ ...options(paced), pace: async () => paced.memory.clock++ })), /changed persistent state/);
  const f = fixture(), iterator = recordEyesCandidates(options(f));
  await iterator.next(); f.memory.traces[0]++;
  await assert.rejects(() => iterator.next(), /changed persistent state/);
  const b = fixture();
  const eyes = { identity: b.eyes.identity, encode: () => { b.board.move('e4'); throw Error('encoder failed'); } };
  await assert.rejects(() => collect(recordEyesCandidates({ ...options(b), eyes })), /changed persistent state/);
});

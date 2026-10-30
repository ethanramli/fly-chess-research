import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { RateTimingMemory } from '../../src/neural-learning/rate-timing-memory.mjs';
import { MappedPuzzleBrain } from '../../src/puzzle-learning/mapped-puzzle-brain.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';

function fixture(maxPresentations = 64) {
  // Numerical four-cell fixture; these are not anatomical neuron identities.
  const graph = { row: Int32Array.from([0, 0, 0, 0, 2]), col: Int32Array.from([0, 1]),
    sign: Int8Array.from([1, 1]), initial: Float32Array.from([1, 1]),
    input: Int32Array.from([0]), output: Int32Array.from([3]) };
  const model = new SparseTrainer(graph, { inputDim: 1, outputs: 1 });
  const mapping = { groups: [{ edges: [0, 1], kc: [0, 1], danType: 'PPL103', dan: [{ index: 2 }] }] };
  const memory = new ReversalMemory(model, mapping);
  model.forward([0]); const rest = Float32Array.from(model.h[model.steps]);
  const encoder = { encode: () => ({ stimulation: [{ index: 0, current: 1.5 }] }) };
  const readouts = { MBON12: [{ index: 3 }], MBON01: [{ index: 1 }] };
  const brain = new MappedPuzzleBrain({ model, memory, mapping, encoder, readouts, rest, maxPresentations });
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const task = { objective: 'forced-mate', plies: 1 };
  function experience(move = 'f7f6') {
    const successor = new Chess(board.fen()); successor.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
    const proof = certifyMate(successor, 'w', { plies: 0 });
    return { ...verifiedExperience(board, move, task, proof), proof,
      context: { fen: board.fen(), pgn: board.pgn(), task } };
  }
  return { brain, memory, model, board, task, experience };
}

test('mapped assessment records an unresolved top-score tie instead of inventing a move choice', async () => {
  const { brain, board, task } = fixture();
  const legal = board.moves({ verbose: true });
  const assessment = await brain.assess(board, legal, task);
  assert.equal(assessment.choice, null);
  assert.equal(assessment.tiedTopMoves.length, legal.length);
  assert.deepEqual(assessment.tiedTopMoves, legal.map(move => move.from + move.to + (move.promotion ?? '')).sort());
});

test('mapped replay changes only permitted local efficacy, then restored memory reproduces the next event', async () => {
  const a = fixture(), invariant = fixedStateHash(a.model, a.memory.edges), before = a.memory.snapshot();
  const receipt = await a.brain.replay(a.experience());
  assert.equal(receipt.event.status, 'failure'); assert.equal(receipt.event.actor, 'w');
  assert.equal(receipt.event.delivered, true); assert.equal(receipt.learningApplied, true);
  assert.equal(receipt.appliedToNeurons, true); assert.equal(a.memory.events, 1);
  assert.notDeepEqual(a.memory.snapshot().gains, before.gains);
  assert.equal(fixedStateHash(a.model, a.memory.edges), invariant);
  const b = fixture(); b.memory.restore(a.memory.snapshot());
  const nextA = await a.brain.replay(a.experience()), nextB = await b.brain.replay(b.experience());
  assert.deepEqual(nextA, nextB);
});

test('mapped Lichess replay sends the complete neural frame to RateTimingMemory', async () => {
  const a = fixture();
  const mapping = { schema: 'gamma2-rate-timing-map-v1', groups: [{
    side: 'left', mbonType: 'MBON12', danType: 'PPL103',
    dan: [{ index: 2 }], edges: [0], kc: [0], kcTypes: ['KCg-test'],
  }] };
  const memory = new RateTimingMemory(a.model, mapping, a.brain.rest, {
    eta: 0.25, minGain: 0.2, maxGain: 1.8, activityScale: 1.5,
    tauKC: 1, tauShort: 1, tauLong: 3, stepDuration: 0.1,
    referenceMode: 'fixed-unstimulated-model',
  });
  const brain = new MappedPuzzleBrain({ model: a.model, memory, mapping,
    encoder: a.brain.encoder, readouts: a.brain.readouts, rest: a.brain.rest });
  assert.throws(() => brain.observeMemory(['PAM02']), /does not map the required teaching channel/);
  const receipt = await brain.replay(a.experience());
  assert.equal(memory.events, 1);
  assert.equal(receipt.update.events, 1);
  assert.equal(receipt.appliedToNeurons, true);
});

test('assessment freezes learning; disabled and absent controls preserve their explicit semantics', async () => {
  const a = fixture(), before = a.memory.snapshot();
  const assessment = await a.brain.evaluate(a.board, a.board.moves({ verbose: true }), a.task);
  assert.deepEqual(a.memory.snapshot(), before); assert.equal(assessment.value, 0);
  assert.ok(Math.abs(assessment.priors.reduce((x, y) => x + y, 0) - 1) < 1e-12);
  const disabled = await a.brain.replay(a.experience(), { plasticityEnabled: false });
  assert.deepEqual(a.memory.snapshot(), before); assert.equal(disabled.event.delivered, true);
  assert.equal(disabled.learningApplied, false);
  const absent = await a.brain.replay(a.experience(), { pulse: false });
  assert.equal(absent.event.delivered, false);
  // Absence means no external pulse, not forced suppression of endogenous DAN.
  assert.equal(a.memory.events, 1);
});

test('unknown, altered proof/context and missing reinforcement maps cannot cause a neural teaching event', async () => {
  const a = fixture(), before = a.memory.snapshot();
  const unknown = { status: 'unknown', learningAllowed: false, experimentalPulse: null };
  assert.equal((await a.brain.replay(unknown)).skipped, true);
  await assert.rejects(a.brain.replay(unknown, { pulse: true }), /Unknown/);
  for (const mutate of [e => { e.learningAllowed = false; }, e => { e.actor = 'b'; }, e => { e.context.fen = new Chess().fen(); },
    e => { e.proof.certificate.tree.status = 'success'; }]) {
    const e = a.experience(); mutate(e); await assert.rejects(a.brain.replay(e));
  }
  assert.equal(a.brain.presentations, 0); assert.deepEqual(a.memory.snapshot(), before);
  a.brain.mapping.groups[0].danType = 'unmapped';
  await assert.rejects(a.brain.replay(a.experience()), /Missing identified/);
  assert.equal(a.brain.presentations, 0);
});

test('presentation budget stops before another model call or persistent update', async () => {
  const a = fixture(1); await a.brain.replay(a.experience()); const before = a.memory.snapshot();
  await assert.rejects(a.brain.replay(a.experience()), /budget exhausted/);
  assert.equal(a.brain.presentations, 1); assert.deepEqual(a.memory.snapshot(), before);
});

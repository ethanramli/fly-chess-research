import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { validateGraph } from '../../src/runtime/graph.mjs';
import { mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';
import { createFlyCondition } from '../../src/neural-learning/fly-connections-condition-v1.mjs';
import { buildBoardRecord } from '../../src/neural-learning/fly-connections-packet-v1.mjs';

// Toy network only: 11 neurons, not a claimed chess result. Synthetic eyes are a fixture encoder.
const N = 11, STEPS = 4, KC = [0, 1, 2], APL = [7, 8], DAN = [5, 6], OUT = 10;
const KC_BIAS = 1, DAN_BIAS = 0.5;
// Receiving-side MBON05 cells: node 3 (soma left) receives right, node 4 (soma right) receives left.
const NODES = [
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'right' },        // 0 gamma KC, receives right
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'left' },         // 1 gamma KC, receives left
  { type: "KCa'b'-ap1", cls: 'Kenyon_Cell', side: 'right' },   // 2 non-gamma KC, APL cohort only
  { type: 'MBON05', cls: 'MBON', side: 'left' },               // 3
  { type: 'MBON05', cls: 'MBON', side: 'right' },              // 4
  { type: 'PAM07', cls: 'DAN', side: 'right' },                // 5
  { type: 'PAM07', cls: 'DAN', side: 'left' },                 // 6
];
const BASE = 720575940621164720n;
const rootOf = i => BASE + BigInt(i + 1);

const EYES = {
  identity: 'synthetic-condition-test-eyes-v1',
  encode(fen, action) {
    const digest = createHash('sha256').update(`${fen} ${action}`).digest();
    return { schema: 'synthetic-test-eyes-v1', identity: EYES.identity, action,
      stimulation: KC.map(k => ({ index: k, current: 0.2 + digest[k] / 512 })) };
  },
};

function graphFixture() {
  const edges = [];
  const add = (pre, post, sign) => edges.push({ pre, post, sign, initial: 1 + ((pre * 7 + post * 3) % 4) });
  for (const k of KC) for (const a of APL) { add(k, a, 1); add(a, k, -1); }
  for (const a of APL) add(a, OUT, -1);
  add(0, 3, 1); add(1, 4, 1);
  edges.sort((a, b) => a.post - b.post || a.pre - b.pre);
  const row = new Int32Array(N + 1);
  for (const e of edges) row[e.post + 1]++;
  for (let j = 0; j < N; j++) row[j + 1] += row[j];
  return validateGraph({ row, col: Int32Array.from(edges, e => e.pre), sign: Int8Array.from(edges, e => e.sign),
    initial: Float32Array.from(edges, e => e.initial), input: Int32Array.from([9]), output: Int32Array.from([OUT]) });
}

// Synthetic APL package in the loaded fly-apl-sites-v1 shape: every KC contacts both APLs both ways.
function aplPackage(g) {
  const edgeOf = (pre, post) => {
    for (let k = g.row[post]; k < g.row[post + 1]; k++) if (g.col[k] === pre) return k;
    throw Error(`missing edge ${pre}->${post}`);
  };
  const apl = (index, rootId, offset) => ({
    rootId, index, parent: [-1, 0, 0], lengthNm: [0, 1000, 2000],
    inputSite: KC.map(k => (k + offset) % 3), inputKC: [...KC], inputEdge: KC.map(k => edgeOf(k, index)),
    outputSite: KC.map(k => (k + 2 * offset) % 3), outputKC: [...KC], outputEdge: KC.map(k => edgeOf(index, k)),
  });
  return { schema: 'fly-apl-sites-v1', identity: 'ab'.repeat(32), kcIndices: [...KC],
    apls: [apl(APL[0], 'apl-right-fixture', 0), apl(APL[1], 'apl-left-fixture', 1)] };
}

const annotationRows = () => NODES.map((node, i) => `${rootOf(i)}\t${node.type}\t${node.cls}\t${node.side}`);
const ROOTS = BigInt64Array.from({ length: N }, (_, i) => rootOf(i)); // every graph node, annotated or not
const READERS = [
  { type: 'MBON05', index: 3, rootId: String(rootOf(3)), receivingSide: 'right' },
  { type: 'MBON05', index: 4, rootId: String(rootOf(4)), receivingSide: 'left' },
];
const MAPPING = await (async () => {
  const folder = mkdtempSync(join(tmpdir(), 'fly-condition-'));
  try {
    const annotationPath = join(folder, 'annotation.tsv');
    writeFileSync(annotationPath, ['root_id\themibrain_type\tcell_class\tside', ...annotationRows()].join('\n') + '\n');
    return await mapFlyConnectionsMemory(graphFixture(), ROOTS, annotationPath, READERS);
  } finally { rmSync(folder, { recursive: true, force: true }); }
})();
const MASK = new Set(MAPPING.groups.flatMap(g => g.edges));

function world(arm, { dan = DAN_BIAS, guard, eyes = EYES } = {}) {
  const graph = graphFixture();
  const model = new SparseTrainer(graph, { steps: STEPS, inputDim: 1, outputs: 1, seed: 11, precision: 'float32' });
  const bias = new Float32Array(N);
  for (const k of KC) bias[k] = KC_BIAS;
  for (const d of DAN) bias[d] = dan;
  model.params.bias.set(bias);
  const condition = createFlyCondition({ model, mapping: MAPPING, eyes, aplPackage: aplPackage(graph), arm, guard });
  return { graph, model, condition };
}

const move = uci => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
// Standard-start game with a real PGN; the row is a prefix of that game.
function recordAt(gameId, moves, ply) {
  const game = new Chess();
  game.setHeader('Event', 'synthetic condition fixture');
  game.setHeader('GameId', gameId);
  for (const uci of moves) game.move(move(uci));
  const board = new Chess();
  for (const uci of moves.slice(0, ply)) board.move(move(uci));
  return buildBoardRecord({ gameId, ply, fen: board.fen(), history: moves.slice(0, ply) },
    { group: 'R', pgn: game.pgn(), eyes: EYES });
}

// After 1.e4 e5 White is to move; the king checks below use the legal list, so the fixture's turn is not assumed.
const RECORD = recordAt('g1', ['e2e4', 'e7e5', 'g1f3', 'b8c6'], 2);
// R1: rTargets[0] is the positive contingency; rTargets[1] is the omitted one. R2 exchanges them.
// Tape-shaped event as buildExperienceTape emits it: proofSha is the sealed membership certificate hash.
function experience(record, i, { pulse, phase = 'R1', sequence = 0 }) {
  const move = record.rTargets[i];
  return { sequence, eventId: `${record.boardId}#${sequence}`, phase, group: 'R', boardId: record.boardId,
    move, pulse, criterion: record.criterion, proofSha: record.proofs[move].certificateSha256 };
}

test('ranking covers every legal action, king and quiet included, in UCI order', () => {
  const { condition } = world('informative-local');
  const ranking = condition.rankBoard(RECORD, { phase: 'R1' });
  const verbose = new Chess(RECORD.fen).moves({ verbose: true });
  const legal = verbose.map(m => m.from + m.to + (m.promotion ?? ''));
  const kings = verbose.filter(m => m.piece === 'k').map(m => m.from + m.to);
  assert.deepEqual(ranking.ranked.map(e => e.move), [...legal].sort());
  assert.ok(kings.length > 0, `king actions exist; legal ${legal.join(' ')}`);
  for (const k of kings) assert.ok(ranking.ranked.some(e => e.move === k), `king action ${k} is scored`);
  assert.ok(ranking.ranked.every(e => Number.isFinite(e.score)));
  assert.equal(ranking.passes, legal.length);
});

test('reverse-order check agrees exactly and counts both passes; guard wraps every forward', () => {
  let calls = 0;
  const { condition } = world('informative-local', { guard: () => { calls++; } });
  const plain = condition.rankBoard(RECORD, { phase: 'R1' });
  const checked = condition.rankBoard(RECORD, { phase: 'R1', checkOrder: true });
  assert.deepEqual(checked.ranked, plain.ranked);
  assert.equal(checked.passes, 2 * plain.passes);
  assert.equal(calls, 2 * (plain.passes + checked.passes)); // before and after each forward
});

test('observation changes no persistent state', () => {
  const { condition } = world('informative-local');
  const fingerprint = condition.fingerprint(), snapshot = condition.snapshot();
  condition.rankBoard(RECORD, { phase: 'R1', checkOrder: true });
  assert.equal(condition.fingerprint(), fingerprint);
  assert.deepEqual(condition.snapshot(), snapshot);
});

test('a scheduled pulse adds current to the mapped PAM07 cells; omission and absent add none', () => {
  const pulsed = world('informative-local').condition.teach(RECORD, experience(RECORD, 0, { pulse: true })).receipt;
  const absent = world('absent-local').condition.teach(RECORD, experience(RECORD, 0, { pulse: true })).receipt;
  const omitted = world('informative-local').condition.teach(RECORD, experience(RECORD, 1, { pulse: false })).receipt;
  const omittedAbsent = world('absent-local').condition.teach(RECORD, experience(RECORD, 1, { pulse: false })).receipt;
  assert.equal(pulsed.deliveredPulse, true);
  assert.equal(pulsed.pulseCurrent, 0.75);
  assert.deepEqual([...pulsed.pulseCells].sort((a, b) => a - b), DAN); // group order is left, right
  assert.equal(absent.deliveredPulse, false);
  // Same state and cue before the update: DAN rates rise only when the current is delivered.
  pulsed.teaching.forEach((g, i) => assert.ok(g.dan[0] > absent.teaching[i].dan[0], `group ${g.side}`));
  assert.deepEqual(omitted.teaching, omittedAbsent.teaching);
});

test('shuffled uses the scheduled boolean and rejects inconsistent explicit pulses', () => {
  const e = experience(RECORD, 0, { pulse: true });
  assert.equal(world('shuffled-local').condition.teach(RECORD, e, { deliveredPulse: false }).receipt.deliveredPulse, false);
  assert.throws(() => world('shuffled-local').condition.teach(RECORD, e), /deliveredPulse/);
  assert.throws(() => world('informative-local').condition.teach(RECORD, e, { deliveredPulse: false }), /contradicts/);
  assert.throws(() => world('absent-local').condition.teach(RECORD, e, { deliveredPulse: true }), /no external pulse/);
});

test('off holds all persistent memory fixed; absent still applies endogenous DAN updates', () => {
  const e = experience(RECORD, 0, { pulse: true });
  const off = world('off-local').condition;
  const offBefore = off.fingerprint();
  const offResult = off.teach(RECORD, e).receipt;
  assert.equal(off.fingerprint(), offBefore);
  assert.equal(offResult.update.observed, false);
  assert.deepEqual(offResult.writes, []);
  const informativeResult = world('informative-local').condition.teach(RECORD, e).receipt;
  assert.deepEqual(offResult.teaching, informativeResult.teaching); // same neural inputs, no update
  const absentResult = world('absent-local').condition.teach(RECORD, e).receipt;
  assert.equal(absentResult.update.observed, true);
  assert.ok(absentResult.update.changedEdges > 0);
  assert.ok(absentResult.update.factors.every(f => f < 0), 'endogenous DAN activity gives a negative factor');
});

test('a source-unstable DAN step is rejected before any persistent mutation', () => {
  const { condition } = world('informative-local', { dan: 20 });
  const fingerprint = condition.fingerprint(), snapshot = condition.snapshot();
  assert.throws(() => condition.teach(RECORD, experience(RECORD, 0, { pulse: true })), /Unstable candidate Euler step/);
  assert.equal(condition.fingerprint(), fingerprint);
  assert.deepEqual(condition.snapshot(), snapshot);
});

test('tampered inputs, encoder, proof, history and pulse fail before any feedback', () => {
  const { condition } = world('informative-local');
  const fingerprint = condition.fingerprint();
  const e = experience(RECORD, 0, { pulse: true });
  const tamperedHash = structuredClone(RECORD);
  tamperedHash.inputHashes[e.move] = '0'.repeat(64);
  assert.throws(() => condition.teach(tamperedHash, e), /Input hash differs/);
  const tamperedHistory = structuredClone(RECORD);
  tamperedHistory.history = tamperedHistory.history.slice().reverse();
  assert.throws(() => condition.teach(tamperedHistory, e));
  assert.throws(() => world('informative-local', { eyes: { ...EYES, identity: 'other-eyes' } }).condition.teach(RECORD, e), /Eyes identity/);
  assert.throws(() => condition.teach(RECORD, { ...e, proofSha: '0'.repeat(64) }), /not bound/);
  assert.throws(() => condition.teach(RECORD, { ...e, pulse: false }), /contradicts/);
  assert.throws(() => condition.teach(RECORD, { ...e, phase: 'A' }), /does not match/);
  assert.equal(condition.fingerprint(), fingerprint);
});

test('returned receipts are copies, not views of the neural buffers', () => {
  const { condition } = world('informative-local');
  const { receipt } = condition.teach(RECORD, experience(RECORD, 0, { pulse: true }));
  const fingerprint = condition.fingerprint();
  const before = condition.rankBoard(RECORD, { phase: 'R1' }).ranked;
  receipt.teaching[0].kc[0] = 99;
  receipt.teaching[0].dan[0] = 99;
  receipt.unaided.ranked[0].mbon[0] = 99;
  assert.equal(condition.fingerprint(), fingerprint);
  assert.deepEqual(condition.rankBoard(RECORD, { phase: 'R1' }).ranked, before);
});

test('a taught update changes only mask magnitudes and gains, never other parameters', () => {
  const { model, condition } = world('informative-local');
  const capture = () => ({
    magnitude: Float32Array.from(model.params.magnitude), signed: Float32Array.from(model.signedMagnitude),
    other: Object.fromEntries(Object.entries(model.params).filter(([k]) => k !== 'magnitude').map(([k, v]) => [k, Array.from(v)])),
  });
  const before = capture();
  condition.teach(RECORD, experience(RECORD, 0, { pulse: true }));
  const after = capture();
  assert.deepEqual(after.other, before.other);
  for (let e = 0; e < model.graph.col.length; e++) {
    if (!MASK.has(e)) assert.equal(after.magnitude[e], before.magnitude[e], `non-mask edge ${e}`);
  }
  assert.ok([...MASK].some(e => after.magnitude[e] !== before.magnitude[e]), 'a mask edge changed');
});

test('restored snapshot reproduces the next ranking, receipt and fingerprint', () => {
  const a = world('informative-local').condition, b = world('informative-local').condition;
  a.teach(RECORD, experience(RECORD, 0, { pulse: true }));
  b.restore(JSON.parse(JSON.stringify(a.snapshot())));
  assert.equal(b.fingerprint(), a.fingerprint());
  const next = experience(RECORD, 1, { pulse: true, phase: 'R2', sequence: 1 });
  const ra = a.teach(RECORD, next).receipt, rb = b.teach(RECORD, next).receipt;
  assert.deepEqual(rb.unaided.ranked, ra.unaided.ranked);
  assert.deepEqual(rb.teaching, ra.teaching);
  assert.deepEqual(rb.update, ra.update);
  assert.equal(rb.fingerprintAfter, ra.fingerprintAfter);
});

test('restore rejects other arms, fixed-state edits and corrupt gains without mutation', () => {
  const saved = world('informative-local').condition.snapshot();
  assert.throws(() => world('absent-local').condition.restore(saved), /identity mismatch/);
  const edited = world('informative-local');
  const outside = [...Array(edited.graph.col.length).keys()].find(e => !MASK.has(e));
  edited.model.params.magnitude[outside] *= 2;
  assert.throws(() => edited.condition.restore(saved), /Fixed state/);
  assert.throws(() => edited.condition.rankBoard(RECORD, { phase: 'R1' }), /Fixed state/);
  const corrupt = world('informative-local').condition;
  const fingerprint = corrupt.fingerprint();
  assert.throws(() => corrupt.restore({ ...saved, memory: { ...saved.memory, gains: [0, 1] } }), /Incompatible candidate state/);
  assert.equal(corrupt.fingerprint(), fingerprint);
});

test('construction rejects unsupported inputDim, precision, arm and an incomplete mapping', () => {
  const build = ({ inputDim = 1, precision = 'float32', mapping = MAPPING, arm = 'informative-local' } = {}) => {
    const graph = graphFixture();
    const model = new SparseTrainer(graph, { steps: STEPS, inputDim, outputs: 1, seed: 11, precision });
    return createFlyCondition({ model, mapping, eyes: EYES, aplPackage: aplPackage(graph), arm });
  };
  assert.throws(() => build({ inputDim: 2 }), /inputDim/);
  assert.throws(() => build({ precision: 'float64' }), /precision/);
  assert.throws(() => build({ arm: 'nope' }), /Invalid arm/);
  assert.throws(() => build({ mapping: { ...MAPPING, readyForCandidateExperiment: false } }), /Incomplete or unknown mapping/);
});

test('every supported arm constructs with its APL mode and ranks the full legal set', () => {
  const modes = { 'informative-local': 'local', 'absent-local': 'local', 'off-local': 'local', 'shuffled-local': 'local',
    'informative-matched': 'matched', 'informative-global': 'global' };
  for (const [arm, mode] of Object.entries(modes)) {
    const { condition } = world(arm);
    const ranking = condition.rankBoard(RECORD, { phase: 'R1' });
    assert.equal(ranking.ranked.length, ranking.counts.legal, arm);
    assert.equal(condition.describe().aplMode, mode, arm);
  }
  assert.throws(() => world('bogus'), /Invalid arm/);
});

test('chess ranking rejects R records without a contingency phase; describe reports mask counts', () => {
  const { condition } = world('informative-local');
  assert.throws(() => condition.rankBoard(RECORD), /R records need phase/);
  const described = condition.describe();
  assert.equal(described.maskEdges, MASK.size);
  assert.equal(described.arm, 'informative-local');
  assert.equal(described.learns, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { inputCollisions } from '../../src/chess-input/eyes-v2.mjs';
import * as L from '../../src/neural-learning/engineered-memory-v4-ledger.mjs';

const POSITIONS = new URL('../../../runs/restart-data-2026-11-03/capture-choice-positions-v1/positions.jsonl', import.meta.url);
const positions = readFileSync(POSITIONS, 'utf8').split('\n').filter(Boolean).slice(0, 40).map(line => JSON.parse(line));
const [p0, p1, p2] = positions;
const SEEDS = [6101, 6102, 6103];
// White king e1 can capture the black pawn on d2: a king capture, so scope-unknown.
const KING_FEN = '4k3/8/8/8/8/8/3p4/4K3 w - - 0 1';
const scripted = (...draws) => { let i = 0; return () => draws[i++]; };

test('replayPosition reaches the recorded FEN and the file legal set; a corrupted history throws', () => {
  for (const p of [p0, p1, p2]) {
    const { board, legal } = L.replayPosition(p);
    assert.equal(board.fen(), p.fen);
    assert.deepEqual(legal, p.moves.map(m => m.uci).sort());
  }
  const corrupted = { ...p0, history: p0.history.slice(0, -1) };
  assert.throws(() => L.replayPosition(corrupted), {
    message: `History replay does not reach the recorded FEN at ${L.positionId(p0)}`,
  });
});

test('partialFisherYates matches hand-computed draws', () => {
  // n=4, draw 0.5 gives j=2 and swaps a with c; at i=1 draw 0 gives j=1 (no change). First two: c, b.
  assert.deepEqual(L.partialFisherYates(['a', 'b', 'c', 'd'], 2, scripted(0.5, 0)), ['c', 'b']);
  // Draw 0.99 swaps a with d; draw 0.7 gives j=1+2=3 and swaps b with a; draw 0.1 gives j=2 (no change). First three: d, a, c.
  assert.deepEqual(L.partialFisherYates(['a', 'b', 'c', 'd'], 3, scripted(0.99, 0.7, 0.1)), ['d', 'a', 'c']);
});

test('partialFisherYates is deterministic for a seed, returns distinct elements, m = n is a permutation', () => {
  const list = Array.from({ length: 10 }, (_, i) => i);
  const a = L.partialFisherYates(list, 4, mulberry32(6101));
  assert.deepEqual(L.partialFisherYates(list, 4, mulberry32(6101)), a);
  assert.equal(new Set(a).size, 4);
  assert.deepEqual(L.partialFisherYates(list, 10, mulberry32(6102)).sort((x, y) => x - y), list);
  assert.deepEqual(list, Array.from({ length: 10 }, (_, i) => i));
  assert.throws(() => L.partialFisherYates(list, 11, mulberry32(1)));
  assert.throws(() => L.partialFisherYates(list, -1, mulberry32(1)));
});

test('scheduleFor: deterministic, at most four distinct legal moves, all moves when fewer than four', () => {
  const { legal } = L.replayPosition(p0);
  const id = L.positionId(p0);
  const a = L.scheduleFor(6101, id, legal);
  assert.deepEqual(L.scheduleFor(6101, id, legal), a);
  assert.equal(a.length, Math.min(4, legal.length));
  assert.equal(new Set(a).size, a.length);
  assert.ok(a.every(u => legal.includes(u)));
  const few = ['e2e4', 'd2d4', 'g1f3'];
  assert.deepEqual([...L.scheduleFor(6101, 'g:1', few)].sort(), [...few].sort());
});

test('buildSchedules never reads the moves field', () => {
  const hidden = positions.slice(0, 3).map(p => Object.defineProperty(
    { gameId: p.gameId, ply: p.ply, fen: p.fen, history: p.history },
    'moves', { get() { throw Error('moves read'); } },
  ));
  const plain = positions.slice(0, 3).map(({ gameId, ply, fen, history }) => ({ gameId, ply, fen, history }));
  const built = L.buildSchedules(SEEDS, hidden);
  assert.equal(built.sha256, L.buildSchedules(SEEDS, plain).sha256);
  assert.equal(built.sha256, createHash('sha256').update(JSON.stringify(built.schedules)).digest('hex'));
  assert.deepEqual(Object.keys(built.schedules), SEEDS.map(String));
  assert.equal(built.schedules[6101].length, 3);
});

test('certifyMove covers safe, unsafe, quiet and unknown on file positions, and a king capture is scope-unknown', () => {
  const first = {};
  for (const p of positions) for (const m of p.moves) if (!first[m.outcome]) first[m.outcome] = { p, uci: m.uci };
  const value = { safe: 1, unsafe: -1, quiet: -1, unknown: null };
  for (const outcome of ['safe', 'unsafe', 'quiet', 'unknown']) {
    const { p, uci } = first[outcome];
    const cert = L.certifyMove(L.replayPosition(p).board, uci);
    assert.equal(cert.category, outcome);
    assert.equal(cert.value, value[outcome]);
  }
  assert.equal(L.certifyMove(L.replayPosition(first.safe.p).board, first.safe.uci).status, 'success');
  assert.equal(L.certifyMove(L.replayPosition(first.unsafe.p).board, first.unsafe.uci).status, 'failure');
  assert.deepEqual(L.certifyMove(new Chess(KING_FEN), 'e1d2'), {
    uci: 'e1d2', category: 'unknown', value: null, status: 'scope-unknown', proof: null, certificateSha256: null,
  });
});

test('certifyPositions matches the file categories for the first three positions', () => {
  const map = L.certifyPositions([p0, p1, p2]);
  assert.equal(map.size, 3);
  for (const p of [p0, p1, p2]) {
    const perMove = map.get(L.positionId(p));
    assert.equal(perMove.size, p.moves.length);
    for (const m of p.moves) assert.equal(perMove.get(m.uci).category, m.outcome);
  }
});

test('certifyPositions stops on a changed outcome or a changed legal set', () => {
  const id = L.positionId(p0);
  const flipped = { ...p0, moves: p0.moves.map((m, i) => (i === 0 ? { ...m, outcome: m.outcome === 'safe' ? 'unsafe' : 'safe' } : m)) };
  assert.throws(() => L.certifyPositions([flipped]), {
    message: `Checked category differs from positions file at ${id} ${p0.moves[0].uci}`,
  });
  assert.throws(() => L.certifyPositions([{ ...p0, moves: p0.moves.slice(1) }]), {
    message: `Legal move set differs from positions file at ${id}`,
  });
});

test('classifyCollisions: known +1 with known -1 stops; known with unknown is reported; -1 with -1 forms no group', () => {
  const GROUP = { A: 1, B: 1, C: 2, D: 2, E: 3, F: 3 };
  const eyes = { encode: fen => ({ stimulation: [{ index: 0, current: GROUP[fen] }] }) };
  const items = [
    { fen: 'A', action: 'a1a2', answer: 1 },
    { fen: 'B', action: 'a1a3', answer: -1 },
    { fen: 'C', action: 'b1b2', answer: 1 },
    { fen: 'D', action: 'b1b3', answer: 'unknown' },
    { fen: 'E', action: 'c1c2', answer: -1 }, // quiet
    { fen: 'F', action: 'c1c3', answer: -1 }, // unsafe, same eye input
  ];
  const groups = inputCollisions(eyes, items);
  assert.equal(groups.length, 2);
  const { stop, unknownMixed } = L.classifyCollisions(groups, items);
  assert.deepEqual(stop.map(g => g.items), [[0, 1]]);
  assert.deepEqual(unknownMixed.map(g => g.items), [[2, 3]]);
});

test('buildLedger keeps schedule order and writes null for unknown slots', () => {
  const certs = new Map([['p:1', new Map([
    ['a1a2', { category: 'safe', value: 1, certificateSha256: 'abc' }],
    ['b1b2', { category: 'unknown', value: null, certificateSha256: null }],
  ])]]);
  const ledger = L.buildLedger([{ id: 'p:1', moves: ['b1b2', 'a1a2'] }], certs);
  assert.deepEqual(ledger.map(s => [s.slot, s.uci, s.value, s.certificateSha256]),
    [[0, 'b1b2', null, null], [1, 'a1a2', 1, 'abc']]);
});

test('permuteKnownValues keeps counts and length, is deterministic, and skips unknown slots', () => {
  const values = [1, -1, null, 1, -1, 1, null, -1];
  const ledger = values.map((value, slot) => ({ slot, id: 'p:1', uci: 'a1a2', category: 'x', value, certificateSha256: null }));
  const known = values.filter(v => v !== null);
  const a = L.permuteKnownValues(ledger, 6101);
  assert.deepEqual(L.permuteKnownValues(ledger, 6101), a);
  assert.equal(a.values.length, known.length);
  assert.equal(a.values.filter(v => v === 1).length, 3);
  assert.equal(a.values.filter(v => v === -1).length, 3);
  assert.ok(a.values.every(v => v === 1 || v === -1));
  assert.deepEqual([...a.indices].sort((x, y) => x - y), known.map((_, i) => i));
  assert.deepEqual(a.values, a.indices.map(t => known[t]));
  assert.equal(L.positiveCount(ledger), 3);
});

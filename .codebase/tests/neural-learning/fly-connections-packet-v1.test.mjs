import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createEyesV2 } from '../../src/chess-input/eyes-v2.mjs';
import { positionsFromGame } from '../../src/puzzle-learning/capture-choice-positions-v1.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import {
  BOARD_SCHEMA, CAPTURE_CRITERION, GROUPS, NONKING_SCOPE, R_CRITERION, buildBoardRecord, buildExperienceTape,
  replayPacketBoard, verifyPacketBoard,
} from '../../src/neural-learning/fly-connections-packet-v1.mjs';
import { parseArgs, prepare, readGames, validateConfig } from '../../scripts/neural-learning/prepare-fly-connections-packet-v1.mjs';

// SYNTHETIC Eyes for these fixtures: the real Eyes v2 code on an invented retina with one photoreceptor per square.
// It is not the fly's retina and states no chess fact. The real retina is loaded only by the script's default path.
const SYNTHETIC_RETINA = {
  retina_idx: Int32Array.from({ length: 64 }, (_, i) => i),
  retina_square: Int32Array.from({ length: 64 }, (_, i) => i),
  retina_uv: Float32Array.from({ length: 128 }, () => 0.5),
};
const eyes = createEyesV2(SYNTHETIC_RETINA);
const fileSha = path => createHash('sha256').update(readFileSync(path)).digest('hex');

// Real random-play games (standard start, seeded). Positions come from the existing scanner, which keeps only
// positions with a safe and an unsafe capture; one row per game, so game separation holds by construction.
function randomPgn(id, seed, maxPlies = 140) {
  const rng = mulberry32(seed);
  const game = new Chess();
  while (!game.isGameOver() && game.history().length < maxPlies) {
    const moves = game.moves();
    game.move(moves[Math.floor(rng() * moves.length)]);
  }
  // Movetext built from SAN, not game.pgn(): chess.js adds its own [Event "?"] header block, which would split the game.
  const movetext = game.history().map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san)).join(' ');
  return `[Event "fixture ${id}"]\n[GameId "${id}"]\n\n${movetext} *\n`;
}
function pool(count) {
  const rows = [];
  for (let seed = 1; rows.length < count && seed < 400; seed++) {
    const pgn = randomPgn(`fx${seed}`, seed);
    for (const { gameId, ply, fen, history } of positionsFromGame(pgn, { minPly: 6, maxPerGame: 1, minGap: 1 })) {
      rows.push({ row: { gameId, ply, fen, history }, pgn });
    }
  }
  if (rows.length < count) throw Error(`fixture pool has ${rows.length} rows, need ${count}`);
  return rows;
}
const POOL = pool(44);
const PLAN = { A: 16, B: 16, testA: 2, testB: 2, R: 4 };
const boards = {};
let cursor = 0;
for (const group of ['A', 'B', 'testA', 'testB', 'R']) {
  boards[group] = POOL.slice(cursor, cursor + PLAN[group]).map(({ row, pgn }) => buildBoardRecord(row, { group, pgn, eyes }));
  cursor += PLAN[group];
}
const fenAfter = moves => {
  const b = new Chess();
  for (const m of moves) b.move(m.length === 5 ? { from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] } : { from: m.slice(0, 2), to: m.slice(2, 4) });
  return b.fen();
};

test('fixtures are eligible boards in their groups', () => {
  for (const group of GROUPS) {
    assert.equal(boards[group].length, PLAN[group]);
    for (const record of boards[group]) {
      assert.equal(record.schema, BOARD_SCHEMA, `${record.boardId} ${record.reason ?? ''}`);
      assert.equal(record.group, group);
    }
  }
});

test('replayPacketBoard rebuilds from the full UCI history and rejects mismatched identities', () => {
  const r = boards.A[0];
  assert.equal(replayPacketBoard(r).fen(), r.fen);
  assert.throws(() => replayPacketBoard({ ...r, ply: r.ply + 1 }), /ply/);
  const flipped = r.fen.replace(/ (w|b) /, m => (m === ' w ' ? ' b ' : ' w '));
  assert.throws(() => replayPacketBoard({ ...r, fen: flipped }), /FEN/);
  assert.throws(() => replayPacketBoard({ ...r, boardId: 'other:1' }), /boardId/);
  assert.throws(() => replayPacketBoard({ ...r, history: r.history.slice(1), ply: r.ply - 1 }));
});

test('castling in the history is replayed, so the castling rights come from the moves', () => {
  const castle = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1'];
  const board = replayPacketBoard({ gameId: 'castle', ply: 7, fen: fenAfter(castle), history: castle, boardId: 'castle:7' });
  assert.equal(board.fen().split(' ')[2], 'kq');
});

test('a row whose FEN matches but whose UCI history is not the source PGN prefix is rejected', () => {
  const pgn = '[Event "knights"]\n[GameId "knights"]\n\n1. Nf3 Nf6 2. Ng1 Ng8 *\n';
  const other = ['b1c3', 'b8c6', 'c3b1', 'c6b8'];
  const real = ['g1f3', 'g8f6', 'f3g1', 'f6g8'];
  assert.equal(fenAfter(other), fenAfter(real));
  assert.throws(() => buildBoardRecord({ gameId: 'knights', ply: 4, fen: fenAfter(other), history: other }, { group: 'A', pgn, eyes }), /exact UCI prefix/);
  assert.throws(() => buildBoardRecord({ gameId: 'knights', ply: 4, fen: 'wrong', history: real }, { group: 'A', pgn, eyes }), /FEN/);
  assert.throws(() => buildBoardRecord({ gameId: 'knights', ply: 4, fen: fenAfter(real), history: real }, { group: 'A', pgn: pgn.replace('[GameId "knights"]', '[GameId "other"]'), eyes }), /GameId/);
});

test('Setup/FEN source PGNs are rejected rather than guessed', () => {
  const pgn = '[Event "setup"]\n[GameId "setup1"]\n[SetUp "1"]\n[FEN "8/8/8/8/8/8/8/K6k w - - 0 1"]\n\n1. Kb2 *\n';
  assert.throws(() => buildBoardRecord({ gameId: 'setup1', ply: 0, fen: 'x', history: [] }, { group: 'A', pgn, eyes }), /standard-start/);
});

test('king and quiet actions carry membership proofs with the nonking scope and never an unsafe label', () => {
  for (const group of ['A', 'B', 'testA', 'testB']) for (const r of boards[group]) {
    assert.deepEqual(Object.keys(r.outcomes), r.legal);
    assert.equal(r.criterion, CAPTURE_CRITERION);
    for (const move of r.legal) {
      const proof = r.proofs[move];
      assert.ok(['success', 'failure', 'membership'].includes(proof.status));
      assert.equal(r.outcomes[move], proof.status === 'success');
      if (proof.status === 'membership') {
        assert.equal(proof.certificate.scope, NONKING_SCOPE);
        assert.ok(proof.certificate.captured === null || proof.certificate.piece === 'k');
      }
    }
  }
});

test('A and B boards carry four prescribed events with safe-positive, unsafe-negative pulses', () => {
  for (const group of ['A', 'B']) for (const r of boards[group]) {
    assert.deepEqual(r.experiences.map(e => e.pulse), [true, true, false, false]);
    for (const e of r.experiences) {
      assert.equal(r.proofs[e.move].status === 'success', e.pulse);
      assert.equal(e.proofSha, r.proofs[e.move].certificateSha256);
    }
  }
  for (const group of ['testA', 'testB']) for (const r of boards[group]) assert.deepEqual(r.experiences, []);
});

test('verification rejects altered certificates, histories, unknown proofs and missing or extra actions', () => {
  const r = boards.A[0];
  const before = JSON.stringify(r);
  const capture = r.legal.find(m => r.proofs[m].status !== 'membership');
  const replies = structuredClone(r);
  replies.proofs[capture].certificate.replies = replies.proofs[capture].certificate.replies.slice(1);
  assert.throws(() => verifyPacketBoard(replies));
  const status = structuredClone(r);
  status.proofs[capture].status = status.proofs[capture].status === 'success' ? 'failure' : 'success';
  assert.throws(() => verifyPacketBoard(status));
  const history = structuredClone(r);
  history.history = history.history.slice(0, -1);
  history.ply -= 1;
  assert.throws(() => verifyPacketBoard(history));
  const unknown = structuredClone(r);
  unknown.proofs[capture] = { status: 'unknown', certificate: r.proofs[capture].certificate, certificateSha256: r.proofs[capture].certificateSha256 };
  assert.throws(() => verifyPacketBoard(unknown));
  const missingProof = structuredClone(r);
  delete missingProof.proofs[r.legal[0]];
  assert.throws(() => verifyPacketBoard(missingProof), /domain/);
  const missingOutcome = structuredClone(r);
  delete missingOutcome.outcomes[r.legal[0]];
  assert.throws(() => verifyPacketBoard(missingOutcome));
  const extra = structuredClone(r);
  extra.inputHashes.a1a1 = 'x';
  assert.throws(() => verifyPacketBoard(extra), /domain/);
  verifyPacketBoard(r);
  assert.equal(JSON.stringify(r), before, 'verification must not mutate the record');
});

test('an unknown certificate makes the board ineligible, never unsafe', () => {
  const { row, pgn } = POOL[0];
  const result = buildBoardRecord(row, { group: 'A', pgn, eyes, maxReplies: 1 });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'unknown-certificate');
  assert.ok(result.unknownMoves.length > 0);
});

test('R records carry explicit contingency targets with membership proofs and no safety claims', () => {
  for (const r of boards.R) {
    assert.equal(r.criterion, R_CRITERION);
    assert.equal(r.rTargets.length, 2);
    assert.notEqual(r.inputHashes[r.rTargets[0]], r.inputHashes[r.rTargets[1]]);
    for (const move of r.legal) assert.equal(r.proofs[move].status, 'membership');
    assert.deepEqual(r.experiences, []);
    assert.equal(r.outcomes.R1[r.rTargets[0]], true);
    assert.equal(r.outcomes.R1[r.rTargets[1]], false);
    assert.equal(r.outcomes.R2[r.rTargets[1]], true);
    verifyPacketBoard(r, { phase: 'R1' });
    verifyPacketBoard(r, { phase: 'R2' });
    assert.throws(() => verifyPacketBoard(r), /[Pp]hase/);
    assert.throws(() => verifyPacketBoard(r, { phase: 'R3' }), /[Pp]hase/);
  }
});

test('the same seed reproduces the tape; another seed changes the order but not the event set', () => {
  const a = buildExperienceTape(boards, 7101);
  assert.equal(buildExperienceTape(boards, 7101).sha256, a.sha256);
  const b = buildExperienceTape(boards, 7102);
  assert.notEqual(a.sha256, b.sha256);
  const key = e => `${e.phase}|${e.boardId}|${e.move}|${e.pulse}`;
  assert.deepEqual(a.events.map(key).sort(), b.events.map(key).sort());
  assert.notDeepEqual(a.events.map(e => e.boardId), b.events.map(e => e.boardId));
});

test('shuffled pulses keep every phase count and differ in arrangement from the scheduled tape', () => {
  const t = buildExperienceTape(boards, 7101);
  assert.equal(t.shuffledPulses.length, t.events.length);
  for (const phase of ['A', 'R1', 'B', 'R2']) {
    const idx = t.events.map((e, i) => i).filter(i => t.events[i].phase === phase);
    assert.equal(idx.filter(i => t.events[i].pulse).length, idx.filter(i => t.shuffledPulses[i]).length, phase);
    assert.equal(t.counts.byPhase[phase].pulses, t.counts.byPhase[phase].shuffledPulses, phase);
  }
  assert.notDeepEqual(t.shuffledPulses, t.events.map(e => e.pulse));
});

test('phase order, polarity, cardinalities and pass counts are exact', () => {
  const t = buildExperienceTape(boards, 7101);
  const byId = new Map([...boards.A, ...boards.B, ...boards.R, ...boards.testA, ...boards.testB].map(r => [r.boardId, r]));
  assert.deepEqual([...new Set(t.events.map(e => e.phase))], ['A', 'R1', 'B', 'R2']);
  t.events.forEach((e, i) => {
    const r = byId.get(e.boardId);
    assert.equal(e.sequence, i);
    assert.equal(e.criterion, r.criterion);
    if (e.phase === 'A' || e.phase === 'B') assert.equal(e.pulse, r.proofs[e.move].status === 'success');
    else assert.equal(e.pulse, e.move === r.rTargets[e.phase === 'R1' ? 0 : 1]);
  });
  assert.equal(t.counts.byPhase.A.events, 4 * PLAN.A);
  assert.equal(t.counts.byPhase.B.events, 4 * PLAN.B);
  assert.equal(t.counts.byPhase.R1.events, 8 * PLAN.R);
  assert.equal(t.counts.byPhase.R1.pulses, 4 * PLAN.R);
  assert.equal(t.counts.byPhase.R2.pulses, 4 * PLAN.R);
  const expectedRanking = t.events.reduce((total, e) => total + byId.get(e.boardId).legal.length, 0);
  assert.equal(t.counts.rankingPasses, expectedRanking);
  assert.equal(t.counts.teachingReplayPasses, t.events.length);
  assert.deepEqual(t.counts.boards, { A: PLAN.A, B: PLAN.B, R: PLAN.R, testA: PLAN.testA, testB: PLAN.testB });
});

test('probe checkpoints are labelled once with increasing cursors, and T0 is separate', () => {
  const t = buildExperienceTape(boards, 7101);
  assert.deepEqual(t.initialProbe, { cursor: 0, phase: 'T0' });
  assert.deepEqual(t.probeAfter.map(p => p.phase), ['A-8', 'A-end', 'R1-end', 'B-8', 'B-end', 'R2-end']);
  assert.deepEqual(t.probeAfter.map(p => p.cursor), [32, 64, 96, 128, 160, 192]);
  assert.equal(t.probeAfter.at(-1).cursor, t.events.length);
});

test('tape building rejects a game reused across groups and a board tagged to the wrong group', () => {
  assert.throws(() => buildExperienceTape({ ...boards, B: [...boards.B, { ...boards.A[0], group: 'B' }] }, 1), /Duplicate/);
  assert.throws(() => buildExperienceTape({ ...boards, testA: [boards.A[1]] }, 1), /tagged/);
});

test('config validation requires sealed confirmation inputs and a fresh run directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fly-packet-config-'));
  try {
    const H = '0'.repeat(64);
    const base = {
      purpose: 'development', sealed: false,
      paths: { run: join(dir, 'run'), positions: 'p', pgn: 'g', graph: 'h' },
      pins: { positions: H, pgn: H, graph: H },
      groupGameIds: { A: ['a1'], B: ['b1'], R: ['r1'], testA: [], testB: [] },
      desiredCounts: { A: 1, B: 1, R: 1, testA: 0, testB: 0 },
      seeds: [7101],
    };
    assert.doesNotThrow(() => validateConfig(base));
    assert.throws(() => validateConfig({ ...base, purpose: 'confirmation', sealed: false }), /sealed/);
    assert.throws(() => validateConfig({ ...base, purpose: 'confirmation', sealed: true }), /exclusion/);
    assert.throws(() => validateConfig({ ...base, paths: { ...base.paths, run: dir } }), /fresh/);
    assert.throws(() => validateConfig({ ...base, groupGameIds: { ...base.groupGameIds, B: ['a1'] } }), /disjoint/);
    assert.throws(() => parseArgs(['--config', 'x', '--cpu-duty', '0.5']), /cpu-duty/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the preparation script writes boards, tapes, packet, summary and a terminal manifest from a fixture config', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fly-packet-run-'));
  try {
    const games = POOL.slice(0, 9);
    const [g0, g1, g2, g3, g4, g5, g6, g7] = games.map(({ row }) => row.gameId);
    const positions = join(dir, 'positions.jsonl');
    writeFileSync(positions, games.map(({ row }) => `${JSON.stringify(row)}\n`).join('') + '\n');
    const pgn = join(dir, 'games.pgn');
    writeFileSync(pgn, games.map(({ pgn: text }) => text).join('\n'));
    const streamed = await readGames(pgn, new Set([g0]));
    assert.equal(streamed.get(g0), games[0].pgn, 'streamed PGN text must equal the written game text');
    const graph = join(dir, 'graph.npz');
    writeFileSync(graph, 'synthetic placeholder: never loaded because eyesFrom is injected');
    const config = {
      purpose: 'development', sealed: false,
      paths: { run: join(dir, 'run'), positions, pgn, graph },
      pins: { positions: fileSha(positions), pgn: fileSha(pgn), graph: fileSha(graph) },
      groupGameIds: { A: [g0, g1], B: [g2, g3], R: [g7], testA: [g4], testB: [g5, g6] },
      desiredCounts: { A: 2, B: 2, R: 1, testA: 1, testB: 1 },
      exclusions: { gameIds: [g5] },
      seeds: [7101],
    };
    const configPath = join(dir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config));
    const summary = await prepare(configPath, { eyesFrom: () => eyes });
    assert.equal(summary.status, 'complete');
    const run = resolve(config.paths.run);
    const packet = JSON.parse(readFileSync(join(run, 'packet.json'), 'utf8'));
    assert.equal(packet.schema, 'fly-connections-packet-v1');
    assert.equal(packet.groups.A.count, 2);
    assert.equal(packet.groups.testB.gameIds[0], g6, 'first eligible game after the excluded one is used');
    assert.equal(readFileSync(join(run, 'boards.jsonl'), 'utf8').trim().split('\n').length, 7);
    const tape = JSON.parse(readFileSync(join(run, 'tapes', '7101.json'), 'utf8'));
    assert.equal(tape.counts.boards.A, 2);
    const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'));
    assert.equal(manifest.status, 'complete');
    assert.equal(manifest.volume, 2);
    assert.equal(manifest.chapter, 3);
    const records = readFileSync(join(run, 'records.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.ok(records.some(r => r.type === 'excluded' && r.reason === 'prior-exclusion' && r.gameId === g5));
    assert.equal(records.filter(r => r.type === 'selected').length, 7);
    await assert.rejects(() => prepare(configPath, { eyesFrom: () => eyes }), /fresh/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

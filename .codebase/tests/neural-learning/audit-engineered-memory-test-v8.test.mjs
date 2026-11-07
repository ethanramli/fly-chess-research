import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { Chess } from 'chess.js';
import { auditRun, KEYS_PINS, NEW_PINS, pinnedOf, PRIOR_PARTITION_PINS, PRIOR_SELECTION_PINS, V5_CACHE_PIN, V5_PARTITION_PIN, verdictOf } from '../../scripts/neural-learning/audit-engineered-memory-test-v8.mjs';
import { certifyCaptureRetentionAction } from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import { NearestEpisodeMemory, rmsScaler } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

// Synthetic v8 folders built from real positions, in the temp dir: the v4, v5, v6 and v7 prior folders and the v8 run folder.
// Column 0 of each cache row carries the certified value (+1 safe, -1 otherwise), the other columns are 0. A fixture for consistency checks, not a result.
// Stand-in data: the games 901-1200 are not used. The fixture's new positions are 301-600 positions relabelled with fixture-only game ids, so the three real
// earlier selections (games 1-300, 301-600, 601-900) are disjoint from the new games. The writer below follows the v8 proposal (sections 1-6) and shares the
// pinned libraries but none of the auditor's or the task modules' code.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const POSITIONS_ALL = join(ROOT, 'runs', 'restart-data-2026-11-04', 'capture-choice-positions-max50-v1', 'positions.jsonl');
const DATA_301_600 = join(ROOT, 'runs', 'restart-data-2026-11-05');
// Stand-in new positions; the v6 positions file is read from the same file (the v6 test ids are looked up there).
const SOURCE_POSITIONS = join(DATA_301_600, 'capture-choice-positions-301-600-v1', 'positions.jsonl');
// The three earlier selections (real files), in the order of PRIOR_SELECTION_PINS.
const PRIOR_SELECTIONS = [
  join(ROOT, 'runs', 'restart-data-2026-11-03', 'games-train', 'selection.json'),
  join(DATA_301_600, 'games-train-301-600', 'selection.json'),
  join(DATA_301_600, 'games-train-601-900', 'selection.json'),
];
// The registered games 901-1200 files (digests in NEW_PINS). Read only: the digests are checked, nothing is run.
const REGISTERED_901_1200 = {
  selection: join(ROOT, 'runs', 'restart-data-2026-11-06', 'games-train-901-1200', 'selection.json'),
  gamesPgn: join(ROOT, 'runs', 'restart-data-2026-11-06', 'games-train-901-1200', 'games.pgn'),
  positions: join(ROOT, 'runs', 'restart-data-2026-11-06', 'capture-choice-positions-901-1200-v1', 'positions.jsonl'),
};
// The earlier test partitions (the v6 and v7 run folders), pinned in PRIOR_PARTITION_PINS.
const EARLIER_PARTITIONS = {
  v6: join(ROOT, 'runs', 'engineered-memory-test-2026-11-05', 'engineered-memory-test-v6-r4', 'partition.json'),
  v7: join(ROOT, 'runs', 'engineered-memory-test-2026-11-05', 'engineered-memory-test-v7-r2', 'partition.json'),
};
const AUDITOR = join(ROOT, '.codebase', 'scripts', 'neural-learning', 'audit-engineered-memory-test-v8.mjs');
const COLUMNS = 6;
const SEEDS = [6101, 6102, 6103];
const PRACTICE_GAMES = 2;
const SCORE_CHUNK = 10; // the worker's chunk size for the all-legal total
const TASK = { objective: 'capture-retention', plies: 1 };
const REQUIRED = ['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs'];
const CHECKS = ['data', 'testset', 'v5inputs', 'certificates', 'ledger', 'cache', 'permutation', 'jobs', 'scores', 'gate'];
// Test-only values: resamples, columns and practice size. No prior-selection override: the three real selections match their pins.
// The fixture's v5 partition and keys.json digests are test overrides (v5PartitionPin, keysPins), so the fixture report is unpinned.
const TEST_OPTIONS = { columns: COLUMNS, resamples: 200, practiceGames: PRACTICE_GAMES, rawRandom: false };
const GATE_SEED = 20261108;
const WRONG_GATE_SEED = 20261107;
const ZEROS = { writes: 0, unknown: 0, replacements: 0, evictions: 0, identicalConsistent: 0, identicalConflicting: 0 };
const ARMS = ['full', 'half', 'quarter', 'eighth', 'shuffled', 'none'];
// The runner's arm list (ARMS plus the secondary raw and random arms), in its order.
const RAW_ARMS = ['raw-pc', 'random-pc'];
const RUN_ARMS = [...ARMS, ...RAW_ARMS];
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const sha = data => createHash('sha256').update(data).digest('hex');
const shaFile = path => sha(readFileSync(path));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const UCI = m => m.from + m.to + (m.promotion ?? '');
const ID = p => `${p.gameId}:${p.ply}`;
const PIECES = fen => fen.split(' ')[0];
const RANK = g => sha(`engineered-memory-v3-split:${g}`);
const FOLD = g => sha(`memory-v5-fold:${g}`);
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const writeJsonl = (path, rows) => writeFileSync(path, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const readJsonl = path => readFileSync(path, 'utf8').split('\n').filter(l => l.trim() !== '').map(l => JSON.parse(l));
const readPositions = path => readJsonl(path);
const failing = report => report.checks.filter(c => !c.pass).map(c => c.name);
const check = (report, name) => report.checks.find(c => c.name === name);
const jobFile = (dir, name) => join(dir, 'jobs', name);
const JOB_NAME = (seed, arm) => `confirm-${arm === 'raw-pc' || arm === 'random-pc' ? arm : 'K3'}---${seed}-${arm}.json`;

// The output object of memory-v7-worker.mjs (reused unchanged by v8), copied: the same keys and the same optional spreads.
function workerOutput({ job, scores, counts, pipeline, fingerprint, peakRssMiB, allLegalScores = null, pieceValue = null, retained = null }) {
  return `${JSON.stringify({
    job, scores, expectedTotal: scores.reduce((sum, s) => sum + s.expected, 0), counts,
    pipeline: { rmsSha256: pipeline.rmsSha256, zeroRmsFeatures: pipeline.zeroRmsFeatures },
    fingerprint,
    peakRssMiB,
    ...(allLegalScores === null ? {} : { allLegalScores }),
    ...(pieceValue === null ? {} : { pieceValue }),
    ...(retained === null ? {} : { retention: retained }),
  })}\n`;
}

function boardOf(p) {
  const b = new Chess();
  for (const m of p.history) b.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.length > 4 ? m[4] : undefined });
  assert.equal(b.fen(), p.fen, `fixture position ${ID(p)} replays`);
  return b;
}
const labelOf = (p, uci) => p.moves.find(m => m.uci === uci)?.outcome;
const isSafe = (p, uci) => labelOf(p, uci) === 'safe';

// Eligible: 4 to 30 legal moves, every legal move labelled, at least one safe move (keeps the certificate replays fast).
function eligible(p) {
  const moves = boardOf(p).moves({ verbose: true });
  if (moves.length < 4 || moves.length > 30 || moves.length !== p.moves.length) return null;
  const legal = moves.map(UCI).sort();
  if (!legal.every(u => p.moves.some(m => m.uci === u)) || !p.moves.some(m => m.outcome === 'safe')) return null;
  return legal;
}
// A retained position also needs a safe and an unsafe capture (the generator's qualifies rule).
const qualifies = p => Boolean(eligible(p)) && p.moves.some(m => m.capture && m.outcome === 'safe') && p.moves.some(m => m.capture && m.outcome === 'unsafe');

// Forward partial Fisher-Yates (proposal section 1, item 2), written again here: the test imports no auditor internal.
function shuffleFirst(list, m, rng) {
  const a = [...list];
  for (let i = 0; i < m; i++) { const j = i + Math.floor(rng() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, m);
}
// Writer's capture permutation (spec 3, v8): every ledger slot is a capture, so the whole ledger is permuted with the 0x7ca7 salt; values[t] = slots[indices[t]].value.
function capturePermWriter(seed, slots) {
  const indices = shuffleFirst(slots.map((_, i) => i), slots.length, mulberry32((seed ^ 0x7ca7) >>> 0));
  return { indices, values: indices.map(i => slots[i].value) };
}

// Chooses the first qualifying trial (fixture choice, not a result): 3 new positions from distinct games (relabelled to fixture-only game ids),
// 2 practice games of 4 positions and 1 test game of 4 positions, plus a v6 and a v7 test board. Conditions: no board class overlaps another (so each
// decoy's reason is unambiguous); the practice captures hold a safe, an unsafe and an unknown capture, and some practice position has a quiet move
// (labels of the position file). The gate does not pass on this fixture (see the gate tests): with three games it needs every game to beat the
// shuffled and quarter arms, which no candidate of this family did in a screen of 600 (no seed passed).
function pickFixture(real, fresh) {
  const byGame = new Map();
  for (const p of real) {
    const legal = eligible(p);
    if (!legal) continue;
    if (!byGame.has(p.gameId)) byGame.set(p.gameId, []);
    byGame.get(p.gameId).push({ p, legal });
  }
  const games = [...byGame.values()].filter(list => list.length >= 4).map(list => list.sort((a, b) => a.p.ply - b.p.ply));
  const retained = [];
  const usedGames = new Set();
  for (const p of fresh) {
    if (retained.length === 3) break;
    if (usedGames.has(p.gameId) || !qualifies(p)) continue;
    retained.push(p);
    usedGames.add(p.gameId);
  }
  assert.equal(retained.length, 3, 'three qualifying new positions from distinct games');
  const retainedBoards = new Set(retained.map(p => PIECES(p.fen)));
  // The v6 test board and the v7 test board: fresh positions from games not used above, with boards no retained position has.
  const v6Real = fresh.find(p => !usedGames.has(p.gameId) && !retainedBoards.has(PIECES(p.fen)));
  assert.ok(v6Real, 'a v6 test position from another game');
  const v7Real = fresh.find(p => !usedGames.has(p.gameId) && p.gameId !== v6Real.gameId && !retainedBoards.has(PIECES(p.fen)) && PIECES(p.fen) !== PIECES(v6Real.fen));
  assert.ok(v7Real, 'a v7 test position from another game');
  const earlierBoards = [PIECES(v6Real.fen), PIECES(v7Real.fen)];
  for (let trial = 0; trial < 5000; trial++) {
    const rng = mulberry32(41000 + trial);
    const pool = [...games];
    const chosen = [];
    while (chosen.length < 3) chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    chosen.sort((x, y) => cmp(RANK(x[0].p.gameId), RANK(y[0].p.gameId)));
    const [a, b, t] = chosen;
    const practice = [...a.slice(0, 4), ...b.slice(0, 4)];
    const testPos = t.slice(0, 4);
    const practiceBoards = new Set(practice.map(x => PIECES(x.p.fen)));
    const testBoards = new Set(testPos.map(x => PIECES(x.p.fen)));
    if (practiceBoards.has(PIECES(testPos[1].p.fen))) continue; // a v5 fresh candidate must exist
    if ([...retainedBoards, ...earlierBoards].some(board => practiceBoards.has(board) || testBoards.has(board))) continue;
    const captureLabels = practice.flatMap(x => x.p.moves.filter(m => m.capture).map(m => m.outcome));
    if (!captureLabels.includes('safe') || !captureLabels.includes('unsafe') || !captureLabels.includes('unknown')) continue;
    if (!practice.some(x => x.p.moves.some(m => !m.capture && m.outcome === 'quiet'))) continue;
    const copy = (p, gameId) => ({ ...p, gameId });
    return {
      practice: practice.map(x => x.p),
      testPos: testPos.map(x => x.p),
      v4: [a[0].p, b[0].p, t[0].p],
      // Relabelled: the new games are fixture-only ids, not members of any earlier selection.
      retained: retained.map((p, i) => ({ ...p, gameId: `fixture-new-${i}` })),
      v6Real,
      v7Real,
      decoys: {
        practice: copy(practice[7].p, 'decoyPractice'),
        v4Test: copy(testPos[0].p, 'decoyV4'),
        fresh: copy(testPos[1].p, 'decoyFresh'),
        v6: copy(v6Real, 'decoyV6'),
        v7: copy(v7Real, 'decoyV7'),
      },
    };
  }
  throw new Error('no fixture games found');
}

// Writes the v4, v5, v6, v7 and v8 folders and the synthetic new positions file; computes every job and the verdict the way the runner does.
function buildFixture(dir, fx) {
  const v4Dir = join(dir, 'v4-run');
  const v5Dir = join(dir, 'v5-run');
  const v6Dir = join(dir, 'v6-run');
  const v7Dir = join(dir, 'v7-run');
  const runDir = join(dir, 'v8-run');
  for (const d of [v4Dir, v5Dir, v6Dir, v7Dir, join(runDir, 'jobs')]) mkdirSync(d, { recursive: true });
  const all = [...fx.practice, ...fx.testPos];
  const newFile = [fx.retained[0], fx.decoys.practice, fx.retained[1], fx.decoys.v4Test, fx.retained[2], fx.decoys.fresh, fx.decoys.v6, fx.decoys.v7];
  const newPositionsPath = join(dir, 'new-positions.jsonl');
  writeJsonl(newPositionsPath, newFile);
  // The new selection lists exactly the games of the new positions (fixture ids, none in an earlier selection). The games file is a placeholder: only its hash is read.
  const newSelectionPath = join(dir, 'new-selection.json');
  writeJson(newSelectionPath, { ids: [...new Set(newFile.map(p => p.gameId))] });
  const newGamesPath = join(dir, 'new-games.pgn');
  writeFileSync(newGamesPath, '; fixture games file, not a result\n');
  // The v7 positions file holds the v7 test board (its id is in the v7 partition).
  const v7PositionsPath = join(dir, 'v7-positions.jsonl');
  writeJsonl(v7PositionsPath, [fx.v7Real]);

  const info = new Map();
  for (const p of [...all, ...fx.retained]) {
    const board = boardOf(p);
    const moves = board.moves({ verbose: true });
    info.set(ID(p), { p, board, legal: moves.map(UCI).sort(), moves: new Map(moves.map(m => [UCI(m), m])) });
  }
  const legalOf = p => info.get(ID(p)).legal;
  const capturedOf = (id, uci) => Boolean(info.get(id).moves.get(uci).captured);

  // Certificate lines (v4 format) for every legal move of the practice, v5 fresh, test and retained positions.
  const lines = new Map();
  for (const p of [...all, ...fx.retained]) {
    const { board, legal, moves } = info.get(ID(p));
    for (const uci of legal) {
      const captured = Boolean(moves.get(uci).captured);
      let line;
      if (captured && moves.get(uci).piece === 'k') line = { id: ID(p), uci, category: 'unknown', value: null, status: 'scope-unknown', proof: null, certificateSha256: null };
      else {
        const proof = certifyCaptureRetentionAction(board, uci, { ...TASK }, {});
        const category = proof.status === 'success' ? 'safe' : proof.status === 'failure' ? (captured ? 'unsafe' : 'quiet') : 'unknown';
        line = { id: ID(p), uci, category, value: category === 'safe' ? 1 : category === 'unknown' ? null : -1, status: proof.status, proof, certificateSha256: proof.certificateSha256 ?? null };
      }
      assert.equal(labelOf(p, uci), line.category, `${ID(p)}|${uci} label matches the certificate`);
      lines.set(`${ID(p)}|${uci}`, line);
    }
  }
  const header = { kind: 'verifier', task: TASK, maxReplies: 256, sources: Object.fromEntries(REQUIRED.map(f => [f, shaFile(join(ROOT, f))])) };
  const sortLines = list => list.sort((a, b) => cmp(a.id, b.id) || cmp(a.uci, b.uci));

  // v5 partition: practice games are the first PRACTICE_GAMES v4 games by the split hash; fold A is the first half by the fold hash.
  const v4Ids = new Set(fx.v4.map(ID));
  const v4Boards = new Set(fx.v4.map(p => PIECES(p.fen)));
  const v4Games = [...new Set(fx.v4.map(p => p.gameId))].sort((x, y) => cmp(RANK(x), RANK(y)));
  const practiceGames = v4Games.slice(0, PRACTICE_GAMES);
  const testGames = v4Games.slice(PRACTICE_GAMES);
  const order = (x, y) => cmp(RANK(x.gameId), RANK(y.gameId)) || x.ply - y.ply;
  const practice = all.filter(p => practiceGames.includes(p.gameId)).sort(order);
  const practiceBoards = new Set(practice.map(p => PIECES(p.fen)));
  const candidates = all.filter(p => testGames.includes(p.gameId) && !v4Ids.has(ID(p)) && !v4Boards.has(PIECES(p.fen))).sort(order);
  const v5Fresh = candidates.filter(p => !practiceBoards.has(PIECES(p.fen)));
  const v5Dropped = candidates.filter(p => practiceBoards.has(PIECES(p.fen)));
  const foldGames = [...practiceGames].sort((x, y) => cmp(FOLD(x), FOLD(y)));
  const foldA = new Set(foldGames.slice(0, Math.floor(practiceGames.length / 2)));
  writeJson(join(v5Dir, 'partition.json'), {
    practice: practice.map(ID),
    foldA: practice.filter(p => foldA.has(p.gameId)).map(ID),
    foldB: practice.filter(p => !foldA.has(p.gameId)).map(ID),
    freshTest: v5Fresh.map(ID),
    droppedBoardRepeats: v5Dropped.map(ID),
    foldBoardRepeats: 0,
    counts: { practice: practice.length, fresh: v5Fresh.length, dropped: v5Dropped.length },
  });

  // v6 and v7 run folders: their test ids only (the v6 boards are read from the v6 positions file, the v7 boards from the v7 positions file).
  writeJson(join(v6Dir, 'partition.json'), { practice: [], foldA: [], foldB: [], freshTest: [ID(fx.v6Real)], excluded: [], counts: { freshTest: 1 } });
  writeJson(join(v7Dir, 'partition.json'), { practice: [], foldA: [], foldB: [], freshTest: [ID(fx.v7Real)], excluded: [], counts: { freshTest: 1 } });

  // v8 test set (spec 2): practice board, then any earlier test board (v4, v5 fresh, v6, v7); retained in generator order.
  const v4TestBoards = new Set(fx.v4.filter(p => testGames.includes(p.gameId)).map(p => PIECES(p.fen)));
  const v5FreshBoards = new Set(v5Fresh.map(p => PIECES(p.fen)));
  const v6Boards = new Set([PIECES(fx.v6Real.fen)]);
  const v7Boards = new Set([PIECES(fx.v7Real.fen)]);
  const excluded = [];
  const freshIds = [];
  for (const p of newFile) {
    const b = PIECES(p.fen);
    const reason = practiceBoards.has(b) ? 'practice-board' : (v4TestBoards.has(b) || v5FreshBoards.has(b) || v6Boards.has(b) || v7Boards.has(b)) ? 'earlier-test-board' : null;
    if (reason) excluded.push({ id: ID(p), reason }); else freshIds.push(ID(p));
  }
  assert.equal(freshIds.length, 3);
  assert.equal(excluded.length, 5);
  writeJson(join(runDir, 'partition.json'), {
    practice: practice.map(ID), foldA: [], foldB: [], freshTest: freshIds, excluded,
    counts: { newPositions: newFile.length, practice: practice.length, freshTest: freshIds.length, excluded: excluded.length },
  });

  // Keys and cache rows: v4 keys; v5 keys = practice and fresh moves not in v4; v8 keys = retained moves not in v4 or v5. The v6 and v7 caches are not used.
  const keysOf = list => list.flatMap(p => legalOf(p).map(u => `${ID(p)}|${u}`));
  const v4Keys = keysOf(fx.v4);
  const v4KeySet = new Set(v4Keys);
  const v5Keys = keysOf([...practice, ...v5Fresh]).filter(k => !v4KeySet.has(k));
  const v5KeySet = new Set(v5Keys);
  const v8Keys = keysOf(fx.retained).filter(k => !v4KeySet.has(k) && !v5KeySet.has(k));
  const rowOfKey = key => {
    const line = lines.get(key);
    return Float64Array.of(line && line.value ? line.value : 0, 0, 0, 0, 0, 0);
  };
  const blank = Float64Array.of(0, 0, 0, 0, 0, 0);
  const cacheBytes = rowList => {
    const buf = Buffer.alloc(rowList.length * COLUMNS * 4);
    rowList.forEach((r, i) => r.forEach((x, c) => buf.writeFloatLE(x, (i * COLUMNS + c) * 4)));
    return buf;
  };
  const writeCache = (dir, keys) => {
    const bytes = cacheBytes([blank, ...keys.map(rowOfKey)]);
    writeFileSync(join(dir, 'kc-cache.f32'), bytes);
    writeJson(join(dir, 'keys.json'), { rows: ['blank', ...keys] });
    return bytes;
  };
  const v4Bytes = writeCache(v4Dir, v4Keys);
  const v5Bytes = writeCache(v5Dir, v5Keys);
  const v8Bytes = writeCache(runDir, v8Keys);
  const v8Digest = sha(v8Bytes);
  writeJson(join(runDir, 'cache-schema.json'), { rows: v8Keys.length + 1, columns: COLUMNS, dtype: 'float32', byteOrder: 'little', kcIndices: [0, 1, 2, 3, 4, 5], kcRootIds: [], fileSha256: v8Digest, pins: {} });
  const rowsByKey = new Map([...v4Keys, ...v5Keys, ...v8Keys].map(k => [k, rowOfKey(k)]));

  // Expected ledger (proposal section 1, written again here): the base list is the practice captures with a safe or unsafe certificate, in partition
  // order and sorted UCI order; each seed shuffles it with (seed ^ 0x1ed8); slots are numbered after the shuffle. The files are the run's own.
  const base = [];
  for (const p of practice) {
    for (const uci of legalOf(p)) {
      const id = ID(p);
      if (!capturedOf(id, uci)) continue;
      const line = lines.get(`${id}|${uci}`);
      if (line.category === 'safe' || line.category === 'unsafe') base.push({ id, uci, category: line.category, value: line.value, certificateSha256: line.certificateSha256 });
    }
  }
  const ledgers = {};
  const capPerms = {};
  for (const seed of SEEDS) {
    const order2 = shuffleFirst(base.map((_, i) => i), base.length, mulberry32((seed ^ 0x1ed8) >>> 0));
    ledgers[seed] = order2.map((i, slot) => ({ slot, ...base[i] }));
    capPerms[seed] = capturePermWriter(seed, ledgers[seed]);
    writeJsonl(join(runDir, `ledger-${seed}.jsonl`), ledgers[seed]);
    writeJson(join(runDir, `permutation-capture-${seed}.json`), capPerms[seed]);
  }

  // Certificates: v5 has the practice and fresh lines. v8 is the header, the copied v5 practice block, then the test block; each block in id/uci order.
  const v5Lines = sortLines([...practice, ...v5Fresh].flatMap(p => legalOf(p).map(u => lines.get(`${ID(p)}|${u}`))));
  writeJsonl(join(v5Dir, 'certificates.jsonl'), [header, ...v5Lines]);
  const practiceSet = new Set(practice.map(ID));
  const v8Practice = v5Lines.filter(c => practiceSet.has(c.id));
  const v8Test = sortLines(fx.retained.flatMap(p => legalOf(p).map(u => lines.get(`${ID(p)}|${u}`))));
  writeJsonl(join(runDir, 'certificates.jsonl'), [header, ...v8Practice, ...v8Test]);

  // Scoring sets and totals as the runner writes them: candidates for the verdict (spec 1), all legal moves for the descriptive total, the piece-value rule for none (spec 5).
  const candidatesFx = p => { const { moves } = info.get(ID(p)); return legalOf(p).filter(u => moves.get(u).captured && ['safe', 'unsafe'].includes(lines.get(`${ID(p)}|${u}`).category)); };
  const legalFx = p => legalOf(p);
  const pieceValueFx = p => {
    const { moves } = info.get(ID(p));
    const set = candidatesFx(p);
    const gain = u => VALUE[moves.get(u).captured] - VALUE[moves.get(u).piece];
    const top = Math.max(...set.map(gain));
    const tied = set.filter(u => gain(u) === top);
    return tied.filter(u => lines.get(`${ID(p)}|${u}`).value === 1).length / tied.length;
  };
  const sumOf = rows => rows.reduce((t, x) => t + x.expected, 0);

  // Jobs (spec 3, 5, 6) for the K3 key; the raw and random arms are presence-only placeholders (no retina).
  const meanCache = new Map();
  const meanOf = id => {
    if (!meanCache.has(id)) {
      const legal = legalOf(info.get(id).p);
      const s = new Float64Array(COLUMNS);
      for (const u of legal) { const r = rowsByKey.get(`${id}|${u}`); for (let c = 0; c < COLUMNS; c++) s[c] += r[c]; }
      meanCache.set(id, Float64Array.from(s, x => x / legal.length));
    }
    return meanCache.get(id);
  };
  const transform = (id, uci) => {
    const m = meanOf(id);
    const r = rowsByKey.get(`${id}|${uci}`);
    return Float64Array.from(r, (x, i) => x - m[i]);
  };
  const calib = practice.slice(0, Math.floor(practice.length / 4)).map(p => [ID(p), legalOf(p)[0]]);
  const fit = calib.map(([id, uci]) => transform(id, uci));
  const scale = rmsScaler(fit);
  const dead = [...Array(COLUMNS).keys()].filter(i => fit.every(v => v[i] === 0));
  const pipe = {
    rmsSha256: scale.rmsSha256,
    zeroRmsFeatures: dead.length,
    apply(id, uci) {
      const v = scale(transform(id, uci));
      for (const i of dead) v[i] = 0;
      return v;
    },
  };
  const storeOf = (slots, values, arm) => {
    const memory = new NearestEpisodeMemory({ capacity: 4096, k: 3 });
    const counts = { ...ZEROS };
    slots.forEach((slot, i) => {
      const value = values[i];
      if (value === null) { counts.unknown++; return; }
      const vector = pipe.apply(slot.id, slot.uci);
      const at = memory.entries.findIndex(e => e.vector.every((x, j) => x === vector[j]));
      if (at >= 0) { counts.replacements++; if (memory.entries[at].value === value) counts.identicalConsistent++; else counts.identicalConflicting++; }
      else if (memory.size === 4096) counts.evictions++;
      memory.write(vector, value, sha(JSON.stringify({ arm, slot: slot.slot, id: slot.id, uci: slot.uci, value })));
      counts.writes++;
    });
    return { memory, counts };
  };
  const scoreOf = (memory, apply, setOf, list = fx.retained) => list.map(p => {
    const id = ID(p);
    const set = setOf(p);
    const vectors = set.map(u => (apply === null ? Float64Array.of(0) : apply(id, u)));
    const scores = frozenScores(set.map((_, i) => i), i => memory.score(vectors[i]), () => memory.fingerprint());
    const top = Math.max(...scores);
    const tied = set.map((_, i) => i).filter(i => scores[i] === top);
    const s = tied.filter(i => isSafe(p, set[i])).length;
    return { id, c: tied.length, s, expected: s / tied.length };
  });
  // Worker grouping: one chunk sum per SCORE_CHUNK positions, added in order (memory-v7-worker.mjs, reused in v8).
  const allLegalChunked = (memory, apply) => {
    let total = 0;
    for (let i = 0; i < fx.retained.length; i += SCORE_CHUNK) total += sumOf(scoreOf(memory, apply, legalFx, fx.retained.slice(i, i + SCORE_CHUNK)));
    return total;
  };
  // The worker's job inputs (the variables behind its output object), one per job.
  const runArm = (seed, arm) => {
    const slots = ledgers[seed];
    const n = slots.length;
    let memory = new NearestEpisodeMemory({ capacity: 4096, k: 3 });
    let counts = null;
    let retained = null;
    if (arm !== 'none') {
      const size = { full: n, shuffled: n, half: Math.floor(n / 2), quarter: Math.floor(n / 4), eighth: Math.floor(n / 8) }[arm];
      const storeSlots = slots.slice(0, size);
      const values = arm === 'shuffled' ? capPerms[seed].values : storeSlots.map(s => s.value);
      ({ memory, counts } = storeOf(storeSlots, values, arm));
      if (arm === 'full' || arm === 'quarter') {
        const probes = slots.slice(0, Math.floor(n / 4)).filter(s => s.value !== null).map(s => ({ value: s.value, vector: pipe.apply(s.id, s.uci) }));
        const recalled = probes.map(p => { const x = memory.score(p.vector); return x > 0 ? p.value === 1 : x < 0 ? p.value === -1 : false; });
        retained = arm === 'quarter' ? { probes: probes.length, recalledQuarter: recalled } : { probes: probes.length, recalledFull: recalled };
      }
    }
    const apply = arm === 'none' ? null : pipe.apply;
    const scores = scoreOf(memory, apply, candidatesFx);
    return {
      job: { phase: 'confirm', key: 'K3', direction: '-', seed, arm },
      scores,
      counts,
      pipeline: { rmsSha256: pipe.rmsSha256, zeroRmsFeatures: pipe.zeroRmsFeatures },
      fingerprint: arm === 'none' ? null : memory.fingerprint(),
      peakRssMiB: 0,
      allLegalScores: arm === 'full' || arm === 'none' ? allLegalChunked(memory, apply) : null,
      pieceValue: arm === 'none' ? fx.retained.map(pieceValueFx).reduce((t, x) => t + x, 0) : null,
      retained,
    };
  };
  const jobs = {};
  for (const seed of SEEDS) for (const arm of ARMS) jobs[`${seed}|${arm}`] = runArm(seed, arm);
  for (const seed of SEEDS) for (const arm of ['raw-pc', 'random-pc']) {
    jobs[`${seed}|${arm}`] = { job: { phase: 'confirm', key: arm, direction: '-', seed, arm }, scores: [], counts: { ...ZEROS }, pipeline: { rmsSha256: 'not-rechecked', zeroRmsFeatures: 0 }, fingerprint: 'not-rechecked', peakRssMiB: 0, allLegalScores: null, pieceValue: null, retained: null };
  }
  for (const [key, body] of Object.entries(jobs)) {
    const [seed, arm] = key.split('|');
    const name = JOB_NAME(seed, arm);
    writeFileSync(jobFile(runDir, name), workerOutput(body));
    writeFileSync(jobFile(runDir, name.replace(/\.json$/, '.steady')), '');
  }

  // Verdict (spec 4) as judgeV8 writes it: M = ceil(7 N / 150); per seed numericPairGate with the gate seed on the four verdict arms; pass only when every seed passes.
  // The rule has the runner's keys in the runner's order; resamples is the test value, so the fixture is unpinned.
  const N = freshIds.length;
  const M = Math.ceil((7 * N) / 150);
  const games = fx.retained.map(p => p.gameId);
  const perSeed = SEEDS.map(seed => {
    const arms = Object.fromEntries(['full', 'none', 'shuffled', 'quarter'].map(a => [a, jobs[`${seed}|${a}`].scores.map(x => x.expected)]));
    const gate = numericPairGate({ arms, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: TEST_OPTIONS.resamples, seed: GATE_SEED, lowerQuantile: 0.025 });
    const quarter = jobs[`${seed}|quarter`].retained.recalledQuarter;
    const full = jobs[`${seed}|full`].retained.recalledFull;
    const previouslyRecalled = quarter.filter(Boolean).length;
    const lost = quarter.filter((x, i) => x && !full[i]).length;
    const retention = { probes: quarter.length, previouslyRecalled, recalledFull: full.filter(Boolean).length, lost };
    const m = gate.comparators;
    const pass = m.none.margin >= M && m.shuffled.margin >= M && m.quarter.margin > 0
      && m.none.lower > 0 && m.shuffled.lower > 0 && m.quarter.lower > 0
      && retention.previouslyRecalled > 0 && retention.lost / retention.previouslyRecalled <= 0.02;
    return { seed, gate, retention, pass };
  });
  const pass = perSeed.every(s => s.pass);
  const outcome = pass ? 'passes' : 'does not pass';
  const rule = { margin: M, n: N, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], quarterMarginAbove: 0, lowerBoundAbove: 0, lowerQuantile: 0.025, gateSeed: GATE_SEED, maxLostShare: 0.02, resamples: TEST_OPTIONS.resamples };
  const verdict = { perSeed, pass, outcome, rule };
  // The summary in the runner's layout (writeSummary and its body in run-engineered-memory-test-v8.mjs). Only the margin, storeCounts and verdict are checked; the rest is descriptive.
  const jobTotal = job => job.scores.reduce((t, x) => t + x.expected, 0);
  const captureShare = p => { const caps = legalFx(p).filter(u => capturedOf(ID(p), u)); return caps.filter(u => lines.get(`${ID(p)}|${u}`).category === 'unknown').length / caps.length; };
  const storeCounts = Object.fromEntries(SEEDS.map(seed => [seed, Object.fromEntries(RUN_ARMS.map(arm => [arm, jobs[`${seed}|${arm}`].counts]).filter(([, c]) => c !== null))]));
  const confirmJobs = SEEDS.flatMap(seed => RUN_ARMS.map(arm => ({ phase: 'confirm', key: RAW_ARMS.includes(arm) ? arm : 'K3', direction: '-', seed, arm })));
  writeJson(join(runDir, 'summary.json'), {
    schema: 'engineered-memory-test-v8', outcome, selectedKey: 'K3', verdict,
    positives: {
      full: Object.fromEntries(SEEDS.map(seed => [seed, ledgers[seed].filter(s => s.value === 1).length])),
      quarter: Object.fromEntries(SEEDS.map(seed => [seed, ledgers[seed].slice(0, Math.floor(ledgers[seed].length / 4)).filter(s => s.value === 1).length])),
    },
    margin: M, excluded,
    candidateCounts: { positions: N, mean: fx.retained.reduce((t, p) => t + candidatesFx(p).length, 0) / N, unknownCaptureShareMean: fx.retained.reduce((t, p) => t + captureShare(p), 0) / N },
    pieceValueTotal: jobs[`${SEEDS[0]}|none`].pieceValue,
    allLegal: SEEDS.map(seed => ({ seed, full: jobs[`${seed}|full`].allLegalScores, none: jobs[`${seed}|none`].allLegalScores })),
    retention: perSeed.map(s => ({ seed: s.seed, ...s.retention })),
    curves: SEEDS.map(seed => ({ seed, eighth: jobTotal(jobs[`${seed}|eighth`]), quarter: jobTotal(jobs[`${seed}|quarter`]), half: jobTotal(jobs[`${seed}|half`]), full: jobTotal(jobs[`${seed}|full`]) })),
    storeCounts, jobs: confirmJobs, peakRssMiB: 0, elapsedSeconds: 0, dryRun: false, scope: 'synthetic test fixture, not a result',
  });
  const partitionSha256 = shaFile(join(runDir, 'partition.json'));
  writeJson(join(runDir, 'manifest.json'), { schema: 'engineered-memory-test-v8-run', status: 'complete', partitionSha256, cacheSha256: v8Digest, volume: 2, chapter: 'Evidence for Learning' });
  return {
    v4Dir, v5Dir, v6Dir, v7Dir, runDir, newPositionsPath, newSelectionPath, newGamesPath, v7PositionsPath,
    v5Files: { 'partition.json': shaFile(join(v5Dir, 'partition.json')) },
    keysPins: { v4: shaFile(join(v4Dir, 'keys.json')), v5: shaFile(join(v5Dir, 'keys.json')) },
    partitionPins: { v6: shaFile(join(v6Dir, 'partition.json')), v7: shaFile(join(v7Dir, 'partition.json')) },
    ledgers, jobBodies: jobs,
    v4Sha: sha(v4Bytes), v5Sha: sha(v5Bytes), outcome, verdict, excluded, freshIds, M,
    decoyIds: { practice: ID(newFile[1]), v4: ID(newFile[3]), fresh: ID(newFile[5]), v6: ID(newFile[6]), v7: ID(newFile[7]) },
  };
}

let work;
let fx;
let built;
let inputs;
let opts;
let configPath;

before(() => {
  work = mkdtempSync(join(tmpdir(), 'audit-v8-'));
  fx = pickFixture(readPositions(POSITIONS_ALL), readPositions(SOURCE_POSITIONS));
  built = buildFixture(work, fx);
  inputs = {
    positionsAll: [...fx.practice, ...fx.testPos],
    positionsV4: fx.v4,
    newPositions: readPositions(built.newPositionsPath),
    v6Positions: readPositions(SOURCE_POSITIONS),
    v7Positions: readPositions(built.v7PositionsPath),
    v4Run: built.v4Dir,
    v5Run: built.v5Dir,
    v6Run: built.v6Dir,
    v7Run: built.v7Dir,
    files: { newSelection: built.newSelectionPath, newGamesPgn: built.newGamesPath, newPositions: built.newPositionsPath, priorSelections: PRIOR_SELECTIONS },
  };
  opts = {
    ...TEST_OPTIONS,
    v4CacheSha256: built.v4Sha,
    v5CacheSha256: built.v5Sha,
    v5Files: built.v5Files,
    newSha256: { selection: shaFile(built.newSelectionPath), gamesPgn: shaFile(built.newGamesPath), positions: shaFile(built.newPositionsPath) },
    priorPartitionPins: built.partitionPins, // test-only: the fixture's own v6 and v7 partitions
    v5PartitionPin: built.v5Files['partition.json'], // test-only: the fixture's own v5 partition (the registered pin is V5_PARTITION_PIN)
    keysPins: built.keysPins, // test-only: the fixture's own keys.json digests (the registered pins are KEYS_PINS)
  };
  // Config file for the CLI test (same inputs as the direct call; the paths use the registration's names).
  const allPath = join(work, 'positions-all.jsonl');
  const v4Path = join(work, 'positions-v4.jsonl');
  writeJsonl(allPath, inputs.positionsAll);
  writeJsonl(v4Path, fx.v4);
  configPath = join(work, 'config.json');
  writeJson(configPath, {
    paths: {
      positionsAll: allPath, positionsV4: v4Path, newPositions: built.newPositionsPath, positionsV6: SOURCE_POSITIONS, positionsV7: built.v7PositionsPath,
      newSelection: built.newSelectionPath, newGamesPgn: built.newGamesPath, priorSelections: PRIOR_SELECTIONS,
      v4Run: built.v4Dir, v5Run: built.v5Dir, v6Run: built.v6Dir, v7Run: built.v7Dir,
    },
    v4CacheSha256: built.v4Sha,
    v5CacheSha256: built.v5Sha,
    newSha256: opts.newSha256,
    v5Files: built.v5Files,
    options: { ...TEST_OPTIONS, priorPartitionPins: built.partitionPins, v5PartitionPin: built.v5Files['partition.json'], keysPins: built.keysPins },
  });
});

after(() => rmSync(work, { recursive: true, force: true }));

const cloneRun = name => {
  const dst = join(work, name);
  cpSync(built.runDir, dst, { recursive: true });
  return dst;
};
// The run's certificate lines (header excluded) and the practice ids, for the ledger corruption tests.
const certLinesOf = dir => readJsonl(join(dir, 'certificates.jsonl')).slice(1);
const practiceSet = () => new Set(fx.practice.map(ID));

test('clean synthetic folder passes all ten checks', () => {
  const report = auditRun(built.runDir, inputs, opts);
  assert.deepEqual(report.checks.map(c => c.name), CHECKS);
  assert.deepEqual(report.checks.filter(c => !c.pass), [], JSON.stringify(report.checks.filter(c => !c.pass)));
  assert.equal(report.pass, true);
  assert.equal(report.pinned, false);
  assert.equal(report.outcome, built.outcome);
  // The gate states M = ceil(7 N / 150) for N = 3 retained positions (a constant floor of 7 would print M = 7).
  assert.equal(built.M, 1);
  assert.match(check(report, 'gate').detail, /M = 1 for 3 test positions/);
  assert.match(check(report, 'jobs').detail, /^24 expected jobs \(3 seeds x 8 arms\)/);
  assert.match(check(report, 'scores').detail, /^18 jobs rebuilt exactly/);
  assert.match(check(report, 'scores').detail, /6 raw and random jobs not rechecked/);
  assert.match(check(report, 'testset').detail, /^3 retained in generator order; 5 excluded \(practice-board 1, earlier-test-board 4\); 8 v5 practice boards/);
  assert.match(check(report, 'permutation').detail, /^3 capture permutations match the ledgers/);
  assert.match(check(report, 'ledger').detail, /^seed 6101: \d+ slots, \d+ safe; seed 6102: /);
  assert.match(check(report, 'certificates').detail, /practice and \d+ test proofs replayed/);
  assert.match(check(report, 'certificates').detail, /ledger slots match their checked practice certificates/);
  assert.match(check(report, 'data').detail, /every position game is in the new selection/);
  assert.match(check(report, 'v5inputs').detail, /^v5 partition\.json SHA-256 matches config/);
  assert.ok(!check(report, 'gate').detail.startsWith('error'), check(report, 'gate').detail);
  // The v7 test board is listed as excluded (earlier-test-board) and is not in the test set.
  const partition = readJson(join(built.runDir, 'partition.json'));
  assert.deepEqual(partition.excluded.find(x => x.id === built.decoyIds.v7), { id: built.decoyIds.v7, reason: 'earlier-test-board' });
  assert.ok(!partition.freshTest.includes(built.decoyIds.v7));
});

test('a job file written as the v7 worker writes it is read and rebuilt by the auditor', () => {
  const dir = cloneRun('worker-layout-jobs');
  // The worker's keys for each arm: allLegalScores for full and none, pieceValue for none, retention for quarter and full, counts null for none.
  const layouts = {
    none: ['allLegalScores', 'counts', 'expectedTotal', 'fingerprint', 'job', 'peakRssMiB', 'pieceValue', 'pipeline', 'scores'],
    quarter: ['counts', 'expectedTotal', 'fingerprint', 'job', 'peakRssMiB', 'pipeline', 'retention', 'scores'],
    full: ['allLegalScores', 'counts', 'expectedTotal', 'fingerprint', 'job', 'peakRssMiB', 'pipeline', 'retention', 'scores'],
  };
  for (const [arm, keys] of Object.entries(layouts)) {
    const text = workerOutput(built.jobBodies[`6101|${arm}`]);
    writeFileSync(jobFile(dir, JOB_NAME(6101, arm)), text);
    assert.deepEqual(Object.keys(JSON.parse(text)).sort(), keys, `${arm} job keys`);
  }
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), []);
  assert.match(check(report, 'scores').detail, /^18 jobs rebuilt exactly/);
});

test('a job with the pre-v7 field names fails scores only', () => {
  const dir = cloneRun('legacy-field-names');
  const path = jobFile(dir, JOB_NAME(6101, 'none'));
  const job = readJson(path);
  // Precondition: the worker layout has both descriptive totals for the none arm.
  assert.equal(typeof job.allLegalScores, 'number');
  assert.equal(typeof job.pieceValue, 'number');
  const { allLegalScores, pieceValue, ...rest } = job;
  writeJson(path, { ...rest, allLegalExpectedTotal: allLegalScores, pieceValueExpectedTotal: pieceValue });
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['scores']);
  assert.match(check(report, 'scores').detail, /confirm-K3---6101-none\.json/);
});

test('an extra row in the v8 cache fails cache only', () => {
  const dir = cloneRun('extra-cache-row');
  const keysPath = join(dir, 'keys.json');
  const keys = readJson(keysPath);
  keys.rows.push('Zextra|a2a3');
  writeJson(keysPath, keys);
  appendFileSync(join(dir, 'kc-cache.f32'), Buffer.alloc(COLUMNS * 4));
  const schemaPath = join(dir, 'cache-schema.json');
  const schema = readJson(schemaPath);
  schema.rows = keys.rows.length;
  schema.fileSha256 = shaFile(join(dir, 'kc-cache.f32'));
  writeJson(schemaPath, schema);
  const manifestPath = join(dir, 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.cacheSha256 = schema.fileSha256;
  writeJson(manifestPath, manifest);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['cache']);
  assert.match(check(report, 'cache').detail, /keys\.json is not exactly/);
});

test('an eighth job built from the quarter slots fails scores only', () => {
  const dir = cloneRun('eighth-from-quarter');
  const quarter = readJson(jobFile(dir, JOB_NAME(6101, 'quarter')));
  const bad = { ...quarter, job: { ...quarter.job, arm: 'eighth' } };
  delete bad.retention;
  writeJson(jobFile(dir, JOB_NAME(6101, 'eighth')), bad);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['scores']);
  assert.match(check(report, 'scores').detail, /confirm-K3---6101-eighth\.json/);
});

test('a quiet move counted as a tied candidate fails scores only', () => {
  // Precondition: the first retained position has a quiet legal move, which the candidate set must not contain.
  assert.ok(fx.retained[0].moves.some(m => !m.capture), 'the position has a quiet move');
  const dir = cloneRun('quiet-in-candidates');
  const path = jobFile(dir, JOB_NAME(6101, 'none'));
  const job = readJson(path);
  const entry = job.scores[0];
  const c = entry.c + 1; // in the none arm every candidate ties at 0, so a quiet move in the set would tie too
  job.scores[0] = { ...entry, c, expected: entry.s / c };
  job.expectedTotal = job.scores.reduce((t, x) => t + x.expected, 0);
  writeJson(path, job);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['scores']);
  assert.match(check(report, 'scores').detail, /confirm-K3---6101-none\.json/);
});

test('a capture permutation with two values swapped fails permutation only', () => {
  const dir = cloneRun('permutation-swapped');
  const path = join(dir, 'permutation-capture-6101.json');
  const perm = readJson(path);
  const j = perm.values.findIndex(v => v !== perm.values[0]);
  // Precondition: the file has two different values to swap.
  assert.ok(j > 0, 'two values differ');
  [perm.values[0], perm.values[j]] = [perm.values[j], perm.values[0]];
  writeJson(path, perm);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['permutation']);
  assert.match(check(report, 'permutation').detail, /permutation-capture-6101\.json/);
});

test('a capture permutation drawn with the 0x5eed salt fails permutation only', () => {
  const dir = cloneRun('permutation-salt-0x5eed');
  const ledger = built.ledgers[6101];
  const indices = shuffleFirst(ledger.map((_, i) => i), ledger.length, mulberry32((6101 ^ 0x5eed) >>> 0));
  const values = indices.map(i => ledger[i].value);
  const correct = readJson(join(dir, 'permutation-capture-6101.json')).values;
  assert.notDeepEqual(values, correct, 'the 0x5eed draw differs from the 0x7ca7 draw');
  writeJson(join(dir, 'permutation-capture-6101.json'), { indices, values });
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['permutation']);
  assert.match(check(report, 'permutation').detail, /permutation-capture-6101\.json/);
});

// The comparison: a recorded pass for a seed the gate fails is rejected. The margin floor itself is tested on synthetic scores (the verdictOf tests below).
test('a seed recorded as passing when the gate fails it fails gate only', () => {
  const dir = cloneRun('recorded-pass-on-failing-seed');
  const summaryPath = join(dir, 'summary.json');
  const summary = readJson(summaryPath);
  // Precondition: a recorded seed fails the gate.
  const at = summary.verdict.perSeed.findIndex(s => !s.pass);
  assert.ok(at >= 0, 'a recorded seed fails the gate');
  summary.verdict.perSeed[at].pass = true;
  writeJson(summaryPath, summary);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, new RegExp(`verdict\\.perSeed\\[${at}\\]\\.pass`));
});

test('a verdict computed with the v7 gate seed fails gate only', () => {
  const dir = cloneRun('v7-gate-seed');
  const summaryPath = join(dir, 'summary.json');
  const summary = readJson(summaryPath);
  const games = fx.retained.map(p => p.gameId);
  const comparators = ['none', 'shuffled', 'quarter'];
  const perSeed = summary.verdict.perSeed.map(s => {
    const arms = Object.fromEntries(['full', 'none', 'shuffled', 'quarter'].map(a => [a, readJson(jobFile(dir, JOB_NAME(s.seed, a))).scores.map(x => x.expected)]));
    const gate = numericPairGate({ arms, games, primary: 'full', comparators, minCorrect: 0, minMargin: 0, resamples: TEST_OPTIONS.resamples, seed: WRONG_GATE_SEED, lowerQuantile: 0.025 });
    // Precondition: the two gate seeds give different lower bounds, otherwise this test shows nothing.
    assert.ok(comparators.some(c => gate.comparators[c].lower !== s.gate.comparators[c].lower), 'the gate seeds differ');
    const m = gate.comparators;
    const pass = m.none.margin >= built.M && m.shuffled.margin >= built.M && m.quarter.margin > 0
      && m.none.lower > 0 && m.shuffled.lower > 0 && m.quarter.lower > 0
      && s.retention.previouslyRecalled > 0 && s.retention.lost / s.retention.previouslyRecalled <= 0.02;
    return { ...s, gate, pass };
  });
  summary.verdict = { ...summary.verdict, perSeed, pass: perSeed.every(s => s.pass), outcome: perSeed.every(s => s.pass) ? 'passes' : 'does not pass' };
  summary.outcome = summary.verdict.outcome;
  writeJson(summaryPath, summary);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, /verdict\.perSeed\[\d\]\.gate/);
});

test('a verdict.rule field altered (gateSeed or margin) fails gate only', () => {
  for (const [field, value] of [['gateSeed', WRONG_GATE_SEED], ['margin', built.M + 1]]) {
    const dir = cloneRun(`rule-${field}`);
    const summaryPath = join(dir, 'summary.json');
    const summary = readJson(summaryPath);
    assert.notEqual(summary.verdict.rule[field], value, `precondition: rule.${field} differs`);
    summary.verdict.rule[field] = value;
    writeJson(summaryPath, summary);
    const report = auditRun(dir, inputs, opts);
    assert.deepEqual(failing(report), ['gate'], field);
    assert.match(check(report, 'gate').detail, new RegExp(`verdict\\.rule\\.${field}`));
  }
});

test('summary.margin altered fails gate only', () => {
  const dir = cloneRun('summary-margin');
  const summaryPath = join(dir, 'summary.json');
  const summary = readJson(summaryPath);
  assert.equal(summary.margin, built.M, 'precondition: summary.margin is M');
  summary.margin = built.M + 1;
  writeJson(summaryPath, summary);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, new RegExp(`^summary\\.margin is ${built.M + 1}, recomputed ${built.M}$`));
});

test('a storeCounts value altered fails gate only', () => {
  const dir = cloneRun('store-counts-value');
  const summaryPath = join(dir, 'summary.json');
  const summary = readJson(summaryPath);
  assert.ok(summary.storeCounts[6101].full.writes > 0, 'precondition: the full store writes');
  summary.storeCounts[6101].full.writes += 1;
  writeJson(summaryPath, summary);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, /storeCounts\.6101\.full\.writes/);
});

test('summary.storeCounts missing fails gate only', () => {
  const dir = cloneRun('store-counts-missing');
  const summaryPath = join(dir, 'summary.json');
  const summary = readJson(summaryPath);
  delete summary.storeCounts;
  writeJson(summaryPath, summary);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, /^storeCounts: null vs /);
});

test('a none arm with a store-count entry fails gate only (the none arm has no store)', () => {
  const dir = cloneRun('store-counts-none-entry');
  const summaryPath = join(dir, 'summary.json');
  const summary = readJson(summaryPath);
  summary.storeCounts[6101].none = null;
  writeJson(summaryPath, summary);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, /storeCounts\.6101\.none/);
});

// Margin floor (spec 4), on synthetic per-game scores of three distinct games with one position each (verdictOf, the gate's pure core).
// The margin of an arm is the sum over games of (full - arm): 0.8 against 1 gives 0.6 over three games, which is below M = ceil(7 * 3 / 150) = 1.
const GATE_OPTS = { gateMargin: 7, testReference: 150, resamples: 200, gateSeed: GATE_SEED, lowerQuantile: 0.025, retentionMax: 0.02 };
const GAMES3 = ['synthetic-a', 'synthetic-b', 'synthetic-c'];
const PASSING_RETENTION = { probes: 3, previouslyRecalled: 3, recalledFull: 3, lost: 0 };
const synthSeeds = (none, quarter) => SEEDS.map(seed => ({ seed, arms: { full: [1, 1, 1], none, shuffled: none, quarter }, retention: PASSING_RETENTION }));

test('margin floor: none and shuffled margins of 0.6 fail M = 1 although every lower bound is positive', () => {
  const v = verdictOf(GAMES3, synthSeeds([0.8, 0.8, 0.8], [0.9, 0.9, 0.9]), GATE_OPTS);
  assert.equal(v.rule.margin, 1);
  assert.equal(v.outcome, 'does not pass');
  for (const s of v.perSeed) {
    const { none, shuffled, quarter } = s.gate.comparators;
    assert.ok(Math.abs(none.margin - 0.6) < 1e-9 && Math.abs(shuffled.margin - 0.6) < 1e-9, `margins are 0.6 (got ${none.margin}, ${shuffled.margin})`);
    // Every criterion except the margin floor holds: the quarter margin and all three lower bounds are above zero.
    assert.ok(quarter.margin > 0 && none.lower > 0 && shuffled.lower > 0 && quarter.lower > 0, 'every other criterion holds');
    assert.equal(s.pass, false, `seed ${s.seed} fails on the margin floor`);
  }
});

test('margin floor: none and shuffled margins of 3 and a quarter margin of 1.5 pass M = 1', () => {
  const v = verdictOf(GAMES3, synthSeeds([0, 0, 0], [0.5, 0.5, 0.5]), GATE_OPTS);
  assert.equal(v.rule.margin, 1);
  assert.equal(v.outcome, 'passes');
  for (const s of v.perSeed) {
    const { none, shuffled, quarter } = s.gate.comparators;
    assert.ok(none.margin >= 1 && shuffled.margin >= 1 && quarter.margin > 0, 'margins reach M');
    assert.equal(s.pass, true, `seed ${s.seed} passes`);
  }
});

test('a run partition whose practice list is reordered fails testset only', () => {
  const dir = cloneRun('partition-practice-reordered');
  const partitionPath = join(dir, 'partition.json');
  const partition = readJson(partitionPath);
  assert.ok(partition.practice.length > 1, 'precondition: more than one practice id');
  partition.practice.reverse();
  writeJson(partitionPath, partition);
  const manifestPath = join(dir, 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.partitionSha256 = shaFile(partitionPath);
  writeJson(manifestPath, manifest);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['testset']);
  assert.match(check(report, 'testset').detail, /^practice\[0\]/);
});

test('a practice-board decoy that is not excluded fails testset only', () => {
  const dir = cloneRun('excluded-in-test-set');
  const partitionPath = join(dir, 'partition.json');
  const partition = readJson(partitionPath);
  partition.freshTest.splice(1, 0, built.decoyIds.practice);
  writeJson(partitionPath, partition);
  const manifestPath = join(dir, 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.partitionSha256 = shaFile(partitionPath);
  writeJson(manifestPath, manifest);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['testset']);
  assert.match(check(report, 'testset').detail, /freshTest/);
});

test('a v6 test board that is not excluded fails testset only', () => {
  const dir = cloneRun('v6-board-in-test-set');
  const partitionPath = join(dir, 'partition.json');
  const partition = readJson(partitionPath);
  partition.freshTest.splice(1, 0, built.decoyIds.v6);
  writeJson(partitionPath, partition);
  const manifestPath = join(dir, 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.partitionSha256 = shaFile(partitionPath);
  writeJson(manifestPath, manifest);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['testset']);
  assert.match(check(report, 'testset').detail, /freshTest/);
});

test('a v7 test board kept in the test set (its exclusion omitted) fails testset only', () => {
  const dir = cloneRun('v7-board-in-test-set');
  const partitionPath = join(dir, 'partition.json');
  const partition = readJson(partitionPath);
  // Precondition: the clean partition excludes the v7 board, so keeping it in freshTest is a change.
  assert.ok(partition.excluded.some(x => x.id === built.decoyIds.v7 && x.reason === 'earlier-test-board'));
  partition.freshTest.splice(1, 0, built.decoyIds.v7);
  partition.excluded = partition.excluded.filter(x => x.id !== built.decoyIds.v7);
  writeJson(partitionPath, partition);
  const manifestPath = join(dir, 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.partitionSha256 = shaFile(partitionPath);
  writeJson(manifestPath, manifest);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['testset']);
  assert.match(check(report, 'testset').detail, /freshTest/);
});

test('a v7 partition whose digest differs from its pin fails testset only', () => {
  const wrong = { ...built.partitionPins, v7: '0'.repeat(64) };
  const report = auditRun(built.runDir, inputs, { ...opts, priorPartitionPins: wrong });
  assert.deepEqual(failing(report), ['testset']);
  assert.match(check(report, 'testset').detail, /v7 partition\.json SHA-256 differs from its test value/);
});

test('a practice certificate line moved after the test lines fails certificates only', () => {
  const dir = cloneRun('practice-after-test');
  const certPath = join(dir, 'certificates.jsonl');
  const rows = readJsonl(certPath);
  const practiceIds = practiceSet();
  const at = rows.findIndex(c => practiceIds.has(c.id));
  // Precondition: a practice line sits in the practice block (not the header) and test lines follow it.
  assert.ok(at > 0 && rows.slice(at + 1).some(c => !practiceIds.has(c.id)), 'a practice line precedes test lines');
  const [moved] = rows.splice(at, 1);
  rows.push(moved);
  writeJsonl(certPath, rows);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['certificates']);
  assert.match(check(report, 'certificates').detail, /practice line .* after a test line/);
});

test('two practice proofs that trade places fail certificates only', () => {
  const dir = cloneRun('practice-proof-swapped');
  const v5 = join(work, 'v5-practice-proof-swapped');
  cpSync(built.v5Dir, v5, { recursive: true });
  const practiceIds = practiceSet();
  // The proofs trade places in the v5 copy and in the run copy alike, so v5inputs still agrees with v5.
  const swapProofs = file => {
    const rows = readJsonl(file);
    const withProof = rows.map((c, i) => ({ c, i })).filter(({ c }) => practiceIds.has(c.id) && c.proof !== null);
    const a = withProof[0];
    const b = withProof.find(x => x.c.certificateSha256 !== a.c.certificateSha256);
    assert.ok(a && b, 'two practice proofs with different hashes exist');
    [rows[a.i].proof, rows[b.i].proof] = [rows[b.i].proof, rows[a.i].proof];
    writeJsonl(file, rows);
  };
  swapProofs(join(dir, 'certificates.jsonl'));
  swapProofs(join(v5, 'certificates.jsonl'));
  const report = auditRun(dir, { ...inputs, v5Run: v5 }, opts);
  assert.deepEqual(failing(report), ['certificates']);
  assert.match(check(report, 'certificates').detail, /^\d+ problems; first: /);
});

// Ledger corruptions (spec 1 and 3, the ledger check). Each edits the run's ledger-6101.jsonl only.
const LEDGER = 'ledger-6101.jsonl';

test('a ledger missing one eligible capture fails ledger only', () => {
  const dir = cloneRun('ledger-missing-capture');
  const slots = readJsonl(join(dir, LEDGER));
  assert.ok(slots.length >= 3, 'at least three ledger slots');
  slots.splice(2, 1);
  writeJsonl(join(dir, LEDGER), slots);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['ledger']);
  assert.match(check(report, 'ledger').detail, /has \d+ slots, expected \d+/);
  assert.match(check(report, 'ledger').detail, /is missing \S+\|\S+/);
});

test('a ledger with one capture duplicated fails ledger only', () => {
  const dir = cloneRun('ledger-duplicated-capture');
  const slots = readJsonl(join(dir, LEDGER));
  slots.push({ ...slots[0], slot: slots.length });
  writeJsonl(join(dir, LEDGER), slots);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['ledger']);
  assert.match(check(report, 'ledger').detail, /repeats \S+\|\S+ \(2 times\)/);
});

test('a ledger with a quiet move fails ledger only', () => {
  const dir = cloneRun('ledger-quiet-move');
  const practiceIds = practiceSet();
  const quiet = certLinesOf(dir).find(c => practiceIds.has(c.id) && c.category === 'quiet');
  // Precondition: a practice quiet move with a certificate exists.
  assert.ok(quiet, 'a practice quiet move exists');
  const slots = readJsonl(join(dir, LEDGER));
  slots[3] = { slot: 3, id: quiet.id, uci: quiet.uci, category: 'quiet', value: -1, certificateSha256: quiet.certificateSha256 };
  writeJsonl(join(dir, LEDGER), slots);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['ledger']);
  assert.match(check(report, 'ledger').detail, /slot 3 \(\S+\|\S+\) is quiet/);
});

test('a ledger with an unknown capture fails ledger only', () => {
  const dir = cloneRun('ledger-unknown-capture');
  // Precondition: a practice capture with an unknown certificate exists (the position file labels it unknown).
  const unknown = fx.practice.flatMap(p => p.moves.filter(m => m.capture && m.outcome === 'unknown').map(m => ({ id: ID(p), uci: m.uci })))[0];
  assert.ok(unknown, 'a practice unknown capture exists');
  const slots = readJsonl(join(dir, LEDGER));
  slots[2] = { slot: 2, id: unknown.id, uci: unknown.uci, category: 'unknown', value: null, certificateSha256: null };
  writeJsonl(join(dir, LEDGER), slots);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['ledger']);
  assert.match(check(report, 'ledger').detail, /slot 2 \(\S+\|\S+\) is unknown/);
});

test('a ledger slot with a wrong certificateSha256 fails ledger only', () => {
  const dir = cloneRun('ledger-wrong-hash');
  const slots = readJsonl(join(dir, LEDGER));
  // Precondition: the slot holds a certificate hash to change.
  assert.notEqual(slots[2].certificateSha256, '0'.repeat(64));
  slots[2].certificateSha256 = '0'.repeat(64);
  writeJsonl(join(dir, LEDGER), slots);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['ledger']);
  assert.match(check(report, 'ledger').detail, /ledger-6101\.jsonl\[2\]\.certificateSha256/);
});

test('a ledger with two slots swapped (wrong order) fails ledger only', () => {
  const dir = cloneRun('ledger-swapped-order');
  const slots = readJsonl(join(dir, LEDGER));
  // Precondition: the two slots differ.
  assert.notDeepEqual(slots[1], slots[4]);
  [slots[1], slots[4]] = [slots[4], slots[1]];
  writeJsonl(join(dir, LEDGER), slots);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['ledger']);
  assert.match(check(report, 'ledger').detail, /ledger-6101\.jsonl\[1\]/);
});

test('a ledger built with the wrong seed fails ledger only', () => {
  const dir = cloneRun('ledger-wrong-seed');
  // Precondition: the seed 6102 order differs from the seed 6101 order.
  assert.notDeepEqual(built.ledgers[6102], built.ledgers[6101], 'the seeds give different orders');
  writeJsonl(join(dir, LEDGER), built.ledgers[6102]);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['ledger']);
  assert.match(check(report, 'ledger').detail, /ledger-6101\.jsonl\[\d+\]/);
});

test('a missing ledger file fails ledger only', () => {
  const dir = cloneRun('ledger-missing-file');
  rmSync(join(dir, LEDGER));
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['ledger']);
  assert.match(check(report, 'ledger').detail, /ledger-6101\.jsonl missing/);
});

test('prior selections other than the pinned three fail data only', () => {
  const report = auditRun(built.runDir, { ...inputs, files: { ...inputs.files, priorSelections: PRIOR_SELECTIONS.slice(0, 2) } }, opts);
  assert.deepEqual(failing(report), ['data']);
  assert.match(check(report, 'data').detail, /prior selections must be exactly the 3 pinned files/);
});

test('a prior selection that holds the new games fails data only', () => {
  const report = auditRun(built.runDir, { ...inputs, files: { ...inputs.files, priorSelections: [...PRIOR_SELECTIONS.slice(0, 2), built.newSelectionPath] } }, opts);
  assert.deepEqual(failing(report), ['data']);
  assert.match(check(report, 'data').detail, /new selected games are in the prior selections/);
});

test('a new position whose game is outside the new selection fails data only', () => {
  // The selection without one retained game: the config digest follows the file, so only the new check fails.
  const ids = readJson(built.newSelectionPath).ids.filter(id => id !== fx.retained[0].gameId);
  const alt = join(work, 'new-selection-missing-game.json');
  writeJson(alt, { ids });
  const report = auditRun(built.runDir, { ...inputs, files: { ...inputs.files, newSelection: alt } }, { ...opts, newSha256: { ...opts.newSha256, selection: shaFile(alt) } });
  assert.deepEqual(failing(report), ['data']);
  assert.match(check(report, 'data').detail, /games of the new positions are not in the new selection/);
});

test('NEW_PINS, PRIOR_SELECTION_PINS and PRIOR_PARTITION_PINS match the files on disk', () => {
  for (const [name, path] of Object.entries(REGISTERED_901_1200)) assert.equal(shaFile(path), NEW_PINS[name], `${name} digest`);
  PRIOR_SELECTIONS.forEach((path, i) => assert.equal(shaFile(path), PRIOR_SELECTION_PINS[i], `prior selection ${i + 1} digest`));
  for (const [name, path] of Object.entries(EARLIER_PARTITIONS)) assert.equal(shaFile(path), PRIOR_PARTITION_PINS[name], `${name} partition digest`);
});

test('without a test override the registered v5 partition and keys pins are enforced', () => {
  const report = auditRun(built.runDir, inputs, { ...opts, v5PartitionPin: undefined, keysPins: undefined });
  assert.deepEqual(failing(report), ['v5inputs', 'cache']);
  assert.match(check(report, 'v5inputs').detail, /^v5 partition\.json SHA-256 differs from its pinned value$/);
  assert.match(check(report, 'cache').detail, /v4 keys\.json SHA-256 \w+ differs from its pinned value/);
  assert.match(check(report, 'cache').detail, /v5 keys\.json SHA-256 \w+ differs from its pinned value/);
  assert.equal(report.pinned, false);
});

test('a v5 partition with reordered practice ids and a config hash updated to match fails v5inputs', () => {
  const v5 = join(work, 'v5-practice-reordered');
  cpSync(built.v5Dir, v5, { recursive: true });
  const partitionPath = join(v5, 'partition.json');
  const partition = readJson(partitionPath);
  partition.practice.reverse();
  writeJson(partitionPath, partition);
  // The config names the new digest, so the config comparison passes; the pinned digest (the fixture's own, as a test override) catches the change.
  const report = auditRun(built.runDir, { ...inputs, v5Run: v5 }, { ...opts, v5Files: { 'partition.json': shaFile(partitionPath) } });
  assert.ok(failing(report).includes('v5inputs'), JSON.stringify(failing(report)));
  assert.match(check(report, 'v5inputs').detail, /^v5 partition\.json SHA-256 differs from its test value$/);
  assert.equal(report.pinned, false);
});

test('a v4 keys.json with changed bytes (same rows) fails cache only', () => {
  const v4 = join(work, 'v4-keys-bytes');
  cpSync(built.v4Dir, v4, { recursive: true });
  const keysPath = join(v4, 'keys.json');
  writeFileSync(keysPath, JSON.stringify(readJson(keysPath))); // the same row map, compact bytes
  const report = auditRun(built.runDir, { ...inputs, v4Run: v4 }, opts);
  assert.deepEqual(failing(report), ['cache']);
  assert.match(check(report, 'cache').detail, /^v4 keys\.json SHA-256 \w+ differs from its test value$/);
});

test('a v5 keys.json with changed bytes (same rows) fails cache only', () => {
  const v5 = join(work, 'v5-keys-bytes');
  cpSync(built.v5Dir, v5, { recursive: true });
  const keysPath = join(v5, 'keys.json');
  writeFileSync(keysPath, JSON.stringify(readJson(keysPath))); // the same row map, compact bytes
  const report = auditRun(built.runDir, { ...inputs, v5Run: v5 }, opts);
  assert.deepEqual(failing(report), ['cache']);
  assert.match(check(report, 'cache').detail, /^v5 keys\.json SHA-256 \w+ differs from its test value$/);
});

test('pinnedOf: the registered values pin a report; any v5 or keys override unpins it', () => {
  const registered = {
    v4CacheSha256: `699ec93b${'1'.repeat(51)}a20e5`, v5CacheSha256: V5_CACHE_PIN,
    positionsAllSha256: `4483226c${'2'.repeat(52)}fa36`, v6PositionsSha256: `e78cbb24${'3'.repeat(52)}0128`, v7PositionsSha256: `b65ecd1f${'4'.repeat(52)}5afc`,
    newSha256: { ...NEW_PINS },
  };
  assert.equal(pinnedOf(registered), true);
  const overrides = [
    { v5PartitionPin: V5_PARTITION_PIN }, // any override unpins, even one equal to the registered value
    { v5PartitionPin: '0'.repeat(64) },
    { keysPins: KEYS_PINS },
    { keysPins: { ...KEYS_PINS, v5: '0'.repeat(64) } },
    { v5CacheSha256: '0'.repeat(64) },
    { v5CacheSha256: undefined },
  ];
  for (const o of overrides) assert.equal(pinnedOf({ ...registered, ...o }), false, JSON.stringify(o));
});

test('the auditor imports no v5-v8 runner, worker or task module', () => {
  const imports = readFileSync(AUDITOR, 'utf8').split('\n').filter(line => line.startsWith('import '));
  assert.ok(imports.length >= 5, 'the auditor has its imports');
  for (const line of imports) assert.doesNotMatch(line, /engineered-memory|memory-v\d-worker|run-engineered|-runner|-task/, line);
});

test('CLI: a dry run of a clean folder exits 0; a full run that is not pinned exits 1; a tampered folder exits 1', () => {
  const run = (dir, extra = []) => spawnSync(process.execPath, [AUDITOR, '--run', dir, '--config', configPath, ...extra], { encoding: 'utf8' });
  // Full run on the fixture: every check passes, but the fixture is not pinned, so the run is not accepted.
  const full = cloneRun('cli-full');
  const fullRun = run(full);
  assert.equal(fullRun.status, 1, fullRun.stdout + fullRun.stderr);
  assert.match(fullRun.stdout, /AUDIT NOT ACCEPTED/);
  assert.equal(readJson(join(full, 'audit.json')).pass, true);
  assert.equal(readJson(join(full, 'audit.json')).pinned, false);
  // Workers are child processes; two workers give the same checks.
  const parallel = cloneRun('cli-parallel');
  const parallelRun = run(parallel, ['--workers', '2']);
  assert.equal(parallelRun.status, 1, parallelRun.stdout + parallelRun.stderr);
  assert.match(parallelRun.stdout, /AUDIT NOT ACCEPTED/);
  assert.equal(readJson(join(parallel, 'audit.json')).pass, true);
  // Dry run: the summary must say dryRun; the test set limit is the retained count (3), so the same folder passes.
  const dry = cloneRun('cli-dry-run');
  const drySummary = readJson(join(dry, 'summary.json'));
  drySummary.dryRun = true;
  writeJson(join(dry, 'summary.json'), drySummary);
  const dryRun = run(dry, ['--dry-run', 'yes']);
  assert.equal(dryRun.status, 0, dryRun.stdout + dryRun.stderr);
  assert.match(dryRun.stdout, /AUDIT PASS/);
  const dir = cloneRun('cli-tampered');
  const path = jobFile(dir, JOB_NAME(6101, 'full'));
  const job = readJson(path);
  job.scores[0].expected = job.scores[0].expected === 0 ? 0.5 : 0;
  writeJson(path, job);
  const failed = run(dir);
  assert.equal(failed.status, 1, failed.stderr);
  assert.match(failed.stdout, /AUDIT FAIL/);
  const report = readJson(join(dir, 'audit.json'));
  assert.equal(report.pass, false);
  assert.deepEqual(report.checks.map(c => c.name), CHECKS);
});

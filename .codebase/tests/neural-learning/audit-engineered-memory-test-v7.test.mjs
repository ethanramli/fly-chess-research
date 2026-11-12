import { createHash as createHashEarly } from 'node:crypto';
import { readFileSync as readFileSyncEarly } from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { Chess } from 'chess.js';
import { auditRun, NEW_PINS } from '../../scripts/neural-learning/audit-engineered-memory-test-v7.mjs';
import { certifyCaptureRetentionAction } from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import { NearestEpisodeMemory, rmsScaler } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

// Synthetic v7 folders built from real positions, with 6 KC columns, three cache folders (v4, v5, v7) and a v6 run folder in the temp dir.
// Column 0 of each cache row carries the certified value (+1 safe, -1 otherwise), the other columns are 0. A fixture for consistency checks, not a result.
// Stand-in data: the 601-900 games do not exist yet, so the fixture's new games are the 301-600 games, and its only prior selection is games 1-300.
// The writer below follows the v7 proposal (sections 1-6) and shares the pinned libraries but none of the auditor's code.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const POSITIONS_ALL = join(ROOT, 'runs', 'restart-data-2026-11-04', 'capture-choice-positions-max50-v1', 'positions.jsonl');
const DATA_301_600 = join(ROOT, 'runs', 'restart-data-2026-11-05');
const NEW_POSITIONS = join(DATA_301_600, 'capture-choice-positions-301-600-v1', 'positions.jsonl');
const NEW_SELECTION = join(DATA_301_600, 'games-train-301-600', 'selection.json');
const NEW_GAMES = join(DATA_301_600, 'games-train-301-600', 'games.pgn');
const PRIOR_SELECTION = join(ROOT, 'runs', 'restart-data-2026-11-03', 'games-train', 'selection.json');
// The registered games 601-900 files (the digests in NEW_PINS). Read only: the registration and the hashes are checked, nothing is run.
const REGISTRATION = join(ROOT, 'python actions', 'memory', 'engineered-memory-test-v7-step.json');
const REGISTERED_601_900 = {
  selection: join(DATA_301_600, 'games-train-601-900', 'selection.json'),
  gamesPgn: join(DATA_301_600, 'games-train-601-900', 'games.pgn'),
  positions: join(DATA_301_600, 'capture-choice-positions-601-900-v1', 'positions.jsonl'),
};
const AUDITOR = join(ROOT, '.codebase', 'scripts', 'neural-learning', 'audit-engineered-memory-test-v7.mjs');
const COLUMNS = 6;
const SEEDS = [6101, 6102, 6103];
const PRACTICE_GAMES = 2;
const SCORE_CHUNK = 10; // the worker's chunk size for the all-legal total
const TASK = { objective: 'capture-retention', plies: 1 };
const REQUIRED = ['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs'];
const CHECKS = ['data', 'testset', 'v5inputs', 'certificates', 'cache', 'permutation', 'jobs', 'scores', 'gate'];
function shaFileEarly(path) { return createHashEarly('sha256').update(readFileSyncEarly(path)).digest('hex'); }
const TEST_OPTIONS = { columns: COLUMNS, resamples: 200, practiceGames: PRACTICE_GAMES, rawRandom: false, priorSelectionPins: [shaFileEarly(PRIOR_SELECTION)] };
const GATE_SEED = 20261107;
const WRONG_GATE_SEED = 20261106;
const ZEROS = { writes: 0, unknown: 0, replacements: 0, evictions: 0, identicalConsistent: 0, identicalConflicting: 0 };
const ARMS = ['full', 'half', 'quarter', 'eighth', 'shuffled', 'none'];
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

// The output object of memory-v7-worker.mjs (its last writeAtomic call), copied: the same keys and the same optional spreads.
// The worker's variables are the arguments here; allLegalScores, pieceValue and retained are null when the worker does not compute them.
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
// Spec 1: a retained position also needs a safe and an unsafe capture (the generator's qualifies rule).
const qualifies = p => Boolean(eligible(p)) && p.moves.some(m => m.capture && m.outcome === 'safe') && p.moves.some(m => m.capture && m.outcome === 'unsafe');

// Writer's draw (committed 4-move schedule) and permutation, as the v4 and v5 rules.
function draw(seed, id, sortedUcis) {
  const a = [...sortedUcis];
  const n = a.length;
  const m = Math.min(4, n);
  const rng = mulberry32((seed ^ parseInt(sha(id).slice(0, 8), 16)) >>> 0);
  for (let i = 0; i < m; i++) { const j = i + Math.floor(rng() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, m);
}
function permuteWriter(seed, known) {
  const K = known.length;
  const indices = Array.from({ length: K }, (_, i) => i);
  const rng = mulberry32((seed ^ 0x5eed) >>> 0);
  for (let i = 0; i < K; i++) { const j = i + Math.floor(rng() * (K - i)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
  return { indices, values: indices.map(t => known[t].value) };
}
// Writer's capture permutation (spec 3): the known capture slots, permuted with the 0x7ca7 salt; the file is aligned to the whole ledger.
function capturePermWriter(seed, slots, isCapture) {
  const at = [];
  slots.forEach((s, i) => { if (s.value !== null && isCapture(s)) at.push(i); });
  const K = at.length;
  const indices = Array.from({ length: K }, (_, i) => i);
  const rng = mulberry32((seed ^ 0x7ca7) >>> 0);
  for (let i = 0; i < K; i++) { const j = i + Math.floor(rng() * (K - i)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
  const values = slots.map(s => s.value);
  at.forEach((slotIndex, t) => { values[slotIndex] = slots[at[indices[t]]].value; });
  return { indices, values };
}

// Chooses 3 games (positions 4 each), with the practice games and test game ordered by the v3 split hash. Conditions (fixture
// choice, not a result): the first two practice positions have draws with no safe move for every seed, so the quarter store
// holds only non-safe values; practice draws hold a safe and an unsafe capture for every seed (a non-trivial capture permutation).
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
  // The v6 test board: a fresh position from a game not used above, with a board no retained position has.
  const v6Real = fresh.find(p => !usedGames.has(p.gameId) && !retainedBoards.has(PIECES(p.fen)));
  assert.ok(v6Real, 'a v6 test position from another game');
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
    if (practiceBoards.has(PIECES(testPos[1].p.fen))) continue; // a v5 fresh candidate must exist
    const ok = SEEDS.every(seed => {
      if (![a[0], a[1]].every(x => draw(seed, ID(x.p), x.legal).every(u => !isSafe(x.p, u)))) return false;
      const drawn = practice.flatMap(x => draw(seed, ID(x.p), x.legal).map(u => labelOf(x.p, u)));
      return drawn.includes('safe') && drawn.includes('unsafe');
    });
    if (!ok) continue;
    const copy = (p, gameId) => ({ ...p, gameId });
    return {
      practice: practice.map(x => x.p),
      testPos: testPos.map(x => x.p),
      v4: [a[0].p, b[0].p, t[0].p],
      retained,
      v6Real,
      decoys: { practice: copy(practice[7].p, 'decoyPractice'), v4Test: copy(testPos[0].p, 'decoyV4'), fresh: copy(testPos[1].p, 'decoyFresh'), v6: copy(v6Real, 'decoyV6') },
    };
  }
  throw new Error('no fixture games found');
}

// Writes the v4, v5, v6 and v7 folders and the synthetic new positions file; computes every job and the verdict the way the runner does.
function buildFixture(dir, fx) {
  const v4Dir = join(dir, 'v4-run');
  const v5Dir = join(dir, 'v5-run');
  const v6Dir = join(dir, 'v6-run');
  const runDir = join(dir, 'v7-run');
  for (const d of [v4Dir, v5Dir, v6Dir, join(runDir, 'jobs')]) mkdirSync(d, { recursive: true });
  const all = [...fx.practice, ...fx.testPos];
  const newFile = [fx.retained[0], fx.decoys.practice, fx.retained[1], fx.decoys.v4Test, fx.retained[2], fx.decoys.fresh, fx.decoys.v6];
  const newPositionsPath = join(dir, 'new-positions.jsonl');
  writeJsonl(newPositionsPath, newFile);

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

  // v6 run folder: its test ids only (the v6 test boards are read from the 301-600 positions file by these ids).
  writeJson(join(v6Dir, 'partition.json'), { practice: [], foldA: [], foldB: [], freshTest: [ID(fx.v6Real)], excluded: [], counts: { freshTest: 1 } });

  // v7 test set (spec 2): practice board, then any earlier test board (v4, v5 fresh, v6); retained in generator order.
  const v4TestBoards = new Set(fx.v4.filter(p => testGames.includes(p.gameId)).map(p => PIECES(p.fen)));
  const v5FreshBoards = new Set(v5Fresh.map(p => PIECES(p.fen)));
  const v6Boards = new Set([PIECES(fx.v6Real.fen)]);
  const excluded = [];
  const freshIds = [];
  for (const p of newFile) {
    const b = PIECES(p.fen);
    const reason = practiceBoards.has(b) ? 'practice-board' : (v4TestBoards.has(b) || v5FreshBoards.has(b) || v6Boards.has(b)) ? 'earlier-test-board' : null;
    if (reason) excluded.push({ id: ID(p), reason }); else freshIds.push(ID(p));
  }
  assert.equal(freshIds.length, 3);
  assert.equal(excluded.length, 4);
  writeJson(join(runDir, 'partition.json'), {
    practice: practice.map(ID), foldA: [], foldB: [], freshTest: freshIds, excluded,
    counts: { newPositions: newFile.length, practice: practice.length, freshTest: freshIds.length, excluded: excluded.length },
  });

  // Keys and cache rows: v4 keys; v5 keys = practice and fresh moves not in v4; v7 keys = retained moves not in v4 or v5. The v6 cache is not used.
  const keysOf = list => list.flatMap(p => legalOf(p).map(u => `${ID(p)}|${u}`));
  const v4Keys = keysOf(fx.v4);
  const v4KeySet = new Set(v4Keys);
  const v5Keys = keysOf([...practice, ...v5Fresh]).filter(k => !v4KeySet.has(k));
  const v5KeySet = new Set(v5Keys);
  const v7Keys = keysOf(fx.retained).filter(k => !v4KeySet.has(k) && !v5KeySet.has(k));
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
  const v7Bytes = writeCache(runDir, v7Keys);
  const v7Digest = sha(v7Bytes);
  writeJson(join(runDir, 'cache-schema.json'), { rows: v7Keys.length + 1, columns: COLUMNS, dtype: 'float32', byteOrder: 'little', kcIndices: [0, 1, 2, 3, 4, 5], kcRootIds: [], fileSha256: v7Digest, pins: {} });
  const rowsByKey = new Map([...v4Keys, ...v5Keys, ...v7Keys].map(k => [k, rowOfKey(k)]));

  // Ledgers, permutations and schedules (v5 files, copied into v7), plus the v7 capture permutation.
  const v5Files = {};
  const ledgers = {};
  const perms = {};
  const capPerms = {};
  const schedules = Object.fromEntries(SEEDS.map(seed => [seed, practice.map(p => ({ id: ID(p), moves: draw(seed, ID(p), legalOf(p)) }))]));
  writeJson(join(v5Dir, 'schedules.json'), schedules);
  for (const seed of SEEDS) {
    const slots = [];
    for (const { id, moves } of schedules[seed]) {
      for (const uci of moves) {
        const line = lines.get(`${id}|${uci}`);
        slots.push({ slot: slots.length, id, uci, category: line.category, value: line.value, certificateSha256: line.certificateSha256 });
      }
    }
    ledgers[seed] = slots;
    perms[seed] = permuteWriter(seed, slots.filter(s => s.value !== null));
    capPerms[seed] = capturePermWriter(seed, slots, s => capturedOf(s.id, s.uci));
    writeJsonl(join(v5Dir, `ledger-${seed}.jsonl`), slots);
    writeJson(join(v5Dir, `permutation-${seed}.json`), perms[seed]);
  }
  for (const name of ['schedules.json', ...SEEDS.flatMap(s => [`ledger-${s}.jsonl`, `permutation-${s}.json`])]) {
    writeFileSync(join(runDir, name), readFileSync(join(v5Dir, name)));
  }
  for (const seed of SEEDS) writeJson(join(runDir, `permutation-capture-${seed}.json`), capPerms[seed]);
  for (const name of ['partition.json', 'schedules.json', ...SEEDS.flatMap(s => [`ledger-${s}.jsonl`, `permutation-${s}.json`])]) v5Files[name] = shaFile(join(v5Dir, name));

  // Certificates: v5 has the practice and fresh lines. v7 is the header, the copied v5 practice block, then the test block; each block in id/uci order.
  const v5Lines = sortLines([...practice, ...v5Fresh].flatMap(p => legalOf(p).map(u => lines.get(`${ID(p)}|${u}`))));
  writeJsonl(join(v5Dir, 'certificates.jsonl'), [header, ...v5Lines]);
  const practiceSet = new Set(practice.map(ID));
  const v7Practice = v5Lines.filter(c => practiceSet.has(c.id));
  const v7Test = sortLines(fx.retained.flatMap(p => legalOf(p).map(u => lines.get(`${ID(p)}|${u}`))));
  writeJsonl(join(runDir, 'certificates.jsonl'), [header, ...v7Practice, ...v7Test]);

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
  // Worker grouping: one chunk sum per SCORE_CHUNK positions, added in order (memory-v7-worker.mjs).
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

  // Verdict (spec 4): M = ceil(7 N / 150); per seed numericPairGate with gate seed 20261107 on the four verdict arms; pass only when every seed passes.
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
  const verdict = { perSeed, pass, outcome, rule: { M: 'ceil(7 N / 150)' } };
  writeJson(join(runDir, 'summary.json'), { schema: 'engineered-memory-test-v7', outcome, verdict, dryRun: false, scope: 'synthetic test fixture, not a result' });
  const partitionSha256 = shaFile(join(runDir, 'partition.json'));
  writeJson(join(runDir, 'manifest.json'), { schema: 'engineered-memory-test-v7-run', status: 'complete', partitionSha256, cacheSha256: v7Digest, volume: 2, chapter: 'Evidence for Learning' });
  return {
    v4Dir, v5Dir, v6Dir, runDir, newPositionsPath, v5Files, jobBodies: jobs,
    v4Sha: sha(v4Bytes), v5Sha: sha(v5Bytes), outcome, verdict, excluded, freshIds, M,
    decoyIds: { practice: ID(newFile[1]), v4: ID(newFile[3]), fresh: ID(newFile[5]), v6: ID(newFile[6]) },
  };
}

let work;
let fx;
let built;
let inputs;
let opts;
let configPath;

before(() => {
  work = mkdtempSync(join(tmpdir(), 'audit-v7-'));
  fx = pickFixture(readPositions(POSITIONS_ALL), readPositions(NEW_POSITIONS));
  built = buildFixture(work, fx);
  inputs = {
    positionsAll: [...fx.practice, ...fx.testPos],
    positionsV4: fx.v4,
    newPositions: readPositions(built.newPositionsPath),
    v6Positions: readPositions(NEW_POSITIONS),
    v4Run: built.v4Dir,
    v5Run: built.v5Dir,
    v6Run: built.v6Dir,
    files: { newSelection: NEW_SELECTION, newGamesPgn: NEW_GAMES, newPositions: built.newPositionsPath, priorSelections: [PRIOR_SELECTION] },
  };
  opts = {
    ...TEST_OPTIONS,
    v4CacheSha256: built.v4Sha,
    v5CacheSha256: built.v5Sha,
    v5Files: built.v5Files,
    newSha256: { selection: shaFile(NEW_SELECTION), gamesPgn: shaFile(NEW_GAMES), positions: shaFile(built.newPositionsPath) },
  };
  // Config file for the CLI test (same inputs as the direct call; the paths use the registration's names).
  const allPath = join(work, 'positions-all.jsonl');
  const v4Path = join(work, 'positions-v4.jsonl');
  writeJsonl(allPath, inputs.positionsAll);
  writeJsonl(v4Path, fx.v4);
  configPath = join(work, 'config.json');
  writeJson(configPath, {
    paths: { positionsAll: allPath, positionsV4: v4Path, newPositions: built.newPositionsPath, positionsV6: NEW_POSITIONS, newSelection: NEW_SELECTION, newGamesPgn: NEW_GAMES, priorSelections: [PRIOR_SELECTION], v4Run: built.v4Dir, v5Run: built.v5Dir, v6Run: built.v6Dir },
    v4CacheSha256: built.v4Sha,
    v5CacheSha256: built.v5Sha,
    newSha256: opts.newSha256,
    v5Files: built.v5Files,
    options: TEST_OPTIONS,
  });
});

after(() => rmSync(work, { recursive: true, force: true }));

const cloneRun = name => {
  const dst = join(work, name);
  cpSync(built.runDir, dst, { recursive: true });
  return dst;
};

test('clean synthetic folder passes all nine checks', () => {
  const report = auditRun(built.runDir, inputs, opts);
  assert.deepEqual(report.checks.map(c => c.name), CHECKS);
  assert.deepEqual(report.checks.filter(c => !c.pass), [], JSON.stringify(report.checks.filter(c => !c.pass)));
  assert.equal(report.pass, true);
  assert.equal(report.pinned, false);
  assert.equal(report.outcome, built.outcome);
  // Precondition for the margin test: the clean gate passes, so a wrong M can flip it.
  assert.equal(built.outcome, 'passes');
  assert.equal(built.M, 1);
  assert.match(check(report, 'jobs').detail, /^24 expected jobs \(3 seeds x 8 arms\)/);
  assert.match(check(report, 'scores').detail, /^18 jobs rebuilt exactly/);
  assert.match(check(report, 'scores').detail, /6 raw and random jobs not rechecked/);
  assert.match(check(report, 'testset').detail, /^3 retained in generator order; 4 excluded \(practice-board 1, earlier-test-board 3\); 8 v5 practice boards/);
  assert.match(check(report, 'permutation').detail, /^3 capture permutations match the ledgers/);
  assert.match(check(report, 'certificates').detail, /practice and \d+ test proofs replayed/);
  assert.match(check(report, 'certificates').detail, /ledger slots match their checked practice certificates/);
  assert.ok(!check(report, 'gate').detail.startsWith('error'), check(report, 'gate').detail);
});

test('a job file written as memory-v7-worker.mjs writes it is read and rebuilt by the auditor', () => {
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

test('an extra row in the v7 cache fails cache only', () => {
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

test('a capture permutation that moves a quiet slot fails permutation only', () => {
  const dir = cloneRun('quiet-moved-in-permutation');
  const path = join(dir, 'permutation-capture-6101.json');
  const perm = readJson(path);
  const ledger = readJsonl(join(built.v5Dir, 'ledger-6101.jsonl'));
  const quiet = ledger.findIndex(s => s.category === 'quiet');
  // A capture slot whose permuted value is +1 (quiet slots hold -1 in the file), so the swap changes the quiet slot's value.
  const safe = ledger.findIndex((s, i) => (s.category === 'safe' || s.category === 'unsafe') && perm.values[i] === 1);
  assert.ok(quiet >= 0 && safe >= 0, 'a quiet slot and a capture slot holding +1 exist');
  assert.notEqual(perm.values[quiet], perm.values[safe], 'the swap changes the file');
  [perm.values[quiet], perm.values[safe]] = [perm.values[safe], perm.values[quiet]];
  writeJson(path, perm);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['permutation']);
  assert.match(check(report, 'permutation').detail, /permutation-capture-6101\.json/);
});

test('a capture permutation drawn with the 0x5eed salt fails permutation only', () => {
  const dir = cloneRun('permutation-salt-0x5eed');
  const ledger = readJsonl(join(built.v5Dir, 'ledger-6101.jsonl'));
  // Capture slots of the practice boards (the fixture's own boards, replayed).
  const captures = new Set();
  for (const p of fx.practice) for (const m of boardOf(p).moves({ verbose: true })) if (m.captured) captures.add(`${ID(p)}|${UCI(m)}`);
  const at = [];
  ledger.forEach((s, i) => { if (s.value !== null && captures.has(`${s.id}|${s.uci}`)) at.push(i); });
  const K = at.length;
  assert.ok(K >= 2, 'at least two known capture slots');
  // Spec 3 with the wrong salt: the same forward Fisher-Yates over the capture slots, seeded with seed ^ 0x5eed.
  const rng = mulberry32((6101 ^ 0x5eed) >>> 0);
  const indices = Array.from({ length: K }, (_, i) => i);
  for (let i = 0; i < K; i++) { const j = i + Math.floor(rng() * (K - i)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
  const values = ledger.map(s => s.value);
  at.forEach((slot, t) => { values[slot] = ledger[at[indices[t]]].value; });
  const correct = readJson(join(dir, 'permutation-capture-6101.json')).values;
  assert.notDeepEqual(values, correct, 'the 0x5eed draw differs from the 0x7ca7 draw');
  writeJson(join(dir, 'permutation-capture-6101.json'), { indices, values });
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['permutation']);
  assert.match(check(report, 'permutation').detail, /permutation-capture-6101\.json/);
});

test('a verdict with margin floor 7 instead of ceil(7 N / 150) fails gate only', () => {
  const dir = cloneRun('wrong-margin-m');
  const summaryPath = join(dir, 'summary.json');
  const summary = readJson(summaryPath);
  const wrongFloor = 7;
  const passWith = (s, floor) => {
    const m = s.gate.comparators;
    return m.none.margin >= floor && m.shuffled.margin >= floor && m.quarter.margin > 0
      && m.none.lower > 0 && m.shuffled.lower > 0 && m.quarter.lower > 0
      && s.retention.previouslyRecalled > 0 && s.retention.lost / s.retention.previouslyRecalled <= 0.02;
  };
  const perSeed = summary.verdict.perSeed.map(s => ({ ...s, pass: passWith(s, wrongFloor) }));
  // Precondition: the wrong floor changes at least one seed's pass flag, otherwise this test shows nothing.
  assert.ok(perSeed.some((s, i) => s.pass !== summary.verdict.perSeed[i].pass), 'the wrong floor flips a seed');
  const pass = perSeed.every(s => s.pass);
  summary.verdict = { ...summary.verdict, perSeed, pass, outcome: pass ? 'passes' : 'does not pass' };
  summary.outcome = summary.verdict.outcome;
  writeJson(summaryPath, summary);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, /verdict\.perSeed\[0\]\.pass/);
});

test('a verdict computed with the v6 gate seed fails gate only', () => {
  const dir = cloneRun('v6-gate-seed');
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

test('a practice certificate line moved after the test lines fails certificates only', () => {
  const dir = cloneRun('practice-after-test');
  const certPath = join(dir, 'certificates.jsonl');
  const rows = readJsonl(certPath);
  const practiceIds = new Set(fx.practice.map(ID));
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
  const practiceIds = new Set(fx.practice.map(ID));
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

test('a ledger slot whose certificate hash differs from its checked certificate fails certificates only', () => {
  const dir = cloneRun('ledger-hash-changed');
  const v5 = join(work, 'v5-ledger-hash-changed');
  cpSync(built.v5Dir, v5, { recursive: true });
  const name = 'ledger-6101.jsonl';
  const slots = readJsonl(join(v5, name));
  const slot = slots.find(s => s.certificateSha256 !== null);
  assert.ok(slot, 'a slot with a certificate hash exists');
  slot.certificateSha256 = '0'.repeat(64);
  writeJsonl(join(v5, name), slots);
  writeJsonl(join(dir, name), slots);
  // The ledger is a v5 file: its new hash goes into the config, as the registration would.
  const v5Files = { ...built.v5Files, [name]: shaFile(join(v5, name)) };
  const report = auditRun(dir, { ...inputs, v5Run: v5 }, { ...opts, v5Files });
  assert.deepEqual(failing(report), ['certificates']);
  assert.match(check(report, 'certificates').detail, /ledger-6101 slot \d+ \(.+\) differs from its checked certificate/);
});

test('prior selections other than the pinned files fail data only', () => {
  const report = auditRun(built.runDir, inputs, { ...opts, priorSelectionPins: undefined });
  assert.deepEqual(failing(report), ['data']);
  assert.match(check(report, 'data').detail, /prior selections must be exactly the two pinned files/);
});

test('a prior selection that holds the new games fails data only', () => {
  const report = auditRun(built.runDir, { ...inputs, files: { ...inputs.files, priorSelections: [PRIOR_SELECTION, NEW_SELECTION] } }, opts);
  assert.deepEqual(failing(report), ['data']);
  assert.match(check(report, 'data').detail, /new selected games are in the prior selections/);
});

test('NEW_PINS are the registered games 601-900 digests and match the files on disk', () => {
  const registered = JSON.parse(readFileSync(REGISTRATION, 'utf8')).newSha256;
  assert.deepEqual({ ...NEW_PINS }, registered);
  for (const [name, path] of Object.entries(REGISTERED_601_900)) assert.equal(shaFile(path), NEW_PINS[name], `${name} digest`);
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

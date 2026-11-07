import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { Chess } from 'chess.js';
import { auditRun } from '../../scripts/neural-learning/audit-engineered-memory-test-v6.mjs';
import { certifyCaptureRetentionAction } from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import { NearestEpisodeMemory, rmsScaler } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

// Synthetic v6 folders built from real positions, with 6 KC columns, three cache folders (v4, v5, v6) in the temp dir.
// Column 0 of each cache row carries the certified value (+1 safe, -1 otherwise), the other columns are 0. This makes the
// fixture's gate have a clear signal; it is a fixture for consistency checks, not a result.
// The writer below follows memory-v5-file-formats.md and the v6 spec. It shares the pinned libraries but none of the auditor's code.
// Fixture: 3 practice-or-test games of real positions (2 practice, 1 test; PRACTICE_GAMES = 2), 8 practice positions, 3 retained new positions,
// and 3 decoy new positions: one practice-board, one v4 test board and one v5 fresh board (both earlier-test-board, spec 5.1).
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const POSITIONS_ALL = join(ROOT, 'runs', 'restart-data-2026-11-04', 'capture-choice-positions-max50-v1', 'positions.jsonl');
const NEW_DIR = join(ROOT, 'runs', 'restart-data-2026-11-05');
const NEW_POSITIONS = join(NEW_DIR, 'capture-choice-positions-301-600-v1', 'positions.jsonl');
const NEW_SELECTION = join(NEW_DIR, 'games-train-301-600', 'selection.json');
const NEW_GAMES = join(NEW_DIR, 'games-train-301-600', 'games.pgn');
const PRIOR_SELECTION = join(ROOT, 'runs', 'restart-data-2026-11-03', 'games-train', 'selection.json');
const AUDITOR = join(ROOT, '.codebase', 'scripts', 'neural-learning', 'audit-engineered-memory-test-v6.mjs');
const COLUMNS = 6;
const SEEDS = [6101, 6102, 6103];
const PRACTICE_GAMES = 2;
const TASK = { objective: 'capture-retention', plies: 1 };
const REQUIRED = ['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs'];
const CHECKS = ['data', 'testset', 'v5inputs', 'certificates', 'cache', 'jobs', 'scores', 'gate'];
const TEST_OPTIONS = { columns: COLUMNS, resamples: 200, practiceGames: PRACTICE_GAMES, rawRandom: false };
const ZEROS = { writes: 0, unknown: 0, replacements: 0, evictions: 0, identicalConsistent: 0, identicalConflicting: 0 };
const ARMS = ['full', 'half', 'quarter', 'eighth', 'shuffled', 'none'];

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

// Chooses 3 games (positions 4 each), with the practice games and test game ordered by the v3 split hash. Conditions (fixture
// choice, not a result): the first two practice positions have draws with no safe move for every seed, so the quarter store
// holds only non-safe values; the full ledger holds a safe value for every seed. Retained positions and decoys come from new games.
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
    if (usedGames.has(p.gameId) || !eligible(p)) continue;
    retained.push(p);
    usedGames.add(p.gameId);
  }
  assert.equal(retained.length, 3, 'three eligible new positions from distinct games');
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
      return practice.some(x => draw(seed, ID(x.p), x.legal).some(u => isSafe(x.p, u)));
    });
    if (!ok) continue;
    const copy = (p, gameId) => ({ ...p, gameId });
    return {
      practice: practice.map(x => x.p),
      testPos: testPos.map(x => x.p),
      v4: [a[0].p, b[0].p, t[0].p],
      retained,
      decoys: { practice: copy(practice[7].p, 'decoyPractice'), v4Test: copy(testPos[0].p, 'decoyV4'), fresh: copy(testPos[1].p, 'decoyFresh') },
    };
  }
  throw new Error('no fixture games found');
}

// Writes the v4, v5 and v6 folders and the synthetic new positions file; computes every job and the verdict the way the runner does.
function buildFixture(dir, fx) {
  const v4Dir = join(dir, 'v4-run');
  const v5Dir = join(dir, 'v5-run');
  const runDir = join(dir, 'v6-run');
  for (const d of [v4Dir, v5Dir, join(runDir, 'jobs')]) mkdirSync(d, { recursive: true });
  const all = [...fx.practice, ...fx.testPos];
  const newFile = [fx.retained[0], fx.decoys.practice, fx.retained[1], fx.decoys.v4Test, fx.retained[2], fx.decoys.fresh];
  const newPositionsPath = join(dir, 'new-positions.jsonl');
  writeJsonl(newPositionsPath, newFile);

  const info = new Map();
  for (const p of [...all, ...fx.retained]) {
    const board = boardOf(p);
    const moves = board.moves({ verbose: true });
    info.set(ID(p), { p, board, legal: moves.map(UCI).sort(), moves: new Map(moves.map(m => [UCI(m), m])) });
  }
  const legalOf = p => info.get(ID(p)).legal;

  // Certificate lines (v4 format) for every legal move of the practice, v4, fresh and retained positions.
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

  // v5 partition (spec 2 and 3): practice games are the first PRACTICE_GAMES v4 games by the split hash; fold A is the first half by the fold hash.
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

  // v6 test set (spec 2): practice board, then v4 test board, then v5 fresh board; retained in generator order.
  const v4TestBoards = new Set(fx.v4.filter(p => testGames.includes(p.gameId)).map(p => PIECES(p.fen)));
  const v5FreshBoards = new Set(v5Fresh.map(p => PIECES(p.fen)));
  const excluded = [];
  const freshIds = [];
  for (const p of newFile) {
    const b = PIECES(p.fen);
    const reason = practiceBoards.has(b) ? 'practice-board' : v4TestBoards.has(b) ? 'earlier-test-board' : v5FreshBoards.has(b) ? 'earlier-test-board' : null;
    if (reason) excluded.push({ id: ID(p), reason }); else freshIds.push(ID(p));
  }
  assert.equal(freshIds.length, 3);
  // Runner layout (run-engineered-memory-test-v6.mjs step 6): v5 practice ids, empty folds, retained test ids, exclusions.
  writeJson(join(runDir, 'partition.json'), {
    practice: practice.map(ID), foldA: [], foldB: [], freshTest: freshIds, excluded,
    counts: { newPositions: newFile.length, practice: practice.length, freshTest: freshIds.length, excluded: excluded.length },
  });

  // Keys and cache rows: v4 keys; v5 keys = practice and fresh moves not in v4; v6 keys = retained moves not in v4 or v5.
  const keysOf = list => list.flatMap(p => legalOf(p).map(u => `${ID(p)}|${u}`));
  const v4Keys = keysOf(fx.v4);
  const v4KeySet = new Set(v4Keys);
  const v5Keys = keysOf([...practice, ...v5Fresh]).filter(k => !v4KeySet.has(k));
  const v5KeySet = new Set(v5Keys);
  const v6Keys = keysOf(fx.retained).filter(k => !v4KeySet.has(k) && !v5KeySet.has(k));
  const rowOf = key => {
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
    const bytes = cacheBytes([blank, ...keys.map(rowOf)]);
    writeFileSync(join(dir, 'kc-cache.f32'), bytes);
    writeJson(join(dir, 'keys.json'), { rows: ['blank', ...keys] });
    return bytes;
  };
  const v4Bytes = writeCache(v4Dir, v4Keys);
  const v5Bytes = writeCache(v5Dir, v5Keys);
  const v6Bytes = writeCache(runDir, v6Keys);
  const v6Digest = sha(v6Bytes);
  writeJson(join(runDir, 'cache-schema.json'), { rows: v6Keys.length + 1, columns: COLUMNS, dtype: 'float32', byteOrder: 'little', kcIndices: [0, 1, 2, 3, 4, 5], kcRootIds: [], fileSha256: v6Digest, pins: {} });
  const rowsByKey = new Map([...v4Keys, ...v5Keys, ...v6Keys].map(k => [k, rowOf(k)]));

  // Ledgers, permutations and schedules (v5 files). Ledger values come from the certificate lines.
  const v5Files = {};
  const ledgers = {};
  const perms = {};
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
    writeJsonl(join(v5Dir, `ledger-${seed}.jsonl`), slots);
    writeJson(join(v5Dir, `permutation-${seed}.json`), perms[seed]);
  }
  // v6 copies of the v5 files, byte for byte.
  for (const name of ['schedules.json', ...SEEDS.flatMap(s => [`ledger-${s}.jsonl`, `permutation-${s}.json`])]) {
    writeFileSync(join(runDir, name), readFileSync(join(v5Dir, name)));
  }
  for (const name of ['partition.json', 'schedules.json', ...SEEDS.flatMap(s => [`ledger-${s}.jsonl`, `permutation-${s}.json`])]) v5Files[name] = shaFile(join(v5Dir, name));

  // Certificates: v5 has the practice and fresh lines. v6 (spec 5.3, runner step 8) is the header, the copied v5 practice block, then the test block; each block in id/uci order.
  const v5Lines = sortLines([...practice, ...v5Fresh].flatMap(p => legalOf(p).map(u => lines.get(`${ID(p)}|${u}`))));
  writeJsonl(join(v5Dir, 'certificates.jsonl'), [header, ...v5Lines]);
  const practiceSet = new Set(practice.map(ID));
  const v6Practice = v5Lines.filter(c => practiceSet.has(c.id));
  const v6Test = sortLines(fx.retained.flatMap(p => legalOf(p).map(u => lines.get(`${ID(p)}|${u}`))));
  writeJsonl(join(runDir, 'certificates.jsonl'), [header, ...v6Practice, ...v6Test]);

  // Jobs (spec 3, 5, 6) for the K3 key; the raw and random arms are presence-only placeholders (no retina).
  const posOf = new Map([...all, ...fx.retained].map(p => [ID(p), p]));
  const meanCache = new Map();
  const meanOf = id => {
    if (!meanCache.has(id)) {
      const legal = legalOf(posOf.get(id));
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
  const scoreOf = (memory, apply) => fx.retained.map(p => {
    const id = ID(p);
    const legal = legalOf(p);
    const vectors = legal.map(u => (apply === null ? Float64Array.of(0) : apply(id, u)));
    const scores = frozenScores(legal.map((_, i) => i), i => memory.score(vectors[i]), () => memory.fingerprint());
    const top = Math.max(...scores);
    const tied = legal.map((_, i) => i).filter(i => scores[i] === top);
    const s = tied.filter(i => isSafe(p, legal[i])).length;
    return { id, c: tied.length, s, expected: s / tied.length };
  });
  const runArm = (seed, arm) => {
    const slots = ledgers[seed];
    const n = slots.length;
    let memory = new NearestEpisodeMemory({ capacity: 4096, k: 3 });
    let counts = null;
    let retention = null;
    if (arm !== 'none') {
      const size = { full: n, shuffled: n, half: Math.floor(n / 2), quarter: Math.floor(n / 4), eighth: Math.floor(n / 8) }[arm];
      const storeSlots = slots.slice(0, size);
      let values = storeSlots.map(s => s.value);
      if (arm === 'shuffled') {
        let t = 0;
        values = slots.map(s => (s.value !== null ? perms[seed].values[t++] : null));
      }
      ({ memory, counts } = storeOf(storeSlots, values, arm));
      if (arm === 'full' || arm === 'quarter') {
        const probes = slots.slice(0, Math.floor(n / 4)).filter(s => s.value !== null).map(s => ({ value: s.value, vector: pipe.apply(s.id, s.uci) }));
        const recalled = probes.map(p => { const x = memory.score(p.vector); return x > 0 ? p.value === 1 : x < 0 ? p.value === -1 : false; });
        retention = arm === 'quarter' ? { probes: probes.length, recalledQuarter: recalled } : { probes: probes.length, recalledFull: recalled };
      }
    }
    const scores = scoreOf(memory, arm === 'none' ? null : pipe.apply);
    const body = {
      job: { phase: 'confirm', key: 'K3', direction: '-', seed, arm },
      scores,
      expectedTotal: scores.reduce((t, x) => t + x.expected, 0),
      counts,
      pipeline: { rmsSha256: pipe.rmsSha256, zeroRmsFeatures: pipe.zeroRmsFeatures },
      fingerprint: arm === 'none' ? null : memory.fingerprint(),
      peakRssMiB: 0,
    };
    if (retention) body.retention = retention;
    return body;
  };
  const jobs = {};
  for (const seed of SEEDS) for (const arm of ARMS) jobs[`${seed}|${arm}`] = runArm(seed, arm);
  for (const seed of SEEDS) for (const arm of ['raw-pc', 'random-pc']) {
    jobs[`${seed}|${arm}`] = { job: { phase: 'confirm', key: arm, direction: '-', seed, arm }, scores: [], expectedTotal: 0, counts: { ...ZEROS }, pipeline: { rmsSha256: 'not-rechecked', zeroRmsFeatures: 0 }, fingerprint: 'not-rechecked', peakRssMiB: 0 };
  }
  for (const [key, body] of Object.entries(jobs)) {
    const [seed, arm] = key.split('|');
    const name = `confirm-${arm === 'raw-pc' || arm === 'random-pc' ? arm : 'K3'}---${seed}-${arm}.json`;
    writeJson(jobFile(runDir, name), body);
    writeFileSync(jobFile(runDir, name.replace(/\.json$/, '.steady')), '');
  }

  // Verdict (spec 4): M = ceil(7 N / 150); per seed numericPairGate on the four verdict arms; pass only when every seed passes.
  const N = freshIds.length;
  const M = Math.ceil((7 * N) / 150);
  const games = fx.retained.map(p => p.gameId);
  const perSeed = SEEDS.map(seed => {
    const arms = Object.fromEntries(['full', 'none', 'shuffled', 'quarter'].map(a => [a, jobs[`${seed}|${a}`].scores.map(x => x.expected)]));
    const gate = numericPairGate({ arms, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: TEST_OPTIONS.resamples, seed: 20261106, lowerQuantile: 0.025 });
    const quarter = jobs[`${seed}|quarter`].retention.recalledQuarter;
    const full = jobs[`${seed}|full`].retention.recalledFull;
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
  writeJson(join(runDir, 'summary.json'), { schema: 'engineered-memory-test-v6', outcome, verdict, dryRun: false, scope: 'synthetic test fixture, not a result' });
  const partitionSha256 = shaFile(join(runDir, 'partition.json'));
  writeJson(join(runDir, 'manifest.json'), { schema: 'engineered-memory-test-v6-run', status: 'complete', partitionSha256, cacheSha256: v6Digest, volume: 2, chapter: 'Evidence for Learning' });
  return {
    v4Dir, v5Dir, runDir, newPositionsPath, v5Files,
    v4Sha: sha(v4Bytes), v5Sha: sha(v5Bytes), outcome, verdict, excluded, freshIds, M, v5Lines: v5Lines.length,
  };
}

let work;
let fx;
let built;
let inputs;
let opts;
let configPath;

before(() => {
  work = mkdtempSync(join(tmpdir(), 'audit-v6-'));
  fx = pickFixture(readPositions(POSITIONS_ALL), readPositions(NEW_POSITIONS));
  built = buildFixture(work, fx);
  inputs = {
    positionsAll: [...fx.practice, ...fx.testPos],
    positionsV4: fx.v4,
    newPositions: readPositions(built.newPositionsPath),
    v4Run: built.v4Dir,
    v5Run: built.v5Dir,
    files: { newSelection: NEW_SELECTION, newGamesPgn: NEW_GAMES, newPositions: built.newPositionsPath, priorSelection: PRIOR_SELECTION },
  };
  opts = {
    ...TEST_OPTIONS,
    v4CacheSha256: built.v4Sha,
    v5CacheSha256: built.v5Sha,
    v5Files: built.v5Files,
    newSha256: { selection: shaFile(NEW_SELECTION), gamesPgn: shaFile(NEW_GAMES), positions: shaFile(built.newPositionsPath) },
  };
  // Config file for the CLI test (same inputs as the direct call).
  const allPath = join(work, 'positions-all.jsonl');
  const v4Path = join(work, 'positions-v4.jsonl');
  writeJsonl(allPath, inputs.positionsAll);
  writeJsonl(v4Path, fx.v4);
  configPath = join(work, 'config.json');
  writeJson(configPath, {
    paths: { positionsAll: allPath, positionsV4: v4Path, newPositions: built.newPositionsPath, newSelection: NEW_SELECTION, newGamesPgn: NEW_GAMES, priorSelection: PRIOR_SELECTION, v4Run: built.v4Dir, v5Run: built.v5Dir },
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

test('clean synthetic folder passes all eight checks', () => {
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
  assert.match(check(report, 'testset').detail, /^3 retained in generator order; 3 excluded \(practice-board 1, .*earlier-test-board 2/);
  assert.ok(!check(report, 'gate').detail.startsWith('skipped'), check(report, 'gate').detail);
});

test('an extra row in the v6 cache fails cache only', () => {
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

test('a decoy position that should be excluded in the test set fails testset only', () => {
  const dir = cloneRun('excluded-in-test-set');
  const partitionPath = join(dir, 'partition.json');
  const partition = readJson(partitionPath);
  const decoy = built.excluded.find(x => x.reason === 'practice-board').id;
  partition.freshTest.splice(1, 0, decoy);
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

test('CLI writes audit.json and exits 1 on a failed audit; a clean folder passes', () => {
  const clean = spawnSync(process.execPath, [AUDITOR, '--run', built.runDir, '--config', configPath], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /AUDIT PASS/);
  // Workers are child processes; two workers must give the same clean result.
  const parallel = spawnSync(process.execPath, [AUDITOR, '--run', built.runDir, '--config', configPath, '--workers', '2'], { encoding: 'utf8' });
  assert.equal(parallel.status, 0, `${parallel.stdout}${parallel.stderr}`);
  assert.match(parallel.stdout, /AUDIT PASS/);
  // Dry run: the summary must say dryRun; the test set limit is the retained count (3), so the same folder still passes.
  const dry = cloneRun('cli-dry-run');
  const drySummary = readJson(join(dry, 'summary.json'));
  drySummary.dryRun = true;
  writeJson(join(dry, 'summary.json'), drySummary);
  const dryRun = spawnSync(process.execPath, [AUDITOR, '--run', dry, '--config', configPath, '--dry-run', 'yes'], { encoding: 'utf8' });
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /AUDIT PASS/);
  const dir = cloneRun('cli-tampered');
  const path = jobFile(dir, JOB_NAME(6101, 'full'));
  const job = readJson(path);
  job.scores[0].expected = job.scores[0].expected === 0 ? 0.5 : 0;
  writeJson(path, job);
  const failed = spawnSync(process.execPath, [AUDITOR, '--run', dir, '--config', configPath], { encoding: 'utf8' });
  assert.equal(failed.status, 1, failed.stderr);
  assert.match(failed.stdout, /AUDIT FAIL/);
  const report = readJson(join(dir, 'audit.json'));
  assert.equal(report.pass, false);
  assert.deepEqual(report.checks.map(c => c.name), CHECKS);
});

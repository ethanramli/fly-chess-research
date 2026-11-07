import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { Chess } from 'chess.js';
import { auditRun } from '../../scripts/neural-learning/audit-engineered-memory-test-v5.mjs';
import { certifyCaptureRetentionAction } from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import { NearestEpisodeMemory, rmsScaler } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

// Synthetic run folder built from real positions: 3 games (4 suitable positions each), 2 practice games and 1 test game.
// 6 KC columns. No retina in this fixture, so raw and random are not rechecked; rawRandom false also makes the report unpinned.
// The writer below follows memory-v5-file-formats.md and the spec. It shares the pinned libraries but none of the auditor's code.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const POSITIONS = join(ROOT, 'runs', 'restart-data-2026-11-04', 'capture-choice-positions-max50-v1', 'positions.jsonl');
const AUDITOR = join(ROOT, '.codebase', 'scripts', 'neural-learning', 'audit-engineered-memory-test-v5.mjs');
const COLUMNS = 6;
const SEEDS = [6101, 6102, 6103];
const DEV_SEED = 6101;
const SPARSE_KEEP = 259;
const PRACTICE_GAMES = 2;
const TASK = { objective: 'capture-retention', plies: 1 };
const VERIFIER_FILES = ['.codebase/src/neural-learning/engineered-memory-v4-ledger.mjs', '.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs', '.codebase/src/search-and-feedback/puzzle-search.mjs'];
const CHECKS = ['partition', 'schedules', 'certificates', 'ledger', 'permutation', 'cache', 'jobs', 'scores', 'selection', 'gate'];
const TEST_OPTIONS = { columns: COLUMNS, resamples: 200, practiceGames: PRACTICE_GAMES, minFull: 1, minQuarter: 0, rawRandom: false };
const ZEROS = { writes: 0, unknown: 0, replacements: 0, evictions: 0, identicalConsistent: 0, identicalConflicting: 0 };

const sha = data => createHash('sha256').update(data).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const UCI = m => m.from + m.to + (m.promotion ?? '');
const ID = p => `${p.gameId}:${p.ply}`;
const PIECES = fen => fen.split(' ')[0];
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const writeJsonl = (path, values) => writeFileSync(path, values.map(v => JSON.stringify(v)).join('\n') + '\n');
const failing = report => report.checks.filter(c => !c.pass).map(c => c.name);
const check = (report, name) => report.checks.find(c => c.name === name);
const jobFile = (dir, name) => join(dir, 'jobs', name);
const DEV_STORE = 'dev-K1-AB-6101-store.json';

function boardOf(p) {
  const b = new Chess();
  for (const m of p.history) b.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.length > 4 ? m[4] : undefined });
  assert.equal(b.fen(), p.fen, `fixture position ${ID(p)} replays`);
  return b;
}

// Fixture choice, not a result. Positions have 4 to 30 legal moves (most source positions have 31 to 45) and at least one safe move,
// which keeps the certificate check fast. Three games, four positions each, chosen by a seeded search so that every seed's ledger
// holds a +1 and both development folds hold both values. Values here come from the source outcome field; the writer checks the
// certificate values later.
function pickSource(all) {
  const byGame = new Map();
  for (const p of all) {
    const legal = boardOf(p).moves({ verbose: true }).map(UCI).sort();
    if (legal.length < 4 || legal.length > 30 || !p.moves.some(m => m.outcome === 'safe')) continue;
    if (!byGame.has(p.gameId)) byGame.set(p.gameId, []);
    byGame.get(p.gameId).push({ p, legal });
  }
  const games = [...byGame.keys()].filter(g => byGame.get(g).length >= 4);
  const valueOf = (x, uci) => (x.p.moves.find(m => m.uci === uci).outcome === 'safe' ? 1 : -1);
  for (let trial = 0; trial < 5000; trial++) {
    const rng = mulberry32(7000 + trial);
    const pool = [...games];
    const chosen = [];
    while (chosen.length < 3 && pool.length) chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    if (chosen.length < 3) break;
    const entries = chosen.flatMap(g => byGame.get(g).slice(0, 4));
    const v4 = chosen.map(g => byGame.get(g)[0].p);
    const { partition } = partitionOf(entries.map(e => e.p), v4);
    const byId = new Map(entries.map(e => [ID(e.p), e]));
    const slotValues = (seed, ids) => ids.flatMap(id => draw(seed, id, byId.get(id).legal).map(u => valueOf(byId.get(id), u)));
    const mixed = values => values.includes(1) && values.includes(-1);
    if (SEEDS.every(seed => slotValues(seed, partition.practice).includes(1))
      && mixed(slotValues(DEV_SEED, partition.foldA)) && mixed(slotValues(DEV_SEED, partition.foldB))) {
      return { positions: entries.map(e => e.p), v4 };
    }
  }
  throw new Error('no fixture source found in the search');
}

// Writer's partition (spec 3): practice games are the first two v4 games by the v3 split hash; fold A is the first half by the fold hash.
function partitionOf(positions, v4) {
  const v4Ids = new Set(v4.map(ID));
  const v4Boards = new Set(v4.map(p => PIECES(p.fen)));
  const split = g => sha(`engineered-memory-v3-split:${g}`);
  const fold = g => sha(`memory-v5-fold:${g}`);
  const games = [...new Set(v4.map(p => p.gameId))].sort((a, b) => cmp(split(a), split(b)));
  const practiceGames = games.slice(0, PRACTICE_GAMES);
  const testGames = games.slice(PRACTICE_GAMES);
  const byOrder = (a, b) => cmp(split(a.gameId), split(b.gameId)) || a.ply - b.ply;
  const practice = positions.filter(p => practiceGames.includes(p.gameId)).sort(byOrder);
  const practiceBoards = new Set(practice.map(p => PIECES(p.fen)));
  const candidates = positions.filter(p => testGames.includes(p.gameId) && !v4Ids.has(ID(p)) && !v4Boards.has(PIECES(p.fen))).sort(byOrder);
  const dropped = candidates.filter(p => practiceBoards.has(PIECES(p.fen)));
  const fresh = candidates.filter(p => !practiceBoards.has(PIECES(p.fen)));
  const foldGames = [...practiceGames].sort((a, b) => cmp(fold(a), fold(b)));
  const foldA = new Set(foldGames.slice(0, Math.floor(practiceGames.length / 2)));
  const boardsA = new Set(practice.filter(p => foldA.has(p.gameId)).map(p => PIECES(p.fen)));
  const boardsB = new Set(practice.filter(p => !foldA.has(p.gameId)).map(p => PIECES(p.fen)));
  const repeats = practice.filter(p => (foldA.has(p.gameId) ? boardsB : boardsA).has(PIECES(p.fen))).length;
  const partition = {
    practice: practice.map(ID),
    foldA: practice.filter(p => foldA.has(p.gameId)).map(ID),
    foldB: practice.filter(p => !foldA.has(p.gameId)).map(ID),
    freshTest: fresh.map(ID),
    droppedBoardRepeats: dropped.map(ID),
    foldBoardRepeats: repeats,
    counts: { practice: practice.length, fresh: fresh.length, dropped: dropped.length },
  };
  return { partition, practice, fresh };
}

// Writer's draw (committed 4-move schedule) and permutation (permuteKnownValues), as the v4 rules.
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

// Writes the clean v4 cache (its keys are every legal move of the v4 positions) and the v5 folder for one cache seed.
// Returns the state the job and gate computations need.
function fixtureState(practice, fresh, info) {
  const cert = new Map();
  const certLines = [];
  for (const p of [...practice, ...fresh]) {
    const { board, moves, legal } = info.get(ID(p));
    for (const uci of legal) {
      const m = moves.get(uci);
      const captured = Boolean(m.captured);
      let line;
      if (captured && m.piece === 'k') line = { id: ID(p), uci, category: 'unknown', value: null, status: 'scope-unknown', proof: null, certificateSha256: null };
      else {
        const proof = certifyCaptureRetentionAction(board, uci, { ...TASK }, {});
        const category = proof.status === 'success' ? 'safe' : proof.status === 'failure' ? (captured ? 'unsafe' : 'quiet') : 'unknown';
        line = { id: ID(p), uci, category, value: category === 'safe' ? 1 : category === 'unknown' ? null : -1, status: proof.status, proof, certificateSha256: proof.certificateSha256 ?? null };
      }
      assert.equal(p.moves.find(x => x.uci === uci).outcome, line.category, `${ID(p)}|${uci} outcome`);
      cert.set(`${ID(p)}|${uci}`, line);
      certLines.push(line);
    }
  }
  certLines.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.uci < b.uci ? -1 : a.uci > b.uci ? 1 : 0));
  return { cert, certLines };
}

// The writer's features and pipeline (spec 4): K1 row; K2 blank-subtracted top 259 positives; K3 row minus the mean over the position's legal rows.
function featuresOf(rowsByKey, blank, legalOf) {
  const row = key => Float64Array.from(rowsByKey.get(key));
  const meanCache = new Map();
  const meanRow = id => {
    if (!meanCache.has(id)) {
      const legal = legalOf(id);
      const s = new Float64Array(COLUMNS);
      for (const u of legal) { const r = row(`${id}|${u}`); for (let i = 0; i < COLUMNS; i++) s[i] += r[i]; }
      meanCache.set(id, Float64Array.from(s, x => x / legal.length));
    }
    return meanCache.get(id);
  };
  const sparse = r0 => {
    const r = Float64Array.from(r0, (x, i) => Math.max(0, x - blank[i]));
    const keep = new Set([...r.keys()].filter(i => r[i] > 0).sort((a, b) => r[b] - r[a] || a - b).slice(0, SPARSE_KEEP));
    return Float64Array.from(r, (x, i) => (keep.has(i) ? x : 0));
  };
  const TRANSFORM = {
    K1: (id, uci) => row(`${id}|${uci}`),
    K2: (id, uci) => sparse(row(`${id}|${uci}`)),
    K3: (id, uci) => { const m = meanRow(id); return Float64Array.from(row(`${id}|${uci}`), (x, i) => x - m[i]); },
  };
  const pipeline = (key, calibIds) => {
    const cal = calibIds.slice(0, Math.floor(calibIds.length / 4)).map(id => TRANSFORM[key](id, legalOf(id)[0]));
    const scaler = rmsScaler(cal);
    const dead = [...Array(COLUMNS).keys()].filter(i => cal.every(v => v[i] === 0));
    return { rmsSha256: scaler.rmsSha256, zeroRmsFeatures: dead.length, apply: (id, uci) => { const v = scaler(TRANSFORM[key](id, uci)); for (const i of dead) v[i] = 0; return v; } };
  };
  return { pipeline };
}

// Writer's store (spec 3.6/6): one write per known slot; identical vectors replace; oldest evicted only at capacity 4096.
function storeOf(slots, values, apply, arm) {
  const memory = new NearestEpisodeMemory({ capacity: 4096, k: 3 });
  const counts = { ...ZEROS };
  slots.forEach((slot, i) => {
    const value = values[i];
    if (value === null) { counts.unknown++; return; }
    const vector = apply(slot.id, slot.uci);
    const at = memory.entries.findIndex(e => e.vector.every((x, j) => x === vector[j]));
    if (at >= 0) { counts.replacements++; if (memory.entries[at].value === value) counts.identicalConsistent++; else counts.identicalConflicting++; }
    else if (memory.size === 4096) counts.evictions++;
    memory.write(vector, value, sha(JSON.stringify({ arm, slot: slot.slot, id: slot.id, uci: slot.uci, value })));
    counts.writes++;
  });
  return { memory, counts };
}

function scoreIds(memory, ids, info, cert, apply) {
  return ids.map(id => {
    const { legal } = info.get(id);
    const vectors = legal.map(u => (apply ? apply(id, u) : Float64Array.of(0)));
    const scores = frozenScores(legal.map((_, i) => i), i => memory.score(vectors[i]), () => memory.fingerprint());
    const top = Math.max(...scores);
    const tied = legal.map((_, i) => i).filter(i => scores[i] === top);
    const s = tied.filter(i => cert.get(`${id}|${legal[i]}`).value === 1).length;
    return { id, c: tied.length, s, expected: s / tied.length };
  });
}

function buildFixture(dir, v4Dir, positions, v4Positions) {
  mkdirSync(join(dir, 'jobs'), { recursive: true });
  mkdirSync(v4Dir, { recursive: true });
  const info = new Map();
  for (const p of positions) {
    const board = boardOf(p);
    const moves = board.moves({ verbose: true });
    info.set(ID(p), { board, moves: new Map(moves.map(m => [UCI(m), m])), legal: moves.map(UCI).sort() });
  }
  const legalOf = id => info.get(id).legal;
  const { partition, practice, fresh } = partitionOf(positions, v4Positions);
  const practiceIds = partition.practice;
  const freshIds = partition.freshTest;
  const { cert, certLines } = fixtureState(practice, fresh, info);
  const certHeader = { kind: 'verifier', task: TASK, maxReplies: 256, sources: Object.fromEntries(VERIFIER_FILES.map(f => [f, sha(readFileSync(join(ROOT, f)))])) };

  // Schedules, ledgers and permutations (spec 2, 3.7, 6).
  const schedules = {};
  for (const seed of SEEDS) schedules[seed] = practiceIds.map(id => ({ id, moves: draw(seed, id, legalOf(id)) }));
  const ledger = {};
  const perm = {};
  for (const seed of SEEDS) {
    const slots = [];
    for (const { id, moves } of schedules[seed]) for (const uci of moves) { const c = cert.get(`${id}|${uci}`); slots.push({ slot: slots.length, id, uci, category: c.category, value: c.value, certificateSha256: c.certificateSha256 }); }
    ledger[seed] = slots;
    perm[seed] = permuteWriter(seed, slots.filter(s => s.value !== null));
  }
  const devLedger = { AB: ledger[DEV_SEED].filter(s => partition.foldA.includes(s.id)), BA: ledger[DEV_SEED].filter(s => partition.foldB.includes(s.id)) };
  const devPerm = { AB: permuteWriter(DEV_SEED, devLedger.AB.filter(s => s.value !== null)), BA: permuteWriter(DEV_SEED, devLedger.BA.filter(s => s.value !== null)) };

  // Caches: row 0 blank (shared), v4 rows from the v4 keys, v5 rows for the new keys.
  const v4Keys = v4Positions.flatMap(p => legalOf(ID(p)).map(u => `${ID(p)}|${u}`));
  const v4KeySet = new Set(v4Keys);
  const newKeys = [...practiceIds, ...freshIds].flatMap(id => legalOf(id).map(u => `${id}|${u}`)).filter(k => !v4KeySet.has(k));
  const f32Rows = (keys, seed) => { const rng = mulberry32(seed); return keys.map(() => Float64Array.from({ length: COLUMNS }, () => Math.fround(rng()))); };
  const blankRow = f32Rows(['blank'], 20261199)[0];
  const v4Rows = f32Rows(v4Keys, 20261104);
  const bytesOf = rows => { const f = new Float32Array(rows.length * COLUMNS); rows.forEach((r, i) => f.set(r, i * COLUMNS)); const b = Buffer.alloc(f.length * 4); for (let i = 0; i < f.length; i++) b.writeFloatLE(f[i], i * 4); return b; };
  const v4Bytes = bytesOf([blankRow, ...v4Rows]);
  writeFileSync(join(v4Dir, 'kc-cache.f32'), v4Bytes);
  writeJson(join(v4Dir, 'keys.json'), { rows: ['blank', ...v4Keys] });
  const v4CacheSha256 = sha(v4Bytes);

  // Dev and confirm jobs (spec 5, 6) for one cache seed; the first seed with a learning key in development is used.
  const runAll = cacheSeed => {
    const newRows = f32Rows(newKeys, cacheSeed);
    const rowsByKey = new Map([...v4Keys.map((k, i) => [k, v4Rows[i]]), ...newKeys.map((k, i) => [k, newRows[i]])]);
    const blank = Float64Array.from(blankRow, x => Math.fround(x));
    const { pipeline } = featuresOf(rowsByKey, blank, legalOf);
    const runJob = (job) => {
      const { phase, key, direction, seed, arm } = job;
      const slots = phase === 'dev' ? devLedger[direction] : ledger[seed];
      const calib = phase === 'dev' ? (direction === 'AB' ? partition.foldA : partition.foldB) : practiceIds;
      const targets = phase === 'dev' ? (direction === 'AB' ? partition.foldB : partition.foldA) : freshIds;
      const pipe = pipeline(key, calib);
      const n = slots.length;
      let memory;
      let counts;
      let retention = null;
      if (arm === 'none') {
        memory = new NearestEpisodeMemory({ capacity: 4096, k: 3 });
        counts = null; // the worker writes no counts for the none arm (no store)
      } else {
        const size = arm === 'quarter' ? Math.floor(n / 4) : arm === 'half' ? Math.floor(n / 2) : n;
        const storeSlots = slots.slice(0, size);
        let values;
        if (arm === 'shuffled') {
          const p = phase === 'dev' ? devPerm[direction] : perm[seed];
          let t = 0;
          values = slots.map(s => (s.value !== null ? p.values[t++] : null));
        } else values = storeSlots.map(s => s.value);
        ({ memory, counts } = storeOf(storeSlots, values, pipe.apply, arm));
        if (phase === 'confirm' && (arm === 'quarter' || arm === 'full')) {
          const probes = slots.slice(0, Math.floor(n / 4)).filter(s => s.value !== null).map(s => ({ value: s.value, vector: pipe.apply(s.id, s.uci) }));
          const recalled = probes.map(p => { const x = memory.score(p.vector); return x > 0 ? p.value === 1 : x < 0 ? p.value === -1 : false; });
          retention = arm === 'quarter' ? { probes: probes.length, recalledQuarter: recalled } : { probes: probes.length, recalledFull: recalled };
        }
      }
      const scores = scoreIds(memory, targets, info, cert, arm === 'none' ? null : pipe.apply);
      const out = { job: { phase, key, direction, seed, arm }, scores, expectedTotal: scores.reduce((t, x) => t + x.expected, 0), counts, pipeline: { rmsSha256: pipe.rmsSha256, zeroRmsFeatures: pipe.zeroRmsFeatures }, fingerprint: arm === 'none' ? null : memory.fingerprint() };
      if (retention) out.retention = retention;
      return out;
    };
    const devJobs = new Map();
    for (const key of ['K1', 'K2', 'K3']) for (const direction of ['AB', 'BA']) for (const arm of ['store', 'shuffled']) {
      devJobs.set(`${key}|${direction}|${arm}`, runJob({ phase: 'dev', key, direction, seed: DEV_SEED, arm }));
    }
    const total = (key, direction, arm) => devJobs.get(`${key}|${direction}|${arm}`).expectedTotal;
    const dev = Object.fromEntries(['K1', 'K2', 'K3'].map(key => [key, Object.fromEntries(['AB', 'BA'].map(direction => [direction, { store: total(key, direction, 'store'), shuffled: total(key, direction, 'shuffled') }]))]));
    const margin = key => (devJobs.get(`${key}|AB|store`).expectedTotal - devJobs.get(`${key}|AB|shuffled`).expectedTotal) + (devJobs.get(`${key}|BA|store`).expectedTotal - devJobs.get(`${key}|BA|shuffled`).expectedTotal);
    const margins = { K1: margin('K1'), K2: margin('K2'), K3: margin('K3') };
    const selectedKey = ['K1', 'K2', 'K3'].reduce((best, k) => (margins[k] > 0 && (best === null || margins[k] > margins[best]) ? k : best), null);
    return { rowsByKey, runJob, devJobs, dev, margins, selectedKey, newRows };
  };
  let chosen = null;
  for (let cacheSeed = 1; cacheSeed < 200 && chosen === null; cacheSeed++) {
    const attempt = runAll(cacheSeed);
    if (attempt.selectedKey !== null) chosen = { cacheSeed, ...attempt };
  }
  assert.ok(chosen, 'some cache seed gives a learning key in development');

  // Confirm jobs for the selected key; raw-pc and random-pc are placeholders (not rechecked without a retina).
  const { runJob, devJobs, dev, margins, selectedKey, cacheSeed, newRows } = chosen;
  const confirm = new Map();
  for (const seed of SEEDS) for (const arm of ['full', 'half', 'quarter', 'shuffled', 'none']) {
    confirm.set(`${seed}|${arm}`, runJob({ phase: 'confirm', key: selectedKey, direction: '-', seed, arm }));
  }
  const retentionOf = (quarter, full) => {
    const previouslyRecalled = quarter.filter(Boolean).length;
    const lost = quarter.filter((x, i) => x && !full[i]).length;
    return { probes: quarter.length, previouslyRecalled, recalledFull: full.filter(Boolean).length, lost };
  };
  const perSeed = SEEDS.map(seed => {
    const arms = Object.fromEntries(['full', 'none', 'shuffled', 'quarter'].map(a => [a, confirm.get(`${seed}|${a}`).scores.map(x => x.expected)]));
    const gate = numericPairGate({ arms, games: fresh.map(p => p.gameId), primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: TEST_OPTIONS.resamples, seed: 20261105, lowerQuantile: 0.025 });
    const retention = retentionOf(confirm.get(`${seed}|quarter`).retention.recalledQuarter, confirm.get(`${seed}|full`).retention.recalledFull);
    const m = gate.comparators;
    const pass = m.none.margin >= 7 && m.shuffled.margin >= 7 && m.quarter.margin > 0 && m.none.lower > 0 && m.shuffled.lower > 0 && m.quarter.lower > 0 && retention.previouslyRecalled > 0 && retention.lost / retention.previouslyRecalled <= 0.02;
    return { seed, pass, gate, retention };
  });
  // judgeV5 shape; the auditor does not compare rule.
  const allPass = perSeed.every(s => s.pass);
  const outcome = allPass ? 'passes' : 'does not pass';
  const verdict = { perSeed, pass: allPass, outcome, rule: {} };

  // Files.
  const partitionBytes = `${JSON.stringify(partition, null, 2)}\n`;
  writeFileSync(join(dir, 'partition.json'), partitionBytes);
  const partitionSha256 = sha(readFileSync(join(dir, 'partition.json')));
  writeJson(join(dir, 'schedules.json'), schedules);
  const scheduleSha256 = sha(readFileSync(join(dir, 'schedules.json')));
  writeJsonl(join(dir, 'certificates.jsonl'), [certHeader, ...certLines]);
  for (const seed of SEEDS) {
    writeJsonl(join(dir, `ledger-${seed}.jsonl`), ledger[seed]);
    writeJson(join(dir, `permutation-${seed}.json`), perm[seed]);
  }
  writeJson(join(dir, 'permutation-dev-A.json'), devPerm.AB);
  writeJson(join(dir, 'permutation-dev-B.json'), devPerm.BA);
  const newBytes = bytesOf([blankRow, ...newRows]);
  writeFileSync(join(dir, 'kc-cache.f32'), newBytes);
  writeJson(join(dir, 'keys.json'), { rows: ['blank', ...newKeys] });
  const cacheSha256 = sha(newBytes);
  writeJson(join(dir, 'cache-schema.json'), { rows: newKeys.length + 1, columns: COLUMNS, dtype: 'float32', byteOrder: 'little', kcIndices: Array.from({ length: COLUMNS }, (_, i) => i), kcRootIds: [], fileSha256: cacheSha256, pins: {} });
  const jobRecord = (job, body) => ({ job, ...body, peakRssMiB: 0 });
  const expectedNames = [];
  for (const key of ['K1', 'K2', 'K3']) for (const direction of ['AB', 'BA']) for (const arm of ['store', 'shuffled']) {
    const job = { phase: 'dev', key, direction, seed: DEV_SEED, arm };
    expectedNames.push([`dev-${key}-${direction}-${DEV_SEED}-${arm}.json`, jobRecord(job, devJobs.get(`${key}|${direction}|${arm}`))]);
  }
  for (const seed of SEEDS) {
    for (const arm of ['full', 'half', 'quarter', 'shuffled', 'none']) {
      const job = { phase: 'confirm', key: selectedKey, direction: '-', seed, arm };
      expectedNames.push([`confirm-${selectedKey}---${seed}-${arm}.json`, jobRecord(job, confirm.get(`${seed}|${arm}`))]);
    }
    for (const arm of ['raw-pc', 'random-pc']) {
      const job = { phase: 'confirm', key: arm, direction: '-', seed, arm };
      expectedNames.push([`confirm-${arm}---${seed}-${arm}.json`, jobRecord(job, { scores: [], expectedTotal: 0, counts: { ...ZEROS }, pipeline: { rmsSha256: 'not-rechecked', zeroRmsFeatures: 0 }, fingerprint: 'not-rechecked' })]);
    }
  }
  for (const [name, body] of expectedNames) {
    writeJson(jobFile(dir, name), body);
    writeFileSync(jobFile(dir, name.replace(/\.json$/, '.steady')), ''); // the worker's admission marker; the auditor ignores it
  }
  writeJson(join(dir, 'selection.json'), { dev, margins, selected: selectedKey });
  const positives = {
    full: Object.fromEntries(SEEDS.map(seed => [seed, ledger[seed].filter(s => s.value === 1).length])),
    quarter: Object.fromEntries(SEEDS.map(seed => [seed, ledger[seed].slice(0, Math.floor(ledger[seed].length / 4)).filter(s => s.value === 1).length])),
  };
  writeJson(join(dir, 'summary.json'), { schema: 'engineered-memory-test-v5', outcome, selectedKey, verdict, positives, retention: perSeed.map(s => ({ seed: s.seed, ...s.retention })), jobs: expectedNames.map(([, b]) => b.job), passes: 0, peakRssMiB: 0, elapsedSeconds: 0, scope: 'synthetic test fixture, not a result', dryRun: false });
  writeJson(join(dir, 'manifest.json'), { schema: 'engineered-memory-test-v5-run', status: 'complete', pid: 0, argv: [], startedAt: '2026-11-05T00:00:00Z', endedAt: '2026-11-05T00:00:01Z', exitStatus: 0, volume: 2, chapter: 'To Learn', partitionSha256, scheduleSha256, cacheSha256, pins: {}, limits: {} });
  return { v4CacheSha256, outcome, selectedKey, cacheSeed, positives, expectedCount: expectedNames.length };
}

let work;
let fixtureDir;
let fixturePositions;
let v4Positions;
let inputs;
let opts;
let fixturePositionsPath;
let v4PositionsPath;
let v4Dir;
let built;

before(() => {
  work = mkdtempSync(join(tmpdir(), 'audit-v5-'));
  const real = readFileSync(POSITIONS, 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
  const source = pickSource(real);
  fixturePositions = source.positions;
  v4Positions = source.v4;
  v4Dir = join(work, 'v4-run');
  fixtureDir = join(work, 'clean');
  built = buildFixture(fixtureDir, v4Dir, fixturePositions, v4Positions);
  opts = { ...TEST_OPTIONS, v4CacheSha256: built.v4CacheSha256 };
  inputs = { positionsAll: fixturePositions, positionsV4: v4Positions, v4Run: v4Dir };
  fixturePositionsPath = join(work, 'fixture-positions.jsonl');
  v4PositionsPath = join(work, 'fixture-v4-positions.jsonl');
  writeJsonl(fixturePositionsPath, fixturePositions);
  writeJsonl(v4PositionsPath, v4Positions);
});

after(() => rmSync(work, { recursive: true, force: true }));

const cloneRun = name => {
  const dst = join(work, name);
  cpSync(fixtureDir, dst, { recursive: true });
  return dst;
};

test('clean synthetic folder passes all ten checks', () => {
  const report = auditRun(fixtureDir, inputs, opts);
  assert.deepEqual(report.checks.map(c => c.name), CHECKS);
  assert.deepEqual(report.checks.filter(c => !c.pass), [], JSON.stringify(report.checks.filter(c => !c.pass)));
  assert.equal(report.pass, true);
  assert.equal(report.pinned, false);
  assert.equal(report.outcome, built.outcome);
  assert.ok(['passes', 'does not pass'].includes(report.outcome), `outcome ${report.outcome}`);
  // 33 expected jobs (12 dev, 21 confirm); the 6 raw-pc and random-pc jobs are presence-checked only.
  assert.equal(built.expectedCount, 33);
  assert.match(check(report, 'scores').detail, /^27 jobs rebuilt exactly/);
  assert.match(check(report, 'scores').detail, /6 raw and random jobs not rechecked/);
  assert.ok(!check(report, 'gate').detail.startsWith('skipped'), check(report, 'gate').detail);
});

test('a changed fresh id fails partition only', () => {
  const dir = cloneRun('fresh-id');
  const path = join(dir, 'partition.json');
  const partition = readJson(path);
  partition.freshTest[0] = partition.practice[0];
  writeJson(path, partition);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['partition']);
  assert.match(check(report, 'partition').detail, /freshTest/);
});

test('a missing job file fails jobs and scores', () => {
  const dir = cloneRun('missing-job');
  rmSync(jobFile(dir, DEV_STORE));
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['jobs', 'scores']);
  assert.match(check(report, 'jobs').detail, /missing job file dev-K1-AB-6101-store\.json/);
});

test('an extra job file fails jobs only', () => {
  const dir = cloneRun('extra-job');
  writeFileSync(jobFile(dir, 'dev-K1-AB-6101-store-copy.json'), readFileSync(jobFile(dir, DEV_STORE)));
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['jobs']);
  assert.match(check(report, 'jobs').detail, /extra job file dev-K1-AB-6101-store-copy\.json/);
});

test('a changed job score fails scores only', () => {
  const dir = cloneRun('job-score');
  const path = jobFile(dir, DEV_STORE);
  const job = readJson(path);
  job.scores[0].expected = job.scores[0].expected === 0 ? 0.5 : 0;
  writeJson(path, job);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['scores']);
  assert.match(check(report, 'scores').detail, /dev-K1-AB-6101-store\.json: scores\[0\]\.expected/);
});

test('a changed calibration-dependent scaler hash fails scores only', () => {
  const dir = cloneRun('scaler-hash');
  const path = jobFile(dir, 'dev-K2-AB-6101-store.json');
  const job = readJson(path);
  job.pipeline.rmsSha256 = 'f'.repeat(64);
  writeJson(path, job);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['scores']);
  assert.match(check(report, 'scores').detail, /pipeline\.rmsSha256/);
});

test('a changed selection fails selection only', () => {
  const dir = cloneRun('selection');
  const path = join(dir, 'selection.json');
  const selection = readJson(path);
  selection.selected = selection.selected === 'K1' ? 'K2' : 'K1';
  writeJson(path, selection);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['selection']);
});

test('a changed verdict lower bound fails gate only', () => {
  const dir = cloneRun('gate-lower');
  const path = join(dir, 'summary.json');
  const summary = readJson(path);
  summary.verdict.perSeed[0].gate.comparators.none.lower += 1;
  writeJson(path, summary);
  const report = auditRun(dir, inputs, opts);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, /verdict\.perSeed\[0\]\.gate\.comparators\.none\.lower/);
});

test('CLI writes audit.json and exits 1 on a failed audit; a clean folder passes with the same checks', () => {
  const config = join(work, 'config.json');
  writeJson(config, { paths: { positionsAll: fixturePositionsPath, positionsV4: v4PositionsPath, v4Run: v4Dir }, v4CacheSha256: built.v4CacheSha256, options: TEST_OPTIONS });
  const clean = spawnSync(process.execPath, [AUDITOR, '--run', fixtureDir, '--config', config], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /AUDIT PASS/);
  const dir = cloneRun('cli');
  const path = jobFile(dir, DEV_STORE);
  const job = readJson(path);
  job.scores[0].expected = job.scores[0].expected === 0 ? 0.5 : 0;
  writeJson(path, job);
  const failed = spawnSync(process.execPath, [AUDITOR, '--run', dir, '--config', config], { encoding: 'utf8' });
  assert.equal(failed.status, 1, failed.stderr);
  assert.match(failed.stdout, /AUDIT FAIL/);
  const report = readJson(join(dir, 'audit.json'));
  assert.equal(report.pass, false);
  assert.deepEqual(report.checks.map(c => c.name), CHECKS);
});

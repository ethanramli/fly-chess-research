#!/usr/bin/env node
// Independent auditor for a memory v8 run folder (2026-11-07): the v7 retention test with the practice ledger rebuilt from the verified captures (key K3). Scoring uses the known-certificate captures of each test position.
// Spec: documentation/design/neural-learning/memory-v8-proposal-2026-11-07.md (rev 2), sections 0-6 (section 6 item 3 is this file); this file is a copy of the v7 auditor with the changes the v8 proposal names.
// Re-implements every rule it checks from the spec. Imports only pinned shared libraries; never the v5-v8 runner, worker or task modules (engineered-memory-task-v*.mjs), nor the v4 ledger or task files.
// CLI: node .codebase/scripts/neural-learning/audit-engineered-memory-test-v8.mjs --run RUN_DIR --config CONFIG.json [--dry-run yes] [--workers 1|2|3|4]
// CONFIG.json: a registration file or a file with the same keys: { "paths": { "positionsAll", "positionsV4", "newPositions", "positionsV6", "positionsV7", "newSelection", "newGamesPgn", "priorSelections" (array of three paths), "v4Run", "v5Run", "v6Run", "v7Run" }, "v4CacheSha256", "v5CacheSha256", "newSha256": { "selection", "gamesPgn", "positions" }, "v5Files": { "partition.json": SHA256 }, "options": {...} (optional, test-only values) }.
// Writes RUN_DIR/audit.json. Exit 0 only when every check passes and the run is accepted: a full run also needs NEW_PINS and the pinned options (a dry run needs only the checks).
// Workers are child processes of this file (--audit-job), one job each.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Chess } from 'chess.js';
import { checkCaptureRetentionAction } from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { NearestEpisodeMemory, makeRandomExpansion, rmsScaler } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

// Pinned values (proposal sections 4 and 6). gateMargin 7 over testReference 150 gives M = ceil(7 N / 150) for N retained test positions.
const PINNED = Object.freeze({ columns: 5177, resamples: 10000, gateSeed: 20261108, practiceGames: 198, gateMargin: 7, testReference: 150, retentionMax: 0.02, lowerQuantile: 0.025 });
const CAPACITY = 4096;
const NEIGHBOURS = 3;
const MAX_REPLIES = 256;
const TASK = { objective: 'capture-retention', plies: 1 };
const RANDOM = { units: 5177, fanIn: 6, seed: 20261103, keep: 0.05 };
const SEEDS = [6101, 6102, 6103];
const KEY = 'K3';
const RAW_ARMS = ['raw-pc', 'random-pc'];
const ARMS = ['full', 'half', 'quarter', 'eighth', 'shuffled', 'none', ...RAW_ARMS];
const VERDICT_ARMS = ['full', 'none', 'shuffled', 'quarter'];
const CAPTURE_SALT = 0x7ca7;
// Salt of the v8 ledger order (proposal section 1, item 2).
const LEDGER_SALT = 0x1ed8;
// Worker grouping (memory-v7-worker.mjs SCORE_CHUNK, reused unchanged in v8): the all-legal total is one sum per chunk of positions.
const SCORE_CHUNK = 10;
// Piece values of the descriptive piece-value reference (spec 5 item 2).
const PIECE_VALUE = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 });
// v8 copies no file from the v5 run: partition.json is only read (its hash is checked); the ledgers and permutations are rebuilt here.
const CHECKS = ['data', 'testset', 'v5inputs', 'certificates', 'ledger', 'cache', 'permutation', 'jobs', 'scores', 'gate'];
// Exclusion reasons (spec 2). Precedence: practice board, then any earlier test board (v4 test, v5 fresh, v6 test or v7 test: one shared reason).
const EXCLUDED = Object.freeze({ practice: 'practice-board', earlierTest: 'earlier-test-board' });
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const RETINA = join(ROOT, '.cache', 'full.npz');
// Verifier sources every certificate header must hash (paths from the repository root).
const REQUIRED_SOURCES = ['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs'];
// Registered digests are given only as prefix...suffix in the proposal. The report is pinned only when a supplied digest matches both.
const V4_CACHE_PIN = /^699ec93b[0-9a-f]{51}a20e5$/;
const POSITIONS_PIN = /^4483226c[0-9a-f]{52}fa36$/;
const V6_POSITIONS_PIN = /^e78cbb24[0-9a-f]{52}0128$/; // the v6 new positions file (games 301-600), read for the 573 v6 test boards
const V7_POSITIONS_PIN = /^b65ecd1f[0-9a-f]{52}5afc$/; // the v7 new positions file (games 601-900), read for the 567 v7 test boards
// Registered digests of the three earlier game selections (games 1-300, 301-600, 601-900). The overlap check uses exactly these. Exact hex: a full run is pinned only when the config and the files both match.
export const PRIOR_SELECTION_PINS = Object.freeze(['5c212e69f6e5bd99f67b02abb8b6b90c86b4327e23a7b64023d11980f93f4bdd', 'af0ce4c715392b31786035292a9aa15d02941b0438665b3db41df3960f127101', '54f70ed4cf886d5b36f905028a8c3a44637bedcdb48885aff22591656773fa7b']);
// Registered digests of the games 901-1200 data (the v8 new games: selection, games file, positions).
export const NEW_PINS = Object.freeze({
  selection: '109685dea3c521ff2e80c91149b37c0da3117149bcd282fb115b67c90b93457d',
  gamesPgn: 'ab1f8f588a50e3e03557712ba75e04f328a8cd11976170289d673132ef3656b2',
  positions: 'be6abf395045c92cbaa1ea8a68d85d3e7c0c0df45bafb13eabb51a7302136059',
});
// Registered digests of the earlier test partitions (v6 and v7 run folders), read for the exclusions.
export const PRIOR_PARTITION_PINS = Object.freeze({ v6: 'c594dbb68189b6ebb6e0ba5ec5011cf4ad4c24393d5b9fa79cca21c0ce683211', v7: '3428656f4896c6697655651ba0484935c848a65fb7c9c87011427cf59d39af8e' });
// Registered digests of the v5 partition and cache, and of the v4 and v5 keys.json row maps. Each must match in an accepted run; the config alone is not enough (checkV5Inputs, checkCache).
export const V5_PARTITION_PIN = '32c54bb977c83524bb36d2d81356030751d1c13e53d1e77a6549b9ab23c6d80c';
export const V5_CACHE_PIN = '0239bd6c71e8e62091aa6d58c85f4dd14b7498968572cc9787e8434f6bdf970b';
export const KEYS_PINS = Object.freeze({ v4: 'e5362275852d0126dcabc7e4f2b76f41cfbb71c712c6dcfb7d944f429ec782c1', v5: '2c7ee7f0d67b8b3355d96276be7f2934a043bf4451c2e1e68365f881f6df267b' });
// The verdict rule's comparator arms (spec 4; the runner's judgeV8 rule).
const COMPARATORS = ['none', 'shuffled', 'quarter'];
const ZERO = Float64Array.of(0);

const sha256 = data => createHash('sha256').update(data).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uciOf = m => m.from + m.to + (m.promotion ?? '');
const idOf = p => `${p.gameId}:${p.ply}`;
const piecesOf = fen => fen.split(' ')[0];
const isKnown = v => v === 1 || v === -1;
// JSON with object keys sorted at every level, so equal content gives equal text.
const canon = v => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x));
const short = v => (JSON.stringify(v) ?? 'undefined').slice(0, 80);
const readJsonAt = path => JSON.parse(readFileSync(path, 'utf8'));
const readJson = (dir, name) => readJsonAt(join(dir, name));
const readJsonl = (dir, name) => readFileSync(join(dir, name), 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
const jobName = j => `${j.phase}-${j.key}-${j.direction}-${j.seed}-${j.arm}.json`;
const identityOf = (seed, arm) => ({ phase: 'confirm', key: RAW_ARMS.includes(arm) ? arm : KEY, direction: '-', seed, arm });
const jobIdentities = () => SEEDS.flatMap(seed => ARMS.map(arm => identityOf(seed, arm)));
const resolveOptions = options => ({ ...PINNED, rawRandom: true, limitPositions: null, ...options });
// Spec 4: M = ceil(gateMargin * N / testReference), N = retained test positions.
const marginFloorOf = (opt, n) => Math.ceil((opt.gateMargin * n) / opt.testReference);
const totalOf = rows => rows.reduce((total, x) => total + x.expected, 0);
// Spec 3: forward partial Fisher-Yates, the first m entries of a shuffled copy (the v4 ledger's partialFisherYates, re-implemented: this file imports no v4 module).
function partialFisherYates(list, m, rng) {
  const a = [...list], n = a.length;
  for (let i = 0; i < m; i++) { const j = i + Math.floor(rng() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, m);
}

function sha256File(path) {
  const hash = createHash('sha256');
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.allocUnsafe(1 << 22);
    let pos = 0;
    let n;
    while ((n = readSync(fd, buf, 0, buf.length, pos)) > 0) { hash.update(buf.subarray(0, n)); pos += n; }
  } finally { closeSync(fd); }
  return hash.digest('hex');
}
// SHA-256 of a verifier source named from the repository root; null when the file cannot be read.
const currentSha256 = rel => { try { return sha256File(join(ROOT, rel)); } catch { return null; } };

// First difference between two JSON-like values (Object.is on leaves): the path, then both values. null when equal.
function firstDiff(a, b, path = '') {
  const at = path || '(root)';
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return Object.is(a, b) ? null : `${at}: ${short(a)} vs ${short(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${at}: type differs`;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const child = Array.isArray(a) ? `${path}[${k}]` : path ? `${path}.${k}` : k;
    const d = firstDiff(a[k], b[k], child);
    if (d) return d;
  }
  return null;
}

// Spec 3.1: replay the history from the start position; the result must equal the recorded FEN.
function replay(p) {
  const board = new Chess();
  for (const m of p.history) {
    if (!board.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.length > 4 ? m[4] : undefined })) throw new Error(`illegal history move ${m}`);
  }
  if (board.fen() !== p.fen) throw new Error('history does not replay to its FEN');
  return board;
}
function boardInfo(board) {
  const moves = board.moves({ verbose: true });
  return { board, moves: new Map(moves.map(m => [uciOf(m), m])), legal: moves.map(uciOf).sort(cmp) };
}

// Spec 3.3: category first (success -> safe; failure + capture -> unsafe; failure + non-capture -> quiet; unknown or scope-unknown -> unknown), then value.
function expectedOf(status, captured) {
  if (status === 'success') return { category: 'safe', value: 1 };
  if (status === 'failure') return captured ? { category: 'unsafe', value: -1 } : { category: 'quiet', value: -1 };
  if (status === 'unknown' || status === 'scope-unknown') return { category: 'unknown', value: null };
  throw new Error(`unrecognised status ${status}`);
}

// Spec 2 (v3 split rule): v4 games sorted by SHA-256 of 'engineered-memory-v3-split:' + gameId; the first practiceGames are practice, the rest are test.
function v4TestPositions(v4, practiceGames) {
  const rank = g => sha256(`engineered-memory-v3-split:${g}`);
  const games = [...new Set(v4.map(p => p.gameId))].sort((a, b) => cmp(rank(a), rank(b)));
  const practice = new Set(games.slice(0, practiceGames));
  // The v3 splitPositions (the runner's rule) also drops a test position whose board already appears in v4 practice.
  const practiceBoards = new Set(v4.filter(p => practice.has(p.gameId)).map(p => piecesOf(p.fen)));
  return v4.filter(p => !practice.has(p.gameId) && !practiceBoards.has(piecesOf(p.fen)));
}

// Shared state for every check and every job. The test set and the cache rows are memoised.
function makeContext(runDir, inputs, opt) {
  return {
    runDir, opt, all: inputs.positionsAll, v4: inputs.positionsV4, newPositions: inputs.newPositions, v6: inputs.v6Positions, v7: inputs.v7Positions,
    v4Run: inputs.v4Run, v5Run: inputs.v5Run, v6Run: inputs.v6Run, v7Run: inputs.v7Run, files: inputs.files, jobResults: opt.jobResults ?? null,
    test: null, boards: new Map(), positions: new Map(),
    certLines: null, certByKey: null, ledgers: null, capPerms: new Map(),
    caches: null, retina: null, eyes: null, expand: null,
    candidates: new Map(), means: new Map(), jobs: new Map(), outcome: null,
  };
}

// Spec 2: a new position is excluded when its board (FEN piece field) equals a v5 practice board (checked first), or a board of the
// v4 test set, the v5 fresh set, the v6 test set or the v7 test set. Retained positions keep generator order. A dry run keeps the first N retained positions; practice is never cut.
function testSetOf(ctx) {
  if (ctx.test) return ctx.test;
  const v5 = readJson(ctx.v5Run, 'partition.json');
  const v6Ids = readJson(ctx.v6Run, 'partition.json').freshTest;
  const v7Ids = readJson(ctx.v7Run, 'partition.json').freshTest;
  const lookup = (positions, label) => {
    const byId = new Map(positions.map(p => [idOf(p), p]));
    return id => { const p = byId.get(id); if (!p) throw new Error(`${label} position ${id} is not in its positions file`); return p; };
  };
  const v5Of = lookup(ctx.all, 'v5');
  const v6Of = lookup(ctx.v6, 'v6');
  const v7Of = lookup(ctx.v7, 'v7');
  const practice = v5.practice.map(v5Of);
  const practiceBoards = new Set(practice.map(p => piecesOf(p.fen)));
  const v4TestBoards = new Set(v4TestPositions(ctx.v4, ctx.opt.practiceGames).map(p => piecesOf(p.fen)));
  const v5FreshBoards = new Set(v5.freshTest.map(v5Of).map(p => piecesOf(p.fen)));
  const v6TestBoards = new Set(v6Ids.map(v6Of).map(p => piecesOf(p.fen)));
  const v7TestBoards = new Set(v7Ids.map(v7Of).map(p => piecesOf(p.fen)));
  const excluded = [];
  const fresh = [];
  for (const p of ctx.newPositions) {
    const board = piecesOf(p.fen);
    const reason = practiceBoards.has(board) ? EXCLUDED.practice
      : v4TestBoards.has(board) || v5FreshBoards.has(board) || v6TestBoards.has(board) || v7TestBoards.has(board) ? EXCLUDED.earlierTest : null;
    if (reason) excluded.push({ id: idOf(p), reason }); else fresh.push(p);
  }
  const limit = ctx.opt.limitPositions;
  const freshTest = limit === null ? fresh : fresh.slice(0, limit);
  const problems = [];
  const seen = new Set();
  for (const p of ctx.newPositions) {
    if (seen.has(idOf(p))) problems.push(`new positions repeat ${idOf(p)}`);
    seen.add(idOf(p));
  }
  for (const p of [...practice, ...freshTest]) {
    try { ctx.boards.set(idOf(p), boardInfo(replay(p))); ctx.positions.set(idOf(p), p); } catch (e) { problems.push(`${idOf(p)}: ${e.message}`); }
  }
  ctx.test = { practiceIds: practice.map(idOf), freshTest, freshIds: freshTest.map(idOf), excluded, problems };
  return ctx.test;
}
const legalOf = (ctx, id) => {
  testSetOf(ctx);
  const b = ctx.boards.get(id);
  if (!b) throw new Error(`no replayed board for ${id}`);
  return b.legal;
};
// Spec 1: the replayed board's capture status (en passant included, chess.js marks it as a capture).
function capturesOn(ctx, id, uci) {
  testSetOf(ctx);
  const board = ctx.boards.get(id);
  if (!board) throw new Error(`no replayed board for ${id}`);
  const m = board.moves.get(uci);
  if (!m) throw new Error(`${uci} is not legal at ${id}`);
  return Boolean(m.captured);
}
// Spec 1: the scoring set. Legal captures whose certificate is safe or unsafe (unknown captures are not candidates). Sorted UCI, like legalOf.
function candidatesOf(ctx, id) {
  if (!ctx.candidates.has(id)) {
    const list = legalOf(ctx, id).filter(uci => capturesOn(ctx, id, uci) && ['safe', 'unsafe'].includes(certOf(ctx, id, uci).category));
    ctx.candidates.set(id, list);
  }
  return ctx.candidates.get(id);
}

// Spec 1 and 3 (v8 ledger rule, proposal section 1): the EXPECTED ledger of each seed, rebuilt here from the rechecked practice certificates; the run's ledger files are only compared with it (ledger check).
// Base list: for each practice board in partition order, its legal captures in sorted UCI order whose certificate is safe or unsafe (unknown captures and quiet moves get no slot).
// Order: partialFisherYates over the base list with mulberry32((seed ^ LEDGER_SALT) >>> 0); slots are numbered after the shuffle.
// Every later use (permutation, scores, retention, the certificate slot loop) reads this expected content, never the run's ledger files.
function ensureLedgers(ctx) {
  if (!ctx.ledgers) {
    const base = [];
    for (const id of testSetOf(ctx).practiceIds) {
      for (const uci of legalOf(ctx, id)) {
        if (!capturesOn(ctx, id, uci)) continue;
        const c = certOf(ctx, id, uci);
        if (c.category === 'safe' || c.category === 'unsafe') base.push({ id, uci, category: c.category, value: c.value, certificateSha256: c.certificateSha256 });
      }
    }
    ctx.ledgers = Object.fromEntries(SEEDS.map(seed => {
      const indices = partialFisherYates(base.map((_, i) => i), base.length, mulberry32((seed ^ LEDGER_SALT) >>> 0));
      return [seed, indices.map((i, slot) => ({ slot, ...base[i] }))];
    }));
  }
  return ctx.ledgers;
}

// Spec 3 (v8): every expected ledger slot is a known-certificate capture, so K = L and every value is permuted. Forward Fisher-Yates over 0..K-1
// with mulberry32((seed ^ 0x7ca7) >>> 0). values is aligned to the whole ledger: a capture slot takes the permuted value; a slot that is not a known capture would keep its own value (the general form, unused in v8).
function capturePermOf(ctx, seed) {
  if (!ctx.capPerms.has(seed)) {
    const slots = ensureLedgers(ctx)[seed];
    const captureAt = [];
    slots.forEach((s, i) => { if (isKnown(s.value) && capturesOn(ctx, s.id, s.uci)) captureAt.push(i); });
    const K = captureAt.length;
    // Spec 3: partialFisherYates([0..K-1], K, mulberry32((seed ^ 0x7ca7) >>> 0)). No further salt (the v4 permuteKnownValues adds ^ 0x5eed; this one does not).
    const indices = partialFisherYates(captureAt.map((_, i) => i), K, mulberry32((seed ^ CAPTURE_SALT) >>> 0));
    const values = slots.map(s => s.value);
    captureAt.forEach((at, t) => { values[at] = slots[captureAt[indices[t]]].value; });
    ctx.capPerms.set(seed, { indices, values });
  }
  return ctx.capPerms.get(seed);
}

function ensureCerts(ctx) {
  if (!ctx.certLines) {
    const lines = readJsonl(ctx.runDir, 'certificates.jsonl');
    ctx.certLines = lines;
    ctx.certByKey = new Map(lines.slice(1).map(c => [`${c.id}|${c.uci}`, c]));
  }
  return ctx.certLines;
}
function certOf(ctx, id, uci) {
  ensureCerts(ctx); // a worker process reaches this before any check has loaded the file
  const c = ctx.certByKey.get(`${id}|${uci}`);
  if (!c) throw new Error(`no certificate line for ${id}|${uci}`);
  return c;
}

// Caches: v4, v5 and v8 (this run folder). A key in more than one cache throws. The v6 and v7 caches are not used.
function openCache(dir) {
  const rows = readJson(dir, 'keys.json').rows;
  const index = new Map();
  rows.forEach((key, i) => { if (i > 0 && !index.has(key)) index.set(key, i); });
  return { index, fd: openSync(join(dir, 'kc-cache.f32'), 'r') };
}
function cachesOf(ctx) {
  if (!ctx.caches) ctx.caches = { v4: openCache(ctx.v4Run), v5: openCache(ctx.v5Run), v8: openCache(ctx.runDir) };
  return ctx.caches;
}
function closeCaches(ctx) {
  for (const c of Object.values(ctx.caches ?? {})) closeSync(c.fd);
  ctx.caches = null;
}
function rowAt(ctx, cache, i) {
  const columns = ctx.opt.columns;
  const buf = Buffer.alloc(columns * 4);
  if (readSync(cache.fd, buf, 0, buf.length, i * columns * 4) !== buf.length) throw new Error(`cache row ${i} is missing or truncated`);
  const out = new Float64Array(columns);
  for (let c = 0; c < columns; c++) out[c] = buf.readFloatLE(c * 4);
  return out;
}
function rowOf(ctx, key) {
  const hits = Object.values(cachesOf(ctx)).filter(c => c.index.has(key));
  if (hits.length > 1) throw new Error(`key ${key} is in more than one cache`);
  if (hits.length === 0) throw new Error(`no cache row for ${key}`);
  return rowAt(ctx, hits[0], hits[0].index.get(key));
}

// Raw eye input over the retina and the fixed random expansion (as v3 to v6). Loaded only when rawRandom is on.
function retinaOf(ctx) {
  if (!ctx.retina) {
    ctx.retina = loadRetina(RETINA);
    ctx.eyes = createEyesV2(ctx.retina);
    ctx.expand = makeRandomExpansion({ inputs: ctx.retina.retina_idx.length, units: RANDOM.units, fanIn: RANDOM.fanIn, seed: RANDOM.seed });
  }
  return ctx.retina;
}
function rawOf(ctx, id, uci) {
  const retina = retinaOf(ctx);
  const at = new Map(ctx.eyes.encode(ctx.positions.get(id).fen, uci).stimulation.map(x => [x.index, x.current]));
  return Float64Array.from(retina.retina_idx, i => at.get(i) ?? 0);
}
function randomOf(ctx, id, uci) {
  retinaOf(ctx);
  return ctx.expand(rawOf(ctx, id, uci), RANDOM.keep);
}
function baseOf(ctx, feature, id, uci) {
  if (feature === 'row') return rowOf(ctx, `${id}|${uci}`);
  if (feature === 'raw') return rawOf(ctx, id, uci);
  return randomOf(ctx, id, uci);
}
// Mean over all legal moves of the position (K3 centres over every legal move, not only the candidates), summed in sorted-UCI order.
function meanOf(ctx, feature, id) {
  const key = `${feature}|${id}`;
  if (!ctx.means.has(key)) {
    const legal = legalOf(ctx, id);
    let sum = null;
    for (const uci of legal) {
      const v = baseOf(ctx, feature, id, uci);
      if (sum === null) sum = new Float64Array(v.length);
      for (let i = 0; i < v.length; i++) sum[i] += v[i];
    }
    ctx.means.set(key, Float64Array.from(sum, s => s / legal.length));
  }
  return ctx.means.get(key);
}
// Position-centred feature: row minus position mean (K3), or raw / random features minus their position mean (raw-pc, random-pc).
function transformOf(ctx, feature, id, uci) {
  const m = meanOf(ctx, feature, id);
  return Float64Array.from(baseOf(ctx, feature, id, uci), (x, i) => x - m[i]);
}
// Pipeline: pinned rmsScaler fitted on the calibration vectors, then the zero-RMS mask (coordinates 0 in every calibration vector score 0).
function fitPipeline(ctx, feature, calib) {
  const fit = calib.map(([id, uci]) => transformOf(ctx, feature, id, uci));
  const scale = rmsScaler(fit);
  const live = Uint8Array.from(fit[0], (_, i) => (fit.some(v => v[i] !== 0) ? 1 : 0));
  return {
    rmsSha256: scale.rmsSha256,
    zeroRmsFeatures: live.reduce((n, x) => n + (x ? 0 : 1), 0),
    apply(id, uci) {
      const v = scale(transformOf(ctx, feature, id, uci));
      for (let i = 0; i < v.length; i++) if (!live[i]) v[i] = 0;
      return v;
    },
  };
}
// Calibration (label-free): the first sorted legal move of each of the first floor(n/4) practice positions, in practice order.
const calibrationOf = (ctx, ids) => ids.slice(0, Math.floor(ids.length / 4)).map(id => [id, legalOf(ctx, id)[0]]);

// Store: one write per slot with a known value (null = no write); identical vectors replace (counted); the oldest entry is evicted at capacity.
function buildStore(slots, values, apply, arm) {
  const memory = new NearestEpisodeMemory({ capacity: CAPACITY, k: NEIGHBOURS });
  const counts = { writes: 0, unknown: 0, replacements: 0, evictions: 0, identicalConsistent: 0, identicalConflicting: 0 };
  slots.forEach((slot, i) => {
    const value = values[i];
    if (value === null) { counts.unknown++; return; }
    const vector = apply(slot.id, slot.uci);
    const same = memory.entries.find(e => e.vector.every((x, j) => x === vector[j]));
    if (same) {
      counts.replacements++;
      if (same.value === value) counts.identicalConsistent++;
      else counts.identicalConflicting++;
    } else if (memory.size === CAPACITY) counts.evictions++;
    memory.write(vector, value, sha256(JSON.stringify({ arm, slot: slot.slot, id: slot.id, uci: slot.uci, value })));
    counts.writes++;
  });
  return { memory, counts };
}

// Scores each target position over its scoring set (setOf: candidatesOf for the verdict, legalOf for the all-legal total) from one frozen memory.
// apply null = the none arm (all scores 0).
function scorePositions(ctx, memory, ids, apply, setOf) {
  return ids.map(id => {
    const set = setOf(ctx, id);
    const vectors = set.map(uci => (apply === null ? ZERO : apply(id, uci)));
    const scores = frozenScores(set.map((_, i) => i), i => memory.score(vectors[i]), () => memory.fingerprint());
    const top = Math.max(...scores);
    const tied = set.map((_, i) => i).filter(i => scores[i] === top);
    const s = tied.filter(i => certOf(ctx, id, set[i]).value === 1).length;
    return { id, c: tied.length, s, expected: s / tied.length };
  });
}

// Descriptive all-legal total (spec 5 item 1), the worker's allLegalScores: one chunk sum per SCORE_CHUNK positions, added in order, so the Float64 result is identical.
function allLegalTotalOf(ctx, memory, apply) {
  const ids = testSetOf(ctx).freshIds;
  let total = 0;
  for (let i = 0; i < ids.length; i += SCORE_CHUNK) total += totalOf(scorePositions(ctx, memory, ids.slice(i, i + SCORE_CHUNK), apply, legalOf));
  return total;
}

// Retention probes: known slots of the quarter prefix. Recalled when the sign of the score equals the original value (score 0 is not recalled).
function recallOf(memory, probes) {
  return probes.map(p => {
    const x = memory.score(p.vector);
    return x > 0 ? p.value === 1 : x < 0 ? p.value === -1 : false;
  });
}

// Descriptive (spec 5 item 2): the candidate with the largest captured value minus capturing value; ties scored s / c. Per-position expected values.
function pieceValueOf(ctx, ids) {
  return ids.map(id => {
    const { moves } = ctx.boards.get(id);
    const set = candidatesOf(ctx, id);
    const gain = uci => PIECE_VALUE[moves.get(uci).captured] - PIECE_VALUE[moves.get(uci).piece];
    const top = Math.max(...set.map(gain));
    const tied = set.filter(uci => gain(uci) === top);
    return tied.filter(uci => certOf(ctx, id, uci).value === 1).length / tied.length;
  });
}

// Rebuilds one job (identity, store, scores, counts, pipeline, retention, descriptive totals) from the run's inputs. Pure: only the caches are read from disk.
function computeJob(ctx, job) {
  const { seed, arm } = job;
  const feature = arm === 'raw-pc' ? 'raw' : arm === 'random-pc' ? 'random' : 'row';
  const t = testSetOf(ctx);
  const slots = ensureLedgers(ctx)[seed];
  const pipe = fitPipeline(ctx, feature, calibrationOf(ctx, t.practiceIds));
  const n = slots.length;
  let memory = new NearestEpisodeMemory({ capacity: CAPACITY, k: NEIGHBOURS });
  let counts = null; // the worker writes no counts for the none arm (no store)
  let retention = null;
  if (arm !== 'none') {
    const size = { quarter: Math.floor(n / 4), half: Math.floor(n / 2), eighth: Math.floor(n / 8) }[arm] ?? n;
    const storeSlots = slots.slice(0, size);
    const values = arm === 'shuffled' ? capturePermOf(ctx, seed).values : storeSlots.map(s => s.value);
    ({ memory, counts } = buildStore(storeSlots, values, pipe.apply, arm));
    if (arm === 'full' || arm === 'quarter') {
      const probes = slots.slice(0, Math.floor(n / 4)).filter(s => isKnown(s.value)).map(s => ({ value: s.value, vector: pipe.apply(s.id, s.uci) }));
      const recalled = recallOf(memory, probes);
      retention = arm === 'quarter' ? { probes: probes.length, recalledQuarter: recalled } : { probes: probes.length, recalledFull: recalled };
    }
  }
  const apply = arm === 'none' ? null : pipe.apply;
  const scores = scorePositions(ctx, memory, t.freshIds, apply, candidatesOf);
  const result = {
    job: { phase: job.phase, key: job.key, direction: job.direction, seed, arm },
    scores,
    expectedTotal: totalOf(scores),
    counts,
    pipeline: { rmsSha256: pipe.rmsSha256, zeroRmsFeatures: pipe.zeroRmsFeatures },
    fingerprint: arm === 'none' ? null : memory.fingerprint(), // the worker writes null for the none arm
  };
  if (arm === 'full' || arm === 'none') result.allLegalScores = allLegalTotalOf(ctx, memory, apply);
  if (arm === 'none') result.pieceValue = pieceValueOf(ctx, t.freshIds).reduce((total, x) => total + x, 0);
  if (retention) result.retention = retention;
  return result;
}

// A job result comes from the worker results when present (--workers), otherwise it is computed here once.
function getJob(ctx, job) {
  const name = jobName(job);
  if (ctx.jobResults?.has(name)) {
    const r = ctx.jobResults.get(name);
    if (r.error) throw new Error(r.error);
    return r.result;
  }
  if (!ctx.jobs.has(name)) ctx.jobs.set(name, computeJob(ctx, job));
  return ctx.jobs.get(name);
}

// Spec 4 and 5: per seed, numericPairGate on the four verdict arms (expected score per game), then the margin floor M, the strict lower bounds and the retention rule.
// Pure: judgeV8 feeds it the rebuilt jobs. Pass only when every seed passes. Returns the verdict shape the runner writes, rule included.
// M = ceil(gateMargin * N / testReference) with N = games.length (spec 4).
export function verdictOf(games, seeds, opt) {
  const M = marginFloorOf(opt, games.length);
  const rule = { margin: M, n: games.length, primary: 'full', comparators: [...COMPARATORS], quarterMarginAbove: 0, lowerBoundAbove: 0, lowerQuantile: opt.lowerQuantile, gateSeed: opt.gateSeed, maxLostShare: opt.retentionMax, resamples: opt.resamples };
  const perSeed = seeds.map(({ seed, arms, retention }) => {
    const gate = numericPairGate({ arms, games, primary: 'full', comparators: COMPARATORS, minCorrect: 0, minMargin: 0, resamples: opt.resamples, seed: opt.gateSeed, lowerQuantile: opt.lowerQuantile });
    const m = gate.comparators;
    const pass = m.none.margin >= M && m.shuffled.margin >= M && m.quarter.margin > 0
      && m.none.lower > 0 && m.shuffled.lower > 0 && m.quarter.lower > 0
      && retention.previouslyRecalled > 0 && retention.lost / retention.previouslyRecalled <= opt.retentionMax;
    return { seed, gate, retention, pass };
  });
  const pass = perSeed.every(s => s.pass);
  return { perSeed, pass, outcome: pass ? 'passes' : 'does not pass', rule };
}
function judgeV8(ctx) {
  const games = testSetOf(ctx).freshTest.map(p => p.gameId);
  const seeds = SEEDS.map(seed => {
    const job = arm => getJob(ctx, identityOf(seed, arm));
    const arms = Object.fromEntries(VERDICT_ARMS.map(a => [a, job(a).scores.map(x => x.expected)]));
    return { seed, arms, retention: retentionOf(job('quarter').retention.recalledQuarter, job('full').retention.recalledFull) };
  });
  return verdictOf(games, seeds, ctx.opt);
}
// Spec 6: retention contrast per seed on the quarter and full probes.
function retentionOf(quarter, full) {
  if (full.length !== quarter.length) throw new Error('quarter and full probe lists differ in length');
  const previouslyRecalled = quarter.filter(Boolean).length;
  const lost = quarter.filter((x, i) => x && !full[i]).length;
  return { probes: quarter.length, previouslyRecalled, recalledFull: full.filter(Boolean).length, lost };
}

// Checks. Each returns { pass, detail }; auditRun wraps them so a thrown error becomes a failed check.
function checkData(ctx) {
  const problems = [];
  const { files } = ctx;
  const want = ctx.opt.newSha256 ?? {};
  for (const [name, path] of [['selection', files.newSelection], ['gamesPgn', files.newGamesPgn], ['positions', files.newPositions]]) {
    const digest = sha256File(path);
    if (digest !== want[name]) problems.push(`${name} SHA-256 ${digest} differs from config`);
  }
  const ids = readJsonAt(files.newSelection).ids;
  const priorSelections = files.priorSelections ?? [];
  const priorHashes = priorSelections.map(path => sha256File(path));
  const priorPins = ctx.opt.priorSelectionPins ?? PRIOR_SELECTION_PINS; // test-only override makes the report unpinned
  if (priorHashes.length !== priorPins.length || priorPins.some(h => !priorHashes.includes(h))) problems.push(`prior selections must be exactly the ${priorPins.length} pinned files (got ${priorHashes.map(h => h.slice(0, 8)).join(', ') || 'none'})`);
  const prior = new Set(priorSelections.flatMap(path => readJsonAt(path).ids));
  if (new Set(ids).size !== ids.length) problems.push('new selection repeats a game id');
  const selectionOverlap = ids.filter(g => prior.has(g)).length;
  if (selectionOverlap) problems.push(`${selectionOverlap} new selected games are in the prior selections`);
  const posGames = new Set(ctx.newPositions.map(p => p.gameId));
  const positionOverlap = [...posGames].filter(g => prior.has(g)).length;
  if (positionOverlap) problems.push(`${positionOverlap} games of the new positions are in the prior selections`);
  const selected = new Set(ids);
  const outsideSelection = [...posGames].filter(g => !selected.has(g)).length;
  if (outsideSelection) problems.push(`${outsideSelection} games of the new positions are not in the new selection`);
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.slice(0, 3).join('; ')
      : `selection, games and positions SHA-256 match config; ${ids.length} new games and ${posGames.size} position games disjoint from ${prior.size} prior games in ${priorSelections.length} selections; every position game is in the new selection`,
  };
}

function checkTestSet(ctx) {
  const t = testSetOf(ctx);
  const file = readJson(ctx.runDir, 'partition.json');
  const manifest = readJson(ctx.runDir, 'manifest.json');
  const problems = [...t.problems];
  const d1 = firstDiff(file.freshTest, t.freshIds, 'freshTest');
  if (d1) problems.push(d1);
  const d2 = firstDiff(file.excluded, t.excluded, 'excluded');
  if (d2) problems.push(d2);
  // Spec 2: the run's practice list is the v5 practice list, the same ids in the same order (it sets the ledgers and the calibration).
  const d3 = firstDiff(file.practice, readJson(ctx.v5Run, 'partition.json').practice, 'practice');
  if (d3) problems.push(d3);
  if (sha256File(join(ctx.runDir, 'partition.json')) !== manifest.partitionSha256) problems.push('partition.json SHA-256 differs from manifest.partitionSha256');
  // Spec 2: the v6 and v7 partitions are read for the exclusions, so their digests are checked (a test-only override makes the report unpinned).
  const pins = ctx.opt.priorPartitionPins ?? PRIOR_PARTITION_PINS;
  for (const [label, dir] of [['v6', ctx.v6Run], ['v7', ctx.v7Run]]) {
    if (sha256File(join(dir, 'partition.json')) !== pins[label]) problems.push(`${label} partition.json SHA-256 differs from its ${ctx.opt.priorPartitionPins ? 'test' : 'pinned'} value`);
  }
  // Spec 1: every retained position needs a safe and an unsafe candidate, or the run stops.
  for (const id of t.freshIds) {
    const cats = new Set(candidatesOf(ctx, id).map(uci => certOf(ctx, id, uci).category));
    if (!cats.has('safe') || !cats.has('unsafe')) problems.push(`${id} lacks a safe or an unsafe capture candidate`);
  }
  const byReason = Object.values(EXCLUDED).map(r => `${r} ${t.excluded.filter(x => x.reason === r).length}`).join(', ');
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.slice(0, 3).join('; ')
      : `${t.freshIds.length} retained in generator order; ${t.excluded.length} excluded (${byReason}); ${t.practiceIds.length} v5 practice boards; every retained position has safe and unsafe candidates; partition.json lists and practice order match (practice equals v5) and SHA-256 matches manifest; v6 and v7 partition SHA-256 match their pins`,
  };
}

function checkV5Inputs(ctx) {
  const problems = [];
  const hashes = ctx.opt.v5Files ?? {};
  // v8 copies no v5 file: the config names partition.json alone (schedules, ledgers and permutations are rebuilt, not copied).
  const names = Object.keys(hashes);
  if (names.length !== 1 || names[0] !== 'partition.json') problems.push(`config v5Files must name only partition.json (got ${names.join(', ') || 'none'})`);
  const v5Digest = sha256File(join(ctx.v5Run, 'partition.json'));
  if (hashes['partition.json'] === undefined) problems.push('config gives no SHA-256 for v5 partition.json');
  else if (v5Digest !== hashes['partition.json']) problems.push('v5 partition.json SHA-256 differs from config');
  // Spec 2 (v8 binding): the registered digest, independent of the config. A test-only v5PartitionPin replaces it and makes the report unpinned.
  if (v5Digest !== (ctx.opt.v5PartitionPin ?? V5_PARTITION_PIN)) problems.push(`v5 partition.json SHA-256 differs from its ${ctx.opt.v5PartitionPin === undefined ? 'pinned' : 'test'} value`);
  ensureCerts(ctx);
  const practice = new Set(testSetOf(ctx).practiceIds);
  const v5Lines = readJsonl(ctx.v5Run, 'certificates.jsonl').slice(1).filter(c => practice.has(c.id));
  const mine = ctx.certLines.slice(1).filter(c => practice.has(c.id));
  if (mine.length !== v5Lines.length) problems.push(`${mine.length} practice certificate lines, v5 has ${v5Lines.length}`);
  else {
    const byKey = new Map(mine.map(c => [`${c.id}|${c.uci}`, c]));
    for (const c of v5Lines) {
      const key = `${c.id}|${c.uci}`;
      if (!byKey.has(key) || canon(byKey.get(key)) !== canon(c)) problems.push(`practice certificate ${key} differs from v5`);
    }
  }
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.slice(0, 3).join('; ')
      : `v5 partition.json SHA-256 matches config and its ${ctx.opt.v5PartitionPin === undefined ? 'registered' : 'test'} value, and is the only v5 file named; ${v5Lines.length} practice certificate lines identical to v5; no v5 schedule, ledger or permutation is copied`,
  };
}

function checkCertificates(ctx) {
  ensureCerts(ctx);
  const t = testSetOf(ctx);
  const header = ctx.certLines[0] ?? {};
  const certs = ctx.certLines.slice(1);
  const practiceIds = new Set(testSetOf(ctx).practiceIds);
  const problems = [];
  if (header.kind !== 'verifier') problems.push('line 1 is not the verifier header');
  if (canon(header.task) !== canon(TASK)) problems.push('task is not the one-reply capture-retention task');
  if (header.maxReplies !== MAX_REPLIES) problems.push('maxReplies is not 256');
  if (!header.sources || typeof header.sources !== 'object') problems.push('verifier sources missing');
  else {
    for (const [rel, hash] of Object.entries(header.sources)) if (currentSha256(rel) !== hash) problems.push(`verifier source ${rel} differs from the file now`);
    for (const rel of REQUIRED_SOURCES) if (!Object.hasOwn(header.sources, rel)) problems.push(`verifier sources lack ${rel}`);
  }
  if (certs.length !== ctx.certByKey.size) problems.push('certificates.jsonl repeats a line');
  certs.forEach((c, i) => {
    // Spec 5.3: the copied v5 practice block, then the appended test block; each block is in id/uci order.
    const blockStart = i > 0 && practiceIds.has(certs[i - 1].id) && !practiceIds.has(c.id);
    if (i > 0 && !blockStart && !(certs[i - 1].id < c.id || (certs[i - 1].id === c.id && certs[i - 1].uci < c.uci))) problems.push(`line ${c.id}|${c.uci} is out of id/uci order`);
    if (i > 0 && !practiceIds.has(certs[i - 1].id) && practiceIds.has(c.id)) problems.push(`practice line ${c.id}|${c.uci} after a test line`);
  });
  // Every legal move of every practice and test position has one line. Each non-king proof is replayed on its replayed board (practice too; v5inputs checks identity with v5 only).
  const expectedKeys = new Set();
  let practiceLines = 0;
  let practiceProofs = 0;
  let testProofs = 0;
  let kings = 0;
  for (const id of [...t.practiceIds, ...t.freshIds]) {
    const practice = practiceIds.has(id);
    const { board, moves } = ctx.boards.get(id);
    const position = ctx.positions.get(id);
    for (const [uci, m] of moves) {
      const key = `${id}|${uci}`;
      expectedKeys.add(key);
      const line = ctx.certByKey.get(key);
      if (!line) { problems.push(`${practice ? 'missing practice line' : 'missing line'} ${key}`); continue; }
      if (practice) practiceLines++;
      const captured = Boolean(m.captured);
      try {
        if (captured && m.piece === 'k') {
          kings++;
          if (line.status !== 'scope-unknown' || line.proof !== null || line.certificateSha256 !== null) problems.push(`${key}: king capture must be scope-unknown with null proof`);
        } else {
          if (practice) practiceProofs++; else testProofs++;
          const r = checkCaptureRetentionAction(board, uci, { ...TASK }, line.proof, { maxReplies: MAX_REPLIES });
          if (line.proof?.status !== line.status || r.status !== line.status || r.verified !== (line.status !== 'unknown')) problems.push(`${key}: replay gives ${r.status}, line says ${line.status}`);
          if ((line.proof?.certificateSha256 ?? null) !== line.certificateSha256) problems.push(`${key}: certificateSha256 differs from its proof`);
        }
        const want = expectedOf(line.status, captured);
        if (line.category !== want.category || line.value !== want.value) problems.push(`${key}: category/value ${line.category}/${line.value}, expected ${want.category}/${want.value}`);
        if (position.moves.find(x => x.uci === uci)?.outcome !== line.category) problems.push(`${key}: category differs from the positions outcome`);
      } catch (e) { problems.push(`${key}: ${e.message}`); }
    }
  }
  // Each expected ledger slot carries the value, category and certificate hash of its checked practice line. The expected ledger is built from these lines, so this agrees by construction; the run's own ledger files are compared in checkLedger.
  let slotsChecked = 0;
  for (const seed of SEEDS) {
    for (const slot of ensureLedgers(ctx)[seed]) {
      slotsChecked++;
      const key = `${slot.id}|${slot.uci}`;
      const line = ctx.certByKey.get(key);
      if (!line || !practiceIds.has(slot.id)) problems.push(`ledger-${seed} slot ${slot.slot} (${key}) has no practice line`);
      else if (slot.value !== line.value || slot.category !== line.category || slot.certificateSha256 !== line.certificateSha256) problems.push(`ledger-${seed} slot ${slot.slot} (${key}) differs from its checked certificate`);
    }
  }
  for (const key of ctx.certByKey.keys()) if (!expectedKeys.has(key)) problems.push(`extra line ${key}`);
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}`
      : `${expectedKeys.size} legal moves; ${practiceLines} practice lines present; ${practiceProofs} practice and ${testProofs} test proofs replayed, ${kings} king captures scope-unknown; ${slotsChecked} ledger slots match their checked practice certificates; ${Object.keys(header.sources ?? {}).length} verifier sources match the files`,
  };
}

// Spec 1 and 3 (ledger check): each run ledger-<seed>.jsonl equals the expected ledger slot by slot. Also: the slot count, every eligible capture exactly once, and no quiet or unknown slot.
function checkLedger(ctx) {
  const expected = ensureLedgers(ctx);
  const eligible = new Set(expected[SEEDS[0]].map(s => `${s.id}|${s.uci}`));
  const problems = [];
  const summary = [];
  for (const seed of SEEDS) {
    const name = `ledger-${seed}.jsonl`;
    if (!existsSync(join(ctx.runDir, name))) { problems.push(`${name} missing`); continue; }
    let slots;
    try { slots = readJsonl(ctx.runDir, name); } catch (e) { problems.push(`${name}: unreadable (${e.message})`); continue; }
    const want = expected[seed];
    if (slots.length !== want.length) problems.push(`${name} has ${slots.length} slots, expected ${want.length}`);
    const seen = new Map();
    for (const s of slots) {
      const key = `${s.id}|${s.uci}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (s.category === 'quiet' || s.category === 'unknown') problems.push(`${name} slot ${s.slot} (${key}) is ${s.category}`);
      else if (!eligible.has(key)) problems.push(`${name} slot ${s.slot} (${key}) is not an eligible capture`);
    }
    for (const key of eligible) {
      const n = seen.get(key) ?? 0;
      if (n === 0) problems.push(`${name} is missing ${key}`);
      else if (n > 1) problems.push(`${name} repeats ${key} (${n} times)`);
    }
    const at = slots.slice(0, want.length).findIndex((s, i) => canon(s) !== canon(want[i]));
    if (at >= 0) problems.push(firstDiff(slots[at], want[at], `${name}[${at}]`) ?? `${name}[${at}] differs from the expected slot`);
    summary.push(`seed ${seed}: ${want.length} slots, ${want.filter(s => s.category === 'safe').length} safe`);
  }
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}`
      : `${summary.join('; ')}; every eligible capture once; no quiet or unknown slot; each ledger equals the expected ledger slot by slot`,
  };
}

function checkCache(ctx) {
  const problems = [];
  const columns = ctx.opt.columns;
  const t = testSetOf(ctx);
  const rowsOf = dir => readJson(dir, 'keys.json').rows;
  const v4Rows = rowsOf(ctx.v4Run);
  const v5Rows = rowsOf(ctx.v5Run);
  const rows = rowsOf(ctx.runDir);
  for (const [name, list] of [['v4', v4Rows], ['v5', v5Rows], ['v8', rows]]) if (list[0] !== 'blank') problems.push(`${name} row 0 is not blank`);
  const v4Keys = new Set(v4Rows.slice(1));
  const v5Keys = new Set(v5Rows.slice(1));
  const v8Keys = rows.slice(1);
  const overlap = (a, b) => [...a].filter(k => b.has(k)).length;
  const shared = [['v4', 'v5', overlap(v4Keys, v5Keys)], ['v4', 'v8', overlap(v4Keys, new Set(v8Keys))], ['v5', 'v8', overlap(v5Keys, new Set(v8Keys))]];
  for (const [a, b, n] of shared) if (n) problems.push(`${n} keys are in both the ${a} and ${b} caches`);
  // Spec 5: the new keys are exactly the legal moves of the test positions that the v4 and v5 caches do not hold (all legal moves, because K3 centres over them).
  const expected = new Set();
  for (const id of t.freshIds) for (const uci of legalOf(ctx, id)) { const key = `${id}|${uci}`; if (!v4Keys.has(key) && !v5Keys.has(key)) expected.add(key); }
  if (new Set(v8Keys).size !== v8Keys.length) problems.push('duplicate key in keys.json');
  if (!(v8Keys.length === expected.size && v8Keys.every(k => expected.has(k)))) problems.push(`keys.json is not exactly the ${expected.size} new legal moves of the test positions`);
  const schema = readJson(ctx.runDir, 'cache-schema.json');
  const manifest = readJson(ctx.runDir, 'manifest.json');
  if (schema.rows !== rows.length) problems.push('cache-schema rows differ from keys.json');
  if (schema.columns !== columns || schema.dtype !== 'float32' || schema.byteOrder !== 'little' || !Array.isArray(schema.kcIndices) || schema.kcIndices.length !== columns) problems.push('cache-schema shape, dtype or byte order is wrong');
  for (const [name, dir, n] of [['v4', ctx.v4Run, v4Rows.length], ['v5', ctx.v5Run, v5Rows.length], ['v8', ctx.runDir, rows.length]]) {
    const bytes = statSync(join(dir, 'kc-cache.f32')).size;
    if (bytes !== n * columns * 4) problems.push(`${name} kc-cache.f32 is ${bytes} bytes, expected ${n * columns * 4}`);
  }
  const v4Digest = sha256File(join(ctx.v4Run, 'kc-cache.f32'));
  const v5Digest = sha256File(join(ctx.v5Run, 'kc-cache.f32'));
  const v8Digest = sha256File(join(ctx.runDir, 'kc-cache.f32'));
  if (!ctx.opt.v4CacheSha256) problems.push('config gives no v4CacheSha256');
  else if (v4Digest !== ctx.opt.v4CacheSha256) problems.push(`v4 kc-cache.f32 SHA-256 ${v4Digest} differs from config v4CacheSha256`);
  if (!ctx.opt.v5CacheSha256) problems.push('config gives no v5CacheSha256');
  else if (v5Digest !== ctx.opt.v5CacheSha256) problems.push(`v5 kc-cache.f32 SHA-256 ${v5Digest} differs from config v5CacheSha256`);
  // Spec 5 (v8 binding): the v4 and v5 row maps are pinned. With the cache bytes above, each row is read from the registered bytes.
  const keysPins = ctx.opt.keysPins ?? KEYS_PINS;
  for (const [label, dir] of [['v4', ctx.v4Run], ['v5', ctx.v5Run]]) {
    const digest = sha256File(join(dir, 'keys.json'));
    if (digest !== keysPins[label]) problems.push(`${label} keys.json SHA-256 ${digest} differs from its ${ctx.opt.keysPins === undefined ? 'pinned' : 'test'} value`);
  }
  if (v8Digest !== schema.fileSha256 || v8Digest !== manifest.cacheSha256) problems.push('kc-cache.f32 SHA-256 differs from cache-schema or manifest');
  const blankOf = dir => {
    const fd = openSync(join(dir, 'kc-cache.f32'), 'r');
    try {
      const b = Buffer.alloc(columns * 4);
      return readSync(fd, b, 0, b.length, 0) === b.length ? b : null;
    } finally { closeSync(fd); }
  };
  const b4 = blankOf(ctx.v4Run);
  const b5 = blankOf(ctx.v5Run);
  const b8 = blankOf(ctx.runDir);
  if (!b4 || !b5 || !b8 || !b4.equals(b5) || !b5.equals(b8)) problems.push('row 0 (blank) differs between the v4, v5 and v8 caches');
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.join('; ')
      : `${v8Keys.length} new keys exact; ${v4Keys.size} v4 and ${v5Keys.size} v5 keys disjoint from them; row 0 equal in all three caches; v4, v5 and v8 SHA-256 match config, cache-schema and manifest; v4 and v5 keys.json SHA-256 match their ${ctx.opt.keysPins === undefined ? 'pinned' : 'test'} values`,
  };
}

// Spec 3: the capture permutation file of each seed equals the recomputed one (indices and whole-ledger values), built from the expected ledger.
function checkPermutation(ctx) {
  const problems = [];
  const sizes = [];
  for (const seed of SEEDS) {
    const name = `permutation-capture-${seed}.json`;
    const path = join(ctx.runDir, name);
    if (!existsSync(path)) { problems.push(`${name} missing`); continue; }
    let file;
    try { file = readJsonAt(path); } catch (e) { problems.push(`${name}: unreadable (${e.message})`); continue; }
    const want = capturePermOf(ctx, seed);
    const diff = firstDiff(file, want, name);
    if (diff) problems.push(diff);
    sizes.push(want.indices.length);
  }
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}`
      : `${SEEDS.length} capture permutations match the ledgers: every slot is a capture (all values permuted), K = ${sizes.join(', ')}`,
  };
}

function checkJobs(ctx) {
  const dir = join(ctx.runDir, 'jobs');
  const present = existsSync(dir) ? readdirSync(dir).filter(f => !f.endsWith('.steady')) : []; // .steady = worker admission markers
  const expected = new Map(jobIdentities().map(j => [jobName(j), j]));
  const problems = [];
  for (const name of expected.keys()) if (!present.includes(name)) problems.push(`missing job file ${name}`);
  for (const name of present) {
    if (!expected.has(name)) { problems.push(`extra job file ${name}`); continue; }
    const declared = readJson(dir, name).job;
    if (canon(declared) !== canon(expected.get(name))) problems.push(`${name} declares job ${canon(declared)}`);
  }
  return {
    pass: problems.length === 0,
    detail: problems.length ? problems.slice(0, 4).join('; ') : `${expected.size} expected jobs (${SEEDS.length} seeds x ${ARMS.length} arms); no extra or duplicate files`,
  };
}

function checkScores(ctx) {
  const dir = join(ctx.runDir, 'jobs');
  const problems = [];
  let recomputed = 0;
  let notRechecked = 0;
  for (const job of jobIdentities()) {
    const name = jobName(job);
    const path = join(dir, name);
    if (!existsSync(path)) { problems.push(`${name}: missing job file`); continue; }
    if (RAW_ARMS.includes(job.arm) && !ctx.opt.rawRandom) { notRechecked++; continue; }
    let file;
    try { file = readJsonAt(path); } catch (e) { problems.push(`${name}: unreadable (${e.message})`); continue; }
    const { peakRssMiB, ...rest } = file;
    let want;
    try { want = getJob(ctx, job); } catch (e) { problems.push(`${name}: recompute failed (${e.message})`); continue; }
    const diff = firstDiff(rest, want, name);
    if (diff) problems.push(diff);
    else recomputed++;
  }
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}`
      : `${recomputed} jobs rebuilt exactly (candidate scores, all-legal and piece-value totals, counts, scaler, store, fingerprint, retention); ${notRechecked} raw and random jobs not rechecked (no retina in this run)`,
  };
}

function checkGate(ctx, summary) {
  const t = testSetOf(ctx);
  const verdict = judgeV8(ctx);
  const outcome = verdict.pass ? 'passes' : 'does not pass';
  ctx.outcome = outcome;
  const problems = [];
  if (summary?.outcome !== outcome) problems.push(`summary.outcome is ${short(summary?.outcome)}, recomputed ${outcome}`);
  // The whole recorded verdict, rule included (verdictOf rebuilds the rule from the pinned values).
  const diff = firstDiff(summary?.verdict ?? null, verdict, 'verdict');
  if (diff) problems.push(diff);
  // Spec 4: the top-level margin the runner writes (its verdict.rule.margin).
  if (summary?.margin !== verdict.rule.margin) problems.push(`summary.margin is ${short(summary?.margin)}, recomputed ${verdict.rule.margin}`);
  // v8 proposal section 2: counts of each store arm per seed, rebuilt from the job counts. The none arm has no store and is left out.
  // Raw and random arms are compared only when rawRandom is on (as in checkScores); the recorded side drops them otherwise.
  const checked = arm => ctx.opt.rawRandom || !RAW_ARMS.includes(arm);
  const rebuilt = Object.fromEntries(SEEDS.map(seed => [seed, Object.fromEntries(ARMS.filter(checked).map(arm => [arm, getJob(ctx, identityOf(seed, arm)).counts]).filter(([, counts]) => counts !== null))]));
  const recorded = summary?.storeCounts == null ? null : Object.fromEntries(Object.entries(summary.storeCounts).map(([seed, arms]) => [seed, Object.fromEntries(Object.entries(arms ?? {}).filter(([arm]) => checked(arm)))]));
  const d2 = firstDiff(recorded, rebuilt, 'storeCounts');
  if (d2) problems.push(d2);
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.slice(0, 3).join('; ')
      : `outcome ${outcome}; M = ${verdict.rule.margin} for ${t.freshIds.length} test positions; numericPairGate recomputed for ${SEEDS.length} seeds with gate seed ${ctx.opt.gateSeed}; full verdict including rule matches summary.verdict; summary.margin and storeCounts match the job counts`,
  };
}

// Job files and worker results. A worker recomputes exactly one job and prints it as one JSON line.
function runChild(job, args) {
  const payload = JSON.stringify({ run: args.runDir, config: args.configPath, identity: job, options: args.options });
  return new Promise(resolve => {
    execFile(process.execPath, ['--max-old-space-size=256', fileURLToPath(import.meta.url), '--audit-job', payload], { maxBuffer: 1 << 28 }, (err, stdout, stderr) => {
      if (err) return resolve({ error: stderr.trim().split('\n').pop() || err.message });
      return resolve({ result: JSON.parse(stdout.trim().split('\n').pop()).result });
    });
  });
}
async function runJobs(identities, args, results) {
  const queue = [...identities];
  const lanes = Array.from({ length: Math.min(args.workers, queue.length) }, async () => {
    while (queue.length) {
      const job = queue.shift();
      results.set(jobName(job), await runChild(job, args));
    }
  });
  await Promise.all(lanes);
}
// Computes the confirm jobs through child processes. Anything not precomputed is computed in-process by auditRun.
async function precomputeJobs(runDir, configPath, inputs, options, workers) {
  const opt = resolveOptions(options);
  const ctx = makeContext(runDir, inputs, opt);
  const results = new Map();
  const args = { runDir, configPath, workers, options };
  const runnable = ids => ids.filter(j => opt.rawRandom || !RAW_ARMS.includes(j.arm));
  try {
    if (testSetOf(ctx).problems.length) return results;
    await runJobs(runnable(jobIdentities()), args, results);
    return results;
  } catch {
    return results;
  } finally { closeCaches(ctx); }
}

// Entry point. inputs = { positionsAll, positionsV4, newPositions, v6Positions, v7Positions, v4Run, v5Run, v6Run, v7Run, files }; files = paths to hash and read for the data check
// (files.priorSelections is an array of selection paths). Options: pinned values, test-only values (columns, resamples, practiceGames, testReference, rawRandom: false),
// v4CacheSha256, v5CacheSha256, newSha256, v5Files, positionsAllSha256, v6PositionsSha256, v7PositionsSha256, priorSelectionPins, priorPartitionPins, v5PartitionPin, keysPins, limitPositions (dry run), jobResults (from workers).
// Pinned only when every registered value matches and no test-only option is set (priorSelectionPins, priorPartitionPins, v5PartitionPin, keysPins).
export function pinnedOf(options) {
  const opt = resolveOptions(options);
  return Object.keys(PINNED).every(k => opt[k] === PINNED[k]) && opt.rawRandom === true && opt.limitPositions === null
    && V4_CACHE_PIN.test(opt.v4CacheSha256 ?? '') && opt.v5CacheSha256 === V5_CACHE_PIN && POSITIONS_PIN.test(opt.positionsAllSha256 ?? '') && V6_POSITIONS_PIN.test(opt.v6PositionsSha256 ?? '') && V7_POSITIONS_PIN.test(opt.v7PositionsSha256 ?? '')
    && Object.entries(NEW_PINS).every(([k, hex]) => opt.newSha256?.[k] === hex) && opt.priorSelectionPins === undefined && opt.priorPartitionPins === undefined
    && opt.v5PartitionPin === undefined && opt.keysPins === undefined;
}
export function auditRun(runDir, inputs, options = {}) {
  const opt = resolveOptions(options);
  const pinned = pinnedOf(options);
  const ctx = makeContext(runDir, inputs, opt);
  let summary = null;
  try { summary = readJson(runDir, 'summary.json'); } catch { summary = null; }
  const checks = [];
  const attempt = (name, fn) => {
    try { const r = fn(); checks.push({ name, pass: r.pass, detail: r.detail }); }
    catch (e) { checks.push({ name, pass: false, detail: `error: ${e.message}` }); }
  };
  try {
    attempt('data', () => checkData(ctx));
    attempt('testset', () => checkTestSet(ctx));
    attempt('v5inputs', () => checkV5Inputs(ctx));
    attempt('certificates', () => checkCertificates(ctx));
    attempt('ledger', () => checkLedger(ctx));
    attempt('cache', () => checkCache(ctx));
    attempt('permutation', () => checkPermutation(ctx));
    attempt('jobs', () => checkJobs(ctx));
    attempt('scores', () => checkScores(ctx));
    attempt('gate', () => checkGate(ctx, summary));
  } finally { closeCaches(ctx); }
  return { pass: checks.length === CHECKS.length && checks.every(c => c.pass), pinned, outcome: ctx.outcome ?? 'unknown', checks };
}

function loadInputs(config) {
  const readPositions = path => readFileSync(path, 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
  return {
    positionsAll: readPositions(config.paths.positionsAll),
    positionsV4: readPositions(config.paths.positionsV4),
    newPositions: readPositions(config.paths.newPositions),
    v6Positions: readPositions(config.paths.positionsV6),
    v7Positions: readPositions(config.paths.positionsV7),
    v4Run: config.paths.v4Run,
    v5Run: config.paths.v5Run,
    v6Run: config.paths.v6Run,
    v7Run: config.paths.v7Run,
    files: { newSelection: config.paths.newSelection, newGamesPgn: config.paths.newGamesPgn, newPositions: config.paths.newPositions, priorSelections: config.paths.priorSelections },
  };
}

async function cli(argv) {
  const usage = 'usage: --run RUN_DIR --config CONFIG.json [--dry-run yes] [--workers 1|2|3|4]';
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--run', '--config', '--dry-run', '--workers'].includes(argv[i]) || argv[i + 1] === undefined) throw new Error(usage);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!args.run || !args.config) throw new Error(usage);
  const workers = Number(args.workers ?? 1);
  if (!Number.isInteger(workers) || workers < 1 || workers > 4) throw new Error('--workers must be 1, 2, 3 or 4');
  const config = JSON.parse(readFileSync(args.config, 'utf8'));
  const inputs = loadInputs(config);
  const dryRun = args['dry-run'] === 'yes';
  // config.options holds test-only values (for example a small fixture); any such value makes the report unpinned.
  const options = {
    ...(config.options ?? {}),
    v4CacheSha256: config.v4CacheSha256,
    v5CacheSha256: config.v5CacheSha256,
    v5Files: config.v5Files,
    newSha256: config.newSha256,
    positionsAllSha256: sha256File(config.paths.positionsAll),
    v6PositionsSha256: sha256File(config.paths.positionsV6),
    v7PositionsSha256: sha256File(config.paths.positionsV7),
  };
  if (dryRun) {
    if (readJson(args.run, 'summary.json').dryRun !== true) throw new Error('--dry-run yes needs a dry-run summary');
    // Dry run: the runner kept the first N retained test positions; practice and the v5 inputs stay whole.
    options.limitPositions = readJson(args.run, 'partition.json').freshTest.length;
  }
  if (workers > 1) options.jobResults = await precomputeJobs(args.run, args.config, inputs, options, workers);
  const report = auditRun(args.run, inputs, options);
  writeFileSync(join(args.run, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  for (const c of report.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
  // A full run is accepted only when every check passes and the report is pinned; a dry run only needs every check to pass.
  const accepted = report.pass && (dryRun || report.pinned);
  console.log(accepted ? 'AUDIT PASS' : report.pass ? 'AUDIT NOT ACCEPTED: every check passes, but the full run is not pinned' : 'AUDIT FAIL');
  process.exitCode = accepted ? 0 : 1;
}

async function childMain(payload) {
  const { run, config, identity, options } = JSON.parse(payload);
  const inputs = loadInputs(JSON.parse(readFileSync(config, 'utf8')));
  const ctx = makeContext(run, inputs, resolveOptions(options));
  try {
    if (testSetOf(ctx).problems.length) throw new Error(`input problems: ${testSetOf(ctx).problems.slice(0, 2).join('; ')}`);
    process.stdout.write(`${JSON.stringify({ result: computeJob(ctx, identity) })}\n`);
  } finally { closeCaches(ctx); }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const argv = process.argv.slice(2);
  const run = argv[0] === '--audit-job' ? childMain(argv[1]) : cli(argv);
  run.catch(e => { console.error(e.message); process.exitCode = 2; });
}

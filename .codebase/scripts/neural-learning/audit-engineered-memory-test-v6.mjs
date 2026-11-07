#!/usr/bin/env node
// Independent auditor for a memory v6 run folder: a frozen replication of memory v5 on new games (key K3 only, no development phase).
// Spec: documentation/design/neural-learning/memory-v6-proposal-2026-11-05.md (rev 2), sections 1-5 (section 5 item 4 is this file); layout as memory-v5-file-formats.md.
// Re-implements every rule it checks from the spec. Imports only pinned shared libraries; never the v5 or v6 runner, worker, task or data modules, nor the v4 ledger or task files.
// CLI: node .codebase/scripts/neural-learning/audit-engineered-memory-test-v6.mjs --run RUN_DIR --config CONFIG.json [--dry-run yes] [--workers 1|2|3|4]
// CONFIG.json: { "paths": { "positionsAll", "positionsV4", "newPositions", "newSelection", "newGamesPgn", "priorSelection", "v4Run", "v5Run" }, "v4CacheSha256", "v5CacheSha256", "newSha256": { "selection", "gamesPgn", "positions" }, "v5Files": { NAME: SHA256 }, "options": {...} (optional, test-only values) }.
// Writes RUN_DIR/audit.json and exits 1 when any check fails. Workers are child processes of this file (--audit-job), one job each.
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

// Pinned values (proposal sections 3-5). gateMargin 7 over testReference 150 gives M = ceil(7 N / 150) for N retained test positions.
const PINNED = Object.freeze({ columns: 5177, resamples: 10000, gateSeed: 20261106, practiceGames: 198, gateMargin: 7, testReference: 150, retentionMax: 0.02, lowerQuantile: 0.025 });
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
// Files copied byte for byte from the v5 run (partition.json is only read, its hash is checked).
const COPIED = ['schedules.json', ...SEEDS.flatMap(seed => [`ledger-${seed}.jsonl`, `permutation-${seed}.json`])];
const CHECKS = ['data', 'testset', 'v5inputs', 'certificates', 'cache', 'jobs', 'scores', 'gate'];
// Exclusion reasons (spec 2). Precedence follows the order listed: practice board, then v4 test board, then v5 fresh board.
const EXCLUDED = Object.freeze({ practice: 'practice-board', v4Test: 'earlier-test-board' /* spec 5.1: v4 and v5 test boards share one reason */, earlierTest: 'earlier-test-board' });
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const RETINA = join(ROOT, '.cache', 'full.npz');
// Verifier sources every certificate header must hash (paths from the repository root).
const REQUIRED_SOURCES = ['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs'];
// Registered digests are given only as prefix...suffix in the proposal. The report is pinned only when a supplied digest matches both.
const V4_CACHE_PIN = /^699ec93b[0-9a-f]{51}a20e5$/;
const POSITIONS_PIN = /^4483226c[0-9a-f]{52}fa36$/;
const NEW_PINS = Object.freeze({ selection: /^af0ce4c7[0-9a-f]{52}7101$/, gamesPgn: /^58288149[0-9a-f]{52}0ae4$/, positions: /^e78cbb24[0-9a-f]{52}0128$/ });
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
// Spec 4: M = ceil(gateMargin * N / testReference), N = retained test positions (integer arithmetic, no rounding drift).
const marginFloorOf = (opt, n) => Math.ceil((opt.gateMargin * n) / opt.testReference);

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

// permuteKnownValues: forward full Fisher-Yates over the known slots; values[t] = known[indices[t]].value.
function permute(seed, known) {
  const K = known.length;
  const indices = Array.from({ length: K }, (_, i) => i);
  const rng = mulberry32((seed ^ 0x5eed) >>> 0);
  for (let i = 0; i < K; i++) { const j = i + Math.floor(rng() * (K - i)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
  return { indices, values: indices.map(t => known[t].value) };
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
  const test = new Set(games.slice(practiceGames));
  return v4.filter(p => test.has(p.gameId));
}

// Shared state for every check and every job. The test set and the cache rows are memoised.
function makeContext(runDir, inputs, opt) {
  return {
    runDir, opt, all: inputs.positionsAll, v4: inputs.positionsV4, newPositions: inputs.newPositions,
    v4Run: inputs.v4Run, v5Run: inputs.v5Run, files: inputs.files, jobResults: opt.jobResults ?? null,
    test: null, boards: new Map(), positions: new Map(),
    certLines: null, certByKey: null, ledgers: null, perms: null,
    caches: null, retina: null, eyes: null, expand: null,
    means: new Map(), jobs: new Map(), outcome: null, margin: null,
  };
}

// Spec 2: a new position is excluded when its board (FEN piece field) equals a v5 practice board (checked first), a v4 test board,
// or a v5 fresh board. Retained positions keep generator order. A dry run keeps the first N retained positions; practice is never cut.
function testSetOf(ctx) {
  if (ctx.test) return ctx.test;
  const v5 = readJson(ctx.v5Run, 'partition.json');
  const byId = new Map(ctx.all.map(p => [idOf(p), p]));
  const pick = ids => ids.map(id => { const p = byId.get(id); if (!p) throw new Error(`v5 position ${id} is not in positionsAll`); return p; });
  const practice = pick(v5.practice);
  const practiceBoards = new Set(practice.map(p => piecesOf(p.fen)));
  const v4TestBoards = new Set(v4TestPositions(ctx.v4, ctx.opt.practiceGames).map(p => piecesOf(p.fen)));
  const v5FreshBoards = new Set(pick(v5.freshTest).map(p => piecesOf(p.fen)));
  const excluded = [];
  const fresh = [];
  for (const p of ctx.newPositions) {
    const board = piecesOf(p.fen);
    const reason = practiceBoards.has(board) ? EXCLUDED.practice : v4TestBoards.has(board) ? EXCLUDED.v4Test : v5FreshBoards.has(board) ? EXCLUDED.earlierTest : null;
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

// Ledgers and permutations: the frozen v5 ledger files (byte identity is checked by v5inputs) and the permutation recomputed from them.
function ensureLedgers(ctx) {
  if (!ctx.ledgers) {
    const ledgers = {};
    const perms = {};
    for (const seed of SEEDS) {
      ledgers[seed] = readJsonl(ctx.v5Run, `ledger-${seed}.jsonl`);
      perms[seed] = permute(seed, ledgers[seed].filter(s => isKnown(s.value)));
    }
    ctx.ledgers = ledgers;
    ctx.perms = perms;
  }
  return ctx.ledgers;
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

// Caches: v4, v5 and v6 (this run folder). A key in more than one cache throws.
function openCache(dir) {
  const rows = readJson(dir, 'keys.json').rows;
  const index = new Map();
  rows.forEach((key, i) => { if (i > 0 && !index.has(key)) index.set(key, i); });
  return { index, fd: openSync(join(dir, 'kc-cache.f32'), 'r') };
}
function cachesOf(ctx) {
  if (!ctx.caches) ctx.caches = { v4: openCache(ctx.v4Run), v5: openCache(ctx.v5Run), v6: openCache(ctx.runDir) };
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

// Raw eye input over the retina and the fixed random expansion (as v3 to v5). Loaded only when rawRandom is on.
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
// Mean over all legal moves of the position, summed in sorted-UCI order and divided by the move count.
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

// Scores every legal move of each target position from one frozen memory (spec 3.5 frozenScores); apply null = the none arm (all scores 0).
function scorePositions(ctx, memory, ids, apply) {
  return ids.map(id => {
    const legal = legalOf(ctx, id);
    const vectors = legal.map(uci => (apply === null ? ZERO : apply(id, uci)));
    const scores = frozenScores(legal.map((_, i) => i), i => memory.score(vectors[i]), () => memory.fingerprint());
    const top = Math.max(...scores);
    const tied = legal.map((_, i) => i).filter(i => scores[i] === top);
    const s = tied.filter(i => certOf(ctx, id, legal[i]).value === 1).length;
    return { id, c: tied.length, s, expected: s / tied.length };
  });
}

// Retention probes: known slots of the quarter prefix. Recalled when the sign of the score equals the original value (score 0 is not recalled).
function recallOf(memory, probes) {
  return probes.map(p => {
    const x = memory.score(p.vector);
    return x > 0 ? p.value === 1 : x < 0 ? p.value === -1 : false;
  });
}

// Rebuilds one job (identity, store, scores, counts, pipeline, retention) from the run's inputs. Pure: only the caches are read from disk.
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
    let values;
    if (arm === 'shuffled') {
      const perm = ctx.perms[seed];
      let k = 0;
      values = slots.map(s => (isKnown(s.value) ? perm.values[k++] : null));
    } else {
      values = storeSlots.map(s => s.value);
    }
    ({ memory, counts } = buildStore(storeSlots, values, pipe.apply, arm));
    if (arm === 'full' || arm === 'quarter') {
      const probes = slots.slice(0, Math.floor(n / 4)).filter(s => isKnown(s.value)).map(s => ({ value: s.value, vector: pipe.apply(s.id, s.uci) }));
      const recalled = recallOf(memory, probes);
      retention = arm === 'quarter' ? { probes: probes.length, recalledQuarter: recalled } : { probes: probes.length, recalledFull: recalled };
    }
  }
  const scores = scorePositions(ctx, memory, t.freshIds, arm === 'none' ? null : pipe.apply);
  const result = {
    job: { phase: job.phase, key: job.key, direction: job.direction, seed, arm },
    scores,
    expectedTotal: scores.reduce((total, x) => total + x.expected, 0),
    counts,
    pipeline: { rmsSha256: pipe.rmsSha256, zeroRmsFeatures: pipe.zeroRmsFeatures },
    fingerprint: arm === 'none' ? null : memory.fingerprint(), // the worker writes null for the none arm
  };
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

// Spec 4 and 5: per seed, numericPairGate on the four verdict arms, then the margin floor M, the strict lower bounds and the retention rule.
// Pass only when every seed passes. Returns the verdict shape the runner writes (its rule field is not compared).
function computeVerdict(ctx) {
  const t = testSetOf(ctx);
  const games = t.freshTest.map(p => p.gameId);
  const M = marginFloorOf(ctx.opt, games.length);
  ctx.margin = M;
  const perSeed = SEEDS.map(seed => {
    const job = arm => getJob(ctx, identityOf(seed, arm));
    const arms = Object.fromEntries(VERDICT_ARMS.map(a => [a, job(a).scores.map(x => x.expected)]));
    const gate = numericPairGate({ arms, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: ctx.opt.resamples, seed: ctx.opt.gateSeed, lowerQuantile: ctx.opt.lowerQuantile });
    const retention = retentionOf(job('quarter').retention.recalledQuarter, job('full').retention.recalledFull);
    const m = gate.comparators;
    const pass = m.none.margin >= M && m.shuffled.margin >= M && m.quarter.margin > 0
      && m.none.lower > 0 && m.shuffled.lower > 0 && m.quarter.lower > 0
      && retention.previouslyRecalled > 0 && retention.lost / retention.previouslyRecalled <= ctx.opt.retentionMax;
    return { seed, gate, retention, pass };
  });
  const pass = perSeed.every(s => s.pass);
  return { perSeed, pass, outcome: pass ? 'passes' : 'does not pass' };
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
  const prior = new Set(readJsonAt(files.priorSelection).ids);
  if (new Set(ids).size !== ids.length) problems.push('new selection repeats a game id');
  const selectionOverlap = ids.filter(g => prior.has(g)).length;
  if (selectionOverlap) problems.push(`${selectionOverlap} new selected games are in the first 300`);
  const posGames = new Set(ctx.newPositions.map(p => p.gameId));
  const positionOverlap = [...posGames].filter(g => prior.has(g)).length;
  if (positionOverlap) problems.push(`${positionOverlap} games of the new positions are in the first 300`);
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.slice(0, 3).join('; ')
      : `selection, games and positions SHA-256 match config; ${ids.length} new games and ${posGames.size} position games disjoint from ${prior.size} prior games`,
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
  if (sha256File(join(ctx.runDir, 'partition.json')) !== manifest.partitionSha256) problems.push('partition.json SHA-256 differs from manifest.partitionSha256');
  const byReason = Object.values(EXCLUDED).map(r => `${r} ${t.excluded.filter(x => x.reason === r).length}`).join(', ');
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.slice(0, 3).join('; ')
      : `${t.freshIds.length} retained in generator order; ${t.excluded.length} excluded (${byReason}); ${t.practiceIds.length} v5 practice boards; partition.json lists match and SHA-256 matches manifest`,
  };
}

function checkV5Inputs(ctx) {
  const problems = [];
  const hashes = ctx.opt.v5Files ?? {};
  for (const name of COPIED) {
    const mine = join(ctx.runDir, name);
    if (!existsSync(mine)) { problems.push(`${name} missing`); continue; }
    const digest = sha256File(mine);
    if (digest !== sha256File(join(ctx.v5Run, name))) problems.push(`${name} is not byte-identical to the v5 file`);
    if (hashes[name] === undefined) problems.push(`config gives no SHA-256 for ${name}`);
    else if (digest !== hashes[name]) problems.push(`${name} SHA-256 differs from config`);
  }
  if (hashes['partition.json'] === undefined) problems.push('config gives no SHA-256 for v5 partition.json');
  else if (sha256File(join(ctx.v5Run, 'partition.json')) !== hashes['partition.json']) problems.push('v5 partition.json SHA-256 differs from config');
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
      : `${COPIED.length} v5 files byte-identical with matching SHA-256; partition.json SHA-256 matches config; ${v5Lines.length} practice certificate lines identical to v5`,
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
  const expectedKeys = new Set();
  let practiceLines = 0;
  for (const id of t.practiceIds) {
    for (const uci of legalOf(ctx, id)) {
      const key = `${id}|${uci}`;
      expectedKeys.add(key);
      if (ctx.certByKey.has(key)) practiceLines++;
      else problems.push(`missing practice line ${key}`);
    }
  }
  // Test moves are replayed here; practice lines are identity-checked against v5 in v5inputs.
  let kings = 0;
  let proofs = 0;
  for (const id of t.freshIds) {
    const { board, moves } = ctx.boards.get(id);
    const position = ctx.positions.get(id);
    for (const [uci, m] of moves) {
      const key = `${id}|${uci}`;
      expectedKeys.add(key);
      const line = ctx.certByKey.get(key);
      if (!line) { problems.push(`missing line ${key}`); continue; }
      const captured = Boolean(m.captured);
      try {
        if (captured && m.piece === 'k') {
          kings++;
          if (line.status !== 'scope-unknown' || line.proof !== null || line.certificateSha256 !== null) problems.push(`${key}: king capture must be scope-unknown with null proof`);
        } else {
          proofs++;
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
  for (const key of ctx.certByKey.keys()) if (!expectedKeys.has(key)) problems.push(`extra line ${key}`);
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}`
      : `${expectedKeys.size} legal moves; ${practiceLines} practice lines present; ${proofs} test proofs replayed, ${kings} king captures scope-unknown; ${Object.keys(header.sources).length} verifier sources match the files`,
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
  for (const [name, list] of [['v4', v4Rows], ['v5', v5Rows], ['v6', rows]]) if (list[0] !== 'blank') problems.push(`${name} row 0 is not blank`);
  const v4Keys = new Set(v4Rows.slice(1));
  const v5Keys = new Set(v5Rows.slice(1));
  const v6Keys = rows.slice(1);
  const overlap = (a, b) => [...a].filter(k => b.has(k)).length;
  const shared = [['v4', 'v5', overlap(v4Keys, v5Keys)], ['v4', 'v6', overlap(v4Keys, new Set(v6Keys))], ['v5', 'v6', overlap(v5Keys, new Set(v6Keys))]];
  for (const [a, b, n] of shared) if (n) problems.push(`${n} keys are in both the ${a} and ${b} caches`);
  // Spec 5: the new keys are exactly the legal moves of the test positions that the v4 and v5 caches do not hold.
  const expected = new Set();
  for (const id of t.freshIds) for (const uci of legalOf(ctx, id)) { const key = `${id}|${uci}`; if (!v4Keys.has(key) && !v5Keys.has(key)) expected.add(key); }
  if (new Set(v6Keys).size !== v6Keys.length) problems.push('duplicate key in keys.json');
  if (!(v6Keys.length === expected.size && v6Keys.every(k => expected.has(k)))) problems.push(`keys.json is not exactly the ${expected.size} new legal moves of the test positions`);
  const schema = readJson(ctx.runDir, 'cache-schema.json');
  const manifest = readJson(ctx.runDir, 'manifest.json');
  if (schema.rows !== rows.length) problems.push('cache-schema rows differ from keys.json');
  if (schema.columns !== columns || schema.dtype !== 'float32' || schema.byteOrder !== 'little' || !Array.isArray(schema.kcIndices) || schema.kcIndices.length !== columns) problems.push('cache-schema shape, dtype or byte order is wrong');
  for (const [name, dir, n] of [['v4', ctx.v4Run, v4Rows.length], ['v5', ctx.v5Run, v5Rows.length], ['v6', ctx.runDir, rows.length]]) {
    const bytes = statSync(join(dir, 'kc-cache.f32')).size;
    if (bytes !== n * columns * 4) problems.push(`${name} kc-cache.f32 is ${bytes} bytes, expected ${n * columns * 4}`);
  }
  const v4Digest = sha256File(join(ctx.v4Run, 'kc-cache.f32'));
  const v5Digest = sha256File(join(ctx.v5Run, 'kc-cache.f32'));
  const v6Digest = sha256File(join(ctx.runDir, 'kc-cache.f32'));
  if (!ctx.opt.v4CacheSha256) problems.push('config gives no v4CacheSha256');
  else if (v4Digest !== ctx.opt.v4CacheSha256) problems.push(`v4 kc-cache.f32 SHA-256 ${v4Digest} differs from config v4CacheSha256`);
  if (!ctx.opt.v5CacheSha256) problems.push('config gives no v5CacheSha256');
  else if (v5Digest !== ctx.opt.v5CacheSha256) problems.push(`v5 kc-cache.f32 SHA-256 ${v5Digest} differs from config v5CacheSha256`);
  if (v6Digest !== schema.fileSha256 || v6Digest !== manifest.cacheSha256) problems.push('kc-cache.f32 SHA-256 differs from cache-schema or manifest');
  const blankOf = dir => {
    const fd = openSync(join(dir, 'kc-cache.f32'), 'r');
    try {
      const b = Buffer.alloc(columns * 4);
      return readSync(fd, b, 0, b.length, 0) === b.length ? b : null;
    } finally { closeSync(fd); }
  };
  const b4 = blankOf(ctx.v4Run);
  const b5 = blankOf(ctx.v5Run);
  const b6 = blankOf(ctx.runDir);
  if (!b4 || !b5 || !b6 || !b4.equals(b5) || !b5.equals(b6)) problems.push('row 0 (blank) differs between the v4, v5 and v6 caches');
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.join('; ')
      : `${v6Keys.length} new keys exact; ${v4Keys.size} v4 and ${v5Keys.size} v5 keys disjoint from them; row 0 equal in all three caches; v4, v5 and v6 SHA-256 match config, cache-schema and manifest`,
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
      : `${recomputed} jobs rebuilt exactly (transform, scaler, store, scores, counts, fingerprint, retention); ${notRechecked} raw and random jobs not rechecked (no retina in this run)`,
  };
}

function checkGate(ctx, summary) {
  const t = testSetOf(ctx);
  const verdict = computeVerdict(ctx);
  const outcome = verdict.pass ? 'passes' : 'does not pass';
  ctx.outcome = outcome;
  const problems = [];
  if (summary?.outcome !== outcome) problems.push(`summary.outcome is ${short(summary?.outcome)}, recomputed ${outcome}`);
  const { rule: _rule, ...recorded } = summary?.verdict ?? {}; // rule is a constant description, not a result
  const diff = firstDiff(summary?.verdict ? recorded : null, verdict, 'verdict');
  if (diff) problems.push(diff);
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? problems.slice(0, 3).join('; ')
      : `outcome ${outcome}; M = ${ctx.margin} for ${t.freshIds.length} test positions; numericPairGate recomputed for ${SEEDS.length} seeds; full verdict matches summary.verdict`,
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

// Spec 10 entry point. inputs = { positionsAll, positionsV4, newPositions, v4Run, v5Run, files }; files = paths to hash and read for the data check.
// Options: pinned values, test-only values (columns, resamples, practiceGames, testReference, rawRandom: false), v4CacheSha256, v5CacheSha256,
// newSha256, v5Files, positionsAllSha256, limitPositions (dry run), jobResults (from workers).
export function auditRun(runDir, inputs, options = {}) {
  const opt = resolveOptions(options);
  const pinned = Object.keys(PINNED).every(k => opt[k] === PINNED[k]) && opt.rawRandom === true && opt.limitPositions === null
    && V4_CACHE_PIN.test(opt.v4CacheSha256 ?? '') && POSITIONS_PIN.test(opt.positionsAllSha256 ?? '')
    && Object.entries(NEW_PINS).every(([k, re]) => re.test(opt.newSha256?.[k] ?? ''));
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
    attempt('cache', () => checkCache(ctx));
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
    v4Run: config.paths.v4Run,
    v5Run: config.paths.v5Run,
    files: { newSelection: config.paths.newSelection, newGamesPgn: config.paths.newGamesPgn, newPositions: config.paths.newPositions, priorSelection: config.paths.priorSelection },
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
  // config.options holds test-only values (for example a small fixture); any such value makes the report unpinned.
  const options = {
    ...(config.options ?? {}),
    v4CacheSha256: config.v4CacheSha256,
    v5CacheSha256: config.v5CacheSha256,
    v5Files: config.v5Files,
    newSha256: config.newSha256,
    positionsAllSha256: sha256File(config.paths.positionsAll),
  };
  if (args['dry-run'] === 'yes') {
    if (readJson(args.run, 'summary.json').dryRun !== true) throw new Error('--dry-run yes needs a dry-run summary');
    // Dry run: the runner kept the first N retained test positions; practice and the v5 inputs stay whole.
    options.limitPositions = readJson(args.run, 'partition.json').freshTest.length;
  }
  if (workers > 1) options.jobResults = await precomputeJobs(args.run, args.config, inputs, options, workers);
  const report = auditRun(args.run, inputs, options);
  writeFileSync(join(args.run, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  for (const c of report.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
  console.log(report.pass ? 'AUDIT PASS' : 'AUDIT FAIL');
  process.exitCode = report.pass ? 0 : 1;
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

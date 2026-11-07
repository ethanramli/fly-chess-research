#!/usr/bin/env node
// Independent auditor for a memory v5 run folder. Spec: documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md (sections 3-10); file contract: documentation/design/neural-learning/memory-v5-file-formats.md.
// Re-implements every rule it checks from the spec. Imports only pinned shared libraries; never the v5 runner, worker, task or data modules, nor the v4 ledger or task files.
// CLI: node .codebase/scripts/neural-learning/audit-engineered-memory-test-v5.mjs --run RUN_DIR --config CONFIG.json [--dry-run yes] [--workers 1|2|3]
// CONFIG.json: { "paths": { "positionsAll": FILE, "positionsV4": FILE, "v4Run": DIR }, "v4CacheSha256": HEX, "options": {...} (optional, test-only values) }.
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

// Pinned values (proposal sections 3-8). Any other value in options makes the report unpinned.
const PINNED = Object.freeze({ columns: 5177, resamples: 10000, gateSeed: 20261105, practiceGames: 198, minFull: 80, minQuarter: 20, gateMargin: 7, retentionMax: 0.02, lowerQuantile: 0.025 });
const CAPACITY = 4096;
const NEIGHBOURS = 3;
const SPARSE_KEEP = 259;
const MAX_REPLIES = 256;
const TASK = { objective: 'capture-retention', plies: 1 };
const RANDOM = { units: 5177, fanIn: 6, seed: 20261103, keep: 0.05 };
const SEEDS = [6101, 6102, 6103];
const DEV_SEED = 6101;
const KEYS = ['K1', 'K2', 'K3'];
const PHASE_ORDER = { dev: 0, confirm: 1 };
const DEV_ARMS = ['store', 'shuffled'];
const CONFIRM_ARMS = ['full', 'half', 'quarter', 'shuffled', 'none', 'raw-pc', 'random-pc'];
const RAW_ARMS = ['raw-pc', 'random-pc'];
const CHECKS = ['partition', 'schedules', 'certificates', 'ledger', 'permutation', 'cache', 'jobs', 'scores', 'selection', 'gate'];
const INPUT_STOP = 'input-validity failure';
const NO_KEY = 'no learning key found in development';
const INSUFFICIENT = 'insufficient experience';
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const RETINA = join(ROOT, '.cache', 'full.npz');
// Verifier sources every certificate header must hash (paths from the repository root).
const REQUIRED_SOURCES = ['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs'];
// Registered digests are given only as prefix...suffix in the proposal. The report is pinned only when a supplied digest matches both.
const V4_CACHE_PIN = /^699ec93b[0-9a-f]{51}a20e5$/;
const POSITIONS_PIN = /^4483226c[0-9a-f]{52}fa36$/;
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
const readJson = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
const readJsonl = (dir, name) => readFileSync(join(dir, name), 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
const sameVector = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const jobName = j => `${j.phase}-${j.key}-${j.direction}-${j.seed}-${j.arm}.json`;
const cmpJob = (a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] || cmp(a.key, b.key) || cmp(a.direction, b.direction) || a.seed - b.seed || cmp(a.arm, b.arm);
const resolveOptions = options => ({ ...PINNED, rawRandom: true, limitPositions: null, ...options });

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

// First difference between two JSON-like values: the path, then both values (for failure details).
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

// Spec 3.2 (committed 4-move schedule): forward partial Fisher-Yates over the sorted legal UCIs; keep the first min(4, n) draws.
function drawSchedule(seed, id, sortedUcis) {
  const a = [...sortedUcis];
  const n = a.length;
  const m = Math.min(4, n);
  const rng = mulberry32((seed ^ parseInt(sha256(id).slice(0, 8), 16)) >>> 0);
  for (let i = 0; i < m; i++) { const j = i + Math.floor(rng() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, m);
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

// Spec 3 split: practice games are the first 198 v4 games by SHA-256 of 'engineered-memory-v3-split:' + gameId; practice order is that rank, then ply.
// Folds: practice games sorted by 'memory-v5-fold:' hash, first floor(n/2) = fold A. Fresh = test-game positions whose id and piece field are not in v4;
// those whose piece field equals a practice piece field are dropped (listed). With a dry-run limit, practice and fresh keep their first N in order.
// Only the source records are read here; nothing from the v5 run folder.
function expectedPartition(all, v4, opt) {
  const problems = [];
  const byId = new Map();
  for (const p of all) {
    if (byId.has(idOf(p))) problems.push(`positionsAll repeats ${idOf(p)}`);
    byId.set(idOf(p), p);
  }
  for (const p of v4) {
    const q = byId.get(idOf(p));
    if (!q) problems.push(`v4 position ${idOf(p)} is not in positionsAll`);
    else if (canon(q) !== canon(p)) problems.push(`v4 position ${idOf(p)} differs from its positionsAll record`);
  }
  const splitHash = g => sha256(`engineered-memory-v3-split:${g}`);
  const foldHash = g => sha256(`memory-v5-fold:${g}`);
  const v4Ids = new Set(v4.map(idOf));
  const v4Boards = new Set(v4.map(p => piecesOf(p.fen)));
  const v4Games = [...new Set(v4.map(p => p.gameId))].sort((a, b) => cmp(splitHash(a), splitHash(b)));
  const practiceGames = v4Games.slice(0, opt.practiceGames);
  const testGames = v4Games.slice(opt.practiceGames);
  const inPractice = new Set(practiceGames);
  const inTest = new Set(testGames);
  const order = (a, b) => cmp(splitHash(a.gameId), splitHash(b.gameId)) || a.ply - b.ply;
  const practiceAll = all.filter(p => inPractice.has(p.gameId)).sort(order);
  const foldA = new Set([...practiceGames].sort((a, b) => cmp(foldHash(a), foldHash(b))).slice(0, Math.floor(practiceGames.length / 2)));
  const practiceBoards = new Set(practiceAll.map(p => piecesOf(p.fen)));
  const candidates = all.filter(p => inTest.has(p.gameId) && !v4Ids.has(idOf(p)) && !v4Boards.has(piecesOf(p.fen))).sort(order);
  const droppedAll = candidates.filter(p => practiceBoards.has(piecesOf(p.fen)));
  const freshAll = candidates.filter(p => !practiceBoards.has(piecesOf(p.fen)));
  // Repeats between the two development folds: positions in A whose board appears in B, plus positions in B whose board appears in A.
  const boardsA = new Set(practiceAll.filter(p => foldA.has(p.gameId)).map(p => piecesOf(p.fen)));
  const boardsB = new Set(practiceAll.filter(p => !foldA.has(p.gameId)).map(p => piecesOf(p.fen)));
  const foldBoardRepeats = practiceAll.filter(p => (foldA.has(p.gameId) ? boardsB : boardsA).has(piecesOf(p.fen))).length;
  const limit = opt.limitPositions;
  const practice = limit === null ? practiceAll : practiceAll.slice(0, limit);
  const fresh = limit === null ? freshAll : freshAll.slice(0, limit);
  return {
    problems,
    practice,
    fresh,
    expected: {
      practice: practice.map(idOf),
      foldA: practice.filter(p => foldA.has(p.gameId)).map(idOf),
      foldB: practice.filter(p => !foldA.has(p.gameId)).map(idOf),
      freshTest: fresh.map(idOf),
      droppedBoardRepeats: droppedAll.map(idOf),
      foldBoardRepeats,
    },
  };
}

// Shared state for every check and every job. Stages are memoised: each one runs once, and a failure is raised again on the next call.
function makeContext(runDir, inputs, opt) {
  return {
    runDir, opt, v4Run: inputs.v4Run, all: inputs.positionsAll, v4: inputs.positionsV4,
    jobResults: opt.jobResults ?? null,
    part: null, positions: null, boards: null, inputProblems: [], inputStop: false, skipInput: false,
    schedules: null, certLines: null, certByKey: null, ledgers: null, perms: null, devLedgers: null, devPerms: null,
    insufficient: null, positives: null, plan: null, outcome: null,
    caches: null, blank: null, retina: null, eyes: null, expand: null,
    means: new Map(), jobs: new Map(),
  };
}

function ensurePartition(ctx) {
  if (ctx.part) return ctx.part;
  const part = expectedPartition(ctx.all, ctx.v4, ctx.opt);
  const problems = [...part.problems];
  const boards = new Map();
  const positions = new Map();
  for (const p of [...part.practice, ...part.fresh]) {
    positions.set(idOf(p), p);
    try { boards.set(idOf(p), boardInfo(replay(p))); } catch (e) { problems.push(`${idOf(p)}: ${e.message}`); }
  }
  ctx.boards = boards;
  ctx.positions = positions;
  ctx.inputProblems = problems;
  ctx.part = part;
  return part;
}
const legalOf = (ctx, id) => {
  const b = ctx.boards.get(id);
  if (!b) throw new Error(`no replayed board for ${id}`);
  return b.legal;
};

function ensureSchedules(ctx) {
  if (!ctx.schedules) {
    ensurePartition(ctx);
    const out = {};
    for (const seed of SEEDS) out[seed] = ctx.part.expected.practice.map(id => ({ id, moves: drawSchedule(seed, id, legalOf(ctx, id)) }));
    ctx.schedules = out;
  }
  return ctx.schedules;
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
  const c = ctx.certByKey?.get(`${id}|${uci}`);
  if (!c) throw new Error(`no certificate line for ${id}|${uci}`);
  return c;
}

// Ledgers and permutations are rebuilt from the schedules and certificate lines; the dev views keep the seed-6101 slot numbers.
function ensureLedgers(ctx) {
  if (!ctx.ledgers) {
    ensureSchedules(ctx);
    ensureCerts(ctx);
    const ledgers = {};
    const perms = {};
    for (const seed of SEEDS) {
      const slots = [];
      for (const entry of ctx.schedules[seed]) {
        for (const uci of entry.moves) {
          const c = certOf(ctx, entry.id, uci);
          slots.push({ slot: slots.length, id: entry.id, uci, category: c.category, value: c.value, certificateSha256: c.certificateSha256 });
        }
      }
      ledgers[seed] = slots;
      perms[seed] = permute(seed, slots.filter(s => isKnown(s.value)));
    }
    const view = ids => { const set = new Set(ids); return ledgers[DEV_SEED].filter(s => set.has(s.id)); };
    const devLedgers = { AB: view(ctx.part.expected.foldA), BA: view(ctx.part.expected.foldB) };
    const devPerms = { AB: permute(DEV_SEED, devLedgers.AB.filter(s => isKnown(s.value))), BA: permute(DEV_SEED, devLedgers.BA.filter(s => isKnown(s.value))) };
    const full = SEEDS.map(seed => ledgers[seed].filter(s => s.value === 1).length);
    const quarter = SEEDS.map(seed => ledgers[seed].slice(0, Math.floor(ledgers[seed].length / 4)).filter(s => s.value === 1).length);
    ctx.positives = { full, quarter };
    ctx.insufficient = SEEDS.some((_, i) => full[i] < ctx.opt.minFull || quarter[i] < ctx.opt.minQuarter);
    ctx.devLedgers = devLedgers;
    ctx.devPerms = devPerms;
    ctx.perms = perms;
    ctx.ledgers = ledgers;
  }
  return ctx.ledgers;
}

// Caches: v5 keys and rows in the run folder, v4 keys and rows in the v4 folder. A key in both throws.
function openCache(dir) {
  const rows = readJson(dir, 'keys.json').rows;
  const index = new Map();
  rows.forEach((key, i) => { if (i > 0 && !index.has(key)) index.set(key, i); });
  return { index, fd: openSync(join(dir, 'kc-cache.f32'), 'r') };
}
function cachesOf(ctx) {
  if (!ctx.caches) ctx.caches = { v5: openCache(ctx.runDir), v4: openCache(ctx.v4Run) };
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
  const { v5, v4 } = cachesOf(ctx);
  const inV5 = v5.index.has(key);
  const inV4 = v4.index.has(key);
  if (inV5 && inV4) throw new Error(`key ${key} is in both caches`);
  if (!inV5 && !inV4) throw new Error(`no cache row for ${key}`);
  return inV5 ? rowAt(ctx, v5, v5.index.get(key)) : rowAt(ctx, v4, v4.index.get(key));
}
function blankOf(ctx) {
  if (!ctx.blank) ctx.blank = rowAt(ctx, cachesOf(ctx).v5, 0);
  return ctx.blank;
}

// Raw eye input over the retina and the fixed random expansion (as v3/v4). Loaded only when rawRandom is on.
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
// Key transforms (Float64 arithmetic on Float32 rows). K1 = row; K2 = blank-subtracted top 259 positives; K3 = row minus position mean.
// raw-pc and random-pc = position-centred raw and random features.
function sparseOf(row, blank) {
  const r = Float64Array.from(row, (x, i) => Math.max(0, x - blank[i]));
  const keep = new Set([...r.keys()].filter(i => r[i] > 0).sort((a, b) => r[b] - r[a] || a - b).slice(0, SPARSE_KEEP));
  return Float64Array.from(r, (x, i) => (keep.has(i) ? x : 0));
}
function transformOf(ctx, key, id, uci) {
  if (key === 'K1') return rowOf(ctx, `${id}|${uci}`);
  if (key === 'K2') return sparseOf(rowOf(ctx, `${id}|${uci}`), blankOf(ctx));
  const feature = key === 'K3' ? 'row' : key === 'raw-pc' ? 'raw' : 'random';
  const m = meanOf(ctx, feature, id);
  return Float64Array.from(baseOf(ctx, feature, id, uci), (x, i) => x - m[i]);
}
// Pipeline: pinned rmsScaler fitted on the calibration vectors, then the zero-RMS mask (coordinates 0 in every calibration vector score 0).
function fitPipeline(ctx, key, calib) {
  const fit = calib.map(([id, uci]) => transformOf(ctx, key, id, uci));
  const scale = rmsScaler(fit);
  const live = Uint8Array.from(fit[0], (_, i) => (fit.some(v => v[i] !== 0) ? 1 : 0));
  return {
    rmsSha256: scale.rmsSha256,
    zeroRmsFeatures: live.reduce((n, x) => n + (x ? 0 : 1), 0),
    apply(id, uci) {
      const v = scale(transformOf(ctx, key, id, uci));
      for (let i = 0; i < v.length; i++) if (!live[i]) v[i] = 0;
      return v;
    },
  };
}
// Calibration (label-free): the first sorted legal move of each of the first floor(n/4) positions in the given order.
const calibrationOf = (ctx, ids) => ids.slice(0, Math.floor(ids.length / 4)).map(id => [id, legalOf(ctx, id)[0]]);

// Store: one write per slot with a known value (null = no write); identical vectors replace (counted); the oldest entry is evicted at capacity.
function buildStore(slots, values, apply, arm) {
  const memory = new NearestEpisodeMemory({ capacity: CAPACITY, k: NEIGHBOURS });
  const counts = { writes: 0, unknown: 0, replacements: 0, evictions: 0, identicalConsistent: 0, identicalConflicting: 0 };
  slots.forEach((slot, i) => {
    const value = values[i];
    if (value === null) { counts.unknown++; return; }
    const vector = apply(slot.id, slot.uci);
    const same = memory.entries.find(e => sameVector(e.vector, vector));
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

// Rebuilds one job (identity, store, scores, counts, pipeline, retention) from the run's inputs. Pure: no file is read except the caches.
function computeJob(ctx, job) {
  const { phase, key, direction, seed, arm } = job;
  ensureLedgers(ctx);
  let slots;
  let calibIds;
  let targets;
  if (phase === 'dev') {
    slots = ctx.devLedgers[direction];
    calibIds = direction === 'AB' ? ctx.part.expected.foldA : ctx.part.expected.foldB;
    targets = direction === 'AB' ? ctx.part.expected.foldB : ctx.part.expected.foldA;
  } else {
    slots = ctx.ledgers[seed];
    calibIds = ctx.part.expected.practice;
    targets = ctx.part.expected.freshTest;
  }
  const pipe = fitPipeline(ctx, key, calibrationOf(ctx, calibIds));
  const n = slots.length;
  let memory;
  let counts;
  let retention = null;
  if (arm === 'none') {
    memory = new NearestEpisodeMemory({ capacity: CAPACITY, k: NEIGHBOURS });
    counts = null; // the runner's worker writes no counts for the none arm (no store)
  } else {
    const prefix = arm === 'quarter' ? Math.floor(n / 4) : arm === 'half' ? Math.floor(n / 2) : n;
    const storeSlots = slots.slice(0, prefix);
    let values;
    if (arm === 'shuffled') {
      const perm = phase === 'dev' ? ctx.devPerms[direction] : permute(seed, slots.filter(s => isKnown(s.value)));
      let t = 0;
      values = slots.map(s => (isKnown(s.value) ? perm.values[t++] : null));
    } else {
      values = storeSlots.map(s => s.value);
    }
    const built = buildStore(storeSlots, values, pipe.apply, arm);
    memory = built.memory;
    counts = built.counts;
    if (phase === 'confirm' && (arm === 'quarter' || arm === 'full')) {
      const probes = slots.slice(0, Math.floor(n / 4)).filter(s => isKnown(s.value)).map(s => ({ value: s.value, vector: pipe.apply(s.id, s.uci) }));
      const recalled = recallOf(memory, probes);
      retention = arm === 'quarter' ? { probes: probes.length, recalledQuarter: recalled } : { probes: probes.length, recalledFull: recalled };
    }
  }
  const scores = scorePositions(ctx, memory, targets, arm === 'none' ? null : pipe.apply);
  const result = {
    job: { phase, key, direction, seed, arm },
    scores,
    expectedTotal: scores.reduce((t, x) => t + x.expected, 0),
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

const devIdentities = () => KEYS.flatMap(key => ['AB', 'BA'].flatMap(direction => DEV_ARMS.map(arm => ({ phase: 'dev', key, direction, seed: DEV_SEED, arm }))));
const confirmIdentities = selected => SEEDS.flatMap(seed => CONFIRM_ARMS.map(arm => ({ phase: 'confirm', key: RAW_ARMS.includes(arm) ? arm : selected, direction: '-', seed, arm })));
// Spec 5: margin = (store - shuffled) for AB plus the same for BA; largest margin above 0 wins; ties go to the lower K.
function marginsOf(totalOf) {
  const m = {};
  for (const key of KEYS) {
    const t = (direction, arm) => totalOf({ phase: 'dev', key, direction, seed: DEV_SEED, arm });
    m[key] = t('AB', 'store') - t('AB', 'shuffled') + (t('BA', 'store') - t('BA', 'shuffled'));
  }
  return m;
}
function selectKey(margins) {
  let best = null;
  for (const k of KEYS) if (margins[k] > 0 && (best === null || margins[k] > margins[best])) best = k;
  return best;
}
// The expected job set: 12 dev jobs; 21 confirm jobs when a key was selected and the exposure stop did not fire.
function planRun(ctx) {
  if (ctx.plan) return ctx.plan;
  if (ctx.inputStop) { ctx.plan = { identities: [], selected: null, margins: null }; return ctx.plan; }
  ensureLedgers(ctx);
  const margins = marginsOf(job => getJob(ctx, job).expectedTotal);
  const selected = selectKey(margins);
  const confirm = selected !== null && !ctx.insufficient ? confirmIdentities(selected) : [];
  ctx.plan = { identities: [...devIdentities(), ...confirm].sort(cmpJob), selected, margins };
  return ctx.plan;
}

// Spec 6 and 7: per-seed retention contrast and the seed's gate; judged on the selected key only.
function retentionOf(quarter, full, max) {
  if (full.length !== quarter.length) throw new Error('quarter and full probe lists differ in length');
  const previouslyRecalled = quarter.filter(Boolean).length;
  const lost = quarter.filter((x, i) => x && !full[i]).length;
  return {
    probes: quarter.length,
    previouslyRecalled,
    recalledFull: full.filter(Boolean).length,
    lost,
  };
}
function computeVerdict(ctx, selected) {
  const freshGames = ctx.part.fresh.map(p => p.gameId);
  const perSeed = SEEDS.map(seed => {
    const job = arm => getJob(ctx, { phase: 'confirm', key: selected, direction: '-', seed, arm });
    const arms = Object.fromEntries(['full', 'none', 'shuffled', 'quarter'].map(a => [a, job(a).scores.map(x => x.expected)]));
    const gate = numericPairGate({ arms, games: freshGames, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: ctx.opt.resamples, seed: ctx.opt.gateSeed, lowerQuantile: ctx.opt.lowerQuantile });
    const retention = retentionOf(job('quarter').retention.recalledQuarter, job('full').retention.recalledFull, ctx.opt.retentionMax);
    const m = gate.comparators;
    const pass = m.none.margin >= ctx.opt.gateMargin && m.shuffled.margin >= ctx.opt.gateMargin && m.quarter.margin > 0
      && m.none.lower > 0 && m.shuffled.lower > 0 && m.quarter.lower > 0
      && retention.previouslyRecalled > 0 && retention.lost / retention.previouslyRecalled <= ctx.opt.retentionMax;
    return { seed, pass, gate, retention };
  });
  const pass = perSeed.every(s => s.pass);
  return { perSeed, pass, outcome: pass ? 'passes' : 'does not pass' }; // runner judgeV5 shape (its rule field is not compared)
}

// Checks. Each returns { pass, detail }; auditRun wraps them so a thrown error becomes a failed check.
const skipped = reason => ({ pass: true, detail: `skipped (${reason})` });

function checkPartition(ctx, summary) {
  ensurePartition(ctx);
  ctx.inputStop = ctx.inputProblems.length > 0;
  ctx.skipInput = ctx.inputStop && summary?.outcome === INPUT_STOP;
  if (ctx.inputStop) {
    return { pass: ctx.skipInput, detail: `${ctx.skipInput ? `${INPUT_STOP} recomputed` : 'input problems, not recorded as a stop'}: ${ctx.inputProblems.slice(0, 3).join('; ')}` };
  }
  const exp = ctx.part.expected;
  const problems = [];
  const file = readJson(ctx.runDir, 'partition.json');
  for (const k of ['practice', 'foldA', 'foldB', 'freshTest']) if (canon(file[k]) !== canon(exp[k])) problems.push(`${k} differs from the recomputed list`);
  if (canon([...(file.droppedBoardRepeats ?? [])].sort()) !== canon([...exp.droppedBoardRepeats].sort())) problems.push('droppedBoardRepeats differ from the recomputed set');
  if (file.foldBoardRepeats !== exp.foldBoardRepeats) problems.push(`foldBoardRepeats ${file.foldBoardRepeats}, recomputed ${exp.foldBoardRepeats}`);
  const manifest = readJson(ctx.runDir, 'manifest.json');
  if (sha256File(join(ctx.runDir, 'partition.json')) !== manifest.partitionSha256) problems.push('partition.json SHA-256 differs from manifest.partitionSha256');
  const source = ctx.opt.positionsAllSha256 ? `; positionsAll SHA-256 ${ctx.opt.positionsAllSha256}` : '';
  return {
    pass: problems.length === 0,
    detail: problems.length ? problems.join('; ') : `${exp.practice.length} practice, ${exp.foldA.length} fold A, ${exp.foldB.length} fold B, ${exp.freshTest.length} fresh, ${exp.droppedBoardRepeats.length} dropped board repeats, ${exp.foldBoardRepeats} between folds; positions replay to their FEN; partition.json and manifest hash match${source}`,
  };
}

function checkSchedules(ctx) {
  if (ctx.skipInput) return skipped(`${INPUT_STOP} recomputed`);
  const expected = ensureSchedules(ctx);
  const problems = [];
  if (canon(readJson(ctx.runDir, 'schedules.json')) !== canon(expected)) problems.push('schedules.json differs from the recomputed schedules');
  if (sha256File(join(ctx.runDir, 'schedules.json')) !== readJson(ctx.runDir, 'manifest.json').scheduleSha256) problems.push('schedules.json SHA-256 differs from manifest.scheduleSha256');
  return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `${SEEDS.length} seeds x ${ctx.part.expected.practice.length} practice positions; SHA-256 matches manifest` };
}

function checkCertificates(ctx) {
  if (ctx.skipInput) return skipped(`${INPUT_STOP} recomputed`);
  ensureCerts(ctx);
  const header = ctx.certLines[0] ?? {};
  const certs = ctx.certLines.slice(1);
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
    if (i > 0 && !(certs[i - 1].id < c.id || (certs[i - 1].id === c.id && certs[i - 1].uci < c.uci))) problems.push(`line ${c.id}|${c.uci} is out of id/uci order`);
  });
  const expectedKeys = new Set();
  let kings = 0;
  let proofs = 0;
  for (const id of [...ctx.part.expected.practice, ...ctx.part.expected.freshTest]) {
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
      : `${expectedKeys.size} legal moves, one sorted line each; ${kings} king captures scope-unknown; ${proofs} proofs replayed; ${Object.keys(header.sources).length} verifier sources match the files`,
  };
}

function checkLedger(ctx) {
  if (ctx.skipInput) return skipped(`${INPUT_STOP} recomputed`);
  const ledgers = ensureLedgers(ctx);
  const problems = [];
  for (const seed of SEEDS) {
    const name = `ledger-${seed}.jsonl`;
    if (!existsSync(join(ctx.runDir, name))) { problems.push(`${name} missing`); continue; }
    if (canon(readJsonl(ctx.runDir, name)) !== canon(ledgers[seed])) problems.push(`${name} differs from the recomputed ledger`);
  }
  return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `${SEEDS.length} ledgers recomputed (${ledgers[SEEDS[0]].length} slots each); +1 counts full ${ctx.positives.full.join('/')}, quarter ${ctx.positives.quarter.join('/')}` };
}

function checkPermutation(ctx) {
  if (ctx.skipInput) return skipped(`${INPUT_STOP} recomputed`);
  ensureLedgers(ctx);
  const problems = [];
  const expected = [...SEEDS.map(seed => [`permutation-${seed}.json`, ctx.perms[seed]]), ['permutation-dev-A.json', ctx.devPerms.AB], ['permutation-dev-B.json', ctx.devPerms.BA]];
  for (const [name, want] of expected) {
    if (!existsSync(join(ctx.runDir, name))) { problems.push(`${name} missing`); continue; }
    if (canon(readJson(ctx.runDir, name)) !== canon(want)) problems.push(`${name} differs from the recomputed permutation`);
  }
  return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `${SEEDS.length} seed permutations and 2 dev permutations recomputed` };
}

function checkCache(ctx) {
  if (ctx.skipInput) return skipped(`${INPUT_STOP} recomputed`);
  const problems = [];
  const columns = ctx.opt.columns;
  const keysDoc = readJson(ctx.runDir, 'keys.json');
  const rows = keysDoc.rows;
  const v4Rows = readJson(ctx.v4Run, 'keys.json').rows;
  if (rows[0] !== 'blank') problems.push('row 0 is not blank');
  if (v4Rows[0] !== 'blank') problems.push('v4 row 0 is not blank');
  const keyList = rows.slice(1);
  const v4Keys = new Set(v4Rows.slice(1));
  const expected = new Set();
  for (const id of [...ctx.part.expected.practice, ...ctx.part.expected.freshTest]) {
    for (const u of legalOf(ctx, id)) if (!v4Keys.has(`${id}|${u}`)) expected.add(`${id}|${u}`);
  }
  const have = new Set(keyList);
  if (have.size !== keyList.length) problems.push('duplicate key in keys.json');
  if (!(keyList.length === expected.size && keyList.every(k => expected.has(k)))) problems.push(`keys.json is not exactly the ${expected.size} new legal moves of practice and fresh positions`);
  const schema = readJson(ctx.runDir, 'cache-schema.json');
  const manifest = readJson(ctx.runDir, 'manifest.json');
  if (schema.rows !== rows.length) problems.push('cache-schema rows differ from keys.json');
  if (schema.columns !== columns || schema.dtype !== 'float32' || schema.byteOrder !== 'little' || !Array.isArray(schema.kcIndices) || schema.kcIndices.length !== columns) problems.push('cache-schema shape, dtype or byte order is wrong');
  const cachePath = join(ctx.runDir, 'kc-cache.f32');
  const bytes = statSync(cachePath).size;
  if (bytes !== rows.length * columns * 4) problems.push(`kc-cache.f32 is ${bytes} bytes, expected ${rows.length * columns * 4}`);
  const digest = sha256File(cachePath);
  if (digest !== schema.fileSha256 || digest !== manifest.cacheSha256) problems.push('kc-cache.f32 SHA-256 differs from cache-schema or manifest');
  if (!ctx.opt.v4CacheSha256) problems.push('config gives no v4CacheSha256');
  const v4Digest = sha256File(join(ctx.v4Run, 'kc-cache.f32'));
  if (v4Digest !== ctx.opt.v4CacheSha256) problems.push(`v4 kc-cache.f32 SHA-256 ${v4Digest} differs from config v4CacheSha256`);
  const firstRow = path => {
    const fd = openSync(path, 'r');
    try {
      const b = Buffer.alloc(columns * 4);
      if (readSync(fd, b, 0, b.length, 0) !== b.length) return null;
      return b;
    } finally { closeSync(fd); }
  };
  const v5Row0 = firstRow(cachePath);
  const v4Row0 = firstRow(join(ctx.v4Run, 'kc-cache.f32'));
  if (!v5Row0 || !v4Row0 || !v5Row0.equals(v4Row0)) problems.push('row 0 is not byte-for-byte equal to the v4 row 0');
  return {
    pass: problems.length === 0,
    detail: problems.length ? problems.join('; ') : `${rows.length} rows x ${columns} float32 columns; ${expected.size} new keys exact; row 0 equals v4 row 0; v4 and v5 SHA-256 match`,
  };
}

function checkJobs(ctx) {
  const plan = planRun(ctx);
  const dir = join(ctx.runDir, 'jobs');
  const present = existsSync(dir) ? readdirSync(dir).filter(f => !f.endsWith('.steady')) : []; // .steady = worker admission markers
  const expected = new Map(plan.identities.map(j => [jobName(j), j]));
  const problems = [];
  for (const name of expected.keys()) if (!present.includes(name)) problems.push(`missing job file ${name}`);
  for (const name of present) {
    if (!expected.has(name)) { problems.push(`extra job file ${name}`); continue; }
    const declared = JSON.parse(readFileSync(join(dir, name), 'utf8')).job;
    if (canon(declared) !== canon(expected.get(name))) problems.push(`${name} declares job ${canon(declared)}`);
  }
  const dev = plan.identities.filter(j => j.phase === 'dev').length;
  return {
    pass: problems.length === 0,
    detail: problems.length ? problems.slice(0, 4).join('; ') : `${plan.identities.length} expected jobs (${dev} dev, ${plan.identities.length - dev} confirm); no extra or duplicate files`,
  };
}

function checkScores(ctx) {
  if (ctx.skipInput) return skipped(`${INPUT_STOP} recomputed`);
  const plan = planRun(ctx);
  const dir = join(ctx.runDir, 'jobs');
  const problems = [];
  let recomputed = 0;
  let notRechecked = 0;
  for (const job of plan.identities) {
    const name = jobName(job);
    const path = join(dir, name);
    if (!existsSync(path)) { problems.push(`${name}: missing job file`); continue; }
    if (RAW_ARMS.includes(job.arm) && !ctx.opt.rawRandom) { notRechecked++; continue; }
    let file;
    try { file = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { problems.push(`${name}: unreadable (${e.message})`); continue; }
    const { peakRssMiB, ...rest } = file;
    let want;
    try { want = getJob(ctx, job); } catch (e) { problems.push(`${name}: recompute failed (${e.message})`); continue; }
    if (canon(rest) !== canon(want)) problems.push(`${name}: ${firstDiff(rest, want)}`);
    else recomputed++;
  }
  return {
    pass: problems.length === 0,
    detail: problems.length
      ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}`
      : `${recomputed} jobs rebuilt exactly (transform, scaler, store, scores, counts, fingerprint, retention); ${notRechecked} raw and random jobs not rechecked (no retina in this run)`,
  };
}

function checkSelection(ctx, summary) {
  if (ctx.skipInput) return skipped(`${INPUT_STOP} recomputed`);
  const plan = planRun(ctx);
  const selection = readJson(ctx.runDir, 'selection.json');
  const problems = [];
  if (selection.selected !== plan.selected) problems.push(`selection.json selected ${short(selection.selected)}, recomputed ${short(plan.selected)}`);
  if (summary?.selectedKey !== plan.selected) problems.push(`summary.selectedKey ${short(summary?.selectedKey)}, recomputed ${short(plan.selected)}`);
  const m = plan.margins;
  return {
    pass: problems.length === 0,
    detail: problems.length ? problems.join('; ') : `selected ${plan.selected ?? 'none'}; margins K1 ${m.K1}, K2 ${m.K2}, K3 ${m.K3}`,
  };
}

function checkGate(ctx, summary) {
  const outcomeCheck = (outcome, detail) => {
    ctx.outcome = outcome;
    const same = summary?.outcome === outcome;
    return { pass: same, detail: same ? detail : `summary.outcome is ${short(summary?.outcome)}, recomputed ${outcome}` };
  };
  if (ctx.inputStop) return outcomeCheck(INPUT_STOP, `skipped (${INPUT_STOP}): recomputed from the partition`);
  const plan = planRun(ctx);
  if (plan.selected === null) return outcomeCheck(NO_KEY, `skipped (${NO_KEY}): every dev margin is 0 or below`);
  if (ctx.insufficient) return outcomeCheck(INSUFFICIENT, `skipped (${INSUFFICIENT}): full +1 ${ctx.positives.full.join('/')}, quarter +1 ${ctx.positives.quarter.join('/')}`);
  const verdict = computeVerdict(ctx, plan.selected);
  const outcome = verdict.pass ? 'passes' : 'does not pass';
  ctx.outcome = outcome;
  const problems = [];
  if (summary?.outcome !== outcome) problems.push(`summary.outcome is ${short(summary?.outcome)}, recomputed ${outcome}`);
  const { rule: _rule, ...recorded } = summary?.verdict ?? {}; // rule is a constant description, not a result
  const diff = firstDiff(summary?.verdict ? recorded : null, verdict, 'verdict');
  if (diff) problems.push(diff);
  return {
    pass: problems.length === 0,
    detail: problems.length ? problems.slice(0, 3).join('; ') : `outcome ${outcome}; selected ${plan.selected}; numericPairGate recomputed for ${SEEDS.length} seeds; full verdict matches summary.verdict`,
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
// Runs the dev jobs, selects, then the confirm jobs, each through child processes. Anything not precomputed is computed in-process by auditRun.
async function precomputeJobs(runDir, configPath, inputs, options, workers) {
  const opt = resolveOptions(options);
  const ctx = makeContext(runDir, inputs, opt);
  const results = new Map();
  const args = { runDir, configPath, workers, options };
  const runnable = ids => ids.filter(j => opt.rawRandom || !RAW_ARMS.includes(j.arm));
  try {
    ensurePartition(ctx);
    if (ctx.inputProblems.length) return results;
    ensureLedgers(ctx);
    await runJobs(runnable(devIdentities()), args, results);
    // A failed dev job stops the precompute here; auditRun then computes what is missing in-process and reports the error in its checks.
    const totals = job => { const r = results.get(jobName(job)); if (!r?.result) throw new Error(`dev job ${jobName(job)} failed`); return r.result.expectedTotal; };
    const selected = selectKey(marginsOf(totals));
    if (selected !== null && !ctx.insufficient) await runJobs(runnable(confirmIdentities(selected)), args, results);
    return results;
  } catch {
    return results;
  } finally { closeCaches(ctx); }
}

// Spec 10 entry point. inputs = { positionsAll, positionsV4, v4Run }. Options: pinned values, test-only values (columns, resamples,
// practiceGames, minFull, minQuarter, rawRandom: false), v4CacheSha256, positionsAllSha256, limitPositions (dry run), jobResults (from workers).
export function auditRun(runDir, inputs, options = {}) {
  const opt = resolveOptions(options);
  const pinned = Object.keys(PINNED).every(k => opt[k] === PINNED[k]) && opt.rawRandom === true && opt.limitPositions === null
    && V4_CACHE_PIN.test(opt.v4CacheSha256 ?? '') && POSITIONS_PIN.test(opt.positionsAllSha256 ?? '');
  const ctx = makeContext(runDir, inputs, opt);
  let summary = null;
  try { summary = readJson(runDir, 'summary.json'); } catch { summary = null; }
  const checks = [];
  const attempt = (name, fn) => {
    try { const r = fn(); checks.push({ name, pass: r.pass, detail: r.detail }); }
    catch (e) { checks.push({ name, pass: false, detail: `error: ${e.message}` }); }
  };
  try {
    attempt('partition', () => checkPartition(ctx, summary));
    attempt('schedules', () => checkSchedules(ctx));
    attempt('certificates', () => checkCertificates(ctx));
    attempt('ledger', () => checkLedger(ctx));
    attempt('permutation', () => checkPermutation(ctx));
    attempt('cache', () => checkCache(ctx));
    attempt('jobs', () => checkJobs(ctx));
    attempt('scores', () => checkScores(ctx));
    attempt('selection', () => checkSelection(ctx, summary));
    attempt('gate', () => checkGate(ctx, summary));
  } finally { closeCaches(ctx); }
  return { pass: checks.length === CHECKS.length && checks.every(c => c.pass), pinned, outcome: ctx.outcome ?? 'unknown', checks };
}

function loadInputs(config) {
  const readPositions = path => readFileSync(path, 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
  return { positionsAll: readPositions(config.paths.positionsAll), positionsV4: readPositions(config.paths.positionsV4), v4Run: config.paths.v4Run };
}

async function cli(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--run', '--config', '--dry-run', '--workers'].includes(argv[i]) || argv[i + 1] === undefined) throw new Error('usage: --run RUN_DIR --config CONFIG.json [--dry-run yes] [--workers 1|2|3]');
    args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!args.run || !args.config) throw new Error('usage: --run RUN_DIR --config CONFIG.json [--dry-run yes] [--workers 1|2|3]');
  const workers = Number(args.workers ?? 1);
  if (!Number.isInteger(workers) || workers < 1 || workers > 3) throw new Error('--workers must be 1, 2 or 3');
  const config = JSON.parse(readFileSync(args.config, 'utf8'));
  const inputs = loadInputs(config);
  // config.options holds test-only values (for example a small fixture); any such value makes the report unpinned.
  const options = { ...(config.options ?? {}), v4CacheSha256: config.v4CacheSha256, positionsAllSha256: sha256File(config.paths.positionsAll) };
  if (args['dry-run'] === 'yes') {
    if (readJson(args.run, 'summary.json').dryRun !== true) throw new Error('--dry-run yes needs a dry-run summary');
    // Dry run: the runner kept the first N practice and fresh positions; N is the practice count it wrote. Exposure stops are 1 (as v4's dry run).
    options.limitPositions = readJson(args.run, 'partition.json').practice.length;
    options.minFull = 1;
    options.minQuarter = 1;
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
    ensureLedgers(ctx);
    if (ctx.inputProblems.length) throw new Error(`input problems: ${ctx.inputProblems.slice(0, 2).join('; ')}`);
    process.stdout.write(`${JSON.stringify({ result: computeJob(ctx, identity) })}\n`);
  } finally { closeCaches(ctx); }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const argv = process.argv.slice(2);
  const run = argv[0] === '--audit-job' ? childMain(argv[1]) : cli(argv);
  run.catch(e => { console.error(e.message); process.exitCode = 2; });
}

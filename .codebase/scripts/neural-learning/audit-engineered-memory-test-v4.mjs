#!/usr/bin/env node
// Independent auditor for a memory v4 run folder. Spec: documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md (sections 3-8); file contract: documentation/design/neural-learning/memory-v4-file-formats.md.
// Re-implements every rule it checks. Imports only pinned shared libraries, never the v4 runner, ledger or task file.
// CLI: node .codebase/scripts/neural-learning/audit-engineered-memory-test-v4.mjs --run RUN_DIR --positions positions.jsonl
// Writes RUN_DIR/audit.json and exits 1 when any check fails.
import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Chess } from 'chess.js';
import { checkCaptureRetentionAction } from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { NearestEpisodeMemory, makeRandomExpansion, rmsScaler } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

// Pinned values (proposal sections 3-7). Tests may pass other values in options; the report then says pinned: false.
const PINNED = Object.freeze({ columns: 5177, resamples: 10000, minPositives: 40, minCorrect: 96, minMargin: 9, lowerQuantile: 0.025, gateSeed: 20261103 });
const SEEDS = [6101, 6102, 6103];
const CAPACITY = 2048;
const NEIGHBOURS = 3;
const SPARSE_KEEP = 259;
const MAX_REPLIES = 256;
const TASK = { objective: 'capture-retention', plies: 1 };
const CHECKS = ['replay', 'schedules', 'certificates', 'ledger', 'permutation', 'cache', 'scores', 'gate'];
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const RETINA = join(ROOT, '.cache', 'full.npz');
// Verifier sources that every certificate header must hash (paths from the repository root).
const REQUIRED_SOURCES = ['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs'];
// Arm -> feature. Mismatched arms reuse their matched feature with permuted outcomes. null: no store, so the memory stays empty.
// raw and random are rechecked only with the retina (option rawRandom).
const ARM_FEATURE = { graph: 'graph', 'graph-sparse': 'graph-sparse', 'graph-mismatched': 'graph', 'graph-sparse-mismatched': 'graph-sparse', 'graph-centred': 'graph-centred', raw: 'raw', random: 'random', none: null };
const RAW_RANDOM = new Set(['raw', 'random']);
const GRAPH_FEATURES = ['graph', 'graph-sparse', 'graph-centred'];
const CANDIDATES = [
  { name: 'graph', comparators: ['raw', 'random', 'none', 'graph-mismatched'] },
  { name: 'graph-sparse', comparators: ['raw', 'random', 'none', 'graph-sparse-mismatched'] },
];

const sha256 = data => createHash('sha256').update(data).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uciOf = m => m.from + m.to + (m.promotion ?? '');
const idOf = p => `${p.gameId}:${p.ply}`;
const isKnown = v => v === 1 || v === -1;
// JSON with object keys sorted at every level, so equal content gives equal text.
const canon = v => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x));
const readJson = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
const readJsonl = (dir, name) => readFileSync(join(dir, name), 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
const sortRows = rows => [...(rows ?? [])].sort((a, b) => cmp(`${a.seed}|${a.arm}`, `${b.seed}|${b.arm}`));

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

// Spec 3.1: replay the history from the start position; the result must equal the recorded FEN.
function replay(p) {
  const board = new Chess();
  for (const m of p.history) {
    if (!board.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.length > 4 ? m[4] : undefined })) throw new Error(`illegal history move ${m}`);
  }
  if (board.fen() !== p.fen) throw new Error('history does not replay to its FEN');
  return board;
}

// Spec 3.2: forward partial Fisher-Yates over the sorted legal UCIs; keep the first min(4, n) draws in draw order.
function drawSchedule(seed, id, sortedUcis) {
  const a = [...sortedUcis];
  const n = a.length;
  const m = Math.min(4, n);
  const rng = mulberry32((seed ^ parseInt(sha256(id).slice(0, 8), 16)) >>> 0);
  for (let i = 0; i < m; i++) { const j = i + Math.floor(rng() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, m);
}

// Spec 3.7: forward full Fisher-Yates over the known slots; values[t] = known[indices[t]].value.
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

// Formats doc: graph = row; graph-centred = row - blank; graph-sparse keeps the largest positive residuals (ties: lower index), never a zero.
function transform(feature, row, blank) {
  if (feature === 'graph') return Float64Array.from(row);
  if (feature === 'graph-centred') return Float64Array.from(row, (x, i) => x - blank[i]);
  const r = Float64Array.from(row, (x, i) => Math.max(0, x - blank[i]));
  const keep = [...r.keys()].filter(i => r[i] > 0).sort((a, b) => r[b] - r[a] || a - b).slice(0, SPARSE_KEEP);
  const out = new Float64Array(r.length);
  for (const i of keep) out[i] = r[i];
  return out;
}

// Coordinates whose practice RMS is exactly 0 (rmsScaler keeps its RMS private). RMS is 0 exactly when the sum of squares is 0.
function zeroRmsCount(vectors) {
  let zeros = 0;
  for (let i = 0; i < vectors[0].length; i++) {
    let s = 0;
    for (const v of vectors) s += v[i] * v[i];
    if (s === 0) zeros++;
  }
  return zeros;
}

const sameVector = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// records.jsonl: 'test' lines keyed seed|arm|id; 'arm-done' lines keyed seed|arm.
function indexRecords(records) {
  const tests = new Map();
  const done = new Map();
  const dupes = [];
  for (const r of records) {
    if (r.kind === 'test') { const k = `${r.seed}|${r.arm}|${r.id}`; if (tests.has(k)) dupes.push(k); tests.set(k, r); }
    else if (r.kind === 'arm-done') { const k = `${r.seed}|${r.arm}`; if (done.has(k)) dupes.push(k); done.set(k, r); }
  }
  return { tests, done, dupes };
}

// Returns { pass, checks, outcome, pinned }. Never throws on a tampered folder: each failing check reports its error.
// rawRandom (default true) rechecks raw and random from the eye input and the retina at RETINA; tests without the retina pass false.
export function auditRun(runDir, positions, options = {}) {
  const opt = { ...PINNED, rawRandom: true, ...options };
  const rawRandom = opt.rawRandom === true;
  const pinned = Object.keys(PINNED).every(k => opt[k] === PINNED[k]) && rawRandom;
  const checks = [];
  const attempt = (name, fn) => {
    try { const r = fn(); checks.push({ name, pass: r.pass, detail: r.detail }); }
    catch (e) { checks.push({ name, pass: false, detail: `error: ${e.message}` }); }
  };
  // ctx.stop: the outcome that stops the run before the cache (spec 3.4 collisions, then 5 exposure). Checks 6-8 are skipped then.
  const ctx = { split: null, boards: new Map(), schedules: null, certs: null, ledgers: null, perms: null, positives: null, stop: null, deriveError: null, collisions: null, collisionsError: null, outcome: null };
  const boardOf = id => { const b = ctx.boards.get(id); if (!b) throw new Error(`no replayed board for ${id}`); return b; };
  const stopReason = () => (ctx.stop === 'input-validity failure'
    ? 'collisions.json lists input-collision stop groups'
    : `verified +1 events per seed ${canon(ctx.positives)}, minimum ${opt.minPositives}`);

  // 1. Replay every split position from its history; the split must cover the positions file exactly.
  attempt('replay', () => {
    const split = readJson(runDir, 'split.json');
    const ids = [...split.practice, ...split.test];
    const byId = new Map(positions.map(p => [idOf(p), p]));
    const problems = [];
    if (byId.size !== positions.length) problems.push('positions file repeats an id');
    if (new Set(ids).size !== ids.length) problems.push('split repeats or overlaps an id');
    if (ids.length !== byId.size || ids.some(id => !byId.has(id))) problems.push('split does not cover exactly the positions file');
    if (!Array.isArray(split.testGames) || split.testGames.length !== split.test.length || split.test.some((id, i) => byId.get(id)?.gameId !== split.testGames[i])) problems.push('testGames do not match the test positions');
    ctx.split = split;
    for (const id of ids) {
      const p = byId.get(id);
      if (!p) continue;
      try {
        const board = replay(p);
        const moves = board.moves({ verbose: true });
        ctx.boards.set(id, { position: p, board, moves: new Map(moves.map(m => [uciOf(m), m])), legal: moves.map(uciOf).sort(cmp) });
      } catch (e) { problems.push(`${id}: ${e.message}`); }
    }
    return { pass: problems.length === 0, detail: problems.length ? problems.slice(0, 3).join('; ') : `${ids.length} positions replay to their FEN; split covers the positions file exactly` };
  });

  // 2. Schedules recomputed from the seeds; file bytes pinned by the manifest.
  attempt('schedules', () => {
    const expected = {};
    for (const seed of SEEDS) expected[seed] = ctx.split.practice.map(id => ({ id, moves: drawSchedule(seed, id, boardOf(id).legal) }));
    ctx.schedules = expected;
    const problems = [];
    if (canon(readJson(runDir, 'schedules.json')) !== canon(expected)) problems.push('schedules.json differs from the recomputed schedules');
    if (sha256File(join(runDir, 'schedules.json')) !== readJson(runDir, 'manifest.json').scheduleSha256) problems.push('schedules.json SHA-256 differs from manifest.scheduleSha256');
    return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `${SEEDS.length} seeds x ${ctx.split.practice.length} practice positions; SHA-256 matches manifest` };
  });

  // 3. Certificates: one sorted line per legal move; each proof replayed; category and value follow the spec mapping and the positions outcome.
  attempt('certificates', () => {
    const lines = readJsonl(runDir, 'certificates.jsonl');
    const header = lines[0] ?? {};
    const certs = lines.slice(1);
    const byKey = new Map();
    ctx.certs = { byKey };
    const problems = [];
    if (header.kind !== 'verifier') problems.push('line 1 is not the verifier header');
    if (canon(header.task) !== canon(TASK)) problems.push('task is not the one-reply capture-retention task');
    if (header.maxReplies !== MAX_REPLIES) problems.push('maxReplies is not 256');
    if (!header.sources || typeof header.sources !== 'object') problems.push('verifier sources missing');
    else {
      // Every hashed source must equal the file's SHA-256 now, and the capture-retention sources must be among them.
      for (const [rel, hash] of Object.entries(header.sources)) if (currentSha256(rel) !== hash) problems.push(`verifier source ${rel} differs from the file now`);
      for (const rel of REQUIRED_SOURCES) if (!Object.hasOwn(header.sources, rel)) problems.push(`verifier sources lack ${rel}`);
    }
    certs.forEach((c, i) => {
      const key = `${c.id}|${c.uci}`;
      if (byKey.has(key)) problems.push(`duplicate line ${key}`);
      byKey.set(key, c);
      if (i > 0 && !(certs[i - 1].id < c.id || (certs[i - 1].id === c.id && certs[i - 1].uci < c.uci))) problems.push(`line ${key} is out of id/uci order`);
    });
    const expectedKeys = new Set();
    let kings = 0;
    let proofs = 0;
    for (const id of [...ctx.split.practice, ...ctx.split.test]) {
      const { position, board, moves } = boardOf(id);
      for (const [uci, m] of moves) {
        const key = `${id}|${uci}`;
        expectedKeys.add(key);
        const line = byKey.get(key);
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
    for (const key of byKey.keys()) if (!expectedKeys.has(key)) problems.push(`extra line ${key}`);
    return { pass: problems.length === 0, detail: problems.length ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}` : `${expectedKeys.size} legal moves, one sorted line each; ${kings} king captures scope-unknown; ${proofs} proofs replayed; ${Object.keys(header.sources).length} verifier sources match the files` };
  });

  // Derived state for checks 4-8. Built from the schedules and certificates, not from the ledger files.
  try {
    ctx.ledgers = {};
    ctx.perms = {};
    for (const seed of SEEDS) {
      const slots = [];
      for (const entry of ctx.schedules[seed]) {
        for (const uci of entry.moves) {
          const line = ctx.certs.byKey.get(`${entry.id}|${uci}`);
          if (!line) throw new Error(`no certificate line for ${entry.id}|${uci}`);
          slots.push({ slot: slots.length, id: entry.id, uci, category: line.category, value: line.value, certificateSha256: line.certificateSha256 });
        }
      }
      ctx.ledgers[seed] = slots;
      ctx.perms[seed] = permute(seed, slots.filter(s => isKnown(s.value)));
    }
    ctx.positives = Object.fromEntries(SEEDS.map(seed => [seed, ctx.ledgers[seed].filter(s => s.value === 1).length]));
  } catch (e) { ctx.deriveError = e.message; }
  try { ctx.collisions = readJson(runDir, 'collisions.json'); } catch (e) { ctx.collisionsError = e.message; }
  const collisionsStop = Array.isArray(ctx.collisions?.stop) && ctx.collisions.stop.length > 0;
  const shortSeed = ctx.positives !== null && SEEDS.some(seed => ctx.positives[seed] < opt.minPositives);
  ctx.stop = collisionsStop ? 'input-validity failure' : shortSeed ? 'insufficient experience' : null;

  // 4. Ledgers recomputed from schedules and certificates. Absent only when the run stopped before the ledger step.
  attempt('ledger', () => {
    if (ctx.deriveError) throw new Error(ctx.deriveError);
    const problems = [];
    const notWritten = [];
    for (const seed of SEEDS) {
      const name = `ledger-${seed}.jsonl`;
      if (!existsSync(join(runDir, name))) { if (ctx.stop) notWritten.push(name); else problems.push(`${name} missing`); continue; }
      if (canon(readJsonl(runDir, name)) !== canon(ctx.ledgers[seed])) problems.push(`${name} differs from the recomputed ledger`);
    }
    const note = notWritten.length ? `; not written because the run stopped (${ctx.stop}): ${notWritten.join(', ')}` : '';
    return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `${SEEDS.length} ledgers recomputed (${ctx.ledgers[SEEDS[0]].length} slots each)${note}` };
  });

  // 5. Permutation recomputed over the known-slot mask; +1/-1 counts preserved.
  attempt('permutation', () => {
    if (ctx.deriveError) throw new Error(ctx.deriveError);
    const problems = [];
    const notWritten = [];
    for (const seed of SEEDS) {
      const name = `permutation-${seed}.json`;
      if (!existsSync(join(runDir, name))) { if (ctx.stop) notWritten.push(name); else problems.push(`${name} missing`); continue; }
      const file = readJson(runDir, name);
      if (canon(file) !== canon(ctx.perms[seed])) problems.push(`${name} differs from the recomputed permutation`);
      const known = ctx.ledgers[seed].filter(s => isKnown(s.value)).map(s => s.value);
      const values = file.values ?? [];
      if (values.filter(v => v === 1).length !== known.filter(v => v === 1).length || values.filter(v => v === -1).length !== known.filter(v => v === -1).length) problems.push(`${name} changes the +1/-1 counts`);
    }
    const note = notWritten.length ? `; not written because the run stopped (${ctx.stop}): ${notWritten.join(', ')}` : '';
    return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `${SEEDS.length} permutations recomputed; counts preserved${note}` };
  });

  // 6. Cache: exact size, pinned SHA-256, and keys.json = blank plus every legal move of the split, once each.
  attempt('cache', () => {
    if (ctx.stop) return { pass: true, detail: `skipped (${ctx.stop}): ${stopReason()}` };
    const keysDoc = readJson(runDir, 'keys.json');
    const schema = readJson(runDir, 'cache-schema.json');
    const manifest = readJson(runDir, 'manifest.json');
    const rows = keysDoc.rows;
    const keyList = rows.slice(1);
    const have = new Set(keyList);
    const expected = new Set();
    for (const id of [...ctx.split.practice, ...ctx.split.test]) for (const u of boardOf(id).legal) expected.add(`${id}|${u}`);
    const problems = [];
    if (rows[0] !== 'blank') problems.push('row 0 is not blank');
    if (have.size !== keyList.length) problems.push('duplicate key in keys.json');
    if (keyList.length !== expected.size || [...expected].some(k => !have.has(k)) || keyList.some(k => !expected.has(k))) problems.push(`keys.json is not exactly the ${expected.size} legal moves of the split`);
    if (schema.rows !== rows.length) problems.push('cache-schema rows differ from keys.json');
    if (schema.columns !== opt.columns || schema.dtype !== 'float32' || schema.byteOrder !== 'little' || !Array.isArray(schema.kcIndices) || schema.kcIndices.length !== opt.columns) problems.push('cache-schema shape, dtype or byte order is wrong');
    const cachePath = join(runDir, 'kc-cache.f32');
    const bytes = statSync(cachePath).size;
    if (bytes !== rows.length * opt.columns * 4) problems.push(`kc-cache.f32 is ${bytes} bytes, expected ${rows.length * opt.columns * 4}`);
    const digest = sha256File(cachePath);
    if (digest !== schema.fileSha256 || digest !== manifest.cacheSha256) problems.push('kc-cache.f32 SHA-256 differs from cache-schema or manifest');
    return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `${rows.length} rows x ${opt.columns} float32 columns; keys exact; SHA-256 matches` };
  });

  // 7. Scores: features rebuilt from the cache (raw and random from the eye input and the retina), memories rebuilt from the ledgers, every test score compared exactly.
  attempt('scores', () => {
    if (ctx.stop) return { pass: true, detail: `skipped (${ctx.stop}): ${stopReason()}` };
    const keyList = readJson(runDir, 'keys.json').rows.slice(1);
    if (new Set(keyList).size !== keyList.length) throw new Error('keys.json repeats a key');
    const rowOf = new Map(keyList.map((key, i) => [key, i + 1]));
    const scalersFile = readJson(runDir, 'scalers.json');
    const records = readJsonl(runDir, 'records.jsonl');
    const { tests, done, dupes } = indexRecords(records);
    const problems = dupes.map(k => `duplicate record ${k}`);
    const fd = openSync(join(runDir, 'kc-cache.f32'), 'r');
    try {
      const readRow = i => {
        const buf = Buffer.alloc(opt.columns * 4);
        if (readSync(fd, buf, 0, buf.length, i * opt.columns * 4) !== buf.length) throw new Error(`cache row ${i} is missing or truncated`);
        const out = new Float64Array(opt.columns);
        for (let c = 0; c < opt.columns; c++) out[c] = buf.readFloatLE(c * 4);
        return out;
      };
      const lookup = key => { if (!rowOf.has(key)) throw new Error(`no cache row for ${key}`); return readRow(rowOf.get(key)); };
      const blank = readRow(0);
      const features = rawRandom ? [...GRAPH_FEATURES, 'raw', 'random'] : GRAPH_FEATURES;
      // raw: the eye input over the retina, as the runner's rawOf. random: the fixed sparse expansion of raw, keeping 0.05 of the units.
      let retina = null, eyes = null, expand = null;
      if (rawRandom) {
        retina = loadRetina(RETINA);
        eyes = createEyesV2(retina);
        expand = makeRandomExpansion({ inputs: retina.retina_idx.length, units: PINNED.columns, fanIn: 6, seed: 20261103 });
        if (expand.wiringSha256 !== scalersFile.randomWiringSha256) problems.push('randomWiringSha256 differs from the recomputed random wiring');
      }
      const rawOf = key => {
        const cut = key.indexOf('|');
        const { position } = boardOf(key.slice(0, cut));
        const at = new Map(eyes.encode(position.fen, key.slice(cut + 1)).stimulation.map(x => [x.index, x.current]));
        return Float64Array.from(retina.retina_idx, i => at.get(i) ?? 0);
      };
      const unscaled = (feature, key) => {
        if (feature === 'raw') return rawOf(key);
        if (feature === 'random') return expand(rawOf(key), 0.05);
        return transform(feature, lookup(key), blank);
      };
      const scalers = {}, live = {};
      for (const feature of features) {
        const fit = ctx.split.practice.map(id => unscaled(feature, `${id}|${boardOf(id).legal[0]}`));
        scalers[feature] = rmsScaler(fit);
        // Zero-RMS mask (proposal section 4 addendum): coordinates whose fit vectors are all 0 score 0.
        live[feature] = Uint8Array.from(fit[0], (_, i) => fit.some(v => v[i] !== 0) ? 1 : 0);
        const want = scalersFile[feature] ?? {};
        if (want.rmsSha256 !== scalers[feature].rmsSha256 || want.zeroRmsFeatures !== zeroRmsCount(fit)) problems.push(`scalers.json ${feature} differs from the recomputed RMS`);
      }
      const vectorOf = (feature, key, memo) => {
        let v = memo.get(key);
        if (v === undefined) {
          v = scalers[feature](unscaled(feature, key));
          for (let i = 0; i < v.length; i++) if (!live[feature][i]) v[i] = 0;
          memo.set(key, v);
        }
        return v;
      };
      const zeroVector = new Float64Array(1);

      // Writes the ledger into a fresh store, then scores every test move; compares every count, the fingerprint and each s/c.
      // Every arm counts the unknown slots (the runner does too, before its none-arm test); only feature arms write.
      const auditArm = (arm, seed, feature, memo) => {
        const out = [];
        const mismatched = arm.endsWith('-mismatched');
        const perm = ctx.perms[seed];
        const mem = new NearestEpisodeMemory({ capacity: CAPACITY, k: NEIGHBOURS });
        const counts = { writes: 0, unknown: 0, replacements: 0, evictions: 0 };
        let known = 0;
        for (const slot of ctx.ledgers[seed]) {
          if (!isKnown(slot.value)) { counts.unknown++; continue; }
          const value = mismatched ? perm.values[known] : slot.value;
          known++;
          if (feature === null) continue;
          const vector = vectorOf(feature, `${slot.id}|${slot.uci}`, memo);
          const evidenceHash = sha256(JSON.stringify({ arm, slot: slot.slot, id: slot.id, uci: slot.uci, value }));
          if (mem.entries.some(e => sameVector(e.vector, vector))) counts.replacements++;
          else if (mem.size === CAPACITY) counts.evictions++;
          mem.write(vector, value, evidenceHash);
          counts.writes++;
        }
        const stored = mem.size;
        const fingerprint = mem.fingerprint();
        let expectedTotal = 0;
        let ties = 0;
        for (const id of ctx.split.test) {
          const { legal } = boardOf(id);
          const vectors = legal.map(u => (feature === null ? zeroVector : vectorOf(feature, `${id}|${u}`, memo)));
          const scores = frozenScores(legal.map((_, i) => i), i => mem.score(vectors[i]), () => mem.fingerprint());
          const top = Math.max(...scores);
          const tied = legal.map((_, i) => i).filter(i => scores[i] === top);
          const c = tied.length;
          const s = tied.filter(i => ctx.certs.byKey.get(`${id}|${legal[i]}`).value === 1).length;
          const expected = s / c;
          expectedTotal += expected;
          if (c > 1) ties++;
          const rec = tests.get(`${seed}|${arm}|${id}`);
          if (!rec) out.push(`${seed}|${arm}|${id}: no test line`);
          else if (rec.c !== c || rec.s !== s || !Object.is(rec.expected, expected)) out.push(`${seed}|${arm}|${id}: record ${rec.s}/${rec.c}=${rec.expected}, recomputed ${s}/${c}=${expected}`);
        }
        const armDone = done.get(`${seed}|${arm}`);
        if (!armDone) { out.push(`${seed}|${arm}: no arm-done line`); return out; }
        const want = { writes: counts.writes, unknown: counts.unknown, stored, replacements: counts.replacements, evictions: counts.evictions, expectedTotal, ties, fingerprint };
        for (const k of Object.keys(want)) {
          const same = k === 'expectedTotal' ? Object.is(armDone[k], want[k]) : armDone[k] === want[k];
          if (!same) out.push(`${seed}|${arm}: arm-done ${k} ${armDone[k]}, recomputed ${want[k]}`);
        }
        return out;
      };

      const scoredArms = Object.keys(ARM_FEATURE).filter(a => rawRandom || !RAW_RANDOM.has(a));
      const scoredTestLines = records.filter(r => r.kind === 'test' && scoredArms.includes(r.arm)).length;
      if (scoredTestLines !== SEEDS.length * scoredArms.length * ctx.split.test.length) problems.push(`${scoredTestLines} test lines for scored arms, expected ${SEEDS.length * scoredArms.length * ctx.split.test.length}`);
      // One feature at a time: its memo is dropped before the next feature, so only one feature's vectors are held.
      let memo = null;
      for (const feature of [...features, null]) {
        memo = new Map();
        for (const arm of scoredArms.filter(a => ARM_FEATURE[a] === feature)) {
          for (const seed of SEEDS) problems.push(...auditArm(arm, seed, feature, memo));
        }
        memo = null;
      }
      return {
        pass: problems.length === 0,
        detail: problems.length
          ? `${problems.length} mismatches; first: ${problems.slice(0, 3).join('; ')}`
          : `${scoredArms.length} arms x ${SEEDS.length} seeds rebuilt from the ledger; ${ctx.split.test.length} test positions scored; ${rawRandom ? 'raw and random rechecked (eye input, retina, random wiring)' : 'raw and random not rechecked (no retina in this run)'}; density and sparseZeroRmsTestCoords not rechecked`,
      };
    } finally { closeSync(fd); }
  });

  // 8. Gate: numericPairGate recomputed per seed from the test lines. Winners, outcome and every per-seed verdict field must match summary.verdict exactly.
  attempt('gate', () => {
    const summary = readJson(runDir, 'summary.json');
    const problems = [];
    if (ctx.collisionsError) problems.push(`collisions.json unreadable: ${ctx.collisionsError}`);
    if (ctx.deriveError) throw new Error(ctx.deriveError);
    if (ctx.stop) {
      ctx.outcome = ctx.stop;
      if (summary.outcome !== ctx.stop) problems.push(`summary.outcome is ${summary.outcome}, recomputed ${ctx.stop}`);
      if (canon(summary.positives) !== canon(ctx.positives)) problems.push('summary.positives differ from the ledger');
      return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `skipped (${ctx.stop}): ${stopReason()}; summary agrees` };
    }
    const { tests, done } = indexRecords(readJsonl(runDir, 'records.jsonl'));
    const armValues = (seed, arm) => ctx.split.test.map(id => {
      const r = tests.get(`${seed}|${arm}|${id}`);
      if (!r) throw new Error(`no test line for ${seed}|${arm}|${id}`);
      return r.expected;
    });
    const winners = [];
    const gates = {};
    for (const cand of CANDIDATES) {
      gates[cand.name] = SEEDS.map(seed => {
        const arms = {};
        for (const name of [cand.name, ...cand.comparators]) arms[name] = armValues(seed, name);
        return numericPairGate({ arms, games: ctx.split.testGames, primary: cand.name, comparators: cand.comparators, minCorrect: opt.minCorrect, minMargin: opt.minMargin, resamples: opt.resamples, seed: opt.gateSeed, lowerQuantile: opt.lowerQuantile });
      });
      if (gates[cand.name].every(g => g.pass)) winners.push(cand.name);
    }
    const outcome = winners.length ? 'passes' : 'does not pass';
    ctx.outcome = outcome;
    if (summary.outcome !== outcome) problems.push(`summary.outcome is ${summary.outcome}, recomputed ${outcome}`);
    if (!Array.isArray(summary.verdict?.winners) || canon([...summary.verdict.winners].sort()) !== canon([...winners].sort())) problems.push(`verdict.winners ${canon(summary.verdict?.winners)}, recomputed ${canon(winners)}`);
    // Every per-seed field (seed order as SEEDS) must equal the recomputed value; numbers compare with Object.is.
    const perCandidate = summary.verdict?.perCandidate ?? {};
    const same = (label, want, got) => { if (!Object.is(want, got)) problems.push(`${label}: summary ${canon(want)}, recomputed ${canon(got)}`); };
    for (const cand of CANDIDATES) {
      same(`${cand.name} pass`, perCandidate[cand.name]?.pass, gates[cand.name].every(g => g.pass));
      SEEDS.forEach((seed, i) => {
        const want = perCandidate[cand.name]?.perSeed?.[i] ?? {};
        const got = gates[cand.name][i];
        const label = `${cand.name} seed ${seed}`;
        same(`${label} seed`, want.seed, seed);
        same(`${label} pass`, want.pass, got.pass);
        same(`${label} correct`, want.correct, got.correct);
        same(`${label} total`, want.total, got.total);
        same(`${label} comparator names`, canon(Object.keys(want.comparators ?? {}).sort()), canon(Object.keys(got.comparators).sort()));
        for (const c of cand.comparators) {
          same(`${label} ${c} margin`, want.comparators?.[c]?.margin, got.comparators[c].margin);
          same(`${label} ${c} lower`, want.comparators?.[c]?.lower, got.comparators[c].lower);
        }
      });
    }
    if (canon(summary.positives) !== canon(ctx.positives)) problems.push('summary.positives differ from the ledger');
    if (canon(sortRows(summary.rows)) !== canon(sortRows([...done.values()]))) problems.push('summary.rows differ from the arm-done lines');
    return { pass: problems.length === 0, detail: problems.length ? problems.join('; ') : `winners: ${winners.length ? winners.join(', ') : 'none'}; outcome ${outcome}; numericPairGate recomputed for ${CANDIDATES.length} candidates x ${SEEDS.length} seeds; every verdict field matches` };
  });

  return { pass: checks.length === CHECKS.length && checks.every(c => c.pass), pinned, outcome: ctx.outcome ?? ctx.stop ?? 'unknown', checks };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    if (!['--run', '--positions', '--dry-run'].includes(process.argv[i]) || process.argv[i + 1] === undefined) throw new Error('usage: --run RUN_DIR --positions positions.jsonl [--dry-run yes]');
    args[process.argv[i].slice(2)] = process.argv[i + 1];
  }
  if (!args.run || !args.positions) throw new Error('usage: --run RUN_DIR --positions positions.jsonl [--dry-run yes]');
  let positions = readFileSync(args.positions, 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
  let options = {};
  // Dry run (runner --limit-positions): audit only the split's positions, with the runner's dry-run exposure stop of 1. The report is unpinned.
  if (args['dry-run'] === 'yes') {
    if (JSON.parse(readFileSync(join(args.run, 'summary.json'), 'utf8')).dryRun !== true) throw new Error('--dry-run yes needs a dry-run summary');
    const split = JSON.parse(readFileSync(join(args.run, 'split.json'), 'utf8')), keep = new Set([...split.practice, ...split.test]);
    positions = positions.filter(p => keep.has(`${p.gameId}:${p.ply}`));
    options = { minPositives: 1 };
  }
  const report = auditRun(args.run, positions, options);
  writeFileSync(join(args.run, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  for (const c of report.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
  console.log(report.pass ? 'AUDIT PASS' : 'AUDIT FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

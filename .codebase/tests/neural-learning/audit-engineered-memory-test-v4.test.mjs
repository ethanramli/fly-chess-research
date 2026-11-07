import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { Chess } from 'chess.js';
import { auditRun } from '../../scripts/neural-learning/audit-engineered-memory-test-v4.mjs';
import { certifyCaptureRetentionAction } from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import { NearestEpisodeMemory, rmsScaler } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

// Synthetic run folder: 3 practice and 2 test real positions, 6 KC columns, 3 seeds. Test-scale gate settings: the pinned values need 184 test positions.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const POSITIONS = join(HERE, '..', '..', '..', 'runs', 'restart-data-2026-11-03', 'capture-choice-positions-v1', 'positions.jsonl');
const AUDITOR = join(HERE, '..', '..', 'scripts', 'neural-learning', 'audit-engineered-memory-test-v4.mjs');
const COLUMNS = 6;
const SEEDS = [6101, 6102, 6103];
const SPARSE_KEEP = 259;
const PRACTICE_IDS = ['FzqK9hwt:21', 'Hl3fRtmA:21', '7JFAA7uB:49'];
// 7JFAA7uB:49 has a legal king capture (c7d8). Seeds 6102 and 6103 draw it, so their ledgers hold one unknown slot each.
// 19J3n6eX:21 has a legal king capture (e8e7), so its line is scope-unknown.
const TEST_IDS = ['19J3n6eX:21', 'jBUsNlIE:39'];
// No retina in this fixture, so raw and random are not rechecked (rawRandom false also makes the report unpinned).
const OPTS = { columns: COLUMNS, resamples: 200, minPositives: 1, minCorrect: 1, minMargin: 0, rawRandom: false };
const CHECKS = ['replay', 'schedules', 'certificates', 'ledger', 'permutation', 'cache', 'scores', 'gate'];
const TASK = { objective: 'capture-retention', plies: 1 };
// The verifier sources the runner hashes into the certificate header.
const VERIFIER_FILES = ['.codebase/src/neural-learning/engineered-memory-v4-ledger.mjs', '.codebase/src/search-and-feedback/capture-retention-action-domain.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate.mjs', '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs', '.codebase/src/search-and-feedback/puzzle-search.mjs'];
const CERT_SOURCE = '.codebase/src/search-and-feedback/capture-retention-certificate.mjs';

const sha = data => createHash('sha256').update(data).digest('hex');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const readJsonl = path => readFileSync(path, 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const writeJsonl = (path, values) => writeFileSync(path, values.map(v => JSON.stringify(v)).join('\n') + '\n');
const failing = report => report.checks.filter(c => !c.pass).map(c => c.name);
const check = (report, name) => report.checks.find(c => c.name === name);

// The writer follows memory-v4-file-formats.md. It shares the pinned libraries with the auditor but none of its code.
function writeFixture(dir, positions) {
  mkdirSync(dir, { recursive: true });
  const byId = new Map(positions.map(p => [`${p.gameId}:${p.ply}`, p]));
  const all = [...PRACTICE_IDS, ...TEST_IDS];
  const boards = new Map();
  for (const id of all) {
    const p = byId.get(id);
    assert.ok(p, `fixture position ${id} is missing from the positions file`);
    const b = new Chess();
    for (const m of p.history) b.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.length > 4 ? m[4] : undefined });
    assert.equal(b.fen(), p.fen);
    boards.set(id, b);
  }
  const ucisOf = id => boards.get(id).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? '')).sort();

  // Schedules (spec 3.2).
  const schedules = {};
  for (const seed of SEEDS) {
    schedules[seed] = PRACTICE_IDS.map(id => {
      const a = ucisOf(id);
      const n = a.length;
      const m = Math.min(4, n);
      const rng = mulberry32((seed ^ parseInt(sha(id).slice(0, 8), 16)) >>> 0);
      for (let i = 0; i < m; i++) { const j = i + Math.floor(rng() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; }
      return { id, moves: a.slice(0, m) };
    });
  }
  writeJson(join(dir, 'schedules.json'), schedules);
  const scheduleSha256 = sha(readFileSync(join(dir, 'schedules.json')));

  // Certificates (spec 3.3): the producer for every non-king move; king captures are scope-unknown.
  const certs = [];
  for (const id of all) {
    const b = boards.get(id);
    const p = byId.get(id);
    for (const m of b.moves({ verbose: true })) {
      const uci = m.from + m.to + (m.promotion ?? '');
      const captured = Boolean(m.captured);
      let line;
      if (captured && m.piece === 'k') {
        line = { id, uci, category: 'unknown', value: null, status: 'scope-unknown', proof: null, certificateSha256: null };
      } else {
        const proof = certifyCaptureRetentionAction(b, uci, { ...TASK }, {});
        const category = proof.status === 'success' ? 'safe' : captured ? 'unsafe' : 'quiet';
        line = { id, uci, category, value: category === 'safe' ? 1 : -1, status: proof.status, proof, certificateSha256: proof.certificateSha256 ?? null };
      }
      assert.equal(p.moves.find(x => x.uci === uci).outcome, line.category, `${id}|${uci} outcome`);
      certs.push(line);
    }
  }
  certs.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.uci < b.uci ? -1 : a.uci > b.uci ? 1 : 0));
  const sources = Object.fromEntries(VERIFIER_FILES.map(f => [f, sha(readFileSync(join(ROOT, f)))]));
  writeJsonl(join(dir, 'certificates.jsonl'), [{ kind: 'verifier', task: TASK, maxReplies: 256, sources }, ...certs]);
  const certByKey = new Map(certs.map(c => [`${c.id}|${c.uci}`, c]));
  const certValue = (id, uci) => certByKey.get(`${id}|${uci}`).value;

  // Ledgers (spec 6) and permutations (spec 3.7).
  const ledgers = {};
  const perms = {};
  for (const seed of SEEDS) {
    const slots = [];
    for (const { id, moves } of schedules[seed]) {
      for (const uci of moves) {
        const c = certByKey.get(`${id}|${uci}`);
        slots.push({ slot: slots.length, id, uci, category: c.category, value: c.value, certificateSha256: c.certificateSha256 });
      }
    }
    ledgers[seed] = slots;
    writeJsonl(join(dir, `ledger-${seed}.jsonl`), slots);
    const known = slots.filter(s => s.value !== null);
    const K = known.length;
    const idx = Array.from({ length: K }, (_, i) => i);
    const rng = mulberry32((seed ^ 0x5eed) >>> 0);
    for (let i = 0; i < K; i++) { const j = i + Math.floor(rng() * (K - i)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    perms[seed] = { indices: idx, values: idx.map(t => known[t].value) };
    writeJson(join(dir, `permutation-${seed}.json`), perms[seed]);
  }

  // Cache: row 0 blank, then keys in certificate order; seeded Float32 values, little-endian.
  const rows = ['blank', ...certs.map(c => `${c.id}|${c.uci}`)];
  const f32 = new Float32Array(rows.length * COLUMNS);
  const rng = mulberry32(20261104);
  for (let i = 0; i < f32.length; i++) f32[i] = Math.fround(rng());
  const bytes = Buffer.alloc(f32.length * 4);
  for (let i = 0; i < f32.length; i++) bytes.writeFloatLE(f32[i], i * 4);
  writeFileSync(join(dir, 'kc-cache.f32'), bytes);
  const cacheSha256 = sha(bytes);
  writeJson(join(dir, 'keys.json'), { rows });
  writeJson(join(dir, 'cache-schema.json'), { rows: rows.length, columns: COLUMNS, dtype: 'float32', byteOrder: 'little', kcIndices: Array.from({ length: COLUMNS }, (_, i) => i), kcRootIds: [], fileSha256: cacheSha256, pins: {} });

  // Features (formats doc): graph, graph-sparse, graph-centred; scalers fitted on the first sorted legal move of each practice position.
  const rowIndex = new Map(rows.map((k, i) => [k, i]));
  const rowAt = i => Float64Array.from(f32.subarray(i * COLUMNS, (i + 1) * COLUMNS));
  const blank = rowAt(0);
  const sparseOf = row => {
    const r = Float64Array.from(row, (x, i) => Math.max(0, x - blank[i]));
    const order = [...r.keys()].filter(i => r[i] > 0).sort((a, b) => (r[b] - r[a]) || (a - b));
    const kept = new Set(order.slice(0, SPARSE_KEEP));
    return Float64Array.from(r, (x, i) => (kept.has(i) ? x : 0));
  };
  const TRANSFORM = { graph: row => row, 'graph-centred': row => Float64Array.from(row, (x, i) => x - blank[i]), 'graph-sparse': sparseOf };
  const scalers = {};
  const scalersJson = {};
  const dead = {};
  for (const f of ['graph', 'graph-sparse', 'graph-centred']) {
    const fit = PRACTICE_IDS.map(id => TRANSFORM[f](rowAt(rowIndex.get(`${id}|${ucisOf(id)[0]}`))));
    scalers[f] = rmsScaler(fit);
    dead[f] = [...Array(COLUMNS).keys()].filter(i => fit.every(v => v[i] === 0));
    const zeroRmsFeatures = dead[f].length;
    scalersJson[f] = { rmsSha256: scalers[f].rmsSha256, zeroRmsFeatures };
  }
  scalersJson.raw = { rmsSha256: sha('raw-not-rechecked'), zeroRmsFeatures: 0 };
  scalersJson.random = { rmsSha256: sha('random-not-rechecked'), zeroRmsFeatures: 0 };
  scalersJson.randomWiringSha256 = sha('random-wiring-not-rechecked');
  writeJson(join(dir, 'scalers.json'), scalersJson);
  // Zero-RMS mask, as the runner: coordinates that are 0 in every fit vector score 0.
  const vec = (f, key) => { const v = scalers[f](TRANSFORM[f](rowAt(rowIndex.get(key)))); for (const i of dead[f]) v[i] = 0; return v; };

  // Records: every arm for every seed; test lines and arm-done lines. Unknown slots are counted in every arm, as the runner does.
  // raw and random rows are placeholders: this fixture has no retina, so the auditor does not recheck them.
  const ARMS = [['graph', 'graph', false], ['graph-sparse', 'graph-sparse', false], ['graph-mismatched', 'graph', true], ['graph-sparse-mismatched', 'graph-sparse', true], ['graph-centred', 'graph-centred', false], ['none', null, false]];
  const records = [];
  const armDone = [];
  const scoreLine = (seed, arm, id, scores, moves) => {
    const top = Math.max(...scores);
    const tied = moves.map((_, i) => i).filter(i => scores[i] === top);
    const c = tied.length;
    const s = tied.filter(i => certValue(id, moves[i]) === 1).length;
    return { kind: 'test', seed, arm, id, c, s, expected: s / c };
  };
  for (const seed of SEEDS) {
    for (const [arm, feature, mismatched] of ARMS) {
      const mem = new NearestEpisodeMemory({ capacity: 2048, k: 3 });
      const counts = { writes: 0, unknown: 0, replacements: 0, evictions: 0 };
      let known = 0;
      for (const slot of ledgers[seed]) {
        if (slot.value === null) { counts.unknown++; continue; }
        const value = mismatched ? perms[seed].values[known] : slot.value;
        known++;
        if (feature === null) continue;
        const v = vec(feature, `${slot.id}|${slot.uci}`);
        const hash = sha(JSON.stringify({ arm, slot: slot.slot, id: slot.id, uci: slot.uci, value }));
        if (mem.entries.some(e => e.vector.every((x, i) => x === v[i]))) counts.replacements++;
        else if (mem.size === 2048) counts.evictions++;
        mem.write(v, value, hash);
        counts.writes++;
      }
      let expectedTotal = 0;
      let ties = 0;
      for (const id of TEST_IDS) {
        const moves = ucisOf(id);
        const vecs = moves.map(u => (feature === null ? Float64Array.of(0) : vec(feature, `${id}|${u}`)));
        const scores = frozenScores(moves.map((_, i) => i), i => mem.score(vecs[i]), () => mem.fingerprint());
        const line = scoreLine(seed, arm, id, scores, moves);
        expectedTotal += line.expected;
        if (line.c > 1) ties++;
        records.push(line);
      }
      armDone.push({ kind: 'arm-done', seed, arm, ...counts, stored: mem.size, expectedTotal, ties, fingerprint: mem.fingerprint() });
    }
    for (const arm of ['raw', 'random']) {
      const rngArm = mulberry32((seed ^ (arm === 'raw' ? 0x1111 : 0x2222)) >>> 0);
      let expectedTotal = 0;
      let ties = 0;
      for (const id of TEST_IDS) {
        const moves = ucisOf(id);
        const line = scoreLine(seed, arm, id, moves.map(() => rngArm()), moves);
        expectedTotal += line.expected;
        if (line.c > 1) ties++;
        records.push(line);
      }
      armDone.push({ kind: 'arm-done', seed, arm, writes: 0, unknown: 0, stored: 0, replacements: 0, evictions: 0, expectedTotal, ties, fingerprint: 'not-rechecked' });
    }
  }
  writeJsonl(join(dir, 'records.jsonl'), [...records, ...armDone]);

  // Gate and summary, computed with the pinned numericPairGate. verdict has judgeV4's shape: perCandidate.perSeed holds every gate field.
  const testGames = TEST_IDS.map(id => byId.get(id).gameId);
  const armValues = (seed, arm) => TEST_IDS.map(id => records.find(r => r.kind === 'test' && r.seed === seed && r.arm === arm && r.id === id).expected);
  const winners = [];
  const perCandidate = {};
  for (const [name, comparators] of [['graph', ['raw', 'random', 'none', 'graph-mismatched']], ['graph-sparse', ['raw', 'random', 'none', 'graph-sparse-mismatched']]]) {
    const perSeed = SEEDS.map(seed => {
      const arms = {};
      for (const a of [name, ...comparators]) arms[a] = armValues(seed, a);
      return { seed, ...numericPairGate({ arms, games: testGames, primary: name, comparators, minCorrect: OPTS.minCorrect, minMargin: OPTS.minMargin, resamples: OPTS.resamples, seed: 20261103, lowerQuantile: 0.025 }) };
    });
    perCandidate[name] = { pass: perSeed.every(s => s.pass), perSeed };
    if (perCandidate[name].pass) winners.push(name);
  }
  const positives = Object.fromEntries(SEEDS.map(seed => [seed, ledgers[seed].filter(s => s.value === 1).length]));
  const outcome = SEEDS.some(seed => positives[seed] < OPTS.minPositives) ? 'insufficient experience' : winners.length ? 'passes' : 'does not pass';
  writeJson(join(dir, 'summary.json'), { schema: 'engineered-memory-test-v4', outcome, verdict: { winners, perCandidate }, rows: armDone, positives, density: { 'graph-sparse': 0 }, sparseZeroRmsTestCoords: 0, passes: 0, peakRssMiB: 0, elapsedSeconds: 0, cpuSeconds: 0, scope: 'synthetic test fixture, not a result' });
  writeJson(join(dir, 'split.json'), { practice: PRACTICE_IDS, test: TEST_IDS, testGames, chance: armValues(SEEDS[0], 'none').reduce((a, b) => a + b, 0) / TEST_IDS.length });
  writeJson(join(dir, 'collisions.json'), { stop: [], unknownMixed: [] });
  writeJson(join(dir, 'manifest.json'), { schema: 'engineered-memory-test-v4-run', status: 'complete', pid: 0, argv: [], startedAt: '2026-11-04T00:00:00Z', endedAt: '2026-11-04T00:00:01Z', exitStatus: 0, volume: 2, chapter: 'To Learn', registrationSha256: 'synthetic-fixture', pins: {}, limits: {}, scheduleSha256, cacheSha256 });
  return { outcome, winners, positives };
}

let work;
let fixtureDir;
let fixturePositions;
let fixturePositionsPath;

// The audit requires the split to cover exactly the positions it is given, so the fixture's positions file holds only its five positions.
before(() => {
  work = mkdtempSync(join(tmpdir(), 'audit-v4-'));
  const wanted = new Set([...PRACTICE_IDS, ...TEST_IDS]);
  fixturePositions = readFileSync(POSITIONS, 'utf8').split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line))
    .filter(p => wanted.has(`${p.gameId}:${p.ply}`));
  assert.equal(fixturePositions.length, wanted.size);
  fixturePositionsPath = join(work, 'fixture-positions.jsonl');
  writeFileSync(fixturePositionsPath, fixturePositions.map(p => JSON.stringify(p)).join('\n') + '\n');
  fixtureDir = join(work, 'clean');
  writeFixture(fixtureDir, fixturePositions);
});

after(() => rmSync(work, { recursive: true, force: true }));

const cloneRun = name => {
  const dst = join(work, name);
  cpSync(fixtureDir, dst, { recursive: true });
  return dst;
};

test('clean synthetic folder passes all eight checks', () => {
  const report = auditRun(fixtureDir, fixturePositions, OPTS);
  assert.deepEqual(report.checks.map(c => c.name), CHECKS);
  assert.deepEqual(report.checks.filter(c => !c.pass), [], JSON.stringify(report.checks.filter(c => !c.pass)));
  assert.equal(report.pass, true);
  assert.equal(report.pinned, false);
  assert.ok(['passes', 'does not pass'].includes(report.outcome));
  for (const name of ['cache', 'scores', 'gate']) assert.ok(!check(report, name).detail.startsWith('skipped'), name);
  assert.match(check(report, 'scores').detail, /raw and random not rechecked/);
});

test('a missing cache row (truncated file) fails cache; checks that do not read the cache still pass', () => {
  const dir = cloneRun('truncated');
  const path = join(dir, 'kc-cache.f32');
  const bytes = readFileSync(path);
  writeFileSync(path, bytes.subarray(0, bytes.length - COLUMNS * 4));
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.equal(report.pass, false);
  assert.equal(check(report, 'cache').pass, false);
  for (const name of ['replay', 'schedules', 'certificates', 'ledger', 'permutation']) assert.equal(check(report, name).pass, true, name);
});

test('a duplicated key fails cache', () => {
  const dir = cloneRun('duplicate-key');
  const path = join(dir, 'keys.json');
  const keys = readJson(path);
  keys.rows[2] = keys.rows[1];
  writeJson(path, keys);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.equal(check(report, 'cache').pass, false);
  assert.match(check(report, 'cache').detail, /duplicate key/);
});

test('reordered cache rows fail cache (bytes no longer match the pinned SHA-256)', () => {
  const dir = cloneRun('reordered');
  const path = join(dir, 'kc-cache.f32');
  const bytes = readFileSync(path);
  const row = COLUMNS * 4;
  const first = Buffer.from(bytes.subarray(row, 2 * row));
  const second = Buffer.from(bytes.subarray(2 * row, 3 * row));
  second.copy(bytes, row);
  first.copy(bytes, 2 * row);
  writeFileSync(path, bytes);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.equal(check(report, 'cache').pass, false);
  assert.match(check(report, 'cache').detail, /SHA-256/);
});

test('an altered certificate proof fails certificates only', () => {
  const dir = cloneRun('altered-certificate');
  const path = join(dir, 'certificates.jsonl');
  const lines = readJsonl(path);
  const line = lines.find(l => l.proof?.certificate?.replies?.length > 0);
  assert.ok(line, 'fixture has a capture proof with replies');
  line.proof.certificate.replies.pop();
  writeJsonl(path, lines);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.equal(report.pass, false);
  assert.deepEqual(failing(report), ['certificates']);
});

test('a changed verifier source hash fails certificates only', () => {
  const dir = cloneRun('source-hash');
  const path = join(dir, 'certificates.jsonl');
  const lines = readJsonl(path);
  lines[0].sources[CERT_SOURCE] = 'f'.repeat(64);
  writeJsonl(path, lines);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.deepEqual(failing(report), ['certificates']);
  assert.match(check(report, 'certificates').detail, /verifier source \.codebase\/src\/search-and-feedback\/capture-retention-certificate\.mjs differs/);
});

test('a certificate header that omits a required verifier source fails certificates only', () => {
  const dir = cloneRun('source-missing');
  const path = join(dir, 'certificates.jsonl');
  const lines = readJsonl(path);
  delete lines[0].sources[CERT_SOURCE];
  writeJsonl(path, lines);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.deepEqual(failing(report), ['certificates']);
  assert.match(check(report, 'certificates').detail, /verifier sources lack \.codebase\/src\/search-and-feedback\/capture-retention-certificate\.mjs/);
});

test('a changed permutation index fails permutation only', () => {
  const dir = cloneRun('permutation');
  const path = join(dir, 'permutation-6101.json');
  const file = readJson(path);
  [file.indices[0], file.indices[1]] = [file.indices[1], file.indices[0]];
  writeJson(path, file);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.deepEqual(failing(report), ['permutation']);
});

test('a changed test expected score fails scores', () => {
  const dir = cloneRun('expected-score');
  const path = join(dir, 'records.jsonl');
  const lines = readJsonl(path);
  const target = lines.find(l => l.kind === 'test' && l.seed === 6101 && l.arm === 'graph' && l.id === TEST_IDS[0]);
  target.expected = target.expected === 0 ? 0.5 : 0;
  writeJsonl(path, lines);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.equal(check(report, 'scores').pass, false);
  assert.match(check(report, 'scores').detail, /6101\|graph\|19J3n6eX:21/);
});

test('the none arm counts every unknown ledger slot: the equal count passes scores, a zero count fails it', () => {
  const unknownBySeed = Object.fromEntries(SEEDS.map(seed => [seed, readJsonl(join(fixtureDir, `ledger-${seed}.jsonl`)).filter(s => s.value === null).length]));
  assert.ok(unknownBySeed[6102] > 0, 'fixture has an unknown ledger slot for seed 6102');
  const noneDone = (lines, seed) => lines.find(l => l.kind === 'arm-done' && l.seed === seed && l.arm === 'none');
  assert.equal(noneDone(readJsonl(join(fixtureDir, 'records.jsonl')), 6102).unknown, unknownBySeed[6102]);
  assert.equal(check(auditRun(fixtureDir, fixturePositions, OPTS), 'scores').pass, true);

  const dir = cloneRun('none-unknown');
  const path = join(dir, 'records.jsonl');
  const lines = readJsonl(path);
  noneDone(lines, 6102).unknown = 0;
  writeJsonl(path, lines);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.equal(check(report, 'scores').pass, false);
  assert.ok(check(report, 'scores').detail.includes(`6102|none: arm-done unknown 0, recomputed ${unknownBySeed[6102]}`), check(report, 'scores').detail);
});

test('a changed gate lower fails gate only', () => {
  const dir = cloneRun('gate-lower');
  const path = join(dir, 'summary.json');
  const summary = readJson(path);
  summary.verdict.perCandidate.graph.perSeed[0].comparators.none.lower += 1;
  writeJson(path, summary);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'gate').detail, /graph seed 6101 none lower/);
});

test('an altered schedule fails schedules only', () => {
  const dir = cloneRun('schedules');
  const path = join(dir, 'schedules.json');
  const schedules = readJson(path);
  const entry = schedules[6103][0];
  [entry.moves[0], entry.moves[1]] = [entry.moves[1], entry.moves[0]];
  writeJson(path, schedules);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.deepEqual(failing(report), ['schedules']);
});

test('an altered ledger line fails ledger only', () => {
  const dir = cloneRun('ledger');
  const path = join(dir, 'ledger-6102.jsonl');
  const lines = readJsonl(path);
  const slot = lines.find(l => l.certificateSha256 !== null);
  slot.certificateSha256 = 'f'.repeat(64);
  writeJsonl(path, lines);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.deepEqual(failing(report), ['ledger']);
});

test('insufficient experience that the ledger does not support fails gate only', () => {
  const report = auditRun(fixtureDir, fixturePositions, { ...OPTS, minPositives: 1000 });
  assert.deepEqual(failing(report), ['gate']);
  assert.match(check(report, 'cache').detail, /^skipped \(insufficient experience\)/);
  assert.match(check(report, 'scores').detail, /^skipped \(insufficient experience\)/);
});

test('stop outcomes skip checks 6-8 when the recorded reason holds', () => {
  const insufficient = cloneRun('stop-insufficient');
  const summaryA = readJson(join(insufficient, 'summary.json'));
  summaryA.outcome = 'insufficient experience';
  writeJson(join(insufficient, 'summary.json'), summaryA);
  const reportA = auditRun(insufficient, fixturePositions, { ...OPTS, minPositives: 1000 });
  assert.equal(reportA.pass, true, JSON.stringify(reportA.checks.filter(c => !c.pass)));
  assert.equal(reportA.outcome, 'insufficient experience');

  const collided = cloneRun('stop-collision');
  writeJson(join(collided, 'collisions.json'), { stop: [{ synthetic: true }], unknownMixed: [] });
  const summaryB = readJson(join(collided, 'summary.json'));
  summaryB.outcome = 'input-validity failure';
  writeJson(join(collided, 'summary.json'), summaryB);
  const reportB = auditRun(collided, fixturePositions, OPTS);
  assert.equal(reportB.pass, true, JSON.stringify(reportB.checks.filter(c => !c.pass)));
  assert.equal(reportB.outcome, 'input-validity failure');
  assert.match(check(reportB, 'scores').detail, /^skipped \(input-validity failure\)/);
});

test('an empty folder fails every check without throwing', () => {
  const dir = join(work, 'empty');
  mkdirSync(dir);
  const report = auditRun(dir, fixturePositions, OPTS);
  assert.equal(report.pass, false);
  assert.deepEqual(failing(report), CHECKS);
});

test('CLI writes audit.json and exits 1 on a failed audit', () => {
  const dir = cloneRun('cli');
  const path = join(dir, 'permutation-6101.json');
  const file = readJson(path);
  [file.indices[0], file.indices[1]] = [file.indices[1], file.indices[0]];
  writeJson(path, file);
  const result = spawnSync(process.execPath, [AUDITOR, '--run', dir, '--positions', fixturePositionsPath], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /AUDIT FAIL/);
  const report = readJson(join(dir, 'audit.json'));
  assert.equal(report.pass, false);
  assert.deepEqual(report.checks.map(c => c.name), CHECKS);
});

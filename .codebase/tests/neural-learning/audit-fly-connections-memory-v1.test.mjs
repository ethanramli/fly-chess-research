import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { validateGraph } from '../../src/runtime/graph.mjs';
import { mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';
import { createFlyCondition } from '../../src/neural-learning/fly-connections-condition-v1.mjs';
import { BOARD_SCHEMA, GROUPS, PACKET_SCHEMA, buildBoardRecord, buildExperienceTape } from '../../src/neural-learning/fly-connections-packet-v1.mjs';
import { positionsFromGame } from '../../src/puzzle-learning/capture-choice-positions-v1.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import {
  ARM_TABLE, GATE, PROBE_GROUPS, auditStaticChecks, metricsOf, mulberry32 as auditMulberry32, ownBaselineGate, pairGate,
  pinCheck, pressureGate, replayPlan, retentionGate, sameValue, sha256Text, staticImportCheck, summaryOf,
} from '../../src/neural-learning/fly-connections-audit-v1.mjs';
import { parseCliArgs } from '../../scripts/neural-learning/audit-fly-connections-memory-v1.mjs';

// Pins and the graph replay are not exercised here (they need the pinned graph and registered files). Check 1 is covered by a pure
// function test with fake hashes; check 10 is covered by the pure replay-plan test and the CLI parsing test (no graph is loaded).
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SCORING_SOURCES = [
  '.codebase/src/neural-learning/fly-connections-condition-v1.mjs',
  '.codebase/src/neural-learning/fly-connections-apl-v1.mjs',
  '.codebase/src/neural-learning/fly-connections-teaching-v1.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
];
const SOURCE_TEXTS = Object.fromEntries(SCORING_SOURCES.map(p => [p, readFileSync(join(ROOT, p), 'utf8')]));

// Tiny network pattern from fly-connections-condition-v1.test.mjs: 11 neurons, synthetic eyes. A toy fixture, not a chess result.
const N = 11, STEPS = 4, KC = [0, 1, 2], APL = [7, 8], DAN = [5, 6], OUT = 10;
const KC_BIAS = 1, DAN_BIAS = 0.5;
const NODES = [
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'right' },
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'left' },
  { type: "KCa'b'-ap1", cls: 'Kenyon_Cell', side: 'right' },
  { type: 'MBON05', cls: 'MBON', side: 'left' },
  { type: 'MBON05', cls: 'MBON', side: 'right' },
  { type: 'PAM07', cls: 'DAN', side: 'right' },
  { type: 'PAM07', cls: 'DAN', side: 'left' },
];
const BASE = 720575940621164720n;
const rootOf = i => BASE + BigInt(i + 1);
const EYES = {
  identity: 'synthetic-audit-test-eyes-v1',
  encode(fen, action) {
    const digest = createHash('sha256').update(`${fen} ${action}`).digest();
    return { schema: 'synthetic-test-eyes-v1', identity: EYES.identity, action,
      stimulation: KC.map(k => ({ index: k, current: 0.2 + digest[k] / 512 })) };
  },
};
function graphFixture() {
  const edges = [];
  const add = (pre, post, sign) => edges.push({ pre, post, sign, initial: 1 + ((pre * 7 + post * 3) % 4) });
  for (const k of KC) for (const a of APL) { add(k, a, 1); add(a, k, -1); }
  for (const a of APL) add(a, OUT, -1);
  add(0, 3, 1); add(1, 4, 1);
  edges.sort((a, b) => a.post - b.post || a.pre - b.pre);
  const row = new Int32Array(N + 1);
  for (const e of edges) row[e.post + 1]++;
  for (let j = 0; j < N; j++) row[j + 1] += row[j];
  return validateGraph({ row, col: Int32Array.from(edges, e => e.pre), sign: Int8Array.from(edges, e => e.sign),
    initial: Float32Array.from(edges, e => e.initial), input: Int32Array.from([9]), output: Int32Array.from([OUT]) });
}
function aplPackage(g) {
  const edgeOf = (pre, post) => {
    for (let k = g.row[post]; k < g.row[post + 1]; k++) if (g.col[k] === pre) return k;
    throw Error(`missing edge ${pre}->${post}`);
  };
  const apl = (index, rootId, offset) => ({
    rootId, index, parent: [-1, 0, 0], lengthNm: [0, 1000, 2000],
    inputSite: KC.map(k => (k + offset) % 3), inputKC: [...KC], inputEdge: KC.map(k => edgeOf(k, index)),
    outputSite: KC.map(k => (k + 2 * offset) % 3), outputKC: [...KC], outputEdge: KC.map(k => edgeOf(index, k)),
  });
  return { schema: 'fly-apl-sites-v1', identity: 'ab'.repeat(32), kcIndices: [...KC],
    apls: [apl(APL[0], 'apl-right-fixture', 0), apl(APL[1], 'apl-left-fixture', 1)] };
}
const ROOTS = BigInt64Array.from({ length: N }, (_, i) => rootOf(i));
const READERS = [
  { type: 'MBON05', index: 3, rootId: String(rootOf(3)), receivingSide: 'right' },
  { type: 'MBON05', index: 4, rootId: String(rootOf(4)), receivingSide: 'left' },
];
const MAPPING = await (async () => {
  const folder = mkdtempSync(join(tmpdir(), 'fly-audit-map-'));
  try {
    const annotationPath = join(folder, 'annotation.tsv');
    writeFileSync(annotationPath, ['root_id\themibrain_type\tcell_class\tside', ...NODES.map((node, i) => `${rootOf(i)}\t${node.type}\t${node.cls}\t${node.side}`)].join('\n') + '\n');
    return await mapFlyConnectionsMemory(graphFixture(), ROOTS, annotationPath, READERS);
  } finally { rmSync(folder, { recursive: true, force: true }); }
})();
function world(arm) {
  const graph = graphFixture();
  const model = new SparseTrainer(graph, { steps: STEPS, inputDim: 1, outputs: 1, seed: 11, precision: 'float32' });
  const bias = new Float32Array(N);
  for (const k of KC) bias[k] = KC_BIAS;
  for (const d of DAN) bias[d] = DAN_BIAS;
  model.params.bias.set(bias);
  return { model, condition: createFlyCondition({ model, mapping: MAPPING, eyes: EYES, aplPackage: aplPackage(graph), arm }) };
}

// Packet boards: real random-play games through the existing scanner, built with the synthetic eyes above.
function randomPgn(id, seed, maxPlies = 140) {
  const rng = mulberry32(seed);
  const game = new Chess();
  while (!game.isGameOver() && game.history().length < maxPlies) {
    const moves = game.moves();
    game.move(moves[Math.floor(rng() * moves.length)]);
  }
  return `[Event "fixture ${id}"]\n[GameId "${id}"]\n\n${game.pgn()}\n`;
}
const WANT = { A: 2, B: 2, R: 1, testA: 1, testB: 1 };
const boards = Object.fromEntries(GROUPS.map(g => [g, []]));
const boardById = new Map();
const nextGroup = () => GROUPS.find(g => boards[g].length < WANT[g]);
for (let seed = 1; seed < 400 && nextGroup(); seed++) {
  const pgn = randomPgn(`fx${seed}`, seed);
  for (const row of positionsFromGame(pgn, { minPly: 6, maxPerGame: 1, minGap: 1 })) {
    const group = nextGroup();
    if (!group) break;
    const record = buildBoardRecord({ gameId: row.gameId, ply: row.ply, fen: row.fen, history: row.history }, { group, pgn, eyes: EYES });
    if (record.schema === BOARD_SCHEMA) { boards[group].push(record); boardById.set(record.boardId, record); }
  }
}
if (nextGroup()) throw Error(`fixture boards incomplete at ${nextGroup()}`);

const SEED = 7301;
const tape = buildExperienceTape(boards, SEED);
const REG = {
  seeds: [SEED], arms: Object.keys(ARM_TABLE),
  gates: { minAcquired: 1, retention: 0.7, epsilon: 1e-6, success: 0.75, bootstrapSeed: 20261109, pressure: 0.01, pressureShare: 0.25 },
  limits: { rssMiB: 2048, freeMiB: 256 },
  model: { steps: STEPS, inputDim: 1, outputs: 1, seed: 11, precision: 'float32', saturation: 1.5, recurrentScale: 0.9, normalization: 'row' },
  pins: {},
};
const byId = (a, b) => (a.boardId < b.boardId ? -1 : a.boardId > b.boardId ? 1 : 0);
const sortedBoards = g => [...boards[g]].sort(byId);

// Writes the packet files (packet.json, boards.jsonl, tapes/<seed>.json) in the layout the prepare script uses.
function writePacket(dir) {
  mkdirSync(join(dir, 'tapes'), { recursive: true });
  const boardsText = GROUPS.flatMap(g => boards[g].map(r => JSON.stringify(r))).join('\n') + '\n';
  const tapeText = JSON.stringify(tape);
  writeFileSync(join(dir, 'boards.jsonl'), boardsText);
  writeFileSync(join(dir, 'tapes', `${SEED}.json`), tapeText);
  const packet = { schema: PACKET_SCHEMA, purpose: 'development',
    groups: Object.fromEntries(GROUPS.map(g => [g, { count: boards[g].length, gameIds: boards[g].map(r => r.gameId), boardIds: boards[g].map(r => r.boardId) }])),
    boards: { path: 'boards.jsonl', sha256: sha256Text(boardsText) },
    tapes: { [SEED]: { path: `tapes/${SEED}.json`, fileSha256: sha256Text(tapeText), sha256: tape.sha256 } } };
  writeFileSync(join(dir, 'packet.json'), JSON.stringify(packet, null, 2));
}

// Job loop of one arm, written in the file formats: T0 probe, events in tape order, probes after their cursor, off-arm reuse.
function writeJob(dir, arm) {
  const { condition } = world(arm);
  const jobDir = join(dir, 'jobs', `${SEED}-${arm}`);
  mkdirSync(join(jobDir, 'snapshots'), { recursive: true });
  const lines = [], fingerprints = {};
  let passes = 0, t0 = null;
  const probe = (label, cursor) => {
    const fp = condition.fingerprint();
    if (t0 === null) t0 = fp;
    fingerprints[label] = fp;
    const reuse = false; // code review r1: every arm ranks at every checkpoint
    for (const g of GROUPS) {
      if (!PROBE_GROUPS[label].includes(g)) continue;
      for (const rec of sortedBoards(g)) {
        const phase = g === 'R' ? 'R1' : 'chess';
        if (reuse) lines.push({ type: 'ranking-reused', label, cursor, boardId: rec.boardId, group: g, from: 'T0', fingerprint: fp });
        else {
          const ranking = condition.rankBoard(rec, { phase });
          passes += ranking.passes;
          lines.push({ type: 'ranking', label, cursor, boardId: rec.boardId, group: g, phase, fingerprint: fp, ranking: JSON.parse(JSON.stringify(ranking)) });
        }
      }
    }
    writeFileSync(join(jobDir, 'snapshots', `${label}.json`), JSON.stringify(condition.snapshot()));
  };
  probe(tape.initialProbe.phase, 0);
  tape.events.forEach((ev, i) => {
    const experience = { sequence: ev.sequence, eventId: ev.eventId, phase: ev.phase, group: ev.group, boardId: ev.boardId,
      move: ev.move, pulse: ev.pulse, criterion: ev.criterion, proofSha: ev.proofSha };
    const opts = arm === 'shuffled-local' ? { deliveredPulse: tape.shuffledPulses[i] } : {};
    const { receipt } = condition.teach(boardById.get(ev.boardId), experience, opts);
    passes += receipt.passes;
    lines.push({ type: 'event', cursor: receipt.sequence, receipt: JSON.parse(JSON.stringify(receipt)) });
    for (const p of tape.probeAfter) if (p.cursor === i + 1) probe(p.phase, p.cursor);
  });
  const result = { schema: 'fly-connections-job-result-v1', seed: SEED, arm, tapeSha256: tape.sha256, status: 'complete', passes,
    events: tape.events.length, wallSeconds: 1, cpuSeconds: 1, secondsPerPass: 1 / passes, peakRssMiB: 512, minFreeMiB: 1024,
    fingerprints, describe: JSON.parse(JSON.stringify(condition.describe())) };
  writeFileSync(join(jobDir, 'records.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  writeFileSync(join(jobDir, 'result.json'), JSON.stringify(result, null, 2));
}

const RUN = mkdtempSync(join(tmpdir(), 'fly-audit-run-'));
after(() => rmSync(RUN, { recursive: true, force: true }));
writePacket(RUN);
for (const arm of REG.arms) writeJob(RUN, arm);
writeFileSync(join(RUN, 'manifest.json'), JSON.stringify({ status: 'complete', registrationSha256: 'test-fixture' }));

// Audit a run folder. With no summary given, the judge-shaped summary is generated from the auditor's own gates and then checked.
async function auditRun(dir, summary) {
  const audit = s => auditStaticChecks({ runDir: dir, packetDir: dir, registration: REG, sourceTexts: SOURCE_TEXTS, summary: s });
  if (summary !== undefined) {
    writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary));
    return audit(summary);
  }
  const first = await audit(null);
  const generated = summaryOf(first.gates);
  writeFileSync(join(dir, 'summary.json'), JSON.stringify(generated));
  return audit(generated);
}
const failing = checks => checks.filter(c => !c.pass).map(c => c.name);
const copyRun = () => { const dir = mkdtempSync(join(tmpdir(), 'fly-audit-copy-')); cpSync(RUN, dir, { recursive: true }); return dir; };
function editLines(dir, arm, edit) {
  const path = join(dir, 'jobs', `${SEED}-${arm}`, 'records.jsonl');
  const lines = readFileSync(path, 'utf8').split('\n').filter(l => l.trim() !== '').map(l => JSON.parse(l));
  const out = edit(lines) ?? lines;
  writeFileSync(path, out.map(l => JSON.stringify(l)).join('\n') + '\n');
}
function editResult(dir, arm, edit) {
  const path = join(dir, 'jobs', `${SEED}-${arm}`, 'result.json');
  const result = JSON.parse(readFileSync(path, 'utf8'));
  edit(result);
  writeFileSync(path, JSON.stringify(result, null, 2));
}

test('clean run: checks 2 to 9 pass, with one check per name and the verdict agreeing with the regenerated summary', async () => {
  const { checks, match } = await auditRun(RUN);
  assert.deepEqual(checks.map(c => c.name), ['packet', 'jobs', 'events', 'updates', 'fingerprints', 'rankings', 'gates', 'resources']);
  assert.deepEqual(failing(checks), [], checks.filter(c => !c.pass).map(c => `${c.name}: ${c.detail}`).join(' | '));
  assert.equal(match, true);
});

test('every section 4 gate computes from the fixture without an exception and reports its numbers', async () => {
  const { gates } = await auditStaticChecks({ runDir: RUN, packetDir: RUN, registration: REG, sourceTexts: SOURCE_TEXTS, summary: null });
  const seed = gates.perSeed[0];
  const all = [...seed.P1.checks, ...seed.P2.checks, ...seed.P3.checks];
  assert.deepEqual(all.filter(c => c.detail.startsWith('error')).map(c => `${c.name}: ${c.detail}`), []);
  const detail = name => all.find(c => c.name === name).detail;
  assert.match(detail('P1.3'), /mean D on pulse/);
  assert.match(detail('P2.1'), /A acquired/);
  assert.match(detail('P2.2'), /lower/);
  assert.match(detail('P2.2b'), /lower/);
  assert.match(detail('P2.3'), /B pressure|no A-written edges/);
  assert.match(detail('P2.4'), /R boards/);
  assert.match(detail('P3.1'), /lower/);
  assert.match(detail('P3.2'), /lower/);
});

test('a changed receipt afterGain fails the updates check (5) and no other check', async () => {
  const dir = copyRun();
  try {
    editLines(dir, 'informative-local', lines => {
      const ev = lines.find(l => l.type === 'event' && l.receipt.writes.length > 0);
      ev.receipt.writes[0].afterGain = ev.receipt.writes[0].afterGain * 0.5 + 0.01;
    });
    const { checks } = await auditRun(dir);
    assert.deepEqual(failing(checks), ['updates']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a missing event line fails the events check (4) and no other check', async () => {
  const dir = copyRun();
  try {
    // Off arm: no state changes, so the fingerprint chain cannot expose the gap; only the event sequence and pass count can.
    editLines(dir, 'off-local', lines => lines.filter(l => !(l.type === 'event' && l.cursor === 3)));
    const { checks } = await auditRun(dir);
    assert.deepEqual(failing(checks), ['events']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a missing event line in a learning arm also breaks the fingerprint chain (6), as it should', async () => {
  const dir = copyRun();
  try {
    editLines(dir, 'informative-local', lines => lines.filter(l => !(l.type === 'event' && l.cursor === 3)));
    const { checks } = await auditRun(dir);
    assert.ok(failing(checks).includes('events'));
    assert.ok(failing(checks).includes('fingerprints'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a wrong deliveredPulse in the shuffled arm fails the events check (4) and no other check', async () => {
  const dir = copyRun();
  try {
    editLines(dir, 'shuffled-local', lines => { lines.find(l => l.type === 'event').receipt.deliveredPulse = !lines.find(l => l.type === 'event').receipt.deliveredPulse; });
    const { checks } = await auditRun(dir);
    assert.deepEqual(failing(checks), ['events']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a ranking with a dropped legal move fails the rankings check (7) and no other check', async () => {
  const dir = copyRun();
  try {
    editLines(dir, 'off-local', lines => {
      const line = lines.find(l => l.type === 'ranking' && l.group === 'R' && l.label === 'R2-end');
      const low = line.ranking.ranked.reduce((a, b) => (b.score < a.score ? b : a));
      line.ranking.ranked = line.ranking.ranked.filter(e => e !== low);
    });
    const { checks } = await auditRun(dir);
    assert.deepEqual(failing(checks), ['rankings']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a summary verdict flipped against the recomputed gates fails the gates check (8) and no other check', async () => {
  const dir = copyRun();
  try {
    const clean = JSON.parse(readFileSync(join(RUN, 'summary.json'), 'utf8'));
    const flipped = { ...clean, verdict: clean.verdict === 'passes' ? 'does not pass' : 'passes', pass: !clean.pass };
    const { checks, match } = await auditRun(dir, flipped);
    assert.deepEqual(failing(checks), ['gates']);
    assert.equal(match, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('peak RSS of 2049 MiB fails the resources check (9) and no other check', async () => {
  const dir = copyRun();
  try {
    editResult(dir, 'informative-local', result => { result.peakRssMiB = 2049; });
    const { checks } = await auditRun(dir);
    assert.deepEqual(failing(checks), ['resources']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('score arithmetic: tie tolerance, s and c, success and margin match the producer definitions', () => {
  const ranked = [{ move: 'a1a2', score: 1 }, { move: 'b1b2', score: 1 + 5e-8 }, { move: 'c1c2', score: 0 }];
  const m = metricsOf(ranked, { a1a2: true, b1b2: false, c1c2: false });
  // Tolerance is 1e-9 + 1e-7 * 1.00000005, larger than the 5e-8 gap, so the two top moves tie.
  assert.equal(m.c, 2);
  assert.equal(m.s, 1);
  assert.equal(m.success, 0.5);
  assert.deepEqual(m.topMoves, ['a1a2', 'b1b2']);
  assert.equal(m.margin, 1 - (1 + 5e-8));
  const apart = metricsOf([{ move: 'a1a2', score: 1 }, { move: 'b1b2', score: 1 + 2e-7 }], { a1a2: true, b1b2: false });
  assert.equal(apart.c, 1); // gap 2e-7 is above the tolerance of about 1e-7
});

test('retention gate: a learned margin kept at ratio 0.70 passes and at 0.69 fails', () => {
  const b = (id, margin, success = 1) => ({ boardId: id, gameId: `g${id}`, success, margin, tolerance: 0 });
  const build = ratio => retentionGate({
    a0: [b('a', 0, 0)], aAfterA: [b('a', 1)], aAfterB: [b('a', ratio)], aFinal: [b('a', ratio)],
    bBefore: [b('x', 0, 0)], bAfter: [b('x', 1)], bFinal: [b('x', 1)], minAcquired: 1,
  });
  assert.equal(build(0.7).pass, true);
  assert.equal(build(0.69).pass, false);
});

test('pressure gate: 25% of A-written edges and 25% of the mask must move by at least 1%', () => {
  const base = new Map([[1, 1], [2, 1], [3, 1], [4, 1]]);
  const written = new Set([1, 2, 3, 4]);
  const all = new Map([[1, 1.02], [2, 1.02], [3, 1.02], [4, 1.02]]);
  assert.equal(pressureGate({ written, pressureEdges: new Set([1]), base, finalMagnitude: all, maskSize: 16 }).pass, true);
  const three = new Map([[1, 1.02], [2, 1.02], [3, 1.02]]);
  assert.equal(pressureGate({ written, pressureEdges: new Set([1]), base, finalMagnitude: three, maskSize: 16 }).pass, false);
  assert.equal(pressureGate({ written, pressureEdges: new Set(), base, finalMagnitude: all, maskSize: 16 }).pass, false);
});

test('static import check passes the scoring path and flags an engineered or episodic import', () => {
  assert.equal(staticImportCheck(SOURCE_TEXTS).pass, true);
  assert.equal(staticImportCheck({ 'x.mjs': "import { z } from './kc-episodic-memory-v2.mjs';\n" }).pass, false);
});

test('pin check (check 1) compares every pinned hash and the manifest, with fake hashes', async () => {
  const table = new Map([[resolve(ROOT, 'a/x.json'), 'hashA'], [resolve(ROOT, 'a/y.json'), 'hashB']]);
  const registration = { pins: { 'a/x.json': 'hashA', 'a/y.json': 'hashB' } };
  const hashFile = async p => { if (!table.has(p)) throw Error('missing'); return table.get(p); };
  const manifest = { status: 'complete', registrationSha256: 'R' };
  assert.equal((await pinCheck({ registration, manifest, registrationSha256: 'R', root: ROOT, hashFile })).pass, true);
  const drift = await pinCheck({ registration, manifest, registrationSha256: 'R', root: ROOT,
    hashFile: async p => (p.endsWith('x.json') ? 'changed' : table.get(p)) });
  assert.equal(drift.pass, false);
  assert.match(drift.detail, /x\.json/);
  assert.equal((await pinCheck({ registration, manifest: { ...manifest, status: 'running' }, registrationSha256: 'R', root: ROOT, hashFile })).pass, false);
});

test('sameValue is bit-exact on leaves: -0 differs from 0, NaN equals NaN, key order does not matter', () => {
  assert.equal(sameValue(-0, 0), false);
  assert.equal(sameValue(NaN, NaN), true);
  assert.equal(sameValue({ a: 1, b: [2] }, { b: [2], a: 1 }), true);
  assert.equal(sameValue([1], [1, 2]), false);
});

test('CLI module loads without running; argument parsing requires --run and --config and a positive replay count', () => {
  const parsed = parseCliArgs(['--run', 'r', '--config', 'c.json']);
  assert.equal(parsed.replay, 4);
  assert.throws(() => parseCliArgs(['--run', 'r']), /usage/);
  assert.throws(() => parseCliArgs(['--run', 'r', '--config', 'c', '--replay', '0']), /replay/);
});

// Independent references for the bootstrap: Mulberry32 in BigInt, and the resampling written out from the spec.
function refMulberry32(seed) {
  const u32 = x => BigInt.asUintN(32, x);
  let state = u32(BigInt(seed));
  return () => {
    state = u32(state + 0x6d2b79f5n);
    const s = state;
    let t = u32((s ^ (s >> 15n)) * (1n | s));
    t = u32(u32(t + u32((t ^ (t >> 7n)) * (61n | t))) ^ t);
    return Number(t ^ (t >> 14n)) / 4294967296;
  };
}
function refLower({ P, C, games, seed, k }) {
  const clusters = new Map();
  games.forEach((g, i) => { if (!clusters.has(g)) clusters.set(g, []); clusters.get(g).push(i); });
  const groups = [...clusters.values()];
  const rng = refMulberry32(seed ^ k);
  const sums = [];
  for (let r = 0; r < GATE.resamples; r++) {
    let sum = 0;
    for (let d = 0; d < groups.length; d++) for (const i of groups[Math.floor(rng() * groups.length)]) sum += P[i] - C[i];
    sums.push(sum);
  }
  sums.sort((a, b) => a - b);
  return sums[Math.floor(GATE.lowerQuantile * GATE.resamples)];
}

test('mulberry32 matches an independent BigInt reference for several seeds', () => {
  for (const seed of [0, 1, 42, -5, 20261109, 2 ** 31, 0xffffffff]) {
    const mine = auditMulberry32(seed), ref = refMulberry32(seed);
    const diverged = [];
    for (let i = 0; i < 2000; i++) if (mine() !== ref()) diverged.push(i);
    assert.deepEqual(diverged, [], `seed ${seed}`);
  }
});

test('paired bootstrap matches the reference resampling for each comparator index, and is exact on trivial arms', () => {
  const games = ['g1', 'g1', 'g2', 'g3', 'g3', 'g3', 'g4', 'g5'];
  const P = [1, 0, 1, 1, 0, 1, 0, 1], C = [0, 0, 1, 0, 0, 1, 1, 0], D = [0.5, 0.5, 0, 0, 0, 0.5, 0.5, 0];
  const r = pairGate({ p: P, c: C, d: D }, games, 'p', ['c', 'd'], GATE.bootstrapSeed);
  assert.equal(r.lower.c, refLower({ P, C, games, seed: GATE.bootstrapSeed, k: 0 }));
  assert.equal(r.lower.d, refLower({ P, C: D, games, seed: GATE.bootstrapSeed, k: 1 }));
  assert.equal(r.margin.c, 5 - 3); // sum(P) = 5, sum(C) = 3
  const games8 = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'], ones = Array(8).fill(1), zeros = Array(8).fill(0);
  const t = pairGate({ p: ones, c: zeros }, games8, 'p', ['c'], GATE.bootstrapSeed);
  assert.equal(t.lower.c, 8); // one board per game: every resample sums eight 1s
  assert.equal(t.margin.c, 8);
  assert.equal(t.pass, true);
  assert.equal(pairGate({ p: ones, c: ones }, games8, 'p', ['c'], GATE.bootstrapSeed).pass, false);
});

test('P2.2b fails alone: informative beats every control, but A does not improve from its own T0', () => {
  const games = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'], ones = Array(8).fill(1), zeros = Array(8).fill(0);
  const p22 = pairGate({ informative: ones, absent: zeros, off: zeros, shuffled: zeros }, games, 'informative', ['absent', 'off', 'shuffled'], GATE.bootstrapSeed);
  assert.equal(p22.pass, true);
  const failed = ownBaselineGate({ aGames: games, aEnd: ones, aT0: ones, bGames: games, bEnd: ones, bR1: zeros });
  assert.equal(failed.pass, false);
  assert.match(failed.detail, /A at B-end vs A at T0: lower 0\.0000/);
  assert.equal(ownBaselineGate({ aGames: games, aEnd: ones, aT0: zeros, bGames: games, bEnd: ones, bR1: zeros }).pass, true);
});

test('replay plan: phases start at their probes, prefixes extend to both pulse kinds, and an absent kind is reported', () => {
  const pulses = [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0];
  const shuffled = [0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0];
  const phases = ['A', 'A', 'A', 'A', 'A', 'A', 'R1', 'R1', 'R1', 'B', 'B', 'B', 'B', 'B', 'R2', 'R2', 'R2', 'R2'];
  const fake = { initialProbe: { cursor: 0, phase: 'T0' }, events: phases.map((phase, i) => ({ phase, pulse: pulses[i] === 1 })),
    shuffledPulses: shuffled.map(x => x === 1), probeAfter: [{ cursor: 6, phase: 'A-end' }, { cursor: 9, phase: 'R1-end' }, { cursor: 14, phase: 'B-end' }] };
  const summary = arm => replayPlan(fake, arm, 2).map(s => [s.phase, s.start, s.from, s.count, s.uncovered]);
  assert.deepEqual(summary('informative-local'), [['A', 'T0', 0, 4, []], ['R1', 'A-end', 6, 2, ['delivered']], ['B', 'R1-end', 9, 2, []], ['R2', 'B-end', 14, 2, ['delivered']]]);
  assert.deepEqual(summary('shuffled-local'), [['A', 'T0', 0, 2, []], ['R1', 'A-end', 6, 2, ['delivered']], ['B', 'R1-end', 9, 3, []], ['R2', 'B-end', 14, 2, ['delivered']]]);
  assert.deepEqual(summary('absent-local'), [['A', 'T0', 0, 2, ['delivered']], ['R1', 'A-end', 6, 2, ['delivered']], ['B', 'R1-end', 9, 2, ['delivered']], ['R2', 'B-end', 14, 2, ['delivered']]]);
  assert.throws(() => replayPlan({ ...fake, probeAfter: fake.probeAfter.filter(p => p.phase !== 'R1-end') }, 'informative-local', 2), /does not start at the R1-end probe/);
  assert.throws(() => replayPlan(fake, 'no-such-arm', 2), /unknown arm/);
});

test('replay plan on the fixture tape: four phases in tape order, each starting at its probe', () => {
  const plan = replayPlan(tape, 'informative-local', 2);
  const probe = phase => tape.probeAfter.find(p => p.phase === phase).cursor;
  assert.deepEqual(plan.map(s => [s.phase, s.start, s.from]), [['A', 'T0', 0], ['R1', 'A-end', probe('A-end')], ['B', 'R1-end', probe('R1-end')], ['R2', 'B-end', probe('B-end')]]);
  for (const s of plan) assert.equal(tape.events[s.from].phase, s.phase);
});

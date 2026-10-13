import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../src/lowram/mate-certificate-check.mjs';
const { values: args } = parseArgs({ options: { run: { type: 'string' },
  prefix: { type: 'string' }, origin: { type: 'string' }, out: { type: 'string' } } });
if (!args.run) throw Error('Require --run');
const hash = value => createHash('sha256').update(value).digest('hex');
const reportBytes = readFileSync(join(args.run, 'report.json')), r = JSON.parse(reportBytes), p = r.protocol;
assert.equal(r.complete, true); assert.equal(r.identity.schema, 'puzzle-pipeline-v1');
for (const [path, sha] of Object.entries({ ...r.identity.inputs, ...r.identity.sources })) assert.equal(hash(readFileSync(path)), sha);
const mapping = JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
const pool = [...new Set(mapping.groups.flatMap(g => g.kc))].sort((a, b) => a - b);
const bucket = (token, size) => createHash('sha256').update(`${p.encoder.seed}\0${token}`).digest().readUInt32LE(0) % size;
const readRef = ref => { const bytes = readFileSync(ref.path); assert.equal(hash(bytes), ref.sha256); return JSON.parse(bytes); };
const plans = r.sharedPlans.map(readRef), flags = plans.flatMap(plan => plan.experiences.map(e => e.experimentalPulse));
const shuffled = [...flags]; let rng = p.seed >>> 0;
for (let i = shuffled.length - 1; i > 0; i--) { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  const j = Math.floor(rng / 2 ** 32 * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
assert.deepEqual(r.shuffle, shuffled); assert.equal(r.results.length, p.conditions.length * r.identity.puzzleCount);
let certificates = 0, updates = 0;
function proof(row, move, value) {
  if (value.status === 'unknown') { assert.equal(value.reward, null); return; }
  const b = new Chess(row.fen); if (row.pgn !== undefined) b.loadPgn(row.pgn);
  const actor = b.turn(); b.move({ from: move.slice(0, 2), to: move.slice(2, 4),
    ...(move.length === 5 ? { promotion: move[4] } : {}) });
  const check = checkMateCertificate(value.certificate, b, { attacker: actor, plies: row.plies - 1, maxNodes: 100000 });
  assert.equal(check.verified, true, check.reason); assert.equal(check.status, value.status); certificates++;
}
for (let c = 0; c < p.conditions.length; c++) {
  let offset = 0, previousMemory = null;
  for (let i = 0; i < r.identity.puzzleCount; i++) {
    const a = r.results[c * r.identity.puzzleCount + i], plan = plans[i];
    assert.equal(a.condition, p.conditions[c]); assert.deepEqual(a.planRef, r.sharedPlans[i]);
    assert.equal(a.fixedStatePreserved, true); assert.equal(a.receiptRefs.length, plan.experiences.length);
    assert.equal(a.before.memoryFingerprint, hash(JSON.stringify(a.beforeMemory)));
    assert.equal(a.after.memoryFingerprint, hash(JSON.stringify(a.afterMemory)));
    assert.deepEqual(a.repeat, a.after); assert.deepEqual(a.reset, a.before); assert.deepEqual(a.restored, a.after);
    if (previousMemory) assert.deepEqual(a.beforeMemory, previousMemory);
    else assert.ok(a.beforeMemory.events === 0 && a.beforeMemory.gains.every(g => g === 1));
    for (const key of ['before', 'after']) {
      const assessment = a[key], ranked = [...assessment.rows].sort((x, y) => y.score - x.score);
      assert.equal(assessment.choice, ranked[0].move);
      for (const row of assessment.rows) assert.equal(row.score, row.MBON12 - row.MBON01);
      proof(a.row, assessment.choice, a[key + 'ChoiceProof']);
      const search = a[key + 'Search'], move = search.move.from + search.move.to + (search.move.promotion ?? '');
      assert.equal(search.seed, p.seed + i); assert.ok(search.evaluations <= p.search.maxEvaluations);
      assert.ok(search.nodes <= p.search.maxNodes); assert.ok(search.simulations <= p.search.simulations);
      proof(a.row, move, a[key + 'SearchProof']);
    }
    let memory = a.beforeMemory;
    for (let j = 0; j < a.receiptRefs.length; j++) {
      const t = readRef(a.receiptRefs[j]), experience = plan.experiences[j];
      assert.deepEqual(t.before, memory); assert.deepEqual(t.context, experience.context);
      for (const key of ['move', 'actor', 'status', 'learningAllowed', 'experimentalPulse', 'certificateSha256'])
        assert.deepEqual(t.event[key], experience[key]);
      assert.equal(experience.learningAllowed, true); assert.notEqual(experience.status, 'unknown');
      assert.equal(t.event.certificateSha256, experience.certificateSha256);
      assert.equal(hash(JSON.stringify(experience.proof.certificate)), experience.certificateSha256);
      proof(a.row, experience.move, experience.proof);
      const expectedPulse = a.condition === 'absent' ? false : a.condition === 'shuffled'
        ? shuffled[offset + j] : experience.experimentalPulse;
      assert.equal(t.event.delivered, expectedPulse); assert.equal(t.appliedToNeurons, true);
      assert.equal(t.cue.identity, r.identity.encoderIdentity);
      assert.equal(t.cue.move, experience.move); assert.equal(t.cue.actor, experience.actor);
      assert.deepEqual(t.cue.assignments, t.cue.tokens.map(token => ({ token, index: pool[bucket(token, pool.length)] })));
      const selected = [...new Set(t.cue.assignments.map(a => a.index))];
      selected.sort((a, b) => bucket(`budget:${a}`, 0x100000000) - bucket(`budget:${b}`, 0x100000000) || a - b);
      const indices = selected.slice(0, p.encoder.maxCells).sort((a, b) => a - b);
      assert.deepEqual(t.cue.stimulation.map(c => c.index), indices);
      assert.ok(t.cue.stimulation.every(c => c.current === Math.min(p.encoder.maxCellCurrent, p.encoder.totalCurrent / indices.length)));
      assert.ok(t.cue.stimulation.length <= p.encoder.maxCells);
      assert.ok(t.cue.stimulation.every(cell => cell.current > 0 && cell.current <= p.encoder.maxCellCurrent));
      const enabled = a.condition !== 'disabled'; assert.equal(t.plasticityEnabled, enabled);
      assert.equal(t.after.identity, t.before.identity); assert.equal(t.update.events, t.after.events);
      if (!enabled) assert.deepEqual(t.before, t.after);
      else {
        assert.equal(t.after.events, t.before.events + 1);
        assert.equal(t.local.factors.length, mapping.groups.length);
        assert.equal(t.local.kc.length, mapping.groups.reduce((n, g) => n + g.edges.length, 0));
        assert.deepEqual(t.local.factors, t.update.factors);
        assert.ok(t.local.kc.every(k => Number.isFinite(k) && k >= 0));
        let k = 0, changed = 0;
        for (let g = 0; g < mapping.groups.length; g++) {
          const D = t.local.factors[g]; assert.ok(Number.isFinite(D) && D <= 0 && -p.memory.eta * D <= 1);
          for (let n = 0; n < mapping.groups[g].edges.length; n++, k++) {
            const before = t.before.gains[k], expected = Math.max(p.memory.minGain, Math.min(p.memory.maxGain,
              before + p.memory.eta * D * (t.local.kc[k] + before - 1)));
            assert.equal(t.after.gains[k], expected); if (expected !== before) changed++;
          }
        }
        assert.equal(t.update.changedEdges, changed); assert.equal(t.learningApplied, changed > 0); updates++;
      }
      memory = t.after;
    }
    assert.deepEqual(a.afterMemory, memory); previousMemory = memory; offset += a.receiptRefs.length;
  }
}
let prefixExact = null;
if (args.prefix) {
  // Paths and measured elapsed times differ across invocations. All memory,
  // receipts, hashes, cursors and presentation/event counters must agree.
  const strip = value => Array.isArray(value) ? value.map(strip) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !['path', 'elapsedMs', 'checkpoint'].includes(key))
      .map(([key, child]) => [key, strip(child)])) : value;
  const fingerprint = state => hash(JSON.stringify(strip(state)));
  const checkpoints = directory => readdirSync(directory).filter(name => /^checkpoint-\d{5}$/.test(name)).sort();
  const targets = checkpoints(args.prefix).map(name => ({
    hash: fingerprint(JSON.parse(readFileSync(join(args.prefix, name, 'state.json')))), matched: false }));
  assert.ok(targets.length >= 2, 'Resume comparison requires pending and acknowledged checkpoints');
  for (const directory of [args.origin, args.run].filter(Boolean)) {
    for (const name of checkpoints(directory)) {
      const state = JSON.parse(readFileSync(join(directory, name, 'state.json')));
      assert.deepEqual(state.identity, r.identity);
      const sha = fingerprint(state);
      for (const target of targets) target.matched ||= target.hash === sha;
      if (targets.every(target => target.matched)) break;
    }
    if (targets.every(target => target.matched)) break;
  }
  prefixExact = targets.every(target => target.matched);
  assert.equal(prefixExact, true, 'Resumed scientific state differs from original checkpoints');
}
const audit = { passed: true, reportSha256: hash(reportBytes), certificatesChecked: certificates,
  updatesChecked: updates, shuffleDifferent: JSON.stringify(flags) !== JSON.stringify(shuffled),
  prefixExact,
  scope: 'Receipt/recurrence/proof audit; optional exact checkpoint comparison excludes paths, elapsedMs and publication number. Search traces, biological validity and transfer require separate verification' };
writeFileSync(args.out ?? join(args.run, 'audit.json'), JSON.stringify(audit, null, 2), { flag: 'wx' }); console.log(JSON.stringify(audit));

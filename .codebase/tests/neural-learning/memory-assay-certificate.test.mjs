import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildFixture, buildSchedule, buildConflictSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { goodImage, buildCertificate } from '../../src/neural-learning/memory-assay-truth.mjs';
import { checkCertificate } from '../../src/neural-learning/memory-assay-checker.mjs';

const GENESIS = '0'.repeat(64);
const canon = v => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
// Forger model: edits the fields and recomputes the hash, so only the content checks can catch it.
const reseal = (cert, changes) => { const { hash, ...body } = { ...cert, ...changes }; return { ...body, hash: createHash('sha256').update(canon(body)).digest('hex') }; };

const fx = buildFixture({ seed: 1001, q: 0.5, relation: 'congruent', w: 0.5, bg: 0 });
const sch = buildSchedule({ seed: 1001 });
const check = (cert, extra = {}) => checkCertificate(cert, { fixtureId: fx.id, scheduleHash: sch.hash, prevHash: GENESIS, unknown: false, ...extra });
const base = (extra = {}) => buildCertificate({ fixtureId: fx.id, scheduleHash: sch.hash, phase: 'ACQ_A', global: 0, item: 'A', prevHash: GENESIS,
  chosen: 'A+', scores: { 'A+': 0.3, 'A-': 0.1 }, unknown: false, ...extra });

test('a valid certificate is accepted, and a wrong choice is recorded as bad', () => {
  assert.equal(base().consequence, 'good');
  assert.deepEqual(check(base()), { ok: true });
  const bad = base({ chosen: 'A-' });
  assert.equal(bad.consequence, 'bad');
  assert.deepEqual(check(bad), { ok: true });
});

test('tampering with fixtureId, scheduleHash or prevHash is rejected, with and without recomputing the hash', () => {
  const c = base();
  assert.equal(check({ ...c, fixtureId: 'x' }).ok, false);
  assert.deepEqual(check(reseal(c, { fixtureId: 'x' })), { ok: false, reason: 'fixture' });
  assert.equal(check({ ...c, scheduleHash: 'x' }).ok, false);
  assert.deepEqual(check(reseal(c, { scheduleHash: 'x' })), { ok: false, reason: 'schedule' });
  assert.equal(check({ ...c, prevHash: 'x' }).ok, false);
  assert.deepEqual(check(reseal(c, { prevHash: 'x' })), { ok: false, reason: 'prevHash' });
});

test('tampering with chosen is rejected', () => {
  const c = base();
  assert.deepEqual(check({ ...c, chosen: 'A-' }), { ok: false, reason: 'hash' });
  assert.deepEqual(check(reseal(c, { chosen: 'A-' })), { ok: false, reason: 'consequence' });
  assert.deepEqual(check(reseal(c, { chosen: 'C+' })), { ok: false, reason: 'chosen' });
});

test('tampering with consequence is rejected', () => {
  const c = base();
  assert.deepEqual(check({ ...c, consequence: 'bad' }), { ok: false, reason: 'hash' });
  assert.deepEqual(check(reseal(c, { consequence: 'bad' })), { ok: false, reason: 'consequence' });
});

test('tampering with scores is rejected when the hash is stale, or when scores are missing or nonfinite', () => {
  const c = base();
  assert.deepEqual(check({ ...c, scores: { 'A+': 0.9, 'A-': 0.1 } }), { ok: false, reason: 'hash' });
  assert.deepEqual(check(reseal(c, { scores: { 'A+': NaN, 'A-': 0.1 } })), { ok: false, reason: 'scores' });
  assert.deepEqual(check(reseal(c, { scores: undefined })), { ok: false, reason: 'scores' });
});

test('unknown trials accept only the unknown consequence, and known trials reject it', () => {
  const u = base({ global: 7, unknown: true });
  assert.equal(u.consequence, 'unknown');
  assert.deepEqual(check(u, { unknown: true }), { ok: true });
  assert.deepEqual(check(u, { unknown: false }), { ok: false, reason: 'consequence' });
  assert.deepEqual(check(reseal(u, { consequence: 'good' }), { unknown: true }), { ok: false, reason: 'consequence' });
});

test('goodImage and the checker agree for every phase, trial and image', () => {
  assert.deepEqual(['ACQ_A', 'ACQ_BC', 'REV1', 'REV2', 'REV3'].map(p => goodImage('A', p)), ['A+', 'A+', 'A-', 'A+', 'A-']);
  assert.throws(() => goodImage('A', 'CONFLICT'));
  for (const s of [sch, buildConflictSchedule({ seed: 1001 })]) for (const phase of s.phases) for (const t of phase.trials) {
    const situation = t.situation ?? null;
    for (const chosen of [`${t.item}+`, `${t.item}-`]) {
      const c = buildCertificate({ fixtureId: fx.id, scheduleHash: s.hash, phase: phase.name, global: t.global, item: t.item, situation,
        prevHash: GENESIS, chosen, scores: { [`${t.item}+`]: 0.2, [`${t.item}-`]: 0.1 }, unknown: false });
      assert.deepEqual(checkCertificate(c, { fixtureId: fx.id, scheduleHash: s.hash, prevHash: GENESIS, unknown: false }), { ok: true }, JSON.stringify([phase.name, t, chosen]));
      assert.equal(c.consequence, chosen === goodImage(t.item, phase.name, situation) ? 'good' : 'bad');
    }
  }
});

test('the checker imports only node:crypto', () => {
  const src = readFileSync(new URL('../../src/neural-learning/memory-assay-checker.mjs', import.meta.url), 'utf8');
  assert.deepEqual([...src.matchAll(/(?:import|from)\s*['"]([^'"]+)['"]/g)].map(m => m[1]), ['node:crypto']);
});

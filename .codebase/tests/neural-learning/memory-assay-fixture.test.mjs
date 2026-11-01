import test from 'node:test';
import assert from 'node:assert/strict';
import { GRID, SEEDS, gridCells, isGatedCell, buildFixture, buildSchedule, buildConflictSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';

const IMAGES = ['A+', 'A-', 'B+', 'B-', 'C+', 'C-', 'E+', 'E-'];
const CELLS = [
  { q: 0.9, relation: 'congruent', w: 0.9, bg: 0 },
  { q: 0.75, relation: 'conflicting', w: 0.5, bg: 0.1 },
  { q: 0.25, relation: 'congruent', w: 0, bg: 0.3 },
  { q: 0, relation: 'conflicting', w: 0.9, bg: 0 },
];
const shared = (x, y) => { const S = new Set(x.focal); return [...y.focal].filter(k => S.has(k)).length; };

test('same seed gives the same id and another seed a different id', () => {
  const a = buildFixture({ seed: 1001, ...CELLS[0] });
  assert.match(a.id, /^[0-9a-f]{64}$/);
  assert.equal(buildFixture({ seed: 1001, ...CELLS[0] }).id, a.id);
  assert.notEqual(buildFixture({ seed: 1002, ...CELLS[0] }).id, a.id);
});

test('actual focal q and w match the pinned levels within 1/s', () => {
  for (const cell of CELLS) for (const seed of [1001, 1002]) {
    const fx = buildFixture({ seed, ...cell }), tol = 1 / fx.s;
    assert.ok(Math.abs(fx.actual.qFocal - cell.q) <= tol, JSON.stringify(cell));
    for (const k of ['A', 'B', 'C']) assert.ok(Math.abs(fx.actual.wFocal[k] - cell.w) <= tol, `${k} ${JSON.stringify(cell)}`);
  }
});

test('C and E use KCs disjoint from A and B', () => {
  const fx = buildFixture({ seed: 1002, q: 0.9, relation: 'conflicting', w: 0.9, bg: 0.1 });
  const used = new Set(['A+', 'A-', 'B+', 'B-'].flatMap(id => [...fx.images[id].focal]));
  for (const id of ['C+', 'C-', 'E+', 'E-']) assert.equal([...fx.images[id].focal].filter(k => used.has(k)).length, 0, id);
});

test('every image has exactly s distinct focal KCs in ascending order', () => {
  const fx = buildFixture({ seed: 1003, q: 0.5, relation: 'congruent', w: 0.5, bg: 0 });
  for (const id of IMAGES) {
    const f = [...fx.images[id].focal];
    assert.equal(f.length, fx.s, id);
    assert.deepEqual(f, [...new Set(f)].sort((x, y) => x - y), id);
  }
});

test('B shares its focal KCs with the source image its relation names, and within-item overlap is w', () => {
  for (const relation of GRID.relation) for (const [q, w] of [[0.5, 0.5], [0.75, 0.5], [0.9, 0.9], [0.25, 0]]) {
    const fx = buildFixture({ seed: 1004, q, relation, w, bg: 0 }), Q = Math.round(q * fx.s);
    const congruent = relation === 'congruent';
    const srcPlus = congruent ? 'A+' : 'A-', srcMinus = congruent ? 'A-' : 'A+';
    const label = `${relation} q=${q} w=${w}`;
    assert.equal(shared(fx.images['B+'], fx.images[srcPlus]), Q, `B+ ${label}`);
    assert.equal(shared(fx.images['B-'], fx.images[srcMinus]), Q, `B- ${label}`);
    assert.ok(shared(fx.images['B+'], fx.images[srcMinus]) < Q, `B+ other source ${label}`);
    assert.equal(shared(fx.images['A+'], fx.images['A-']), Math.round(w * fx.s), label);
  }
});

test('background is 1.5*bg off focus and focal activity lies in [0.9, 1.5]', () => {
  for (const bg of GRID.bg) {
    const fx = buildFixture({ seed: 1005, q: 0.5, relation: 'congruent', w: 0.5, bg });
    for (const id of IMAGES) {
      const { focal, h } = fx.images[id], on = new Set(focal);
      for (let i = 0; i < fx.nKC; i++) if (!on.has(i)) assert.equal(h[i], 1.5 * bg, `${id} KC ${i}`);
      for (const k of focal) assert.ok(h[k] >= 0.9 && h[k] <= 1.5, `${id} KC ${k}`);
    }
  }
});

test('schedule has five phases, 24 B and 24 C in ACQ_BC, unknown every 8th trial, and a stable hash', () => {
  const sch = buildSchedule({ seed: 1001 });
  assert.deepEqual(sch.phases.map(p => p.name), ['ACQ_A', 'ACQ_BC', 'REV1', 'REV2', 'REV3']);
  assert.deepEqual(sch.phases.map(p => p.test), ['T1', 'T2', 'T3', 'T4', 'T5']);
  const [acq, bc, ...revs] = sch.phases;
  assert.deepEqual(acq.trials.map(t => t.item), Array(24).fill('A'));
  assert.equal(bc.trials.filter(t => t.item === 'B').length, 24);
  assert.equal(bc.trials.filter(t => t.item === 'C').length, 24);
  assert.equal(bc.trials.length, 48);
  for (const p of revs) assert.deepEqual(p.trials.map(t => t.item), Array(24).fill('A'));
  const all = sch.phases.flatMap(p => p.trials);
  assert.equal(all.length, 144);
  all.forEach((t, i) => { assert.equal(t.global, i); assert.equal(t.unknown, (i + 1) % 8 === 0); });
  assert.equal(all.filter(t => t.unknown).length, 18);
  assert.equal(buildSchedule({ seed: 1001 }).hash, sch.hash);
  assert.match(sch.hash, /^[0-9a-f]{64}$/);
  assert.notEqual(buildSchedule({ seed: 1002 }).hash, sch.hash);
});

test('conflict schedule has 48 E trials, 24 per situation, no unknowns', () => {
  const c = buildConflictSchedule({ seed: 1001 });
  assert.deepEqual(c.phases.map(p => p.name), ['CONFLICT']);
  const { trials, test: after } = c.phases[0];
  assert.equal(trials.length, 48);
  assert.equal(trials.filter(t => t.situation === 'E1').length, 24);
  assert.equal(trials.filter(t => t.situation === 'E2').length, 24);
  assert.ok(trials.every(t => t.item === 'E' && t.unknown === false));
  assert.equal(after, null);
});

test('gridCells lists 108 cells in q, relation, w, bg order', () => {
  const cells = gridCells();
  assert.equal(cells.length, 108);
  assert.equal(new Set(cells.map(c => JSON.stringify(c))).size, 108);
  assert.deepEqual(cells[1], { q: 0, relation: 'congruent', w: 0, bg: 0.1 });
  assert.deepEqual(cells[3], { q: 0, relation: 'congruent', w: 0.5, bg: 0 });
  assert.deepEqual(cells[9], { q: 0, relation: 'conflicting', w: 0, bg: 0 });
  assert.deepEqual(cells[18], { q: 0.1, relation: 'congruent', w: 0, bg: 0 });
  assert.deepEqual(cells[107], { q: 0.9, relation: 'conflicting', w: 0.9, bg: 0.3 });
});

test('28 of 108 cells are gated', () => {
  assert.equal(gridCells().filter(c => isGatedCell(c)).length, 28);
  assert.equal(isGatedCell({ q: 0.5, relation: 'congruent', w: 0, bg: 0 }), true);
  assert.equal(isGatedCell({ q: 0.5, relation: 'conflicting', w: 0, bg: 0 }), false);
  assert.equal(isGatedCell({ q: 0.9, relation: 'congruent', w: 0, bg: 0 }), false);
});

test('seed sets have the planned sizes and do not overlap', () => {
  assert.deepEqual([SEEDS.dev.length, SEEDS.h1.length, SEEDS.h2.length], [12, 24, 12]);
  assert.equal(new Set([...SEEDS.dev, ...SEEDS.h1, ...SEEDS.h2]).size, 48);
});

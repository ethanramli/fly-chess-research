import test from 'node:test';
import assert from 'node:assert/strict';
import { readNeurons, scoreNeurons, neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { fixture, contract, hash } from './neuron-reader-fixture.mjs';

test('endpoint readings are copied, type means are population-balanced, and no implicit score exists', () => {
  const { model, manifest } = fixture(), endpoint = model.h[model.steps];
  for (const cell of manifest.roster.cells) endpoint[cell.index] = cell.type === 'MBON09' ? 2 : 1;
  endpoint[3] = 0; endpoint[4] = 10;
  const observed = readNeurons(endpoint, manifest), saved = structuredClone(observed);
  assert.equal(observed.means.MBON05, 5); assert.equal(observed.means.MBON09, 2);
  assert.equal(observed.zeroCount, 1); assert.equal(observed.ceilingCount, 1);
  assert.equal('score' in observed, false); assert.equal(observed.scope, 'synthetic');
  endpoint.fill(0); manifest.config.steps = 3;
  assert.deepEqual(observed, saved);
  assert.throws(() => scoreNeurons(observed), /contract/);
});

test('released cell selection stays exact and carries transmitter disagreements without inferring signs', () => {
  const { manifest } = fixture();
  const config = { ...manifest.config, precision: 'float32' };
  const endpoint = new Float32Array(neuronReaderCells.nodes);
  for (const cell of neuronReaderCells.cells) endpoint[cell.index] = 0.25;
  const observed = readNeurons(endpoint, { ...manifest, roster: neuronReaderCells, config });
  assert.equal(observed.cells.length, 14);
  assert(observed.cells.every(cell => cell.activity === 0.25));
  const disputed = observed.cells.find(cell => cell.rootId === '720575940621164720');
  assert.equal(disputed.somaSide, 'left'); assert.equal(disputed.receivingSide, 'right');
  assert.equal(disputed.knownNT, 'glutamate'); assert.equal(disputed.predictedNT, 'acetylcholine');
  assert(Object.values(observed.means).every(value => value === 0.25));
});

test('malformed, duplicate, missing, rehashed wrong-scope rosters and numerical errors fail closed', () => {
  const f = fixture();
  const corruptions = [
    m => m.roster.cells.pop(),
    m => m.roster.cells[1].rootId = m.roster.cells[0].rootId,
    m => m.roster.cells[1].index = m.roster.cells[0].index,
    m => m.roster.cells[0].rootId = 720575940621164720,
    m => m.roster.cells[0].index = -1,
    m => m.roster.cells[0].type = 'MBON12',
    m => m.roster.scope = 'released-graph',
    m => m.roster.graphSha256 = 'missing',
    m => m.config.saturation = NaN,
    m => m.config.steps = 0,
    m => m.memoryIdentity = 'missing',
  ];
  for (const change of corruptions) {
    const manifest = structuredClone(f.manifest); change(manifest);
    const { identity, ...body } = manifest.roster; manifest.roster.identity = hash(body);
    assert.throws(() => readNeurons(f.model.h[f.model.steps], manifest));
  }
  for (const bad of [NaN, Infinity, -1, 11]) {
    const values = f.model.h[f.model.steps].slice(); values[3] = bad;
    assert.throws(() => readNeurons(values, f.manifest), /activity/);
  }
  assert.throws(() => readNeurons(new Float32Array(17), f.manifest), /vector/);
  assert.throws(() => readNeurons(new Float64Array(16), f.manifest), /vector/);
});

test('fixed scoring uses type means, accepts a negative-only ranking, and labels synthetic evidence', () => {
  const { model, manifest } = fixture();
  model.h[model.steps].fill(1);
  const a = readNeurons(model.h[model.steps], manifest);
  model.h[model.steps][3] = 3; model.h[model.steps][4] = 3;
  const b = readNeurons(model.h[model.steps], manifest), c = contract(a);
  c.coefficients.MBON09 = { ...c.coefficients.MBON05,
    evidence: { ...c.coefficients.MBON05.evidence, targets: a.cells.filter(cell => cell.type === 'MBON09').map(cell => cell.rootId) } };
  assert.equal(scoreNeurons(a, c).score, -2);
  assert.equal(scoreNeurons(b, c).score, -4);
  assert.equal(scoreNeurons(a, c).scope, 'synthetic');
  assert.deepEqual(scoreNeurons(a, c), scoreNeurons(a, structuredClone(c)));
});

test('score contracts reject missing evidence, unknown signs, all-zero tables and identity/scope mismatches', () => {
  const { model, manifest } = fixture(), observed = readNeurons(model.h[model.steps], manifest);
  const corruptions = [
    c => c.review.status = 'pending',
    c => c.review.compatibilitySha256 = '',
    c => c.review.reviewer = '',
    c => c.memoryIdentity = hash('different memory'),
    c => c.manifestIdentity = hash('different manifest'),
    c => c.scope = 'released-graph',
    c => delete c.coefficients.MBON06,
    c => c.coefficients.MBON05.value = 0,
    c => c.coefficients.MBON05.value = 0.2,
    c => c.coefficients.MBON05.evidence = null,
    c => c.coefficients.MBON05.evidence.assumptions = '',
    c => c.coefficients.MBON05.evidence.targets = ['wrong'],
  ];
  for (const change of corruptions) { const c = contract(observed); change(c); assert.throws(() => scoreNeurons(observed, c)); }
  const tampered = structuredClone(observed); tampered.means.MBON05 = 5;
  assert.throws(() => scoreNeurons(tampered, contract(observed)), /contract/);
  const { identity, ...body } = tampered; tampered.identity = hash(body);
  assert.throws(() => scoreNeurons(tampered, contract(observed)), /mean mismatch/);
});

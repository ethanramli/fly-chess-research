import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SparseTrainer } from '../src/lowram/trainer.mjs';
import { Gamma4Memory, mapGamma4 } from '../src/lowram/mushroom-body.mjs';
import { readNpz } from '../src/lowram/graph.mjs';

function fixture() {
  const graph = { row: new Int32Array([0, 0, 0, 0, 0, 0, 4, 5]), col: new Int32Array([0, 1, 2, 3, 4]),
    sign: new Int8Array([1, 1, 1, 1, -1]), initial: new Float32Array([1, 1, 1, 1, 1]), input: new Int32Array([0]), output: new Int32Array([5]) };
  const model = new SparseTrainer(graph, { inputDim: 1, outputs: 1 });
  const mapping = { edges: [0, 1, 2, 3] };
  return { model, memory: new Gamma4Memory(model, mapping) };
}
const A = [1, 0, 0, 0], B = [0, 1, 0, 0], zero = [0, 0, 0, 0];
function trial(m, reverse = false, reward = true) {
  m.advance(10); m.pair(reverse ? B : A, 0);
  m.advance(0.5); m.pair(zero, reward ? 1 : 0);
  m.advance(0.5); m.pair(reverse ? A : B, 0);
}

test('local timing association, retention and reversal; fixed wiring and other parameters', () => {
  const { model, memory } = fixture();
  const graph = structuredClone(model.graph), params = structuredClone(model.params);
  for (let i = 0; i < 4; i++) trial(memory);
  assert.ok(memory.gains[0] < 1 && memory.gains[1] > 1);
  assert.equal(memory.gains[2], 1); assert.equal(memory.gains[3], 1);
  const learned = [...memory.gains]; memory.advance(60);
  assert.deepEqual([...memory.gains], learned);
  for (let i = 0; i < 4; i++) trial(memory, true);
  assert.ok(memory.gains[0] > 1 && memory.gains[1] < 1);
  assert.deepEqual(model.graph, graph);
  for (const key of Object.keys(params)) if (key !== 'magnitude') assert.deepEqual(model.params[key], params[key]);
  assert.equal(model.params.magnitude[4], params.magnitude[4]);
});

test('no dopamine and long unpaired timing do not create an association', () => {
  const { memory } = fixture();
  for (let i = 0; i < 8; i++) trial(memory, i >= 4, false);
  assert.deepEqual([...memory.gains], [1, 1, 1, 1]);
  memory.pair(A, 0); memory.advance(60); memory.pair(zero, 1);
  assert.equal(memory.gains[0], 1);
});

test('checkpoint resumes mid-pairing exactly and rejects corrupt memory without mutation', () => {
  const first = fixture(), second = fixture();
  first.memory.pair(A, 0); first.memory.advance(0.5);
  second.memory.restore(JSON.parse(JSON.stringify(first.memory.snapshot())));
  for (const f of [first, second]) { f.memory.pair(zero, 1); f.memory.advance(0.5); f.memory.pair(B, 0); trial(f.memory, true); }
  assert.deepEqual(first.memory.snapshot(), second.memory.snapshot());
  assert.deepEqual(first.model.params, second.model.params);
  const before = second.memory.snapshot();
  assert.throws(() => second.memory.restore({ ...before, gains: [-1, 1, 1, 1] }), /checkpoint/);
  assert.throws(() => second.memory.restore({ ...before, identity: 'other' }), /checkpoint/);
  assert.deepEqual(second.memory.snapshot(), before);
});

test('bounded positive efficacy and invalid events do not corrupt memory', () => {
  const { memory } = fixture();
  for (let i = 0; i < 100; i++) memory.pair([100, 100, 100, 100], 100);
  assert.ok(memory.gains.every(g => g >= 0.2 && g <= 1.8));
  const before = memory.snapshot();
  assert.throws(() => memory.pair([1, NaN, 0, 0], 1));
  assert.throws(() => memory.advance(-1));
  assert.deepEqual(memory.snapshot(), before);
});

test('sparse experimental drive changes activity without modifying parameters', () => {
  const { model } = fixture(), before = structuredClone(model.params);
  model.forward([0]); const idle = model.h[model.steps][5];
  model.forward([0], [{ index: 0, current: 1.5 }]);
  assert.ok(model.h[model.steps][5] > idle);
  assert.deepEqual(model.params, before);
  assert.throws(() => model.forward([0], [{ index: -1, current: 1 }]));
  assert.throws(() => model.forward([0], [{ index: 0, current: NaN }]));
});

test('annotation mapping uses exact 64-bit IDs and contralateral MBON soma', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fly-mapping-'));
  try {
    const { model } = fixture(), ids = BigInt64Array.from({ length: 7 }, (_, i) => 720575940630496370n + BigInt(i));
    const header = 'root_id\themibrain_type\tcell_class\tside\tfbbt_id\tknown_nt\ttop_nt';
    const lines = [...ids].map((id, i) => [id.toString(), i < 4 ? 'KCg-m' : i === 4 ? 'PAM08' : 'MBON05', i < 4 ? 'Kenyon_Cell' : i === 4 ? 'DAN' : 'MBON', i === 5 ? 'left' : 'right', '', '', ''].join('\t'));
    const path = join(dir, 'annotations.tsv'); writeFileSync(path, [header, ...lines].join('\n'));
    const mapped = await mapGamma4(model.graph, ids, path);
    assert.deepEqual(mapped.edges, [0, 1, 2, 3]);
    assert.equal(mapped.cells.mbon[0].index, 5);
    assert.equal(mapped.cells.kc[1].rootId, '720575940630496371');
    assert.notEqual(mapped.cells.kc[0].rootId, mapped.cells.kc[1].rootId);
  } finally { rmSync(dir, { recursive: true }); }
});

test('NPZ int64 root IDs never round through Number', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fly-int64-'));
  try {
    const text = "{'descr': '<i8', 'fortran_order': False, 'shape': (2,), }\n";
    const header = Buffer.alloc(10); header.write('\x93NUMPY', 'latin1'); header[6] = 1; header.writeUInt16LE(Buffer.byteLength(text), 8);
    const data = Buffer.alloc(16); data.writeBigInt64LE(720575940630496370n); data.writeBigInt64LE(720575940630496371n, 8);
    const npy = Buffer.concat([header, Buffer.from(text), data]), name = Buffer.from('root_ids.npy');
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt32LE(npy.length, 20); central.writeUInt32LE(npy.length, 24); central.writeUInt16LE(name.length, 28);
    const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 10); end.writeUInt32LE(local.length + name.length + npy.length, 16);
    const path = join(dir, 'ids.npz'); writeFileSync(path, Buffer.concat([local, name, npy, central, name, end]));
    assert.deepEqual([...readNpz(path, ['root_ids']).root_ids], [720575940630496370n, 720575940630496371n]);
  } finally { rmSync(dir, { recursive: true }); }
});

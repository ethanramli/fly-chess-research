import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLocalAplPackage } from '../../src/neural-learning/fly-connections-apl-data-v1.mjs';

// Synthetic NPZ writer (stored ZIP + NPY v1), enough for readNpz. No production data is read.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function npy(array) {
  const descr = array instanceof Int32Array ? '<i4' : array instanceof Float32Array ? '<f4' : '<f8';
  const head = `{'descr': '${descr}', 'fortran_order': False, 'shape': (${array.length},), }`;
  const length = Math.ceil((head.length + 11) / 64) * 64 - 10;
  const text = head.padEnd(length - 1, ' ') + '\n';
  const size = Buffer.alloc(2);
  size.writeUInt16LE(text.length);
  return Buffer.concat([Buffer.from('\x93NUMPY', 'latin1'), Buffer.from([1, 0]), size, Buffer.from(text, 'latin1'),
    Buffer.from(array.buffer, array.byteOffset, array.byteLength)]);
}

function npz(entries) {
  const parts = [], central = [];
  let offset = 0;
  for (const [name, array] of entries) {
    const data = npy(array), file = Buffer.from(`${name}.npy`, 'latin1'), crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(file.length, 26);
    parts.push(local, file, data);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(file.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, file);
    offset += local.length + file.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}

const KEYS = ['parent', 'lengthNm', 'inputSite', 'inputKC', 'inputEdge', 'outputSite', 'outputKC', 'outputEdge'];
const names = (k) => Object.fromEntries(KEYS.map((key) => [key, `a${k}_${key}`]));

function defaultEntries() {
  // APL 0: 3 nodes, 2 inputs, 1 output. APL 1: 2 nodes, no inputs, 1 output. KC indices are annotated retained KCs.
  return [
    ['kc_indices', Int32Array.of(2, 3, 4)],
    ['a0_parent', Int32Array.of(-1, 0, 0)], ['a0_lengthNm', Float32Array.of(0, 100, 50)],
    ['a0_inputSite', Int32Array.of(1, 2)], ['a0_inputKC', Int32Array.of(2, 3)], ['a0_inputEdge', Int32Array.of(0, 1)],
    ['a0_outputSite', Int32Array.of(1)], ['a0_outputKC', Int32Array.of(4)], ['a0_outputEdge', Int32Array.of(2)],
    ['a1_parent', Int32Array.of(-1, 0)], ['a1_lengthNm', Float32Array.of(0, 300)],
    ['a1_inputSite', Int32Array.of()], ['a1_inputKC', Int32Array.of()], ['a1_inputEdge', Int32Array.of()],
    ['a1_outputSite', Int32Array.of(1)], ['a1_outputKC', Int32Array.of(3)], ['a1_outputEdge', Int32Array.of(5)],
  ];
}

function writePackage(dir, { entries = defaultEntries(), mutate = (pkg) => pkg } = {}) {
  const sites = npz(entries);
  writeFileSync(join(dir, 'sites.npz'), sites);
  const pkg = {
    schema: 'fly-apl-sites-v1-package', status: 'complete', units: 'nm', sitesFile: 'sites.npz',
    sitesSha256: createHash('sha256').update(sites).digest('hex'), kcIndicesArray: 'kc_indices',
    apls: [
      // Graph indices are production-sized APL neuron indices; slots 0 and 1 only name the arrays.
      { slot: 0, index: 17267, rootId: '720575940613583001', nodes: 3, inputs: 2, outputs: 1, arrays: names(0) },
      { slot: 1, index: 64810, rootId: '720575940624547622', nodes: 2, inputs: 0, outputs: 1, arrays: names(1) },
    ],
  };
  writeFileSync(join(dir, 'package.json'), JSON.stringify(mutate(pkg), null, 2));
}

async function expectRejects(options, pattern) {
  const dir = mkdtempSync(join(tmpdir(), 'apl-package-'));
  try {
    writePackage(dir, options);
    await assert.rejects(loadLocalAplPackage(dir), pattern);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('loads declared arrays as typed arrays with a deterministic identity', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'apl-package-'));
  try {
    writePackage(dir);
    const loaded = await loadLocalAplPackage(dir);
    assert.equal(loaded.schema, 'fly-apl-sites-v1');
    assert.match(loaded.identity, /^[0-9a-f]{64}$/);
    assert.equal(loaded.identity, (await loadLocalAplPackage(dir)).identity);
    assert.ok(loaded.kcIndices instanceof Int32Array);
    assert.deepEqual([...loaded.kcIndices], [2, 3, 4]);
    assert.equal(loaded.apls[0].rootId, '720575940613583001');
    assert.deepEqual(loaded.apls.map((apl) => apl.index), [17267, 64810]);
    assert.deepEqual(loaded.apls.map((apl) => apl.slot), [0, 1]);
    assert.ok(loaded.apls[0].lengthNm instanceof Float32Array);
    assert.deepEqual([...loaded.apls[0].parent], [-1, 0, 0]);
    assert.deepEqual([...loaded.apls[0].inputEdge], [0, 1]);
    assert.deepEqual([...loaded.apls[0].outputEdge], [2]);
    assert.equal(loaded.apls[1].inputSite.length, 0);
    assert.deepEqual([...loaded.apls[1].outputKC], [3]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects a tampered sites.npz before parsing its arrays', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'apl-package-'));
  try {
    writePackage(dir);
    appendFileSync(join(dir, 'sites.npz'), Buffer.from([0]));
    await assert.rejects(loadLocalAplPackage(dir), /hash differs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects a missing sites.npz', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'apl-package-'));
  try {
    writePackage(dir);
    unlinkSync(join(dir, 'sites.npz'));
    await assert.rejects(loadLocalAplPackage(dir), /sites\.npz is missing/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects path traversal in the sites file name and array names', async () => {
  await expectRejects({ mutate: (pkg) => ({ ...pkg, sitesFile: '../sites.npz' }) }, /file or unit declaration/);
  await expectRejects({ mutate: (pkg) => {
    pkg.apls[0].arrays.parent = '../a0_parent';
    return pkg;
  } }, /array name parent differs/);
});

test('rejects malformed identities, status and declared counts', async () => {
  await expectRejects({ mutate: (pkg) => ({ ...pkg, status: 'running' }) }, /schema or status/);
  await expectRejects({ mutate: (pkg) => {
    pkg.apls[1].rootId = 'left';
    return pkg;
  } }, /identity is invalid/);
  await expectRejects({ mutate: (pkg) => {
    pkg.apls[0].inputs = 3;
    return pkg;
  } }, /arrays differ in count/);
});

test('rejects malformed graph indices, duplicate roots and slot mismatches', async () => {
  for (const bad of ['17267', 1.5, -1, null, true, 2 ** 53]) {
    await expectRejects({ mutate: (pkg) => {
      pkg.apls[0].index = bad;
      return pkg;
    } }, /graph index is invalid/);
  }
  await expectRejects({ mutate: (pkg) => {
    pkg.apls[1].index = 17267;
    return pkg;
  } }, /duplicate graph index 17267/);
  await expectRejects({ mutate: (pkg) => {
    pkg.apls[1].rootId = pkg.apls[0].rootId;
    return pkg;
  } }, /duplicate APL root 720575940613583001/);
  await expectRejects({ mutate: (pkg) => {
    pkg.apls[0].slot = 1;
    return pkg;
  } }, /declares slot 1/);
  await expectRejects({ mutate: (pkg) => {
    delete pkg.apls[0].slot;
    return pkg;
  } }, /declares slot undefined/);
});

test('rejects broken tree order, wrong dtype and unannotated KC partners', async () => {
  const badParent = defaultEntries().map(([n, a]) => (n === 'a0_parent' ? [n, Int32Array.of(-1, 2, 0)] : [n, a]));
  await expectRejects({ entries: badParent }, /parent order fails at node 1/);
  const wideLength = defaultEntries().map(([n, a]) => (n === 'a0_lengthNm' ? [n, Float64Array.of(0, 100, 50)] : [n, a]));
  await expectRejects({ entries: wideLength }, /Unsupported dtype/);
  const unknownKc = defaultEntries().map(([n, a]) => (n === 'a0_inputKC' ? [n, Int32Array.of(2, 9)] : [n, a]));
  await expectRejects({ entries: unknownKc }, /is not an annotated retained KC/);
});

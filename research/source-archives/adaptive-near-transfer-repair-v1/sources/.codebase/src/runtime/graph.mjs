// Read only required numeric arrays from NPZ, one ZIP member at a time.
// No pickle, extraction to arbitrary paths, dense adjacency, or Python dependency.
import { openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

export function readNpz(path, names) {
  const fd = openSync(path, 'r');
  const read = (position, length) => {
    if (!Number.isSafeInteger(length) || length < 0 || length > 256 * 2 ** 20) throw Error('NPZ member too large');
    const b = Buffer.alloc(length);
    if (readSync(fd, b, 0, length, position) !== length) throw Error('Truncated NPZ');
    return b;
  };
  try {
    const size = fstatSync(fd).size;
    const tail = read(Math.max(0, size - 65557), Math.min(size, 65557));
    const end = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (end < 0) throw Error('Missing ZIP directory');
    let offset = tail.readUInt32LE(end + 16);
    const count = tail.readUInt16LE(end + 10);
    const result = {};
    for (let i = 0; i < count; i++) {
      const h = read(offset, 46);
      if (h.readUInt32LE(0) !== 0x02014b50) throw Error('Invalid ZIP directory');
      const nameLength = h.readUInt16LE(28);
      const name = read(offset + 46, nameLength).toString();
      offset += 46 + nameLength + h.readUInt16LE(30) + h.readUInt16LE(32);
      if (!names.includes(name.replace(/\.npy$/, ''))) continue;
      const localOffset = h.readUInt32LE(42);
      const local = read(localOffset, 30);
      const packed = read(localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28), h.readUInt32LE(20));
      const method = h.readUInt16LE(10);
      const b = method === 0 ? packed : method === 8 ? inflateRawSync(packed, { maxOutputLength: 256 * 2 ** 20 }) : null;
      if (!b || b.length !== h.readUInt32LE(24) || b.toString('latin1', 0, 6) !== '\x93NUMPY') throw Error('Invalid NPY member');
      const version = b[6];
      if (version !== 1 && version !== 2) throw Error('Unsupported NPY version');
      const start = version === 1 ? 10 : 12;
      const length = version === 1 ? b.readUInt16LE(8) : b.readUInt32LE(8);
      const header = b.toString('ascii', start, start + length);
      if (!/'fortran_order': False/.test(header)) throw Error('Fortran layout unsupported');
      const dtype = /'descr': '([^']+)'/.exec(header)?.[1];
      const types = { '<i4': Int32Array, '<i8': BigInt64Array, '<f4': Float32Array, '|i1': Int8Array };
      const Type = types[dtype];
      if (!Type) throw Error(`Unsupported dtype ${dtype}`);
      const data = b.subarray(start + length);
      if (data.length % Type.BYTES_PER_ELEMENT) throw Error('Misaligned NPY data');
      const array = new Type(data.length / Type.BYTES_PER_ELEMENT);
      Buffer.from(array.buffer).set(data);
      result[name.replace(/\.npy$/, '')] = array;
    }
    for (const name of names) if (!result[name]) throw Error(`Missing NPZ array: ${name}`);
    return result;
  } finally { closeSync(fd); }
}

export function validateGraph(g) {
  const { row, col, sign, initial, input, output } = g;
  const n = row.length - 1, e = col.length;
  if (n < 1 || row[0] !== 0 || row[n] !== e || initial.length !== e || sign.length !== e) throw Error('Graph shape mismatch');
  const preSign = new Int8Array(n);
  for (let j = 0; j < n; j++) {
    if (row[j] > row[j + 1] || row[j] < 0 || row[j + 1] > e) throw Error('Invalid CSR offsets');
    let last = -1;
    for (let k = row[j]; k < row[j + 1]; k++) {
      const i = col[k];
      if (i <= last || i >= n || !Number.isFinite(initial[k]) || initial[k] <= 0 || Math.abs(sign[k]) !== 1) throw Error('Invalid edge');
      if (preSign[i] && preSign[i] !== sign[k]) throw Error('Inconsistent outgoing signs');
      preSign[i] = sign[k]; last = i;
    }
  }
  for (const indices of [input, output]) {
    if (!indices.length || new Set(indices).size !== indices.length) throw Error('Empty or duplicate IO mapping');
    for (const i of indices) if (i < 0 || i >= n) throw Error('Invalid IO index');
  }
  return g;
}

export function loadGraph(path) {
  const a = readNpz(path, ['csr_indptr', 'csr_indices', 'syn_count', 'sign', 'input_idx', 'output_idx']);
  return validateGraph({ row: a.csr_indptr, col: a.csr_indices, sign: a.sign,
    initial: a.syn_count, input: a.input_idx, output: a.output_idx });
}

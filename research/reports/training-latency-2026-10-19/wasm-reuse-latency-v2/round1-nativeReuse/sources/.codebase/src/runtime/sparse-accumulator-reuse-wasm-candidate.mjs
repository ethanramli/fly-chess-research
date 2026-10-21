// Serial CSR dot products only. f64 multiply/add preserve JS summation order;
// activation, transient traces, readout and learning stay in SparseTrainer.
// Binary encoding follows the WebAssembly spec registered on 2026-10-10.
const uleb = n => {
  const bytes = [];
  do { const b = n & 127; n >>>= 7; bytes.push(b | (n ? 128 : 0)); } while (n);
  return bytes;
};
const section = (id, bytes) => [id, ...uleb(bytes.length), ...bytes];
const name = text => [text.length, ...new TextEncoder().encode(text)];
const get = i => [0x20, i], set = i => [0x21, i];
const constant = n => [0x41, n]; // only small positive constants below 64
const address = (base, index, stride) => [...get(base), ...get(index), ...constant(stride), 0x6c, 0x6a];
const loadInt = [0x28, 2, 0];
function body(width, masked = false) {
  const load = width === 4 ? [0x2a, 2, 0, 0xbb] : [0x2b, 3, 0];
  // Parameters n,row,col,weight,previous,drive,result,edges are i32 pointers.
  // Locals: j=8,k=9,end=10,column=11 (i32), sum=12 (f64).
  const code = [2, 4, 0x7f, 1, 0x7c,
    ...constant(0), ...set(8),
    0x02, 0x40, 0x03, 0x40, // block done; loop rows
      ...get(8), ...get(0), 0x4f, 0x0d, 1,
      ...address(1, 8, 4), ...loadInt, ...set(9),
      ...address(1, 8, 4), ...constant(4), 0x6a, ...loadInt, ...set(10),
      ...get(10), ...get(7), 0x4b, ...get(9), ...get(10), 0x4b, 0x72,
      0x04, 0x40, ...constant(1), 0x0f, 0x0b, // invalid CSR offsets
      // Mask is stored in the otherwise-unused result cells before a masked call.
      ...(masked ? [...address(6, 8, 8), 0x2b, 3, 0, 0x44, ...Array(8).fill(0), 0x62, 0x04, 0x40] : []),
      ...address(5, 8, width), ...load, ...set(12),
      0x02, 0x40, 0x03, 0x40, // block row done; loop edges
        ...get(9), ...get(10), 0x4f, 0x0d, 1,
        ...address(2, 9, 4), ...loadInt, ...set(11),
        ...get(11), ...get(0), 0x4f,
        0x04, 0x40, ...constant(1), 0x0f, 0x0b, // invalid column
        ...get(12), ...address(3, 9, width), ...load,
        ...address(4, 11, width), ...load, 0xa2, 0xa0, ...set(12),
        ...get(9), ...constant(1), 0x6a, ...set(9), 0x0c, 0,
      0x0b, 0x0b,
      ...address(6, 8, 8), ...get(12), 0x39, 3, 0,
      ...(masked ? [0x0b] : []),
      ...get(8), ...constant(1), 0x6a, ...set(8), 0x0c, 0,
    0x0b, 0x0b, ...constant(0), 0x0b];
  return [...uleb(code.length), ...code];
}

// These helpers compare exact stored bits; they perform no floating-point sums.
const byteAddress = (base, index) => [...get(base), ...get(index), 0x6a];
const increment = i => [...get(i), ...constant(1), 0x6a, ...set(i)];
const finishBody = code => [...uleb(code.length), ...code];
function topologyBody() {
  // n,row,col,canonicalRow,canonicalCol,edges; local i=6.
  const compare = (left, right, limit, inclusive) => [
    ...constant(0), ...set(6), 0x02, 0x40, 0x03, 0x40,
    ...get(6), ...get(limit), inclusive ? 0x4b : 0x4f, 0x0d, 1,
    ...address(left, 6, 4), ...loadInt, ...address(right, 6, 4), ...loadInt, 0x47,
    0x04, 0x40, ...constant(0), 0x0f, 0x0b,
    ...increment(6), 0x0c, 0, 0x0b, 0x0b];
  return finishBody([1, 1, 0x7f, ...compare(1, 3, 0, true), ...compare(2, 4, 5, false),
    ...constant(1), 0x0b]);
}
function weightBody(width) {
  // n,row,weights,canonicalWeights,mask; locals j=5,k=6,end=7,dirty=8.
  const bits = width === 4 ? [0x28, 2, 0] : [0x29, 3, 0];
  return finishBody([1, 4, 0x7f, ...constant(0), ...set(5),
    0x02, 0x40, 0x03, 0x40, ...get(5), ...get(0), 0x4f, 0x0d, 1,
    ...address(1, 5, 4), ...loadInt, ...set(6),
    ...address(1, 5, 4), ...constant(4), 0x6a, ...loadInt, ...set(7),
    ...constant(0), ...set(8),
    0x02, 0x40, 0x03, 0x40,
      ...get(8), ...get(6), ...get(7), 0x4f, 0x72, 0x0d, 1,
      ...address(2, 6, width), ...bits, ...address(3, 6, width), ...bits,
      width === 4 ? 0x47 : 0x52, ...set(8), ...increment(6), 0x0c, 0,
    0x0b, 0x0b,
    ...byteAddress(4, 5), ...get(8), 0x3a, 0, 0,
    ...increment(5), 0x0c, 0, 0x0b, 0x0b, ...constant(0), 0x0b]);
}
function classifyBody(width) {
  // n,row,col,current,reference,baseDirty,result,mask; locals j=8,k=9,end=10,col=11,dirty=12.
  const bits = width === 4 ? [0x28, 2, 0] : [0x29, 3, 0];
  const different = index => [...address(3, index, width), ...bits,
    ...address(4, index, width), ...bits, width === 4 ? 0x47 : 0x52];
  const double = value => {
    const bytes = new Uint8Array(8); new DataView(bytes.buffer).setFloat64(0, value, true);
    return [0x44, ...bytes];
  };
  return finishBody([1, 5, 0x7f, ...constant(0), ...set(8),
    0x02, 0x40, 0x03, 0x40, ...get(8), ...get(0), 0x4f, 0x0d, 1,
    ...byteAddress(5, 8), 0x2d, 0, 0, ...different(8), 0x72, ...set(12),
    ...address(1, 8, 4), ...loadInt, ...set(9),
    ...address(1, 8, 4), ...constant(4), 0x6a, ...loadInt, ...set(10),
    0x02, 0x40, 0x03, 0x40,
      ...get(12), ...get(9), ...get(10), 0x4f, 0x72, 0x0d, 1,
      ...address(2, 9, 4), ...loadInt, ...set(11),
      ...different(11), ...set(12), ...increment(9), 0x0c, 0,
    0x0b, 0x0b,
    ...byteAddress(7, 8), ...get(12), 0x3a, 0, 0,
    ...address(6, 8, 8), ...get(12), 0x04, 0x7c, ...double(1), 0x05, ...double(0), 0x0b, 0x39, 3, 0,
    ...increment(8), 0x0c, 0, 0x0b, 0x0b, ...constant(0), 0x0b]);
}

const module = new WebAssembly.Module(Uint8Array.from([
  0, 97, 115, 109, 1, 0, 0, 0,
  ...section(1, [3, 0x60, 8, ...Array(8).fill(0x7f), 1, 0x7f, 0x60, 6, ...Array(6).fill(0x7f), 1, 0x7f, 0x60, 5, ...Array(5).fill(0x7f), 1, 0x7f]),
  ...section(2, [1, ...name('env'), ...name('memory'), 2, 1, 1, ...uleb(4096)]),
  ...section(3, [9, 0, 0, 0, 0, 1, 2, 2, 0, 0]),
  ...section(7, [9, ...name('sum32'), 0, 0, ...name('sum64'), 0, 1, ...name('masked32'), 0, 2, ...name('masked64'), 0, 3, ...name('sameTopology'), 0, 4, ...name('weights32'), 0, 5, ...name('weights64'), 0, 6, ...name('classify32'), 0, 7, ...name('classify64'), 0, 8]),
  ...section(10, [9, ...body(4), ...body(8), ...body(4, true), ...body(8, true), ...topologyBody(), ...weightBody(4), ...weightBody(8), ...classifyBody(4), ...classifyBody(8)]),
]));

export class SparseAccumulator {
  constructor(graph, Type) {
    if (![Float32Array, Float64Array].includes(Type)) throw Error('Invalid accumulator precision');
    this.graph = graph;
    const n = graph.row.length - 1, e = graph.col.length;
    let offset = 0;
    const allocate = (ArrayType, count) => {
      offset = Math.ceil(offset / 8) * 8;
      const start = offset; offset += count * ArrayType.BYTES_PER_ELEMENT;
      return { ArrayType, count, start };
    };
    const layout = [allocate(Int32Array, n + 1), allocate(Int32Array, e),
      allocate(Type, e), allocate(Type, n), allocate(Type, n), allocate(Float64Array, n),
      allocate(Int32Array, n + 1), allocate(Int32Array, e), allocate(Type, e), allocate(Type, n),
      allocate(Uint8Array, n), allocate(Uint8Array, n), allocate(Uint8Array, n)];
    if (!Number.isSafeInteger(offset) || offset > 128 * 2 ** 20) throw Error('Sparse accumulator scratch limit');
    const pages = Math.ceil(offset / 65536);
    this.memory = new WebAssembly.Memory({ initial: pages, maximum: pages });
    [this.row, this.col, this.weight, this.previous, this.drive, this.result,
      this.canonicalRow, this.canonicalCol, this.canonicalWeight, this.referencePrevious,
      this.reuseBaseDirty, this.reuseMask, this.reuseWeightDirty] = layout.map(
      ({ ArrayType, count, start }) => new ArrayType(this.memory.buffer, start, count));
    const instance = new WebAssembly.Instance(module, { env: { memory: this.memory } });
    this.kernel = instance.exports[Type === Float32Array ? 'sum32' : 'sum64'];
    this.maskedKernel = instance.exports[Type === Float32Array ? 'masked32' : 'masked64'];
    this.topologyKernel = instance.exports.sameTopology;
    this.weightKernel = instance.exports[Type === Float32Array ? 'weights32' : 'weights64'];
    this.classifyKernel = instance.exports[Type === Float32Array ? 'classify32' : 'classify64'];
    const extra = [this.canonicalRow, this.canonicalCol, this.canonicalWeight, this.referencePrevious,
      this.reuseBaseDirty, this.reuseMask, this.reuseWeightDirty].reduce((s, a) => s + a.byteLength, 0);
    this.reuseReservedBytes = Math.ceil(extra / 65536) * 65536;
    this.reuseReady = false;
  }
  prepare(weight, drive) {
    const { graph } = this;
    if (graph.row.length !== this.row.length || graph.col.length !== this.col.length
      || weight.length !== this.weight.length || drive.length !== this.drive.length
      || graph.row[0] !== 0 || graph.row.at(-1) !== graph.col.length)
      throw Error('Invalid sparse accumulator shape');
    // ponytail: recopy each forward instead of adding cache invalidation to
    // every loading/plasticity/update path. One bounded position at a time.
    this.row.set(graph.row); this.col.set(graph.col);
    this.weight.set(weight); this.drive.set(drive);
  }
  reuseTopologyMatches() {
    return Boolean(this.topologyKernel(this.drive.length, this.row.byteOffset, this.col.byteOffset,
      this.canonicalRow.byteOffset, this.canonicalCol.byteOffset, this.col.length));
  }
  resetReuseReference(row, col, weight) {
    this.canonicalRow.set(row); this.canonicalCol.set(col); this.canonicalWeight.set(weight);
  }
  populateReuseWeightDirty(target) {
    this.weightKernel(this.drive.length, this.row.byteOffset, this.weight.byteOffset,
      this.canonicalWeight.byteOffset, this.reuseWeightDirty.byteOffset);
    target.set(this.reuseWeightDirty);
  }
  classifyReuse(previous, reference) {
    if (previous.length !== this.previous.length || reference.length !== previous.length)
      throw Error('Invalid exact reference state');
    this.previous.set(previous); this.referencePrevious.set(reference);
    this.classifyKernel(this.drive.length, this.row.byteOffset, this.col.byteOffset, this.previous.byteOffset,
      this.referencePrevious.byteOffset, this.reuseBaseDirty.byteOffset, this.result.byteOffset, this.reuseMask.byteOffset);
    this.reuseClassifiedPrevious = previous; this.reuseReady = true;
    return this.reuseMask;
  }
  accumulate(previous, mask = null) {
    if (previous.length !== this.previous.length) throw Error('Invalid sparse accumulator state');
    const prepared = mask === this.reuseMask && this.reuseReady && this.reuseClassifiedPrevious === previous;
    if (!prepared) this.previous.set(previous);
    if (mask !== null && !prepared) {
      if (mask.length !== this.result.length) throw Error('Invalid exact-row mask');
      for (let i = 0; i < mask.length; i++) this.result[i] = mask[i] ? 1 : 0;
    }
    this.reuseReady = false;
    const kernel = mask === null ? this.kernel : this.maskedKernel;
    if (kernel(this.drive.length, this.row.byteOffset, this.col.byteOffset, this.weight.byteOffset,
      this.previous.byteOffset, this.drive.byteOffset, this.result.byteOffset, this.col.length))
      throw Error('Nonfinite recurrent input');
    return this.result;
  }
}

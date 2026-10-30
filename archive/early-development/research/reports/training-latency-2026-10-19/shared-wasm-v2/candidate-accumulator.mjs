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
function body(width) {
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
      ...get(8), ...constant(1), 0x6a, ...set(8), 0x0c, 0,
    0x0b, 0x0b, ...constant(0), 0x0b];
  return [...uleb(code.length), ...code];
}
const module = new WebAssembly.Module(Uint8Array.from([
  0, 97, 115, 109, 1, 0, 0, 0,
  ...section(1, [1, 0x60, 8, ...Array(8).fill(0x7f), 1, 0x7f]),
  ...section(2, [1, ...name('env'), ...name('memory'), 2, 1, 1, ...uleb(4096)]),
  ...section(3, [2, 0, 0]),
  ...section(7, [2, ...name('sum32'), 0, 0, ...name('sum64'), 0, 1]),
  ...section(10, [2, ...body(4), ...body(8)]),
]));

export class SparseAccumulator {
  constructor(graph, Type, historyCount = 0) {
    if (!Number.isSafeInteger(historyCount) || historyCount < 0)
      throw Error("Invalid accumulator history count");
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
      allocate(Type, n * historyCount)];
    if (!Number.isSafeInteger(offset) || offset > 128 * 2 ** 20) throw Error('Sparse accumulator scratch limit');
    const pages = Math.ceil(offset / 65536);
    this.memory = new WebAssembly.Memory({ initial: pages, maximum: pages });
    let histories;
    [this.row, this.col, this.weight, this.previous, this.drive, this.result, histories] = layout.map(
      ({ ArrayType, count, start }) => new ArrayType(this.memory.buffer, start, count));
    this.history = Array.from({ length: historyCount }, (_, i) => histories.subarray(i * n, (i + 1) * n));
    const instance = new WebAssembly.Instance(module, { env: { memory: this.memory } });
    this.kernel = instance.exports[Type === Float32Array ? 'sum32' : 'sum64'];
  }
  prepare(weight, drive) {
    const { graph } = this;
    if (graph.row.length !== this.row.length || graph.col.length !== this.col.length
      || weight.length !== this.weight.length || drive.length !== this.drive.length
      || graph.row[0] !== 0 || graph.row.at(-1) !== graph.col.length)
      throw Error('Invalid sparse accumulator shape');
    // ponytail: topology remains externally mutable; refresh it each forward.
    // Trainer weights and drive already live here, so every writer stays current.
    this.row.set(graph.row); this.col.set(graph.col);
    if (weight !== this.weight) this.weight.set(weight);
    if (drive !== this.drive) this.drive.set(drive);
  }
  accumulate(previous) {
    if (previous.length !== this.previous.length) throw Error('Invalid sparse accumulator state');
    // Only owned histories have proven disjointness from the result buffer.
    const direct = this.history.includes(previous);
    if (!direct) this.previous.set(previous);
    const input = direct ? previous : this.previous;
    if (this.kernel(this.drive.length, this.row.byteOffset, this.col.byteOffset, this.weight.byteOffset,
      input.byteOffset, this.drive.byteOffset, this.result.byteOffset, this.col.length))
      throw Error('Nonfinite recurrent input');
    return this.result;
  }
}

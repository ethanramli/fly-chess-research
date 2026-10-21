"""Preserve v1; move measured topology/weight/dependency checks into Wasm."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
KERNEL = '.codebase/src/runtime/sparse-accumulator-reuse-wasm-candidate.mjs'
CACHE = '.codebase/src/runtime/frame-reuse-cache-wasm-candidate.mjs'
TRAINER = '.codebase/src/supervised-baselines/trainer-reuse-wasm-candidate.mjs'
assert not any((ROOT / p).exists() for p in [KERNEL, CACHE, TRAINER])


def replace(source, before, after):
    assert source.count(before) == 1, before
    return source.replace(before, after)


helpers = r'''
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
'''
source = (ROOT / '.codebase/src/runtime/sparse-accumulator-masked-candidate.mjs').read_text(encoding='utf-8')
source = replace(source, 'const module = new WebAssembly.Module', helpers + '\nconst module = new WebAssembly.Module')
source = replace(source, '...section(1, [1, 0x60, 8, ...Array(8).fill(0x7f), 1, 0x7f]),',
                 '...section(1, [3, 0x60, 8, ...Array(8).fill(0x7f), 1, 0x7f, 0x60, 6, ...Array(6).fill(0x7f), 1, 0x7f, 0x60, 5, ...Array(5).fill(0x7f), 1, 0x7f]),')
source = replace(source, '...section(3, [4, 0, 0, 0, 0]),', '...section(3, [9, 0, 0, 0, 0, 1, 2, 2, 0, 0]),')
source = replace(source, "...section(7, [4, ...name('sum32'), 0, 0, ...name('sum64'), 0, 1, ...name('masked32'), 0, 2, ...name('masked64'), 0, 3]),",
                 "...section(7, [9, ...name('sum32'), 0, 0, ...name('sum64'), 0, 1, ...name('masked32'), 0, 2, ...name('masked64'), 0, 3, ...name('sameTopology'), 0, 4, ...name('weights32'), 0, 5, ...name('weights64'), 0, 6, ...name('classify32'), 0, 7, ...name('classify64'), 0, 8]),")
source = replace(source, '...section(10, [4, ...body(4), ...body(8), ...body(4, true), ...body(8, true)]),',
                 '...section(10, [9, ...body(4), ...body(8), ...body(4, true), ...body(8, true), ...topologyBody(), ...weightBody(4), ...weightBody(8), ...classifyBody(4), ...classifyBody(8)]),')
source = replace(source, 'allocate(Type, e), allocate(Type, n), allocate(Type, n), allocate(Float64Array, n)];',
                 '''allocate(Type, e), allocate(Type, n), allocate(Type, n), allocate(Float64Array, n),
      allocate(Int32Array, n + 1), allocate(Int32Array, e), allocate(Type, e), allocate(Type, n),
      allocate(Uint8Array, n), allocate(Uint8Array, n), allocate(Uint8Array, n)];''')
source = replace(source, '[this.row, this.col, this.weight, this.previous, this.drive, this.result] = layout.map(',
                 '''[this.row, this.col, this.weight, this.previous, this.drive, this.result,
      this.canonicalRow, this.canonicalCol, this.canonicalWeight, this.referencePrevious,
      this.reuseBaseDirty, this.reuseMask, this.reuseWeightDirty] = layout.map(''')
source = replace(source, "    this.maskedKernel = instance.exports[Type === Float32Array ? 'masked32' : 'masked64'];",
                 """    this.maskedKernel = instance.exports[Type === Float32Array ? 'masked32' : 'masked64'];
    this.topologyKernel = instance.exports.sameTopology;
    this.weightKernel = instance.exports[Type === Float32Array ? 'weights32' : 'weights64'];
    this.classifyKernel = instance.exports[Type === Float32Array ? 'classify32' : 'classify64'];
    const extra = [this.canonicalRow, this.canonicalCol, this.canonicalWeight, this.referencePrevious,
      this.reuseBaseDirty, this.reuseMask, this.reuseWeightDirty].reduce((s, a) => s + a.byteLength, 0);
    this.reuseReservedBytes = Math.ceil(extra / 65536) * 65536;
    this.reuseReady = false;""")
source = replace(source, '  accumulate(previous, mask = null) {', '''  reuseTopologyMatches() {
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
  accumulate(previous, mask = null) {''')
source = replace(source, '''    this.previous.set(previous);
    if (mask !== null) {''', '''    const prepared = mask === this.reuseMask && this.reuseReady && this.reuseClassifiedPrevious === previous;
    if (!prepared) this.previous.set(previous);
    if (mask !== null && !prepared) {''')
source = replace(source, '    const kernel = mask === null ? this.kernel : this.maskedKernel;',
                 '    this.reuseReady = false;\n    const kernel = mask === null ? this.kernel : this.maskedKernel;')
(ROOT / KERNEL).write_text(source, encoding='utf-8', newline='')

cache = (ROOT / '.codebase/src/runtime/frame-reuse-cache.mjs').read_text(encoding='utf-8')
cache = cache.replace('  #changed = null;\n', '').replace('  #mask = null;\n', '')
cache = replace(cache, 'constructor(limitBytes = 256 * 2 ** 20) { this.limitBytes = limitBytes; }',
                'constructor(limitBytes = 256 * 2 ** 20, reservedBytes = 0) { this.limitBytes = limitBytes - reservedBytes; }')
cache = replace(cache, 'this.#weightDirty = null; this.#changed = null; this.#mask = null; this.#bytes = 0;',
                'this.#weightDirty = null; this.#bytes = 0;')
cache = replace(cache, '    const {graph: g, signedMagnitude: weights, n} = model;', '''    const {graph: g, signedMagnitude: weights, n} = model;
    // The Wasm classifier compares original bits. Mixed history dtypes use the
    // unchanged full computation rather than comparing rounded scratch copies.
    if ([...model.h, ...model.activity].some(a => a.constructor !== weights.constructor)) {this.clear(); return;}''')
cache = replace(cache, '''      for (let i = 0; i < g.row.length && !changed; i++) changed = g.row[i] !== this.#base.row[i];
      for (let i = 0; i < g.col.length && !changed; i++) changed = g.col[i] !== this.#base.col[i];''',
                '      changed = !model.sparseAccumulator.reuseTopologyMatches();')
cache = replace(cache, 'weights.byteLength + 3 * n;', 'weights.byteLength + n;')
cache = replace(cache, 'this.#weightDirty = new Uint8Array(n); this.#changed = new Uint8Array(n); this.#mask = new Uint8Array(n);',
                'this.#weightDirty = new Uint8Array(n);\n      model.sparseAccumulator.resetReuseReference(this.#base.row, this.#base.col, this.#base.weight);')
start = cache.index('    // One shared canonical weight vector')
end = cache.index('  copyRow(', start)
cache = cache[:start] + '''    if (!changed) model.sparseAccumulator.populateReuseWeightDirty(this.#weightDirty);
    const ref = this.#reference;
    if (ref) for (let j = 0; j < n; j++) model.sparseAccumulator.reuseBaseDirty[j] = Number(
      !Object.is(model.saturation, ref.saturation) || this.#weightDirty[j] || ref.weightDirty[j]
      || !Object.is(model.drive[j], ref.drive[j]) || !Object.is(model.alpha[j], ref.alpha[j]));
  }
  mask(model, step) {
    if (!this.#reference) return null;
    return model.sparseAccumulator.classifyReuse(model.h[step], this.#reference.h[step]);
  }
''' + cache[end:]
(ROOT / CACHE).write_text(cache, encoding='utf-8', newline='')

trainer = (ROOT / '.codebase/src/supervised-baselines/trainer-reuse-candidate.mjs').read_text(encoding='utf-8')
trainer = trainer.replace('../runtime/sparse-accumulator-masked-candidate.mjs', '../runtime/sparse-accumulator-reuse-wasm-candidate.mjs')
trainer = trainer.replace('../runtime/frame-reuse-cache.mjs', '../runtime/frame-reuse-cache-wasm-candidate.mjs')
trainer = replace(trainer, 'new FrameReuseCache();', 'new FrameReuseCache(256 * 2 ** 20, this.sparseAccumulator.reuseReservedBytes);')
(ROOT / TRAINER).write_text(trainer, encoding='utf-8', newline='')
paths = [KERNEL, CACHE, TRAINER]
print(json.dumps({'prepared': paths, 'sources': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in paths},
                  'tested': False, 'adopted': False, 'v1Unchanged': True}))

import test from 'node:test';
import assert from 'node:assert/strict';
import { SparseAccumulator } from '../../src/runtime/sparse-accumulator.mjs';

test('WASM sums preserve serial f64 order, empty rows and refreshed inputs in both precisions', () => {
  for (const Type of [Float32Array, Float64Array]) {
    const graph = { row: Int32Array.of(0, 0, 3, 4, 7), col: Int32Array.of(0, 1, 3, 2, 0, 2, 3) };
    const acc = new SparseAccumulator(graph, Type);
    const large = Type === Float32Array ? 2 ** 30 : 1e16;
    const weight = Type.of(large, 1, -large, -.5, 2, -3, 4);
    const drive = Type.of(.25, .5, 2, -4), previous = Type.of(1, 1, .25, 1);
    const reference = () => Array.from(drive, (z, j) => {
      for (let k = graph.row[j]; k < graph.row[j + 1]; k++) z += weight[k] * previous[graph.col[k]];
      return z;
    });
    const bytes = acc.memory.buffer.byteLength;
    for (let i = 0; i < 3; i++) {
      acc.prepare(weight, drive);
      assert.deepEqual([...acc.accumulate(previous)], reference());
      assert.equal(acc.memory.buffer.byteLength, bytes);
      weight[1] += .25; drive[0] += .5; previous[2] += .25; graph.col[3] = i % 2;
    }
    graph.col[0] = 4; acc.prepare(weight, drive);
    assert.throws(() => acc.accumulate(previous), /Nonfinite recurrent/);
    graph.col[0] = 0; graph.row[1] = 8; acc.prepare(weight, drive);
    assert.throws(() => acc.accumulate(previous), /Nonfinite recurrent/);
    graph.row[0] = -1;
    assert.throws(() => acc.prepare(weight, drive), /shape/);
  }
  // The layout rejects an oversized graph before allocating linear memory.
  assert.throws(() => new SparseAccumulator({ row: Int32Array.of(0, 20000000), col: { length: 20000000 } }, Float32Array), /scratch limit/);
});

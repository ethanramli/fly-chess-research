import assert from 'node:assert/strict';
import test from 'node:test';
import { treeKernel } from '../../../research/reports/apl-locality-feasibility-2026-11-01/tree-kernel-prototype.mjs';

test('computational tree filter agrees with independent path enumeration and source superposition', () => {
  const parent = [-1, 0, 0, 1, 1, 2, 5], length = [0, 0, 3, 2, 7, 1, 4];
  const distance = (a, b) => {
    const path = new Map(); let d = 0;
    while (a >= 0) { path.set(a, d); d += length[a]; a = parent[a]; }
    d = 0;
    while (!path.has(b)) { d += length[b]; b = parent[b]; }
    return d + path.get(b);
  };
  for (const scale of [.1, 1, 50, 1e6]) {
    const input = [1, 2, 0, 4, 0, 1, 3], actual = treeKernel(parent, length, input, scale);
    for (let v = 0; v < parent.length; v++) {
      const expected = input.reduce((sum, x, u) => sum + x * Math.exp(-distance(u, v) / scale), 0);
      assert.ok(Math.abs(actual[v] - expected) < 1e-10);
    }
    const components = input.map((x, i) => treeKernel(parent, length, input.map((_, j) => i === j ? x : 0), scale));
    for (let v = 0; v < parent.length; v++) assert.ok(Math.abs(actual[v] - components.reduce((sum, c) => sum + c[v], 0)) < 1e-10);
  }
  for (const args of [
    [[], [], [], 1], [[-1], [0], [1], 0], [[-1, 1], [0, 1], [1, 1], 1],
    [[-1], [0], [NaN], 1], [[-1], [-1], [1], 1], [[-1], [0], [1], Infinity],
    [[-1, 0], [0, 1], [Number.MAX_VALUE, Number.MAX_VALUE], 1],
  ]) assert.throws(() => treeKernel(...args));
});

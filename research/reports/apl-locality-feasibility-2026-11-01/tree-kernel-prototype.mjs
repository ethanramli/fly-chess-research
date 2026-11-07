// Computational spatial kernel only; disconnected from graph propagation and plasticity.
// Input nodes must be topologically ordered, with one root at index zero.
export function treeKernel(parent, length, input, scale) {
  const n = parent.length;
  if (!n || length.length !== n || input.length !== n || !(scale > 0) || !Number.isFinite(scale)) throw Error('Invalid kernel dimensions/scale');
  const subtree = Float64Array.from(input), attenuation = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(input[i]) || !Number.isFinite(length[i]) || length[i] < 0) throw Error('Invalid kernel values');
    if (i === 0 ? parent[i] !== -1 || length[i] !== 0 : !Number.isInteger(parent[i]) || parent[i] < 0 || parent[i] >= i) throw Error('Invalid tree order');
    attenuation[i] = Math.exp(-length[i] / scale);
  }
  for (let i = n - 1; i > 0; i--) subtree[parent[i]] += attenuation[i] * subtree[i];
  const result = Float64Array.from(subtree);
  for (let i = 1; i < n; i++) result[i] += attenuation[i] * (result[parent[i]] - attenuation[i] * subtree[i]);
  if (!result.every(Number.isFinite)) throw Error('Kernel overflow');
  return result;
}

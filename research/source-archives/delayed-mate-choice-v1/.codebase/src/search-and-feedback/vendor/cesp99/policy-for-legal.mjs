// Carlo Esposito, MIT. Exact extracted legal-softmax helper; see LICENSE.
export function policyForLegal(policy, legalIdx, temperature = 1) {
  const L = legalIdx.length;
  const p = new Float32Array(L);
  if (L === 0) return p;
  const invT = 1 / Math.max(temperature, 1e-6);
  let mx = -Infinity;
  for (let i = 0; i < L; i++) { const v = policy[legalIdx[i]] * invT; p[i] = v; if (v > mx) mx = v; }
  let sum = 0;
  for (let i = 0; i < L; i++) { const e = Math.exp(p[i] - mx); p[i] = e; sum += e; }
  for (let i = 0; i < L; i++) p[i] /= sum;
  return p;
}

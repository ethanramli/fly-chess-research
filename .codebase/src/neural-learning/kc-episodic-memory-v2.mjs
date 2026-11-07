// Engineered memory v2 (2026-11-03, disclosed aid allowed by the researcher on 2026-11-01). Stores a feature vector per experienced board with its verified outcome; scores a vector from its k nearest stored vectors. Not a biological mechanism. Design: documentation/design/neural-learning/engineered-memory-test-v2.md
import { createHash } from 'node:crypto';
import { mulberry32 } from './memory-assay-fixture.mjs';

const isPosInt = (x) => Number.isSafeInteger(x) && x > 0;

function checkVector(vector, dim) {
  if (!(vector instanceof Float64Array) || vector.length === 0) throw new Error('Vector must be a non-empty Float64Array');
  for (let j = 0; j < vector.length; j++) if (!Number.isFinite(vector[j])) throw new Error('Vector values must be finite');
  if (dim !== null && vector.length !== dim) throw new Error('Dimension mismatch');
}

export class NearestEpisodeMemory {
  #fp = null;

  constructor({ capacity = 256, k = 3 } = {}) {
    if (!isPosInt(capacity) || !isPosInt(k)) throw new Error('capacity and k must be positive safe integers');
    this.capacity = capacity;
    this.k = k;
    this.entries = [];
    this.dim = null;
    this.writes = 0;
  }

  get size() {
    return this.entries.length;
  }

  write(vector, value, evidenceHash) {
    if (value !== -1 && value !== 1) throw new Error('Value must be -1 or +1');
    checkVector(vector, this.dim);
    if (typeof evidenceHash !== 'string' || evidenceHash === '') throw new Error('evidenceHash must be a non-empty string');
    if (this.dim === null) this.dim = vector.length;

    const same = (a) => {
      for (let j = 0; j < a.length; j++) if (a[j] !== vector[j]) return false;
      return true;
    };
    const i = this.entries.findIndex((e) => same(e.vector));
    if (i >= 0) {
      const [e] = this.entries.splice(i, 1);
      e.value = value;
      e.evidenceHash = evidenceHash;
      this.entries.push(e);
    } else {
      this.entries.push({ vector: Float64Array.from(vector), value, evidenceHash });
      if (this.entries.length > this.capacity) this.entries.shift();
    }
    this.writes++;
    this.#fp = null;
  }

  score(vector) {
    if (this.entries.length === 0) return 0;
    checkVector(vector, this.dim);
    const d2 = this.entries.map((e) => {
      let s = 0;
      const a = e.vector;
      for (let j = 0; j < a.length; j++) {
        const d = a[j] - vector[j];
        s += d * d;
      }
      return s;
    });
    const exact = d2.indexOf(0);
    if (exact >= 0) return this.entries[exact].value;

    // Equal distances: the more recently updated entry (larger index) comes first.
    const order = d2.map((_, i) => i).sort((a, b) => d2[a] - d2[b] || b - a).slice(0, this.k);
    let num = 0;
    let den = 0;
    for (const i of order) {
      const w = 1 / Math.sqrt(d2[i]);
      num += w * this.entries[i].value;
      den += w;
    }
    return num / den;
  }

  fingerprint() {
    if (this.#fp === null) {
      const h = createHash('sha256');
      h.update(JSON.stringify({ capacity: this.capacity, k: this.k, dim: this.dim }));
      for (const e of this.entries) {
        h.update(JSON.stringify([e.value, e.evidenceHash]));
        h.update(Buffer.from(e.vector.buffer, e.vector.byteOffset, e.vector.byteLength));
      }
      this.#fp = h.digest('hex');
    }
    return this.#fp;
  }
}

export function rmsScaler(vectors, eps = 1e-6) {
  if (!Array.isArray(vectors) || vectors.length === 0) throw new Error('vectors must be a non-empty array');
  const n = vectors[0].length;
  for (const v of vectors) {
    if (!(v instanceof Float64Array) || v.length !== n) throw new Error('All vectors must be Float64Array of the same length');
    for (const x of v) if (!Number.isFinite(x)) throw new Error('Vector values must be finite');
  }
  const rms = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const v of vectors) s += v[i] * v[i];
    rms[i] = Math.sqrt(s / vectors.length);
  }
  const scale = (v) => {
    if (!(v instanceof Float64Array) || v.length !== n) throw new Error('Vector must be a Float64Array of the same length');
    return Float64Array.from(v, (x, i) => x / (rms[i] + eps));
  };
  scale.rmsSha256 = createHash('sha256').update(Buffer.from(rms.buffer)).digest('hex');
  return scale;
}

export function makeRandomExpansion({ inputs, units, fanIn = 6, seed = 20261103 }) {
  if (!isPosInt(inputs) || !isPosInt(units) || !isPosInt(fanIn) || fanIn > inputs) {
    throw new Error('inputs, units and fanIn must be positive safe integers with fanIn <= inputs');
  }
  if (!Number.isSafeInteger(seed)) throw new Error('seed must be a safe integer');

  const rng = mulberry32(seed);
  const table = [];
  for (let u = 0; u < units; u++) {
    const picked = [];
    while (picked.length < fanIn) {
      const idx = Math.floor(rng() * inputs);
      if (!picked.includes(idx)) picked.push(idx);
    }
    table.push(picked);
  }

  const expand = (raw, keepFraction = 1) => {
    if (!(raw instanceof Float64Array) || raw.length !== inputs) throw new Error('raw must be a Float64Array of length inputs');
    if (!(typeof keepFraction === 'number' && keepFraction > 0 && keepFraction <= 1)) throw new Error('keepFraction must be in (0, 1]');
    const out = Float64Array.from(table, (idxs) => idxs.reduce((s, i) => s + raw[i], 0));
    if (keepFraction < 1) {
      const keep = Math.max(1, Math.round(keepFraction * units));
      const order = [...out.keys()].sort((a, b) => out[b] - out[a] || a - b);
      const kept = new Set(order.slice(0, keep));
      for (let u = 0; u < units; u++) if (!kept.has(u)) out[u] = 0;
    }
    return out;
  };
  expand.wiringSha256 = createHash('sha256').update(JSON.stringify(table)).digest('hex');
  return expand;
}

// Engineered memory v1 (2026-11-03, disclosed aid allowed by the researcher on 2026-11-01): stores a feature pattern of each experienced choice with its verified outcome, and scores a new pattern by its most similar stored pattern. It is not a biological mechanism; results are reported for the fly plus this store.
import { createHash } from 'node:crypto';
import { similarBoardRecall } from './transfer-evaluation-v1.mjs';
import { mulberry32 } from './memory-assay-fixture.mjs';

export class KcEpisodicMemory {
  constructor({ capacity = 512 } = {}) {
    this.capacity = capacity;
    this.entries = [];
    this.cachedFingerprint = null;
  }

  get size() { return this.entries.length; }

  write(features, value, evidenceHash) {
    if (value !== -1 && value !== 1) throw Error('Value must be -1 or +1');
    this.entries.push({ cue: toCue(features), value, evidenceHash });
    if (this.entries.length > this.capacity) this.entries.shift();
    this.cachedFingerprint = null;
  }

  score(features) {
    return similarBoardRecall(toCue(features), this.entries).value;
  }

  // Cached until the next write, because JSON of every stored cue is large.
  fingerprint() {
    this.cachedFingerprint ??= createHash('sha256').update(JSON.stringify(this.entries)).digest('hex');
    return this.cachedFingerprint;
  }
}

export function toCue(features) {
  const cue = [];
  for (let i = 0; i < features.length; i++) if (features[i] !== 0) cue.push({ index: i, current: features[i] });
  return cue;
}

// shortcut: dense loop over all features; fine for 5,177 Kenyon cells, use sparse indices if slow.
export function randomProjection(features, dims = 256, seed = 20261103) {
  const out = new Float64Array(dims);
  for (let d = 0; d < dims; d++) {
    const rng = mulberry32(seed ^ ((d * 2654435761) >>> 0));
    let sum = 0;
    for (let i = 0; i < features.length; i++) sum += features[i] * (rng() * 2 - 1);
    out[d] = sum;
  }
  return out;
}

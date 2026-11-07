// External engineered memory, not synaptic physiology. No graph parameters are changed.
import { createHash } from 'node:crypto';

const SCHEMA = 'episodic-consequence-memory-v1';
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');

export class EpisodicConsequenceMemory {
  #entries = new Map();
  #sequence = 0;
  #lastEvent = null;

  constructor({ capacity = 128, dimensions = 134209, maxFeatures = 64, versions = 2 } = {}) {
    if (![capacity, dimensions, maxFeatures, versions].every(Number.isSafeInteger) || capacity < 1 || capacity > 4096
      || dimensions < 1 || dimensions > 1e7 || maxFeatures < 1 || maxFeatures > 256 || versions < 1 || versions > 8) throw Error('Invalid episodic memory bounds');
    this.config = Object.freeze({ capacity, dimensions, maxFeatures, versions });
  }

  #cue(features) {
    if (!Array.isArray(features) || !features.length || features.length > this.config.maxFeatures) throw Error('Invalid sparse cue size');
    const cue = features.map(({ index, current }) => {
      if (!Number.isSafeInteger(index) || index < 0 || index >= this.config.dimensions || !Number.isFinite(current) || current <= 0) throw Error('Invalid sparse cue feature');
      return [index, current];
    }).sort((a, b) => a[0] - b[0]);
    if (cue.some((x, i) => i && x[0] === cue[i - 1][0])) throw Error('Duplicate cue index');
    return cue;
  }

  query(features) {
    const entry = this.#entries.get(JSON.stringify(this.#cue(features)));
    const event = entry?.events.at(-1);
    return event ? { known: true, ...event } : { known: false, value: 0 };
  }

  // The caller must independently verify the consequence and bind evidenceHash to
  // the exact chosen experience. A hash is provenance, not a consequence proof.
  commit(features, { status, sequence, value, evidenceHash }) {
    if (status === 'unknown') return { accepted: false, reason: 'unknown' };
    if (status !== 'verified' || !Number.isSafeInteger(sequence) || sequence < 1 || ![-1, 1].includes(value)
      || typeof evidenceHash !== 'string' || !/^[0-9a-f]{64}$/.test(evidenceHash)) throw Error('Invalid verified event');
    const cue = this.#cue(features), key = JSON.stringify(cue), event = { sequence, value, evidenceHash };
    const fingerprint = sha({ cue, ...event });
    if (sequence === this.#sequence && fingerprint === this.#lastEvent) return { accepted: false, reason: 'duplicate' };
    if (sequence <= this.#sequence) throw Error('Stale or conflicting event sequence');
    const previous = this.#entries.get(key);
    const entry = { cue, events: [...(previous?.events ?? []), event].slice(-this.config.versions) };
    this.#entries.delete(key);
    let evicted = null;
    if (this.#entries.size === this.config.capacity) {
      const oldest = this.#entries.keys().next().value;
      evicted = sha(this.#entries.get(oldest).cue);
      this.#entries.delete(oldest);
    }
    this.#entries.set(key, entry);
    this.#sequence = sequence;
    this.#lastEvent = fingerprint;
    return { accepted: true, cueHash: sha(cue), sequence, evicted };
  }

  snapshot() {
    const body = { schema: SCHEMA, config: this.config, sequence: this.#sequence,
      lastEvent: this.#lastEvent, entries: structuredClone([...this.#entries.values()]) };
    return { ...body, checksum: sha(body) };
  }

  restore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') throw Error('Invalid memory snapshot');
    const { checksum, ...body } = snapshot;
    if (checksum !== sha(body) || body.schema !== SCHEMA || JSON.stringify(body.config) !== JSON.stringify(this.config)
      || !Number.isSafeInteger(body.sequence) || body.sequence < 0 || !Array.isArray(body.entries)
      || body.entries.length > this.config.capacity) throw Error('Incompatible memory snapshot');
    const entries = new Map(), sequences = new Set();
    let last = null, previousLatest = 0;
    for (const entry of body.entries) {
      if (!Array.isArray(entry.cue) || entry.cue.some(x => !Array.isArray(x) || x.length !== 2)) throw Error('Invalid stored cue');
      const cue = this.#cue(entry.cue.map(([index, current]) => ({ index, current }))), key = JSON.stringify(cue);
      if (JSON.stringify(cue) !== JSON.stringify(entry.cue) || entries.has(key) || !Array.isArray(entry.events)
        || !entry.events.length || entry.events.length > this.config.versions) throw Error('Invalid stored entry');
      let previous = 0;
      for (const e of entry.events) {
        if (!Number.isSafeInteger(e.sequence) || e.sequence <= previous || e.sequence > body.sequence || sequences.has(e.sequence)
          || ![-1, 1].includes(e.value) || typeof e.evidenceHash !== 'string' || !/^[0-9a-f]{64}$/.test(e.evidenceHash)) throw Error('Invalid stored event');
        sequences.add(e.sequence); previous = e.sequence;
      }
      const latest = entry.events.at(-1);
      if (latest.sequence <= previousLatest) throw Error('Invalid recency order');
      previousLatest = latest.sequence;
      if (latest.sequence === body.sequence) last = sha({ cue, ...latest });
      entries.set(key, structuredClone(entry));
    }
    if (body.sequence === 0 ? body.entries.length !== 0 || body.lastEvent !== null : last === null || last !== body.lastEvent) throw Error('Invalid terminal event');
    this.#entries = entries; this.#sequence = body.sequence; this.#lastEvent = body.lastEvent;
  }
}

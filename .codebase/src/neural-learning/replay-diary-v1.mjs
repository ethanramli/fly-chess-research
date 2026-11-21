// Replay diary (documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md, sections 4 and 7.1).
// Stores what the fly received (its stimulus and teaching pulse) and offers one older lesson back for replay.
// It never scores positions, never chooses moves, and imports only Node built-ins.
import { createHash } from 'node:crypto';

const M64 = (1n << 64n) - 1n;
const rotl = (x, k) => ((x << BigInt(k)) | (x >> BigInt(64 - k))) & M64;

// First 8 bytes of SHA-256 of "<run seed>|<label>", big-endian (section 4.8).
export function streamSeed(runSeed, label) {
  return createHash('sha256').update(`${runSeed}|${label}`, 'utf8').digest().readBigUInt64BE(0);
}

function splitmix64(state) {
  const next = (state + 0x9e3779b97f4a7c15n) & M64;
  let z = ((next ^ (next >> 30n)) * 0xbf58476d1ce4e5b9n) & M64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & M64;
  return { state: next, value: (z ^ (z >> 31n)) & M64 };
}

// xoshiro256** with its state filled by SplitMix64 from the stream seed.
export class Stream {
  constructor(runSeed, label) {
    let sm = streamSeed(runSeed, label);
    this.s = [];
    for (let i = 0; i < 4; i++) {
      const r = splitmix64(sm);
      sm = r.state;
      this.s.push(r.value);
    }
  }

  next() {
    const s = this.s;
    const result = (rotl((s[1] * 5n) & M64, 7) * 9n) & M64;
    const t = (s[1] << 17n) & M64;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 45);
    return result;
  }

  // Uniform integer in 0..m-1: reject draws that would bias the modulo.
  uniformInt(m) {
    const range = 1n << 64n;
    const limit = range - (range % BigInt(m));
    for (;;) {
      const r = this.next();
      if (r < limit) return Number(r % BigInt(m));
    }
  }

  // Top 53 bits divided by 2^53: a real in [0, 1).
  uniformReal() { return Number(this.next() >> 11n) / 2 ** 53; }

  // Box-Muller, section 4.8: two uniforms in order u1 then u2; u1 of 0 becomes 2^-53; the sine partner is discarded.
  normal() {
    const u1 = this.uniformReal() || 2 ** -53;
    const u2 = this.uniformReal();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  save() { return this.s.map(String); }
  load(words) { this.s = words.map(BigInt); }
}

export const hashStimulus = stimulus => createHash('sha256').update(JSON.stringify(stimulus)).digest('hex');

// Hashes of the diary's entries that also appear in a forbidden set (validation or test inputs). Must be empty.
export function forbiddenOverlap(diary, forbiddenHashes) {
  return diary.entries.filter(e => forbiddenHashes.has(e.stimulusHash)).map(e => e.stimulusHash);
}

const ADMIT_FIELDS = ['stimulus', 'teaching', 'lessonIndex', 'receiptHash'];

export class ReplayDiary {
  constructor({ capacity, runSeed }) {
    if (!Number.isInteger(capacity) || capacity < 1) throw Error('capacity must be a positive integer');
    this.runSeed = runSeed;
    this.capacity = capacity;
    this.entries = [];
    this.lessons = 0; // n in Algorithm R: lessons admitted so far
    this.reservoir = new Stream(runSeed, 'reservoir');
    this.replayStream = new Stream(runSeed, 'replay');
  }

  // Refuses any lesson without a teaching pulse. Only stimulus, teaching and identity fields are read; no verdict enters.
  admit(receipt) {
    const extra = Object.keys(receipt).filter(k => !ADMIT_FIELDS.includes(k));
    if (extra.length) throw Error(`receipt has fields the diary may not read: ${extra.join(', ')}`);
    const { stimulus, teaching, lessonIndex, receiptHash } = receipt;
    if (!Array.isArray(stimulus) || stimulus.length === 0) throw Error('stimulus must be a non-empty list');
    if (!teaching || !['reward', 'punish'].includes(teaching.kind)) throw Error('lesson has no teaching pulse; not a lesson');
    if (!Number.isInteger(lessonIndex)) throw Error('lessonIndex must be an integer');
    if (typeof receiptHash !== 'string') throw Error('receiptHash must be a string');
    const stimulusHash = hashStimulus(stimulus);
    // Correction: the same input replaces its older entry, whatever the pulse.
    this.entries = this.entries.filter(e => e.stimulusHash !== stimulusHash);
    this.lessons += 1;
    const entry = {
      stimulusHash,
      stimulus: JSON.parse(JSON.stringify(stimulus)),
      teaching: { kind: teaching.kind, current: teaching.current },
      lessonIndex,
      receiptHash,
    };
    if (this.entries.length < this.capacity) {
      this.entries.push(entry);
      return;
    }
    const j = this.reservoir.uniformInt(this.lessons);
    if (j < this.capacity) this.entries[j] = entry;
  }

  // One entry chosen uniformly from lessons earlier than lessonIndex, or null. Never looks at the stimulus.
  nextReplay(lessonIndex) {
    const earlier = this.entries.filter(e => e.lessonIndex < lessonIndex);
    if (earlier.length === 0) return null;
    const e = earlier[this.replayStream.uniformInt(earlier.length)];
    return { stimulus: e.stimulus, teaching: e.teaching, lessonIndex: e.lessonIndex };
  }

  state() {
    return JSON.stringify({
      runSeed: String(this.runSeed),
      capacity: this.capacity,
      lessons: this.lessons,
      entries: this.entries,
      reservoir: this.reservoir.save(),
      replay: this.replayStream.save(),
    });
  }

  static restore(text) {
    const o = JSON.parse(text);
    const d = new ReplayDiary({ capacity: o.capacity, runSeed: o.runSeed });
    d.lessons = o.lessons;
    d.entries = o.entries;
    d.reservoir.load(o.reservoir);
    d.replayStream.load(o.replay);
    return d;
  }
}

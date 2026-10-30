// Engineering candidate: derive transient state from a bounded, verified lesson prefix.
// Frozen temporal-feedback-session.mjs remains the canonical legacy implementation.
import assert from 'node:assert/strict';
import {TemporalFeedbackSession} from './temporal-feedback-session.mjs';
import {DerivedNeuralEpisode, neuralStateHash, neuralHashEncoding} from '../neural-learning/derived-neural-episode-candidate.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';

export class DerivedTemporalFeedbackSession extends TemporalFeedbackSession {
  #recovering = false;
  constructor(options) {
    super(options);
    this.episode = new DerivedNeuralEpisode(this.model, {identity: this.identity, maxFrames: 32});
  }
  #available() { assert(!this.#recovering, 'Session recovery is in progress'); }
  start(experience, assessment, options = {}) {
    this.#available(); return this.#start(experience, assessment, options);
  }
  #start(experience, assessment, options) {
    assert(this.pending === null && !this.episode.active, 'Pending lesson must finish first');
    const plan = this.verify(experience, options); if (plan.skipped) return plan;
    const startMemory = this.memory.snapshot(), before = digest(startMemory);
    const binding = this.bind(experience, assessment, before);
    this.episode.begin();
    this.pending = {experience: structuredClone(experience), options: structuredClone(options), plan, binding, cursor: 0,
      startMemory, beforeMemoryHash: before, startEvents: this.memory.events,
      chainHash: digest({schema: 'temporal-derived-chain-v1', plan: plan.identity, binding, before, neuralHashEncoding})};
    return {skipped: false, planIdentity: plan.identity, frameCount: plan.frames.length};
  }
  step() { this.#available(); return this.#step(); }
  #step() {
    const pending = this.pending; assert(pending && pending.cursor < pending.plan.frames.length, 'No pending frame');
    assert.deepEqual(this.verify(pending.experience, pending.options), pending.plan, 'Changed certificate, cue or plan');
    const frame = pending.plan.frames[pending.cursor], beforeMemory = this.memory.snapshot(), beforeEpisode = this.episode.snapshot();
    const beforeHash = digest(beforeMemory), frameIdentity = digest({plan: pending.plan.identity, frame});
    let receipt, chainHash;
    try {
      this.episode.present([0], frame.stimulation, frameIdentity);
      const update = this.memory.observeTrajectory({plasticityEnabled: pending.plan.plasticityEnabled});
      receipt = {schema: 'temporal-frame-receipt-derived-v1', planIdentity: pending.plan.identity, index: pending.cursor,
        frameIdentity, stimulation: structuredClone(frame.stimulation), beforeMemoryHash: beforeHash,
        afterMemoryHash: digest(this.memory.snapshot()), update, neuralStateHash: neuralStateHash(this.episode.state),
        neuralHashEncoding, previousChainHash: pending.chainHash};
      chainHash = digest(receipt);
    } catch (error) {
      this.memory.restore(beforeMemory); this.episode.restore(beforeEpisode); throw error;
    }
    pending.chainHash = chainHash; pending.cursor++;
    return {...receipt, chainHash};
  }
  finish() {
    this.#available();
    assert(this.pending && this.pending.cursor === this.pending.plan.frames.length, 'Incomplete temporal lesson');
    assert.deepEqual(this.verify(this.pending.experience, this.pending.options), this.pending.plan);
    const receipt = {schema: 'temporal-lesson-receipt-derived-v1', plan: this.pending.plan, binding: this.pending.binding,
      beforeMemoryHash: this.pending.beforeMemoryHash, afterMemoryHash: digest(this.memory.snapshot()),
      frameCount: this.pending.cursor, chainHash: this.pending.chainHash, neuralHashEncoding};
    this.episode.end(); this.pending = null; return receipt;
  }
  snapshot() { this.#available(); return this.#snapshot(); }
  #snapshot() {
    return {schema: 'temporal-feedback-session-derived-v1', identity: this.identity,
      memory: this.memory.snapshot(), episode: this.episode.metadata(), pending: structuredClone(this.pending)};
  }
  async restore(value, {pace} = {}) {
    this.#available();
    // Detach before any await, so the caller cannot mutate the recovery contract midway.
    const s = structuredClone(value), e = s.episode;
    assert.equal(s.schema, 'temporal-feedback-session-derived-v1'); assert.equal(s.identity, this.identity);
    assert(s.pending === null || (typeof s.pending === 'object' && s.pending !== null), 'Missing pending lesson');
    assert.equal(e.schema, 'neural-episode-derived-v1'); assert.equal(e.identity, this.identity);
    assert.equal(e.maxFrames, this.episode.maxFrames); assert.equal(e.length, this.episode.state.length);
    assert.equal(e.dtype, this.episode.state instanceof Float32Array ? 'f32' : 'f64');
    assert.equal(e.hashEncoding, neuralHashEncoding); assert(/^[a-f0-9]{64}$/.test(e.stateHash));
    assert(!Object.hasOwn(e, 'state'), 'Derived checkpoint must not contain a transient vector');
    assert(typeof e.active === 'boolean' && Number.isSafeInteger(e.frames) && e.frames >= 0 && e.frames <= e.maxFrames);
    assert(e.frameIdentity === null || /^[a-f0-9]{64}$/.test(e.frameIdentity));
    if (s.pending) {
      const p = s.pending;
      assert.deepEqual(this.verify(p.experience, p.options), p.plan, 'Changed recovery certificate, cue or plan');
      assert(!p.plan.skipped && p.plan.frames.length <= e.maxFrames);
      assert(Number.isSafeInteger(p.cursor) && p.cursor >= 0 && p.cursor <= p.plan.frames.length);
      assert.equal(e.active, true); assert.equal(e.frames, p.cursor);
      assert.equal(digest(p.startMemory), p.beforeMemoryHash);
      assert.equal(p.startMemory.events, p.startEvents);
      assert.equal(s.memory.events, p.startEvents + (p.plan.plasticityEnabled ? p.cursor : 0));
      assert.deepEqual(this.bind(p.experience, p.binding.assessment, p.beforeMemoryHash), p.binding);
      if (p.cursor > 0) assert.equal(typeof pace, 'function', 'Recovery requires explicit per-frame pacing');
    } else { assert.equal(e.active, false); assert.equal(e.frameIdentity, null); }
    const oldMemory = this.memory.snapshot(), oldEpisode = this.episode.snapshot(), oldPending = structuredClone(this.pending);
    this.#recovering = true;
    try {
      this.pending = null; this.episode.active = false; this.episode.state.fill(0); this.episode.frameIdentity = null;
      if (s.pending) {
        this.memory.restore(s.pending.startMemory);
        this.#start(s.pending.experience, s.pending.binding.assessment, s.pending.options);
        for (let index = 0; index < s.pending.cursor; index++) {
          let calls = 0, allowed = true, violated = false;
          try {
            await pace(() => {
              if (!allowed || calls !== 0) { violated = true; throw Error('Recovery pacing callback must invoke exactly one frame'); }
              calls++; return this.#step();
            });
            assert.equal(calls, 1, 'Recovery pacing callback omitted its frame');
            assert.equal(violated, false, 'Recovery pacing callback attempted a duplicate frame');
          } finally { allowed = false; }
        }
      } else {
        this.memory.restore(s.memory); this.episode.frames = e.frames;
      }
      // Includes the new receipt chain, every memory field and all episode metadata/digest.
      assert.deepEqual(this.#snapshot(), s, 'Reconstructed episode differs from published checkpoint');
      return {schema: 'derived-episode-recovery-v1', reconstructedFrames: s.pending?.cursor ?? 0};
    } catch (error) {
      this.memory.restore(oldMemory); this.episode.restore(oldEpisode); this.pending = oldPending; throw error;
    } finally { this.#recovering = false; }
  }
}

// Bounded transient neural continuity. No reward, plasticity or teacher deltas.
// Physiological time is uncalibrated; frame identity is supplied by the caller.
export class NeuralEpisode {
  constructor(model, { identity, maxFrames = 32 }) {
    if (!/^[a-f0-9]{64}$/.test(identity) || !Number.isSafeInteger(maxFrames)
      || maxFrames < 1 || maxFrames > 32 || model.n > 262144)
      throw Error('Require pinned episode identity and bounded dimensions');
    this.model = model; this.identity = identity; this.maxFrames = maxFrames;
    this.state = new model.h[0].constructor(model.n);
    this.active = false; this.frames = 0; this.frameIdentity = null;
  }
  begin() {
    if (this.active) throw Error('Episode already active');
    this.state.fill(0); this.frames = 0; this.frameIdentity = null; this.active = true;
  }
  present(input, stimulation, frameIdentity) {
    if (!this.active || this.frames >= this.maxFrames || !/^[a-f0-9]{64}$/.test(frameIdentity))
      throw Error('Inactive, exhausted or unbound episode frame');
    const prediction = this.model.forward(input, stimulation, this.state);
    this.state.set(this.model.h[this.model.steps]);
    this.frames++; this.frameIdentity = frameIdentity;
    return prediction;
  }
  end() {
    if (!this.active) throw Error('No active episode');
    this.active = false; this.state.fill(0); this.frameIdentity = null;
  }
  snapshot() {
    return { schema: 'neural-episode-v1', identity: this.identity, maxFrames: this.maxFrames,
      active: this.active, frames: this.frames, frameIdentity: this.frameIdentity, state: [...this.state] };
  }
  restore(s) {
    if (s.schema !== 'neural-episode-v1' || s.identity !== this.identity || s.maxFrames !== this.maxFrames
      || typeof s.active !== 'boolean' || !Number.isSafeInteger(s.frames) || s.frames < 0 || s.frames > this.maxFrames
      || (s.frameIdentity !== null && !/^[a-f0-9]{64}$/.test(s.frameIdentity))
      || (s.active && s.frames > 0 && s.frameIdentity === null)
      || (!s.active && (s.frameIdentity !== null || s.state?.some(v => v !== 0)))
      || !Array.isArray(s.state) || s.state.length !== this.state.length
      || !s.state.every(v => Number.isFinite(v) && v >= 0 && v <= this.model.saturation))
      throw Error('Incompatible transient episode checkpoint');
    this.state.set(s.state); this.active = s.active; this.frames = s.frames; this.frameIdentity = s.frameIdentity;
  }
}

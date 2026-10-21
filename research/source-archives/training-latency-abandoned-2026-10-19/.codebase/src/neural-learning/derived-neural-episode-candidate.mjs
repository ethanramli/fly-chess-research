// Candidate evidence/rollback representation; the original episode dynamics are inherited.
import {createHash} from 'node:crypto';
import {endianness} from 'node:os';
import {NeuralEpisode} from './neural-episode.mjs';

export const neuralHashEncoding = 'neural-state-le-bytes-v1';

export function neuralStateHash(state) {
  if (!(state instanceof Float32Array || state instanceof Float64Array)
    || state.length > 262144 || !state.every(Number.isFinite))
    throw Error('Require bounded finite typed neural state');
  const dtype = state instanceof Float32Array ? 'f32' : 'f64';
  let bytes = Buffer.from(state.buffer, state.byteOffset, state.byteLength);
  if (endianness() !== 'LE') {
    bytes = Buffer.from(bytes);
    if (dtype === 'f32') bytes.swap32(); else bytes.swap64();
  }
  return createHash('sha256').update(JSON.stringify({schema: neuralHashEncoding, dtype, length: state.length}) + '\n')
    .update(bytes).digest('hex');
}

export class DerivedNeuralEpisode extends NeuralEpisode {
  // Used only for in-memory rollback, never for durable publication.
  snapshot() {
    return {schema: 'neural-episode-typed-rollback-v1', identity: this.identity, maxFrames: this.maxFrames,
      active: this.active, frames: this.frames, frameIdentity: this.frameIdentity, state: this.state.slice()};
  }
  restore(s) {
    if (s.schema !== 'neural-episode-typed-rollback-v1' || s.identity !== this.identity || s.maxFrames !== this.maxFrames
      || typeof s.active !== 'boolean' || !Number.isSafeInteger(s.frames) || s.frames < 0 || s.frames > this.maxFrames
      || (s.frameIdentity !== null && !/^[a-f0-9]{64}$/.test(s.frameIdentity))
      || (s.active && s.frames > 0 && s.frameIdentity === null)
      || (s.frames === 0 && s.frameIdentity !== null)
      || !(s.state instanceof this.state.constructor) || s.state.length !== this.state.length
      || !s.state.every(v => Number.isFinite(v) && v >= 0 && v <= this.model.saturation)
      || (!s.active && (s.frameIdentity !== null || s.state.some(v => v !== 0))))
      throw Error('Incompatible typed episode rollback');
    this.state.set(s.state); this.active = s.active; this.frames = s.frames; this.frameIdentity = s.frameIdentity;
  }
  metadata() {
    return {schema: 'neural-episode-derived-v1', identity: this.identity, maxFrames: this.maxFrames,
      active: this.active, frames: this.frames, frameIdentity: this.frameIdentity, length: this.state.length,
      dtype: this.state instanceof Float32Array ? 'f32' : 'f64', hashEncoding: neuralHashEncoding,
      stateHash: neuralStateHash(this.state)};
  }
}

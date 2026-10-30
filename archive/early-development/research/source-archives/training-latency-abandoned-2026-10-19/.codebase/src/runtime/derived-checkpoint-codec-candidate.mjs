// Explicit candidate format: no implicit legacy conversion and no transient vector.
import {serialize, deserialize} from 'node:v8';
import {createHash} from 'node:crypto';
import {zstdCompressSync, zstdDecompressSync, constants} from 'node:zlib';

const LIMIT = 16 * 2 ** 20, MAGIC = Buffer.from('FCD1'), SCHEMA = 'fly-checkpoint-derived-v1';
const hash = bytes => createHash('sha256').update(bytes).digest();
function check(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw Error('Invalid derived checkpoint state');
  if (state.session !== null && state.session !== undefined) {
    const session = state.session, episode = session.episode;
    if (session.schema !== 'temporal-feedback-session-derived-v1' || episode?.schema !== 'neural-episode-derived-v1'
      || Object.hasOwn(episode, 'state') || !Number.isSafeInteger(episode.length) || episode.length < 1 || episode.length > 262144
      || !['f32', 'f64'].includes(episode.dtype) || episode.hashEncoding !== 'neural-state-le-bytes-v1'
      || !/^[a-f0-9]{64}$/.test(episode.stateHash)) throw Error('Invalid derived session envelope');
  }
}
export function encodeDerivedCheckpoint(state) {
  check(state);
  const plain = serialize({schema: SCHEMA, state});
  if (plain.length > LIMIT) throw Error('Checkpoint exceeds bound');
  const compressed = zstdCompressSync(plain, {params: {[constants.ZSTD_c_compressionLevel]: 1}});
  if (compressed.length + 36 > LIMIT) throw Error('Checkpoint exceeds bound');
  return Buffer.concat([MAGIC, hash(compressed), compressed]);
}
export function decodeDerivedCheckpoint(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 36 || bytes.length > LIMIT || !bytes.subarray(0, 4).equals(MAGIC)
    || !hash(bytes.subarray(36)).equals(bytes.subarray(4, 36))) throw Error('Invalid derived checkpoint');
  const envelope = deserialize(zstdDecompressSync(bytes.subarray(36), {maxOutputLength: LIMIT}));
  if (envelope?.schema !== SCHEMA) throw Error('Unknown derived checkpoint schema');
  check(envelope.state); return envelope.state;
}

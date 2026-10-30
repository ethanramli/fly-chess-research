// Lossless disk representation only; in-memory schemas and receipt hashes stay unchanged.
import {gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync, constants} from 'node:zlib';
import {createHash} from 'node:crypto';
import {endianness} from 'node:os';

const LIMIT = 16 * 2 ** 20, MAX_NEURONS = 262144;
const schema = 'fly-checkpoint-f64-v1';
const fail = () => { throw Error('Invalid binary checkpoint'); };
const magic = Buffer.from('FCB1');
const hash = bytes => createHash('sha256').update(bytes).digest();

export function encodeCheckpoint(state, compression = 'gzip') {
  if (!['gzip', 'brotli'].includes(compression)) fail();
  const episode = state.session?.episode;
  let packed = state;
  if (episode) {
    const values = episode.state;
    if (!Array.isArray(values) || values.length > MAX_NEURONS || !values.every(Number.isFinite)) fail();
    const bytes = Buffer.from(Float64Array.from(values).buffer);
    if (endianness() !== 'LE') bytes.swap64();
    packed = {...state, session: {...state.session, episode: {...episode,
      state: {encoding: 'f64le-base64', length: values.length, data: bytes.toString('base64')}}}};
  }
  const json = JSON.stringify({schema, state: packed}) + '\n';
  if (Buffer.byteLength(json) > LIMIT) throw Error('Checkpoint exceeds bound');
  if (compression === 'gzip') return gzipSync(json, {level: 1});
  const compressed = brotliCompressSync(json, {params: {[constants.BROTLI_PARAM_QUALITY]: 0}});
  return Buffer.concat([magic, hash(compressed), compressed]);
}

export function decodeCheckpoint(bytes) {
  if (bytes.length > LIMIT) throw Error('Checkpoint exceeds bound');
  const brotli = bytes.subarray(0, 4).equals(magic);
  if (brotli && (bytes.length < 36 || !hash(bytes.subarray(36)).equals(bytes.subarray(4, 36)))) fail();
  const plain = brotli ? brotliDecompressSync(bytes.subarray(36), {maxOutputLength: LIMIT})
    : gunzipSync(bytes, {maxOutputLength: LIMIT});
  const value = JSON.parse(plain.toString('utf8').replace(/^\uFEFF/, ''));
  // Existing gzip JSON publications remain readable without conversion.
  if (value.schema !== schema) return value;
  const state = value.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) fail();
  const episode = state.session?.episode;
  if (episode) {
    const encoded = episode.state;
    if (encoded?.encoding !== 'f64le-base64' || !Number.isSafeInteger(encoded.length)
      || encoded.length < 0 || encoded.length > MAX_NEURONS || typeof encoded.data !== 'string'
      || encoded.data.length !== 4 * Math.ceil(encoded.length * 8 / 3)) fail();
    const binary = Buffer.from(encoded.data, 'base64');
    if (binary.length !== encoded.length * 8 || binary.toString('base64') !== encoded.data) fail();
    // Copy to aligned private storage before exposing a typed view.
    const aligned = Uint8Array.from(binary);
    if (endianness() !== 'LE') Buffer.from(aligned.buffer).swap64();
    episode.state = Array.from(new Float64Array(aligned.buffer));
    if (!episode.state.every(Number.isFinite)) fail();
  }
  return state;
}

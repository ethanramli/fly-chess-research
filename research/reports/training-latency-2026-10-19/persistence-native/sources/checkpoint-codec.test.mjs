import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync, gunzipSync} from 'node:zlib';
import {encodeCheckpoint, encodeNativeCheckpoint, decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';

test('binary checkpoint preserves full neural state and pending acknowledgement without mutating input', () => {
  const original = {sequence: 19, receiptCount: 8, logBytes: 157, chainHash: 'f'.repeat(64),
    pendingReceipt: {sequence: 8, kind: 'frame', afterMemoryHash: 'a'.repeat(64)},
    session: {pending: {cursor: 3}, memory: {events: 3, gains: [0.2, 1.8], short: [0.1, 0.2]},
      episode: {schema: 'neural-episode-v1', active: true, state:
        Array.from({length: 139255}, (_, i) => i === 0 ? -0 : i === 1 ? Number.MIN_VALUE : Math.sin(i) ** 2)}}};
  const before = structuredClone(original), encoded = encodeCheckpoint(original);
  assert.deepEqual(decodeCheckpoint(encoded), before);
  assert.deepEqual(original, before);
  assert.equal(gunzipSync(encoded).includes(Buffer.from('f64le-base64')), true);
  assert.deepEqual(decodeCheckpoint(encodeCheckpoint(original, 'brotli')), before);
  assert.deepEqual(decodeCheckpoint(encodeNativeCheckpoint(original)), before);
  const float32 = structuredClone(original);
  float32.session.episode.state = Array.from(Float32Array.of(-0, 0.1, 1));
  assert.deepEqual(decodeCheckpoint(encodeNativeCheckpoint(float32)), float32);
  assert.deepEqual(decodeCheckpoint(encodeNativeCheckpoint({...original, session: null})), {...original, session: null});
  assert.deepEqual(decodeCheckpoint(encodeCheckpoint({...original, session: null})), {...original, session: null});
  const legacy = {...original, session: {episode: {state: [0, 0.1, 1]}}};
  assert.deepEqual(decodeCheckpoint(gzipSync(JSON.stringify(legacy))), legacy);
});

test('binary checkpoint rejects corrupt, oversized and malformed state instead of resuming it', () => {
  const state = {session: {episode: {state: [0.1, 0.2]}}};
  for (const values of [[NaN], [Infinity], new Array(262145).fill(0)])
    assert.throws(() => encodeCheckpoint({session: {episode: {state: values}}}));
  const encoded = encodeCheckpoint(state), corrupt = Buffer.from(encoded);
  corrupt[corrupt.length - 5] ^= 0xff;
  assert.throws(() => decodeCheckpoint(corrupt));
  const brotli = encodeCheckpoint(state, 'brotli');
  brotli[brotli.length - 1] ^= 1;
  assert.throws(() => decodeCheckpoint(brotli), /Invalid binary checkpoint/);
  assert.throws(() => encodeCheckpoint(state, 'unknown'), /Invalid binary checkpoint/);
  const native = encodeNativeCheckpoint(state);
  native[native.length - 1] ^= 1;
  assert.throws(() => decodeCheckpoint(native), /Invalid binary checkpoint/);
  assert.throws(() => decodeCheckpoint(Buffer.alloc(16 * 2 ** 20 + 1)), /bound/);
  assert.throws(() => decodeCheckpoint(gzipSync(' '.repeat(16 * 2 ** 20 + 1))));
  for (const edit of [e => e.length++, e => e.data = '!'.repeat(e.data.length),
    e => e.encoding = 'float32', e => e.length = 262145]) {
    const envelope = JSON.parse(gunzipSync(encoded));
    edit(envelope.state.session.episode.state);
    assert.throws(() => decodeCheckpoint(gzipSync(JSON.stringify(envelope))), /Invalid binary checkpoint/);
  }
});

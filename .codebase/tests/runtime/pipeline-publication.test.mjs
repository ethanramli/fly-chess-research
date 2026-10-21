// Exercise the literal benchmark save routine against the frozen original without graph execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync, gunzipSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
import {encodeNativeCheckpoint, decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';

const original = readFileSync(new URL('../../scripts/neural-learning/run-g0-reversal-history-diagnostic.mjs', import.meta.url), 'utf8')
  .match(/^function save\(\)\{[\s\S]*?^\}/m)?.[0];
const candidate = readFileSync(new URL('../../scripts/evaluation-and-performance/profile-g0-training-pipeline.mjs', import.meta.url), 'utf8')
  .match(/^  function save\(\) \{[\s\S]*?^  \}/m)?.[0];
assert(original && candidate, 'Locate both actual save functions rather than a copied test implementation');
const fixture = () => ({sequence: 5, receiptCount: 2, pendingReceipt: {kind: 'frame', sequence: 2},
  session: {episode: {state: Array.from(Float32Array.of(0, .1, 1.25))}, memory: {events: 3, gains: [.2, 1.8]}}});
function execute(source, variant, {oversized = false, compressionFailure = false} = {}) {
  const events = [], writes = [], state = fixture();
  const compress = fn => value => {
    events.push('compress');
    if (compressionFailure) throw Error('Injected compression failure');
    return fn(value);
  };
  const context = {state, variant, directory: 'out', a: {out: 'out'}, join, assert,
    Buffer: {byteLength(value) {events.push('bound'); return oversized ? 17 * 2 ** 20 : Buffer.byteLength(value);}},
    timed: (name, fn) => fn(), gzipSync: compress(gzipSync), encodeNativeCheckpoint: compress(encodeNativeCheckpoint),
    openSync(path, flag) {assert.equal(flag, 'wx'); events.push('open'); return 1;},
    writeFileSync(fd, bytes) {assert.equal(fd, 1); events.push('write'); writes.push(bytes);},
    fsyncSync() {events.push('fsync');}, closeSync() {events.push('close');},
    renameSync() {events.push('rename');}};
  let error = null;
  try {runInNewContext(`let lastCheckpoint = null; ${source}; save();`, context);} catch (caught) {error = caught;}
  return {events, writes, state, error};
}

test('benchmark baseline preserves original save order, durable calls and exact gzip JSON', () => {
  const expected = execute(original, 'json6'), actual = execute(candidate, 'json6');
  assert.equal(expected.error, null); assert.equal(actual.error, null);
  assert.deepEqual(expected.events, ['bound', 'open', 'compress', 'write', 'fsync', 'close', 'rename']);
  assert.deepEqual(actual.events, expected.events); assert.deepEqual(actual.writes, expected.writes);
  assert.deepEqual(JSON.parse(gunzipSync(actual.writes[0])), actual.state);
  const native = execute(candidate, 'nativeZstd1');
  assert.equal(native.error, null); assert.deepEqual(decodeCheckpoint(native.writes[0]), actual.state);
});

test('size and compression failures do not publish a checkpoint; open descriptors always close', () => {
  for (const source of [original, candidate]) {
    const oversized = execute(source, 'json6', {oversized: true});
    assert(oversized.error); assert.deepEqual(oversized.events, ['bound']);
    const failed = execute(source, 'json6', {compressionFailure: true});
    assert.match(failed.error?.message ?? '', /Injected compression failure/);
    assert.deepEqual(failed.events, ['bound', 'open', 'compress', 'close']);
  }
  const native = execute(candidate, 'nativeZstd1', {compressionFailure: true});
  assert.match(native.error?.message ?? '', /Injected compression failure/);
  assert.deepEqual(native.events, ['open', 'compress', 'close']);
});

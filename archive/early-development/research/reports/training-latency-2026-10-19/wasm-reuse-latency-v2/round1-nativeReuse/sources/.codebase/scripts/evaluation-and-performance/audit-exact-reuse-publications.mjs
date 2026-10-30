// Independent disk/evidence/timing audit. Does not import the candidate checkpoint codec or run a graph.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync, openSync, closeSync, readSync, writeFileSync, fsyncSync, renameSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync, zstdDecompressSync} from 'node:zlib';
import {deserialize} from 'node:v8';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {createReadStream} from 'node:fs';
import os from 'node:os';

const LIMIT = 16 * 2 ** 20;
const sha = value => createHash('sha256').update(value).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
async function fileHash(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}
function readState(path) {
  assert(statSync(path).size <= LIMIT);
  const bytes = readFileSync(path);
  if (bytes.subarray(0, 4).toString() !== 'FCZ1')
    return JSON.parse(gunzipSync(bytes, {maxOutputLength: LIMIT}));
  assert(bytes.length >= 36); assert.equal(sha(bytes.subarray(36)), bytes.subarray(4, 36).toString('hex'));
  const envelope = deserialize(zstdDecompressSync(bytes.subarray(36), {maxOutputLength: LIMIT}));
  assert.equal(envelope.schema, 'fly-checkpoint-native-v1');
  const episode = envelope.state?.session?.episode;
  if (episode) {
    assert(episode.state instanceof Float32Array || episode.state instanceof Float64Array);
    assert(episode.state.length <= 262144 && episode.state.every(Number.isFinite));
    episode.state = Array.from(episode.state);
  }
  return envelope.state;
}
function publications(directory, extension) {
  const names = readdirSync(directory);
  assert(!names.some(name => name.endsWith('.partial')), 'Incomplete publication in completed sample');
  return names.filter(name => /^checkpoint-\d+\.(?:json\.gz|checkpoint)$/.test(name))
    .map(name => {assert(name.endsWith(extension)); return name;})
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
}
function prefixHash(path, length) {
  const h = createHash('sha256'), buffer = Buffer.alloc(65536), fd = openSync(path, 'r');
  try {
    for (let position = 0; position < length;) {
      const count = readSync(fd, buffer, 0, Math.min(buffer.length, length - position), position);
      assert(count > 0, 'Truncated receipt prefix'); h.update(buffer.subarray(0, count)); position += count;
    }
  } finally {closeSync(fd);}
  return h.digest('hex');
}
const body = ({sequence, receiptCount, logBytes, chainHash, pendingReceipt, ...state}) => state;

export async function verifyLessonPair(baseline, native, unit, expected, {sourceReceipts, steps, guard, pace}) {
  assert.equal(sha(readFileSync(unit.parent)), unit.parentSha256);
  const parent = readState(unit.parent), beforeFiles = publications(baseline, '.checkpoint'), afterFiles = publications(native, '.checkpoint');
  assert.equal(expected.length, 21); assert.equal(beforeFiles.length, 42); assert.equal(afterFiles.length, 42);
  let sequence = parent.sequence, count = parent.receiptCount, logBytes = parent.logBytes, chain = parent.chainHash;
  let finalState;
  for (let i = 0; i < expected.length; i++) {
    guard(); const cpu = process.cpuUsage();
    const pending = readState(join(baseline, beforeFiles[2 * i])), acknowledged = readState(join(baseline, beforeFiles[2 * i + 1]));
    const nativePending = readState(join(native, afterFiles[2 * i])), nativeAck = readState(join(native, afterFiles[2 * i + 1]));
    // Compare actual decoded values at every publication, including signed zero, not just a checksum or final choice.
    assert.deepEqual(nativePending, pending); assert.deepEqual(nativeAck, acknowledged);
    assert.equal(pending.sequence, ++sequence); assert.equal(acknowledged.sequence, ++sequence);
    for (const files of [beforeFiles, afterFiles]) {
      assert.equal(Number(files[2 * i].match(/\d+/)[0]), pending.sequence);
      assert.equal(Number(files[2 * i + 1].match(/\d+/)[0]), acknowledged.sequence);
    }
    assert.deepEqual(pending.identity, parent.identity); assert.deepEqual(acknowledged.identity, parent.identity);
    assert.equal(pending.receiptCount, count); assert.equal(pending.logBytes, logBytes); assert.equal(pending.chainHash, chain);
    assert.deepEqual(pending.pendingReceipt, expected[i]); assert.equal(expected[i].sequence, count);
    assert.equal(expected[i].previousChainHash, chain);
    count++; logBytes += Buffer.byteLength(JSON.stringify(expected[i]) + '\n'); chain = sha(JSON.stringify(expected[i]));
    assert.equal(acknowledged.receiptCount, count); assert.equal(acknowledged.logBytes, logBytes);
    assert.equal(acknowledged.chainHash, chain); assert.equal(acknowledged.pendingReceipt, null);
    assert.deepEqual(body(pending), body(acknowledged), 'Acknowledgement changed physiological state');
    finalState = acknowledged; guard(); await pace(cpu);
  }
  const sourceHash = prefixHash(sourceReceipts, logBytes);
  for (const directory of [baseline, native]) {
    const path = join(directory, 'receipts.jsonl'); assert.equal(statSync(path).size, logBytes);
    assert.equal(prefixHash(path, logBytes), sourceHash, 'Changed original receipt prefix or lesson');
  }
  const samples = [json(join(baseline, 'sample.json')), json(join(native, 'sample.json'))];
  for (const [i, sample] of samples.entries()) {
    assert.equal(sample.variant, i ? 'nativeReuse' : 'nativeOriginal'); assert.equal(sample.stageId, unit.stageId);
    assert.equal(sample.condition, unit.condition);
    assert.equal(resolve(sample.lastCheckpoint), resolve(i ? native : baseline, (i ? afterFiles : beforeFiles).at(-1)));
    assert.equal(sample.lesson, unit.lesson); assert.equal(sample.receipts, 21);
    assert.equal(sample.finalStateHash, sha(JSON.stringify(finalState)));
    assert.equal(sample.finalMemoryHash, sha(JSON.stringify(finalState.session.memory)));
    assert(Number.isFinite(sample.elapsedMs) && sample.elapsedMs > 0 && Number.isFinite(sample.cpuUs) && sample.cpuUs >= 0);
    assert.equal(sample.phases.forward.count, 21); assert.equal(sample.phases.sessionStep.count, 19);
    assert.equal(sample.phases.csrAccumulation.count, steps * 21); assert.equal(sample.phases.sleep.count, 21);
    assert.equal(sample.phases.checkpointPublication.count, 42); assert.equal(sample.phases.receiptPublication.count, 21);
  }
  assert.equal(samples[0].round, samples[1].round);
  return {samples, checkpointPairs: 42, verifiedReceipts: 21};
}


// Offline existing-state benchmark. Never loads a graph, runs inference or changes a run.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, openSync, closeSync, fsyncSync, renameSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync, gunzipSync} from 'node:zlib';
import os from 'node:os';
import {parseArgs} from 'node:util';
import {encodeCheckpoint, encodeNativeCheckpoint, decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';

const {values: a} = parseArgs({options: {out: {type: 'string'}, run: {type: 'string'}, 'cpu-duty': {type: 'string'}}});
assert(a.out && a.run && a['cpu-duty'] === '0.5' && process.execArgv.includes('--max-old-space-size=256'));
mkdirSync(a.out, {recursive: false});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const started = performance.now(), cpuStart = process.cpuUsage();
let peakRss = 0;
function guard() {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  assert(peakRss <= 768 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20, 'Resource guard');
}
const variants = {
  json6: state => gzipSync(JSON.stringify(state) + '\n'),
  json1: state => gzipSync(JSON.stringify(state) + '\n', {level: 1}),
  binary1: state => encodeCheckpoint(state),
  binaryBrotli0: state => encodeCheckpoint(state, 'brotli'),
  nativeZstd1: encodeNativeCheckpoint,
};
const inputs = [], samples = [];
let exactRoundtrips = 0;
for (const sequence of [22000, 22001, 25000, 25001, 28300, 28301]) {
  const path = join(a.run, `checkpoint-${String(sequence).padStart(6, '0')}.json.gz`);
  const source = readFileSync(path), state = JSON.parse(gunzipSync(source, {maxOutputLength: 16 * 2 ** 20}));
  inputs.push({path, sha256: digest(source), sequence: state.sequence, pending: state.pendingReceipt?.kind ?? null,
    neurons: state.session?.episode?.state?.length ?? 0, sourceBytes: source.length});
  for (let round = -1; round < 7; round++) {
    const names = Object.keys(variants);
    if (round % 2 === 0) names.reverse();
    for (const name of names) {
      guard();
      const cpuBefore = process.cpuUsage(), start = performance.now();
      const encoded = variants[name](state), encodeMs = performance.now() - start;
      const target = join(a.out, `${sequence}-${round + 1}-${name}.checkpoint`), fd = openSync(target + '.partial', 'wx');
      try { writeFileSync(fd, encoded); fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(target + '.partial', target);
      const publicationMs = performance.now() - start, cpu = process.cpuUsage(cpuBefore);
      const readStart = performance.now(), decoded = decodeCheckpoint(readFileSync(target));
      const decodeMs = performance.now() - readStart;
      assert.deepEqual(decoded, state);
      exactRoundtrips++;
      if (round >= 0) samples.push({sequence, round, variant: name, encodeMs, publicationMs,
        decodeMs, bytes: encoded.length, cpuUs: cpu.user + cpu.system});
      const spent = process.cpuUsage(cpuBefore);
      await new Promise(resolve => setTimeout(resolve, Math.max(1, (spent.user + spent.system) / 1000)));
      guard();
    }
  }
}
const median = values => {const sorted = values.toSorted((a, b) => a - b), n = sorted.length;
  return (sorted[Math.floor((n - 1) / 2)] + sorted[Math.ceil((n - 1) / 2)]) / 2;};
const summary = Object.fromEntries(Object.keys(variants).map(variant => {
  const rows = samples.filter(row => row.variant === variant);
  return [variant, Object.fromEntries(['encodeMs', 'publicationMs', 'decodeMs', 'bytes', 'cpuUs'].map(key => [key, median(rows.map(row => row[key]))]))];
}));
const report = {scope: 'Offline persistence component only; concurrent graph audit may affect timing. No training speed claim.',
  command: {argv: process.argv, execArgv: process.execArgv}, node: process.version,
  sources: Object.fromEntries([process.argv[1], '.codebase/src/runtime/checkpoint-codec.mjs'].map(path => [path, digest(readFileSync(path))])),
  graphHash: '4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2',
  inputs, exactRoundtrips, samples, summary, peakRssMiB: peakRss / 2 ** 20,
  elapsedSeconds: (performance.now() - started) / 1000, cpu: process.cpuUsage(cpuStart)};
writeFileSync(join(a.out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({complete: true, scope: report.scope, summary, peakRssMiB: report.peakRssMiB, report: join(a.out, 'report.json')}));

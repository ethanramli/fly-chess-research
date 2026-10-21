// Offline canonical hashing only. No graph/model imports or learning.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync, gzipSync} from 'node:zlib';
import {parseArgs} from 'node:util';
import os from 'node:os';

const {values: a} = parseArgs({options: {input: {type: 'string'}, sha256: {type: 'string'}, out: {type: 'string'}, 'cpu-duty': {type: 'string'}}});
assert(a.input && a.sha256 && a.out && a['cpu-duty'] === '0.5' && process.execArgv.includes('--max-old-space-size=256'));
let peakRss = 0, minimumFree = Infinity;
function guard() {
  peakRss = Math.max(peakRss, process.memoryUsage().rss, process.resourceUsage().maxRSS * 1024);
  minimumFree = Math.min(minimumFree, os.freemem());
  assert(peakRss <= 768 * 2 ** 20 && minimumFree >= 256 * 2 ** 20, JSON.stringify({peakRss, minimumFree}));
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
guard();
const source = readFileSync(a.input); assert.equal(sha(source), a.sha256);
const checkpoint = JSON.parse(gunzipSync(source, {maxOutputLength: 16 * 2 ** 20}));
const original = checkpoint.session.episode.state;
assert(Array.isArray(original) && original.length > 0 && original.length <= 262144);
assert(original.every(value => Number.isFinite(value) && Object.is(Math.fround(value), value)));
const state = Float32Array.from(original);
const canonical = JSON.stringify([...state]);
assert.equal(canonical, JSON.stringify(original));
writeFileSync(a.out + '.canonical.json.gz', gzipSync(canonical), {flag: 'wx'});
const expected = sha(canonical), samples = [];
for (let round = -1; round < 7; round++) {
  guard();
  const began = performance.now(), cpuBefore = process.cpuUsage();
  const digest = sha(JSON.stringify([...state]));
  const elapsedMs = performance.now() - began, cpu = process.cpuUsage(cpuBefore);
  assert.equal(digest, expected); guard();
  if (round >= 0) samples.push({round, elapsedMs, cpuUs: cpu.user + cpu.system});
  await new Promise(done => setTimeout(done, Math.max(1, (cpu.user + cpu.system) / 1000)));
}
guard();
const sorted = samples.map(row => row.elapsedMs).toSorted((x, y) => x - y);
const result = {scope: 'Offline canonical state hashing; concurrent audit; not training speed',
  node: process.version, v8: process.versions.v8, neurons: state.length, inputSha256: a.sha256,
  canonicalSha256: expected, canonicalBytes: Buffer.byteLength(canonical), medianMs: sorted[3], samples,
  peakRssMiB: peakRss / 2 ** 20, minimumFreeMiB: minimumFree / 2 ** 20,
  command: {argv: process.argv, execArgv: process.execArgv}, sourceSha256: sha(readFileSync(process.argv[1]))};
writeFileSync(a.out, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({node: result.node, medianMs: result.medianMs, peakRssMiB: result.peakRssMiB, canonicalSha256: expected}));

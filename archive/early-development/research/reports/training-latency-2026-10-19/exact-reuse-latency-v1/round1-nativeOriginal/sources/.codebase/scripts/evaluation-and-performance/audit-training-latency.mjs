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
  const parent = readState(unit.parent), beforeFiles = publications(baseline, '.json.gz'), afterFiles = publications(native, '.checkpoint');
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
    assert.equal(sample.variant, i ? 'nativeZstd1' : 'json6'); assert.equal(sample.stageId, unit.stageId);
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

async function main() {
  const {values: a} = parseArgs({options: {out: {type: 'string'}, protocol: {type: 'string'}, 'cpu-duty': {type: 'string'}}});
  assert(a.out && a.protocol && a['cpu-duty'] === '0.5' && process.execArgv.includes('--max-old-space-size=256'));
  const processes = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command',
    "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],
    {encoding: 'utf8', windowsHide: true, timeout: 15000}));
  assert(!(Array.isArray(processes) ? processes : [processes]).some(p => p.ProcessId !== process.pid &&
    (!p.CommandLine || /--cpu-duty\b|\.codebase[\\/]scripts[\\/]|research[\\/]reports.*[\\/](?:run|audit|benchmark)/i.test(p.CommandLine))),
    'Another experiment is live');
  const started = performance.now(), cpuStart = process.cpuUsage(), auditProtocol = json(a.protocol);
  assert.equal(auditProtocol.schema, 'training-latency-audit-v1');
  const registered = json(join(a.out, 'protocol.json')), result = json(join(a.out, 'report.json'));
  assert.equal(sha(readFileSync(join(a.out, 'protocol.json'))), auditProtocol.trainingProtocolSha256);
  assert.equal(result.protocolHash, auditProtocol.trainingProtocolSha256);
  for (const [path, hash] of Object.entries(auditProtocol.sources)) assert.equal(await fileHash(path), hash);
  for (const [path, hash] of Object.entries(registered.sources)) assert.equal(await fileHash(join(a.out, 'sources', path)), hash);
  const base = json(join(a.out, 'sources', registered.baseProtocol));
  for (const [path, hash] of Object.entries(base.sources)) assert.equal(await fileHash(join(a.out, 'sources', path)), hash);
  const sourceReceipts = join(a.out, 'sources', registered.recordedReceipts), expected = new Map();
  const needed = new Set(registered.units.flatMap(unit => Array.from({length: 21}, (_, i) => unit.firstReceipt + i)));
  for await (const line of createInterface({input: createReadStream(sourceReceipts), crlfDelay: Infinity})) {
    const row = JSON.parse(line); if (needed.has(row.sequence)) expected.set(row.sequence, row);
  }
  assert.equal(expected.size, 252); assert.equal(registered.units.length, 12); assert.equal(registered.rounds, 2);
  assert.deepEqual(registered.gates, {minPerConditionElapsedReduction: .4, minPooledElapsedReduction: .45, exactReceiptsAndStates: true});
  let peakRss = 0;
  function guard() {
    const rss = process.memoryUsage().rss, free = os.freemem(); peakRss = Math.max(peakRss, rss);
    assert(rss <= 768 * 2 ** 20 && free >= 256 * 2 ** 20, JSON.stringify({rss, free}));
  }
  async function pace(cpuBefore) {
    const cpu = process.cpuUsage(cpuBefore);
    await new Promise(done => setTimeout(done, Math.max(1, (cpu.user + cpu.system) / 1000))); guard();
  }
  const directories = readdirSync(a.out, {withFileTypes: true}).filter(entry => entry.isDirectory()
    && /^\d+-.*-(?:json6|nativeZstd1)$/.test(entry.name)).map(entry => entry.name);
  assert.equal(directories.length, 50); const used = new Set(), measured = [], pairs = [];
  const work = [{unit: registered.units[0], round: -1}, ...Array.from({length: 2}, (_, round) => registered.units.map(unit => ({unit, round}))).flat()];
  for (const {unit, round} of work) {
    const prefix = `${round + 1}-${unit.stageId.replaceAll(':', '-')}-${unit.lesson}-`;
    const baseline = prefix + 'json6', native = prefix + 'nativeZstd1';
    assert(directories.includes(baseline) && directories.includes(native)); used.add(baseline); used.add(native);
    const checked = await verifyLessonPair(join(a.out, baseline), join(a.out, native), unit,
      Array.from({length: 21}, (_, i) => expected.get(unit.firstReceipt + i)), {sourceReceipts, steps: base.model.steps, guard, pace});
    assert.equal(checked.samples[0].round, round);
    if (round >= 0) {
      measured.push(...checked.samples);
      pairs.push({stageId: unit.stageId, lesson: unit.lesson, round,
        elapsedReduction: 1 - checked.samples[1].elapsedMs / checked.samples[0].elapsedMs});
    }
    console.log(JSON.stringify({verified: unit.stageId, lesson: unit.lesson, round, checkpointPairs: checked.checkpointPairs}));
  }
  assert.equal(used.size, directories.length); assert.equal(measured.length, 48);
  const key = sample => JSON.stringify([sample.stageId, sample.lesson, sample.round, sample.variant]);
  for (const sample of measured) assert.deepEqual(result.samples.filter(row => key(row) === key(sample)), [sample]);
  assert.equal(result.samples.length, measured.length); assert.equal(result.presentations, 1050);
  assert(result.peakRssMiB <= 768); assert.equal(result.graphSha256, json(join(a.out, 'sources', base.mappingPath)).inputs.graph);
  const median = values => {const sorted = values.toSorted((a, b) => a - b), middle = sorted.length / 2;
    return sorted.length % 2 ? sorted[Math.floor(middle)] : (sorted[middle - 1] + sorted[middle]) / 2;};
  const perCondition = Object.fromEntries(registered.units.filter(unit => unit.lesson === 0).map(unit =>
    [unit.stageId, median(pairs.filter(row => row.stageId === unit.stageId).map(row => row.elapsedReduction))]));
  const total = variant => measured.filter(row => row.variant === variant).reduce((n, row) => n + row.elapsedMs, 0);
  const pooledReduction = 1 - total('nativeZstd1') / total('json6');
  const gates = {exactReceiptsAndStates: true,
    perCondition: Object.values(perCondition).every(value => value > .4), pooled: pooledReduction > .45};
  assert.deepEqual(result.perCondition, perCondition); assert.equal(result.pooledReduction, pooledReduction);
  assert.deepEqual(result.gates, gates); assert.equal(result.passedTimingAndEquality, Object.values(gates).every(Boolean));
  for (const [path, hash] of Object.entries(auditProtocol.sources)) assert.equal(await fileHash(path), hash, 'Auditor source changed during execution');
  const audit = {integrityPassed: true, timingPassed: Object.values(gates).every(Boolean), gates, perCondition, pooledReduction,
    checkpointPairs: 1050, checkpointsInspected: 2100, historicalReceiptsCompared: 525,
    protocolSha256: sha(readFileSync(a.protocol)), auditorSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
    node: process.version, command: {argv: process.argv, execArgv: process.execArgv}, peakRssMiB: peakRss / 2 ** 20,
    elapsedSeconds: (performance.now() - started) / 1000, cpu: process.cpuUsage(cpuStart),
    scope: 'Independent decoding, every pending/acknowledged state, historical receipt-prefix and raw timing recomputation; no biological or reasoning claim.'};
  const target = join(a.out, 'timing-audit.json'); assert(!readdirSync(a.out).includes('timing-audit.json'));
  const fd = openSync(target + '.partial', 'wx');
  try {writeFileSync(fd, JSON.stringify(audit, null, 2) + '\n'); fsyncSync(fd);} finally {closeSync(fd);}
  renameSync(target + '.partial', target); console.log(JSON.stringify(audit));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();

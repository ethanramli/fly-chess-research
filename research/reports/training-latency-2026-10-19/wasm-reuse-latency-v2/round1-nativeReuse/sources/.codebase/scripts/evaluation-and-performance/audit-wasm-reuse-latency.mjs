// Independent evidence decoding is reused from the frozen v3 checker, never the codec.
import assert from 'node:assert/strict';
import {readFileSync, createReadStream, readdirSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {verifyLessonPair} from './audit-exact-reuse-publications.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
async function fileHash(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}
const median = values => {const sorted = values.toSorted((a, b) => a - b), i = sorted.length >> 1;
  assert(sorted.length); return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;};

export function computeRuntimeTimings(protocol, reports) {
  const samples = [], seen = new Set();
  for (const batch of protocol.batches) {
    const report = reports[batch.id]; assert.equal(report.samples.length, 12);
    assert(Number.isFinite(report.processUptimeSeconds) && report.processUptimeSeconds > 0);
    for (const sample of report.samples) {
      assert.equal(sample.variant, batch.variant); assert.equal(sample.round, batch.round);
      assert(Number.isFinite(sample.elapsedMs) && sample.elapsedMs > 0);
      const key = JSON.stringify([sample.stageId, sample.lesson, sample.round, sample.variant]);
      assert(!seen.has(key)); seen.add(key); samples.push(sample);
    }
  }
  assert.equal(samples.length, 48);
  const paired = samples.filter(sample => sample.variant === 'nativeOriginal').map(before => {
    const after = samples.find(sample => sample.variant === 'nativeReuse' && sample.stageId === before.stageId
      && sample.lesson === before.lesson && sample.round === before.round);
    assert(after); assert.equal(after.finalStateHash, before.finalStateHash); assert.equal(after.finalMemoryHash, before.finalMemoryHash);
    return {stageId: before.stageId, lesson: before.lesson, round: before.round, reduction: 1 - after.elapsedMs / before.elapsedMs};
  });
  const perCondition = Object.fromEntries([...new Set(paired.map(row => row.stageId))].map(stage =>
    [stage, median(paired.filter(row => row.stageId === stage).map(row => row.reduction))]));
  assert.equal(Object.keys(perCondition).length, 6);
  const variants = Object.fromEntries(['nativeOriginal', 'nativeReuse'].map(variant => {
    const rows = samples.filter(row => row.variant === variant), seconds = rows.reduce((n, row) => n + row.elapsedMs, 0) / 1000;
    const coldSeconds = protocol.batches.filter(batch => batch.variant === variant)
      .reduce((n, batch) => n + reports[batch.id].processUptimeSeconds, 0);
    return [variant, {lessons: rows.length, measuredSeconds: seconds, secondsPerLesson: seconds / rows.length,
      experiencesPerMinute: rows.length * 60 / seconds, neuralPresentationsPerSecond: rows.length * 21 / seconds,
      cpuFraction: rows.reduce((n, row) => n + row.cpuUs, 0) / (seconds * 1e6), coldSeconds}];
  }));
  const pooledReduction = 1 - variants.nativeReuse.measuredSeconds / variants.nativeOriginal.measuredSeconds;
  const coldInvocationReduction = 1 - variants.nativeReuse.coldSeconds / variants.nativeOriginal.coldSeconds;
  return {paired, perCondition, variants, pooledReduction, coldInvocationReduction,
    gates: {perCondition: Object.values(perCondition).every(value => value > protocol.gates.minPerConditionElapsedReduction),
      pooled: pooledReduction > protocol.gates.minPooledElapsedReduction,
      coldInvocation: coldInvocationReduction > protocol.gates.minColdInvocationElapsedReduction}};
}

async function main() {
  const {values: a} = parseArgs({options: {out: {type: 'string'}, protocol: {type: 'string'}, 'cpu-duty': {type: 'string'}}});
  assert(a.out && a.protocol && a['cpu-duty'] === '0.5' && process.execArgv.includes('--max-old-space-size=256'));
  const raw = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command',
    "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],
    {encoding: 'utf8', timeout: 15000, windowsHide: true}));
  assert(!(Array.isArray(raw) ? raw : [raw]).some(row => row.ProcessId !== process.pid
    && (!row.CommandLine || /--cpu-duty\b|\.codebase[\\/]scripts[\\/]|research[\\/]reports.*[\\/](?:run|audit|benchmark)/i.test(row.CommandLine))),
    'Another experiment is live');
  const started = performance.now(), cpuStart = process.cpuUsage(), auditProtocol = json(a.protocol);
  const protocol = json(join(a.out, 'protocol.json')), index = json(join(a.out, 'batch-index.json'));
  assert.equal(auditProtocol.schema, 'wasm-reuse-latency-audit-v2');
  assert.equal(protocol.schema, 'wasm-reuse-latency-v2');
  const protocolHash = sha(readFileSync(join(a.out, 'protocol.json')));
  assert.equal(protocolHash, auditProtocol.trainingProtocolSha256); assert.equal(index.protocolSha256, protocolHash);
  assert.deepEqual(index.batches.map(row => row.id), protocol.batches.map(row => row.id));
  assert.deepEqual(protocol.batches.map(row => [row.variant, row.round]), [['nativeOriginal', 0], ['nativeReuse', 0], ['nativeReuse', 1], ['nativeOriginal', 1]]);
  assert.deepEqual(protocol.expected, {batches: 4, measuredSamples: 48, casesWithWarmup: 52, presentations: 1092,
    checkpointPairs: 1092, checkpoints: 2184, historicalReceipts: 546});
  assert.deepEqual(protocol.gates, {minPerConditionElapsedReduction: -.05, minPooledElapsedReduction: .05,
    exactReceiptsAndStates: true, minColdInvocationElapsedReduction: .05});
  for (const [path, hash] of Object.entries(auditProtocol.sources)) assert.equal(await fileHash(path), hash);
  let peakRss = 0;
  function guard() {
    const rss = process.memoryUsage().rss, free = os.freemem(); peakRss = Math.max(peakRss, rss);
    assert(rss <= 768 * 2 ** 20 && free >= 256 * 2 ** 20, JSON.stringify({rss, free}));
  }
  async function pace(before) {
    const cpu = process.cpuUsage(before);
    await new Promise(done => setTimeout(done, Math.max(1, (cpu.user + cpu.system) / 1000))); guard();
  }
  const reports = {}, first = join(a.out, protocol.batches[0].id);
  const base = json(join(first, 'sources', protocol.baseProtocol));
  const graphHash = json(join(first, 'sources', base.mappingPath)).inputs.graph;
  const sourceReceipts = join(first, 'sources', protocol.recordedReceipts), expected = new Map(); let referenceFixed;
  const needed = new Set(protocol.units.flatMap(unit => Array.from({length: 21}, (_, i) => unit.firstReceipt + i)));
  for await (const line of createInterface({input: createReadStream(sourceReceipts), crlfDelay: Infinity})) {
    const row = JSON.parse(line);
    if (row.sequence === 0) {assert.equal(row.kind, 'baselines'); referenceFixed = row.fixed;}
    if (needed.has(row.sequence)) expected.set(row.sequence, row);
  }
  assert.equal(expected.size, 252); assert.equal(protocol.units.length, 12);
  for (const batch of protocol.batches) {
    const directory = join(a.out, batch.id), report = json(join(directory, 'report.json'));
    assert.equal(sha(readFileSync(join(directory, 'protocol.json'))), protocolHash);
    assert.equal(report.protocolHash, protocolHash); assert.equal(report.variant, batch.variant); assert.equal(report.round, batch.round);
    assert.equal(report.node, protocol.runtimes[batch.variant].node); assert.equal(report.v8, protocol.runtimes[batch.variant].v8);
    assert.equal(report.runtimeSha256, protocol.runtimes[batch.variant].sha256);
    assert.equal(await fileHash(report.command.argv[0]), report.runtimeSha256);
    assert.equal(resolve(report.command.argv[1]), resolve(auditProtocol.runner));
    for (const [flag, value] of [['--variant', batch.variant], ['--round', String(batch.round)], ['--cpu-duty', '0.5']])
      assert.equal(report.command.argv[report.command.argv.indexOf(flag) + 1], value);
    assert.equal(resolve(report.command.argv[report.command.argv.indexOf('--out') + 1]), resolve(directory));
    assert(report.command.execArgv.includes('--max-old-space-size=256'));
    assert.equal(report.exactHistoricalReceipts, true); assert.equal(report.presentations, 273);
    assert.equal(report.graphSha256, graphHash); assert.equal(report.neurons, auditProtocol.neurons);
    assert.equal(protocol.historicalFixedParameterGate, 'receipt0.baselines.fixed');
    assert(typeof referenceFixed === 'string' && /^[a-f0-9]{64}$/.test(referenceFixed));
    assert.equal(report.fixedStateHash, referenceFixed);
    assert(report.peakRssMiB <= 768 && report.elapsedSeconds > 0 && report.processUptimeSeconds >= report.elapsedSeconds);
    assert.deepEqual(report.sources, protocol.sources);
    for (const [path, hash] of Object.entries({...base.sources, ...protocol.sources})) {
      assert.equal(await fileHash(join(directory, 'sources', path)), hash); guard();
    }
    const cases = readdirSync(directory, {withFileTypes: true}).filter(entry => entry.isDirectory()
      && /^\d+-.*-(?:nativeOriginal|nativeReuse)$/.test(entry.name)).map(entry => entry.name);
    const expectedNames = [{unit: protocol.units[0], round: -1}, ...protocol.units.map(unit => ({unit, round: batch.round}))]
      .map(({unit, round}) => `${round + 1}-${unit.stageId.replaceAll(':', '-')}-${unit.lesson}-${batch.variant}`);
    assert.deepEqual(cases.toSorted(), expectedNames.toSorted());
    assert.equal(report.samples.length, 12);
    for (const sample of report.samples) {
      const path = join(directory, `${batch.round + 1}-${sample.stageId.replaceAll(':', '-')}-${sample.lesson}-${batch.variant}`, 'sample.json');
      assert.deepEqual(sample, json(path));
    }
    reports[batch.id] = report;
  }
  let checkpointPairs = 0, historicalReceipts = 0;
  for (const round of [0, 1]) {
    const before = join(a.out, `round${round}-nativeOriginal`), after = join(a.out, `round${round}-nativeReuse`);
    for (const work of [{unit: protocol.units[0], round: -1}, ...protocol.units.map(unit => ({unit, round}))]) {
      const {unit} = work, prefix = `${work.round + 1}-${unit.stageId.replaceAll(':', '-')}-${unit.lesson}-`;
      const checked = await verifyLessonPair(join(before, prefix + 'nativeOriginal'), join(after, prefix + 'nativeReuse'), unit,
        Array.from({length: 21}, (_, i) => expected.get(unit.firstReceipt + i)), {sourceReceipts, steps: base.model.steps, guard, pace});
      assert.equal(checked.samples[0].round, work.round);
      checkpointPairs += checked.checkpointPairs; historicalReceipts += checked.verifiedReceipts;
      console.log(JSON.stringify({verified: unit.stageId, lesson: unit.lesson, round, warmup: work.round < 0, checkpointPairs}));
    }
  }
  assert.equal(checkpointPairs, 1092); assert.equal(historicalReceipts, 546);
  const timings = computeRuntimeTimings(protocol, reports), gates = {exactReceiptsAndStates: true, ...timings.gates};
  for (const [path, hash] of Object.entries(auditProtocol.sources)) assert.equal(await fileHash(path), hash, 'Audit source changed');
  const audit = {integrityPassed: true, timingPassed: Object.values(gates).every(Boolean), ...timings, gates,
    checkpointPairs, checkpointsInspected: checkpointPairs * 2, historicalReceiptsCompared: historicalReceipts,
    protocolSha256: protocolHash, auditProtocolSha256: sha(readFileSync(a.protocol)),
    peakRssMiB: peakRss / 2 ** 20, elapsedSeconds: (performance.now() - started) / 1000, cpu: process.cpuUsage(cpuStart),
    scope: 'Independent decoding and raw timing arithmetic for four serial batches; no whole-study or reasoning claim'};
  const target = join(a.out, 'timing-audit.json'); assert(!readdirSync(a.out).includes('timing-audit.json'));
  const fd = openSync(target + '.partial', 'wx');
  try {writeFileSync(fd, JSON.stringify(audit, null, 2) + '\n'); fsyncSync(fd);} finally {closeSync(fd);}
  renameSync(target + '.partial', target); console.log(JSON.stringify(audit));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

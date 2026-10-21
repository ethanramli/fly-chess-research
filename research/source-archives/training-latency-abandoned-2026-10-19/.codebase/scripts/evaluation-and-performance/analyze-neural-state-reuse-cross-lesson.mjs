// Observational analysis of archived states, never a graph simulation or speed claim.
import assert from 'node:assert/strict';
import {readFileSync, createReadStream, readdirSync, existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {planG0HistoryDiagnostic} from '../../src/neural-learning/g0-reversal-history-diagnostic.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => sha(JSON.stringify(value));
const median = values => {const sorted = values.toSorted((a, b) => a - b), i = sorted.length >> 1;
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;};

export function compareStates(previous, current, chunks = [32, 128, 1024]) {
  assert(previous.length === current.length && current.length > 0);
  const changed = new Uint8Array(current.length); let count = 0;
  for (let i = 0; i < current.length; i++) {
    assert(Number.isFinite(current[i]));
    if (!Object.is(previous[i], current[i])) {changed[i] = 1; count++;}
  }
  const previous32 = previous instanceof Float32Array ? previous : Float32Array.from(previous);
  const current32 = current instanceof Float32Array ? current : Float32Array.from(current);
  const previousBits = new Uint32Array(previous32.buffer, previous32.byteOffset, previous32.length);
  const currentBits = new Uint32Array(current32.buffer, current32.byteOffset, current32.length);
  let changedFloat32Words = 0, changedFloat32Bytes = 0;
  for (let i = 0; i < currentBits.length; i++) {
    const xor = previousBits[i] ^ currentBits[i];
    if (xor !== 0) changedFloat32Words++;
    changedFloat32Bytes += Number((xor & 255) !== 0) + Number((xor & 65280) !== 0)
      + Number((xor & 16711680) !== 0) + Number((xor >>> 24) !== 0);
  }
  const unchangedChunks = {};
  for (const size of chunks) {
    assert(Number.isSafeInteger(size) && size > 0); let unchanged = 0;
    for (let start = 0; start < changed.length; start += size) {
      let dirty = false;
      for (let i = start; i < Math.min(start + size, changed.length); i++) if (changed[i]) {dirty = true; break;}
      if (!dirty) unchanged++;
    }
    unchangedChunks[size] = unchanged / Math.ceil(current.length / size);
  }
  return {changedNeurons: count, changedFraction: count / current.length, unchangedChunks,
    changedFloat32Words, changedFloat32ByteFraction: changedFloat32Bytes / (4 * current.length)};
}

const {values: a} = parseArgs({options: {run: {type: 'string'}, out: {type: 'string'},
  history: {type: 'string', multiple: true}, 'cpu-duty': {type: 'string'}, 'self-check': {type: 'boolean'}}});
if (a['self-check']) {
  const result = compareStates([0, 1, 2, 3, 4], [0, 1, 9, 3, 4], [2, 4]);
  assert.equal(result.changedNeurons, 1); assert.equal(result.changedFraction, .2);
  assert.equal(result.changedFloat32Words, 1); assert.equal(result.changedFloat32ByteFraction, .1);
  assert.equal(compareStates([0], [-0], [1]).changedFloat32ByteFraction, .25);
  assert.equal(result.unchangedChunks[2], 2 / 3); assert.equal(result.unchangedChunks[4], .5);
  assert.equal(compareStates([0], [-0], [1]).changedNeurons, 1);
  assert.equal(compareStates([1, 2], [1, 2], [2]).changedNeurons, 0);
  assert.throws(() => compareStates([0], [NaN]));
  console.log(JSON.stringify({selfCheck: 'passed', scope: 'Exact changes, signed zero, finite input and partial chunks'}));
} else {
  assert(a.run && a.out && a['cpu-duty'] === '0.5' && process.execArgv.includes('--max-old-space-size=256'));
  const processes = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command',
    "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],
    {encoding: 'utf8', windowsHide: true, timeout: 15000}));
  assert(!(Array.isArray(processes) ? processes : [processes]).some(p => p.ProcessId !== process.pid &&
    (!p.CommandLine || /--cpu-duty\b|\.codebase[\\/]scripts[\\/]/i.test(p.CommandLine))), 'Preserve the exclusive window');
  const started = performance.now(), cpuStart = process.cpuUsage(); let peakRss = 0;
  function guard() {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    assert(peakRss <= 768 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20, 'Resource guard');
  }
  async function pace(before) {
    const cpu = process.cpuUsage(before);
    await new Promise(resolve => setTimeout(resolve, Math.max(1, (cpu.user + cpu.system) / 1000))); guard();
  }
  const protocolBytes = readFileSync(join(a.run, 'protocol.json')), resultBytes = readFileSync(join(a.run, 'result.json'));
  const p = JSON.parse(protocolBytes), result = JSON.parse(resultBytes), plan = planG0HistoryDiagnostic();
  assert.equal(p.schema, 'g0-reversal-history-diagnostic-v1'); assert.equal(p.planHash, digest(plan));
  assert.equal(result.identity.protocolHash, sha(protocolBytes)); assert.equal(result.diagnosticComplete, true);
  const n = p.fixture ? p.fixtureGraph.row.length - 1 : 134209;
  const selected = plan.stages.flatMap(stage => [0, Math.floor((stage.slots.length - 1) / 2), stage.slots.length - 1]
    .map(lesson => ({stageId: stage.id, phase: stage.phase, branch: stage.branch, condition: stage.condition.id, lesson, publicInputHash: digest(stage.slots[lesson].experience.publicInput)})));
  assert.equal(selected.length, 72); assert.equal(plan.stages.length, 24);
  const key = row => JSON.stringify([row.stageId, row.lesson]), wanted = new Map(selected.map(row => [key(row), []]));
  const receiptsPath = join(a.run, 'receipts.jsonl'); let sequence = 0, chain = digest(result.identity);
  const receiptHash = createHash('sha256');
  for await (const bytes of createReadStream(receiptsPath)) {receiptHash.update(bytes); guard();}
  for await (const line of createInterface({input: createReadStream(receiptsPath), crlfDelay: Infinity})) {
    const row = JSON.parse(line); assert.equal(row.sequence, sequence++); assert.equal(row.previousChainHash, chain); chain = digest(row);
    if (row.kind === 'frame' && wanted.has(key(row))) wanted.get(key(row)).push(row);
  }
  assert.equal(sequence, result.receiptCount); assert.equal(chain, result.chainHash); guard();
  mkdirSync(a.out, {recursive: false});
  const sources = Object.fromEntries([fileURLToPath(import.meta.url), '.codebase/src/runtime/checkpoint-codec.mjs',
    '.codebase/src/neural-learning/g0-reversal-history-diagnostic.mjs'].map(path => [path, sha(readFileSync(path))]));
  const selection = {rule: 'First, floor((count-1)/2), and last lesson in every stage, fixed before inspecting reuse',
    stages: plan.stages.length, cases: selected, neurons: n, protocolSha256: sha(protocolBytes), resultSha256: sha(resultBytes),
    receiptsSha256: receiptHash.digest('hex'), sources};
  writeFileSync(join(a.out, 'selection.json'), JSON.stringify(selection, null, 2) + '\n');
  const indices = (a.history ?? [a.run]).map(directory => {
    const names = readdirSync(directory).filter(name => /^checkpoint-\d+\.json\.gz$/.test(name)).sort();
    assert(names.length); let offset = null;
    for (const name of names.slice(0, 8)) {
      const state = decodeCheckpoint(readFileSync(join(directory, name)));
      if (state.pendingReceipt !== null) {offset = state.sequence - 2 * state.receiptCount - 2; break;}
    }
    assert(Number.isSafeInteger(offset) && offset >= 0, 'Infer offset from a published pending state');
    return {directory, offset, first: names[0], last: names.at(-1)};
  });
  const rows = [], inputs = [], crossRows = []; let referenceStage = null, referenceFrames = [], referenceCase = null;
  for (const selectedCase of selected) {
    const frames = wanted.get(key(selectedCase)); assert.equal(frames.length, 19);
    if (referenceStage !== selectedCase.stageId) {
      referenceStage = selectedCase.stageId; referenceFrames = []; referenceCase = selectedCase;
    }
    let previous = new Float32Array(n);
    for (const [index, row] of frames.entries()) {
      const before = process.cpuUsage(); let found = null;
      assert.equal(row.frame.index, index);
      for (const source of indices.toReversed()) {
        const checkpointSequence = 2 * (row.sequence + 1) + 1 + source.offset;
        const path = join(source.directory, `checkpoint-${String(checkpointSequence).padStart(6, '0')}.json.gz`);
        if (!existsSync(path)) continue;
        const bytes = readFileSync(path), state = decodeCheckpoint(bytes);
        if (state.receiptCount === row.sequence + 1 && state.pendingReceipt === null && state.chainHash === digest(row)) {
          found = {path, bytes, state}; break;
        }
      }
      assert(found, `Missing acknowledged frame ${row.sequence}`);
      const {state} = found, episode = state.session.episode, values = episode.state;
      assert.deepEqual(state.identity, result.identity);
      assert.equal(episode.active, true); assert.equal(episode.frames, index + 1); assert.equal(values.length, n);
      assert.equal(episode.frameIdentity, row.frame.frameIdentity); assert.equal(state.session.pending.chainHash, row.frame.chainHash);
      assert.equal(digest(values), row.frame.neuralStateHash, 'State must match the original full-neuron evidence');
      assert(values.every(value => Object.is(value, Math.fround(value)) && value >= 0 && value <= p.model.saturation));
      rows.push({...selectedCase, frame: index, receipt: row.sequence, ...compareStates(previous, values)});
      inputs.push({receipt: row.sequence, path: found.path, sha256: sha(found.bytes)});
      const current = Float32Array.from(values);
      if (selectedCase.lesson === referenceCase.lesson) referenceFrames[index] = current;
      else crossRows.push({...selectedCase, referenceLesson: referenceCase.lesson, frame: index,
        samePublicInput: selectedCase.publicInputHash === referenceCase.publicInputHash,
        ...compareStates(referenceFrames[index], current)});
      previous = current; await pace(before);
    }
    console.log(JSON.stringify({lesson: rows.length / 19, totalLessons: selected.length, stage: selectedCase.stageId}));
  }
  const comparable = rows.filter(row => row.frame > 0);
  const summarize = values => ({pairs: values.length, medianChangedFraction: median(values.map(row => row.changedFraction)),
    medianChangedFloat32ByteFraction: median(values.map(row => row.changedFloat32ByteFraction)),
    completelyUnchanged: values.filter(row => row.changedNeurons === 0).length,
    medianUnchangedChunks: Object.fromEntries([32, 128, 1024].map(size => [size, median(values.map(row => row.unchangedChunks[size]))]))});
  const report = {scope: 'Observed exact final-frame state reuse, not a graph speedup or biological result', ...selection, indices,
    frames: rows.length, successivePairs: comparable.length, summary: summarize(comparable),
    perPhase: Object.fromEntries(['acquisition', 'interference', 'reversal'].map(phase => [phase, summarize(comparable.filter(row => row.phase === phase))])),
    perFrame: Object.fromEntries(Array.from({length: 18}, (_, i) => [i + 1, summarize(comparable.filter(row => row.frame === i + 1))])),
    crossLessonSameFrame: {pairs: crossRows.length, summary: summarize(crossRows),
      perPhase: Object.fromEntries(['acquisition', 'interference', 'reversal'].map(phase =>
        [phase, summarize(crossRows.filter(row => row.phase === phase))])),
      perInputMatch: Object.fromEntries([true, false].map(match => {
        const selected = crossRows.filter(row => row.samePublicInput === match);
        return [String(match), selected.length ? summarize(selected) : null];
      }))}, crossRows, rows, inputs, peakRssMiB: peakRss / 2 ** 20, elapsedSeconds: (performance.now() - started) / 1000,
    cpu: process.cpuUsage(cpuStart), command: {argv: process.argv, execArgv: process.execArgv},
    limitations: ['Final-frame stability does not prove intermediate histories or incoming causal rows can be skipped.',
      'Cross-lesson equal outputs do not prove unchanged dependencies, weights or complete stimulation histories.',
      'Float32 XOR-byte sparsity is not an observed compression ratio or speedup.', 'First/middle/last sampling is not every lesson.', 'Historical curriculum independent scientific audit remains unfinished.',
      'Legacy JSON archives normalize signed zero; comparisons concern decoded archived values.',
      'Exact equality only; no numerical threshold, graph pruning, learning change or predicted speedup.']};
  assert.equal(rows.length, 1368); assert.equal(comparable.length, 1296); assert.equal(crossRows.length, 912);
  for (const [path, hash] of Object.entries(sources)) assert.equal(sha(readFileSync(path)), hash);
  writeFileSync(join(a.out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({scope: report.scope, frames: report.frames, successivePairs: report.successivePairs,
    summary: report.summary, perPhase: report.perPhase, crossLessonSameFrame: report.crossLessonSameFrame, peakRssMiB: report.peakRssMiB}));
}

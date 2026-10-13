import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { createBoundRayRelationalCueEncoder } from '../../src/chess-input/bound-ray-relational-cue.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { bindFeedbackToAssessment, feedbackChannel } from '../../src/puzzle-learning/feedback-quality.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/bound-ray-feedback-development-v1/protocol.json';
const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, resume: { type: 'string' }, preflight: { type: 'boolean' },
  encoder: { type: 'string' }, condition: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' },
} });
const p = JSON.parse(readFileSync(protocolPath, 'utf8'));
const archiveManifest = JSON.parse(readFileSync('research/source-archives/bound-ray-feedback-development-v1/manifest.json', 'utf8'));
assert.equal(await sha256(protocolPath), archiveManifest.protocolSha256, 'Frozen protocol identity differs');
const duty = Number(args['cpu-duty']);
assert.ok(Number.isFinite(duty) && duty === p.runtime.cpuDuty);
assert.equal(process.version, p.runtime.nodeVersion);
assert.ok(process.execArgv.includes(`--max-old-space-size=${p.runtime.heapMiB}`));
for (const [path, hash] of Object.entries({ ...p.inputHashes, ...p.sourceHashes }))
  assert.equal(await sha256(path), hash, `Frozen identity differs: ${path}`);
assert.equal(await sha256(p.graphPath), p.graphSha256);
assert.equal(await sha256(p.annotationPath), p.annotationSha256);
assert.equal(p.graphSha256, graphHash); assert.equal(p.annotationSha256, annotationHash);
const mapping = JSON.parse(readFileSync(p.mappingPath, 'utf8')).mapping;
assert.equal(digest(mapping), p.mappingHash);
for (const audit of p.requiredAudits) {
  assert.equal(await sha256(audit.report), audit.reportSha256);
  const report = JSON.parse(readFileSync(audit.report, 'utf8'));
  for (const [key, expected] of Object.entries(audit.expected)) {
    const actual = key.split('.').reduce((value, part) => value?.[part], report);
    assert.deepEqual(actual, expected, `Required prerequisite differs: ${audit.report}/${key}`);
  }
}
const readJsonl = path => readFileSync(path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const train = readJsonl(p.data.trainPath), validation = readJsonl(p.data.validationPath);
assert.equal(train.length, 8); assert.equal(validation.length, 4);
assert.equal(train.flatMap(row => row.candidates).length, 16);
assert.equal(validation.flatMap(row => row.candidates).length, 8);
assert.ok(!JSON.stringify(p).includes('final.jsonl'));
assert.ok(!p.data.trainPath.includes('final') && !p.data.validationPath.includes('final'));
assert.ok(p.conditions.includes('informative') && p.conditions.includes('no-channel')
  && p.conditions.includes('shuffled') && p.conditions.includes('disabled'));
assert.ok(p.encoders.some(encoder => encoder.id === 'relational-v3')
  && p.encoders.some(encoder => encoder.id === 'bound-ray'));
const expectedChannels = train.flatMap(panel => panel.candidates.map(candidate =>
  candidate.proof.status === 'success' ? 'PAM02' : 'PPL103'));
assert.deepEqual(p.shuffledChannels.map(row => row.channel).sort(), [...expectedChannels].sort());
assert.ok(p.shuffledChannels.some((row, i) => row.channel !== expectedChannels[i]));
const guard = () => {
  const rss = process.memoryUsage().rss;
  peakRssBytes = Math.max(peakRssBytes, rss);
  if (rss > p.runtime.maxRssBytes || os.freemem() < p.runtime.minFreeBytes)
    throw Error('Resource guard: 768 MiB RSS / 256 MiB free memory');
};
let peakRssBytes = 0;
guard();
const rootIds = readNpz(p.graphPath, ['root_ids']).root_ids; guard();
for (const cell of [...Object.values(p.readouts).flat(), ...mapping.groups.flatMap(group => group.dan)])
  assert.equal(rootIds[cell.index].toString(), cell.rootId);
if (args.preflight) {
  console.log(JSON.stringify({ passed: true, protocolSha256: await sha256(protocolPath),
    encoders: p.encoders.map(row => row.id), conditions: p.conditions,
    trainingEventsPerCondition: expectedChannels.length, validationPanels: validation.length,
    finalFamilyFilesRead: false, graphInference: false }));
  process.exit(0);
}
assert.ok(args.out && p.conditions.includes(args.condition));
const encoderConfig = p.encoders.find(row => row.id === args.encoder);
assert.ok(encoderConfig, 'Unknown cue encoder');
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
const out = resolve(args.out), resumePath = args.resume ? resolve(args.resume) : null;
if (resumePath) assert.ok(existsSync(resumePath), 'Resume checkpoint is missing');
assert.ok(!existsSync(out), 'Use a fresh output directory for every run or resume');
mkdirSync(out, { recursive: true });
const runStartedAt = performance.now(), cpuStarted = process.cpuUsage();

async function pace(ms) {
  let remaining = ms * (1 / duty - 1);
  while (remaining > 0) {
    const wait = Math.min(250, remaining);
    await new Promise(resolveWait => setTimeout(resolveWait, wait));
    remaining -= wait; guard();
  }
}
guard(); const graph = loadGraph(p.graphPath); guard();
const model = new SparseTrainer(graph, p.model); guard();
const memory = new ReversalMemory(model, mapping, p.memory); guard();
const encoder = encoderConfig.id === 'bound-ray'
  ? createBoundRayRelationalCueEncoder(mapping, encoderConfig.config)
  : createRelationalChessCueEncoder(mapping, encoderConfig.config);
assert.equal(encoder.identity, encoderConfig.identity);
const initialMemory = memory.snapshot();
assert.ok(initialMemory.gains.every(value => value === 1) && initialMemory.events === 0);
const fixedHash = fixedStateHash(model, memory.edges);
const baselineStarted = performance.now(); model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - baselineStarted); guard();
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder, readouts: p.readouts,
  rest, current: p.current, priorScale: p.priorScale, maxPresentations: p.maxPresentations,
  maxLegalMoves: 8, guard, pace });
const identity = { protocolSha256: await sha256(protocolPath), encoder: encoderConfig.id,
  encoderIdentity: encoder.identity, condition: args.condition, seed: p.model.seed,
  graphSha256: p.graphSha256, annotationSha256: p.annotationSha256, mappingHash: p.mappingHash,
  fixedStateHash: fixedHash, initialMemoryHash: digest(initialMemory), model: model.config,
  memory: memory.config, readouts: p.readouts };
const memoryFingerprint = () => digest(memory.snapshot());
const atomicJson = (path, value) => {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path)) { assert.equal(readFileSync(path, 'utf8'), body); return; }
  const partial = `${path}.partial`;
  writeFileSync(partial, body, { flag: 'wx' }); renameSync(partial, path);
};
let sequence = 0;
const saveCheckpoint = state => {
  guard();
  let name, partial, target;
  do {
    name = `checkpoint-${String(++sequence).padStart(5, '0')}`;
    partial = join(out, `${name}.partial`); target = join(out, name);
  } while (existsSync(partial) || existsSync(target));
  mkdirSync(partial);
  const statePath = join(partial, 'state.json');
  atomicJson(statePath, { identity, sequence, state });
  atomicJson(join(partial, 'checkpoint.json'), { sequence, stateSha256: awaitSha(statePath) });
  renameSync(partial, target);
  return statePath;
};
function awaitSha(path) {
  // Checkpoint publication is synchronous; use a local hash to keep the state write atomic.
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
const assessPanel = async (panel, split) => {
  const board = new Chess(); board.loadPgn(panel.pgn); assert.equal(board.fen(), panel.fen);
  const beforePgn = board.pgn(), beforeMemory = memoryFingerprint();
  const rows = [];
  for (const candidate of [...panel.candidates].sort((a,b) => a.move.localeCompare(b.move))) {
    const cue = encoder.encode(board, candidate.move, p.task);
    const response = await brain.evoke(cue.stimulation);
    rows.push({ move: candidate.move, consequence: candidate.proof.status,
      score: response.score, MBON12: response.MBON12, MBON01: response.MBON01 });
  }
  assert.equal(board.pgn(), beforePgn); assert.equal(memoryFingerprint(), beforeMemory);
  const success = rows.find(row => row.consequence === 'success');
  const failure = rows.find(row => row.consequence === 'failure');
  assert.ok(success && failure);
  const margin = success.score - failure.score;
  return { split, panelId: panel.id, rows, margin,
    choice: margin > 0 ? success.move : margin < 0 ? failure.move : null,
    correct: margin > 0, tied: margin === 0, memoryHash: beforeMemory };
};
const initial = { identity, phase: 'baseline', trainIndex: 0, validationIndex: 0, eventIndex: 0,
  presentations: 0, memory: initialMemory, initialMemory, pending: null, receiptRefs: [],
  baseline: { train: [], validation: [] }, afterTraining: { train: [], validation: [] },
  repeat: [], reset: [], restored: [] };
let state;
if (resumePath) {
  const saved = JSON.parse(readFileSync(resumePath, 'utf8'));
  const manifest = JSON.parse(readFileSync(join(dirname(resumePath), 'checkpoint.json'), 'utf8'));
  assert.equal(await sha256(resumePath), manifest.stateSha256);
  assert.deepEqual(saved.identity, identity);
  state = saved.state; sequence = saved.sequence;
  const originRun = dirname(dirname(resumePath));
  const checkpointDir = dirname(resumePath);
  const checkpointName = checkpointDir.split(/[\\/]/).at(-1);
  assert.match(checkpointName, /^checkpoint-\d{5}$/);
  const sourceCheckpoints = readdirSync(originRun)
    .filter(name => /^checkpoint-\d{5}$/.test(name)).sort();
  assert.equal(sourceCheckpoints.at(-1), checkpointName,
    'Resume only the latest fully published checkpoint');
  for (const name of sourceCheckpoints) {
    const source = join(originRun, name), target = join(out, name);
    const checkpointState = join(source, 'state.json');
    const checkpointManifest = JSON.parse(readFileSync(join(source, 'checkpoint.json'), 'utf8'));
    assert.equal(await sha256(checkpointState), checkpointManifest.stateSha256);
    cpSync(source, target, { recursive: true, errorOnExist: true });
  }
  for (const ref of state.receiptRefs) {
    const source = join(originRun, ref.path), target = join(out, ref.path);
    assert.equal(await sha256(source), ref.sha256);
    mkdirSync(dirname(target), { recursive: true });
    atomicJson(target, JSON.parse(readFileSync(source, 'utf8')));
  }
  memory.restore(state.memory); brain.presentations = state.presentations;
  if (state.pending) {
    const ref = state.pending.receiptRef;
    const receiptPath = join(out, ref.path);
    mkdirSync(dirname(receiptPath), { recursive: true });
    atomicJson(receiptPath, state.pending.receipt);
    assert.equal(await sha256(receiptPath), ref.sha256);
    state.receiptRefs.push(ref); state.pending = null; state.eventIndex++;
    state.memory = memory.snapshot(); state.presentations = brain.presentations;
    saveCheckpoint(state);
  }
} else state = initial;
if (!resumePath) saveCheckpoint(state);

const publishPanelRows = async (list, rows, split) => {
  while (list.length < rows.length) {
    list.push(await assessPanel(rows[list.length], split));
    state.presentations = brain.presentations; saveCheckpoint(state);
  }
};
if (state.phase === 'baseline') {
  await publishPanelRows(state.baseline.train, train, 'train');
  await publishPanelRows(state.baseline.validation, validation, 'validation');
  state.phase = 'training'; saveCheckpoint(state);
}
const eventRows = train.flatMap(panel => panel.candidates.map(candidate => ({ panel, candidate })));
const shuffled = p.shuffledChannels;
while (state.phase === 'training' && state.eventIndex < eventRows.length) {
  const { panel, candidate } = eventRows[state.eventIndex];
  const board = new Chess(); board.loadPgn(panel.pgn); assert.equal(board.fen(), panel.fen);
  const preFeedback = await assessPanel(panel, 'train');
  const experience = { ...verifiedExperience(board, candidate.move, p.task, candidate.proof),
    proof: candidate.proof, context: { fen: panel.fen, pgn: panel.pgn, task: p.task } };
  assert.ok(experience.learningAllowed && experience.status === candidate.proof.status);
  const feedback = bindFeedbackToAssessment(board, p.task, {
    fen: board.fen(), pgn: board.pgn(), task: p.task, memoryHash: preFeedback.memoryHash,
    rows: preFeedback.rows.map(({ move, score }) => ({ move, score })), choice: preFeedback.choice,
  }, experience, memoryFingerprint());
  const channel = feedbackChannel(args.condition, experience.status, shuffled[state.eventIndex].channel);
  const plasticityEnabled = args.condition !== 'disabled';
  const fixedBefore = fixedStateHash(model, memory.edges);
  const receipt = await brain.replay(experience, { channel, plasticityEnabled });
  assert.equal(fixedBefore, fixedHash); assert.equal(fixedStateHash(model, memory.edges), fixedHash);
  state.memory = memory.snapshot(); state.presentations = brain.presentations;
  const receiptPath = `receipts/event-${String(state.eventIndex + 1).padStart(3, '0')}.json`;
  const pendingReceipt = { identity, eventIndex: state.eventIndex, panelId: panel.id,
    move: candidate.move, status: experience.status, channel, plasticityEnabled,
    fixedStateBefore: fixedBefore, fixedStateAfter: fixedHash, feedback, receipt };
  state.pending = { receipt: pendingReceipt,
    receiptRef: { path: receiptPath, sha256: createHash('sha256').update(JSON.stringify(pendingReceipt, null, 2) + '\n').digest('hex') } };
  saveCheckpoint(state);
  const target = join(out, receiptPath); mkdirSync(dirname(target), { recursive: true }); atomicJson(target, pendingReceipt);
  assert.equal(await sha256(target), state.pending.receiptRef.sha256);
  state.receiptRefs.push(state.pending.receiptRef); state.pending = null;
  state.eventIndex++; state.memory = memory.snapshot(); state.presentations = brain.presentations;
  saveCheckpoint(state);
}
if (state.phase === 'training') { state.phase = 'after-training'; saveCheckpoint(state); }
if (state.phase === 'after-training') {
  await publishPanelRows(state.afterTraining.train, train, 'train');
  await publishPanelRows(state.afterTraining.validation, validation, 'validation');
  state.phase = 'repeat'; saveCheckpoint(state);
}
if (state.phase === 'repeat') {
  await publishPanelRows(state.repeat, validation, 'validation');
  state.learnedMemory = memory.snapshot(); state.phase = 'reset'; saveCheckpoint(state);
}
if (state.phase === 'reset') {
  memory.restore(state.initialMemory); state.memory = memory.snapshot();
  await publishPanelRows(state.reset, validation, 'validation');
  state.phase = 'restore'; saveCheckpoint(state);
}
if (state.phase === 'restore') {
  memory.restore(state.learnedMemory); state.memory = memory.snapshot();
  await publishPanelRows(state.restored, validation, 'validation');
  assert.deepEqual(state.repeat, state.afterTraining.validation);
  assert.deepEqual(state.reset, state.baseline.validation);
  assert.deepEqual(state.restored, state.afterTraining.validation);
  state.phase = 'complete'; state.memory = state.learnedMemory; state.presentations = brain.presentations;
  saveCheckpoint(state);
}
if (state.phase === 'complete') {
  const cpu = process.cpuUsage(cpuStarted);
  const report = { schema: 'bound-ray-feedback-development-run-v1', identity,
    encoder: args.encoder, condition: args.condition, seed: p.model.seed,
    baseline: state.baseline, afterTraining: state.afterTraining,
    repeat: state.repeat, reset: state.reset, restored: state.restored,
    initialMemoryHash: digest(state.initialMemory), finalMemoryHash: digest(state.learnedMemory),
    receipts: state.receiptRefs, presentations: state.presentations,
    metrics: { wallSeconds: (performance.now() - runStartedAt) / 1000,
      cpuSeconds: (cpu.user + cpu.system) / 1e6,
      peakRssBytes,
      currentFreeBytes: os.freemem(), node: process.version, cpuDuty: duty },
    scope: 'One scratch-to-scratch-development pass on training and validation only. No final-family, puzzle-search, Stockfish, or general reasoning claim.' };
  atomicJson(join(out, 'report.json'), report);
  atomicJson(join(out, 'COMPLETE'), { schema: 'bound-ray-feedback-development-complete-v1',
    reportSha256: await sha256(join(out, 'report.json')), protocolSha256: identity.protocolSha256,
    encoder: args.encoder, condition: args.condition, seed: p.model.seed });
  console.log(JSON.stringify({ complete: true, encoder: args.encoder, condition: args.condition,
    report: join(out, 'report.json'), presentations: state.presentations,
    baselineValidationCorrect: state.baseline.validation.filter(row => row.correct).length,
    afterTrainingValidationCorrect: state.afterTraining.validation.filter(row => row.correct).length,
    memoryEvents: state.learnedMemory.events }));
}

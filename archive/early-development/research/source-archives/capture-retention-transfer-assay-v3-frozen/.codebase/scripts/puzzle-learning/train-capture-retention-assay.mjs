import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/capture-retention-transfer-assay-v3/protocol.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, resume: { type: 'string' }, preflight: { type: 'boolean' },
  seed: { type: 'string' }, condition: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' }
} });
const p = read(protocolPath), duty = Number(args['cpu-duty']);
assert.ok(Number.isFinite(duty) && duty > 0 && duty <= 1, 'CPU duty must be finite in (0, 1]');
assert.equal(duty, p.runtime.cpuDuty);
assert.equal(process.version, p.runtime.nodeVersion);
assert.ok(process.execArgv.includes(`--max-old-space-size=${p.runtime.heapMiB}`));
for (const [path, hash] of Object.entries({ ...p.inputHashes, ...p.sourceHashes }))
  assert.equal(await sha256(path), hash, `Frozen identity differs: ${path}`);
assert.equal(await sha256(p.graphPath), p.graphSha256);
assert.equal(await sha256(p.annotationPath), p.annotationSha256);
assert.equal(p.graphSha256, graphHash); assert.equal(p.annotationSha256, annotationHash);
const dependencyPath = fileURLToPath(import.meta.resolve('chess.js'));
assert.equal(resolve(dependencyPath), resolve(p.runtime.chessEntrypoint));
assert.equal(await sha256(dependencyPath), p.runtime.chessEntrypointSha256);
assert.equal(read('node_modules/chess.js/package.json').version, p.runtime.chessJs);
assert.equal(await sha256('node_modules/chess.js/package.json'), p.runtime.chessPackageJsonSha256);
for (const audit of p.requiredAudits) {
  assert.equal(await sha256(audit.report), audit.reportSha256);
  const report = read(audit.report);
  for (const [path, expected] of Object.entries(audit.expected)) {
    const actual = path.split('.').reduce((value, key) => value?.[key], report);
    assert.deepEqual(actual, expected, `Required audit gate differs: ${audit.report}/${path}`);
  }
}
const mapping = read(p.mappingPath).mapping;
assert.equal(digest(mapping), p.mappingHash);
const family = name => readFileSync(p.families[name], 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const train = family('train'), validation = family('validation'), final = family('final');
assert.equal(train.length, 8); assert.equal(validation.length, 4); assert.equal(final.length, 8);
assert.equal(train.flatMap(r => r.candidates).length, 16);
assert.equal(train.flatMap(r => r.candidates).filter(c => c.proof.status === 'success').length, 8);
assert.equal(train.flatMap(r => r.candidates).filter(c => c.proof.status === 'failure').length, 8);
const expectedChannels = train.flatMap(panel => panel.candidates.map(candidate =>
  candidate.proof.status === 'success' ? 'PAM02' : 'PPL103'));
assert.equal(p.shuffledChannels.length, expectedChannels.length);
assert.equal(p.shuffledChannels.filter(channel => channel === 'PAM02').length, 8);
assert.equal(p.shuffledChannels.filter(channel => channel === 'PPL103').length, 8);
assert.ok(p.shuffledChannels.some((channel, i) => channel !== expectedChannels[i]));
const encoder = createRelationalChessCueEncoder(mapping, p.cue.config);
assert.equal(encoder.identity, p.cue.identity);
const guard = () => {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
    throw Error('Resource guard: 768 MiB RSS / 256 MiB free memory');
};
guard();
const rootIds = readNpz(p.graphPath, ['root_ids']).root_ids;
guard();
for (const cell of [...Object.values(p.readouts).flat(), ...mapping.groups.flatMap(g => g.dan)])
  assert.equal(rootIds[cell.index].toString(), cell.rootId);
guard();
if (args.preflight) {
  console.log(JSON.stringify({ passed: true, protocolSha256: await sha256(protocolPath),
    seeds: p.seeds, conditions: p.conditions, trainEvents: train.flatMap(r => r.candidates).length,
    validationPanels: validation.length, finalPanels: final.length,
    graphSha256: await sha256(p.graphPath), annotationSha256: await sha256(p.annotationPath),
    scope: 'Frozen identity, matched-family, audited-control and resource preflight; no graph inference or training' }));
  process.exit(0);
}
assert.ok(args.out && args.seed && args.condition);
const seed = Number(args.seed), condition = args.condition;
assert.ok(p.seeds.includes(seed) && p.conditions.includes(condition));
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
const out = resolve(args.out);
if (!args.resume) { assert.ok(!existsSync(out), 'Require fresh output'); mkdirSync(out, { recursive: true }); }
else assert.ok(existsSync(out), 'Resume output directory is missing');
const checkResources = () => guard();
async function pace(ms) {
  let remaining = ms * (1 / duty - 1);
  while (remaining > 0) { const delay = Math.min(250, remaining); await new Promise(r => setTimeout(r, delay)); remaining -= delay; checkResources(); }
}
checkResources(); const graph = loadGraph(p.graphPath); checkResources();
const ids = rootIds; checkResources();
const model = new SparseTrainer(graph, { ...p.model, seed }); checkResources();
const memory = new ReversalMemory(model, mapping, p.memory); checkResources();
const initial = memory.snapshot();
assert.ok(initial.gains.every(g => g === 1) && initial.events === 0, 'Require scratch gains at one');
const invariant = fixedStateHash(model, memory.edges);
const restStarted = performance.now(); model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - restStarted);
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder, readouts: p.readouts,
  rest, current: p.current, priorScale: p.priorScale, maxPresentations: p.maxPresentations,
  maxLegalMoves: 8, guard: checkResources, pace });
const identity = { protocolPath, protocolSha256: await sha256(protocolPath), seed, condition,
  mappingHash: digest(mapping), cueIdentity: encoder.identity, initialMemoryHash: digest(initial),
  fixedStateHash: invariant, model: model.config, memory: memory.config,
  readouts: p.readouts, graphSha256: p.graphSha256, annotationSha256: p.annotationSha256 };
const atomic = (path, data) => {
  const text = JSON.stringify(data, null, 2) + '\n';
  if (existsSync(path)) { assert.equal(readFileSync(path, 'utf8'), text); return; }
  writeFileSync(`${path}.partial`, text, { flag: 'wx' }); renameSync(`${path}.partial`, path);
};
let checkpointSequence = 0;
if (args.resume) {
  const saved = read(args.resume);
  const manifest = read(join(dirname(args.resume), 'checkpoint.json'));
  assert.equal(await sha256(args.resume), manifest.stateSha256);
  const published = readdirSync(out).filter(name => /^checkpoint-\d{5}$/.test(name))
    .map(name => Number(name.slice('checkpoint-'.length))).sort((a, b) => b - a)[0];
  assert.equal(saved.sequence, published, 'Resume only the latest completed checkpoint');
  assert.deepEqual(saved.identity, identity); memory.restore(saved.state.memory);
  brain.presentations = saved.state.presentations; checkpointSequence = saved.sequence;
}
const saveCheckpoint = async state => {
  checkResources();
  let sequence, stem, partial, target;
  do {
    sequence = ++checkpointSequence; stem = `checkpoint-${String(sequence).padStart(5, '0')}`;
    partial = join(out, `${stem}.partial`); target = join(out, stem);
  } while (existsSync(partial) || existsSync(target));
  mkdirSync(partial);
  const statePath = join(partial, 'state.json');
  atomic(statePath, { identity, sequence, state });
  atomic(join(partial, 'checkpoint.json'), { sequence, stateSha256: await sha256(statePath) });
  renameSync(partial, target); return join(target, 'state.json');
};
const eventRows = train.flatMap(panel => panel.candidates.map(candidate => ({ panel, candidate })));
const makeExperience = ({ panel, candidate }) => {
  const board = new Chess(); board.loadPgn(panel.pgn);
  assert.equal(board.fen(), panel.fen);
  const checked = verifiedExperience(board, candidate.move, p.task, candidate.proof);
  assert.ok(checked.learningAllowed && checked.status === candidate.proof.status);
  return { ...checked, proof: candidate.proof,
    context: { fen: panel.fen, pgn: panel.pgn, task: p.task } };
};
const projectRoleSwap = (tokens, cfg) => {
  const swapped = tokens.map(token => token.startsWith('around-target:')
    ? token.replace(/^around-target:/, 'around-origin:')
    : token.startsWith('around-origin:') ? token.replace(/^around-origin:/, 'around-target:') : token).sort();
  if (new Set(swapped).size !== swapped.length) throw Error('Role ablation duplicates input tokens');
  const bucket = token => createHash('sha256').update(`${cfg.seed}\0${token}`).digest().readUInt32LE(0) % encoder.pool.length;
  const unique = [...new Set(swapped.map(bucket))];
  unique.sort((a, b) => {
    const A = createHash('sha256').update(`${cfg.seed}\0budget:${a}`).digest().readUInt32LE(0);
    const B = createHash('sha256').update(`${cfg.seed}\0budget:${b}`).digest().readUInt32LE(0);
    return A - B || a - b;
  });
  const indices = unique.slice(0, cfg.maxCells).sort((a, b) => a - b);
  const current = Math.min(cfg.maxCellCurrent, cfg.totalCurrent / indices.length);
  if (indices.length !== cfg.maxCells || Math.abs(indices.length * current - cfg.totalCurrent) > 1e-9)
    throw Error('Role ablation changed cue/current budget');
  return indices.map(index => ({ index, current }));
};
async function assessPanel(panel, roleScrambled = false) {
  const board = new Chess(); board.loadPgn(panel.pgn); const before = board.pgn();
  const rows = [];
  for (const candidate of [...panel.candidates].sort((a,b) => a.move < b.move ? -1 : a.move > b.move ? 1 : 0)) {
    const cue = encoder.encode(board, candidate.move, p.task);
    const stimulation = roleScrambled ? projectRoleSwap(cue.tokens, p.cue.config) : cue.stimulation;
    const response = await brain.evoke(stimulation);
    rows.push({ move: candidate.move, outcome: candidate.proof.status, ...response });
  }
  assert.equal(board.pgn(), before); assert.equal(fixedStateHash(model, memory.edges), invariant);
  const success = rows.find(row => row.outcome === 'success'), failure = rows.find(row => row.outcome === 'failure');
  const margin = success.score - failure.score;
  return { panelId: panel.id, rows, margin, chosenMove: [...rows].sort((a,b) => b.score-a.score || (a.move<b.move?-1:1))[0].move,
    correctMove: success.move, correct: margin > 0, memoryHash: digest(memory.snapshot()), roleScrambled };
}
const receiptPath = (index) => join(out, 'receipts', `event-${String(index + 1).padStart(3, '0')}.json`);
const publishReceipt = async (index, value) => {
  const path = receiptPath(index); mkdirSync(dirname(path), { recursive: true });
  const bytes = JSON.stringify(value, null, 2) + '\n';
  if (existsSync(path)) assert.equal(readFileSync(path, 'utf8'), bytes);
  else atomic(path, value);
  return { path: path.replaceAll('\\', '/'), sha256: await sha256(path) };
};
let state = args.resume ? read(args.resume).state : { phase: 'baseline', eventIndex: 0, presentations: 0,
  memory: initial, initialMemory: initial, pending: null, receiptRefs: [], baseline: [], results: {} };
if (!args.resume) await saveCheckpoint(state);
if (state.pending) {
  assert.equal(state.pending.eventIndex, state.eventIndex, 'Pending event must match next unacknowledged index');
  const ref = await publishReceipt(state.eventIndex, state.pending);
  state.receiptRefs.push(ref); state.pending = null; state.eventIndex++;
  state.memory = memory.snapshot(); state.presentations = brain.presentations;
  await saveCheckpoint(state);
}
try {
  if (state.phase === 'baseline') {
    for (let i = state.baseline.length; i < final.length; i++) {
      state.baseline.push(await assessPanel(final[i])); state.presentations = brain.presentations;
      await saveCheckpoint(state);
    }
    state.results.baseline = state.baseline;
    state.phase = 'training'; await saveCheckpoint(state);
  }
  if (state.phase === 'training') {
    while (state.eventIndex < eventRows.length) {
      const ref = eventRows[state.eventIndex], experience = makeExperience(ref);
      const correct = experience.status === 'success' ? 'PAM02' : 'PPL103';
      const channel = condition === 'no-channel' ? null
        : condition === 'shuffled' ? p.shuffledChannels[state.eventIndex] : correct;
      const plasticityEnabled = condition !== 'disabled';
      const fixedBefore = fixedStateHash(model, memory.edges);
      const receipt = await brain.replay(experience, { channel, plasticityEnabled });
      const fixedAfter = fixedStateHash(model, memory.edges);
      assert.equal(fixedBefore, invariant); assert.equal(fixedAfter, invariant);
      state.memory = memory.snapshot(); state.presentations = brain.presentations;
      state.pending = { seed, condition, eventIndex: state.eventIndex, panelId: ref.panel.id,
        move: ref.candidate.move, status: experience.status, channel, plasticityEnabled,
        fixedStateBefore: fixedBefore, fixedStateAfter: fixedAfter, before: receipt.before,
        after: receipt.after, local: receipt.local, update: receipt.update, receipt };
      await saveCheckpoint(state);
      const receiptRef = await publishReceipt(state.eventIndex, state.pending);
      state.receiptRefs.push(receiptRef); state.pending = null; state.eventIndex++;
      state.memory = memory.snapshot(); state.presentations = brain.presentations;
      await saveCheckpoint(state);
    }
    state.phase = 'evaluation'; await saveCheckpoint(state);
  }
  if (state.phase === 'evaluation') {
    state.results.validation ??= [];
    for (let i = state.results.validation.length; i < validation.length; i++) {
      state.results.validation.push(await assessPanel(validation[i]));
      state.presentations = brain.presentations; await saveCheckpoint(state);
    }
    state.results.final ??= [];
    for (let i = state.results.final.length; i < final.length; i++) {
      state.results.final.push(await assessPanel(final[i]));
      state.presentations = brain.presentations; await saveCheckpoint(state);
    }
    state.results.repeat ??= [];
    for (let i = state.results.repeat.length; i < final.length; i++) {
      state.results.repeat.push(await assessPanel(final[i]));
      state.presentations = brain.presentations; await saveCheckpoint(state);
    }
    assert.deepEqual(state.results.final, state.results.repeat);
    state.results.roleScrambled ??= [];
    for (let i = state.results.roleScrambled.length; i < final.length; i++) {
      state.results.roleScrambled.push(await assessPanel(final[i], true));
      state.presentations = brain.presentations; await saveCheckpoint(state);
    }
    const learned = memory.snapshot();
    memory.restore(initial); state.memory = memory.snapshot();
    state.results.reset = [];
    for (const panel of final) state.results.reset.push(await assessPanel(panel));
    memory.restore(learned); state.memory = learned; state.results.restored = [];
    for (const panel of final) state.results.restored.push(await assessPanel(panel));
    assert.deepEqual(state.results.final, state.results.restored);
    assert.deepEqual(state.results.baseline, state.results.reset);
    state.phase = 'complete'; state.memory = learned; state.presentations = brain.presentations;
    await saveCheckpoint(state);
  }
  if (state.phase === 'complete') {
    const reportPath = join(out, 'report.json');
    atomic(reportPath, { schema: 'capture-retention-assay-run-v1', identity, condition,
      seed, final: state.results.final, roleScrambled: state.results.roleScrambled,
      validation: state.results.validation, baseline: state.results.baseline, repeat: state.results.repeat,
      reset: state.results.reset, restored: state.results.restored,
      initialMemoryHash: digest(initial), finalMemoryHash: digest(state.memory),
      presentations: state.presentations, receipts: state.receiptRefs,
      scope: 'Single fixed one-pass memory-to-choice condition; no Monte Carlo search or broad reasoning claim' });
    const reportSha256 = await sha256(reportPath);
    atomic(join(out, 'COMPLETE'), { schema: 'capture-retention-assay-complete-v3', reportSha256,
      protocolSha256: identity.protocolSha256, condition, seed });
    console.log(JSON.stringify({ complete: true, condition, seed, reportPath, presentations: state.presentations }));
  }
} catch (error) {
  if (state.pending) {
    state.memory = memory.snapshot(); state.presentations = brain.presentations;
    await saveCheckpoint(state);
  }
  throw error;
}

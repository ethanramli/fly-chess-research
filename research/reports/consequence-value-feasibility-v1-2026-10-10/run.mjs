import assert from 'node:assert/strict';
import { readFileSync, createReadStream, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../../.codebase/src/runtime/graph.mjs';
import { SparseTrainer } from '../../../.codebase/src/supervised-baselines/trainer.mjs';
import { fixedStateHash } from '../../../.codebase/src/neural-learning/association-validation.mjs';
import { digest } from '../../../.codebase/src/neural-learning/mushroom-body.mjs';
import { RateTimingMemory } from '../../../.codebase/src/neural-learning/rate-timing-memory.mjs';
import { readMBON } from '../../../.codebase/src/neural-learning/mbon-readout.mjs';
import { readConsequenceValue } from '../../../.codebase/src/neural-learning/consequence-value-readout.mjs';
import { TemporalFeedbackSession } from '../../../.codebase/src/puzzle-learning/temporal-feedback-session.mjs';
import { createConjoinedPublicMateFrameEncoder } from '../../../.codebase/src/chess-input/conjoined-public-mate-frame-cue.mjs';
import { certifyMate } from '../../../.codebase/src/search-and-feedback/mate-certificate.mjs';
import { verifiedExperience } from '../../../.codebase/src/search-and-feedback/verified-feedback.mjs';
import { publishAtomicJson } from '../../../.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, protocol: { type: 'string' }, resume: { type: 'string' }, 'cpu-duty': { type: 'string' } } });
assert(args.out && args.protocol && Number(args['cpu-duty']) === .5 && process.execArgv.includes('--max-old-space-size=256'));
assert.equal(process.platform, 'win32');
const json = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const processes = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command',
  "@(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],
  { encoding: 'utf8', windowsHide: true, timeout: 15000 }));
assert.equal((Array.isArray(processes) ? processes : [processes]).filter(p => p.ProcessId !== process.pid &&
  /(?:\.codebase[\\/]scripts[\\/]|research[\\/]reports.*[\\/](?:run[^\\/]*|benchmark|audit[^\\/]*)\.mjs)/i.test(p.CommandLine ?? '')).length, 0, 'Another experiment is live');
const p = json(args.protocol), mapping = json(p.mappingPath), started = performance.now(), cpuStart = process.cpuUsage();
let peakRss = 0, presentations = 0;
function guard() {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  assert(peakRss <= 768 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20, 'Resource guard');
  assert(presentations <= p.maxPresentations, 'Neural presentation bound');
}
async function paced(operation) {
  guard(); const begin = performance.now(), result = operation(); presentations++;
  await new Promise(r => setTimeout(r, Math.max(1, performance.now() - begin))); guard(); return result;
}
async function fileHash(path) {
  const h = createHash('sha256'); for await (const bytes of createReadStream(path)) h.update(bytes); return h.digest('hex');
}
for (const [path, hash] of Object.entries(p.sources)) assert.equal(await fileHash(path), hash, path);
assert.equal(await fileHash(p.graphPath), mapping.inputs.graph);
assert.equal(await fileHash(p.annotationPath), mapping.inputs.annotations);
const identity = { protocolHash: await fileHash(args.protocol), sources: p.sources, algorithm: p.schema, node: process.version };
mkdirSync(args.out, { recursive: false }); copyFileSync(args.protocol, join(args.out, 'protocol.json'));
for (const path of Object.keys(p.sources)) {
  const target = join(args.out, 'sources', path); mkdirSync(dirname(target), { recursive: true }); copyFileSync(path, target);
}
const fixtures = p.positions.map(f => ({ ...f, board: new Chess(f.fen) }));
function experience(f, move) {
  const board = f.board, next = new Chess(); next.loadPgn(board.pgn());
  next.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
  const proof = certifyMate(next, board.turn(), { plies: f.task.plies - 1, ...p.verification });
  return { ...verifiedExperience(board, move, f.task, proof), proof, context: { fen: board.fen(), pgn: board.pgn(), task: f.task } };
}
const schedule = p.schedule.map(slot => {
  const f = fixtures.find(f => f.id === slot.position), e = experience(f, slot.move);
  assert.equal(e.status, slot.status, 'Registered lesson consequence mismatch');
  assert.notEqual(e.status, 'unknown'); return { ...slot, experience: e };
});
let state = args.resume ? json(args.resume) : { identity, sequence: 0, arm: 0, lesson: 0, session: null, baselines: null, results: [], receipts: [] };
assert.deepEqual(state.identity, identity);
if (args.resume) for (const r of state.receipts) {
  const path = join(dirname(args.resume), r.path); assert.equal(await fileHash(path), r.sha256); copyFileSync(path, join(args.out, r.path));
}
function publish(kind, value) {
  const path = `receipt-${state.receipts.length}.json`, sha256 = publishAtomicJson(join(args.out, path), { kind, ...value });
  state.receipts.push({ path, sha256 });
}
function checkpoint() { state.sequence++; publishAtomicJson(join(args.out, `checkpoint-${state.sequence}.json`), state); }
checkpoint(); guard(); const graph = loadGraph(p.graphPath); guard();
const roots = readNpz(p.graphPath, ['root_ids']).root_ids;
for (const c of [...Object.values(p.readout.cells).flat(), ...mapping.groups.flatMap(g => g.dan)]) assert.equal(roots[c.index].toString(), c.rootId);
const base = createConjoinedPublicMateFrameEncoder(mapping, p.encoder);
const encoder = { encode: (b, action, task) => base.encode({ schema: 'public-lesson-frame-v1', fen: b.fen(), pgn: b.pgn(), task, action }) };
const rates = model => Object.fromEntries(Object.entries(p.readout.cells).map(([type, cells]) => [type, cells.map(c => model.h[model.steps][c.index])]));
for (; state.arm < p.conditions.length;) {
  const condition = p.conditions[state.arm], model = new SparseTrainer(graph, p.model);
  await paced(() => model.forward([0])); const reference = Float32Array.from(model.h[model.steps]);
  const memory = new RateTimingMemory(model, mapping, reference, p.memory), fixed = fixedStateHash(model, memory.edges);
  const session = new TemporalFeedbackSession({ model, memory, mapping, encoder, timing: p.timing,
    identity: digest({ identity, condition, memory: memory.identity, encoder: base.identity, readout: p.readout }) });
  if (state.session) session.restore(state.session);
  async function measure(f) {
    const before = digest(memory.snapshot()), fen = f.board.fen(), pgn = f.board.pgn(), rows = [];
    for (const m of f.board.moves({ verbose: true })) {
      const move = m.from + m.to + (m.promotion ?? ''), cue = encoder.encode(f.board, move, f.task);
      await paced(() => model.forward([0], cue.stimulation)); rows.push({ move, rates: rates(model), cueHash: digest(cue) });
    }
    assert.equal(digest(memory.snapshot()), before); assert.equal(f.board.fen(), fen); assert.equal(f.board.pgn(), pgn);
    return { fen, pgn, task: f.task, rows, memoryHash: before };
  }
  if (!state.baselines) {
    state.baselines = {};
    for (const f of fixtures) state.baselines[f.id] = await measure(f);
    publish('unconditioned-reference', { baselines: state.baselines, memory: memory.snapshot(), fixed, reference: [...reference] });
    state.session = session.snapshot(); checkpoint();
  }
  async function assess(f) {
    const assessment = await measure(f);
    for (const row of assessment.rows) {
      const baseline = state.baselines[f.id].rows.find(r => r.move === row.move);
      assert.equal(row.cueHash, baseline.cueHash);
      Object.assign(row, readConsequenceValue(row.rates, baseline.rates, p.readout.scale)); row.score = row.value;
    }
    const top = assessment.rows.filter(r => r.score === Math.max(...assessment.rows.map(r => r.score)));
    assessment.choice = top.length === 1 ? top[0].move : null;
    assessment.rawChoice = [...assessment.rows].sort((a, b) => b.MBON12 - b.MBON01 - (a.MBON12 - a.MBON01))[0].move;
    return assessment;
  }
  let result = state.results[state.arm];
  if (!result) {
    result = { condition, fixedBefore: fixed, initialMemory: memory.snapshot(), initial: await assess(fixtures[0]), lessonAssessments: [] };
    assert(result.initial.rows.every(r => r.value === 0), 'Unconditioned reference differs');
    state.results.push(result); state.session = session.snapshot(); checkpoint();
  }
  for (; state.lesson < schedule.length;) {
    const slot = schedule[state.lesson], f = fixtures.find(f => f.id === slot.position);
    const options = condition === 'shuffled' ? { condition, shuffledStatus: schedule[p.shufflePermutation[state.lesson]].status } : { condition };
    if (!session.pending) {
      const assessment = await assess(f); session.start(slot.experience, assessment, options);
      publish('lesson-start', { arm: state.arm, lesson: state.lesson, experience: slot.experience, plan: session.pending.plan,
        binding: session.pending.binding, memory: memory.snapshot() }); state.session = session.snapshot(); checkpoint();
    }
    while (session.pending.cursor < session.pending.plan.frames.length) {
      guard(); const begin = performance.now(), before = memory.snapshot(), frame = session.step(); presentations++;
      const local = model.h.slice(1).map(h => memory.kc.map((index, i) => ({ kc: h[index], dan: h[memory.dan[i]] })));
      publish('frame', { arm: state.arm, lesson: state.lesson, frame, local, before, memory: memory.snapshot() });
      state.session = session.snapshot(); checkpoint();
      await new Promise(r => setTimeout(r, Math.max(1, performance.now() - begin))); guard();
    }
    const receipt = session.finish(); publish('lesson', { arm: state.arm, lesson: state.lesson, receipt });
    const after = await assess(f); result.lessonAssessments.push({ position: f.id, assessment: after });
    state.lesson++; state.session = session.snapshot(); checkpoint();
  }
  result.final = {};
  for (const f of fixtures) result.final[f.id] = await assess(f);
  result.finalMemory = memory.snapshot(); result.fixedAfter = fixedStateHash(model, memory.edges);
  assert.equal(result.fixedAfter, fixed);
  // Causal reset and exact restore: never retain the intervention as learned state.
  memory.restore(result.initialMemory);
  const reset = await assess(fixtures[0]); assert(reset.rows.every(r => r.value === 0)); result.resetPassed = true;
  memory.restore(result.finalMemory); const restored = await assess(fixtures[0]);
  assert.deepEqual(restored, result.final[fixtures[0].id]); result.restorePassed = true;
  if (condition === 'disabled') assert.deepEqual(result.finalMemory, result.initialMemory);
  state.arm++; state.lesson = 0; state.session = null; publish('arm', { result }); checkpoint();
}
for (const r of state.results) {
  r.outcomes = {};
  const firstChoice = r.lessonAssessments[1].assessment.choice;
  const firstExperience = firstChoice ? experience(fixtures[0], firstChoice) : null;
  r.firstAcquisition = { choice: firstChoice, status: firstExperience?.status ?? 'tie', proof: firstExperience?.proof ?? null };
  for (const f of fixtures) {
    const assessment = r.final[f.id], e = assessment.choice ? experience(f, assessment.choice) : null;
    r.outcomes[f.id] = { choice: assessment.choice, status: e?.status ?? 'tie', proof: e?.proof ?? null };
  }
}
const informative = state.results.find(r => r.condition === 'informative');
const trained = fixtures.filter(f => f.role === 'training');
const acquisition = informative.firstAcquisition.status === 'success' && trained.every(f => informative.outcomes[f.id].status === 'success');
const specificity = state.results.filter(r => r.condition !== 'informative').every(r =>
  trained.some(f => r.outcomes[f.id].status !== 'success'));
const cf = informative.final[p.counterfactual.changed].rows.find(r => r.move === p.counterfactual.move).value;
const intact = informative.final[p.counterfactual.intact].rows.find(r => r.move === p.counterfactual.move).value;
const gates = { familiarAcquisitionAndCoexistence: acquisition, matchedControlSpecificity: specificity,
  supportShiftSensitivity: intact > cf + p.marginFloor,
  changedBoardChoice: informative.outcomes[p.changedBoardProbe].status === 'success',
  causalResetRestore: state.results.every(r => r.resetPassed && r.restorePassed) };
guard(); const result = { identity, results: state.results, baselines: state.baselines, receipts: state.receipts, gates,
  feasibilityPassed: Object.values(gates).every(Boolean), presentations, peakRssMiB: peakRss / 2 ** 20,
  freeMiBAtEnd: os.freemem() / 2 ** 20, elapsedSeconds: (performance.now() - started) / 1000,
  cpu: process.cpuUsage(cpuStart), command: { argv: process.argv, execArgv: process.execArgv },
  resumedFrom: args.resume ? resolve(args.resume) : null, scope: p.scope,
  status: 'Completed development feasibility; independent audit required; no disjoint transfer, calibrated value or biological validation' };
publishAtomicJson(join(args.out, 'result.json'), result);
console.log(JSON.stringify({ gates, feasibilityPassed: result.feasibilityPassed, peakRssMiB: result.peakRssMiB,
  outcomes: result.results.map(r => ({ condition: r.condition, outcomes: r.outcomes })) }));

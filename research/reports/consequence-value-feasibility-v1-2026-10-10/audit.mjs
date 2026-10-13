// Full neural feedback and assessment replay from pinned source bytes.
import assert from 'node:assert/strict';
import { readFileSync, createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { Chess } from 'chess.js';

const out = process.argv[2];
assert(out && process.argv[3] === '--cpu-duty' && process.argv[4] === '0.5' && process.execArgv.includes('--max-old-space-size=256'));
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const p = json(join(out, 'protocol.json')), result = json(join(out, 'result.json'));
const processes = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command',
  "@(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],
  { encoding: 'utf8', windowsHide: true, timeout: 15000 }));
assert.equal((Array.isArray(processes) ? processes : [processes]).filter(x => x.ProcessId !== process.pid &&
  /(?:\.codebase[\\/]scripts[\\/]|research[\\/]reports.*[\\/](?:run[^\\/]*|benchmark|audit[^\\/]*)\.mjs)/i.test(x.CommandLine ?? '')).length, 0);
async function hash(path) { const h = createHash('sha256'); for await (const bytes of createReadStream(path)) h.update(bytes); return h.digest('hex'); }
for (const [path, expected] of Object.entries(p.sources)) assert.equal(await hash(join(out, 'sources', path)), expected, path);
assert.equal(await hash(join(out, 'protocol.json')), result.identity.protocolHash);
const load = path => import(pathToFileURL(resolve(out, 'sources', '.codebase/src', path)).href);
const { loadGraph, readNpz } = await load('runtime/graph.mjs');
const { SparseTrainer } = await load('supervised-baselines/trainer.mjs');
const { RateTimingMemory } = await load('neural-learning/rate-timing-memory.mjs');
const { readConsequenceValue } = await load('neural-learning/consequence-value-readout.mjs');
const { digest } = await load('neural-learning/mushroom-body.mjs');
const { fixedStateHash } = await load('neural-learning/association-validation.mjs');
const { TemporalFeedbackSession } = await load('puzzle-learning/temporal-feedback-session.mjs');
const { createConjoinedPublicMateFrameEncoder } = await load('chess-input/conjoined-public-mate-frame-cue.mjs');
const { verifiedExperience } = await load('search-and-feedback/verified-feedback.mjs');
const { publishAtomicJson } = await load('puzzle-learning/plasticity-mechanism-assay.mjs');
const mapping = json(join(out, 'sources', p.mappingPath));
assert.equal(await hash(p.graphPath), mapping.inputs.graph); assert.equal(await hash(p.annotationPath), mapping.inputs.annotations);
const begin = performance.now(), cpu = process.cpuUsage(); let peakRss = 0, presentations = 0;
function guard() { peakRss = Math.max(peakRss, process.memoryUsage().rss); assert(peakRss <= 768 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20); }
async function pace(fn) { guard(); const t = performance.now(), v = fn(); presentations++; await new Promise(r => setTimeout(r, Math.max(1, performance.now() - t))); guard(); return v; }
guard(); const graph = loadGraph(p.graphPath); guard();
const roots = readNpz(p.graphPath, ['root_ids']).root_ids;
for (const c of [...Object.values(p.readout.cells).flat(), ...mapping.groups.flatMap(g => g.dan)]) assert.equal(roots[c.index].toString(), c.rootId);
const base = createConjoinedPublicMateFrameEncoder(mapping, p.encoder);
const encoder = { encode: (b, action, task) => base.encode({ schema: 'public-lesson-frame-v1', fen: b.fen(), pgn: b.pgn(), task, action }) };
const rates = model => Object.fromEntries(Object.entries(p.readout.cells).map(([type, cells]) => [type, cells.map(c => model.h[model.steps][c.index])]));
let model, memory, session, reference, arm = -1, auditedFrames = 0, auditedLessons = 0;
async function assess(f) {
  const board = new Chess(f.fen), before = digest(memory.snapshot()), rows = [];
  for (const m of board.moves({ verbose: true })) {
    const move = m.from + m.to + (m.promotion ?? ''), cue = encoder.encode(board, move, f.task);
    await pace(() => model.forward([0], cue.stimulation));
    const response = rates(model), baseline = result.baselines[f.id].rows.find(r => r.move === move);
    assert.equal(digest(cue), baseline.cueHash);
    const row = { move, rates: response, cueHash: digest(cue), ...readConsequenceValue(response, baseline.rates, p.readout.scale) };
    row.score = row.value; rows.push(row);
  }
  assert.equal(digest(memory.snapshot()), before);
  const top = rows.filter(r => r.score === Math.max(...rows.map(x => x.score)));
  return { fen: board.fen(), pgn: board.pgn(), task: f.task, rows, memoryHash: before,
    choice: top.length === 1 ? top[0].move : null,
    rawChoice: [...rows].sort((a, b) => b.MBON12 - b.MBON01 - (a.MBON12 - a.MBON01))[0].move };
}
for (const receipt of result.receipts) {
  assert.equal(await hash(join(out, receipt.path)), receipt.sha256);
  const r = json(join(out, receipt.path));
  if (r.kind === 'unconditioned-reference') {
    assert.deepEqual(r.baselines, result.baselines);
    model = new SparseTrainer(graph, p.model); await pace(() => model.forward([0])); reference = Float32Array.from(model.h[model.steps]);
    assert.deepEqual([...reference], r.reference);
    for (const f of p.positions) for (const row of result.baselines[f.id].rows) {
      const board = new Chess(f.fen), cue = encoder.encode(board, row.move, f.task);
      assert.equal(digest(cue), row.cueHash); await pace(() => model.forward([0], cue.stimulation)); assert.deepEqual(rates(model), row.rates);
    }
  }
  if (r.arm !== undefined && r.arm !== arm) {
    arm = r.arm; model = new SparseTrainer(graph, p.model); await pace(() => model.forward([0]));
    reference = Float32Array.from(model.h[model.steps]); memory = new RateTimingMemory(model, mapping, reference, p.memory);
    session = new TemporalFeedbackSession({ model, memory, mapping, encoder, timing: p.timing,
      identity: digest({ identity: result.identity, condition: p.conditions[arm], memory: memory.identity, encoder: base.identity, readout: p.readout }) });
    assert.deepEqual(memory.snapshot(), result.results[arm].initialMemory);
  }
  if (r.kind === 'lesson-start') {
    const slot = p.schedule[r.lesson], f = p.positions.find(f => f.id === slot.position), board = new Chess(f.fen);
    assert.deepEqual(r.experience.context, { fen: board.fen(), pgn: board.pgn(), task: f.task });
    const checked = verifiedExperience(board, slot.move, f.task, r.experience.proof);
    for (const key of ['status', 'actor', 'certificateSha256', 'learningAllowed']) assert.equal(r.experience[key], checked[key]);
    assert.equal(checked.status, slot.status); assert.deepEqual(memory.snapshot(), r.memory);
    assert.deepEqual(await assess(f), r.binding.assessment);
    const condition = p.conditions[arm], options = condition === 'shuffled'
      ? { condition, shuffledStatus: p.schedule[p.shufflePermutation[r.lesson]].status } : { condition };
    session.start(r.experience, r.binding.assessment, options); assert.deepEqual(session.pending.plan, r.plan);
  }
  if (r.kind === 'frame') {
    assert.deepEqual(memory.snapshot(), r.before); const actual = await pace(() => session.step());
    assert.deepEqual(actual, r.frame); assert.deepEqual(memory.snapshot(), r.memory);
    const local = model.h.slice(1).map(h => memory.kc.map((index, i) => ({ kc: h[index], dan: h[memory.dan[i]] })));
    assert.deepEqual(local, r.local); auditedFrames++;
  }
  if (r.kind === 'lesson') {
    assert.deepEqual(session.finish(), r.receipt); auditedLessons++;
    const f = p.positions.find(f => f.id === p.schedule[r.lesson].position);
    assert.deepEqual(await assess(f), result.results[arm].lessonAssessments[r.lesson].assessment);
  }
  if (r.kind === 'arm') {
    const expected = result.results[arm]; assert.deepEqual(memory.snapshot(), expected.finalMemory);
    assert.equal(fixedStateHash(model, memory.edges), expected.fixedBefore);
    for (const f of p.positions) assert.deepEqual(await assess(f), expected.final[f.id]);
    memory.restore(expected.initialMemory); assert((await assess(p.positions[0])).rows.every(r => r.value === 0));
    memory.restore(expected.finalMemory); assert.deepEqual(await assess(p.positions[0]), expected.final[p.positions[0].id]);
    if (p.conditions[arm] === 'disabled') assert.deepEqual(expected.finalMemory, expected.initialMemory);
  }
}
assert.equal(auditedLessons, p.schedule.length * p.conditions.length);
assert.equal(auditedFrames, auditedLessons * (p.timing.cueFrame + p.timing.tailFrames + 1));
const informative = result.results.find(r => r.condition === 'informative'), train = p.positions.filter(f => f.role === 'training');
for (const r of result.results) for (const f of p.positions) if (r.outcomes[f.id].choice) {
  const e = r.outcomes[f.id], board = new Chess(f.fen), checked = verifiedExperience(board, e.choice, f.task, e.proof);
  assert.equal(checked.status, e.status); assert.notEqual(e.status, 'unknown');
}
for (const r of result.results) if (r.firstAcquisition.choice) {
  assert.equal(r.firstAcquisition.choice, r.lessonAssessments[1].assessment.choice);
  const f = p.positions[0], e = r.firstAcquisition;
  assert.equal(verifiedExperience(new Chess(f.fen), e.choice, f.task, e.proof).status, e.status);
}
const value = (id, move) => informative.final[id].rows.find(r => r.move === move).value;
const gates = { familiarAcquisitionAndCoexistence: informative.firstAcquisition.status === 'success' && train.every(f => informative.outcomes[f.id].status === 'success'),
  matchedControlSpecificity: result.results.filter(r => r.condition !== 'informative').every(r => train.some(f => r.outcomes[f.id].status !== 'success')),
  supportShiftSensitivity: value(p.counterfactual.intact, p.counterfactual.move) > value(p.counterfactual.changed, p.counterfactual.move) + p.marginFloor,
  changedBoardChoice: informative.outcomes[p.changedBoardProbe].status === 'success', causalResetRestore: true };
assert.deepEqual(gates, result.gates); assert.equal(result.feasibilityPassed, Object.values(gates).every(Boolean)); guard();
const audit = { timestamp: new Date().toISOString(), passed: true, fullNeuralReplay: true, auditedFrames, auditedLessons,
  gates, feasibilityPassed: result.feasibilityPassed, presentations, peakRssMiB: peakRss / 2 ** 20,
  elapsedSeconds: (performance.now() - begin) / 1000, cpu: process.cpuUsage(cpu),
  scope: 'Independent receipt/certificate/assessment replay using archived integrator and dynamics; not independent biological validation or disjoint-family transfer' };
publishAtomicJson(join(out, 'audit.json'), audit); console.log(JSON.stringify(audit));

"""Make a fresh development runner without editing the evidence-bearing v1 source."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parent.parent
parent = ROOT / '.codebase/scripts/neural-learning/run-eye-graph-memory.mjs'
target = parent.with_name('run-eye-graph-memory-cubic.mjs')
source = parent.read_text(encoding='utf-8')
assert hashlib.sha256(parent.read_bytes()).hexdigest() == '58753488dac336eaf45d7db6cfdb2ed39c7a1174f6617df3822c52a1f7e22654'
assert not target.exists(), 'Preserve existing generated runner'

def replace(old, new):
    global source
    assert source.count(old) == 1, (source.count(old), old[:80])
    source = source.replace(old, new)

replace("import { LocalSupralinearReservoirMemory } from '../../src/neural-learning/local-supralinear-reservoir-memory.mjs';", "import { LocalCubicReservoirMemory } from '../../src/neural-learning/local-cubic-reservoir-memory.mjs';")
replace("writeFileSync } from 'node:fs'", "writeFileSync, renameSync } from 'node:fs'")
replace('performance.now() - started > 7000000', 'performance.now() - started > 10800000')
replace("const sha = v => createHash('sha256').update(v).digest('hex');", """const sha = v => createHash('sha256').update(v).digest('hex');
const atomic = (file, value) => { writeFileSync(file + '.partial', JSON.stringify(value) + '\\n'); renameSync(file + '.partial', file); };
const sleepWord = new Int32Array(new SharedArrayBuffer(4));
const paceModel = model => {
  const raw = model.forward.bind(model);
  model.forward = (...args) => { guard(); const t = performance.now(), r = raw(...args); Atomics.wait(sleepWord, 0, 0, performance.now() - t); return r; };
};
const localHash = memory => { const h = createHash('sha256'); for (const x of [memory.gains, memory.traces, memory.states]) h.update(Buffer.from(x.buffer, x.byteOffset, x.byteLength)); return h.update(JSON.stringify([memory.time, memory.pulses])).digest('hex'); };
const pins = Object.fromEntries(['.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv',
  '.codebase/src/chess-input/eyes-v1.mjs', '.codebase/src/chess-input/eyes-v1-pictures.json',
  '.codebase/src/neural-learning/neuron-reader.mjs', '.codebase/src/neural-learning/neuron-reader-cells.json',
  '.codebase/src/neural-learning/local-cubic-reservoir-memory.mjs', '.codebase/src/neural-learning/local-reservoir-memory.mjs',
  '.codebase/src/neural-learning/local-gated-memory.mjs', '.codebase/src/neural-learning/local-supralinear-reservoir-memory.mjs',
  '.codebase/src/neural-learning/memory-assay-rule-prediction-scaled.mjs', '.codebase/src/neural-learning/memory-assay-fixture.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs', '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/runtime/sparse-accumulator.mjs', '.codebase/src/runtime/graph.mjs',
  'research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md',
  '.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs', 'package-lock.json'].map(p => [p, sha(readFileSync(p))]));
atomic(`${a.out}/manifest.json`, { schema: 'eye-graph-memory-cubic-v1', status: 'running', argv: process.argv, node: process.version, started: new Date().toISOString(), pins, limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 10800 } });
""")
replace('eyeModel.forward([0]);', 'paceModel(eyeModel);\neyeModel.forward([0]);')
replace("  const groups = COMPARTMENTS.map", "  paceModel(model);\n  const groups = COMPARTMENTS.map")
replace('new LocalSupralinearReservoirMemory(model, { groups }, { eta: ETA })', 'new LocalCubicReservoirMemory(model, { groups }, { eta: ETA, V0 })')
replace("  const w = makeWorld(seed), { model, memory, tonic, rest } = w, images = items.flatMap(x => x.images), value = makeReadout(w, images);", """  let w = makeWorld(seed), { model, memory, tonic, rest } = w;
  const images = items.flatMap(x => x.images);
  let value = makeReadout(w, images);
  const suffix = `${seed}-${arm}${opts.restore ? '-restored' : ''}`, frameFile = `${a.out}/frames-${suffix}.jsonl`;
  let frame = 0, context = { phase: 'initial' };
  const log = record => appendFileSync(frameFile, JSON.stringify(record) + '\\n');
  log({ kind: 'start', seed, arm, config: memory.config, identity: memory.identity, mapping: memory.mapping, initial: memory.snapshot(), items, localHash: localHash(memory) });
  const localKcs = [...new Set(memory.mapping.groups.flatMap(g => g.kc))];
  const observe = dt => {
    const t = performance.now(), h = model.h[model.steps], c = memory.config, before = localHash(memory);
    const ks = localKcs.map(i => [i, Math.min(1, Math.max(0, h[i] - rest[i]) / c.activityScale)]).filter(([, k]) => k > c.theta);
    const ds = memory.mapping.groups.map(g => {
      let excess = 0, deficit = 0;
      for (const { index } of g.dan) { excess += Math.max(0, h[index] - rest[index]) / c.activityScale; deficit += Math.max(0, rest[index] - h[index]) / c.activityScale; }
      return { excess: excess / g.dan.length, deficit: deficit / g.dan.length };
    });
    memory.observe(rest, dt);
    log({ kind: 'frame', frame: frame++, context, dt, ks, ds, before, after: localHash(memory) });
    if (frame % 50 === 0) atomic(`${a.out}/progress.json`, { seed, arm, restored: !!opts.restore, frame, context, time: memory.time });
    Atomics.wait(sleepWord, 0, 0, performance.now() - t);
  };""")
source = source.replace('memory.observe(rest, dt)', 'observe(dt)')
# The observation wrapper itself must call the real memory rule.
replace('    observe(dt);\n    log', '    memory.observe(rest, dt);\n    log')
source = source.replace('memory.observe(rest, 1)', 'observe(1)').replace('memory.observe(rest, 4)', 'observe(4)')
replace("    if (stateHash() !== before) throw Error('Test changed persistent state');", """    if (stateHash() !== before) throw Error('Test changed persistent state');
    atomic(`${a.out}/snapshot-${suffix}-${name}.json`, { seed, arm, phase: name, snapshot: memory.snapshot(), localHash: localHash(memory), tests: tests[name] });
    log({ kind: 'test', name, results: tests[name], localHash: localHash(memory) });""")
replace("      const unknown = (trial + 1) % 8 === 0; trial++;", """      const unknown = (trial + 1) % 8 === 0; trial++;
      context = { phase: name, trial, item: j, step: 'choice', chosen: null };""")
replace('      const now = value(code); if (learns) observe(1);', "      context = { ...context, step: 'chosen', chosen: choice };\n      const now = value(code); if (learns) observe(1);")
replace('      look(code, TONIC + (pulse - TONIC) * f, 1);', """      log({ kind: 'trial', context, scores, choice, unknown, good, valence, now, scale: f, level: TONIC + (pulse - TONIC) * f,
        certificate: { criterion: 'assigned-action-association-v1', scope: 'arbitrary association only; no chess consequence', fen: items[j].fen, moves: items[j].moves, chosenMove: items[j].moves[choice], known: !unknown, goodMove: items[j].moves[good] } });
      context = { ...context, step: 'feedback' };
      look(code, TONIC + (pulse - TONIC) * f, 1);""")
replace('  for (let s = 0; s < DELAY_STEPS; s++) {\n    guard();', "  for (let s = 0; s < DELAY_STEPS; s++) {\n    guard(); context = { phase: 'Delay', step: s };")
replace('  if (opts.restore) memory.restore(JSON.parse(JSON.stringify(memory.snapshot())));', """  if (opts.restore) {
    const saved = JSON.parse(JSON.stringify(memory.snapshot())), before = localHash(memory);
    w = makeWorld(seed); const freshValue = makeReadout(w, images); w.memory.restore(saved);
    ({ model, memory, tonic, rest } = w); value = freshValue;
    if (localHash(memory) !== before) throw Error('Fresh-model restore changed local state');
    log({ kind: 'fresh-restore', before, after: localHash(memory) });
  }""")
replace("  return { seed, arm, tests, pulses, realized, initialGains, gainsBefore, finalState: stateHash()", "  log({ kind: 'end', frames: frame, finalState: localHash(memory) });\n  return { seed, arm, tests, pulses, realized, initialGains, gainsBefore, frames: frame, finalLocalState: localHash(memory), finalState: stateHash()")
replace("  for (const rec of [inf, runArm(seed, items, 'absent'), runArm(seed, items, 'shuffled', yoked), runArm(seed, items, 'disabled')]) { rows.push(rec); appendFileSync(`${a.out}/records.jsonl`, JSON.stringify(rec) + '\\n'); }", """  for (const name of ['informative', 'absent', 'shuffled', 'disabled']) {
    const rec = name === 'informative' ? inf : runArm(seed, items, name, yoked);
    rows.push(rec); appendFileSync(`${a.out}/records.jsonl`, JSON.stringify(rec) + '\\n');
    atomic(`${a.out}/completed.json`, { seed, arm: name, records: rows.length, finalState: rec.finalLocalState });
    console.log(JSON.stringify({ seed, arm: name, completedRecords: rows.length, last: rec.tests[`T${ITEMS - 1}`].map(x => x.mNorm), delay: rec.tests.Delay.map(x => x.mNorm) }));
  }""")
replace('  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, performance.now() - t0); // duty 0.5', "  // Graph passes and local observation/receipt work are paced individually at duty .5.")
replace("schema: 'eye-graph-memory-v1'", "schema: 'eye-graph-memory-cubic-v1'")
replace("spec: sha(readFileSync('research/reports/memory-retention-continuation-2026-10-31/eye-graph-memory-spec.md'))", "spec: pins['research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md']")
replace("console.log(JSON.stringify(Object.fromEntries(Object.entries(marks)", "atomic(`${a.out}/manifest.json`, { schema: summary.schema, status: 'complete', argv: process.argv, node: process.version, pins, summary: sha(readFileSync(`${a.out}/summary.json`)), wall: summary.wall, maxRssMiB: summary.maxRssMiB });\nconsole.log(JSON.stringify(Object.fromEntries(Object.entries(marks)")
source = '// Cubic-exit development comparison, cubic-exit-spec.md; generated from the preserved v1 runner.\n' + source
target.write_text(source, encoding='utf-8', newline='\n')
print('{"prepared":".codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs"}')

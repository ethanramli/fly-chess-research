"""Fork only recovery control flow; preserve the frozen experiment and learner."""
from pathlib import Path
import hashlib

root = Path(__file__).resolve().parent.parent
parent = root / '.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs'
target = parent.with_name('resume-eye-graph-memory-cubic.mjs')
assert hashlib.sha256(parent.read_bytes()).hexdigest() == '25534f91afbcc5da13241abf42d65b2b4fbc1c1e6d51dc84f05b2138790660d2'
assert not target.exists()
source = parent.read_text(encoding='utf-8')

def replace(old, new):
    global source
    assert source.count(old) == 1, (source.count(old), old[:90])
    source = source.replace(old, new)

replace("import { createHash } from 'node:crypto';", "import { createHash } from 'node:crypto';\nimport { prepareRecovery } from './eye-memory-recovery.mjs';")
replace("out: { type: 'string' }, seeds:", "out: { type: 'string' }, 'resume-run': { type: 'string' }, seeds:")
replace("if (a['cpu-duty'] !== '0.5')", "if (!a['resume-run']) throw Error('Require --resume-run PRESERVED_PARENT');\nif (a['cpu-duty'] !== '0.5')")
replace("'.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs', 'package-lock.json'", """'.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs',
  '.codebase/scripts/neural-learning/resume-eye-graph-memory-cubic.mjs',
  '.codebase/scripts/neural-learning/eye-memory-recovery.mjs', '.codebase/scripts/neural-learning/audit-eye-memory.mjs',
  'research/reports/memory-retention-continuation-2026-11-01/recovery-spec.md', 'package-lock.json'""")
replace("const graph = loadGraph('.cache/full.npz')", """const recovery = await prepareRecovery(a['resume-run'], a.out);
atomic(`${a.out}/manifest.json`, { schema: 'eye-graph-memory-cubic-v1', status: 'running', argv: process.argv, node: process.version, pins, recovery: recovery.lineage,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 10800 } });
console.log(JSON.stringify({ resumed: true, completedArmRecords: recovery.rows.length, seed: 4102, arm: 'absent', after: 'T1', trial: 48, frame: 336 }));
const graph = loadGraph('.cache/full.npz')""")
replace("  let frame = 0, context = { phase: 'initial' };\n  const log = record => appendFileSync(frameFile, JSON.stringify(record) + '\\n');\n  log({ kind: 'start'", """  const resumed = seed === 4102 && arm === 'absent' ? recovery.resume : null;
  const matchedFrames = new Set(), matchedTrials = new Set();
  let frame = resumed?.frames ?? 0, context = { phase: 'initial' };
  const log = record => {
    const expected = !resumed ? null : record.kind === 'frame' ? recovery.overlap.byFrame.get(record.frame) : record.kind === 'trial' ? recovery.overlap.byTrial.get(record.context.trial) : null;
    if (expected) {
      if (JSON.stringify(record) !== JSON.stringify(expected)) throw Error('Resumed trajectory differs from original overlapping receipt');
      if (record.kind === 'frame') matchedFrames.add(record.frame); else matchedTrials.add(record.context.trial);
    }
    appendFileSync(frameFile, JSON.stringify(record) + '\\n');
  };
  if (!resumed) log({ kind: 'start'""")
replace("  let trial = 0, cursor = {};", """  let trial = 0, cursor = {};
  if (resumed) {
    memory.restore(resumed.snapshot);
    if (localHash(memory) !== recovery.lineage.checkpoint.localHash) throw Error('Restored checkpoint mismatch');
    trial = resumed.trials;
    for (let i = 0; i < trial; i++) rng();
    Object.assign(tests, resumed.tests); Object.assign(pulses, resumed.pulses); Object.assign(realized, resumed.realized);
    atomic(`${a.out}/progress.json`, { seed, arm, frame, context: { phase: 'T1', resumed: true }, time: memory.time });
  }""")
replace("  for (let j = 0; j < ITEMS; j++) { block(`B${j}`, j, 0); test(`T${j}`, () => 0); }", "  for (let j = resumed ? 2 : 0; j < ITEMS; j++) { block(`B${j}`, j, 0); test(`T${j}`, () => 0); }")
replace("  log({ kind: 'end', frames: frame, finalState: localHash(memory) });", """  if (resumed && (matchedFrames.size !== recovery.overlap.byFrame.size || matchedTrials.size !== recovery.overlap.byTrial.size)) throw Error('Incomplete overlapping-trajectory check');
  log({ kind: 'end', frames: frame, finalState: localHash(memory) });
  if (resumed) atomic(`${a.out}/overlap-verification.json`, { passed: true, matchedFrames: matchedFrames.size, matchedTrials: matchedTrials.size, checkpoint: recovery.lineage.checkpoint, finalState: localHash(memory) });""")
replace("const seeds = Array.from({ length: Number(a.seeds) }, (_, i) => Number(a.first) + i), rows = [];", "const seeds = Array.from({ length: Number(a.seeds) }, (_, i) => Number(a.first) + i), rows = [...recovery.rows];")
replace("  const items = buildItems(seed), t0 = performance.now(), inf = runArm(seed, items, 'informative');", """  if (rows.filter(r => r.seed === seed).length === 4) continue;
  const items = recovery.cachedItems(seed) ?? buildItems(seed), t0 = performance.now(), inf = rows.find(r => r.seed === seed && r.arm === 'informative') ?? runArm(seed, items, 'informative');""")
replace("  for (const name of ['informative', 'absent', 'shuffled', 'disabled']) {\n    const rec", "  for (const name of ['informative', 'absent', 'shuffled', 'disabled']) {\n    if (rows.some(r => r.seed === seed && r.arm === name)) continue;\n    const rec")
replace("writeFileSync(`${a.out}/summary.json`, JSON.stringify(summary, null, 1) + '\\n');", """Object.assign(summary, { recovery: recovery.lineage, metricsScope: 'This resumed invocation only; copied records are original evidence, not repeated trials' });
writeFileSync(`${a.out}/summary.json`, JSON.stringify(summary, null, 1) + '\\n');""")
replace("pins, summary: sha(readFileSync(`${a.out}/summary.json`))", "pins, recovery: recovery.lineage, metricsScope: summary.metricsScope, summary: sha(readFileSync(`${a.out}/summary.json`))")
source = '// Execution-only continuation from verified phase T1; recovery-spec.md. No learner or scientific-gate change.\n' + source
target.write_text(source, encoding='utf-8', newline='\n')
print('{"prepared":".codebase/scripts/neural-learning/resume-eye-graph-memory-cubic.mjs"}')

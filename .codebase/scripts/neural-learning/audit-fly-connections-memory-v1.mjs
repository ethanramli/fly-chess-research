#!/usr/bin/env node
// Independent auditor for fly connections memory v1 (contract: research/reports/fly-connections-memory-v1-2026-11-07/build-auditor-prompt.txt).
// Usage (repo root): node --max-old-space-size=256 .codebase/scripts/neural-learning/audit-fly-connections-memory-v1.mjs --run RUNDIR --config REG [--replay N]
// Writes RUNDIR/audit.json atomically. Exit 0 after writing (pass or fail); exit 1 only on a crash.
// Only check 10 (replay) loads the pinned graph; it re-executes the first N events of each tape phase from that phase's start state and re-ranks two test boards, one job at a time.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';
import { createFlyCondition } from '../../src/neural-learning/fly-connections-condition-v1.mjs';
import { loadLocalAplPackage } from '../../src/neural-learning/fly-connections-apl-data-v1.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { AUDIT_SCHEMA, CHECK_NAMES, auditStaticChecks, jsonlLines, pinCheck, readJsonOrNull, replayPlan, sameValue, sha256File } from '../../src/neural-learning/fly-connections-audit-v1.mjs';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
// Scoring-path sources read for the static import check (P1.4).
const SCORING_SOURCES = [
  '.codebase/src/neural-learning/fly-connections-condition-v1.mjs',
  '.codebase/src/neural-learning/fly-connections-apl-v1.mjs',
  '.codebase/src/neural-learning/fly-connections-teaching-v1.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
];

export function parseCliArgs(argv) {
  const usage = 'usage: --run RUNDIR --config REG [--replay N]';
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--run', '--config', '--replay'].includes(argv[i]) || argv[i + 1] === undefined) throw Error(usage);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!args.run || !args.config) throw Error(usage);
  const replay = args.replay === undefined ? 4 : Number(args.replay);
  if (!Number.isSafeInteger(replay) || replay < 1) throw Error('--replay must be an integer of at least 1');
  return { runDir: resolve(args.run), config: resolve(args.config), replay };
}

// Check 10: rebuild the condition from the pinned graph as the worker does. For each tape phase (replayPlan), start a fresh
// condition from that phase's start state (T0 fresh; otherwise the snapshot of the probe that ends the previous phase), re-teach
// the planned prefix and compare every receipt bit for bit with the recorded event. Then restore the job's R2-end snapshot and
// re-rank the first two test boards (boardId order) bit for bit.
async function replayCheck({ registration, packet, runDir, replayN }) {
  const graphPath = resolve(ROOT, registration.paths.graph);
  const graph = loadGraph(graphPath);
  const rootIds = readNpz(graphPath, ['root_ids']).root_ids;
  const readerCells = neuronReaderCells.cells.filter(c => c.type === 'MBON05');
  const mapping = await mapFlyConnectionsMemory(graph, rootIds, resolve(ROOT, registration.paths.annotations), readerCells);
  const eyes = createEyesV2(loadRetina(graphPath));
  const aplPackage = await loadLocalAplPackage(resolve(ROOT, registration.paths.aplPackage));
  const testIds = [...packet.byGroup.testA, ...packet.byGroup.testB].map(r => r.boardId).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).slice(0, 2);
  if (testIds.length < 2) throw Error('fewer than two test boards to re-rank');
  const fresh = (arm) => createFlyCondition({ model: new SparseTrainer(graph, registration.model), mapping, eyes, aplPackage, arm, guard: () => {} });
  let jobsReplayed = 0, eventsReplayed = 0;
  const uncovered = new Set();
  for (const seed of registration.seeds) {
    for (const arm of registration.arms) {
      const name = `${seed}-${arm}`, dir = join(runDir, 'jobs', name);
      const tape = packet.tapes.get(seed).tape;
      const result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
      const plan = replayPlan(tape, arm, replayN);
      const wanted = new Set(plan.flatMap(s => Array.from({ length: s.count }, (_, k) => s.from + k)));
      const recorded = new Map(), stored = new Map();
      for await (const line of jsonlLines(join(dir, 'records.jsonl'))) {
        if (line.type === 'event' && wanted.has(line.cursor)) recorded.set(line.cursor, line.receipt);
        if (line.type === 'ranking' && line.label === 'R2-end' && testIds.includes(line.boardId)) stored.set(line.boardId, line.ranking.ranked);
      }
      for (const step of plan) {
        for (const kind of step.uncovered) uncovered.add(`${arm} ${step.phase} ${kind}`);
        const condition = fresh(arm);
        if (step.start === 'T0') {
          if (condition.fingerprint() !== result.fingerprints.T0) throw Error(`${name}: fresh fingerprint differs from the recorded T0`);
        } else {
          condition.restore(JSON.parse(readFileSync(join(dir, 'snapshots', `${step.start}.json`), 'utf8')));
        }
        for (let i = step.from; i < step.from + step.count; i++) {
          const ev = tape.events[i];
          const experience = { sequence: ev.sequence, eventId: ev.eventId, phase: ev.phase, group: ev.group, boardId: ev.boardId,
            move: ev.move, pulse: ev.pulse, criterion: ev.criterion, proofSha: ev.proofSha };
          const opts = arm === 'shuffled-local' ? { deliveredPulse: tape.shuffledPulses[i] } : {};
          const receipt = JSON.parse(JSON.stringify(condition.teach(packet.boardsById.get(ev.boardId), experience, opts).receipt));
          if (!sameValue(receipt, recorded.get(i))) throw Error(`${name}: replayed receipt ${i} (phase ${step.phase}) differs from the recorded event`);
          eventsReplayed++;
        }
      }
      const snapshot = JSON.parse(readFileSync(join(dir, 'snapshots', 'R2-end.json'), 'utf8'));
      const later = fresh(arm);
      later.restore(snapshot);
      for (const id of testIds) {
        const ranked = JSON.parse(JSON.stringify(later.rankBoard(packet.boardsById.get(id), { phase: 'chess' }).ranked));
        if (!sameValue(ranked, stored.get(id))) throw Error(`${name}: re-ranked ${id} at R2-end differs from the recorded scores`);
      }
      jobsReplayed++;
    }
  }
  const gaps = uncovered.size ? `; no event of these kinds in its phase: ${[...uncovered].join(', ')}` : '';
  return { name: 'replay', pass: jobsReplayed === registration.seeds.length * registration.arms.length,
    detail: `${jobsReplayed} jobs: ${eventsReplayed} events re-taught from each phase's start state (A, R1, B, R2 prefixes of ${replayN} events, extended to both pulse kinds) with every receipt field equal bit for bit${gaps}; test boards ${testIds.join(' ')} re-ranked at R2-end with equal scores` };
}

function writeAtomic(path, text) {
  writeFileSync(`${path}.partial`, text);
  renameSync(`${path}.partial`, path);
}

async function main(argv) {
  const { runDir, config, replay } = parseCliArgs(argv);
  const registration = JSON.parse(readFileSync(config, 'utf8'));
  const registrationSha256 = await sha256File(config);
  const manifest = readJsonOrNull(join(runDir, 'manifest.json'));
  const summary = readJsonOrNull(join(runDir, 'summary.json'));
  const pins = await pinCheck({ registration, manifest, registrationSha256, root: ROOT, hashFile: sha256File });
  const sourceTexts = Object.fromEntries(SCORING_SOURCES.map(p => [p, readFileSync(join(ROOT, p), 'utf8')]));
  const staticRun = await auditStaticChecks({ runDir, packetDir: resolve(ROOT, registration.paths.packet), registration, sourceTexts, summary });
  let replayRes;
  if (!staticRun.packet) replayRes = { name: 'replay', pass: false, detail: 'packet unreadable; replay not run' };
  else {
    try { replayRes = await replayCheck({ registration, packet: staticRun.packet, runDir, replayN: replay }); }
    catch (e) { replayRes = { name: 'replay', pass: false, detail: `replay failed: ${e.message}` }; }
  }
  const checks = [pins, ...staticRun.checks, replayRes];
  const pass = checks.length === CHECK_NAMES.length && checks.every(c => c.pass);
  const audit = { schema: AUDIT_SCHEMA, pass, pinned: pins.pass, checks, verdictMatches: staticRun.match };
  writeAtomic(join(runDir, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
  console.log(pass ? 'AUDIT PASS' : 'AUDIT FAIL');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(e => {
    console.error(e.stack ?? e.message);
    process.exitCode = 1;
  });
}

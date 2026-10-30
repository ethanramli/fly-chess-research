// Restrained-decay graph diagnostic ("option b"), TRAINING panels only.
//
// Purpose: for each informative-arm replica, compare the frozen validation-selected
// block-8 checkpoint against variants in which the restrained (short-term) store's
// learned gains are reset to 1 while the alpha-lobe (long-term) gains are kept, and
// measure the effect on choices and on the MBON readout's zero (score sign).
//
// TRAINING-ONLY: uses only runtime.panels (training families) and train-plan.json probes.
// Read-only: no memory is saved, no checkpoint or result file is written except the
// single JSONL report below.
//
// Usage (from repository root):
//   node --max-old-space-size=256 research/reports/stage1-full-r14-2026-10-30/restrained-decay-graph-train.mjs [r1|r2|r3]
// With no argument all three informative replicas are run in sequence.

import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTrainingArm} from '../../../.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v8.mjs';
import {assessLichessTrainingPanel} from '../../../.codebase/src/puzzle-learning/lichess-curriculum-panel.mjs';
import {decodeCheckpoint} from '../../../.codebase/src/runtime/checkpoint-codec.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const REPORT = join(ROOT, 'research/reports/stage1-full-r14-2026-10-30/restrained-decay-graph-train.jsonl');
const MiB = 2 ** 20;
const sign = v => Math.sign(v);
const guard = () => {
  if (process.memoryUsage().rss > 2048 * MiB) throw Error('RSS guard exceeded (2048 MiB)');
};
const pace = async ms => { await new Promise(r => setTimeout(r, ms * (1 / 0.75 - 1))); };

const registration = JSON.parse(readFileSync(join(ROOT, 'research/data/lichess-stage1-synthetic-v1/stage1-full-r14-registration.json'), 'utf8'));
const lineageResults = JSON.parse(readFileSync(join(ROOT, 'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001/result.json'), 'utf8')).lineageResults;
const probeActions = JSON.parse(readFileSync(join(ROOT, 'research/data/lichess-stage1-synthetic-v1/train-plan.json'), 'utf8')).probeActions;
assert(probeActions.length === 48, 'Expected 48 training probe actions');

function assert(condition, message) {
  if (!condition) throw Error(message);
}

const requested = process.argv[2];
const entries = Object.values(lineageResults)
  .filter(e => e.condition === 'informative' && ['r1', 'r2', 'r3'].includes(e.replica))
  .filter(e => !requested || e.replica === requested)
  .sort((a, b) => a.replica.localeCompare(b.replica));
assert(entries.length > 0, `No informative lineage entry for ${requested ?? 'r1..r3'}`);

const lines = [];

async function assessAll(runtime) {
  // Returns per-panel assessments keyed by panelId.
  const out = new Map();
  for (const panel of runtime.panels) {
    guard();
    out.set(panel.panelId, (await assessLichessTrainingPanel(panel, runtime.brain)).assessment);
  }
  return out;
}

for (const entry of entries) {
  const ckptPath = join(entry.attempt, 'stage-checkpoint-008.json.gz');
  // Checkpoint must exist; block 8 is the frozen validation-selected checkpoint.
  assert(readFileSync(ckptPath).length > 0, `Missing checkpoint ${ckptPath}`);

  const runtime = await createTrainingArm({
    stage: 1, registration, replica: entry.replica, condition: 'informative',
    lineageKey: entry.lineageKey, outputDir: entry.attempt, identity: entry.identity, guard, pace,
  });

  const naive = runtime.brain.memory.snapshot();
  const saved = decodeCheckpoint(readFileSync(ckptPath));
  const trained = saved.block.session.memory;
  const n = runtime.brain.memory.restrained.gains.length;
  assert(n === 870, `Expected 870 restrained gains, got ${n}`);
  assert(trained.gains.length === 5579, `Expected 5579 trained gains, got ${trained.gains.length}`);

  const variants = {
    naive,
    trained,
    restrainedReset: {...trained, gains: [...Array(n).fill(1), ...trained.gains.slice(n)]},
    alphaReset: {...trained, gains: [...trained.gains.slice(0, n), ...Array(trained.gains.length - n).fill(1)]},
  };

  for (const [variant, snapshot] of Object.entries(variants)) {
    // AlphaLobeMemory.restore (alpha-lobe-memory.mjs:134-140) restores the restrained store
    // (which calls its own apply()) and then the alpha gains followed by applyAlpha(),
    // so the explicit apply() below is a no-op safety call, not a required step.
    runtime.brain.memory.restore(snapshot);
    runtime.brain.memory.apply();

    const assessments = await assessAll(runtime);
    let choiceCorrect = 0;
    let allRows = 0, allPos = 0;
    let succRows = 0, succPos = 0, failRows = 0, failPos = 0;
    for (const panel of runtime.panels) {
      const assessment = assessments.get(panel.panelId);
      const statusByMove = new Map(panel.experiences.map(e => [e.move, e.status]));
      const choiceStatus = assessment.choice === null ? null : statusByMove.get(assessment.choice);
      if (choiceStatus === 'success') choiceCorrect++;
      for (const row of assessment.rows) {
        allRows++;
        const positive = row.score > 0;
        if (positive) allPos++;
        const status = statusByMove.get(row.move);
        if (status === 'success') { succRows++; if (positive) succPos++; }
        else if (status === 'failure') { failRows++; if (positive) failPos++; }
      }
    }

    let probeCount = 0, scoreSign = 0, alphaSign = 0;
    for (const probe of probeActions) {
      const panel = runtime.panels.find(p => p.panelId === probe.panelId);
      const exp = panel?.experiences.find(e => e.move === probe.actionId);
      const expected = exp?.status === 'success' ? 1 : exp?.status === 'failure' ? -1 : null;
      const row = assessments.get(probe.panelId)?.rows.find(r => r.move === probe.actionId);
      if (expected === null || !row) continue;
      probeCount++;
      if (sign(row.score) === expected) scoreSign++;
      if (sign(row.MBON14 - row.MBON07) === expected) alphaSign++;
    }

    const line = {
      replica: entry.replica, variant, choiceCorrect, scoreSign, alphaSign, probeCount,
      allRows, fracScorePositive: allRows ? allPos / allRows : null,
      successRowsScorePositive: succRows ? succPos / succRows : null,
      failureRowsScorePositive: failRows ? failPos / failRows : null,
      rssMiB: Math.round(process.memoryUsage().rss / MiB),
    };
    lines.push(line);
    console.log(JSON.stringify(line));
  }
}

writeFileSync(REPORT, lines.map(l => JSON.stringify(l)).join('\n') + '\n');

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? 'research/reports/capture-retention-assay-v3-2026-10-07';
const scriptPath = fileURLToPath(import.meta.url).replaceAll('\\', '/');
const outPath = process.argv[3] ?? join(root, 'seed-independence-audit-v3.json');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const p = read('research/data/capture-retention-transfer-assay-v3/protocol.json');
const aggregatePath = join(root, 'aggregate.json'), aggregate = read(aggregatePath);
assert.equal(aggregate.auditCount, p.seeds.length * p.conditions.length);
const run = (seed, condition) => read(join(root, `seed-${seed}-${condition}`, 'report.json'));
const event = (seed, condition, index) => {
  const r = run(seed, condition);
  return read(r.receipts[index].path);
};
const functionalRows = rows => rows.map(panel => ({ panelId: panel.panelId, rows: panel.rows.map(row => ({
  move: row.move, outcome: row.outcome, MBON12: row.MBON12, MBON01: row.MBON01, score: row.score
})), margin: panel.margin, chosenMove: panel.chosenMove, correctMove: panel.correctMove,
  correct: panel.correct, roleScrambled: panel.roleScrambled }));
const equalAcrossSeeds = (condition, select) => {
  const first = functionalRows(select(run(p.seeds[0], condition)));
  for (const seed of p.seeds.slice(1)) assert.deepEqual(functionalRows(select(run(seed, condition))), first,
    `Functional output differs for condition=${condition}, seed=${seed}`);
  return createHash('sha256').update(JSON.stringify(first)).digest('hex');
};
const conditions = p.conditions.map(condition => {
  const finalChoicesHash = equalAcrossSeeds(condition, r => r.final);
  const roleScrambledHash = equalAcrossSeeds(condition, r => r.roleScrambled);
  const baselineHash = equalAcrossSeeds(condition, r => r.baseline);
  for (const seed of p.seeds) {
    const baselineMoves = run(seed, condition).baseline.map(row => row.chosenMove);
    const finalMoves = run(seed, condition).final.map(row => row.chosenMove);
    assert.deepEqual(finalMoves, baselineMoves,
      `Training changed a panel choice for condition=${condition}, seed=${seed}`);
    assert.deepEqual(finalMoves, Array(8).fill('a2a4'),
      `Unexpected fixed choice policy for condition=${condition}, seed=${seed}`);
  }
  const receiptHashes = [];
  for (let i = 0; i < 16; i++) {
    const first = event(p.seeds[0], condition, i);
    const functional = { local: first.receipt.local, beforeGains: first.before.gains,
      afterGains: first.after.gains, changedEdges: first.update.changedEdges };
    for (const seed of p.seeds.slice(1)) {
      const other = event(seed, condition, i);
      assert.deepEqual({ local: other.receipt.local, beforeGains: other.before.gains,
        afterGains: other.after.gains, changedEdges: other.update.changedEdges }, functional,
      `Training dynamics differ for condition=${condition}, event=${i}, seed=${seed}`);
    }
    receiptHashes.push(createHash('sha256').update(JSON.stringify(functional)).digest('hex'));
  }
  return { condition, finalChoicesHash, roleScrambledHash, baselineHash,
    trainingDynamicsHashes: receiptHashes };
});
const trainerPath = '.codebase/src/supervised-baselines/trainer.mjs';
const brainPath = '.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs';
const readoutPath = '.codebase/src/neural-learning/mbon-readout.mjs';
const trainer = readFileSync(trainerPath, 'utf8'), brain = readFileSync(brainPath, 'utf8');
const readout = readFileSync(readoutPath, 'utf8');
assert.ok(trainer.includes("[['input', 1 / Math.sqrt(inputDim)], ['head', 1 / Math.sqrt(no)]]"));
assert.ok(brain.includes('this.model.forward([0], stimulation)'));
assert.ok(brain.includes('this.model.h[this.model.steps][c.index]'));
assert.ok(readout.includes('const score = MBON12 - MBON01'));
const modelSeeds = p.seeds.map(seed => run(seed, 'informative').identity.model.seed);
assert.deepEqual(modelSeeds, p.seeds);
const report = {
  schema: 'capture-retention-seed-independence-audit-v1',
  scope: 'Read-only audit of whether the five declared seeds created distinct functional neural replicas in the completed v3 assay. Does not change or replace the frozen aggregate.',
  protocolSha256: sha('research/data/capture-retention-transfer-assay-v3/protocol.json'),
  aggregateSha256: sha(aggregatePath), aggregatePassed: aggregate.passed,
  scriptPath, scriptSha256: sha(scriptPath),
  sourceHashes: Object.fromEntries([trainerPath, brainPath, readoutPath].map(path => [path, sha(path)])),
  seeds: p.seeds, modelSeeds, cueIdentity: run(p.seeds[0], 'informative').identity.cueIdentity,
  results: conditions, identicalFinalChoicesAndMarginsAcrossSeeds: true,
  identicalTrainingActivityAndGainTrajectoriesAcrossSeeds: true,
  choicePolicyUnchangedFromBaselineInEverySeedCondition: true,
  baselineAndTrainedPolicyChoose: 'a2a4 on all eight final panels in every seed-condition run',
  functionalReplicationCount: 1,
  diagnosis: 'The declared model seed randomizes input/head arrays, but forward([0], stimulation) supplies no active input features and the fixed MBON readout reads neuron activity rather than the model head. Consequently all five model seeds produce identical training activity, gains and held-out rankings; their bootstrap rows are not independent functional replicas.',
  status: 'The v3 transfer gate fails; report any cross-seed bootstrap as descriptive only because the nominal seed replicates are functionally identical.'
};
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, functionalReplicationCount: 1,
  identicalFinalChoicesAndMarginsAcrossSeeds: report.identicalFinalChoicesAndMarginsAcrossSeeds,
  identicalTrainingActivityAndGainTrajectoriesAcrossSeeds: report.identicalTrainingActivityAndGainTrajectoriesAcrossSeeds,
  reportPath: outPath.replaceAll('\\', '/') }));

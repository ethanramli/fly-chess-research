// Review-only software fixtures. No graph/model, neural forward pass or training.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONDITIONS, runResumableAssay, auditAssayRecords, evaluateAssayGates } from '../../../.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs';

const identity = Object.fromEntries(['graph', 'model', 'memory', 'encoder', 'readout', 'policy', 'dataset', 'protocol'].map(k => [k, 'a'.repeat(64)]));
Object.assign(identity, { algorithms: { fixture: 'b'.repeat(64) }, seeds: [17], splits: { train: ['a'], validation: ['b'], final: ['c'] } });
const protocol = { seed: 17, runtime: { rssMiB: 768, freeMiB: 256 }, search: { maxEvaluations: 0, deadlineMs: 0 },
  budgets: { maxPresentations: 512, maxEvaluations: 4096, maxEvaluationsPerAssessment: 16, maxLegalMoves: 64, maxStoredNodes: 0, maxLogEntries: 64 },
  gates: Object.fromEntries(['selectiveAcquisition', 'preservation', 'finiteReversal', 'saturation', 'controlSeparation'].map(k => [k, { threshold: 0.01 }])) };
const experiences = ['success', 'failure'].map((status, i) => ({ id: `event-${i}`, fen: 'inert-context', pgn: 'inert-history', task: { objective: 'fixture' },
  action: `move-${i}`, status, certificateSha256: String(i + 1).repeat(64) }));
const schedule = experiences.map((e, i) => ({ id: `slot-${i}`, experienceId: e.id, expectedChannel: i ? 'PPL103' : 'PAM02', delaySteps: 0, phase: 'acquisition' }));
const verify = async e => ({ learningAllowed: true, status: e.status, move: e.action, certificateSha256: e.certificateSha256, verifiedScope: 'inert fixture' });
let failOnce = true;
function adapters(interrupt = false, changePhysiologyDuringAssessment = false) {
  return Object.fromEntries(CONDITIONS.map(condition => {
    let ticks = 0, value = 0;
    const adapter = { identity: 'inert',
      snapshot: () => ({ physiological: [value], neuralTransient: [ticks], eligibility: [ticks / 10] }),
      restore: s => { value = s.physiological[0]; ticks = s.neuralTransient[0]; },
      assess: async input => { ticks++; if (changePhysiologyDuringAssessment) value++; return { ...input, evaluations: 1, memoryHash: '9'.repeat(64), rows: [{ move: input.action, score: ticks }], choice: input.action }; },
      readout: async () => ({ margin: value, evaluations: 1 }),
      deliver: async (input, signal) => {
        if (interrupt && condition === 'informative' && input.action === 'move-1' && failOnce) { failOnce = false; throw Error('inert interruption'); }
        if (signal.plasticityEnabled && signal.feedbackEnabled) value += ticks;
        return { eligibility: [ticks / 10], signedLocalDrives: [{ compartment: 'inert', potentiation: 0, depression: 0 }],
          compartmentGains: [{ compartment: 'inert', gains: [1], saturation: [false] }], neuralConsequences: [{ compartment: 'inert', before: 0, after: 0 }], presentations: 1 };
      } };
    return [condition, adapter];
  }));
}
const scratch = mkdtempSync(join(tmpdir(), 'flychess-review-inert-'));
const common = { protocol, identity, schedule, experiences, verify, guard: () => {} };
const uninterrupted = await runResumableAssay({ ...common, adapters: adapters(), outputDir: join(scratch, 'uninterrupted') });
await assert.rejects(runResumableAssay({ ...common, adapters: adapters(true), outputDir: join(scratch, 'interrupted') }), /inert interruption/);
const resumed = await runResumableAssay({ ...common, adapters: adapters(), outputDir: join(scratch, 'resumed'), resumeFrom: join(scratch, 'interrupted') });
const cleanState = uninterrupted.state.adapterStates.informative, resumedState = resumed.state.adapterStates.informative;
assert.notDeepEqual(cleanState, resumedState, 'Reproduce repeat assessment after pending-state restore');
const logs = Object.fromEntries(CONDITIONS.map(c => [c, readFileSync(join(scratch, 'uninterrupted', `${c}.jsonl`), 'utf8').trim().split(/\r?\n/).map(JSON.parse)]));
const forged = structuredClone(logs);
for (const row of forged.informative) { row.behavioral.beforeMargin = -100; row.behavioral.afterMargin = 100; row.behavioral.change = 200; }
const forgedAudit = await auditAssayRecords({ protocol, schedule, experiences, recordsByCondition: forged, verify });
assert.equal(forgedAudit.passed, true, 'Reproduce audit acceptance of changed behavioral values');
const disabledMutation = await runResumableAssay({ ...common, adapters: adapters(false, true), outputDir: join(scratch, 'disabled-assessment-mutation') });
assert.equal(disabledMutation.state.adapterStates.disabled.physiological[0], 2, 'Reproduce disabled physiology changes outside delivery check');

// Same move string in two different contexts: one improves, the other regresses.
const contextRows = [
  { condition: 'informative', teacherEvidence: { verified: true }, context: { fen: 'board-A', action: 'a1a4' }, slot: { phase: 'acquisition' }, behavioral: { beforeMargin: 0, afterMargin: 0.1 } },
  { condition: 'informative', teacherEvidence: { verified: true }, context: { fen: 'board-B', action: 'a1a4' }, slot: { phase: 'acquisition' }, behavioral: { beforeMargin: 0.2, afterMargin: 0.1 } },
];
const collapsed = evaluateAssayGates(contextRows, protocol);
assert.equal(collapsed.cueResults.length, 1);
assert.equal(collapsed.gates.selectiveAcquisition, true, 'Reproduce hidden second-context regression');
const result = { scope: 'Inert counter/state-machine fixtures only; no learner, graph or training', scratch,
  pendingResume: { uninterrupted: cleanState, resumed: resumedState, recordedExposureEqual: JSON.stringify(uninterrupted.state.exposures) === JSON.stringify(resumed.state.exposures) },
  behavioralAudit: { acceptedAlteredMargins: forgedAudit.passed, acquisitionGateFromAlteredMargins: forgedAudit.gates.gates.selectiveAcquisition },
  disabledIsolation: { runCompleted: disabledMutation.complete, initialPhysiologicalValue: 0, finalDisabledPhysiologicalValue: disabledMutation.state.adapterStates.disabled.physiological[0] },
  contextGate: { expectedContexts: 2, recordedCueResults: collapsed.cueResults, acquisitionPassedDespiteSecondContextRegression: collapsed.gates.selectiveAcquisition } };
writeFileSync(new URL('./inert-review-results-v2.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));

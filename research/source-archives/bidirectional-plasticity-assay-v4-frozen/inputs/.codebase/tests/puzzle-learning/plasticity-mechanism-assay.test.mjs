import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { validateProtocol, verifyExperiences } from '../../scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { decayEligibility, stepBidirectional, stepSourceRule } from '../../src/neural-learning/bidirectional-plasticity-kernel.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { assertMatchedExposure, guardResources, makeVerifiedReceipt, planDeliveries,
  assertPlasticityStateIsolation, evaluateAssayGates, publishAtomicJson, runResumableAssay,
  validateCheckpoint, validateIdentity, validateNeuralReceipt, loadPinnedJson, auditAssayRecords, receiptDigest,
  loadLastCheckpoint } from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const schedule = Array.from({ length: 8 }, (_, i) => ({ expectedChannel: i % 2 ? 'PPL103' : 'PAM02' }));
const identity = { graph: 'a'.repeat(64), model: 'b'.repeat(64), memory: 'c'.repeat(64), encoder: 'd'.repeat(64),
  readout: 'e'.repeat(64), policy: 'f'.repeat(64), dataset: '1'.repeat(64), protocol: '2'.repeat(64),
  algorithms: { kernel: '3'.repeat(64) }, seeds: [7], splits: { train: ['a'], validation: ['b'], final: ['c'] } };

function controlAssignments() {
  const plans = Object.fromEntries(['informative', 'absent', 'shuffled', 'anti-correlated', 'disabled']
    .map(condition => [condition, planDeliveries(schedule, condition, 19)]));
  assertMatchedExposure(schedule, plans);
  assert.deepEqual(plans.informative.assignments, schedule.map(e => e.expectedChannel));
  assert.equal(plans.absent.delivered, 0);
  assert.equal(plans.absent.cueExposures, schedule.length, 'absent feedback still receives matched cue exposure');
  assert.notDeepEqual(plans['anti-correlated'].assignments, plans.informative.assignments);
  assert.deepEqual(plans.shuffled, planDeliveries(schedule, 'shuffled', 19));
  assert.equal(plans.disabled.plasticityEnabled, false);
  assert.throws(() => planDeliveries([{ expectedChannel: 'PAM02' }], 'shuffled', 1), /balance/);
  const withProbes = [...schedule, { probe: true, expectedChannel: 'PAM02' }, { probe: true, expectedChannel: 'PPL103' }];
  const probePlans = Object.fromEntries(['informative', 'absent', 'shuffled', 'anti-correlated', 'disabled']
    .map(condition => [condition, planDeliveries(withProbes, condition, 19)]));
  assertMatchedExposure(withProbes, probePlans);
  assert.equal(probePlans.informative.delivered, 8);
  assert.equal(probePlans.absent.delivered, 0);
  assert.ok(withProbes.slice(-2).every((slot, i) => probePlans.informative.assignments[8 + i] === null));
}

function certificateReceipt() {
  const board = new Chess('4r1k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1');
  const task = { objective: 'capture-retention', plies: 1 };
  const proof = certifyCaptureRetention(board, 'a1a4');
  const verification = verifiedExperience(board, 'a1a4', task, proof);
  const checked = { ...verification, verifiedScope: verification.meaning };
  const event = { fen: board.fen(), pgn: board.pgn(), task, action: 'a1a4', certificateSha256: verification.certificateSha256 };
  const assessment = { fen: board.fen(), pgn: board.pgn(), task, memoryHash: '9'.repeat(64),
    choice: 'e1e5', rows: [{ move: 'a1a4', score: 0.1 }, { move: 'e1e5', score: 0.2 }] };
  event.status = verification.status;
  const receipt = makeVerifiedReceipt({ event, assessment, verification: checked, signal: { channel: 'PAM02' }, neural: { eligible: 0.5 } });
  assert.deepEqual(receipt.context, { fen: board.fen(), pgn: board.pgn(), task, action: 'a1a4' });
  assert.equal(receipt.teacherEvidence.certificateSha256, verification.certificateSha256);
  assert.equal(receipt.unaidedRanking.choice, 'e1e5');
  assert.deepEqual(receipt.deliveredSignal, { channel: 'PAM02' });
  assert.deepEqual(receipt.neural, { eligible: 0.5 });
  assert.throws(() => makeVerifiedReceipt({ event, assessment: { ...assessment, pgn: '' }, verification: checked }), /history/);
  assert.throws(() => makeVerifiedReceipt({ event, assessment, verification: { ...checked, learningAllowed: false } }), /verified/);
  assert.throws(() => makeVerifiedReceipt({ event, assessment, verification: { ...checked, status: 'failure' } }), /registered experience/);
  const unknown = verifiedExperience(board, 'a1a4', task, { status: 'unknown', certificate: null, certificateSha256: null });
  assert.equal(unknown.learningAllowed, false);
}

function checkpointIdentity() {
  const state = { physiological: [1], neuralTransient: [2], eligibility: [3], randomization: { seed: 7 } };
  const checkpoint = { identity, registeredState: structuredClone(state), pendingReceipt: { status: 'pending', id: 'r1' } };
  assert.equal(validateIdentity(identity), true);
  assert.equal(validateCheckpoint(checkpoint, identity), true);
  assert.notEqual(checkpoint.registeredState.physiological, state.physiological);
  assert.throws(() => validateIdentity({ ...identity, splits: { train: ['x'], validation: ['x'], final: ['z'] } }), /leakage/);
  assert.throws(() => validateCheckpoint({ ...checkpoint, pendingReceipt: { status: 'duplicate' } }, identity), /pending receipt state/);
  assert.throws(() => validateCheckpoint({ ...checkpoint, identity: { ...identity, graph: '0'.repeat(64) } }, identity), /identity mismatch/);
}

function atomicPublication() {
  const dir = mkdtempSync(join(tmpdir(), 'flychess-assay-'));
  try {
    const path = join(dir, 'pending.json');
    const hash = publishAtomicJson(path, { status: 'pending', receiptId: 'one' });
    assert.equal(readFileSync(path, 'utf8').includes('pending'), true);
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.deepEqual(loadPinnedJson(path, hash), { status: 'pending', receiptId: 'one' });
    assert.throws(() => loadPinnedJson(path, '0'.repeat(64)), /Hash mismatch/);
    assert.throws(() => publishAtomicJson(path, { status: 'applied' }), /overwrite/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function resourceGuards() {
  assert.equal(guardResources({ rssBytes: 100, freeBytes: 400 * 2 ** 20 }), true);
  assert.throws(() => guardResources({ rssBytes: 769 * 2 ** 20, freeBytes: 500 * 2 ** 20 }), /Resource guard/);
  assert.throws(() => guardResources({ rssBytes: 100, freeBytes: 255 * 2 ** 20 }), /Resource guard/);
}

async function protocolPreflight() {
  const protocol = JSON.parse(readFileSync('research/data/bidirectional-plasticity-assay-v4/protocol.json', 'utf8'));
  const validation = validateProtocol(protocol);
  assert.equal(validation.passed, false);
  assert.ok(validation.errors.includes('identity contains unresolved values'));
  assert.ok(validation.errors.includes('Missing pinned model hash'));
  assert.ok(!validation.errors.includes('identity protocol hash is unresolved'));
  assert.ok(!validation.errors.includes('protocol canonical hash mismatch'));
  const altered = structuredClone(protocol); altered.seed++;
  assert.ok(validateProtocol(altered).errors.includes('protocol canonical hash mismatch'),
    'a changed seed invalidates the frozen protocol identity');
  const evidence = await verifyExperiences(protocol);
  assert.deepEqual(evidence.map(row => row.status), ['success', 'failure', 'unknown']);
  assert.deepEqual(evidence.map(row => row.learningAllowed), [true, true, false]);
  protocol.experiences[1].certificateSha256 = '0'.repeat(64);
  await assert.rejects(verifyExperiences(protocol), /certificate-hash/);
}

async function checkpointRecovery() {
  const root = mkdtempSync(join(tmpdir(), 'flychess-assay-resume-'));
  const source = join(root, 'source'), resumed = join(root, 'resumed');
  let failureInjected = false;
  const protocol = { seed: 17, runtime: { rssMiB: 768, freeMiB: 256 }, search: { maxEvaluations: 0, deadlineMs: 0 },
    budgets: { maxPresentations: 512, maxEvaluations: 4096, maxEvaluationsPerAssessment: 16,
      maxLegalMoves: 64, maxStoredNodes: 0, maxLogEntries: 64 }, gates: {
      selectiveAcquisition: { threshold: 0.01 }, preservation: { threshold: 0.01 }, finiteReversal: { threshold: 0.01 },
      saturation: { threshold: 0.05 }, controlSeparation: { threshold: 0.01 } } };
  const items = [
    { id: 'ev1', expectedChannel: 'PAM02' }, { id: 'ev2', expectedChannel: 'PPL103' },
  ];
  const events = items.map((item, i) => ({ id: item.id, fen: 'fen', pgn: 'pgn', task: { objective: 'fixture' }, action: `m${i}`,
    status: i ? 'failure' : 'success', certificateSha256: (i ? '8' : '7').repeat(64) }));
  const makeAdapters = (afterDeliver = () => {}) => Object.fromEntries(['informative', 'absent', 'shuffled', 'anti-correlated', 'disabled'].map(condition => {
    const self = { identity: `fixture-${condition}`, count: 0,
      snapshot() { return { physiological: [], neuralTransient: [], eligibility: [], count: self.count }; },
      restore(s) { self.count = s.count; },
      async assess(input, budget) { assert.equal(budget.maxEvaluations, 16); return { ...input, evaluations: 1, presentations: 0, inputDose: 0, simulationSteps: 0,
        memoryHash: digest([]), rows: [{ move: 'm0', score: 1 }, { move: 'm1', score: 0 }], choice: 'm0' }; },
      async deliver(input, signal) {
        assert.ok(!('status' in input) && !('certificateSha256' in input));
        self.count++;
        afterDeliver(condition, input, self);
        if (signal.plasticityEnabled && signal.feedbackEnabled) self.plasticityUpdates = (self.plasticityUpdates ?? 0) + 1;
        if (condition === 'informative' && input.action === 'm1' && !failureInjected) { failureInjected = true; throw Error('fixture interruption'); }
        self.seen ??= []; self.seen.push({ action: input.action, signal });
        return { eligibility: [0.5], signedLocalDrives: [{ compartment: 'fixture', potentiation: 0, depression: 0 }],
          compartmentGains: [{ compartment: 'fixture', gains: [1], saturation: [false] }],
          neuralConsequences: [{ compartment: 'fixture', before: 0, after: 0 }], presentations: 1, inputDose: 0, simulationSteps: 0 };
      },
      async readout(input, budget) { assert.equal(budget.maxEvaluations, 16); return { ...input, evaluations: 1, presentations: 0, inputDose: 0, simulationSteps: 0,
        memoryHash: digest([]), rows: [{ move: 'm0', score: 0.02 }, { move: 'm1', score: 0 }], choice: 'm0' }; },
    };
    return [condition, self];
  }));
  const identityFull = structuredClone(identity);
  const scheduleFull = [...items.map((item, i) => ({ ...item, id: `slot${i}`, experienceId: item.id, delaySteps: i,
    phase: i ? 'acquisition' : 'acquisition' })),
    { id: 'slot2', experienceId: 'ev1', expectedChannel: 'PAM02', phase: 'retention-probe', probe: true, delaySteps: 0 }];
  const verify = async event => ({ learningAllowed: true, status: event.status, move: event.action,
    certificateSha256: event.certificateSha256, meaning: 'fixture verification only', verifiedScope: 'fixture-only' });
  try {
    const firstAdapters = makeAdapters();
    await assert.rejects(runResumableAssay({ protocol, identity: identityFull, schedule: scheduleFull, experiences: events,
      adapters: firstAdapters, outputDir: source, verify, guard: () => {}, maxEvents: 8 }), /fixture interruption/);
    const secondAdapters = makeAdapters();
    const result = await runResumableAssay({ protocol, identity: identityFull, schedule: scheduleFull, experiences: events,
      adapters: secondAdapters, outputDir: resumed, resumeFrom: source, verify, guard: () => {}, maxEvents: 8 });
    assert.equal(result.complete, true);
  assert.equal(secondAdapters.informative.count, 2, 'pending delivery replays once from its pre-update checkpoint');
    const resumedRows = readFileSync(join(resumed, 'informative.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
    assert.deepEqual(resumedRows.map(row => row.id), ['informative-slot0', 'informative-slot1', 'informative-slot2'],
      'fresh resume directory includes acknowledged prior publications and recovered receipt');
    assert.equal(resumedRows[2].deliveredSignal, null, 'retention probe has no teaching signal');
    assert.equal(resumedRows[2].reason, 'Unaided retention probe; no teaching signal delivered');
    const auditRows = Object.fromEntries(['informative', 'absent', 'shuffled', 'anti-correlated', 'disabled'].map(condition =>
      [condition, readFileSync(join(resumed, `${condition}.jsonl`), 'utf8').trim().split(/\r?\n/).map(JSON.parse)]));
    const audit = await auditAssayRecords({ protocol, schedule: scheduleFull, experiences: events, recordsByCondition: auditRows, verify,
      receiptDigests: result.state.receiptDigests, adapterStates: result.state.adapterStates,
      initialPhysiologicalHashes: result.state.initialPhysiologicalHashes });
    assert.equal(audit.passed, true);
    assert.equal(audit.arms.informative.unaidedProbes, 1);
    assert.equal(secondAdapters.disabled.count, 2);
    assert.equal(secondAdapters.absent.count, 2, 'absent arm still receives cue presentation with no feedback channel');
    assert.ok(secondAdapters.disabled.seen.every(item => item.signal.plasticityEnabled === false));
    assert.ok(secondAdapters.absent.seen.every(item => item.signal.channel === null && item.signal.feedbackEnabled === false));
    assert.equal(secondAdapters.disabled.plasticityUpdates ?? 0, 0);
    assert.equal(secondAdapters.absent.plasticityUpdates ?? 0, 0);
    assert.equal(loadLastCheckpoint(resumed, identityFull).state.coordinatorState.conditionIndex, 5);
    await assert.rejects(runResumableAssay({ protocol, identity: identityFull, schedule: scheduleFull, experiences: events,
      adapters: secondAdapters, outputDir: resumed, verify, guard: () => {} }), /new output directory/);

    const guardSource = join(root, 'guard-source'), guardResume = join(root, 'guard-resume');
    const guardAdapters = makeAdapters(); let guardCalls = 0;
    await assert.rejects(runResumableAssay({ protocol, identity: identityFull, schedule: scheduleFull, experiences: events,
      adapters: guardAdapters, outputDir: guardSource, verify, guard: () => { if (++guardCalls === 4) throw Error('fixture guard failure'); } }),
    /fixture guard failure/);
    const recoveredAdapters = makeAdapters(); failureInjected = true;
    const recovered = await runResumableAssay({ protocol, identity: identityFull, schedule: scheduleFull, experiences: events,
      adapters: recoveredAdapters, outputDir: guardResume, resumeFrom: guardSource, verify, guard: () => {} });
    assert.equal(recovered.complete, true);
    assert.equal(recoveredAdapters.informative.count, 2, 'resource-guard recovery continues from the completed checkpoint');

    const appliedSource = join(root, 'applied-source'), appliedResume = join(root, 'applied-resume');
    const appliedAdapters = makeAdapters((condition, input) => {
      if (condition === 'informative' && input.action === 'm0')
        writeFileSync(join(appliedSource, 'informative.jsonl'), '{"id":"informative-slot0","conflict":true}\n', { flag: 'wx' });
    });
    await assert.rejects(runResumableAssay({ protocol, identity: identityFull, schedule: scheduleFull, experiences: events,
      adapters: appliedAdapters, outputDir: appliedSource, verify, guard: () => {} }), /Conflicting publication/);
    const appliedRecoveryAdapters = makeAdapters();
    const appliedRecovery = await runResumableAssay({ protocol, identity: identityFull, schedule: scheduleFull, experiences: events,
      adapters: appliedRecoveryAdapters, outputDir: appliedResume, resumeFrom: appliedSource, verify, guard: () => {} });
    assert.equal(appliedRecovery.complete, true);
    assert.equal(appliedRecoveryAdapters.informative.count, 2, 'applied pending receipt is published on resume without reapplying');

    const unknownOut = join(root, 'unknown-out'), unknownAdapters = makeAdapters();
    const unknownVerify = async event => event.id === 'ev1'
      ? { learningAllowed: false, status: 'unknown', reason: 'fixture verifier exhausted' }
      : verify(event);
    const unknownRun = await runResumableAssay({ protocol, identity: identityFull, schedule: scheduleFull.slice(0, 2),
      experiences: events, adapters: unknownAdapters, outputDir: unknownOut, verify: unknownVerify,
      guard: () => {}, maxEvents: 8 });
    assert.equal(unknownRun.complete, true);
    for (const condition of ['informative', 'absent', 'shuffled', 'anti-correlated', 'disabled']) {
      assert.equal(unknownAdapters[condition].count, 1, `${condition}: unknown experience must not deliver teaching`);
      const records = readFileSync(join(unknownOut, `${condition}.jsonl`), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
      assert.equal(records[0].teacherEvidence.verified, false);
      assert.equal(records[0].deliveredSignal, null);
      assert.equal(records[0].reason, 'Unknown or exhausted verification; no teaching event');
    }
    const unknownRecords = Object.fromEntries(['informative', 'absent', 'shuffled', 'anti-correlated', 'disabled'].map(condition =>
      [condition, readFileSync(join(unknownOut, `${condition}.jsonl`), 'utf8').trim().split(/\r?\n/).map(JSON.parse)]));
    assert.equal((await auditAssayRecords({ protocol, schedule: scheduleFull.slice(0, 2), experiences: events,
      recordsByCondition: unknownRecords, verify: unknownVerify, receiptDigests: unknownRun.state.receiptDigests,
      adapterStates: unknownRun.state.adapterStates, initialPhysiologicalHashes: unknownRun.state.initialPhysiologicalHashes })).passed, true,
    'independent audit accepts correctly skipped exhausted verification and confirms no teaching');
  } finally { rmSync(root, { recursive: true, force: true }); }
}

function gatesDoNotHideCriterionFailures() {
  const protocol = { runtime: { rssMiB: 768, freeMiB: 256 }, budgets: {}, gates: {
    selectiveAcquisition: { threshold: 0.01 }, preservation: { threshold: 0.01 }, finiteReversal: { threshold: 0.01 },
    saturation: { threshold: 0.05 }, controlSeparation: { threshold: 0.01 } } };
  const record = (condition, phase, beforeMargin, afterMargin) => ({ condition,
    context: { action: 'a1a4' }, slot: { phase }, skipped: condition === 'absent',
    teacherEvidence: { verified: true }, behavioral: { beforeMargin, afterMargin },
    neural: { compartmentGains: [{ gains: [1, 1], saturation: [false, false] }] }, resources: { rssMiB: 100, freeMiB: 400 } });
  const rows = [record('informative', 'acquisition', 0, 0.03), record('informative', 'coexistence', 0.03, 0.04),
    record('informative', 'retention-probe', 0.04, 0.04),
    ...['absent', 'shuffled', 'anti-correlated', 'disabled'].map(c => record(c, 'coexistence', 0, 0.01))];
  const gates = evaluateAssayGates(rows, protocol);
  assert.equal(gates.gates.selectiveAcquisition, true);
  assert.equal(gates.gates.preservation, true);
  assert.equal(gates.gates.controlSeparation, true);
  assert.equal(gates.gates.finiteReversal, false, 'missing reversal evidence must fail explicitly');
  assert.equal(gates.saturationOccupancy, 0, 'occupancy uses validated per-compartment saturation schema');
  assert.equal(gates.gates.resources, true);
  const secondCue = { ...record('informative', 'acquisition', 0.02, 0.01), context: { action: 'a2a3' } };
  const secondCueCoexist = { ...record('informative', 'coexistence', 0.01, 0.01), context: { action: 'a2a3' } };
  const secondCueRetention = { ...record('informative', 'retention-probe', 0.01, 0.01), context: { action: 'a2a3' } };
  const otherControls = ['absent', 'shuffled', 'anti-correlated', 'disabled'].map(c => ({
    ...record(c, 'coexistence', 0, -0.02), context: { action: 'a2a3' } }));
  assert.equal(evaluateAssayGates([...rows, secondCue, secondCueCoexist, secondCueRetention, ...otherControls],
    protocol).gates.selectiveAcquisition, false,
  'one worsened cue fails its criterion despite another cue improving');
  assert.equal(evaluateAssayGates(rows, protocol).gates.resources, true,
    'resource gate reads the protocol runtime limits');
  const saturated = (condition, id) => ({ condition, slot: { id }, neural: {
    compartmentGains: [{ gains: Array(10).fill(1), saturation: Array(10).fill(false).map((_, i) => i === 0) }] } });
  assert.equal(evaluateAssayGates([...rows, saturated('informative', '01')], protocol).gates.saturation, true,
    'single saturated checkpoint is reported but does not fail the two-checkpoint gate');
  assert.equal(evaluateAssayGates([...rows, saturated('informative', '01'), saturated('informative', '02')], protocol).gates.saturation, false,
    'repeated above-threshold occupancy fails after two consecutive checkpoints');
}

function localDynamicsContract() {
  const receipt = { eligibility: [0.2], signedLocalDrives: [{ compartment: 'fixture-compartment', potentiation: 0.1, depression: 0.2 }],
    compartmentGains: [{ compartment: 'fixture-compartment', gains: [1], saturation: [false] }],
    neuralConsequences: [{ compartment: 'readout-fixture', before: 0.1, after: 0.2 }], presentations: 1, inputDose: 0, simulationSteps: 0 };
  assert.equal(validateNeuralReceipt(receipt), true);
  assert.throws(() => validateNeuralReceipt({ ...receipt, signedLocalDrives: [] }), /local drives/);
  assert.equal(assertPlasticityStateIsolation({ gain: [1] }, { gain: [1] }, false), true);
  assert.throws(() => assertPlasticityStateIsolation({ gain: [1] }, { gain: [1.1] }, false), /Disabled-plasticity/);
}

function candidateKernelMathFixture() {
  const potentiated = stepBidirectional({ gain: 1, eligibility: 1, potentiation: 1, depression: 0, dt: 1 });
  const depressed = stepBidirectional({ gain: 1, eligibility: 1, potentiation: 0, depression: 1, dt: 1 });
  const inactive = stepBidirectional({ gain: 0.7, eligibility: 0, potentiation: 1, depression: 1, dt: 1 });
  assert.ok(potentiated.gain > 1 && potentiated.gain < 1.8);
  assert.ok(depressed.gain < 1 && depressed.gain > 0.2);
  assert.equal(inactive.gain, 0.7);
  assert.ok(decayEligibility(1, 1, 2) < 1);
  assert.ok(stepSourceRule({ gain: 0.7, eligibility: 0, danRate: 1, dt: 1 }).gain > 0.7);
}

const fixtures = [controlAssignments, certificateReceipt, checkpointIdentity, atomicPublication, resourceGuards,
  protocolPreflight, gatesDoNotHideCriterionFailures, localDynamicsContract, candidateKernelMathFixture, checkpointRecovery];
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const fixture of fixtures) { await fixture(); process.stdout.write(`PASS ${fixture.name}\n`); }
} else {
  for (const fixture of fixtures) test(fixture.name, fixture);
}

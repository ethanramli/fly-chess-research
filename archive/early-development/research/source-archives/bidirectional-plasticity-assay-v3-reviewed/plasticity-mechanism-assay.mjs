// Fixture-testable protocol and receipt utilities for the proposed assay.
// This module deliberately does not connect a candidate equation to the graph.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { streamRows } from '../runtime/storage.mjs';
import { dirname, join, resolve } from 'node:path';
import { shuffledFeedback } from '../neural-learning/association-validation.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';

export const ASSAY_SCHEMA = 'plasticity-mechanism-assay-v1';
export const CONDITIONS = ['informative', 'absent', 'shuffled', 'anti-correlated', 'disabled'];
const MAX_ADAPTER_STATE_BYTES = 16 * 1024 * 1024;
const MAX_CHECKPOINT_STATE_BYTES = 48 * 1024 * 1024;
const MAX_CHECKPOINT_FILE_BYTES = 64 * 1024 * 1024;

const sha256 = value => createHash('sha256').update(value).digest('hex');
export function protocolDigest(protocol) {
  const copy = structuredClone(protocol);
  copy.identity.protocol = '';
  return sha256(JSON.stringify(copy));
}

// Every arm receives the same ordered experience list. The two signed channels
// are balanced by construction; shuffling permutes labels without changing dose.
export function planDeliveries(schedule, condition, seed) {
  assert.ok(Array.isArray(schedule) && schedule.length > 0, 'Nonempty schedule required');
  assert.ok(CONDITIONS.includes(condition), 'Unknown assay condition');
  assert.ok(Number.isSafeInteger(seed), 'Seed must be an integer');
  const teachable = schedule.map((event, index) => event.probe ? -1 : index).filter(index => index >= 0);
  assert.ok(teachable.length > 0, 'Schedule requires at least one teachable experience');
  const labels = teachable.map(index => schedule[index].expectedChannel);
  assert.ok(labels.every(label => label === 'PAM02' || label === 'PPL103'), 'Invalid expected channel');
  const positives = labels.filter(x => x === 'PAM02').length;
  const negatives = labels.length - positives;
  assert.equal(positives, negatives, 'Schedule must balance both contingency classes');
  const assignments = Array(schedule.length).fill(null);
  const assignActive = values => teachable.forEach((index, i) => { assignments[index] = values[i]; });
  if (condition === 'absent') return { assignments, seed, delivered: 0,
    cueExposures: schedule.length, plasticityEnabled: true };
  if (condition === 'disabled' || condition === 'informative') assignActive(labels);
  if (condition === 'anti-correlated') assignActive(labels.map(x => x === 'PAM02' ? 'PPL103' : 'PAM02'));
  let agreement = null;
  if (condition === 'shuffled') {
    const shuffled = shuffledFeedback(labels, seed); assignActive(shuffled);
    agreement = shuffled.filter((x, i) => x === labels[i]).length;
  }
  if (condition !== 'shuffled') return { assignments, seed, delivered: teachable.length,
    cueExposures: schedule.length, plasticityEnabled: condition !== 'disabled' };
  return { assignments, seed, delivered: teachable.length,
    cueExposures: schedule.length, plasticityEnabled: true, agreement,
    identifiable: agreement > 0 && agreement < labels.length };
}

export function assertMatchedExposure(schedule, plans) {
  for (const condition of CONDITIONS) {
    const plan = plans[condition];
    assert.equal(plan.assignments.length, schedule.length, `${condition}: experience count mismatch`);
    assert.equal(plan.cueExposures, schedule.length, `${condition}: cue/input exposure mismatch`);
    const teachableCount = schedule.filter(event => !event.probe).length;
    assert.equal(plan.delivered, condition === 'absent' ? 0 : teachableCount, `${condition}: signal dose mismatch`);
    assert.ok(schedule.every((event, i) => !event.probe || plan.assignments[i] === null), `${condition}: probe received a teaching signal`);
    assert.equal(plan.plasticityEnabled, condition !== 'disabled', `${condition}: plasticity assignment mismatch`);
  }
  return true;
}

// Bind complete evidence to the actual context. The receiver must first call
// verifiedExperience and supply its returned verified identity/scope.
export function makeVerifiedReceipt({ event, assessment, verification, signal, neural }) {
  assert.ok(event && verification?.learningAllowed === true, 'Independently verified consequence required');
  assert.ok(['success', 'failure'].includes(verification.status), 'Unknown consequence produces no teaching receipt');
  assert.equal(verification.status, event.status, 'Verified consequence differs from registered experience');
  assert.equal(assessment.fen, event.fen, 'Assessment board mismatch');
  assert.equal(assessment.pgn, event.pgn, 'Assessment history mismatch');
  assert.deepEqual(assessment.task, event.task, 'Assessment task mismatch');
  assert.equal(event.action, verification.move, 'Certificate action mismatch');
  assert.equal(verification.certificateSha256, event.certificateSha256, 'Certificate digest mismatch');
  assert.ok(typeof verification.verifiedScope === 'string' && verification.verifiedScope.length > 0,
    'Verified consequence scope is required');
  assert.ok(typeof assessment.memoryHash === 'string' && /^[a-f0-9]{64}$/.test(assessment.memoryHash));
  assert.ok(Array.isArray(assessment.rows) && assessment.rows.length > 0 && assessment.rows.length <= 256);
  assert.ok(assessment.rows.every(row => typeof row.move === 'string' && Number.isFinite(row.score)));
  assert.equal(new Set(assessment.rows.map(row => row.move)).size, assessment.rows.length, 'Duplicate assessed action');
  assert.ok(assessment.rows.some(row => row.move === event.action), 'Candidate action absent from ranking');
  const best = Math.max(...assessment.rows.map(row => row.score));
  const winners = assessment.rows.filter(row => row.score === best).map(row => row.move);
  assert.equal(assessment.choice, winners.length === 1 ? winners[0] : null, 'Unaided choice/ranking mismatch');
  const rows = assessment.rows.map(row => ({ move: row.move, score: row.score }));
  return { schema: 'plasticity-assay-receipt-v1', context: { fen: event.fen, pgn: event.pgn,
      task: structuredClone(event.task), action: event.action },
    teacherEvidence: { status: verification.status, certificateSha256: verification.certificateSha256,
      scope: verification.verifiedScope, meaning: verification.meaning ?? null },
    unaidedRanking: { memoryHash: assessment.memoryHash, rows, choice: assessment.choice },
    deliveredSignal: signal ? structuredClone(signal) : null,
    neural: neural ? structuredClone(neural) : null };
}

export function validateNeuralReceipt(neural) {
  assert.ok(neural && Array.isArray(neural.eligibility) && neural.eligibility.length > 0
    && neural.eligibility.length <= 262144
    && neural.eligibility.every(value => Number.isFinite(value) && value >= 0 && value <= 1), 'Invalid eligibility trace');
  assert.ok(Array.isArray(neural.signedLocalDrives) && neural.signedLocalDrives.length > 0
    && neural.signedLocalDrives.length <= 256 && neural.signedLocalDrives.every(row =>
      typeof row.compartment === 'string' && Number.isFinite(row.potentiation) && row.potentiation >= 0
      && Number.isFinite(row.depression) && row.depression >= 0), 'Invalid compartment local drives');
  assert.ok(Array.isArray(neural.compartmentGains) && neural.compartmentGains.length > 0
    && neural.compartmentGains.length <= 256 && neural.compartmentGains.every(row =>
      typeof row.compartment === 'string' && Array.isArray(row.gains) && row.gains.length > 0
      && row.gains.length <= 1000000 && row.gains.every(value => Number.isFinite(value) && value > 0)
      && Array.isArray(row.saturation) && row.saturation.length === row.gains.length
      && row.saturation.every(value => typeof value === 'boolean')), 'Invalid compartment gains/saturation');
  assert.ok(Array.isArray(neural.neuralConsequences) && neural.neuralConsequences.length > 0
    && neural.neuralConsequences.length <= 256 && neural.neuralConsequences.every(row =>
      typeof row.compartment === 'string' && Number.isFinite(row.before) && Number.isFinite(row.after)),
    'Invalid neural consequence record');
  assert.ok(Number.isSafeInteger(neural.presentations) && neural.presentations >= 1
    && Buffer.byteLength(JSON.stringify(neural)) <= 65536, 'Neural receipt exceeds bounds');
  return true;
}

export function assertPlasticityStateIsolation(before, after, plasticityEnabled) {
  if (!plasticityEnabled) assert.equal(digest(before), digest(after), 'Disabled-plasticity arm changed physiological state');
  return true;
}

// A receipt is first published as pending, then acknowledged by a separate
// atomic state publication. Recovery returns pending work for exact replay.
export function publishAtomicJson(path, value) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  if (existsSync(path)) throw new Error(`Refusing overwrite: ${path}`);
  mkdirSync(dirname(path), { recursive: true });
  const partial = `${path}.partial`;
  writeFileSync(partial, bytes, { flag: 'wx' });
  renameSync(partial, path);
  return sha256(bytes);
}

function writeNewJson(path, value) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.partial`, bytes, { flag: 'wx' });
  renameSync(`${path}.partial`, path);
  return sha256(bytes);
}

export function publishCheckpoint(outputDir, sequence, checkpoint) {
  assert.ok(Number.isSafeInteger(sequence) && sequence >= 0);
  validateCheckpoint(checkpoint, checkpoint.identity);
  const root = join(outputDir, `checkpoint-${String(sequence).padStart(6, '0')}`);
  if (existsSync(root)) throw new Error(`Refusing checkpoint overwrite: ${root}`);
  const partial = `${root}.partial`;
  mkdirSync(partial, { recursive: false });
  try {
    const statePath = join(partial, 'state.json');
    const stateHash = writeNewJson(statePath, checkpoint);
    writeNewJson(join(partial, 'manifest.json'), { sequence, stateSha256: stateHash, complete: true });
    renameSync(partial, root);
    return { path: root, sequence, stateSha256: stateHash };
  } catch (error) {
    // Preserve partial publication as interruption evidence. Never promote it.
    throw error;
  }
}

export function loadLastCheckpoint(sourceDir, identity) {
  const dirs = readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^checkpoint-\d{6}$/.test(entry.name))
    .map(entry => entry.name).sort();
  assert.ok(dirs.length, 'No completed checkpoint exists');
  const dir = join(sourceDir, dirs.at(-1)), manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.complete, true); assert.equal(manifest.sequence, Number(dirs.at(-1).slice(-6)));
  const state = loadPinnedJson(join(dir, 'state.json'), manifest.stateSha256);
  validateCheckpoint(state, identity);
  return { state, manifest, path: dir };
}

export async function appendImmutableJsonl(path, record, maxRecords = 1024) {
  const line = JSON.stringify(record);
  assert.ok(Buffer.byteLength(line) <= 65536, 'Record exceeds 64 KiB');
  if (existsSync(path)) {
    let count = 0, found = false;
    for await (const prior of streamRows(path)) {
      if (++count > maxRecords) throw new Error('JSONL record bound exceeded');
      if (prior.id === record.id) {
        assert.equal(JSON.stringify(prior), line, `Conflicting publication for receipt ${record.id}`); found = true;
      }
    }
    if (found) return false;
    if (count >= maxRecords) throw new Error('JSONL record bound exceeded');
    writeFileSync(path, `${line}\n`, { flag: 'a' });
  } else writeFileSync(path, `${line}\n`, { flag: 'wx' });
  return true;
}

export function validateAdapter(adapter) {
  for (const method of ['snapshot', 'restore', 'assess', 'deliver', 'readout'])
    assert.equal(typeof adapter?.[method], 'function', `Adapter missing ${method}`);
  assert.equal(typeof adapter.identity, 'string');
  const state = adapter.snapshot();
  assert.ok(state && typeof state === 'object' && !Array.isArray(state));
  for (const key of ['physiological', 'neuralTransient', 'eligibility'])
    assert.ok(Object.hasOwn(state, key), `Adapter snapshot missing ${key}`);
  const serialized = JSON.stringify(state);
  assert.ok(serialized && Buffer.byteLength(serialized) <= MAX_ADAPTER_STATE_BYTES, 'Adapter state exceeds checkpoint bound');
  return true;
}

// Serial, bounded coordinator. The adapter owns neural-local eligibility and
// plasticity; this coordinator passes only the declared delivered channel.
export async function runResumableAssay({ protocol, identity, schedule, experiences, adapters, outputDir,
  resumeFrom = null, verify, guard, pace = async () => {}, maxEvents = 256 }) {
  validateIdentity(identity);
  assert.ok(schedule.length > 0 && schedule.length <= maxEvents && schedule.length <= 256);
  assert.ok(experiences.length > 0 && experiences.length <= 256);
  if (!resumeFrom) {
    assert.ok(!existsSync(outputDir), 'Fresh run requires a new output directory');
    mkdirSync(outputDir, { recursive: false });
  } else {
    assert.ok(resolve(outputDir) !== resolve(resumeFrom), 'Resume must publish into a new output directory');
    assert.ok(!existsSync(outputDir), 'Resume requires a fresh output directory');
    mkdirSync(outputDir, { recursive: false });
  }
  const byId = new Map(experiences.map(event => [event.id, event]));
  assert.equal(byId.size, experiences.length, 'Duplicate experience identity');
  for (const condition of CONDITIONS) validateAdapter(adapters[condition]);
  const plans = Object.fromEntries(CONDITIONS.map(condition => [condition,
    planDeliveries(schedule, condition, protocol.seed)]));
  assertMatchedExposure(schedule, plans);
  const eventIds = new Set();
  for (const event of schedule) { assert.ok(!eventIds.has(event.id)); eventIds.add(event.id); }
  const state = { schema: ASSAY_SCHEMA, identity, nextIndex: 0, conditionIndex: 0,
    randomization: Object.fromEntries(CONDITIONS.map(c => [c, plans[c]])), pendingReceipt: null,
    adapterStates: Object.fromEntries(CONDITIONS.map(c => [c, adapters[c].snapshot()])), completed: [],
    exposures: Object.fromEntries(CONDITIONS.map(c => [c, {}])), armPresentations: Object.fromEntries(CONDITIONS.map(c => [c, 0])),
    armEvaluations: Object.fromEntries(CONDITIONS.map(c => [c, 0])) };
  if (!resumeFrom) {
    const initialHashes = CONDITIONS.map(c => digest(state.adapterStates[c]));
    assert.ok(initialHashes.every(hash => hash === initialHashes[0]), 'Arms must start from matched adapter state');
  }
  let checkpointSequence = 0;
  if (resumeFrom) {
    const restored = loadLastCheckpoint(resumeFrom, identity);
    Object.assign(state, restored.state.coordinatorState);
    state.adapterStates = restored.state.adapterStates;
    checkpointSequence = restored.manifest.sequence + 1;
    for (const condition of CONDITIONS) adapters[condition].restore(state.adapterStates[condition]);
    // A resume publishes a complete new output tree. Copy only records already
    // acknowledged by a completed checkpoint; applied pending work is handled
    // below from its durable receipt and remains idempotent by receipt id.
    const acknowledged = new Set(state.completed);
    for (const condition of CONDITIONS) {
      const source = join(resumeFrom, `${condition}.jsonl`);
      if (!existsSync(source)) continue;
      for await (const record of streamRows(source)) {
        if (acknowledged.has(record.id))
          await appendImmutableJsonl(join(outputDir, `${condition}.jsonl`), record, protocol.budgets.maxLogEntries);
      }
    }
  }
  const checkpoint = () => {
    const adapterStates = Object.fromEntries(CONDITIONS.map(c => [c, adapters[c].snapshot()]));
    state.adapterStates = adapterStates;
    const coordinatorState = structuredClone(state); delete coordinatorState.adapterStates;
    return publishCheckpoint(outputDir, checkpointSequence++, { identity,
      registeredState: { physiological: 'adapterStates.*.physiological', neuralTransient: 'adapterStates.*.neuralTransient',
        eligibility: 'adapterStates.*.eligibility', randomization: structuredClone(state.randomization) },
      pendingReceipt: state.pendingReceipt, coordinatorState, adapterStates });
  };
  if (!resumeFrom) checkpoint();
  if (state.pendingReceipt?.status === 'applied') {
    await appendImmutableJsonl(join(outputDir, `${state.pendingReceipt.condition}.jsonl`), state.pendingReceipt.record,
      protocol.budgets.maxLogEntries);
    state.completed.push(state.pendingReceipt.id); state.nextIndex = state.pendingReceipt.index + 1;
    state.conditionIndex = CONDITIONS.indexOf(state.pendingReceipt.condition); state.pendingReceipt = null;
    checkpoint();
  } else if (state.pendingReceipt?.status === 'pending') {
    state.conditionIndex = CONDITIONS.indexOf(state.pendingReceipt.condition);
    state.nextIndex = state.pendingReceipt.index;
  }
  for (let c = state.conditionIndex; c < CONDITIONS.length; c++) {
    const condition = CONDITIONS[c], adapter = adapters[condition], plan = plans[condition];
    const start = c === state.conditionIndex ? state.nextIndex : 0;
    for (let i = start; i < schedule.length; i++) {
      guard(); const eventStarted = performance.now(), slot = schedule[i], event = byId.get(slot.experienceId);
      assert.ok(event, `Unknown experience ${slot.experienceId}`);
      assert.equal(slot.experienceId, event.id, 'Schedule/experience mismatch');
      const publicInput = { fen: event.fen, pgn: event.pgn, task: structuredClone(event.task), action: event.action };
      const fixedBudget = { maxEvaluations: protocol.budgets.maxEvaluationsPerAssessment,
        maxLegalMoves: protocol.budgets.maxLegalMoves, maxStoredNodes: protocol.budgets.maxStoredNodes,
        maxSearchEvaluations: protocol.search.maxEvaluations, deadlineMs: protocol.search.deadlineMs };
      const assessment = await adapter.assess(publicInput, fixedBudget);
      assert.equal(assessment.fen, event.fen); assert.equal(assessment.pgn, event.pgn);
      assert.deepEqual(assessment.task, event.task);
      const beforeBehavior = await adapter.readout(publicInput, fixedBudget);
      assert.ok(Number.isFinite(beforeBehavior.margin), 'Pre-feedback behavioral margin must be finite');
      assert.ok(Number.isSafeInteger(assessment.evaluations) && assessment.evaluations >= 1
        && Number.isSafeInteger(beforeBehavior.evaluations) && beforeBehavior.evaluations >= 1,
        'Assessment and pre-feedback evaluation counts are required');
      const physiologyBefore = structuredClone(adapter.snapshot().physiological);
      const verification = await verify(event);
      if (slot.probe) {
        assert.equal(verification.learningAllowed, true, 'Retention probe must refer to a verified experience');
        const receipt = makeVerifiedReceipt({ event, assessment, verification, signal: null, neural: null });
        const resources = { rssMiB: process.memoryUsage().rss / 2 ** 20,
          freeMiB: process.getBuiltinModule('node:os').freemem() / 2 ** 20 };
        assert.ok(resources.rssMiB <= protocol.runtime.rssMiB && resources.freeMiB >= protocol.runtime.freeMiB,
          'Resource guard exceeded');
        const exposure = { assessmentEvaluations: assessment.evaluations, preReadoutEvaluations: beforeBehavior.evaluations,
          neuralPresentations: 0, postReadoutEvaluations: 0 };
        state.armEvaluations[condition] += assessment.evaluations + beforeBehavior.evaluations;
        assert.ok(state.armEvaluations[condition] <= protocol.budgets.maxEvaluations, 'Arm evaluation budget exceeded');
        state.exposures[condition][slot.id] = exposure;
        const record = { ...receipt, id: `${condition}-${slot.id}`, condition, slot: structuredClone(slot),
          teacherEvidence: { ...receipt.teacherEvidence, verified: true }, plasticityEnabled: condition !== 'disabled',
          behavioral: { beforeMargin: beforeBehavior.margin, afterMargin: beforeBehavior.margin, change: 0 },
          exposure, resources, skipped: true, reason: 'Unaided retention probe; no teaching signal delivered' };
        state.adapterStates[condition] = adapter.snapshot();
        state.pendingReceipt = { id: record.id, status: 'applied', condition, index: i, record };
        state.conditionIndex = c; state.nextIndex = i; checkpoint();
        await appendImmutableJsonl(join(outputDir, `${condition}.jsonl`), record, protocol.budgets.maxLogEntries);
        state.completed.push(record.id); state.pendingReceipt = null; state.nextIndex = i + 1; state.conditionIndex = c;
        checkpoint(); await pace(performance.now() - eventStarted); continue;
      }
      if (event.status === 'unknown' || verification.learningAllowed !== true) {
        const exposure = { assessmentEvaluations: assessment.evaluations, preReadoutEvaluations: beforeBehavior.evaluations,
          neuralPresentations: 0, postReadoutEvaluations: 0 };
        const resources = { rssMiB: process.memoryUsage().rss / 2 ** 20,
          freeMiB: process.getBuiltinModule('node:os').freemem() / 2 ** 20 };
        assert.ok(resources.rssMiB <= protocol.runtime.rssMiB && resources.freeMiB >= protocol.runtime.freeMiB,
          'Resource guard exceeded');
        state.armEvaluations[condition] += assessment.evaluations + beforeBehavior.evaluations;
        assert.ok(state.armEvaluations[condition] <= protocol.budgets.maxEvaluations, 'Arm evaluation budget exceeded');
        state.exposures[condition][slot.id] = exposure;
        const record = { id: `${condition}-${slot.id}`, condition, slot: structuredClone(slot),
          context: { fen: event.fen, pgn: event.pgn, task: structuredClone(event.task), action: event.action },
          teacherEvidence: { status: 'unknown', verified: false, certificateSha256: verification.certificateSha256 ?? null,
            scope: verification.verifiedScope ?? null, reason: verification.reason ?? 'Unknown or exhausted verification' },
          unaidedRanking: assessment, deliveredSignal: null, neural: null,
          behavioral: { beforeMargin: beforeBehavior.margin, afterMargin: beforeBehavior.margin, change: 0 },
          exposure, resources, plasticityEnabled: condition !== 'disabled', skipped: true,
          reason: 'Unknown or exhausted verification; no teaching event' };
        state.adapterStates[condition] = adapter.snapshot();
        state.pendingReceipt = { id: record.id, status: 'applied', condition, index: i, record };
        state.conditionIndex = c; state.nextIndex = i; checkpoint();
        await appendImmutableJsonl(join(outputDir, `${condition}.jsonl`), record, protocol.budgets.maxLogEntries);
        state.completed.push(record.id); state.pendingReceipt = null; state.nextIndex = i + 1; state.conditionIndex = c;
        checkpoint(); await pace(performance.now() - eventStarted); continue;
      } else {
        const channel = plan.assignments[i];
        const receipt = makeVerifiedReceipt({ event, assessment, verification,
          signal: channel === null ? null : { channel, delaySteps: slot.delaySteps, plasticityEnabled: condition !== 'disabled' }, neural: null });
        const pending = { id: `${condition}-${slot.id}`, status: 'pending', condition, index: i, receipt };
        state.pendingReceipt = pending; state.conditionIndex = c; state.nextIndex = i;
        checkpoint(); // receipt is durable before neural delivery
        const neural = await adapter.deliver(publicInput, { channel, feedbackEnabled: channel !== null,
          delaySteps: slot.delaySteps, plasticityEnabled: condition !== 'disabled', ...fixedBudget });
        validateNeuralReceipt(neural);
        assert.ok(neural.presentations <= protocol.budgets.maxPresentations, 'Per-event presentation budget exceeded');
        assertPlasticityStateIsolation(physiologyBefore, adapter.snapshot().physiological, condition !== 'disabled');
        const afterBehavior = await adapter.readout(publicInput, fixedBudget);
        assert.ok(Number.isFinite(afterBehavior.margin), 'Post-feedback behavioral margin must be finite');
        assert.ok(Number.isSafeInteger(afterBehavior.evaluations) && afterBehavior.evaluations >= 1);
        const exposure = { assessmentEvaluations: assessment.evaluations, preReadoutEvaluations: beforeBehavior.evaluations,
          neuralPresentations: neural.presentations, postReadoutEvaluations: afterBehavior.evaluations };
        const resources = { rssMiB: process.memoryUsage().rss / 2 ** 20,
          freeMiB: process.getBuiltinModule('node:os').freemem() / 2 ** 20 };
        assert.ok(resources.rssMiB <= protocol.runtime.rssMiB && resources.freeMiB >= protocol.runtime.freeMiB,
          'Resource guard exceeded');
        state.armPresentations[condition] += neural.presentations;
        state.armEvaluations[condition] += assessment.evaluations + beforeBehavior.evaluations + afterBehavior.evaluations;
        assert.ok(state.armPresentations[condition] <= protocol.budgets.maxPresentations, 'Arm presentation budget exceeded');
        assert.ok(state.armEvaluations[condition] <= protocol.budgets.maxEvaluations, 'Arm evaluation budget exceeded');
        state.exposures[condition][slot.id] = exposure;
        const record = { ...receipt, id: pending.id, condition,
          slot: structuredClone(slot),
          teacherEvidence: { ...receipt.teacherEvidence, verified: true }, neural: neural ?? null,
          plasticityEnabled: condition !== 'disabled',
          behavioral: { beforeMargin: beforeBehavior.margin, afterMargin: afterBehavior.margin,
            change: afterBehavior.margin - beforeBehavior.margin },
          exposure, resources,
          skipped: channel === null, reason: channel === null ? 'Absent-feedback control' : null };
        state.adapterStates[condition] = adapter.snapshot();
        state.pendingReceipt = { ...pending, status: 'applied', record };
        checkpoint();
        await appendImmutableJsonl(join(outputDir, `${condition}.jsonl`), record, protocol.budgets.maxLogEntries);
        state.completed.push(pending.id);
        state.pendingReceipt = null; state.nextIndex = i + 1; state.conditionIndex = c;
        checkpoint();
      }
      state.adapterStates[condition] = adapter.snapshot(); state.nextIndex = i + 1; state.conditionIndex = c;
      if (event.status === 'unknown' || state.completed.at(-1) !== `${condition}-${slot.id}`) checkpoint();
      await pace(performance.now() - eventStarted);
    }
    state.nextIndex = 0; state.conditionIndex = c + 1;
    state.adapterStates[condition] = adapter.snapshot();
    checkpoint();
  }
  const reference = state.exposures.informative;
  for (const condition of CONDITIONS) for (const slot of schedule)
    assert.deepEqual(state.exposures[condition][slot.id], reference[slot.id], `${condition}: exposure mismatch at ${slot.id}`);
  return { complete: true, state };
}

// Independent read-only audit over published records. Teacher proof is
// rechecked here, after the runner has finished, before any result is accepted.
export async function auditAssayRecords({ protocol, schedule, experiences, recordsByCondition, verify }) {
  const plans = Object.fromEntries(CONDITIONS.map(condition => [condition,
    planDeliveries(schedule, condition, protocol.seed)]));
  assertMatchedExposure(schedule, plans);
  const byId = new Map(experiences.map(event => [event.id, event]));
  const allRecords = [];
  const exposureReference = new Map();
  const audited = {};
  for (const condition of CONDITIONS) {
    const rows = recordsByCondition[condition];
    assert.ok(Array.isArray(rows) && rows.length === schedule.length, `${condition}: record count mismatch`);
    const ids = new Set();
    for (let i = 0; i < schedule.length; i++) {
      const slot = schedule[i], event = byId.get(slot.experienceId), row = rows[i];
      assert.ok(event, `Schedule references unknown experience ${slot.experienceId}`);
      assert.equal(row.id, `${condition}-${slot.id}`, `${condition}: receipt order/identity mismatch`);
      assert.ok(!ids.has(row.id), `${condition}: duplicate receipt`); ids.add(row.id);
      assert.equal(row.condition, condition); assert.deepEqual(row.slot, slot);
      assert.deepEqual(row.context, { fen: event.fen, pgn: event.pgn, task: event.task, action: event.action });
      const assessment = row.unaidedRanking;
      if (assessment.fen !== undefined) assert.equal(assessment.fen, event.fen);
      if (assessment.pgn !== undefined) assert.equal(assessment.pgn, event.pgn);
      if (assessment.task !== undefined) assert.deepEqual(assessment.task, event.task);
      assert.ok(/^[a-f0-9]{64}$/.test(assessment.memoryHash));
      assert.ok(Array.isArray(assessment.rows) && assessment.rows.length > 0 && assessment.rows.length <= 256);
      assert.ok(assessment.rows.every(candidate => typeof candidate.move === 'string' && Number.isFinite(candidate.score)));
      assert.equal(new Set(assessment.rows.map(candidate => candidate.move)).size, assessment.rows.length);
      assert.ok(assessment.rows.some(candidate => candidate.move === event.action));
      const topScore = Math.max(...assessment.rows.map(candidate => candidate.score));
      const topMoves = assessment.rows.filter(candidate => candidate.score === topScore).map(candidate => candidate.move);
      assert.equal(assessment.choice, topMoves.length === 1 ? topMoves[0] : null,
        'Unaided ranking choice does not match the recorded scores');
      const verification = await verify(event);
      const verified = event.status !== 'unknown' && verification.learningAllowed === true
        && verification.status === event.status && verification.move === event.action
        && verification.certificateSha256 === event.certificateSha256;
      const isProbe = slot.probe === true;
      const expectedChannel = isProbe || !verified ? null : plans[condition].assignments[i];
      const expectedSignal = expectedChannel === null ? null : { channel: expectedChannel,
        delaySteps: slot.delaySteps, plasticityEnabled: condition !== 'disabled' };
      assert.deepEqual(row.deliveredSignal, expectedSignal, `${condition}/${slot.id}: delivered signal mismatch`);
      assert.equal(row.plasticityEnabled, condition !== 'disabled');
      if (verified) {
        assert.equal(row.teacherEvidence.verified, true);
        assert.equal(row.teacherEvidence.status, verification.status);
        assert.equal(row.teacherEvidence.certificateSha256, verification.certificateSha256);
        assert.equal(row.teacherEvidence.scope, verification.verifiedScope);
      } else {
        assert.equal(row.teacherEvidence.verified, false, 'Unknown/rejected evidence was marked verified');
        assert.equal(row.neural, null, 'Unverified consequence reached neural update');
      }
      if (isProbe || !verified) assert.equal(row.neural, null, 'Probe/unknown receipt contains a teaching update');
      else validateNeuralReceipt(row.neural);
      if (condition === 'informative' && verified && !isProbe) assert.equal(row.skipped, false,
        'Informative verified experience did not produce a teaching event');
      if (expectedChannel === null) assert.equal(row.skipped, true);
      assert.ok(Number.isFinite(row.behavioral?.beforeMargin) && Number.isFinite(row.behavioral?.afterMargin));
      assert.ok(row.resources?.rssMiB <= protocol.runtime.rssMiB && row.resources?.freeMiB >= protocol.runtime.freeMiB);
      assert.ok(row.exposure && Number.isSafeInteger(row.exposure.assessmentEvaluations)
        && Number.isSafeInteger(row.exposure.preReadoutEvaluations));
      if (isProbe || !verified) assert.equal(row.exposure.neuralPresentations, 0);
      else assert.ok(row.exposure.neuralPresentations >= 1, 'Verified cue exposure is missing from adapter receipt');
      const reference = exposureReference.get(slot.id);
      if (reference) assert.deepEqual(row.exposure, reference, `${condition}/${slot.id}: exposure differs across arms`);
      else exposureReference.set(slot.id, row.exposure);
      allRecords.push(row);
    }
    audited[condition] = { records: rows.length,
      verifiedTeachingEvents: rows.filter(row => row.teacherEvidence?.verified && !row.skipped).length,
      unaidedProbes: rows.filter(row => row.slot?.probe).length };
  }
  return { passed: true, arms: audited, gates: evaluateAssayGates(allRecords, protocol),
    scope: 'Independent receipt/certificate/control/exposure audit; not biological validation or evidence of useful learning' };
}

export function loadPinnedJson(path, expectedSha256) {
  assert.ok(statSync(path).size <= MAX_CHECKPOINT_FILE_BYTES, 'Pinned JSON exceeds checkpoint file bound');
  const bytes = readFileSync(path);
  assert.equal(sha256(bytes), expectedSha256, `Hash mismatch: ${path}`);
  return JSON.parse(bytes.toString('utf8'));
}

export function validateIdentity(identity) {
  assert.ok(identity && typeof identity === 'object');
  for (const key of ['graph', 'model', 'memory', 'encoder', 'readout', 'policy', 'dataset', 'protocol'])
    assert.ok(/^[a-f0-9]{64}$/.test(identity[key]), `Missing pinned ${key} hash`);
  assert.ok(identity.algorithms && Object.values(identity.algorithms).length > 0);
  for (const hash of Object.values(identity.algorithms)) assert.ok(/^[a-f0-9]{64}$/.test(hash));
  assert.ok(Array.isArray(identity.seeds) && identity.seeds.length > 0 && identity.seeds.every(Number.isSafeInteger));
  assert.ok(identity.splits && identity.splits.train?.length && identity.splits.validation?.length && identity.splits.final?.length);
  const groups = Object.values(identity.splits).map(items => new Set(items));
  for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++)
    for (const item of groups[a]) assert.ok(!groups[b].has(item), `Split leakage: ${item}`);
  return true;
}

export function validateCheckpoint(checkpoint, identity) {
  assert.deepEqual(checkpoint.identity, identity, 'Checkpoint identity mismatch');
  assert.ok(checkpoint.registeredState && typeof checkpoint.registeredState === 'object');
  for (const key of ['physiological', 'neuralTransient', 'eligibility', 'randomization'])
    assert.ok(Object.hasOwn(checkpoint.registeredState, key), `Checkpoint missing ${key}`);
  assert.ok(checkpoint.pendingReceipt === null || typeof checkpoint.pendingReceipt === 'object');
  if (checkpoint.pendingReceipt) assert.ok(['pending', 'applied'].includes(checkpoint.pendingReceipt.status),
    'Invalid pending receipt state');
  if (checkpoint.adapterStates) {
    let totalBytes = 0;
    for (const condition of CONDITIONS) {
      const state = checkpoint.adapterStates[condition];
      assert.ok(state && typeof state === 'object', `Checkpoint missing ${condition} adapter state`);
      for (const key of ['physiological', 'neuralTransient', 'eligibility'])
        assert.ok(Object.hasOwn(state, key), `${condition} checkpoint missing ${key}`);
      const bytes = Buffer.byteLength(JSON.stringify(state));
      assert.ok(bytes <= MAX_ADAPTER_STATE_BYTES, `${condition} adapter state exceeds bound`);
      totalBytes += bytes;
    }
    assert.ok(totalBytes <= MAX_CHECKPOINT_STATE_BYTES, 'Aggregate adapter state exceeds checkpoint bound');
    if (checkpoint.registeredState) for (const key of ['physiological', 'neuralTransient', 'eligibility'])
      assert.equal(checkpoint.registeredState[key], `adapterStates.*.${key}`, `Registered ${key} state location mismatch`);
  }
  if (checkpoint.coordinatorState) {
    assert.ok(Number.isSafeInteger(checkpoint.coordinatorState.conditionIndex)
      && checkpoint.coordinatorState.conditionIndex >= 0 && checkpoint.coordinatorState.conditionIndex <= CONDITIONS.length);
    assert.ok(Number.isSafeInteger(checkpoint.coordinatorState.nextIndex)
      && checkpoint.coordinatorState.nextIndex >= 0 && checkpoint.coordinatorState.nextIndex <= 256);
    assert.ok(Array.isArray(checkpoint.coordinatorState.completed));
  }
  if (checkpoint.pendingReceipt?.status === 'applied') {
    assert.equal(checkpoint.pendingReceipt.record?.id, checkpoint.pendingReceipt.id);
    assert.equal(checkpoint.pendingReceipt.record?.condition, checkpoint.pendingReceipt.condition);
  }
  return true;
}

export function guardResources({ rssBytes, freeBytes }, limits = { rssMiB: 768, freeMiB: 256 }) {
  if (rssBytes > limits.rssMiB * 2 ** 20 || freeBytes < limits.freeMiB * 2 ** 20)
    throw new Error('Resource guard exceeded');
  return true;
}

export function makeProcessResourceGuard({ rssMiB = 768, freeMiB = 256 } = {}) {
  return () => {
    const os = process.getBuiltinModule('node:os');
    const usage = process.memoryUsage();
    guardResources({ rssBytes: usage.rss, freeBytes: os.freemem() }, { rssMiB, freeMiB });
  };
}

export function makeCpuDutyPacer(duty = 0.5, guard = () => {}) {
  assert.ok(Number.isFinite(duty) && duty > 0 && duty <= 1);
  return async workMs => {
    let remaining = Math.max(0, workMs * (1 / duty - 1));
    while (remaining > 0) {
      const slice = Math.min(250, remaining);
      await new Promise(resolve => setTimeout(resolve, slice));
      guard(); remaining -= slice;
    }
  };
}

export function evaluateAssayGates(records, protocol) {
  const informativeRecords = records.filter(row => row.teacherEvidence?.verified === true
    && row.condition === 'informative');
  const perCue = new Map();
  for (const row of informativeRecords) {
    assert.ok(Number.isFinite(row.behavioral?.beforeMargin) && Number.isFinite(row.behavioral?.afterMargin),
      'Before/after behavioral margins missing from teachable receipt');
    const key = row.context.action;
    const values = perCue.get(key) ?? [];
    values.push({ phase: row.slot?.phase ?? null, before: row.behavioral.beforeMargin,
      after: row.behavioral.afterMargin, change: row.behavioral.afterMargin - row.behavioral.beforeMargin });
    perCue.set(key, values);
  }
  const cueResults = [...perCue].map(([cue, values]) => {
    const acquisition = values.filter(v => v.phase === 'acquisition');
    const coexistence = values.filter(v => v.phase === 'coexistence');
    const retention = values.filter(v => v.phase === 'retention-probe');
    const forward = values.filter(v => v.phase === 'reversal-forward');
    const reverse = values.filter(v => v.phase === 'reversal-back');
    return { cue, acquisitionChange: acquisition.length ? acquisition.at(-1).after - acquisition[0].before : null,
      coexistenceMinimum: coexistence.length ? Math.min(...coexistence.map(v => v.after)) : null,
      retentionMinimum: retention.length ? Math.min(...retention.map(v => v.after)) : null,
      reversalForwardFinal: forward.at(-1)?.after ?? null, reversalBackFinal: reverse.at(-1)?.after ?? null };
  });
  const gates = protocol.gates;
  const threshold = gates.controlSeparation.threshold;
  // Absent feedback is a verified exposure and its behavioral observation is
  // required for control separation even though the event is marked skipped.
  const allRecords = records.filter(row => row.teacherEvidence?.verified === true);
  const controlRows = Object.fromEntries(['absent', 'shuffled', 'anti-correlated', 'disabled'].map(condition =>
    [condition, allRecords.filter(row => row.condition === condition)]));
  const controlsPresent = Object.values(controlRows).every(rows => rows.length > 0);
  const criterionRows = cueResults.map(cue => ({ cue: cue.cue,
    acquisition: Number.isFinite(cue.acquisitionChange) && cue.acquisitionChange >= gates.selectiveAcquisition.threshold,
    preservation: Number.isFinite(cue.coexistenceMinimum) && cue.coexistenceMinimum >= gates.preservation.threshold
      && Number.isFinite(cue.retentionMinimum) && cue.retentionMinimum >= gates.preservation.threshold,
    reversalForward: Number.isFinite(cue.reversalForwardFinal) && cue.reversalForwardFinal >= gates.finiteReversal.threshold,
    reversalBack: Number.isFinite(cue.reversalBackFinal) && cue.reversalBackFinal >= gates.finiteReversal.threshold }));
  const controlsSeparated = controlsPresent && cueResults.every(cue => {
    const info = allRecords.filter(row => row.condition === 'informative' && row.context.action === cue.cue).at(-1)?.behavioral?.afterMargin;
    return Number.isFinite(info) && Object.values(controlRows).every(rows => {
      const control = rows.filter(row => row.context.action === cue.cue).at(-1)?.behavioral?.afterMargin;
      return Number.isFinite(control) && info >= control + threshold;
    });
  });
  const saturationRows = new Map();
  for (const row of records) {
    const flags = row.neural?.compartmentGains?.flatMap(compartment => compartment.saturation) ?? [];
    if (!flags.length) continue;
    const arm = saturationRows.get(row.condition) ?? [];
    arm.push(flags.filter(value => value === true).length / flags.length);
    saturationRows.set(row.condition, arm);
  }
  const occupancyValues = [...saturationRows.values()].flat();
  const occupancy = occupancyValues.length ? Math.max(...occupancyValues) : null;
  const saturationPassed = occupancy !== null && [...saturationRows.values()].every(values =>
    values.every((value, index) => index === 0 || !(value > gates.saturation.threshold
      && values[index - 1] > gates.saturation.threshold)));
  const resourceRows = records.map(row => row.resources).filter(Boolean);
  const rssLimit = protocol.runtime?.rssMiB ?? protocol.budgets.rssMiB;
  const freeLimit = protocol.runtime?.freeMiB ?? protocol.budgets.freeMiB;
  const resourcesPassed = Number.isFinite(rssLimit) && Number.isFinite(freeLimit)
    && resourceRows.length === records.length && resourceRows.every(row =>
      row.rssMiB <= rssLimit && row.freeMiB >= freeLimit);
  const all = key => criterionRows.length > 0 && criterionRows.every(row => row[key]);
  return { cueResults, criterionRows, gates: { selectiveAcquisition: all('acquisition'), preservation: all('preservation'),
    finiteReversal: all('reversalForward') && all('reversalBack'), controlSeparation: controlsSeparated,
    saturation: saturationPassed, resources: resourcesPassed }, saturationOccupancy: occupancy,
    scope: 'Predeclared software gate evaluation over per-cue behavioral margins; not biological validation or learning proof' };
}

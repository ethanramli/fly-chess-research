// Fixture-testable protocol and receipt utilities for the proposed assay.
// This module deliberately does not connect a candidate equation to the graph.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { streamRows } from '../runtime/storage.mjs';
import { dirname, join, resolve } from 'node:path';
import { shuffledFeedback } from '../neural-learning/association-validation.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';

export const ASSAY_SCHEMA = 'plasticity-mechanism-assay-v2';
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

export function cueIdentity(context) {
  return digest({ fen: context.fen, pgn: context.pgn, task: context.task, action: context.action });
}

function sameContext(a, b) {
  return a.fen === b.fen && a.pgn === b.pgn && JSON.stringify(a.task) === JSON.stringify(b.task);
}

export function validateRanking(ranking, event, budget = 256) {
  assert.equal(ranking.fen, event.fen, 'Ranking board mismatch');
  assert.equal(ranking.pgn, event.pgn, 'Ranking history mismatch');
  assert.deepEqual(ranking.task, event.task, 'Ranking task mismatch');
  assert.ok(/^[a-f0-9]{64}$/.test(ranking.memoryHash), 'Ranking memory hash missing');
  assert.ok(Array.isArray(ranking.rows) && ranking.rows.length > 0 && ranking.rows.length <= budget, 'Ranking exceeds action bound');
  assert.ok(ranking.rows.every(row => typeof row.move === 'string' && Number.isFinite(row.score)), 'Invalid ranking scores');
  assert.equal(new Set(ranking.rows.map(row => row.move)).size, ranking.rows.length, 'Duplicate assessed action');
  assert.ok(ranking.rows.some(row => row.move === event.action), 'Candidate action absent from ranking');
  const best = Math.max(...ranking.rows.map(row => row.score));
  const winners = ranking.rows.filter(row => row.score === best).map(row => row.move);
  assert.equal(ranking.choice, winners.length === 1 ? winners[0] : null, 'Ranking choice mismatch');
  return true;
}

// Evaluation uses certified opposed actions; these labels never enter the adapter.
export function behavioralMargin(ranking, event, experiences) {
  validateRanking(ranking, event);
  const opponents = experiences.filter(other => sameContext(other, event)
    && ['success', 'failure'].includes(other.status) && other.status !== event.status);
  if (opponents.length === 0) return null; // Missing comparison evidence cannot produce a behavioral pass.
  const scores = new Map(ranking.rows.map(row => [row.move, row.score]));
  assert.ok(opponents.every(other => scores.has(other.action)), 'Certified comparison action missing from ranking');
  const candidate = scores.get(event.action), other = Math.max(...opponents.map(e => scores.get(e.action)));
  return event.status === 'success' ? candidate - other : other - candidate;
}

export const receiptDigest = record => sha256(JSON.stringify(record));

function validateDose(stage) {
  assert.ok(Number.isFinite(stage.inputDose) && stage.inputDose >= 0, 'Cue input dose missing');
  assert.ok(Number.isSafeInteger(stage.simulationSteps) && stage.simulationSteps >= 0, 'Simulation step count missing');
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
  if (verification.legalMoves) assert.deepEqual(assessment.rows.map(row => row.move).sort(),
    [...verification.legalMoves].sort(), 'Incomplete all-legal ranking');
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
  validateDose(neural);
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
  const bytes = JSON.stringify(value) + '\n';
  assert.ok(Buffer.byteLength(bytes) <= MAX_CHECKPOINT_FILE_BYTES, 'Checkpoint publication exceeds file bound');
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
  guard();
  assert.ok(schedule.length > 0 && schedule.length <= maxEvents && schedule.length <= 256);
  assert.ok(experiences.length > 0 && experiences.length <= 256);
  assert.ok(!existsSync(outputDir), 'Run/resume requires a new output directory');
  if (resumeFrom) assert.notEqual(resolve(outputDir), resolve(resumeFrom), 'Resume must publish into a new output directory');
  for (const condition of CONDITIONS) validateAdapter(adapters[condition]);
  const byId = new Map(experiences.map(event => [event.id, event]));
  assert.equal(byId.size, experiences.length, 'Duplicate experience identity');
  assert.equal(new Set(schedule.map(slot => slot.id)).size, schedule.length, 'Duplicate slot identity');
  const plans = Object.fromEntries(CONDITIONS.map(c => [c, planDeliveries(schedule, c, protocol.seed)]));
  assertMatchedExposure(schedule, plans);
  const state = { schema: ASSAY_SCHEMA, identity, nextIndex: 0, conditionIndex: 0, randomization: plans,
    pendingReceipt: null, completed: [], receiptDigests: {}, exposures: {}, armPresentations: {}, armEvaluations: {},
    initialPhysiologicalHashes: Object.fromEntries(CONDITIONS.map(c => [c, digest(adapters[c].snapshot().physiological)])) };
  for (const c of CONDITIONS) { state.exposures[c] = {}; state.armPresentations[c] = 0; state.armEvaluations[c] = 0; }
  let sequence = 0;
  if (resumeFrom) {
    const saved = loadLastCheckpoint(resumeFrom, identity);
    assert.equal(saved.state.coordinatorState.schema, ASSAY_SCHEMA, 'Unsupported coordinator schema');
    Object.assign(state, saved.state.coordinatorState);
    assert.deepEqual(state.randomization, plans, 'Resume assignment mismatch');
    for (const c of CONDITIONS) adapters[c].restore(saved.state.adapterStates[c]);
    sequence = saved.manifest.sequence + 1;
  } else {
    const hashes = CONDITIONS.map(c => digest(adapters[c].snapshot()));
    assert.ok(hashes.every(h => h === hashes[0]), 'Arms must start from matched adapter state');
  }
  mkdirSync(outputDir, { recursive: false });
  if (resumeFrom) for (const c of CONDITIONS) {
    const log = join(resumeFrom, c + '.jsonl');
    const expected = state.completed.filter(id => id.startsWith(c + '-'));
    const copied = new Set();
    if (expected.length && existsSync(log)) for await (const row of streamRows(log)) {
      assert.equal(row.id, expected[copied.size], 'Acknowledged receipt order mismatch');
      assert.equal(receiptDigest(row), state.receiptDigests[row.id], 'Acknowledged receipt digest mismatch');
      assert.ok(!copied.has(row.id), 'Duplicate acknowledged receipt'); copied.add(row.id);
      await appendImmutableJsonl(join(outputDir, c + '.jsonl'), row, protocol.budgets.maxLogEntries);
      if (copied.size === expected.length) break; // Unacknowledged/truncated tail is not promoted.
    }
    assert.equal(copied.size, expected.length, 'Missing acknowledged receipt on resume');
  }
  const checkpoint = () => {
    guard();
    // ponytail: omit snapshots before cloning metadata, so arrays are never duplicated by this clone.
    const { adapterStates: ignored, ...metadata } = state;
    const published = publishCheckpoint(outputDir, sequence++, { identity,
      registeredState: { physiological: 'adapterStates.*.physiological', neuralTransient: 'adapterStates.*.neuralTransient',
        eligibility: 'adapterStates.*.eligibility', randomization: state.randomization },
      pendingReceipt: state.pendingReceipt, coordinatorState: metadata,
      adapterStates: Object.fromEntries(CONDITIONS.map(c => [c, adapters[c].snapshot()])) });
    guard(); return published;
  };
  checkpoint();
  const acknowledge = async () => {
    const p = state.pendingReceipt;
    assert.equal(p.status, 'applied');
    assert.equal(receiptDigest(p.record), p.recordSha256, 'Applied receipt digest mismatch');
    await appendImmutableJsonl(join(outputDir, p.condition + '.jsonl'), p.record, protocol.budgets.maxLogEntries);
    state.completed.push(p.id); state.receiptDigests[p.id] = p.recordSha256;
    state.nextIndex = p.index + 1; state.conditionIndex = CONDITIONS.indexOf(p.condition);
    state.pendingReceipt = null; checkpoint();
  };
  if (state.pendingReceipt?.status === 'applied') await acknowledge();
  for (let c = state.conditionIndex; c < CONDITIONS.length; c++) {
    const condition = CONDITIONS[c], adapter = adapters[condition];
    for (let i = c === state.conditionIndex ? state.nextIndex : 0; i < schedule.length; i++) {
      guard(); const began = performance.now(), slot = schedule[i], event = byId.get(slot.experienceId);
      assert.ok(event, 'Unknown experience ' + slot.experienceId);
      const publicInput = { fen: event.fen, pgn: event.pgn, task: structuredClone(event.task), action: event.action };
      const options = { maxEvaluations: protocol.budgets.maxEvaluationsPerAssessment,
        maxLegalMoves: protocol.budgets.maxLegalMoves, maxStoredNodes: protocol.budgets.maxStoredNodes,
        maxSearchEvaluations: protocol.search.maxEvaluations, deadlineMs: protocol.search.deadlineMs,
        plasticityEnabled: condition !== 'disabled', guard };
      const checkPhysiology = () => {
        if (condition === 'disabled') assert.equal(digest(adapter.snapshot().physiological),
          state.pendingReceipt.physiologyBeforeHash, 'Disabled-plasticity arm changed physiological state');
      };
      const checkWork = ranking => {
        validateDose(ranking);
        validateRanking(ranking, event, options.maxLegalMoves);
        assert.equal(ranking.memoryHash, digest(adapter.snapshot().physiological), 'Ranking memory hash mismatch');
        assert.ok(Number.isSafeInteger(ranking.evaluations) && ranking.evaluations >= 1
          && ranking.evaluations <= options.maxEvaluations, 'Assessment evaluation budget exceeded');
        assert.ok(Number.isSafeInteger(ranking.presentations) && ranking.presentations >= 0, 'Ranking presentation count missing');
      };
      if (!state.pendingReceipt) {
        const beforeHash = digest(adapter.snapshot().physiological);
        const assessment = await adapter.assess(publicInput, options); guard(); checkWork(assessment);
        if (condition === 'disabled') assert.equal(digest(adapter.snapshot().physiological), beforeHash,
          'Disabled-plasticity arm changed physiological state during assessment');
        state.pendingReceipt = { id: condition + '-' + slot.id, status: 'assessed', condition, index: i,
          physiologyBeforeHash: beforeHash, assessment, verification: null, neural: null };
        state.conditionIndex = c; state.nextIndex = i; checkpoint();
      }
      const p = state.pendingReceipt;
      assert.equal(p.id, condition + '-' + slot.id, 'Pending slot mismatch');
      // Recheck teacher evidence at every resume; no completed neural stage is repeated.
      const checks = new Map();
      for (const other of experiences.filter(other => sameContext(other, event))) checks.set(other.id, await verify(other));
      const verification = checks.get(event.id);
      const verified = event.status !== 'unknown' && verification?.learningAllowed === true;
      if (verified) makeVerifiedReceipt({ event, assessment: p.assessment, verification, signal: null, neural: null });
      if (p.verification && p.status === 'delivered') assert.deepEqual(verification, p.verification, 'Evidence changed after delivery');
      const certified = experiences.filter(other => checks.get(other.id)?.learningAllowed === true);
      for (const other of certified) makeVerifiedReceipt({ event: other, assessment: p.assessment,
        verification: checks.get(other.id), signal: null, neural: null });
      const beforeMargin = verified ? behavioralMargin(p.assessment, event, certified) : null;
      const teaching = verified && !slot.probe;
      if (slot.probe) assert.ok(verified, 'Retention probe must refer to a verified experience');
      const channel = teaching ? plans[condition].assignments[i] : null;
      if (p.status === 'assessed' && teaching) {
        const neural = await adapter.deliver(publicInput, { ...options, channel, feedbackEnabled: channel !== null,
          delaySteps: slot.delaySteps }); guard();
        validateNeuralReceipt(neural); checkPhysiology();
        p.neural = neural; p.verification = verification; p.status = 'delivered'; checkpoint();
      }
      let afterRanking = p.assessment;
      if (teaching) {
        assert.equal(p.status, 'delivered');
        afterRanking = await adapter.readout(publicInput, options); guard(); checkWork(afterRanking); checkPhysiology();
      } else checkPhysiology();
      const afterMargin = verified ? behavioralMargin(afterRanking, event, certified) : null;
      const exposure = { assessmentEvaluations: p.assessment.evaluations, preReadoutEvaluations: 0,
        assessmentPresentations: p.assessment.presentations, neuralPresentations: p.neural?.presentations ?? 0,
        postReadoutEvaluations: teaching ? afterRanking.evaluations : 0,
        postReadoutPresentations: teaching ? afterRanking.presentations : 0,
        assessmentInputDose: p.assessment.inputDose, teachingCueInputDose: p.neural?.inputDose ?? 0,
        postReadoutInputDose: teaching ? afterRanking.inputDose : 0,
        assessmentSteps: p.assessment.simulationSteps, teachingSteps: p.neural?.simulationSteps ?? 0,
        postReadoutSteps: teaching ? afterRanking.simulationSteps : 0 };
      const presentations = exposure.assessmentPresentations + exposure.neuralPresentations + exposure.postReadoutPresentations;
      const evaluations = exposure.assessmentEvaluations + exposure.postReadoutEvaluations;
      assert.ok(state.armPresentations[condition] + presentations <= protocol.budgets.maxPresentations, 'Arm presentation budget exceeded');
      assert.ok(state.armEvaluations[condition] + evaluations <= protocol.budgets.maxEvaluations, 'Arm evaluation budget exceeded');
      const resources = { rssMiB: process.memoryUsage().rss / 2 ** 20,
        freeMiB: process.getBuiltinModule('node:os').freemem() / 2 ** 20 };
      guardResources({ rssBytes: resources.rssMiB * 2 ** 20, freeBytes: resources.freeMiB * 2 ** 20 }, protocol.runtime);
      const signal = channel === null ? null : { channel, delaySteps: slot.delaySteps, plasticityEnabled: condition !== 'disabled' };
      const record = { schema: 'plasticity-assay-receipt-v2', id: p.id, condition, slot: structuredClone(slot),
        context: publicInput, cueIdentity: cueIdentity(publicInput),
        teacherEvidence: { status: verified ? verification.status : 'unknown', verified,
          certificateSha256: verified ? verification.certificateSha256 : null, scope: verified ? verification.verifiedScope : null },
        unaidedRanking: p.assessment, postRanking: afterRanking, deliveredSignal: signal, neural: p.neural,
        physiologicalHashes: { before: p.physiologyBeforeHash, after: digest(adapter.snapshot().physiological) },
        plasticityEnabled: condition !== 'disabled',
        behavioral: { metric: 'candidate-against-certified-opponents-v1', beforeMargin, afterMargin,
          change: beforeMargin === null || afterMargin === null ? null : afterMargin - beforeMargin },
        exposure, resources, skipped: !teaching || channel === null,
        reason: !verified ? 'Unknown or exhausted verification; no teaching event'
          : slot.probe ? 'Unaided retention probe; no teaching signal delivered' : channel === null ? 'Absent-feedback control' : null };
      state.armPresentations[condition] += presentations; state.armEvaluations[condition] += evaluations;
      state.exposures[condition][slot.id] = exposure;
      state.pendingReceipt = { ...p, status: 'applied', record, recordSha256: receiptDigest(record) };
      checkpoint(); await acknowledge(); await pace(performance.now() - began);
    }
    state.nextIndex = 0; state.conditionIndex = c + 1; checkpoint();
  }
  for (const c of CONDITIONS) for (const slot of schedule)
    assert.deepEqual(state.exposures[c][slot.id], state.exposures.informative[slot.id], c + ': exposure mismatch at ' + slot.id);
  state.adapterStates = Object.fromEntries(CONDITIONS.map(c => [c, adapters[c].snapshot()]));
  return { complete: true, state };
}

// Independent read-only audit over published records. Teacher proof is
// rechecked here, after the runner has finished, before any result is accepted.
export async function auditAssayRecords({ protocol, schedule, experiences, recordsByCondition, verify,
  receiptDigests, adapterStates, initialPhysiologicalHashes }) {
  assert.ok(receiptDigests && adapterStates && initialPhysiologicalHashes, 'Committed checkpoints/digests required for audit');
  const plans = Object.fromEntries(CONDITIONS.map(c => [c, planDeliveries(schedule, c, protocol.seed)]));
  assertMatchedExposure(schedule, plans);
  const byId = new Map(experiences.map(e => [e.id, e])), checks = new Map();
  for (const e of experiences) checks.set(e.id, await verify(e));
  const certified = experiences.filter(e => checks.get(e.id)?.learningAllowed === true);
  const allRecords = [], exposureReference = new Map(), audited = {};
  assert.equal(Object.keys(receiptDigests).length, CONDITIONS.length * schedule.length, 'Acknowledged receipt count mismatch');
  for (const condition of CONDITIONS) {
    const rows = recordsByCondition[condition];
    assert.ok(Array.isArray(rows) && rows.length === schedule.length, condition + ': record count mismatch');
    let physiology = initialPhysiologicalHashes[condition], presentations = 0, evaluations = 0;
    for (let i = 0; i < schedule.length; i++) {
      const slot = schedule[i], event = byId.get(slot.experienceId), row = rows[i];
      assert.ok(event, 'Unknown experience');
      assert.equal(row.id, condition + '-' + slot.id, 'Receipt order/identity mismatch');
      assert.equal(receiptDigest(row), receiptDigests[row.id], 'Acknowledged receipt digest mismatch');
      assert.equal(row.schema, 'plasticity-assay-receipt-v2');
      assert.equal(row.condition, condition); assert.deepEqual(row.slot, slot);
      assert.deepEqual(row.context, { fen: event.fen, pgn: event.pgn, task: event.task, action: event.action });
      assert.equal(row.cueIdentity, cueIdentity(row.context));
      validateRanking(row.unaidedRanking, event, protocol.budgets.maxLegalMoves);
      validateRanking(row.postRanking, event, protocol.budgets.maxLegalMoves);
      validateDose(row.unaidedRanking); validateDose(row.postRanking);
      const verification = checks.get(event.id);
      const verified = event.status !== 'unknown' && verification.learningAllowed === true;
      if (verified) {
        for (const other of certified.filter(other => sameContext(other, event)))
          makeVerifiedReceipt({ event: other, assessment: row.unaidedRanking, verification: checks.get(other.id), signal: null, neural: null });
        makeVerifiedReceipt({ event, assessment: row.unaidedRanking, verification, signal: null, neural: null });
        makeVerifiedReceipt({ event, assessment: row.postRanking, verification, signal: null, neural: null });
      }
      const teaching = verified && !slot.probe;
      const channel = teaching ? plans[condition].assignments[i] : null;
      const signal = channel === null ? null : { channel, delaySteps: slot.delaySteps, plasticityEnabled: condition !== 'disabled' };
      assert.deepEqual(row.deliveredSignal, signal, 'Delivered signal mismatch');
      assert.equal(row.plasticityEnabled, condition !== 'disabled');
      assert.equal(row.skipped, !teaching || channel === null);
      assert.equal(row.teacherEvidence.verified, verified);
      assert.equal(row.teacherEvidence.status, verified ? verification.status : 'unknown');
      assert.equal(row.teacherEvidence.certificateSha256, verified ? verification.certificateSha256 : null);
      assert.equal(row.teacherEvidence.scope, verified ? verification.verifiedScope : null);
      const before = verified ? behavioralMargin(row.unaidedRanking, event, certified) : null;
      const after = verified ? behavioralMargin(row.postRanking, event, certified) : null;
      assert.deepEqual(row.behavioral, { metric: 'candidate-against-certified-opponents-v1', beforeMargin: before,
        afterMargin: after, change: before === null || after === null ? null : after - before }, 'Behavioral margin evidence mismatch');
      if (teaching) {
        validateNeuralReceipt(row.neural);
        const associations = (protocol.reversalAssociations ?? []).filter(a =>
          a.forwardExperienceId === event.id || a.backExperienceId === event.id);
        for (const a of associations) assert.equal(row.neural.cueHash, a.cueHash, 'Reversal did not preserve registered measured cue');
      }
      else { assert.equal(row.neural, null, 'Unknown/probe reached teaching'); assert.deepEqual(row.postRanking, row.unaidedRanking); }
      assert.equal(row.physiologicalHashes.before, physiology, 'Persistent state continuity mismatch');
      assert.ok(/^[a-f0-9]{64}$/.test(row.physiologicalHashes.after));
      assert.equal(row.postRanking.memoryHash, row.physiologicalHashes.after, 'Post-ranking state hash mismatch');
      if (condition === 'disabled') {
        assert.equal(row.physiologicalHashes.after, physiology, 'Disabled persistent state changed');
        assert.equal(row.unaidedRanking.memoryHash, physiology, 'Disabled assessment state changed');
      }
      physiology = row.physiologicalHashes.after;
      const expected = { assessmentEvaluations: row.unaidedRanking.evaluations, preReadoutEvaluations: 0,
        assessmentPresentations: row.unaidedRanking.presentations, neuralPresentations: row.neural?.presentations ?? 0,
        postReadoutEvaluations: teaching ? row.postRanking.evaluations : 0,
        postReadoutPresentations: teaching ? row.postRanking.presentations : 0,
        assessmentInputDose: row.unaidedRanking.inputDose, teachingCueInputDose: row.neural?.inputDose ?? 0,
        postReadoutInputDose: teaching ? row.postRanking.inputDose : 0,
        assessmentSteps: row.unaidedRanking.simulationSteps, teachingSteps: row.neural?.simulationSteps ?? 0,
        postReadoutSteps: teaching ? row.postRanking.simulationSteps : 0 };
      assert.deepEqual(row.exposure, expected, 'Exposure/ranking count mismatch');
      for (const [key, n] of Object.entries(expected)) assert.ok((key.endsWith('Dose') ? Number.isFinite(n) : Number.isSafeInteger(n))
        && n >= 0, 'Invalid work count/dose');
      assert.ok(expected.assessmentEvaluations >= 1 && expected.assessmentEvaluations <= protocol.budgets.maxEvaluationsPerAssessment);
      assert.ok(expected.postReadoutEvaluations <= protocol.budgets.maxEvaluationsPerAssessment);
      if (teaching) assert.ok(expected.postReadoutEvaluations >= 1);
      presentations += expected.assessmentPresentations + expected.neuralPresentations + expected.postReadoutPresentations;
      evaluations += expected.assessmentEvaluations + expected.postReadoutEvaluations;
      assert.ok(presentations <= protocol.budgets.maxPresentations && evaluations <= protocol.budgets.maxEvaluations, 'Arm work budget exceeded');
      assert.ok(Number.isFinite(row.resources.rssMiB) && row.resources.rssMiB >= 0
        && Number.isFinite(row.resources.freeMiB) && row.resources.freeMiB >= 0, 'Invalid resource sample');
      guardResources({ rssBytes: row.resources.rssMiB * 2 ** 20, freeBytes: row.resources.freeMiB * 2 ** 20 }, protocol.runtime);
      if (exposureReference.has(slot.id)) assert.deepEqual(row.exposure, exposureReference.get(slot.id), 'Control exposure mismatch');
      else exposureReference.set(slot.id, row.exposure);
      allRecords.push(row);
    }
    assert.equal(digest(adapterStates[condition].physiological), physiology, 'Final checkpoint physiology mismatch');
    audited[condition] = { records: rows.length, verifiedTeachingEvents: rows.filter(r => r.teacherEvidence.verified && !r.skipped).length,
      unaidedProbes: rows.filter(r => r.slot.probe).length, presentations, evaluations };
  }
  return { passed: true, arms: audited, gates: evaluateAssayGates(allRecords, protocol),
    scope: 'Committed receipt/certificate/ranking/control audit; graph update replay and biological validation remain separate' };
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
  if (checkpoint.pendingReceipt) assert.ok(['pending', 'assessed', 'delivered', 'applied'].includes(checkpoint.pendingReceipt.status),
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
    assert.equal(checkpoint.coordinatorState.schema, ASSAY_SCHEMA, 'Unsupported coordinator schema');
    assert.deepEqual(checkpoint.coordinatorState.pendingReceipt, checkpoint.pendingReceipt, 'Pending checkpoint mismatch');
    assert.ok(Number.isSafeInteger(checkpoint.coordinatorState.conditionIndex)
      && checkpoint.coordinatorState.conditionIndex >= 0 && checkpoint.coordinatorState.conditionIndex <= CONDITIONS.length);
    assert.ok(Number.isSafeInteger(checkpoint.coordinatorState.nextIndex)
      && checkpoint.coordinatorState.nextIndex >= 0 && checkpoint.coordinatorState.nextIndex <= 256);
    assert.ok(Array.isArray(checkpoint.coordinatorState.completed));
    const ids = checkpoint.coordinatorState.completed;
    assert.equal(new Set(ids).size, ids.length, 'Duplicate acknowledged receipt');
    assert.ok(ids.every(id => /^[a-f0-9]{64}$/.test(checkpoint.coordinatorState.receiptDigests?.[id])), 'Missing acknowledged digest');
  }
  if (checkpoint.pendingReceipt?.status === 'applied') {
    assert.equal(checkpoint.pendingReceipt.record?.id, checkpoint.pendingReceipt.id);
    assert.equal(checkpoint.pendingReceipt.record?.condition, checkpoint.pendingReceipt.condition);
    assert.equal(receiptDigest(checkpoint.pendingReceipt.record), checkpoint.pendingReceipt.recordSha256, 'Applied receipt digest mismatch');
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
    assert.ok(row.behavioral, 'Behavioral evidence missing');
    const key = cueIdentity(row.context);
    const values = perCue.get(key) ?? [];
    values.push({ phase: row.slot?.phase ?? null, before: row.behavioral.beforeMargin,
      after: row.behavioral.afterMargin });
    perCue.set(key, values);
  }
  const cueResults = [...perCue].map(([cue, values]) => {
    const acquisition = values.filter(v => v.phase === 'acquisition');
    const coexistence = values.filter(v => v.phase === 'coexistence');
    const retention = values.filter(v => v.phase === 'retention-probe');
    const forward = values.filter(v => v.phase === 'reversal-forward');
    const reverse = values.filter(v => v.phase === 'reversal-back');
    const minimum = rows => rows.length && rows.every(v => Number.isFinite(v.after)) ? Math.min(...rows.map(v => v.after)) : null;
    return { cue, acquisitionChange: acquisition.length && Number.isFinite(acquisition.at(-1).after)
        && Number.isFinite(acquisition[0].before) ? acquisition.at(-1).after - acquisition[0].before : null,
      coexistenceMinimum: minimum(coexistence),
      retentionMinimum: minimum(retention),
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
    const info = allRecords.filter(row => row.condition === 'informative' && cueIdentity(row.context) === cue.cue).at(-1)?.behavioral?.afterMargin;
    return Number.isFinite(info) && Object.values(controlRows).every(rows => {
      const control = rows.filter(row => cueIdentity(row.context) === cue.cue).at(-1)?.behavioral?.afterMargin;
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
  const reversalResults = (protocol.reversalAssociations ?? []).map(a => {
    const outcome = (phase, id) => {
      const rows = informativeRecords.filter(r => r.slot.phase === phase && r.slot.experienceId === id);
      return { events: rows.length, margin: rows.at(-1)?.behavioral.afterMargin ?? null };
    };
    const forward = outcome('reversal-forward', a.forwardExperienceId), back = outcome('reversal-back', a.backExperienceId);
    return { association: a.id, forward, back, passed: [forward, back].every(v => v.events > 0
      && v.events <= a.maxEventsPerDirection && Number.isFinite(v.margin) && v.margin >= gates.finiteReversal.threshold) };
  });
  return { cueResults, criterionRows, reversalResults, gates: { selectiveAcquisition: all('acquisition'), preservation: all('preservation'),
    finiteReversal: reversalResults.length > 0 && reversalResults.every(r => r.passed), controlSeparation: controlsSeparated,
    saturation: saturationPassed, resources: resourcesPassed }, saturationOccupancy: occupancy,
    scope: 'Predeclared software gate evaluation over per-cue behavioral margins; not biological validation or learning proof' };
}

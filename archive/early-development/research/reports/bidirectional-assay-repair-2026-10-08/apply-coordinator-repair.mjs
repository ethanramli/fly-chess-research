// Reproducible source edit for the reviewed v3 implementation. Not a run command.
import { readFileSync, writeFileSync } from 'node:fs';
const path = '.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs';
let source = readFileSync(path, 'utf8');
const start = source.indexOf('export async function runResumableAssay(');
const end = source.indexOf('// Independent read-only audit', start);
if (start < 0 || end < 0) throw Error('Expected coordinator edit anchors missing');
source = source.slice(0, start) + String.raw`export async function runResumableAssay({ protocol, identity, schedule, experiences, adapters, outputDir,
  resumeFrom = null, verify, guard, pace = async () => {}, maxEvents = 256 }) {
  validateIdentity(identity);
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
    pendingReceipt: null, completed: [], receiptDigests: {}, exposures: {}, armPresentations: {}, armEvaluations: {} };
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
    if (existsSync(log)) for await (const row of streamRows(log)) {
      if (!state.completed.includes(row.id)) continue;
      assert.equal(receiptDigest(row), state.receiptDigests[row.id], 'Acknowledged receipt digest mismatch');
      assert.ok(!copied.has(row.id), 'Duplicate acknowledged receipt'); copied.add(row.id);
      await appendImmutableJsonl(join(outputDir, c + '.jsonl'), row, protocol.budgets.maxLogEntries);
    }
    assert.equal(copied.size, expected.length, 'Missing acknowledged receipt on resume');
  }
  const checkpoint = () => {
    // ponytail: omit snapshots before cloning metadata, so arrays are never duplicated by this clone.
    const { adapterStates: ignored, ...metadata } = state;
    return publishCheckpoint(outputDir, sequence++, { identity,
      registeredState: { physiological: 'adapterStates.*.physiological', neuralTransient: 'adapterStates.*.neuralTransient',
        eligibility: 'adapterStates.*.eligibility', randomization: state.randomization },
      pendingReceipt: state.pendingReceipt, coordinatorState: metadata,
      adapterStates: Object.fromEntries(CONDITIONS.map(c => [c, adapters[c].snapshot()])) });
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
        postReadoutPresentations: teaching ? afterRanking.presentations : 0 };
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

` + source.slice(end);
writeFileSync(path, source);

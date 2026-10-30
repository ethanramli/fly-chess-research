// Preflight-only entry point for the proposed mechanism assay.
// A graph runner is deliberately unavailable until signal/anatomy and receiver
// integration prerequisites have independently passed review.
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { streamRows } from '../../src/runtime/storage.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { CONDITIONS, planDeliveries, assertMatchedExposure, validateIdentity, protocolDigest,
  runResumableAssay, makeProcessResourceGuard, makeCpuDutyPacer, loadLastCheckpoint } from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const protocolPath = 'research/data/bidirectional-plasticity-assay-v3/protocol.json';
const protocol = JSON.parse(readFileSync(protocolPath, 'utf8'));
const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const { values: args } = isEntrypoint
  ? parseArgs({ options: { preflight: { type: 'boolean' }, run: { type: 'boolean' },
    'anatomy-report': { type: 'string' }, adapter: { type: 'string' }, out: { type: 'string' }, resume: { type: 'string' } } })
  : { values: {} };

async function fileSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) hash.update(chunk);
  return hash.digest('hex');
}

export function validateProtocol(p) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(JSON.stringify(p.conditions) === JSON.stringify(CONDITIONS), 'condition list mismatch');
  check(Number.isSafeInteger(p.seed), 'seed missing');
  check(p.schedule.every(item => p.experiences.some(event => event.id === item.experienceId)), 'schedule references unknown experience');
  check(p.schedule.length <= p.budgets.maxScheduleEntries, 'schedule exceeds bound');
  check(p.budgets?.maxLegalMoves > 0 && p.budgets.maxLegalMoves <= 256 && p.budgets.maxStoredNodes === 0,
    'position/node bounds missing');
  check(Number.isSafeInteger(p.budgets?.maxPresentations) && p.budgets.maxPresentations > 0
    && Number.isSafeInteger(p.budgets?.maxEvaluations) && p.budgets.maxEvaluations > 0
    && Number.isSafeInteger(p.budgets?.maxEvaluationsPerAssessment) && p.budgets.maxEvaluationsPerAssessment > 0
    && p.budgets.maxEvaluationsPerAssessment <= p.budgets.maxEvaluations
    && p.budgets.maxLogEntries > 0 && p.budgets.maxLogEntries <= 1024, 'bounded work/log budgets missing');
  check(p.runtime?.heapMiB === 256 && p.runtime?.cpuDuty === 0.5
    && p.runtime?.rssMiB === 768 && p.runtime?.freeMiB === 256, 'runtime limits mismatch');
  check(process.version === p.runtime?.nodeVersion, 'Node runtime version mismatch');
  check(p.search?.maxNodes === 0 && p.search?.maxEvaluations === 0 && p.search?.deadlineMs === 0,
    'development protocol must keep external search disabled');
  check(/^[a-f0-9]{64}$/.test(p.identity?.protocol ?? ''), 'identity protocol hash is unresolved');
  check(p.identity?.protocol === protocolDigest(p), 'protocol canonical hash mismatch');
  check(!JSON.stringify(p.identity ?? {}).includes('PLACEHOLDER'),
    'identity contains unresolved values');
  check(p.identity?.splits?.train?.length > 0 && p.identity?.splits?.validation?.length > 0
    && p.identity?.splits?.final?.length > 0, 'train/validation/final families missing');
  if (p.identity) try { validateIdentity(p.identity); } catch (error) { errors.push(error.message); }
  if (Array.isArray(p.experiences)) {
    for (const [i, event] of p.experiences.entries()) {
      check(typeof event.id === 'string' && typeof event.fen === 'string' && typeof event.pgn === 'string', `experience ${i}: missing exact context`);
      check(event.task?.objective === 'capture-retention' && event.task?.plies === 1, `experience ${i}: unsupported criterion`);
      check(event.status === 'success' || event.status === 'failure' || event.status === 'unknown', `experience ${i}: invalid status`);
      check(event.status === 'unknown' || /^[a-f0-9]{64}$/.test(event.certificateSha256), `experience ${i}: missing certificate hash`);
      check(event.expectedChannel === (event.status === 'success' ? 'PAM02' : event.status === 'failure' ? 'PPL103' : null), `experience ${i}: channel/status mismatch`);
    }
  }
  const byId = new Map(p.experiences.map(event => [event.id, event]));
  const slotIds = new Set();
  for (const slot of p.schedule) {
    const event = byId.get(slot.experienceId);
    check(event && slot.id && !slotIds.has(slot.id), `schedule slot ${slot.id}: missing event or duplicate slot identity`);
    slotIds.add(slot.id);
    if (event) {
      check(event.status !== 'unknown', `schedule slot ${slot.id}: unknown evidence cannot teach`);
      check(!slot.probe || slot.phase === 'retention-probe', `schedule slot ${slot.id}: probes must be retention-only`);
      check(event.expectedChannel === slot.expectedChannel, `schedule slot ${slot.id}: channel does not match verified criterion`);
      check(Number.isSafeInteger(slot.delaySteps) && slot.delaySteps >= 0 && slot.delaySteps <= 64,
        `schedule slot ${slot.id}: invalid bounded delay`);
    }
  }
  check(Array.isArray(p.pinnedFiles) && p.pinnedFiles.length >= 8, 'pinned source/input hashes missing');
  for (const ref of p.pinnedFiles ?? []) check(typeof ref.path === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256),
    `invalid pinned file identity: ${ref.path}`);
  if (p.schedule?.length) {
    if (!p.schedule.some(item => item.phase === 'reversal-forward') || !p.schedule.some(item => item.phase === 'reversal-back'))
      errors.push('two-direction certified reversal schedule missing');
    const plans = Object.fromEntries(CONDITIONS.map(condition => [condition, planDeliveries(p.schedule, condition, p.seed)]));
    try { assertMatchedExposure(p.schedule, plans); } catch (error) { errors.push(error.message); }
    if (!plans.shuffled.identifiable) errors.push('seed produces a non-identifiable shuffled control');
  }
  return { passed: errors.length === 0, errors };
}

export function validateMappingFile(path = 'research/reports/reversal-candidate-2026-10-05/mapping.json') {
  const doc = JSON.parse(readFileSync(path, 'utf8')), groups = doc.mapping?.groups;
  if (!Array.isArray(groups) || groups.length !== 4) throw new Error('Expected four pinned plastic-edge groups');
  const pairs = groups.map(group => `${group.side}:${group.danType}:${group.mbonType}`).sort();
  const expected = ['left:PAM02:MBON01', 'left:PPL103:MBON12', 'right:PAM02:MBON01', 'right:PPL103:MBON12'].sort();
  if (JSON.stringify(pairs) !== JSON.stringify(expected)) throw new Error('Unexpected neuron/group identity mapping');
  for (const group of groups) {
    if (!group.dan?.length || !group.edges?.length || new Set(group.edges).size !== group.edges.length
      || group.dan.some(cell => !/^\d+$/.test(cell.rootId) || cell.type !== group.danType || cell.side !== group.side))
      throw new Error(`Invalid mapped identities/edges for ${group.side} ${group.danType}`);
  }
  const totals = Object.fromEntries(['PPL103', 'PAM02'].map(type => [type,
    groups.filter(group => group.danType === type).reduce((sum, group) => sum + group.edges.length, 0)]));
  if (totals.PPL103 !== 786 || totals.PAM02 !== 84) throw new Error('Pinned plastic-edge counts differ from registered mapping');
  return { passed: true, sha256: doc.mappingHash ?? null, totals, identities: pairs };
}

async function sourcePanelById(id) {
  for await (const panel of streamRows('research/data/capture-retention-transfer-v2/train.jsonl'))
    if (panel.id === id) return panel;
  return null;
}

export async function verifyOneExperience(event) {
    const board = new Chess(event.fen);
    if (event.pgn) board.loadPgn(event.pgn);
    if (board.fen() !== event.fen || board.pgn() !== event.pgn) throw new Error(`History mismatch for ${event.id}`);
    const sourcePanel = event.status === 'unknown' ? null : await sourcePanelById(event.sourcePanelId);
    const candidate = sourcePanel?.candidates?.find(row => row.move === event.action);
    if (event.status !== 'unknown') {
      const mismatch = [!sourcePanel && 'panel-id', sourcePanel && sourcePanel.fen !== event.fen && 'fen',
        sourcePanel && sourcePanel.pgn !== event.pgn && 'pgn', sourcePanel && JSON.stringify(sourcePanel.task) !== JSON.stringify(event.task) && 'task',
        !candidate && 'action', candidate && candidate.proof.certificateSha256 !== event.certificateSha256 && 'certificate-hash'].filter(Boolean);
      if (mismatch.length) throw new Error(`Pinned training fixture ${event.id} mismatch: ${mismatch.join(', ')}`);
    }
    const proof = event.status === 'unknown' ? { status: 'unknown', certificate: null, certificateSha256: null }
      : candidate.proof;
    const checked = verifiedExperience(board, event.action, event.task, proof);
    if (event.status === 'unknown') {
      if (checked.learningAllowed) throw new Error(`Unknown event ${event.id} became teachable`);
    } else if (checked.status !== event.status || checked.certificateSha256 !== event.certificateSha256) {
      throw new Error(`Experience ${event.id} does not match pinned certificate`);
    }
    return { id: event.id, status: checked.status, learningAllowed: checked.learningAllowed,
      move: event.action, certificateSha256: checked.certificateSha256 ?? null,
      meaning: checked.meaning ?? null, verifiedScope: checked.meaning ?? null };
}

export async function verifyExperiences(p) {
  const results = [];
  for (const event of p.experiences) results.push(await verifyOneExperience(event));
  return results;
}

export async function completePreflight(p, anatomyPath, resumePath = null) {
  const protocolCheck = validateProtocol(p);
  const evidence = await verifyExperiences(p);
  let mapping;
  try { mapping = validateMappingFile(); } catch (error) { mapping = { passed: false, error: error.message }; }
  const anatomy = anatomyPath && existsSync(anatomyPath)
    ? JSON.parse(readFileSync(anatomyPath, 'utf8')) : null;
  const anatomyHash = anatomyPath && existsSync(anatomyPath) ? await fileSha256(anatomyPath) : null;
  const anatomyMatches = anatomyHash === p.feasibilityReport?.sha256
    && anatomy?.identities?.graph === p.identity.graph;
  const pinnedFiles = [];
  for (const ref of p.pinnedFiles ?? []) {
    const actual = existsSync(ref.path) ? await fileSha256(ref.path) : null;
    pinnedFiles.push({ path: ref.path, expected: ref.sha256, actual, matches: actual === ref.sha256 });
  }
  const resume = resumePath ? (() => {
    try { return { passed: true, sequence: loadLastCheckpoint(resumePath, p.identity).manifest.sequence }; }
    catch (error) { return { passed: false, error: error.message }; }
  })() : null;
  const passed = protocolCheck.passed && evidence.every((item, i) => item.status === p.experiences[i].status)
    && mapping.passed && pinnedFiles.length === p.pinnedFiles.length && pinnedFiles.every(item => item.matches)
    && anatomy?.gate === 'passed' && anatomyMatches && (!resume || resume.passed);
  return { passed, protocol: protocolCheck, mapping, evidence, pinnedFiles, resume,
    feasibilityGate: anatomy?.gate ?? 'missing', feasibilityHashMatches: anatomyMatches,
    scope: 'Protocol, fixture certificate, resource and identity checks only; no neural simulation' };
}

if (isEntrypoint && args.preflight) {
  const result = await completePreflight(protocol, args['anatomy-report'], args.resume);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
} else if (isEntrypoint && args.run) {
  const check = await completePreflight(protocol, args['anatomy-report'], args.resume);
  if (!check.passed || !args.adapter || !args.out) {
    console.error(JSON.stringify({ refused: true, preflight: check,
      reason: 'Require complete hashes/certificates/mappings, a reviewed adapter, a fresh output directory, valid resume metadata, and a passing signal/anatomy report. No learning started.' }, null, 2));
    process.exit(2);
  }
  const anatomy = JSON.parse(readFileSync(args['anatomy-report'], 'utf8'));
  if (anatomy.gate !== 'passed' || anatomy.identities?.graph !== protocol.identity.graph
    || await fileSha256(resolve(args.adapter)) !== protocol.identity.algorithms.assayAdapter) {
    console.error('REFUSED: anatomy identity or adapter source hash mismatch. Not run.'); process.exit(2);
  }
  const adapterModule = await import(pathToFileURL(resolve(args.adapter)).href);
  const adapters = await adapterModule.createAdapters(protocol);
  const schedule = protocol.schedule;
  const experiences = protocol.experiences;
  const identity = { ...protocol.identity, protocol: protocol.identity.protocol };
  const guard = makeProcessResourceGuard({ rssMiB: protocol.runtime.rssMiB, freeMiB: protocol.runtime.freeMiB });
  const pace = makeCpuDutyPacer(protocol.runtime.cpuDuty, guard);
  const result = await runResumableAssay({ protocol, identity, schedule, experiences, adapters,
    outputDir: args.out, resumeFrom: args.resume, verify: verifyOneExperience,
    guard, pace, maxEvents: protocol.budgets.maxScheduleEntries });
  console.log(JSON.stringify({ complete: result.complete, scope: 'Engineering execution record only; gates require independent audit' }));
} else if (isEntrypoint) {
  console.error('REFUSED: this entry point is preflight-only; no reviewed graph adapter, signal/anatomy pass, or resumable assay execution path exists. Not run.');
  process.exit(2);
}

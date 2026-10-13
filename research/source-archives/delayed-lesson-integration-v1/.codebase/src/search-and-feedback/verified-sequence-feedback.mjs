import { Chess } from 'chess.js';
import { verifiedConsequenceClips } from './verified-consequence-clips.mjs';

// Turn a verified avoidable miss into a fixed-budget set of immediate replays
// for the failed choice, its successful alternative, and earlier line choices.
// No neural state is changed here; each event remains independently checked.
export function createVerifiedSequenceReplaySchedule(plan, {
  maxClipsPerBranch = 4, maxCertificateNodes = 4096, maxTotalExperiences = 4,
} = {}) {
  if (plan?.schema !== 'puzzle-experience-plan-v1' || !Array.isArray(plan.experiences)
    || !Number.isSafeInteger(maxClipsPerBranch) || maxClipsPerBranch < 1 || maxClipsPerBranch > 4
    || !Number.isSafeInteger(maxCertificateNodes) || maxCertificateNodes < 1 || maxCertificateNodes > 4096
    || !Number.isSafeInteger(maxTotalExperiences) || maxTotalExperiences < 2 || maxTotalExperiences > 16)
    throw Error('Invalid verified sequence feedback plan or bounds');
  if (plan.experiences.length > maxTotalExperiences) throw Error('Root review exceeds the declared replay budget');
  const task = { objective: plan.task?.objective, plies: plan.task?.plies };
  const board = new Chess();
  if (typeof plan.task?.pgn !== 'string' || plan.task.pgn.length > 65536) throw Error('Missing bounded task history');
  board.loadPgn(plan.task.pgn);
  if (board.fen() !== plan.task.fen || board.isGameOver()) throw Error('Task position/history mismatch');
  const chosen = plan.consequence?.chosen;
  const committed = plan.experiences.find(event => event.move === chosen && event.role === 'committed-choice');
  const alternative = plan.experiences.find(event => event.move !== chosen
    && event.role === 'teacher-counterfactual' && event.status === 'success' && event.learningAllowed === true);
  if (plan.consequence?.outcome?.avoidableMiss !== true || committed?.status !== 'failure'
    || committed.learningAllowed !== true || !alternative)
    return { ...plan, sequenceFeedback: { applied: false,
      reason: 'No independently verified avoidable miss with a successful alternative',
      additionalExperiences: 0, totalExperiences: plan.experiences.length,
      scope: 'No sequence replay inferred from search estimates or unknown consequences' } };

  const branches = [committed, alternative], extrasByOutcome = { failure: [], success: [] }, byContext = new Map();
  for (const rootEvent of branches) {
    const context = rootEvent.context;
    if (context?.fen !== plan.task.fen || context?.pgn !== plan.task.pgn
      || context?.task?.objective !== task.objective || context?.task?.plies !== task.plies)
      throw Error('Root experience does not match the reviewed task');
    const lesson = verifiedConsequenceClips(board, rootEvent.move, task, rootEvent.proof,
      { maxClips: maxClipsPerBranch, maxCertificateNodes });
    if (lesson.status !== rootEvent.status || lesson.status === 'unknown')
      throw Error('Sequence source consequence changed during independent replay');
    // Clip zero is the original root experience already present in the plan.
    for (let index = 1; index < lesson.clips.length; index++) {
      const clip = lesson.clips[index];
      const identity = [clip.context.fen, clip.move, clip.context.task.plies, clip.status].join('|');
      if (byContext.has(identity)) {
        const existing = byContext.get(identity);
        if (!existing.sequenceFeedback.sourceRootMoves.includes(rootEvent.move))
          existing.sequenceFeedback.sourceRootMoves.push(rootEvent.move);
        continue;
      }
      const experience = { ...clip, role: 'verified-sequence-replay', sequenceFeedback: {
        sourceRootMoves: [rootEvent.move], sourceRootOutcome: rootEvent.status,
        illustrativeBranch: true, precedingMoves: clip.provenance.precedingMoves,
        consequenceCertificateSha256: clip.certificateSha256,
        meaning: 'Re-present this earlier attacker board/action with its independently checked remaining-horizon consequence; no delayed neural trace is claimed' } };
      byContext.set(identity, experience); extrasByOutcome[experience.status].push(experience);
    }
  }

  const slots = maxTotalExperiences - 2, selected = [];
  // Reserve one slot for an earlier failure and one for an earlier success
  // when both are available, keeping the event budget matched to root-only.
  for (const outcome of ['failure', 'success']) {
    if (selected.length >= slots) break;
    const event = extrasByOutcome[outcome][0];
    if (event) selected.push(event);
  }
  const available = [...extrasByOutcome.failure, ...extrasByOutcome.success];
  for (const event of available) {
    if (selected.length >= slots) break;
    if (!selected.includes(event)) selected.push(event);
  }

  const retainedRoots = [committed, alternative];
  for (const event of plan.experiences) {
    if (retainedRoots.length + selected.length >= maxTotalExperiences) break;
    if (event !== committed && event !== alternative) retainedRoots.push(event);
  }
  const retainedSet = new Set(retainedRoots);
  const omittedRootExperiences = plan.experiences.filter(event => !retainedSet.has(event))
    .map(event => ({ move: event.move, status: event.status, certificateSha256: event.certificateSha256,
      reason: 'Substituted by a verified earlier-choice replay under the fixed experience budget' }));
  const scheduled = [...retainedRoots, ...selected];
  return { ...plan, experiences: scheduled, sequenceFeedback: {
    applied: selected.length > 0,
    reason: selected.length ? 'Verified avoidable miss and successful alternative'
      : 'No later attacker decision on the bounded illustrative branches',
    sourceRootMoves: branches.map(event => ({ move: event.move, status: event.status,
      certificateSha256: event.certificateSha256 })),
    rootExperienceCount: retainedRoots.length, additionalExperiences: selected.length,
    totalExperiences: scheduled.length, experienceBudget: maxTotalExperiences,
    omittedRootExperiences, unselectedSequenceClips: available.length - selected.length,
    maxClipsPerBranch, maxCertificateNodes, truncated: available.length > selected.length,
    scope: 'Explicit teacher replay of individually checked earlier attacker contexts; not search-time neural eligibility, biological long-delay credit, or proof that every branch move was necessary' } };
}

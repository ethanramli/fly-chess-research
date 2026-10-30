import { reviewCommittedChoice } from './adaptive-choice-review.mjs';

// Teacher-only review after the policy has committed. The policy receives none
// of these labels before choice. This packages verified action consequences;
// it does not calculate a neural update or assign delayed credit.
export function reviewCommittedContrast(board, chosenMove, alternativeMoves, task, options = {}) {
  const maxAlternatives = options.maxAlternatives ?? 8;
  if (!Array.isArray(alternativeMoves) || alternativeMoves.length < 1
    || alternativeMoves.length > maxAlternatives || !Number.isSafeInteger(maxAlternatives)
    || maxAlternatives < 1 || maxAlternatives > 16
    || new Set(alternativeMoves).size !== alternativeMoves.length
    || alternativeMoves.includes(chosenMove)) throw Error('Require a bounded set of distinct counterfactual actions');

  const reviewOptions = { maxNodes: options.maxNodes, milliseconds: options.milliseconds };
  const choice = reviewCommittedChoice(board, chosenMove, task, reviewOptions);
  const alternatives = alternativeMoves.map(move => ({
    ...reviewCommittedChoice(board, move, task, reviewOptions), role: 'teacher-counterfactual',
  }));
  const successfulAlternative = alternatives.find(event => event.status === 'success') ?? null;
  const contrasted = choice.status === 'failure' && successfulAlternative !== null;
  const experiences = [choice, ...alternatives]
    .filter(event => event.learningAllowed)
    .map(event => ({ ...event, role: event === choice ? 'committed-choice' : 'teacher-counterfactual' }));

  return {
    schema: 'verified-choice-contrast-v1',
    task: { fen: board.fen(), pgn: board.pgn(), actor: board.turn(),
      objective: task.objective, plies: task.plies },
    choice,
    alternatives,
    contrast: contrasted ? {
      status: 'verified-failure-versus-success',
      failureMove: choice.move,
      successfulAlternative: successfulAlternative.move,
      scope: 'The chosen move fails and the reviewed alternative satisfies only the declared bounded objective.',
    } : { status: 'incomplete', reason: choice.status === 'unknown'
      ? 'Committed-choice consequence is unknown'
      : choice.status === 'success' ? 'Committed choice already satisfies the bounded objective'
        : 'No reviewed alternative has a verified success' },
    experiences,
    delivery: 'Post-commitment verified board/action replays; receiver must recheck certificates; no neural delta or delayed credit is supplied.',
  };
}

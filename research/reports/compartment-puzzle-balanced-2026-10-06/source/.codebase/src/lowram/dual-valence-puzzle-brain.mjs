import { Chess } from 'chess.js';
import { MappedPuzzleBrain } from './mapped-puzzle-brain.mjs';
import { createDualValenceInterface } from './dual-valence-interface.mjs';
import { verifiedExperience } from './verified-feedback.mjs';

// Separate experimental adapter; preserve the frozen punishment-only pipeline.
// Biological evidence/approximations: positive_feedback_channel_hypothesis.md.
export class DualValencePuzzleBrain extends MappedPuzzleBrain {
  constructor(options) {
    super(options);
    this.reinforcement = createDualValenceInterface(this.mapping, this.current);
  }
  async replay(experience, {
    channel = experience.status === 'success' ? 'PAM02' : experience.status === 'failure' ? 'PPL103' : null,
    plasticityEnabled = true,
  } = {}) {
    if (experience.status === 'unknown') {
      if (experience.learningAllowed !== false || experience.experimentalPulse !== null || channel !== null)
        throw Error('Unknown consequence cannot supply a teaching channel');
      return { skipped: true, appliedToNeurons: false, learningApplied: false };
    }
    if (experience.learningAllowed !== true || ![null, 'PAM02', 'PPL103'].includes(channel)
      || typeof plasticityEnabled !== 'boolean') throw Error('Invalid experimental channel');
    const context = experience.context;
    if (typeof context?.pgn !== 'string' || context.pgn.length > 65536) throw Error('Missing bounded replay history');
    const board = new Chess(); board.loadPgn(context.pgn);
    if (board.fen() !== context.fen || board.history().length > 512) throw Error('Replay context mismatch');
    const verified = verifiedExperience(board, experience.move, context.task, experience.proof);
    if (!verified.learningAllowed || verified.status !== experience.status
      || verified.actor !== experience.actor || verified.certificateSha256 !== experience.certificateSha256)
      throw Error('Replay consequence does not match checked context');
    const cue = this.encoder.encode(board, experience.move, context.task);
    const presentation = this.reinforcement.present(cue.stimulation, channel);
    const before = this.memory.snapshot(), response = await this.evoke(presentation.stimulation);
    const h = this.model.h[this.model.steps], scale = this.memory.config.activityScale;
    const kc = this.mapping.groups.flatMap(g => g.kc.map(i => Math.max(0, h[i] - this.rest[i]) / scale));
    const dan = this.mapping.groups.map(g => g.dan.map(c => Math.max(0, h[c.index] - this.rest[c.index]) / scale));
    const update = plasticityEnabled ? this.memory.observe(this.rest)
      : { events: this.memory.events, changedEdges: 0, factors: [] };
    const after = this.memory.snapshot();
    return { event: { ...verified, delivered: channel !== null, channel }, context, cue, presentation,
      response, before, after, local: { kc, dan, factors: update.factors }, update,
      appliedToNeurons: true, plasticityEnabled, learningApplied: update.changedEdges > 0,
      scope: 'Checked board/action replay with identified two-valence experimental stimulation; no natural reward reconstruction or delayed eligibility' };
  }
}

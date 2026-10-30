import { Chess } from 'chess.js';
import { digest } from '../neural-learning/mushroom-body.mjs';
import { readMBON } from '../neural-learning/mbon-readout.mjs';
import { verifiedExperience } from '../search-and-feedback/verified-feedback.mjs';
import {checkCaptureRetentionAction} from '../search-and-feedback/capture-retention-action-domain.mjs';
import { uci } from '../search-and-feedback/experimental-puzzle-search.mjs';

// Adapter around the existing mapped local learner, not a new learning rule.
// Caller verifies graph/annotation/readout identities and checkpoints receipts.
export class MappedPuzzleBrain {
  constructor({ model, memory, mapping, encoder, readouts, rest,
    maxPresentations = 1024, maxLegalMoves = 64, priorScale = 4,
    current = 1.5, guard = () => {}, pace = async () => {} }) {
    if (memory.model !== model || memory.mapping !== mapping || rest.length !== model.n
      || !Number.isSafeInteger(maxPresentations) || maxPresentations < 1
      || !Number.isSafeInteger(maxLegalMoves) || maxLegalMoves < 1 || maxLegalMoves > 256
      || !Number.isFinite(priorScale) || priorScale <= 0
      || !Number.isFinite(current) || current <= 0) throw Error('Invalid mapped policy adapter');
    Object.assign(this, { model, memory, mapping, encoder, readouts, rest,
      maxPresentations, maxLegalMoves, priorScale, current, guard, pace });
    this.presentations = 0;
  }
  memoryFingerprint() { return digest(this.memory.snapshot()); }
  assertMemoryChannels(requiredDanTypes = []) {
    if (typeof this.memory.observeTrajectory !== 'function') return;
    const mapped = new Set(this.memory.mapping.groups.map(group => group.danType));
    if (requiredDanTypes.some(type => !mapped.has(type)))
      throw Error('Trajectory memory does not map the required teaching channel');
  }
  observeMemory(requiredDanTypes = []) {
    // The curriculum's RateTimingMemory consumes the complete neural frame
    // trajectory; older endpoint memories keep their existing observe API.
    if (typeof this.memory.observeTrajectory !== 'function') return this.memory.observe(this.rest);
    this.assertMemoryChannels(requiredDanTypes);
    return this.memory.observeTrajectory({ plasticityEnabled: true });
  }
  verifyExperience(board, move, task, proof) {
    if (task?.objective !== 'capture-retention') return verifiedExperience(board, move, task, proof);
    const checked = checkCaptureRetentionAction(board, move, task, proof);
    return { move, actor: checked.actor ?? board.turn(), status: checked.status,
      experimentalPulse: checked.status === 'unknown' ? null : checked.experimentalPulse,
      learningAllowed: checked.learningAllowed, certificateSha256: checked.certificateSha256,
      ...(checked.meaning === undefined ? {} : { meaning: checked.meaning }) };
  }
  async evoke(stimulation, episode = null, frameIdentity = null) {
    this.guard();
    if (this.presentations >= this.maxPresentations) throw Error('Neural presentation budget exhausted');
    const started = performance.now();
    if (episode === null) this.model.forward([0], stimulation);
    else episode.present([0], stimulation, frameIdentity);
    this.presentations++;
    const response = readMBON(Object.fromEntries(Object.entries(this.readouts).map(([type, cells]) =>
      [type, cells.map(c => this.model.h[this.model.steps][c.index])])));
    await this.pace(performance.now() - started); this.guard();
    return response;
  }
  async assess(board, moves, task) {
    if (!moves.length || moves.length > this.maxLegalMoves) throw Error('Legal candidate bound');
    const history = board.pgn(), frozen = this.memoryFingerprint(), rows = [];
    for (const move of moves) {
      const cue = this.encoder.encode(board, uci(move), task);
      const response = await this.evoke(cue.stimulation);
      rows.push({ move: uci(move), ...response });
    }
    if (this.memoryFingerprint() !== frozen || board.pgn() !== history)
      throw Error('Assessment changed task or lasting memory');
    const highest = Math.max(...rows.map(row => row.score));
    const tiedTopMoves = rows.filter(row => row.score === highest).map(row => row.move).sort();
    return { rows, choice: tiedTopMoves.length === 1 ? tiedTopMoves[0] : null,
      tiedTopMoves, memoryFingerprint: frozen };
  }
  async evaluate(board, moves, task) {
    const assessment = await this.assess(board, moves, task);
    const highest = Math.max(...assessment.rows.map(r => r.score));
    const weights = assessment.rows.map(r => Math.exp(this.priorScale * (r.score - highest)));
    const total = weights.reduce((a, b) => a + b, 0);
    // The existing memory readout supplies candidate preferences only. Zero is
    // an explicit neutral leaf heuristic, not a learned strategic evaluation.
    return { priors: weights.map(w => w / total), value: 0 };
  }
  async replay(experience, { pulse = experience.experimentalPulse, plasticityEnabled = true } = {}) {
    if (experience.status === 'unknown') {
      if (experience.learningAllowed !== false || experience.experimentalPulse !== null || pulse !== null)
        throw Error('Unknown consequence cannot supply a teaching pulse');
      return { skipped: true, appliedToNeurons: false, learningApplied: false };
    }
    if (experience.learningAllowed !== true || typeof pulse !== 'boolean'
      || typeof plasticityEnabled !== 'boolean') throw Error('Invalid control interface');
    const context = experience.context;
    if (typeof context?.pgn !== 'string' || context.pgn.length > 65536) throw Error('Missing bounded replay history');
    const board = new Chess(); board.loadPgn(context.pgn);
    if (board.fen() !== context.fen || board.history().length > 512) throw Error('Replay context mismatch');
    const verified = this.verifyExperience(board, experience.move, context.task, experience.proof);
    if (!verified.learningAllowed || verified.status !== experience.status
      || verified.actor !== experience.actor || verified.certificateSha256 !== experience.certificateSha256)
      throw Error('Replay consequence does not match checked context');
    const cue = this.encoder.encode(board, experience.move, context.task);
    const stimulation = cue.stimulation.map(cell => ({ ...cell }));
    if (pulse) for (const group of this.mapping.groups.filter(g => g.danType === 'PPL103'))
      for (const cell of group.dan) stimulation.push({ index: cell.index, current: this.current });
    if (pulse && !this.mapping.groups.some(g => g.danType === 'PPL103' && g.dan.length))
      throw Error('Missing identified experimental reinforcement cells');
    const before = this.memory.snapshot(), response = await this.evoke(stimulation);
    const h = this.model.h[this.model.steps], scale = this.memory.config.activityScale;
    const kc = this.mapping.groups.flatMap(g => g.kc.map(i => Math.max(0, h[i] - this.rest[i]) / scale));
    const update = plasticityEnabled ? this.observeMemory(pulse ? ['PPL103'] : [])
      : { events: this.memory.events, changedEdges: 0, factors: [] };
    const after = this.memory.snapshot();
    return { event: { ...verified, delivered: pulse }, context, cue, response, before, after,
      local: { kc, factors: update.factors }, update, appliedToNeurons: true,
      plasticityEnabled, learningApplied: update.changedEdges > 0,
      scope: 'Verified board/action replay with existing mapped rule; explicit sensory/reinforcement stimulation, no delayed search eligibility' };
  }
}

// Coupled receiver v4 (2026-10-25): coupled-stockfish-brain-v3 with the alpha1
// reward store (alpha-one-memory.mjs). Two changes only:
// 1. A verified task-success pulse (task phase, PAM02 channel) also stimulates the
//    identified PAM11 (PAM-alpha1) cells at the same current; Stockfish value
//    pulses never do. Each pulse receipt records the added cells.
// 2. Readout = mean(MBON12) - mean(MBON01) - mean(MBON07).
// Shuffled, absent and disabled controls inherit this unchanged: the alpha1 cells
// follow the delivered task channel, and disabled plasticity updates nothing.
import { CoupledStockfishBrainV3 } from './coupled-stockfish-brain-v3.mjs';
import { readAlphaOneMBON } from '../neural-learning/alpha-one-memory.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';

export class CoupledStockfishBrainV4 extends CoupledStockfishBrainV3 {
  constructor(options, valueOptions) {
    super(options, valueOptions);
    const groups = type => this.mapping.groups.filter(g => g.danType === type).flatMap(g => g.dan.map(c => c.index));
    this.pam02 = new Set(groups('PAM02'));
    this.pam11 = groups('PAM11');
    if (!this.pam11.length || this.pam11.some(i => this.pam02.has(i))) throw Error('Require identified PAM-alpha1 cells');
    if (!Array.isArray(this.readouts.MBON07) || !this.readouts.MBON07.length) throw Error('Require MBON-alpha1 readout');
    this.rewardPhase = null; this.alphaOneDelivery = null;
    this.coupledIdentity = digest({ schema: 'verified-outcome-plus-stockfish-v4-alpha-one', v3: this.coupledIdentity, pam11: this.pam11 });
  }
  async replayCoupledFrame(review, prepared, options) {
    this.rewardPhase = options?.phase ?? null; this.alphaOneDelivery = null;
    try {
      const pulse = await super.replayCoupledFrame(review, prepared, options);
      return { ...pulse, alphaOneReward: this.alphaOneDelivery };
    } finally { this.rewardPhase = null; this.alphaOneDelivery = null; }
  }
  async evoke(stimulation, episode = null, frameIdentity = null) {
    if (this.rewardPhase === 'task') {
      const reward = stimulation.find(cell => this.pam02.has(cell.index));
      if (reward) {
        this.alphaOneDelivery = { cells: [...this.pam11], current: reward.current };
        stimulation = [...stimulation, ...this.pam11.map(index => ({ index, current: reward.current }))];
      }
    }
    this.guard();
    if (this.presentations >= this.maxPresentations) throw Error('Neural presentation budget exhausted');
    const started = performance.now();
    if (episode === null) this.model.forward([0], stimulation);
    else episode.present([0], stimulation, frameIdentity);
    this.presentations++;
    const response = readAlphaOneMBON(Object.fromEntries(Object.entries(this.readouts).map(([type, cells]) =>
      [type, cells.map(c => this.model.h[this.model.steps][c.index])])));
    await this.pace(performance.now() - started); this.guard();
    return response;
  }
}

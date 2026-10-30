// Coupled receiver v5 (2026-10-26): coupled-stockfish-brain-v4 (alpha1 reward
// store; pinned by r10 runs) plus the aversive alpha3 store (alpha-lobe-memory.mjs):
// 1. A verified task-success pulse (task phase, PAM02 channel) also stimulates the
//    identified PAM11 (PAM-alpha1) cells, and a verified task-failure pulse (task
//    phase, PPL103 channel) also stimulates the identified PPL106 (PPL1-alpha3)
//    cells, each at the pulse's current; Stockfish value pulses never do. Each pulse
//    receipt records the added cells.
// 2. Readout = mean(MBON12) - mean(MBON01) - mean(MBON07) + mean(MBON14).
// Shuffled, absent and disabled controls inherit this unchanged: the alpha-lobe
// cells follow the delivered task channel, and disabled plasticity updates nothing.
import { CoupledStockfishBrainV3 } from './coupled-stockfish-brain-v3.mjs';
import { readAlphaLobeMBON } from '../neural-learning/alpha-lobe-memory.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';

export class CoupledStockfishBrainV5 extends CoupledStockfishBrainV3 {
  constructor(options, valueOptions) {
    super(options, valueOptions);
    const groups = type => this.mapping.groups.filter(g => g.danType === type).flatMap(g => g.dan.map(c => c.index));
    this.pam02 = new Set(groups('PAM02')); this.ppl103 = new Set(groups('PPL103'));
    this.pam11 = groups('PAM11'); this.ppl106 = groups('PPL106');
    const task = new Set([...this.pam02, ...this.ppl103]);
    if (!this.pam11.length || !this.ppl106.length || [...this.pam11, ...this.ppl106].some(i => task.has(i)) || this.pam11.some(i => this.ppl106.includes(i)))
      throw Error('Require identified PAM-alpha1 and PPL1-alpha3 cells');
    for (const type of ['MBON07', 'MBON14'])
      if (!Array.isArray(this.readouts[type]) || !this.readouts[type].length) throw Error(`Require ${type} readout`);
    this.rewardPhase = null; this.alphaLobeDelivery = null;
    this.coupledIdentity = digest({ schema: 'verified-outcome-plus-stockfish-v5-alpha-lobe', v3: this.coupledIdentity, pam11: this.pam11, ppl106: this.ppl106 });
  }
  async replayCoupledFrame(review, prepared, options) {
    this.rewardPhase = options?.phase ?? null; this.alphaLobeDelivery = null;
    try {
      const pulse = await super.replayCoupledFrame(review, prepared, options);
      return { ...pulse, alphaLobeTeaching: this.alphaLobeDelivery };
    } finally { this.rewardPhase = null; this.alphaLobeDelivery = null; }
  }
  async evoke(stimulation, episode = null, frameIdentity = null) {
    if (this.rewardPhase === 'task') {
      const reward = stimulation.find(cell => this.pam02.has(cell.index)), punishment = stimulation.find(cell => this.ppl103.has(cell.index));
      const added = [...(reward ? this.pam11.map(index => ({ index, current: reward.current })) : []),
        ...(punishment ? this.ppl106.map(index => ({ index, current: punishment.current })) : [])];
      if (added.length) {
        this.alphaLobeDelivery = { cells: added.map(cell => cell.index), current: (reward ?? punishment).current,
          channels: [...(reward ? ['PAM11'] : []), ...(punishment ? ['PPL106'] : [])] };
        stimulation = [...stimulation, ...added];
      }
    }
    this.guard();
    if (this.presentations >= this.maxPresentations) throw Error('Neural presentation budget exhausted');
    const started = performance.now();
    if (episode === null) this.model.forward([0], stimulation);
    else episode.present([0], stimulation, frameIdentity);
    this.presentations++;
    const response = readAlphaLobeMBON(Object.fromEntries(Object.entries(this.readouts).map(([type, cells]) =>
      [type, cells.map(c => this.model.h[this.model.steps][c.index])])));
    await this.pace(performance.now() - started); this.guard();
    return response;
  }
}

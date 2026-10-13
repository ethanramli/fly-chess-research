// Separate V2 control design. Original dual-valence schedule remains frozen.
import { dualValenceSchedule } from './dual-valence-interface.mjs';

export function balancedValenceSchedule(config, maxAttempts = 128) {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 128
    || ![config.acquisitionTrials ?? 4, config.reversalTrials ?? 12].every(n => n % 4 === 0))
    throw Error('Balanced control requires bounded attempts and four-divisible phases');
  const schedule = dualValenceSchedule(config), diagnostics = [];
  for (const [phaseIndex, phase] of ['acquisition', 'reversal'].entries()) {
    const rows = schedule.filter(t => t.phase === phase);
    if (config.condition !== 'shuffled') { diagnostics.push({ phase, attempts: 0 }); continue; }
    let rng = (config.seed ^ (phaseIndex === 0 ? 0x45c1 : 0x89a3)) >>> 0, delivered, attempts = 0;
    while (++attempts <= maxAttempts) {
      const trial = rows.map(t => t.expectedChannel);
      for (let i = trial.length - 1; i > 0; i--) {
        rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
        const j = Math.floor(rng / 2 ** 32 * (i + 1)); [trial[i], trial[j]] = [trial[j], trial[i]];
      }
      const balanced = ['A', 'B'].every(cue => ['PAM02', 'PPL103'].every(channel =>
        rows.filter((row, i) => row.cue === cue && trial[i] === channel).length === rows.length / 4));
      if (balanced) { delivered = trial; break; }
    }
    if (!delivered) throw Error('Balanced shuffle construction exhausted its declared budget');
    rows.forEach((row, i) => { row.deliveredChannel = delivered[i]; });
    diagnostics.push({ phase, attempts, totalPerChannel: rows.length / 2, perCuePerChannel: rows.length / 4,
      meaning: 'Conditioned Fisher-Yates permutation with equal cue/valence counts; not unconstrained shuffle or biological omission' });
  }
  return { schedule, diagnostics };
}

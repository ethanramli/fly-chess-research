// Fixed experimental stimulation, not natural reward reconstruction.
// Sources and approximations: positive_feedback_channel_hypothesis.md.
import { shuffledFeedback } from './association-validation.mjs';

export function createDualValenceInterface(mapping, current = 1.5) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups)
    || !Number.isFinite(current) || current <= 0 || current > 1.5)
    throw Error('Require identified mapped reinforcement groups and bounded current');
  const populations = Object.fromEntries(['PAM02', 'PPL103'].map(type => {
    const groups = mapping.groups.filter(g => g.danType === type);
    if (groups.length !== 2 || new Set(groups.map(g => g.side)).size !== 2
      || !groups.every(g => ['left', 'right'].includes(g.side) && g.dan.length && g.edges.length))
      throw Error(`Incomplete identified ${type} mapping`);
    const cells = groups.flatMap(g => g.dan.map(c => ({ ...c })));
    if (cells.some(c => !Number.isSafeInteger(c.index) || c.index < 0 || typeof c.rootId !== 'string')
      || new Set(cells.map(c => c.index)).size !== cells.length) throw Error('Invalid reinforcement identities');
    return [type, cells];
  }));
  const allDAN = new Set(Object.values(populations).flat().map(c => c.index));
  if (allDAN.size !== populations.PAM02.length + populations.PPL103.length)
    throw Error('Reinforcement populations overlap');
  const kc = new Set(mapping.groups.flatMap(g => g.kc));
  if ([...kc].some(i => allDAN.has(i))) throw Error('KC and reinforcement identities overlap');
  function present(cue, channel = null) {
    if (![null, 'PAM02', 'PPL103'].includes(channel) || !Array.isArray(cue) || !cue.length
      || cue.length > 128 || new Set(cue.map(c => c.index)).size !== cue.length
      || cue.some(c => !kc.has(c.index) || !Number.isFinite(c.current) || c.current <= 0 || c.current > 1.5))
      throw Error('Invalid bounded cue or experimental channel');
    const cells = channel === null ? [] : populations[channel];
    return { stimulation: [...cue.map(c => ({ ...c })), ...cells.map(c => ({ index: c.index, current }))],
      channel, reinforcementCells: cells.map(c => ({ ...c })), reinforcementCurrent: current,
      interface: 'Direct identified experimental reinforcement stimulation; no teacher-calculated efficacy update' };
  }
  return { populations, present };
}

export function dualValenceSchedule({ seed, initialPunished, acquisitionTrials = 4,
  reversalTrials = 12, condition }) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || !['A', 'B'].includes(initialPunished)
    || !['informative', 'punishment-only', 'absent', 'shuffled', 'disabled'].includes(condition)
    || ![acquisitionTrials, reversalTrials].every(n => Number.isSafeInteger(n) && n >= 2 && n <= 128 && n % 2 === 0))
    throw Error('Invalid frozen association schedule');
  const order = seed % 2 ? ['A', 'B'] : ['B', 'A'];
  return ['acquisition', 'reversal'].flatMap((phase, phaseIndex) => {
    const count = phaseIndex === 0 ? acquisitionTrials : reversalTrials;
    const punished = phaseIndex === 0 ? initialPunished : initialPunished === 'A' ? 'B' : 'A';
    const rows = Array.from({ length: count }, (_, trial) => ({ phase, trial, cue: order[trial % 2], punished }));
    const adverse = rows.map(r => r.cue === punished);
    const shuffled = shuffledFeedback(adverse, (seed ^ (phaseIndex === 0 ? 0x45c1 : 0x89a3)) >>> 0);
    return rows.map((row, i) => {
      const expectedChannel = adverse[i] ? 'PPL103' : 'PAM02';
      const deliveredChannel = condition === 'absent' ? null
        : condition === 'punishment-only' ? (adverse[i] ? 'PPL103' : null)
          : condition === 'shuffled' ? (shuffled[i] ? 'PPL103' : 'PAM02') : expectedChannel;
      return { ...row, expectedChannel, deliveredChannel };
    });
  });
}

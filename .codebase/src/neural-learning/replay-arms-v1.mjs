// Replay arms for stage 1 (documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md, section 7.2).
// Pure schedule transforms. The diary arm's replay log is the input; no graph code is here.
// An event is one replay step the diary arm made after a feedback trial: { block, entry } where entry is
// { block, code, valence } (the diary's chosen old or current lesson) or null (the diary had no earlier lesson).
// An action is { kind: 'replay', code, valence } | { kind: 'filler', valence } | { kind: 'skip' }.
// valence is 'reward', 'punish' or null (no pulse).

export const ARMS = ['diary', 'nooldreplays', 'filler', 'nopulse', 'eventshuffle', 'moved'];

const sameBlock = (event, name) => event.entry && event.entry.block === name;

// blocks: [{ name, events }] in run order. rng: uniform-integer function rng(m) for the shuffle and filler draws.
// Returns { now, afterTest } where now[b] are the actions run during block b, and afterTest[b] run after block b's test snapshot.
export function planArm(arm, blocks, rng) {
  if (!ARMS.includes(arm)) throw Error(`Unknown replay arm ${arm}`);
  const now = blocks.map(() => []), afterTest = blocks.map(() => []);
  blocks.forEach((b, bi) => {
    const old = b.events.filter(e => e.entry && !sameBlock(e, b.name));
    let oldValences = old.map(e => e.entry.valence);
    if (arm === 'eventshuffle') {
      // Permute the pulses of this block's old-lesson replays among themselves; inputs and times stay.
      for (let i = oldValences.length - 1; i > 0; i--) {
        const j = rng(i + 1);
        [oldValences[i], oldValences[j]] = [oldValences[j], oldValences[i]];
      }
    }
    let k = 0;
    for (const e of b.events) {
      const isOld = e.entry && !sameBlock(e, b.name);
      if (!e.entry) { now[bi].push({ kind: 'skip' }); continue; }
      if (!isOld) { now[bi].push({ kind: 'replay', code: e.entry.code, valence: e.entry.valence }); continue; }
      // Old-lesson replays: the arm decides what happens to each one.
      if (arm === 'diary') now[bi].push({ kind: 'replay', code: e.entry.code, valence: e.entry.valence });
      else if (arm === 'nooldreplays') now[bi].push({ kind: 'skip' });
      else if (arm === 'filler') now[bi].push({ kind: 'filler', valence: rng(2) === 0 ? 'reward' : 'punish' });
      else if (arm === 'nopulse') now[bi].push({ kind: 'replay', code: e.entry.code, valence: null });
      else if (arm === 'eventshuffle') now[bi].push({ kind: 'replay', code: e.entry.code, valence: oldValences[k] });
      else if (arm === 'moved') {
        // Moved timing: the replay runs at the end of the previous block, after its test snapshot.
        now[bi].push({ kind: 'skip' });
        if (bi > 0) afterTest[bi - 1].push({ kind: 'replay', code: e.entry.code, valence: e.entry.valence });
      }
      k++;
    }
  });
  return { now, afterTest };
}

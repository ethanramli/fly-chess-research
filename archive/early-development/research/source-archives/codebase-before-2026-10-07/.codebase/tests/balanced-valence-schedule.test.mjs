import test from 'node:test';
import assert from 'node:assert/strict';
import { balancedValenceSchedule } from '../src/lowram/balanced-valence-schedule.mjs';
import { dualValenceSchedule } from '../src/lowram/dual-valence-interface.mjs';

test('V2 shuffled feedback has zero cue-valence imbalance and preserves both population counts', () => {
  // Include V1's two identical acquisition shuffles to verify the control problem is removed by a general rule.
  for (const seed of [15013, 15031, 16001, 16033, 16057, 16087, 16111, 16139]) {
    const config = { seed, initialPunished: 'A', condition: 'shuffled', acquisitionTrials: 4, reversalTrials: 12 };
    const panel = balancedValenceSchedule(config);
    assert.deepEqual(panel, balancedValenceSchedule(config));
    for (const phase of ['acquisition', 'reversal']) {
      const rows = panel.schedule.filter(t => t.phase === phase), targets = rows.map(r => r.expectedChannel);
      assert.notDeepEqual(rows.map(r => r.deliveredChannel), targets);
      for (const cue of ['A', 'B']) for (const channel of ['PAM02', 'PPL103'])
        assert.equal(rows.filter(r => r.cue === cue && r.deliveredChannel === channel).length, rows.length / 4);
      for (const channel of ['PAM02', 'PPL103'])
        assert.equal(rows.filter(r => r.deliveredChannel === channel).length, targets.filter(c => c === channel).length);
      assert.ok(panel.diagnostics.find(d => d.phase === phase).attempts <= 128);
    }
  }
});

test('V2 leaves informative, punishment-only, absent and disabled exposures unchanged', () => {
  for (const condition of ['informative', 'punishment-only', 'absent', 'disabled']) {
    const config = { seed: 16001, initialPunished: 'B', condition };
    assert.deepEqual(balancedValenceSchedule(config).schedule, dualValenceSchedule(config));
  }
  assert.throws(() => balancedValenceSchedule({ seed: 16001, initialPunished: 'A', condition: 'shuffled', acquisitionTrials: 6 }));
  assert.throws(() => balancedValenceSchedule({ seed: 16001, initialPunished: 'A', condition: 'shuffled' }, 0));
});

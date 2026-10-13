import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createRelationalChessCueEncoder as createV2 } from '../../src/chess-input/relational-chess-cue-v2.mjs';
import { createRelationalChessCueEncoder as createV3 } from '../../src/chess-input/relational-chess-cue-v3.mjs';

const mapping = { readyForCandidateExperiment: true, groups: [{ kc: Array.from({ length: 693 }, (_, i) => i + 100) }] };
const config = { seed: 14009, maxCells: 14, totalCurrent: 21, maxCellCurrent: 1.5 };

test('V3 adds the public capture-retention task while preserving forced-mate cue behavior', () => {
  const board = new Chess('6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1');
  const v2 = createV2(mapping, config), v3 = createV3(mapping, config);
  const oldCue = v2.encode(board, 'a1a4'), compatible = v3.encode(board, 'a1a4');
  assert.deepEqual(compatible.tokens, oldCue.tokens);
  assert.deepEqual(compatible.stimulation, oldCue.stimulation);
  const capture = v3.encode(board, 'a1a4', { objective: 'capture-retention', plies: 1 });
  assert.ok(capture.tokens.includes('task:capture-retention:1'));
  assert.ok(!capture.tokens.some(token => /success|failure|safe|unsafe|recapture/.test(token)));
  assert.notDeepEqual(capture.stimulation, oldCue.stimulation);
  assert.throws(() => v3.encode(board, 'a1a4', { objective: 'capture-retention', plies: 3 }), /public task context/);
  assert.throws(() => v3.encode(board, 'a1a4', { objective: 'capture-retention', plies: 1, safe: true }), /public task context/);
});

test('V3 can encode both legal candidate captures without exposing their checked outcome', () => {
  const board = new Chess('1b4k1/8/3P4/4p3/p6r/8/8/RK2R3 w - - 0 1');
  const encoder = createV3(mapping, config), task = { objective: 'capture-retention', plies: 1 };
  const cues = ['a1a4', 'e1e5'].map(move => encoder.encode(board, move, task));
  assert.notDeepEqual(cues[0].stimulation, cues[1].stimulation);
  for (const cue of cues) {
    assert.ok(cue.tokens.includes('task:capture-retention:1'));
    assert.ok(!cue.tokens.some(token => /success|failure|safe|unsafe|recapture/.test(token)));
  }
});

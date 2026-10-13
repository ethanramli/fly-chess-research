import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createBoundRayRelationalCueEncoder } from '../../src/chess-input/bound-ray-relational-cue.mjs';

const mapping = { readyForCandidateExperiment: true,
  groups: [{ kc: Array.from({ length: 693 }, (_, index) => index + 100) }] };
const config = { seed: 14009, maxCells: 14, totalCurrent: 21, maxCellCurrent: 1.5, maxRelationCells: 4 };
const task = { objective: 'capture-retention', plies: 1 };

test('bound-ray cue exposes slider and intervening-piece geometry without an outcome label', () => {
  const blocked = new Chess('2b3k1/3P4/4p3/8/p6r/8/R1P1R3/1K6 w - - 0 1');
  const open = new Chess('2b3k1/8/4p3/8/p6r/8/R1P1R3/1K6 w - - 0 1');
  const before = blocked.pgn(), encoder = createBoundRayRelationalCueEncoder(mapping, config);
  const blockedCue = encoder.encode(blocked, 'e2e6', task), openCue = encoder.encode(open, 'e2e6', task);
  const bishopLine = 'slider-line:r:opponent:b:2,2';
  const bishopContext = 'slider-context:r:opponent:b:2,2:self:p:1,1';
  assert.ok(blockedCue.relation.tokens.includes(bishopLine));
  assert.ok(openCue.relation.tokens.includes(bishopLine));
  assert.ok(blockedCue.relation.tokens.includes(bishopContext));
  assert.ok(!openCue.relation.tokens.includes(bishopContext));
  assert.ok(!blockedCue.tokens.some(token => /success|failure|safe|unsafe|recaptur/i.test(token)));
  assert.equal(blockedCue.stimulation.length, 14);
  assert.equal(blockedCue.accounting.totalCurrent, 21);
  assert.ok(blockedCue.relation.selectedCells > 0);
  assert.equal(blocked.pgn(), before);
});

test('bound-ray cue is deterministic, bounded, and rejects task-answer inputs', () => {
  const board = new Chess('2b3k1/3P4/4p3/8/p6r/8/R1P1R3/1K6 w - - 0 1');
  const encoder = createBoundRayRelationalCueEncoder(mapping, config);
  assert.deepEqual(encoder.encode(board, 'e2e6', task), encoder.encode(board, 'e2e6', task));
  assert.throws(() => encoder.encode(board, 'e2e6', { ...task, safe: true }), /capture-retention task/);
  assert.throws(() => encoder.encode(board, 'a2a3', task), /legal capture/);
  assert.throws(() => createBoundRayRelationalCueEncoder(mapping, { ...config, maxRelationCells: 14 }), /configuration/);
});

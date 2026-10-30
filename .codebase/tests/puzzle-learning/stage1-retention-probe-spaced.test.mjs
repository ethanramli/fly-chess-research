import test from 'node:test';
import assert from 'node:assert/strict';
import {spacedSchedule} from '../../scripts/puzzle-learning/stage1-retention-probe-spaced.mjs';
import {interferenceOrder} from '../../scripts/puzzle-learning/stage1-retention-probe.mjs';

test('spaced schedule teaches A before each gap and uses every other board once, in order', () => {
  const others=Array.from({length:20},(_,i)=>'o'+i);
  const sequence=spacedSchedule('A',others,[5,5,10]);
  assert.equal(sequence.length,23);
  assert.deepEqual(sequence.map((id,i)=>id==='A'?i:-1).filter(i=>i>=0),[0,6,12]);
  assert.deepEqual(sequence.filter(id=>id!=='A'),others);
});

test('spaced schedule rejects a board count that does not match the gaps, repeats or A among others', () => {
  assert.throws(()=>spacedSchedule('A',['b','c'],[5]));
  assert.throws(()=>spacedSchedule('A',['b','b'],[1,1]));
  assert.throws(()=>spacedSchedule('A',['A','b'],[1,1]));
  assert.throws(()=>spacedSchedule('A',['b'],[0,1]));
});

test('its first 10 interfering boards are the one-shot probe boards in the same order', () => {
  const ids=Array.from({length:24},(_,i)=>'p'+i);
  assert.deepEqual(interferenceOrder('s','p3',ids,20).slice(0,10),interferenceOrder('s','p3',ids,10));
});

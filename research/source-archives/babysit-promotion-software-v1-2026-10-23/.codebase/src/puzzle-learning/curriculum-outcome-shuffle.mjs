import assert from 'node:assert/strict';
import {digest} from '../neural-learning/mushroom-body.mjs';

// The prospective registration pins the complete schedule. No live learner
// performance, validation result or final label selects a permutation.
export function registeredOutcomeShuffle(spec){
  assert.equal(spec?.schema,'matched-task-outcome-shuffle-v1');
  const {sha256,...body}=spec;
  assert.equal(sha256,digest(body),'Task-outcome shuffle schedule changed');
  assert(Array.isArray(body.blocks)&&body.blocks.length>=8&&body.blocks.length<=32);
  assert(body.blocks.every(row=>Array.isArray(row)&&row.length===4
    &&row.every(status=>['success','failure'].includes(status))
    &&row.filter(status=>status==='success').length===2),'Task shuffle must preserve every block outcome count');
  const blocks=structuredClone(body.blocks);
  return {identity:sha256,statusesForBlock(index){
    assert(Number.isSafeInteger(index)&&index>=0&&index<blocks.length,'Task-shuffle schedule exhausted');
    return structuredClone(blocks[index]);
  }};
}

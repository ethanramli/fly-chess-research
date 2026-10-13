import test from 'node:test';
import assert from 'node:assert/strict';
import { stockfishTarget, provisionalMBONValue } from '../../src/search-and-feedback/stockfish-target.mjs';
const line = 'info depth 10 score cp 150 wdl 700 250 50 nodes 1000 pv e2e4 e7e5';
test('Stockfish child-side score is inverted for the actor, including mates', () => {
  const target = stockfishTarget([line], { actor:'w', sideToMove:'b', completed:true });
  assert.equal(target.utility, -.65); assert.equal(target.actorScore, -150);
  const mate = stockfishTarget([line.replace('cp 150','mate -2').replace('700 250 50','0 0 1000')], {actor:'w',sideToMove:'b',completed:true});
  assert.equal(mate.utility, 1); assert.equal(mate.actorScore, 2);
});
test('Incomplete, nonfinite, bounded and stale scores cannot teach', () => {
  for (const [lines, completed] of [[[line],false], [[line,line.replace('score cp 150','score cp 150 lowerbound')],true], [[line,line.replace('wdl 700 250 50','wdl 1001 0 0')],true], [[line,'info depth 11 score cp 180 nodes 1001 pv e2e4'],true]]) {
    assert.equal(stockfishTarget(lines,{actor:'w',sideToMove:'w',completed}).teachingAllowed,false);
  }
});
test('Fixed value transform preserves ranking, rejects invalid activity and marks silence unavailable', () => {
  assert.equal(provisionalMBONValue({MBON12:0,MBON01:0}),null);
  assert.ok(provisionalMBONValue({MBON12:.02,MBON01:.01}) > provisionalMBONValue({MBON12:.01,MBON01:.02}));
  assert.throws(()=>provisionalMBONValue({MBON12:NaN,MBON01:0}));
  assert.throws(()=>provisionalMBONValue({MBON12:1,MBON01:0},0));
});

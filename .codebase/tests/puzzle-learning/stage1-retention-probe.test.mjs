import test from 'node:test';
import assert from 'node:assert/strict';
import {successRank,lessonPair,selectABoards,interferenceOrder,chooseEta} from '../../scripts/puzzle-learning/stage1-retention-probe.mjs';

const experiences=[{move:'a1a2',status:'failure'},{move:'b1b2',status:'success'},{move:'c1c2',status:'failure'}];

test('success rank counts strictly higher scores and needs a unique top choice', () => {
  assert.deepEqual(successRank({rows:[{move:'a1a2',score:3},{move:'b1b2',score:2},{move:'c1c2',score:1}],choice:'a1a2'},experiences),
    {rank:2,legal:3,correct:false,choice:'a1a2'});
  assert.deepEqual(successRank({rows:[{move:'a1a2',score:2},{move:'b1b2',score:2},{move:'c1c2',score:1}],choice:null},experiences),
    {rank:1,legal:3,correct:false,choice:null});
  assert.equal(successRank({rows:[{move:'a1a2',score:1},{move:'b1b2',score:2},{move:'c1c2',score:1}],choice:'b1b2'},experiences).correct,true);
});

test('lesson pair follows the planner: highest-scored failure then success, ties by move', () => {
  const [failure,success]=lessonPair({rows:[{move:'a1a2',score:1},{move:'b1b2',score:0},{move:'c1c2',score:1}]},experiences);
  assert.equal(failure.move,'a1a2');assert.equal(success.move,'b1b2');
  assert.throws(()=>lessonPair({rows:[{move:'a1a2',score:1}]},[{move:'a1a2',status:'failure'}]),/balanced contrast/);
});

test('A boards: first incorrect panel per stratum, flagged fallback when all correct', () => {
  const strata=['open-defender','blocked-defender','absent-defender','pinned-apparent-defender'];
  const scratch=strata.flatMap(stratum=>[{panelId:`${stratum}-b`,stratum,correct:false},{panelId:`${stratum}-a`,stratum,correct:stratum==='absent-defender'}]);
  scratch.push({panelId:'open-defender-0',stratum:'open-defender',correct:true});
  const chosen=selectABoards(scratch);
  assert.deepEqual(chosen.map(row=>row.panelId),['open-defender-a','blocked-defender-a','absent-defender-b','pinned-apparent-defender-a']);
  const allCorrect=selectABoards(strata.map(stratum=>({panelId:stratum,stratum,correct:true})));
  assert(allCorrect.every(row=>row.rule==='all-correct-at-scratch-first-by-id'&&row.scratchCorrect));
});

test('interference order excludes A, is seeded and identical across calls', () => {
  const ids=Array.from({length:24},(_,i)=>`p${String(i).padStart(2,'0')}`);
  const order=interferenceOrder('seed','p03',ids,10);
  assert.equal(order.length,10);assert(!order.includes('p03'));assert.equal(new Set(order).size,10);
  assert.deepEqual(interferenceOrder('seed','p03',ids,10),order);
  assert.notDeepEqual(interferenceOrder('other','p03',ids,10),order);
});

test('eta choice is the largest eta meeting the retained-probe threshold', () => {
  const rows=[{eta:0.5,retained:1},{eta:0.2,retained:3},{eta:0.1,retained:4},{eta:0.05,retained:2}];
  assert.equal(chooseEta(rows,3),0.2);
  assert.equal(chooseEta(rows.map(row=>({...row,retained:0})),3),null);
});

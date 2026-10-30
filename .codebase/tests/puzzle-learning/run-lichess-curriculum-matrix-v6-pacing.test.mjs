import test from 'node:test';
import assert from 'node:assert/strict';
import {paceFactory,MAX_PACED_STEP_MS} from '../../scripts/puzzle-learning/run-lichess-curriculum-matrix-v6.mjs';

// Fake sleep records each requested delay and resolves at once; guard counts its calls.
function fixture(dutyNow){
  const delays=[];let guards=0;
  const pace=paceFactory(dutyNow,()=>{guards+=1;},ms=>{delays.push(ms);return Promise.resolve();});
  return {pace,delays,guardCalls:()=>guards};
}
const total=delays=>delays.reduce((sum,ms)=>sum+ms,0);

test('a normal step rests elapsed*(1/duty-1) in slices of at most 250 ms',async()=>{
  const f=fixture(()=>0.25);
  await f.pace(200);
  assert.ok(Math.abs(total(f.delays)-600)<1e-6);
  assert.ok(f.delays.every(ms=>ms>0&&ms<=250));
  assert.ok(f.guardCalls()>0);
});

test('a normal step at duty 0.75 rests a third of its elapsed time',async()=>{
  const f=fixture(()=>0.75);
  await f.pace(300);
  assert.ok(Math.abs(total(f.delays)-100)<1e-6);
});

test('a suspended step is clamped to MAX_PACED_STEP_MS before pacing',async()=>{
  assert.equal(MAX_PACED_STEP_MS,60000);
  const f=fixture(()=>0.25);
  await f.pace(5314000);
  assert.ok(Math.abs(total(f.delays)-3*MAX_PACED_STEP_MS)<1e-3);
});

test('a duty change during a rest takes effect in the remaining slices',async()=>{
  let calls=0;
  const f=fixture(()=>{calls+=1;return calls<=10?0.25:0.75;});
  await f.pace(60000);
  const rest=total(f.delays);
  assert.ok(rest<3*MAX_PACED_STEP_MS&&rest>20000,`rest ${rest}`);
});

test('a zero or negative step sleeps not at all',async()=>{
  for(const elapsed of [0,-5]){
    const f=fixture(()=>0.25);
    await f.pace(elapsed);
    assert.deepEqual(f.delays,[]);
  }
});

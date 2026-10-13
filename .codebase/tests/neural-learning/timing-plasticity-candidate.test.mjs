import test from 'node:test';
import assert from 'node:assert/strict';
import { stepTimingPlasticity as step } from '../../src/neural-learning/timing-plasticity-candidate.mjs';
const config = Object.freeze({ tauKC: 1, tauDAN: 1, eta: 0.5, minGain: 0.2, maxGain: 1.8 });
const empty = gain => ({ gain, kcTrace: 0, danTrace: 0 });
const kc = elapsed => ({ kcEvent: 1, danEvent: 0, elapsed });
const dan = elapsed => ({ kcEvent: 0, danEvent: 1, elapsed });
function pair(gain, backward, delay = 1) {
  const events = backward ? [dan(0),kc(delay)] : [kc(0),dan(delay)];
  return events.reduce((s,e) => step(s,e,config).state,empty(gain));
}

test('isolated local event order controls direction; delay attenuates either direction', () => {
  assert(pair(1,false).gain < 1); assert(pair(1,true).gain > 1);
  assert(step(empty(1),{kcEvent:1,danEvent:1,elapsed:0},config).state.gain < 1);
  assert.equal(step(empty(1),kc(0),config).state.gain,1);
  assert.equal(step(empty(1),dan(0),config).state.gain,1);
  for (const backward of [false,true]) {
    const short=pair(1,backward,0.5).gain, long=pair(1,backward,4).gain;
    assert(Math.abs(long-1)<Math.abs(short-1));
    assert.equal(Math.sign(long-1),Math.sign(short-1));
  }
});

test('both numerical bounds remain escapable and gains reverse without freezing', () => {
  assert(pair(config.minGain,true).gain > config.minGain);
  assert(pair(config.maxGain,false).gain < config.maxGain);
  let gain=1;
  for(let i=0;i<100;i++)gain=pair(gain,false).gain;
  assert(gain < 0.21);
  for(let i=0;i<100;i++)gain=pair(gain,true).gain;
  assert(gain > 1.79);
  for(let i=0;i<100;i++)gain=pair(gain,false).gain;
  assert(gain >= config.minGain && gain < 0.21);
});

test('quiet intervals decay traces without changing gain; stale KC credit can still interfere', () => {
  const tagged=step(empty(0.6),kc(0),config).state;
  const quiet=step(tagged,{kcEvent:0,danEvent:0,elapsed:1},config).state;
  assert.equal(quiet.gain,tagged.gain); assert(quiet.kcTrace<tagged.kcTrace);
  // Deliberately expose the limitation: an intervening DAN event can affect an
  // earlier cue while its trace persists. This is not a solved retention rule.
  assert(step(quiet,dan(0),config).state.gain < quiet.gain);
  assert.equal(step(empty(0.6),dan(0),config).state.gain,0.6);
});

test('serialized state/config reproduce the next event; invalid input does not mutate state', () => {
  const state=Object.freeze(step(empty(1),dan(0),config).state);
  const copy=JSON.parse(JSON.stringify({state,config}));
  assert.deepEqual(step(state,kc(0.5),config),step(copy.state,kc(0.5),copy.config));
  for(const event of [{kcEvent:NaN,danEvent:0,elapsed:0},{kcEvent:1,danEvent:0,elapsed:-1},
    {kcEvent:0,danEvent:2,elapsed:0}])assert.throws(()=>step(state,event,config),/Invalid/);
  assert.deepEqual(state,copy.state);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {calibrateGF,readGF} from '../src/lowram/gf-readout.mjs';

test('label-free GF ranges retain differences below rest and preserve out-of-panel evidence',()=>{
  // No resting reference or successful-action labels enter this API.
  const calibration=calibrateGF([[0.01,0.02],[0.009,0.019]]);
  assert.equal(calibration.usable,true);
  const a=readGF([0.0092,0.0192],calibration), b=readGF([0.0098,0.0198],calibration);
  assert.ok(a.score<b.score);
  const outside=readGF([0.008,0.021],calibration);
  assert.deepEqual(outside.clipped,[0,1]);assert.deepEqual(outside.outsidePanel,[true,true]);
  assert.ok(outside.normalized[0]<0&&outside.normalized[1]>1);
  assert.equal(calibration.sampleCount,2);
});
test('constant GF responses cannot produce an enabled policy and malformed calibration is rejected',()=>{
  const c=calibrateGF([[0.01,0.02],[0.01,0.02]]);
  assert.equal(c.usable,false);assert.throws(()=>readGF([0.01,0.02],c),/Unusable/);
  assert.throws(()=>calibrateGF([[1,NaN],[2,3]]),/Invalid/);
  const valid=calibrateGF([[1,2],[3,4]]);
  assert.throws(()=>readGF([1,2],{...valid,range:[-1,2]}),/invalid/);
  assert.throws(()=>readGF([Infinity,2],valid),/invalid/);
});

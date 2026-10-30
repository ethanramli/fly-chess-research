import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLichessStage1BrainV6} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v6.mjs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));

test('factory v6 accepts only the attack-map cue and is selected by registration r12', () => {
  const r11=read('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json');
  assert.throws(()=>createLichessStage1BrainV6({registration:r11,replica:'r1',repositoryRoot:process.cwd()}),/requires the attack-map cue/);
  const r12=read('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r12-registration.json');
  assert.equal(r12.learner.encoder.schema,'public-attack-map-cue-v1');
  assert.equal(r12.runtimeFactory.path,'.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v6.mjs');
  const {learner:l11,name:n11,runtimeFactory:f11,...rest11}=r11,{learner:l12,name:n12,runtimeFactory:f12,...rest12}=r12;
  assert.deepEqual(rest12,rest11);
  const {encoder:e11,...learner11}=l11,{encoder:e12,...learner12}=l12;
  assert.deepEqual(learner12,learner11);
});

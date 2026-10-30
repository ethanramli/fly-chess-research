import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {deliveredMode,OUTCOME_ONLY_PROTOCOL} from '../../src/puzzle-learning/coupled-outcome-only-brain.mjs';
import {createLichessStage1BrainV7} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v7.mjs';
import {main as runMatrixV3,OUTCOME_ONLY_CONDITIONS} from '../../scripts/puzzle-learning/run-lichess-curriculum-matrix-v3.mjs';
import {createTrainingArm} from '../../scripts/puzzle-learning/lichess-stage1-runtime-factory-v7.mjs';

test('the informative arm is taught exactly as outcome-only; controls keep their modes', () => {
  assert.equal(OUTCOME_ONLY_PROTOCOL,'verified-outcome-only-v1');
  assert.equal(deliveredMode('informative'),'outcome-only');
  for(const mode of ['outcome-only','no-channel','disabled','outcome-shuffled'])assert.equal(deliveredMode(mode),mode);
  assert.throws(()=>deliveredMode('shuffled'),/no Stockfish-error shuffle/);
});

test('the runner, runtime factory and learner factory refuse Stockfish arms and protocols', async t => {
  assert.deepEqual(OUTCOME_ONLY_CONDITIONS,['informative','absent','disabled','shuffled']);
  const dir=join('runs',`test-outcome-only-${randomUUID()}`);mkdirSync(dir,{recursive:true});
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const write=(name,value)=>{const path=join(dir,name);writeFileSync(path,JSON.stringify(value));return path;};
  const protocol=write('protocol.json',{schema:'test'});
  const base={schema:1,paused:false,allowedModes:['train'],stage:1,replicas:['r1'],scheduleCondition:'informative'};
  const withStockfish=write('stockfish.json',{...base,conditions:['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled']});
  await assert.rejects(runMatrixV3({registration:withStockfish,mode:'train',out:join(dir,'out'),protocol}),/exactly the matched causal controls/);
  const shuffle=write('shuffle.json',{...base,conditions:OUTCOME_ONLY_CONDITIONS,stockfishShuffle:{sha256:'a'.repeat(64)}});
  await assert.rejects(runMatrixV3({registration:shuffle,mode:'train',out:join(dir,'out'),protocol}),/no Stockfish-error shuffle/);
  const registration={feedbackProtocol:OUTCOME_ONLY_PROTOCOL};
  await assert.rejects(createTrainingArm({stage:1,registration,condition:'stockfish-shuffled',lineageKey:'r1:x',
    outputDir:dir,identity:'b'.repeat(64)}),/Outcome-only protocol arms only/);
  await assert.rejects(createTrainingArm({stage:1,registration:{feedbackProtocol:'verified-outcome-plus-stockfish-v2'},
    condition:'informative',lineageKey:'r1:x',outputDir:dir,identity:'b'.repeat(64)}),/verified-outcome-only-v1/);
  assert.throws(()=>createLichessStage1BrainV7({registration:{feedbackProtocol:'verified-outcome-plus-stockfish-v2'},replica:'r1',repositoryRoot:'.'}),
    /outcome-only learner/);
});

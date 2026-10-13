import test from 'node:test';
import assert from 'node:assert/strict';
import { measureDosePersistence } from '../../src/puzzle-learning/dose-persistence-measurements.mjs';
test('dose measurements restore learned and initial memories and reproduce learned assessments',async()=>{
 let value=0;const memory={snapshot:()=>({value}),restore:s=>{value=s.value;}};
 const r=await measureDosePersistence({memory,learned:{value:5},initial:{value:1},assess:async()=>[{assessment:{choice:value}}]});
 assert.equal(r.panels[0].assessment.choice,5);assert.equal(r.reset[0].assessment.choice,1);assert.equal(value,5);
});
test('persistent changes during assessment invalidate measurement',async()=>{
 let value=0;const memory={snapshot:()=>({value}),restore:s=>{value=s.value;}};
 await assert.rejects(measureDosePersistence({memory,learned:{value:5},initial:{value:1},assess:async()=>{value++;return [{assessment:{}}];}}),/changed lasting memory/);
});

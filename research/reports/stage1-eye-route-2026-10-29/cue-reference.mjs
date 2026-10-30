// Reference for eye-reach.mjs: the same 8-step forward pass with cue-style input (current 1.5 injected directly
// into 128 KCs, as public-attack-map-cue-v2 does with totalCurrent 192), to compare activity magnitudes.
// Read-only; no memory change. Usage (repo root): node --max-old-space-size=512 research/reports/stage1-eye-route-2026-10-29/cue-reference.mjs
import {readFileSync} from 'node:fs';
import {createLichessStage1BrainV8} from '../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v8.mjs';
const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-full-r14-registration.json','utf8'));
const {model,rest,brain}=createLichessStage1BrainV8({registration,replica:'r1',repositoryRoot:process.cwd()}),fingerprint=brain.memoryFingerprint();
const cells=JSON.parse(readFileSync('research/reports/stage1-eye-route-2026-10-29/eye-cells.json','utf8'));
const above=i=>Math.max(0,model.h[model.steps][i]-rest[i]);
for(const offset of [0,1000,2000]){const chosen=cells.kcIdx.slice(offset,offset+128);
  model.forward([0],chosen.map(index=>({index,current:1.5})));
  const all=cells.kcIdx.map(above),stim=chosen.map(above);
  console.log(JSON.stringify({offset,kcActive:all.filter(x=>x>1e-6).length,kcMeanAll:+(all.reduce((s,x)=>s+x,0)/all.length).toExponential(3),
    stimulatedMean:+(stim.reduce((s,x)=>s+x,0)/stim.length).toExponential(3)}));}
console.log(JSON.stringify({memoryUnchanged:brain.memoryFingerprint()===fingerprint}));

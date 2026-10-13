import fs from 'node:fs';
import assert from 'node:assert/strict';
for(const [old,dest] of [['evaluate-stability-transfer.mjs','evaluate-dose-transfer.mjs'],['audit-stability-transfer.mjs','audit-dose-transfer.mjs']]){
 const src='.codebase/scripts/puzzle-learning/'+old,out='.codebase/scripts/puzzle-learning/'+dest;assert.ok(!fs.existsSync(out));
 let s=fs.readFileSync(src,'utf8').replaceAll('multi-context-stability-transfer-v1','stability-dose-transfer-v1').replaceAll('evaluate-stability-transfer.mjs','evaluate-dose-transfer.mjs');
 if(old.startsWith('evaluate')){
  s=s.replaceAll('research/reports/multi-context-stability-v1-2026-10-07','research/reports/stability-feedback-dose-v2-2026-10-07');
  s=s.replace('assert.equal(continuation.summary.allContextAcquisition, true);','// Evaluate every predefined dose, including those that damage trained choices.');
  s=s.replace('digest(restMemory), p.warmStartContinuation.initialMemoryHash','digest(restMemory), p.restMemoryHash');
 }
 s=s.replaceAll('condition.learned','condition.memory').replaceAll('read(path).learned','read(path).memory');
 fs.writeFileSync(out,s);
}

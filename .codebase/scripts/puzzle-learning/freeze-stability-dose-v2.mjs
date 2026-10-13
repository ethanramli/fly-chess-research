import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha256 } from '../runtime/fetch-graph.mjs';
const p=JSON.parse(fs.readFileSync('research/data/stability-feedback-dose-v1/protocol.json'));
p.schema='stability-feedback-dose-v2';
p.outputContract={atomicCheckpoints:true,pendingReceiptBeforeAcknowledgment:true,doses:[8,32],allLegalTrainingPanels:true,repeatResetRestoration:true,separateSiblingAssessment:true,independentAudit:true};
for(const key of ['maxContextSlots','shuffleSeed','evaluationSearch'])delete p[key];
for(const f of ['train-stability-feedback-dose-v2.mjs','audit-stability-feedback-dose-v2.mjs','freeze-stability-dose-v2.mjs']){const key='.codebase/scripts/puzzle-learning/'+f;p.sources[key]=await sha256(key);}
const helper='.codebase/src/puzzle-learning/dose-persistence-measurements.mjs';p.sources[helper]=await sha256(helper);
for(const [f,h] of Object.entries({...p.inputs,...p.sources}))assert.equal(await sha256(f),h);
const dir='research/data/stability-feedback-dose-v2',archive='research/source-archives/stability-feedback-dose-v2-frozen';assert.ok(!fs.existsSync(dir)&&!fs.existsSync(archive));fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(archive,{recursive:true});
for(const f of Object.keys(p.sources)){const dest=path.join(archive,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}
fs.writeFileSync(`${dir}/protocol.json`,JSON.stringify(p,null,2)+'\n');fs.copyFileSync(`${dir}/protocol.json`,`${archive}/protocol.json`);console.log(JSON.stringify({protocolSha256:await sha256(`${dir}/protocol.json`),sources:Object.keys(p.sources).length}));

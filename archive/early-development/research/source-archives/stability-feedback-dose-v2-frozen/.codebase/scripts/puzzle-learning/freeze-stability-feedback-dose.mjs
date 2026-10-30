import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha256 } from '../runtime/fetch-graph.mjs';
const read=f=>JSON.parse(fs.readFileSync(f));
const p=read('research/data/multi-context-stability-v1/protocol.json');
p.schema='stability-feedback-dose-v1';p.scope='Fixed mixed training dose, cumulative8/32; inspected siblings assessed separately; no reasoning claim.';
p.schedulePath='research/data/stability-feedback-dose-experiences-v1/schedule.json';p.experiencesPath='research/data/stability-feedback-dose-experiences-v1/experiences.jsonl';
p.restMemoryPath=p.initialMemoryPath;p.restMemoryHash=p.initialMemoryHash;
p.initialMemoryPath='research/data/stability-feedback-dose-experiences-v1/initial-memory.json';p.initialMemoryHash=read(p.schedulePath).initialMemoryHash;
for(const f of [p.schedulePath,p.experiencesPath,p.initialMemoryPath,p.restMemoryPath,'research/reports/multi-context-stability-v1-2026-10-07/report.json','research/reports/multi-context-stability-v1-2026-10-07/audit.json','research/reports/multi-context-stability-v1-2026-10-07/COMPLETE'])p.inputs[f]=await sha256(f);
for(const f of ['train-stability-feedback-dose.mjs','audit-stability-feedback-dose.mjs','freeze-stability-feedback-dose.mjs']){const key='.codebase/scripts/puzzle-learning/'+f;p.sources[key]=await sha256(key);}
p.sources['.codebase/src/puzzle-learning/stability-feedback-dose-experiment.mjs']=await sha256('.codebase/src/puzzle-learning/stability-feedback-dose-experiment.mjs');
for(const [f,h] of Object.entries({...p.inputs,...p.sources}))assert.equal(await sha256(f),h);
const dir='research/data/stability-feedback-dose-v1',archive='research/source-archives/stability-feedback-dose-v1-frozen';assert.ok(!fs.existsSync(dir)&&!fs.existsSync(archive));fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(archive,{recursive:true});
for(const f of Object.keys(p.sources)){const dest=path.join(archive,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}
fs.writeFileSync(`${dir}/protocol.json`,JSON.stringify(p,null,2)+'\n');fs.copyFileSync(`${dir}/protocol.json`,`${archive}/protocol.json`);console.log(JSON.stringify({protocolSha256:await sha256(`${dir}/protocol.json`),sources:Object.keys(p.sources).length}));

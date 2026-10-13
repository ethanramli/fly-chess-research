// Artificial hybrid memories are causal diagnostics, never learned checkpoints.
import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from '../runtime/fetch-graph.mjs';
const dir='research/data/punishment-component-probe-v1';
if(fs.existsSync(dir))throw Error('Frozen output exists');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const p=read('research/data/retention-event-localization-v1/protocol.json');
const ep='research/reports/adaptive-near-transfer-repair-v2-2026-10-07/run/event-informative-0.json',e=read(ep);
const origin=read(p.conditions.before).learned;
if(JSON.stringify(origin)!==JSON.stringify(e.before))throw Error('Snapshot mismatch');
fs.mkdirSync(dir,{recursive:true});
const states={decreasesOnly:structuredClone(origin),increasesOnly:structuredClone(origin)};
let decreases=0,increases=0;
for(let i=0;i<origin.gains.length;i++){
 const a=origin.gains[i],b=e.after.gains[i];if(!Number.isFinite(a)||!Number.isFinite(b))throw Error('Nonfinite gain');
 if(b<a){states.decreasesOnly.gains[i]=b;decreases++;}
 if(b>a){states.increasesOnly.gains[i]=b;increases++;}
}
p.conditions={before:p.conditions.before,fullPunishment:p.conditions.afterPunishment};
for(const [name,state] of Object.entries(states)){
 const file=`${dir}/${name}.json`;
 fs.writeFileSync(file,JSON.stringify({learned:state,diagnosticOnly:true,origin:{path:ep,sha256:await sha256(ep)},scope:'Artificial component intervention; events counter retained from pre-event memory. Not a learned checkpoint.'},null,2)+'\n');
 p.conditions[name]=file;p.inputs[file]=await sha256(file);
}
p.scope='Artificial component ablation of one punishment update on a trained development board. No feedback, biological validation, learning improvement or transfer claim.';
p.purpose='Distinguish gain decreases from gain increases as causes of first-puzzle choice loss.';
p.output='research/reports/punishment-component-probe-v1-2026-10-07/run';
p.sources['.codebase/scripts/puzzle-learning/freeze-punishment-component-probe.mjs']=await sha256(import.meta.filename);
for(const [file,expected]of Object.entries({...p.inputs,...p.sources}))if(await sha256(file)!==expected)throw Error(`Identity ${file}`);
fs.writeFileSync(`${dir}/protocol.json`,JSON.stringify(p,null,2)+'\n');
const archive='research/source-archives/punishment-component-probe-v1-frozen';fs.mkdirSync(archive,{recursive:true});
for(const file of Object.keys(p.sources)){const dest=path.join(archive,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest,fs.constants.COPYFILE_EXCL);}
fs.copyFileSync(`${dir}/protocol.json`,`${archive}/protocol.json`,fs.constants.COPYFILE_EXCL);
const auditor='.codebase/scripts/puzzle-learning/audit-near-transfer-repair-transfer-v2.mjs';
const ap={originalProtocolSha256:await sha256(`${dir}/protocol.json`),originalAuditorPath:'.codebase/scripts/puzzle-learning/audit-near-transfer-repair-transfer.mjs',originalAuditorArchive:`${archive}/.codebase/scripts/puzzle-learning/audit-near-transfer-repair-transfer.mjs`,inputs:{},sources:{[auditor]:await sha256(auditor)}};
fs.writeFileSync(`${dir}/audit-protocol.json`,JSON.stringify(ap,null,2)+'\n');
fs.writeFileSync(`${archive}/manifest.json`,JSON.stringify({protocolSha256:ap.originalProtocolSha256,sources:p.sources,inputs:p.inputs},null,2));
console.log(JSON.stringify({protocolSha256:ap.originalProtocolSha256,decreases,increases,conditions:Object.keys(p.conditions)}));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const {values:args}=parseArgs({options:{run:{type:'string'}}});assert.ok(args.run);
const read=f=>JSON.parse(fs.readFileSync(f)),pp='research/data/stability-feedback-dose-v1/protocol.json',p=read(pp),r=read(`${args.run}/report.json`);
assert.ok(r.complete);assert.equal(r.identity.protocolSha256,await sha256(pp));
for(const [f,h] of Object.entries({...p.inputs,...p.sources}))assert.equal(await sha256(f),h);
assert.deepEqual(r.identity.inputs,p.inputs);assert.deepEqual(r.identity.sources,p.sources);assert.equal(r.identity.fixedStateHash,p.shared.invariant);
const schedule=read(p.schedulePath),experiences=fs.readFileSync(p.experiencesPath,'utf8').trim().split(/\r?\n/).map(JSON.parse),mapping=read(p.mappingPath).mapping;
const readRef=async ref=>{assert.equal(await sha256(ref.path),ref.sha256);return read(ref.path);};
let certificates=0,recurrences=0,panels=0;
function verify(e){const c=e.proof.certificate,b=new Chess();b.loadPgn(c.rootPgn);const checked=checkMateCertificate(c,b,{attacker:e.actor,plies:c.plies,...p.verification});assert.ok(checked.verified);assert.equal(checked.status,e.status);certificates++;}
for(const result of r.results){
 assert.ok(schedule.conditions.includes(result.condition));assert.equal(result.eventRefs.length,32);
 let memory=read(p.initialMemoryPath).memory;
 for(let i=0;i<32;i++){
  const e=await readRef(result.eventRefs[i]),rc=e.receipt;assert.equal(e.index,i);assert.deepEqual(e.experience,experiences[i].experience);assert.equal(e.rowId,experiences[i].rowId);verify(e.experience);
  assert.deepEqual(e.before,memory);assert.deepEqual(rc.before,e.before);assert.deepEqual(rc.after,e.after);
  const channel=result.condition==='absent'?null:(result.condition==='shuffled'?schedule.shuffledChannels[i]:schedule.informativeChannels[i]);assert.equal(e.channel,channel);assert.equal(rc.event.channel,channel);
  assert.equal(rc.fixedStateBefore,p.shared.invariant);assert.equal(rc.fixedStateAfter,p.shared.invariant);assert.equal(rc.plasticityEnabled,result.condition!=='disabled');
  if(result.condition==='disabled')assert.deepEqual(e.before,e.after);
  else{let offset=0,changed=0;for(let g=0;g<mapping.groups.length;g++){const D=-rc.local.dan[g].reduce((a,b)=>a+b,0)/rc.local.dan[g].length;assert.equal(D,rc.local.factors[g]);for(const edge of mapping.groups[g].edges){const k=rc.local.kc[offset],v=e.before.gains[offset];assert.ok(Number.isFinite(k)&&k>=0);const next=Math.max(p.shared.memory.minGain,Math.min(p.shared.memory.maxGain,v+p.shared.memory.eta*D*(k+v-1)));assert.equal(next,e.after.gains[offset]);if(next!==v)changed++;offset++;}}assert.equal(offset,e.after.gains.length);assert.equal(rc.update.changedEdges,changed);recurrences++;}
  memory=e.after;
  if(schedule.doseEvents.includes(i+1)){const d=await readRef(result.doseRefs.find(d=>d.dose===i+1).ref);assert.deepEqual(d.memory,memory);assert.deepEqual(d.eventRefs,result.eventRefs.slice(0,i+1));}
 }
}
assert.deepEqual(r.results.map(x=>x.condition),schedule.conditions);assert.equal(r.evaluations.length,8);
for(const ev of r.evaluations){const result=r.results.find(x=>x.condition===ev.condition),d=await readRef(result.doseRefs.find(d=>d.dose===ev.dose).ref);assert.deepEqual(ev.memory,d.memory);assert.equal(ev.panels.length,p.positions.length);
 for(const panel of ev.panels){const ref=p.positions.find(x=>x.id===panel.rowId);assert.ok(ref);const row=fs.readFileSync(ref.path,'utf8').trim().split(/\r?\n/).map(JSON.parse).find(x=>x.id===ref.id);const legal=new Chess(row.fen).moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).sort();assert.deepEqual(panel.assessment.rows.map(x=>x.move).sort(),legal);assert.equal(panel.memoryFingerprint,digest(d.memory));assert.equal(panel.assessment.memoryFingerprint,digest(d.memory));for(const x of panel.assessment.rows){assert.ok([x.score,x.MBON12,x.MBON01].every(Number.isFinite));assert.equal(x.score,x.MBON12-x.MBON01);}assert.equal(panel.assessment.choice,[...panel.assessment.rows].sort((a,b)=>b.score-a.score||a.move.localeCompare(b.move))[0].move);verify(panel.review);panels++;}
}
const audit={passed:true,reportSha256:await sha256(`${args.run}/report.json`),auditorSha256:await sha256(import.meta.filename),certificates,recurrences,panels,scope:'Dose receipt/certificate/score integrity only; no independent neural replay or transfer claim.'};
for(const [name,value] of [['audit.json',audit],['COMPLETE',{passed:true,reportSha256:audit.reportSha256}]]){const f=`${args.run}/${name}`;assert.ok(!fs.existsSync(f));fs.writeFileSync(f+'.partial',JSON.stringify(value,null,2)+'\n');fs.renameSync(f+'.partial',f);}console.log(JSON.stringify(audit));

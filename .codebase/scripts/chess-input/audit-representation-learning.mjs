// Independent receipts, physical input budget and fixed ranking audit.
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkMateCertificate} from '../../src/search-and-feedback/mate-certificate-check.mjs';
const{values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'},prefix:{type:'string'},origin:{type:'string'}}});
if(!args.run||!args.out||existsSync(args.out))throw Error('Require completed run and new audit');
const read=p=>JSON.parse(readFileSync(p)),hash=v=>createHash('sha256').update(v).digest('hex'),digest=v=>hash(JSON.stringify(v));
const r=read(join(args.run,'report.json')),p=r.protocol;assert.equal(r.complete,true);
for(const[path,h]of Object.entries({...r.identity.inputs,...r.identity.sources}))assert.equal(hash(readFileSync(path)),h);
const source=read(join(p.sourceRun,'report.json')),mapping=read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping,board=new Chess(r.identity.puzzle.fen),actor=board.turn(),legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
assert.deepEqual(r.identity.originalIdentity,source.identity);assert.deepEqual(r.identity.jobs,p.encoders.flatMap(encoder=>p.conditions.map(condition=>({encoder,condition}))));assert.equal(r.results.length,r.identity.jobs.length);
let certificates=0,updates=0;
function proof(move,value){assert.ok(legal.includes(move));if(value.status==='unknown')return;const b=new Chess();b.loadPgn(board.pgn());b.move({from:move.slice(0,2),to:move.slice(2,4),...(move.length===5?{promotion:move[4]}:{})});const check=checkMateCertificate(value.certificate,b,{attacker:actor,plies:r.identity.puzzle.plies-1,maxNodes:4096});assert.equal(check.verified,true,check.reason);assert.equal(check.status,value.status);certificates++;}
function probe(v){assert.deepEqual(v.rows.map(v=>v.move),legal);for(const row of v.rows){assert.ok([row.score,row.MBON12,row.MBON01].every(Number.isFinite));assert.equal(row.score,row.MBON12-row.MBON01);}assert.equal(v.choice,[...v.rows].sort((a,b)=>b.score-a.score)[0].move);}
const pool=[...new Set(mapping.groups.flatMap(g=>g.kc))].sort((a,b)=>a-b),bucket=(token,n)=>createHash('sha256').update(`${p.encoder.seed}\0${token}`).digest().readUInt32LE(0)%n;
assert.equal(r.identity.doses.length,legal.length*p.encoders.length);
for(const encoder of p.encoders){const rows=r.identity.doses.filter(v=>v.encoder===encoder);assert.deepEqual(rows.map(v=>v.move),legal);
  for(const row of rows){const cue=row.cue;assert.equal(cue.identity,r.identity.encoderIdentities[encoder]);assert.equal(cue.stimulation.length,14);assert.ok(cue.stimulation.every(v=>v.current===1.5));assert.equal(cue.accounting.totalCurrent,21);
    assert.deepEqual(cue.assignments,cue.tokens.map(token=>({token,index:pool[bucket(token,pool.length)]})));
    const cells=[...new Set(cue.assignments.map(v=>v.index))];cells.sort((a,b)=>bucket(`budget:${a}`,0x100000000)-bucket(`budget:${b}`,0x100000000)||a-b);assert.deepEqual(cue.stimulation.map(v=>v.index),cells.slice(0,14).sort((a,b)=>a-b));
  }
}
assert.deepEqual(r.experiences.map(v=>v.move),p.schedule);for(const event of r.experiences)proof(event.move,event.proof);
const flags=r.experiences.filter(v=>v.learningAllowed).map(v=>v.experimentalPulse),shuffle=[...flags];let rng=p.encoder.seed>>>0;for(let i=shuffle.length-1;i>0;i--){rng=(Math.imul(1664525,rng)+1013904223)>>>0;const j=Math.floor(rng/2**32*(i+1));[shuffle[i],shuffle[j]]=[shuffle[j],shuffle[i]];}
assert.deepEqual(r.flags,flags);assert.deepEqual(r.shuffled,shuffle);
for(let j=0;j<r.results.length;j++){
  const a=r.results[j];assert.deepEqual(a.job,r.identity.jobs[j]);assert.equal(a.fixedStatePreserved,true);assert.ok(a.calls<=p.maxBrainCalls);assert.equal(a.receipts.length,p.schedule.length);assert.equal(a.probes.length,p.schedule.length);
  for(const key of ['before','after','repeat','reset','restored'])probe(a[key]);assert.deepEqual(a.after,a.repeat);assert.deepEqual(a.after,a.restored);assert.deepEqual(a.before,a.reset);proof(a.before.choice,a.initialProof);proof(a.after.choice,a.finalProof);
  let previous=a.before,previousMemory=null,index=0;
  for(let i=0;i<a.receipts.length;i++){
    const receipt=a.receipts[i],event=receipt.event;for(const key of ['move','actor','status','learningAllowed','experimentalPulse','certificateSha256','proof'])assert.deepEqual(event[key],r.experiences[i][key]);assert.equal(event.attempt,i);assert.equal(event.actor,actor);assert.equal(event.learningAllowed,event.status!=='unknown');assert.equal(event.experimentalPulse,event.learningAllowed?event.status==='failure':null);proof(event.move,event.proof);
    const delivered=a.job.condition==='absent'?false:a.job.condition==='shuffled'?(event.learningAllowed?shuffle[index]:null):event.experimentalPulse;assert.equal(event.delivered,delivered);if(event.learningAllowed){assert.equal(event.certificateSha256,digest(event.proof.certificate));index++;}
    const old=receipt.before,now=receipt.after;if(previousMemory)assert.deepEqual(old,previousMemory);else assert.ok(old.events===0&&old.gains.every(v=>v===1));
    let expected=[...old.gains];const disabled=a.job.condition==='disabled';
    if(event.learningAllowed&&!disabled){expected=[];let offset=0;assert.equal(receipt.local.factors.length,mapping.groups.length);for(let group=0;group<mapping.groups.length;group++){const D=receipt.local.factors[group];assert.ok(Number.isFinite(D)&&D<=0&&-p.eta*D<=1);for(let k=0;k<mapping.groups[group].edges.length;k++,offset++){const value=old.gains[offset],activity=receipt.local.kc[offset];assert.ok(Number.isFinite(activity)&&activity>=0);expected.push(Math.max(p.minGain,Math.min(p.maxGain,value+p.eta*D*(activity+value-1))));}}}
    assert.deepEqual(now.gains,expected);assert.equal(now.identity,old.identity);assert.equal(now.events,old.events+(event.learningAllowed&&!disabled?1:0));assert.equal(receipt.appliedToNeurons,event.learningAllowed);const changed=expected.filter((v,k)=>v!==old.gains[k]).length;assert.equal(receipt.learningApplied,changed>0);if(event.learningAllowed)assert.equal(receipt.update.changedEdges,changed);
    probe(receipt.probeAfter);assert.deepEqual(receipt.probeAfter,a.probes[i]);assert.equal(previous.memoryHash,digest(old));assert.equal(receipt.probeAfter.memoryHash,digest(now));proof(receipt.probeAfter.choice,receipt.preferredProof);previous=receipt.probeAfter;previousMemory=now;updates++;
  }
  assert.deepEqual(previous,a.after);assert.deepEqual(previousMemory,a.finalMemory);if(a.job.condition==='disabled')assert.deepEqual(a.before,a.after);
}
const margin=probe=>{const safe=r.experiences.filter(v=>v.status==='success').map(v=>probe.rows.find(t=>t.move===v.move).score),bad=r.experiences.filter(v=>v.status==='failure').map(v=>probe.rows.find(t=>t.move===v.move).score);return safe.reduce((a,b)=>a+b,0)/safe.length-bad.reduce((a,b)=>a+b,0)/bad.length;};
const summary={shuffleDifferent:digest(flags)!==digest(shuffle),encoders:p.encoders.map(encoder=>{const rows=r.results.filter(v=>v.job.encoder===encoder),informative=rows.find(v=>v.job.condition==='informative'),absent=rows.find(v=>v.job.condition==='absent');return{encoder,gates:{fixtureRepair:informative.initialProof.status==='failure'&&informative.finalProof.status==='success',feedbackSpecificity:digest(flags)!==digest(shuffle)&&informative.finalProof.status==='success'&&rows.filter(v=>v.job.condition!=='informative').every(v=>v.finalProof.status==='failure')},informativeAboveAbsentMarginChange:(margin(informative.after)-margin(informative.before))-(margin(absent.after)-margin(absent.before)),conditions:rows.map(v=>({condition:v.job.condition,choice:v.after.choice,status:v.finalProof.status,marginBefore:margin(v.before),marginAfter:margin(v.after),pulses:v.receipts.filter(t=>t.event.delivered===true&&t.event.learningAllowed).length}))};})};summary.pairedRepresentationEffect=summary.encoders[1].informativeAboveAbsentMarginChange-summary.encoders[0].informativeAboveAbsentMarginChange;assert.deepEqual(r.summary,summary);
let prefixExact=null;if(args.prefix){const strip=v=>Array.isArray(v)?v.map(strip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='elapsedMs').map(([k,x])=>[k,strip(x)])):v,scientific=s=>strip({identity:s.identity,nextJob:s.nextJob,results:s.results,active:s.active});
  const targets=readdirSync(args.prefix).filter(v=>/^checkpoint-\d{5}$/.test(v)).map(v=>({h:digest(scientific(read(join(args.prefix,v,'state.json')))),match:false}));
  for(const root of [args.origin,args.run].filter(Boolean)){for(const name of readdirSync(root).filter(v=>/^checkpoint-\d{5}$/.test(v)).sort()){const s=read(join(root,name,'state.json'));assert.deepEqual(s.identity,r.identity);const h=digest(scientific(s));for(const t of targets)t.match||=t.h===h;if(targets.every(t=>t.match))break;}if(targets.every(t=>t.match))break;}prefixExact=targets.length>=2&&targets.every(t=>t.match);assert.equal(prefixExact,true);
}
const audit={passed:true,updates,certificates,matchedInputCandidates:r.identity.doses.length,summary,prefixExact,reportSha256:hash(readFileSync(join(args.run,'report.json'))),auditSha256:hash(readFileSync('.codebase/scripts/chess-input/audit-representation-learning.mjs')),peakRssMiB:process.resourceUsage().maxRSS/1024,scope:'Exact matched stimulus count/amplitude, verified exposures, gain recurrences, full rankings, persistence and original identities. No biological, reversal or unfamiliar reasoning acceptance.'};writeFileSync(args.out,JSON.stringify(audit,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,updates,certificates,summary,prefixExact}));

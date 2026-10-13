// Independent record audit: no trainer, search, encoder or plasticity imports.
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkMateCertificate} from '../../src/search-and-feedback/mate-certificate-check.mjs';
const{values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'},prefix:{type:'string'}}});
if(!args.run||!args.out||existsSync(args.out))throw Error('Require completed run and new audit output');
const read=p=>JSON.parse(readFileSync(p)),hash=v=>createHash('sha256').update(v).digest('hex'),digest=v=>hash(JSON.stringify(v));
const r=read(join(args.run,'report.json')),p=r.protocol;assert.equal(r.complete,true);
for(const[path,h]of Object.entries(r.identity.inputs))assert.equal(hash(readFileSync(path)),h);
for(const[path,h]of Object.entries(r.identity.sources))assert.equal(hash(readFileSync(path)),h);
const prerequisite=read(join(p.prerequisite,'report.json'));assert.equal(prerequisite.summary.allGatesPassed,true);assert.deepEqual(prerequisite.identity.model,r.identity.model);assert.deepEqual(prerequisite.identity.memory,r.identity.memory);assert.equal(prerequisite.identity.invariant,r.identity.invariant);
const mapping=read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping,board=new Chess(r.identity.puzzle.fen),actor=board.turn();
const legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
let certificates=0,updates=0,neuralEvents=0;
const successor=move=>{const b=new Chess();b.loadPgn(board.pgn());b.move({from:move.slice(0,2),to:move.slice(2,4),...(move.length===5?{promotion:move[4]}:{})});return b;};
function proof(cert,b,plies,status){const v=checkMateCertificate(cert,b,{attacker:actor,plies,maxNodes:100000,milliseconds:2000});assert.equal(v.verified,true,v.reason);assert.equal(v.status,status);certificates++;}
function validateProbe(probe){assert.equal(probe.rows.length,legal.length);assert.equal(new Set(probe.rows.map(v=>v.move)).size,legal.length);assert.ok(probe.rows.every(v=>legal.includes(v.move)&&Number.isFinite(v.score)&&v.score===v.MBON12-v.MBON01));assert.equal(probe.choice,[...probe.rows].sort((a,b)=>b.score-a.score)[0].move);}
assert.equal(r.results.length,p.conditions.length);
const measured=[];
for(let n=0;n<r.results.length;n++){
  const a=r.results[n];assert.equal(a.condition,p.conditions[n]);assert.equal(a.phase,'done');assert.equal(a.fixedStatePreserved,true);assert.ok(a.calls<=p.maxBrainCalls);
  for(const key of['before','after','repeat','reset','restored'])validateProbe(a[key]);
  assert.deepEqual(a.after,a.repeat);assert.deepEqual(a.before,a.reset);assert.deepEqual(a.after,a.restored);
  proof(a.taskProof.certificate,board,r.identity.puzzle.plies,'success');
  assert.equal(a.experience.task.fen,board.fen());assert.equal(a.experience.task.pgn,board.pgn());assert.equal(a.experience.task.actor,actor);assert.equal(a.committed,a.experience.chosen);
  assert.ok(legal.includes(a.committed));assert.equal(a.endingFen,successor(a.committed).fen());
  const known=a.experience.evidence.filter(e=>e.proof.status!=='unknown');
  for(const e of a.experience.evidence){assert.equal(e.startingFen,board.fen());assert.equal(e.successorFen,successor(e.move).fen());assert.equal(e.actor,actor);if(e.proof.status!=='unknown')proof(e.proof.certificate,successor(e.move),r.identity.puzzle.plies-1,e.proof.status);}
  const pulses=Array.from({length:p.feedbackCycles},()=>known.map(e=>e.proof.status==='failure')).flat();
  const shuffled=[...pulses];let rng=p.encoderSeed>>>0;
  for(let i=shuffled.length-1;i>0;i--){rng=(Math.imul(1664525,rng)+1013904223)>>>0;const j=Math.floor(rng/2**32*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  assert.equal(a.schedule.length,pulses.length);assert.equal(a.receipts.length,pulses.length);assert.equal(a.nextEvent,pulses.length);
  for(let i=0;i<a.receipts.length;i++){
    const receipt=a.receipts[i],event=receipt.event,e=known[i%known.length];assert.deepEqual(event,a.schedule[i]);assert.equal(event.move,e.move);assert.equal(event.actor,actor);assert.equal(event.status,e.proof.status);assert.equal(event.experimentalPulse,pulses[i]);assert.equal(event.certificateSha256,digest(e.proof.certificate));assert.equal(event.learningAllowed,true);
    const expectedPulse=a.condition==='absent'?false:a.condition==='shuffled'?shuffled[i]:pulses[i];assert.equal(event.delivered,expectedPulse);assert.equal(receipt.appliedToNeurons,true);neuralEvents++;
    const old=receipt.before,now=receipt.after;if(i)assert.deepEqual(old,a.receipts[i-1].after);else assert.ok(old.gains.every(v=>v===1)&&old.events===0);
    const disabled=a.condition==='disabled',expected=[];let offset=0;
    if(disabled)expected.push(...old.gains);else{
      assert.equal(receipt.local.factors.length,mapping.groups.length);
      for(let g=0;g<mapping.groups.length;g++){const D=receipt.local.factors[g];assert.ok(Number.isFinite(D)&&D<=0&&-p.eta*D<=1);
        for(let k=0;k<mapping.groups[g].edges.length;k++,offset++){const gain=old.gains[offset],kc=receipt.local.kc[offset];assert.ok(Number.isFinite(kc)&&kc>=0);expected.push(Math.max(p.minGain,Math.min(p.maxGain,gain+p.eta*D*(kc+gain-1))));}}
    }
    assert.deepEqual(now.gains,expected);assert.equal(now.events,old.events+(disabled?0:1));assert.equal(now.identity,old.identity);assert.ok(now.gains.every(v=>v>=p.minGain&&v<=p.maxGain));
    const changed=expected.filter((v,k)=>v!==old.gains[k]).length;assert.equal(receipt.update.changedEdges,changed);assert.equal(receipt.learningApplied,changed>0);assert.equal(receipt.plasticityEnabled,!disabled);updates++;
  }
  if(a.receipts.length)assert.deepEqual(a.finalMemory,a.receipts.at(-1).after);
  if(a.condition==='disabled'){assert.ok(a.finalMemory.gains.every(v=>v===1));assert.deepEqual(a.before,a.after);}
  if(a.postChoiceProof.status!=='unknown')proof(a.postChoiceProof.certificate,successor(a.after.choice),r.identity.puzzle.plies-1,a.postChoiceProof.status);
  const good=known.filter(e=>e.proof.status==='success').map(e=>e.move),bad=known.filter(e=>e.proof.status==='failure').map(e=>e.move);
  const mean=(probe,moves)=>moves.length?moves.reduce((sum,m)=>sum+probe.rows.find(v=>v.move===m).score,0)/moves.length:null;
  const beforeGood=mean(a.before,good),beforeBad=mean(a.before,bad),afterGood=mean(a.after,good),afterBad=mean(a.after,bad);
  const initialEvidence=a.experience.evidence.find(e=>e.move===a.before.choice);
  measured.push({condition:a.condition,initialChoice:a.before.choice,initialReviewedStatus:initialEvidence?.proof.status??'unreviewed',committed:a.committed,postChoice:a.after.choice,postChoiceStatus:a.postChoiceProof.status,
    choiceChanged:a.before.choice!==a.after.choice,goodReviewed:good.length,badReviewed:bad.length,beforeGoodMinusBad:good.length&&bad.length?beforeGood-beforeBad:null,afterGoodMinusBad:good.length&&bad.length?afterGood-afterBad:null,
    gainChanged:a.finalMemory.gains.some(v=>v!==1),externalPulses:a.receipts.filter(v=>v.event.delivered).length,neuralCalls:a.calls});
}
assert.equal(measured.find(v=>v.condition==='informative').externalPulses,measured.find(v=>v.condition==='shuffled').externalPulses);
// Strip elapsed/search deadline diagnostics for resumed scientific-state
// comparison; fixed source/input/config and actual choices remain included.
function scientific(v){if(Array.isArray(v))return v.map(scientific);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['checkpoint','elapsedMs'].includes(k)).map(([k,x])=>[k,scientific(x)]));return v;}
let prefixReplayExact=null;
if(args.prefix){const targetNames=readdirSync(args.prefix).filter(n=>/^checkpoint-\d{5}$/.test(n)).sort(),targets=targetNames.map(name=>({hash:digest(scientific(read(join(args.prefix,name,'state.json')))),matched:false}));
  for(const name of readdirSync(args.run).filter(n=>/^checkpoint-\d{5}$/.test(n)).sort()){const h=digest(scientific(read(join(args.run,name,'state.json'))));for(const t of targets)t.matched||=t.hash===h;if(targets.every(t=>t.matched))break;}
  prefixReplayExact=targets.length>=2&&targets.every(t=>t.matched);assert.equal(prefixReplayExact,true);
}
const result={passed:true,checkedCertificates:certificates,checkedUpdates:updates,neuralEvents,measured,prefixReplayExact,reportSha256:hash(readFileSync(join(args.run,'report.json'))),auditSha256:hash(readFileSync('.codebase/scripts/puzzle-learning/audit-puzzle-neural.mjs')),
  peakRssMiB:process.resourceUsage().maxRSS/1024,scope:'Receipt/proof binding, recorded local recurrence and causal probe consistency. Does not independently simulate neurons, establish biology or transfer, or turn narrow improvements into a full learning pass.'};
writeFileSync(args.out,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));

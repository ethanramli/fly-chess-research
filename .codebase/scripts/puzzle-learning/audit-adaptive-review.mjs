// Independent all-legal ranking, verified experience, local update and exposure
// audit. Never imports the trainer, encoder, scheduler or plasticity class.
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkMateCertificate} from '../../src/search-and-feedback/mate-certificate-check.mjs';
const{values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'},prefix:{type:'string'},origin:{type:'string'}}});
if(!args.run||!args.out||existsSync(args.out))throw Error('Require completed run and new audit output');
const read=p=>JSON.parse(readFileSync(p)),hash=v=>createHash('sha256').update(v).digest('hex'),digest=v=>hash(JSON.stringify(v));
const r=read(join(args.run,'report.json')),p=r.protocol;assert.equal(r.complete,true);
for(const[path,h]of Object.entries(r.identity.inputs))assert.equal(hash(readFileSync(path)),h);
for(const[path,h]of Object.entries(r.identity.sources))assert.equal(hash(readFileSync(path)),h);
const mapping=read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping;
const fixed=read(join(p.fixedRun,'report.json')).results.find(v=>v.condition==='informative'),adaptive=r.results.find(v=>v.condition==='adaptive');
const board=new Chess(r.identity.puzzle.fen),actor=board.turn(),legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
assert.equal(p.feedbackBudget,fixed.schedule.length);assert.equal(r.results.length,p.conditions.length);
let checkedCertificates=0,checkedUpdates=0,knownEvents=0;
const successor=move=>{const b=new Chess();b.loadPgn(board.pgn());b.move({from:move.slice(0,2),to:move.slice(2,4),...(move.length===5?{promotion:move[4]}:{})});return b;};
function checkProof(proof,move){assert.ok(legal.includes(move));if(proof.status==='unknown')return;const checked=checkMateCertificate(proof.certificate,successor(move),{attacker:actor,plies:r.identity.puzzle.plies-1,maxNodes:100000,milliseconds:2000});assert.equal(checked.verified,true,checked.reason);assert.equal(checked.status,proof.status);checkedCertificates++;}
function checkProbe(probe){assert.equal(probe.rows.length,legal.length);assert.equal(new Set(probe.rows.map(v=>v.move)).size,legal.length);assert.ok(probe.rows.every(v=>legal.includes(v.move)&&Number.isFinite(v.score)&&v.score===v.MBON12-v.MBON01));assert.equal(probe.choice,[...probe.rows].sort((a,b)=>b.score-a.score)[0].move);}
const known=adaptive.schedule.filter(e=>e.learningAllowed),flags=known.map(e=>e.experimentalPulse),shuffled=[...flags];let rng=p.encoderSeed>>>0;
for(let i=shuffled.length-1;i>0;i--){rng=(Math.imul(1664525,rng)+1013904223)>>>0;const j=Math.floor(rng/2**32*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
const diagnostic=[];
for(let n=0;n<r.results.length;n++){
  const a=r.results[n];assert.equal(a.condition,p.conditions[n]);assert.equal(a.fixedStatePreserved,true);assert.equal(a.schedule.length,p.feedbackBudget);assert.equal(a.receipts.length,p.feedbackBudget);assert.equal(a.probes.length,p.feedbackBudget);assert.ok(a.calls<=p.maxBrainCalls);
  for(const key of['before','after','repeat','reset','restored'])checkProbe(a[key]);assert.deepEqual(a.before,a.reset);assert.deepEqual(a.after,a.repeat);assert.deepEqual(a.after,a.restored);checkProof(a.initialProof,a.before.choice);checkProof(a.finalProof,a.after.choice);
  let previous=a.before,previousMemory=null,knownIndex=0;const reviewedBad=new Set(),steps=[];
  for(let i=0;i<a.receipts.length;i++){
    const receipt=a.receipts[i],event=receipt.event;assert.deepEqual(event,a.schedule[i]);assert.equal(event.attempt,i);assert.equal(event.actor,actor);checkProof(event.proof,event.move);
    if(a.condition==='adaptive')assert.equal(event.move,previous.choice,'Teacher must review the brain current full-root choice');
    else if(a.condition==='fixed')assert.equal(event.move,fixed.schedule[i].move);
    else for(const k of['move','actor','status','learningAllowed','experimentalPulse','certificateSha256','proof'])assert.deepEqual(event[k],adaptive.schedule[i][k],'Sequence-matched control changed exposure');
    assert.equal(event.learningAllowed,event.status!=='unknown');assert.equal(event.experimentalPulse,event.learningAllowed?event.status==='failure':null);
    let expectedDelivered=event.experimentalPulse;if(a.condition==='absent')expectedDelivered=false;if(a.condition==='shuffled')expectedDelivered=event.learningAllowed?shuffled[knownIndex]:null;
    assert.equal(event.delivered,expectedDelivered);if(event.learningAllowed){assert.equal(event.certificateSha256,digest(event.proof.certificate));knownIndex++;knownEvents++;}
    const old=receipt.before,now=receipt.after;if(previousMemory)assert.deepEqual(old,previousMemory);else assert.ok(old.events===0&&old.gains.every(v=>v===1));
    let expected=[...old.gains];const disabled=a.condition==='disabled';
    if(event.learningAllowed&&!disabled){expected=[];let offset=0;assert.equal(receipt.local.factors.length,mapping.groups.length);
      for(let g=0;g<mapping.groups.length;g++){const D=receipt.local.factors[g];assert.ok(Number.isFinite(D)&&D<=0&&-p.eta*D<=1);for(let k=0;k<mapping.groups[g].edges.length;k++,offset++){const v=old.gains[offset],kc=receipt.local.kc[offset];assert.ok(Number.isFinite(kc)&&kc>=0);expected.push(Math.max(p.minGain,Math.min(p.maxGain,v+p.eta*D*(kc+v-1))));}}
    }
    assert.deepEqual(now.gains,expected);assert.equal(now.identity,old.identity);assert.equal(now.events,old.events+(event.learningAllowed&&!disabled?1:0));assert.equal(receipt.appliedToNeurons,event.learningAllowed);
    const changed=expected.filter((v,k)=>v!==old.gains[k]).length;assert.equal(receipt.learningApplied,changed>0);if(event.learningAllowed)assert.equal(receipt.update.changedEdges,changed);checkedUpdates++;
    checkProbe(receipt.probeAfter);assert.deepEqual(receipt.probeAfter,a.probes[i]);assert.equal(previous.memoryHash,digest(old));assert.equal(receipt.probeAfter.memoryHash,digest(now));checkProof(receipt.preferredProof,receipt.probeAfter.choice);
    if(event.status==='failure')reviewedBad.add(event.move);
    steps.push({attempt:i+1,reviewed:event.move,reviewStatus:event.status,next:receipt.probeAfter.choice,nextStatus:receipt.preferredProof.status,
      directlyReviewedBadStillPreferred:event.status==='failure'&&receipt.probeAfter.choice===event.move,
      previouslyReviewedBadPreferred:reviewedBad.has(receipt.probeAfter.choice)&&receipt.preferredProof.status==='failure',
      reviewedScoreBefore:previous.rows.find(v=>v.move===event.move).score,reviewedScoreAfter:receipt.probeAfter.rows.find(v=>v.move===event.move).score});
    previous=receipt.probeAfter;previousMemory=now;
  }
  assert.deepEqual(previousMemory,a.finalMemory);assert.deepEqual(previous,a.after);
  if(a.condition==='disabled'){assert.ok(a.finalMemory.gains.every(v=>v===1));assert.deepEqual(a.before,a.after);}
  diagnostic.push({condition:a.condition,finalStatus:a.finalProof.status,finalChoice:a.after.choice,steps});
}
const identifiable=flags.includes(true)&&flags.includes(false);assert.equal(r.summary.shuffleIdentifiable,identifiable);
const gates={fixtureRepair:adaptive.finalProof.status==='success'&&adaptive.initialProof.status==='failure'&&digest(adaptive.after)===digest(adaptive.repeat)&&digest(adaptive.after)===digest(adaptive.restored)&&digest(adaptive.reset)===digest(adaptive.before),
  informativeSpecificity:identifiable&&adaptive.finalProof.status==='success'&&['absent','shuffled','disabled'].every(c=>r.results.find(v=>v.condition===c).finalProof.status==='failure')};assert.deepEqual(r.summary.gates,gates);
let prefixReplayExact=null;
if(args.prefix){
  function stripTiming(v){if(Array.isArray(v))return v.map(stripTiming);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>k!=='elapsedMs').map(([k,x])=>[k,stripTiming(x)]));return v;}
  const scientific=s=>stripTiming({identity:s.identity,nextCondition:s.nextCondition,active:s.active,results:s.results});const targets=readdirSync(args.prefix).filter(n=>/^checkpoint-\d{5}$/.test(n)).sort().map(name=>({hash:digest(scientific(read(join(args.prefix,name,'state.json')))),matched:false}));
  for(const root of [args.origin,args.run].filter(Boolean)){
    for(const name of readdirSync(root).filter(n=>/^checkpoint-\d{5}$/.test(n)).sort()){
      const s=read(join(root,name,'state.json'));assert.deepEqual(s.identity,r.identity);
      const h=digest(scientific(s));for(const t of targets)t.matched||=t.hash===h;
      if(targets.every(t=>t.matched))break;
    }
    if(targets.every(t=>t.matched))break;
  }
  prefixReplayExact=targets.length>=2&&targets.every(t=>t.matched);assert.equal(prefixReplayExact,true);}
const result={passed:true,checkedCertificates,checkedUpdates,knownEvents,shuffleIdentifiable:identifiable,gates,diagnostic,prefixReplayExact,
  reportSha256:hash(readFileSync(join(args.run,'report.json'))),auditSha256:hash(readFileSync('.codebase/scripts/puzzle-learning/audit-adaptive-review.mjs')),peakRssMiB:process.resourceUsage().maxRSS/1024,
  scope:'Exact recorded rankings, bounded proof replay, all local recurrences and matched adaptive exposures. No independent neural simulation, causal attribution to coverage alone, biological validation or transfer.'};
writeFileSync(args.out,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,checkedCertificates,checkedUpdates,gates,shuffleIdentifiable:identifiable,prefixReplayExact}));

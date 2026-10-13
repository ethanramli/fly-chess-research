import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../src/lowram/mate-certificate-check.mjs';
const {values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'}}});
if(!args.run)throw Error('Require --run');
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(join(args.run,'report.json')),r=JSON.parse(bytes),p=r.protocol,s=r.state;
assert.equal(r.complete,true); assert.equal(r.identity.schema,'adaptive-two-valence-v1');
for(const[path,sha]of Object.entries({...r.identity.inputs,...r.identity.sources}))assert.equal(hash(readFileSync(path)),sha);
const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
const pool=[...new Set(mapping.groups.flatMap(g=>g.kc))].sort((a,b)=>a-b),variant=r.identity.variant;
assert.deepEqual(variant,p.variants.find(v=>v.id===variant.id));
const prereqBytes=readFileSync(join(variant.prerequisite,'report.json')),prereq=JSON.parse(prereqBytes);
assert.equal(hash(prereqBytes),variant.reportSha256);assert.equal(prereq.summary.allBehavioralGatesPassed,true);
assert.equal(r.identity.invariant,prereq.identity.invariant);
const readRef=ref=>{const b=readFileSync(ref.path);assert.equal(hash(b),ref.sha256);return JSON.parse(b);};
function projectedCue(board, seed, candidate, task) {
  const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === candidate);
  assert.ok(move); assert.equal(board.history().length, 0);
  const [,, castling, ep, halfmove] = board.fen().split(' ');
  const xy = square => [square.charCodeAt(0)-97,Number(square[1])-1];
  const [fx,fy] = xy(move.from), [tx,ty] = xy(move.to), direction = board.turn() === 'w' ? 1 : -1;
  const relativeRights = board.turn() === 'w' ? castling : castling.replace(/[KQkq]/g,c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
  const rights = castling === '-' ? '-' : 'KQkq'.split('').filter(c => relativeRights.includes(c)).join('');
  const inventory = mirror => {
    const action = `${move.piece}:${mirror*(tx-fx)},${direction*(ty-fy)}:${move.promotion??'-'}`;
    const values = [`action:${action}`,`capture:${move.captured??'-'}`,`castle:${rights}`,
      `halfmove:${halfmove}`,'repetition:1',`task:${task.objective}:${task.plies}`];
    for (const [label,sx,sy] of [['origin',fx,fy],['target',tx,ty]]) {
      const x = mirror === 1 ? sx : 7-sx, y = direction === 1 ? sy : 7-sy;
      values.push(`${label}-walls:${x},${7-x},${y},${7-y}`);
    }
    if (ep === '-') values.push('ep:-'); else { const [ex,ey]=xy(ep); values.push(`ep-from-target:${mirror*(ex-tx)},${direction*(ey-ty)}`); }
    for (const piece of board.board().flat().filter(Boolean)) {
      const [px,py]=xy(piece.square), role=piece.color===board.turn()?'self':'opponent';
      values.push(`around-target:${move.piece}:${role}:${piece.type}:${mirror*(px-tx)},${direction*(py-ty)}`);
      values.push(`around-origin:${action}:${role}:${piece.type}:${mirror*(px-fx)},${direction*(py-fy)}`);
    }
    return values.sort();
  };
  let tokens = inventory(1); const reflected = castling === '-' ? inventory(-1) : null;
  if (reflected && JSON.stringify(reflected)<JSON.stringify(tokens)) tokens=reflected;
  if (variant.conjoin) { const action=tokens.find(t=>t.startsWith('action:')); tokens=tokens.map(token=>`joint:${JSON.stringify([action,token])}`).sort(); }
  const bucket = (token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
  const selected=[], assignments=[];
  for (const group of variant.stratify ? ['PAM02','PPL103'] : ['pooled']) {
    const eligible = group === 'pooled' ? pool : [...new Set(mapping.groups.filter(g=>g.danType===group).flatMap(g=>g.kc))].sort((a,b)=>a-b);
    const assigned=tokens.map(token=>({...((variant.conjoin || variant.stratify)?{group}:{}),token,index:eligible[bucket(group==='pooled'?token:`${group}:${token}`,eligible.length)]}));
    assignments.push(...assigned);
    const cells=[...new Set(assigned.map(a=>a.index))];
    cells.sort((a,b)=>bucket(`budget:${a}`,2**32)-bucket(`budget:${b}`,2**32)||a-b);
    selected.push(...cells.filter(cell=>!selected.includes(cell)).slice(0,variant.stratify?7:14));
  }
  selected.sort((a,b)=>a-b); assert.equal(selected.length,14);
  return {tokens,assignments,stimulation:selected.map(index => ({ index, current: Math.min(p.encoder.maxCellCurrent, p.encoder.totalCurrent / selected.length) }))};
}

let certificates = 0, updates = 0;
function verify(e) {
  const b = new Chess(); b.loadPgn(e.context.pgn);
  assert.equal(b.fen(), e.context.fen); assert.equal(e.actor, b.turn());
  assert.ok(b.moves({ verbose: true }).some(m => m.from + m.to + (m.promotion ?? '') === e.move));
  if (e.status === 'unknown') {
    assert.equal(e.learningAllowed, false); assert.equal(e.experimentalPulse, null);
    assert.equal(e.certificateSha256, null); return;
  }
  const actor = b.turn(); b.move({ from: e.move.slice(0,2), to: e.move.slice(2,4),
    ...(e.move.length === 5 ? { promotion: e.move[4] } : {}) });
  const proof = checkMateCertificate(e.proof.certificate, b, { attacker: actor, plies: e.context.task.plies - 1, maxNodes: 100000 });
  assert.equal(proof.verified, true); assert.equal(proof.status, e.status);
  assert.equal(e.learningAllowed, true); assert.equal(hash(JSON.stringify(e.proof.certificate)), e.certificateSha256); certificates++;
}
function ranking(v) {
  verify(v.review); const board = new Chess(); board.loadPgn(v.review.context.pgn);
  const rows = v.assessment.rows;
  assert.deepEqual(rows.map(v=>v.move).sort(), board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).sort());
  for (const row of rows) { assert.ok(Number.isFinite(row.score)); assert.equal(row.score,row.MBON12-row.MBON01); }
  assert.equal(v.assessment.choice,[...rows].sort((a,b)=>b.score-a.score)[0].move);
  assert.equal(v.assessment.choice,v.review.move);
}
const baseline=s.baselineRefs.map(readRef); baseline.forEach(ranking);
const adaptive=s.adaptiveEventRefs.map(readRef),known=adaptive.filter(t=>t.experience.learningAllowed);
const shuffled=known.map(t=>t.experience.status==='success'?'PAM02':'PPL103'); let rng=p.seed>>>0;
for(let i=shuffled.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=Math.floor(rng/2**32*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
let cursor=0;const slots=adaptive.map(t=>t.experience.learningAllowed?shuffled[cursor++]:null);
assert.deepEqual(s.shuffle,slots); assert.equal(s.shuffleIdentifiable,new Set(shuffled).size===2);
assert.equal(s.results.length,p.conditions.length);const panels={};
for(let c=0;c<p.conditions.length;c++){
  const result=s.results[c];assert.equal(result.condition,p.conditions[c]);
  assert.equal(result.eventRefs.length,p.attemptsPerPuzzle*r.identity.puzzleCount);
  assert.equal(result.rankingRefs.length,result.eventRefs.length);let memory=s.naive;
  for(let j=0;j<result.eventRefs.length;j++){
    const wrapper=readRef(result.eventRefs[j]),e=wrapper.experience,t=wrapper.receipt;
    verify(e);assert.deepEqual(wrapper.before,memory);
    assert.equal(wrapper.puzzleIndex,Math.floor(j/p.attemptsPerPuzzle));assert.equal(wrapper.attempt,j%p.attemptsPerPuzzle);
    if(['absent','shuffled','disabled'].includes(result.condition))assert.deepEqual(e,adaptive[j].experience);
    if(result.condition==='fixed'){
      const plan=readRef(p.fixedPlans[wrapper.puzzleIndex]);assert.deepEqual(e,plan.experiences[wrapper.attempt%plan.experiences.length]);
    }
    if(result.condition==='adaptive'){
      const selection=readRef(wrapper.selectionRef);ranking(selection);assert.deepEqual(selection.review,e);
      assert.equal(selection.assessment.memoryFingerprint,hash(JSON.stringify(memory)));
    }
    let channel=e.status==='success'?'PAM02':e.status==='failure'?'PPL103':null;
    if(result.condition==='absent')channel=null;if(result.condition==='shuffled')channel=slots[j];
    assert.equal(wrapper.channel,channel);
    if(!e.learningAllowed){assert.equal(t.skipped,true);assert.equal(t.appliedToNeurons,false);assert.deepEqual(wrapper.before,wrapper.after);}
    else{
      assert.deepEqual(t.before,wrapper.before);assert.deepEqual(t.after,wrapper.after);
      assert.equal(t.event.channel,channel);assert.equal(t.appliedToNeurons,true);
      const b=new Chess();b.loadPgn(e.context.pgn);
      const cue=projectedCue(b,p.encoder.seed,e.move,e.context.task);
      assert.deepEqual(t.cue.stimulation,cue.stimulation);assert.deepEqual(t.cue.tokens,cue.tokens);assert.deepEqual(t.cue.assignments,cue.assignments);
      const cells=channel===null?[]:mapping.groups.filter(g=>g.danType===channel).flatMap(g=>g.dan);
      assert.deepEqual(t.presentation.reinforcementCells,cells);
      assert.deepEqual(t.presentation.stimulation,[...cue.stimulation,...cells.map(v=>({index:v.index,current:p.current}))]);
      if(result.condition==='disabled')assert.deepEqual(t.before,t.after);
      else{
        assert.equal(t.after.events,t.before.events+1);assert.deepEqual(t.local.factors,t.update.factors);
        let k=0,changed=0;
        for(let g=0;g<mapping.groups.length;g++){
          const rates=t.local.dan[g],D=-rates.reduce((a,b)=>a+b,0)/rates.length;
          assert.ok(rates.every(v=>Number.isFinite(v)&&v>=0));assert.equal(D,t.local.factors[g]);assert.ok(-p.memory.eta*D<=1);
          for(let n=0;n<mapping.groups[g].edges.length;n++,k++){
            assert.ok(Number.isFinite(t.local.kc[k])&&t.local.kc[k]>=0);
            const before=t.before.gains[k],after=Math.max(p.memory.minGain,Math.min(p.memory.maxGain,before+p.memory.eta*D*(t.local.kc[k]+before-1)));
            assert.equal(t.after.gains[k],after);if(after!==before)changed++;
          }
        }
        assert.equal(t.update.changedEdges,changed);assert.equal(t.learningApplied,changed>0);updates++;
      }
    }
    memory=wrapper.after;const measured=readRef(result.rankingRefs[j]);ranking(measured);
    assert.equal(measured.assessment.memoryFingerprint,hash(JSON.stringify(memory)));
  }
  assert.deepEqual(result.finalMemory,memory);panels[result.condition]=result.panelRefs.map(readRef);
  assert.equal(panels[result.condition].length,r.identity.puzzleCount);
  for(let i=0;i<panels[result.condition].length;i++){
    const v=panels[result.condition][i];[v.after,v.repeat,v.reset,v.restored].forEach(ranking);
    assert.deepEqual(v.after.assessment,v.repeat.assessment);assert.deepEqual(v.after.assessment,v.restored.assessment);
    assert.deepEqual(v.reset.assessment,baseline[i].assessment);
    assert.equal(v.after.assessment.memoryFingerprint,hash(JSON.stringify(memory)));verify(v.searchReview);
    assert.equal(v.searchReview.move,v.search.move.from+v.search.move.to+(v.search.move.promotion??''));
    assert.equal(v.search.seed,p.seed+i);assert.ok(v.search.simulations<=p.search.simulations);
    assert.ok(v.search.evaluations<=p.search.maxEvaluations);assert.ok(v.search.nodes<=p.search.maxNodes);
  }
}
assert.equal(s.totalAttempts,p.maxExperiences);
const repaired=baseline.map((b,i)=>b.review.status==='failure'&&panels.adaptive[i].after.review.status==='success');
const gates={usefulChoices:panels.adaptive.every(v=>v.after.review.status==='success'),
  repairAboveAbsentDisabled:repaired.some((yes,i)=>yes&&['absent','disabled'].every(c=>panels[c][i].after.review.status==='failure')),
  shuffleSpecificity:s.shuffleIdentifiable&&repaired.some((yes,i)=>yes&&panels.shuffled[i].after.review.status==='failure'),
  persistenceAndReset:true,fixedState:true};
assert.deepEqual(r.summary.gates,gates);assert.equal(r.summary.allPilotGatesPassed,Object.values(gates).every(Boolean));
const audit={passed:true,reportSha256:hash(bytes),certificatesChecked:certificates,updatesChecked:updates,gates,
  scope:'Independent record, certificate, input projection, local recurrence and schedule audit; live wiring and pending-receipt recovery require separate validation'};
writeFileSync(args.out??join(args.run,'audit.json'),JSON.stringify(audit,null,2));console.log(JSON.stringify(audit));

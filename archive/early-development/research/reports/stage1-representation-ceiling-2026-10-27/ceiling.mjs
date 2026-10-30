// Step 1 of the 2026-10-27 plan (researcher decision: representation first). No graph, training
// rows only. For each move description, an error-driven perceptron with perfect memory (supervised
// comparison baseline; never part of the Fly) learns on 5 training families and is tested on the
// 6th (leave-one-family-out). "R:" rows use relations that still need a researcher decision and are
// measured for that decision only; the oracle row checks the harness.
// Usage (repo root): node --max-old-space-size=256 research/reports/stage1-representation-ceiling-2026-10-27/ceiling.mjs
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createPublicActionRelativeEncoderV4} from '../../../.codebase/src/chess-input/public-action-relative-cue-v4.mjs';
import {createRelationalChessCueEncoder} from '../../../.codebase/src/chess-input/relational-chess-cue-v3.mjs';
import {createAllLegalBoundRayCueEncoder} from '../../../.codebase/src/chess-input/bound-ray-relational-cue.mjs';

const range=(a,n)=>Array.from({length:n},(_,i)=>a+i);
// Tokens do not depend on the KC mapping; a placeholder mapping satisfies the encoders' checks.
const mapping={readyForCandidateExperiment:true,groups:['MBON01','MBON12','MBON07'].map((mbonType,i)=>({mbonType,kc:range(i*1000,1000)}))};
const task={objective:'capture-retention',plies:1};
const v4=createPublicActionRelativeEncoderV4(mapping),rel3=createRelationalChessCueEncoder(mapping),ray=createAllLegalBoundRayCueEncoder(mapping);
const xy=s=>[s.charCodeAt(0)-97,Number(s[1])-1];

const boards=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).map(r=>{
  const id=r.lesson.lessonId,board=new Chess();board.loadPgn(r.lesson.context.pgn);
  const legal=board.moves({verbose:true}),byKey=new Map(legal.map(m=>[m.from+m.to+(m.promotion??''),m]));
  const cands=r.lesson.candidates.map(c=>({move:byKey.get(c.move),ok:c.proof.status==='success'}));
  if(cands.some(c=>!c.move)||cands.filter(c=>c.ok).length!==1||cands.length!==legal.length) throw Error(`bad row ${id}`);
  return {id,fam:id.split('-').slice(0,3).join('-'),stratum:id.split('-')[3],board,cands};
});

// Public pieces around the landing square, actor-oriented; the mover's origin is empty (as in v4).
function around(board,move){
  const actor=board.turn(),f=actor==='w'?1:-1,[tx,ty]=xy(move.to);
  return board.board().flat().filter(p=>p&&p.square!==move.from).map(p=>{const[px,py]=xy(p.square);
    return {p,role:p.color===actor?'own':'opp',dx:px-tx,dy:(py-ty)*f};});
}
const occupied=(board,move,s)=>s!==move.from&&board.get(s);
const sq=(x,y)=>String.fromCharCode(97+x)+(y+1);
function clearBetween(board,move,[ax,ay],[bx,by]){ // straight line only
  const sx=Math.sign(bx-ax),sy=Math.sign(by-ay),n=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
  for(let i=1;i<n;i++) if(occupied(board,move,sq(ax+sx*i,ay+sy*i))) return false;
  return true;
}
const lineKind=(dx,dy)=>dx===0||dy===0?'orth':Math.abs(dx)===Math.abs(dy)?'diag':null;
const tag=m=>`${m.piece}x${m.captured??'none'}`;
const v4tokens=(b,m)=>v4.encode(b,m.from+m.to+(m.promotion??''),task).tokens.filter(t=>!t.startsWith('task:'));
const untagged=(b,m)=>[`tag:${tag(m)}`,...v4tokens(b,m).map(t=>t.startsWith('act:at:')?'at:'+t.split(':').slice(3).join(':'):t)];
const rays=(b,m)=>ray.encode(b,m.from+m.to+(m.promotion??''),task).relation.tokens.map(t=>{const p=t.split(':');p.splice(1,1);return p.join(':');});
// Restricted relation classes (need a researcher decision before any Fly use).
function contact(b,m){return around(b,m).filter(a=>a.dx||a.dy).flatMap(({p,role,dx,dy})=>{const ax=Math.abs(dx),ay=Math.abs(dy);
  return Math.max(ax,ay)===1?[`adj:${role}:${p.type}`]:ax*ay===2?[`kjump:${role}:${p.type}`]:[];});}
function sight(b,m){const t=xy(m.to);return around(b,m).filter(a=>(a.dx||a.dy)&&['q','r','b'].includes(a.p.type)).flatMap(({p,role,dx,dy})=>{
  const k=lineKind(dx,dy);if(!k||(p.type==='r'&&k!=='orth')||(p.type==='b'&&k!=='diag')) return [];
  return clearBetween(b,m,t,xy(p.square))?[`sight:${role}:${p.type}:${k}`]:[];});}
function kingLine(b,m){const near=new Set([...contact(b,m),...sight(b,m)].map(t=>t.split(':').slice(1,3).join(':')));
  return around(b,m).filter(a=>(a.dx||a.dy)&&a.p.type!=='k'&&near.has(`${a.role}:${a.p.type}`)).flatMap(({p,role})=>{
    const king=b.board().flat().find(q=>q&&q.type==='k'&&q.color===p.color),[px,py]=xy(p.square),[kx,ky]=xy(king.square);
    return lineKind(kx-px,ky-py)&&clearBetween(b,m,[px,py],[kx,ky])?[`kline:${role}:${p.type}`]:[];});}
function oracle(b,m){if(!m.captured) return ['cap:no'];const c=new Chess(b.fen());c.move(m);
  return ['cap:yes',c.moves({verbose:true}).some(r=>r.to===m.to)?'oracle:recapturable':'oracle:retained'];}
// Pseudo-legal attack map after the move (chess.js attackers ignores pins); optionally whether each
// attacker stands on a clear line with its own king.
function attack(b,m,withKingLine){const c=new Chess(b.fen());c.move(m);const opp=c.turn(),hit=c.attackers(m.to,opp);
  const king=c.board().flat().find(q=>q&&q.type==='k'&&q.color===opp),[kx,ky]=xy(king.square);
  const kl=s=>{const[px,py]=xy(s);return s!==king.square&&lineKind(kx-px,ky-py)&&clearBetween(c,{from:null},[px,py],[kx,ky]);};
  return [`tag:${tag(m)}`,...(hit.length?hit.map(s=>`att:${c.get(s).type}${withKingLine?(kl(s)?':kline':':free'):''}`):['att:none'])];}

const descriptions={
  'v4 (current Fly description)':v4tokens,
  'v4 untagged (surroundings not tied to move type)':untagged,
  'v4 mover-tagged (surroundings tied to moving piece only)':(b,m)=>[`tag:${tag(m)}`,...v4tokens(b,m).map(t=>t.startsWith('act:at:')?`at:${m.piece}:`+t.split(':').slice(3).join(':'):t)],
  'relational-v3 (existing encoder)':(b,m)=>rel3.encode(b,m.from+m.to+(m.promotion??''),task).tokens,
  'bound-ray all-legal (existing encoder)':(b,m)=>ray.encode(b,m.from+m.to+(m.promotion??''),task).tokens,
  'v4 untagged + untagged rays':(b,m)=>[...untagged(b,m),...rays(b,m)],
  'R: untagged + contact':(b,m)=>[...untagged(b,m),...contact(b,m)],
  'R: untagged + contact + line-of-sight':(b,m)=>[...untagged(b,m),...contact(b,m),...sight(b,m)],
  'R: untagged + contact + line-of-sight + king-line':(b,m)=>[...untagged(b,m),...contact(b,m),...sight(b,m),...kingLine(b,m)],
  'R: relation classes only (contact + line-of-sight + king-line)':(b,m)=>[`tag:${tag(m)}`,...contact(b,m),...sight(b,m),...kingLine(b,m)],
  'R: attack map (pins ignored)':(b,m)=>attack(b,m,false),
  'R: attack map + attacker on line with own king':(b,m)=>attack(b,m,true),
  'oracle: recapture judgement (harness check, not allowed)':oracle,
};

const intern=new Map(),id=s=>intern.get(s)??(intern.set(s,intern.size),intern.size-1);
const pairs=t=>{const o=[...t];for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++)o.push(t[i]+'&'+t[j]);return o;};
const rand=seed=>()=>((seed=Math.imul(seed^seed>>>15,2246822519)+0x9e3779b9>>>0)/2**32);
function train(ids,F,seed){
  const w=new Map(),score=f=>{let s=0;for(const x of f)s+=w.get(x)??0;return s;},r=rand(seed);
  for(let e=0;e<100;e++){let updates=0;
    for(const bid of [...ids].sort(()=>r()-0.5)){const C=F.get(bid),s=C.map(c=>score(c.f)),top=Math.max(...s),ok=C.findIndex(c=>c.ok);
      if(s.filter(v=>v===top).length===1&&s[ok]===top) continue;
      let wrong=-1;for(let i=0;i<C.length;i++) if(i!==ok&&(wrong<0||s[i]>s[wrong])) wrong=i;
      for(const x of C[ok].f) w.set(x,(w.get(x)??0)+1);for(const x of C[wrong].f) w.set(x,(w.get(x)??0)-1);updates++;}
    if(!updates) break;}
  return bid=>{const C=F.get(bid),s=C.map(c=>score(c.f)),top=Math.max(...s);return s.filter(v=>v===top).length===1&&C[s.indexOf(top)].ok;};
}
const fams=[...new Set(boards.map(b=>b.fam))],strata=[...new Set(boards.map(b=>b.stratum))],seeds=[1,2,3,4,5];
const chance={legal:boards.reduce((s,b)=>s+1/b.cands.length,0),capture:boards.reduce((s,b)=>s+1/b.cands.filter(c=>c.move.captured).length,0)};
console.log(JSON.stringify({boards:boards.length,families:fams.length,perStratum:Object.fromEntries(strata.map(s=>[s,boards.filter(b=>b.stratum===s).length])),
  chanceExpected:{randomLegalMove:+chance.legal.toFixed(2),randomCapture:+chance.capture.toFixed(2)}}));
const results=[];
for(const [name,describe] of Object.entries(descriptions)) for(const learner of ['linear','pairs']){
  const F=new Map(boards.map(b=>[b.id,b.cands.map(c=>{const t=[...new Set(describe(b.board,c.move))].sort();
    return {ok:c.ok,f:Int32Array.from(new Set((learner==='pairs'?pairs(t):t).map(id)))};})]));
  const all=boards.map(b=>b.id),fit=seeds.map(s=>{const p=train(all,F,s);return all.filter(p).length;});
  const held=seeds.map(s=>{const hit=new Set();for(const fam of fams){const te=boards.filter(b=>b.fam===fam).map(b=>b.id),p=train(all.filter(x=>!te.includes(x)),F,s);
    for(const x of te) if(p(x)) hit.add(x);}return hit;});
  const mean=a=>+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1);
  // Twin pairs share the same captures with the safe one swapped; both right = the swap was read.
  const twins=[...new Set(all.map(x=>x.slice(0,-1)))],bothTwins=h=>twins.filter(t=>all.filter(x=>x.slice(0,-1)===t).every(x=>h.has(x))).length;
  const row={description:name,learner,fit24:mean(fit),heldOut24:{mean:mean(held.map(h=>h.size)),min:Math.min(...held.map(h=>h.size)),max:Math.max(...held.map(h=>h.size))},
    heldOutTwinPairsBothRight12:mean(held.map(bothTwins)),
    heldOutByStratum:Object.fromEntries(strata.map(st=>{const ids=boards.filter(b=>b.stratum===st).map(b=>b.id);return [st,`${mean(held.map(h=>ids.filter(x=>h.has(x)).length))}/${ids.length}`];})),
    heldOutByFamily:Object.fromEntries(fams.map(f=>{const ids=boards.filter(b=>b.fam===f).map(b=>b.id);return [f.replace('s1syn-train-',''),`${mean(held.map(h=>ids.filter(x=>h.has(x)).length))}/${ids.length}`];})),
    tokensPerMove:mean(boards.flatMap(b=>b.cands.map(c=>new Set(describe(b.board,c.move)).size)))};
  results.push(row);console.log(JSON.stringify(row));
}
// Chance for "both twins right" when each capture is picked at random.
const twinIds=[...new Set(boards.map(b=>b.id.slice(0,-1)))];
console.log(JSON.stringify({chanceTwinPairsBothRight12:+twinIds.reduce((s,t)=>s+boards.filter(b=>b.id.slice(0,-1)===t).reduce((p,b)=>p/b.cands.filter(c=>c.move.captured).length,1),0).toFixed(2)}));
// Learning curve (linear learner): train on k families, test on the others, all subsets and seeds.
// A rise with k suggests more training families would help that description.
for(const name of ['v4 (current Fly description)','v4 untagged (surroundings not tied to move type)','bound-ray all-legal (existing encoder)',
  'R: relation classes only (contact + line-of-sight + king-line)','R: attack map (pins ignored)','R: attack map + attacker on line with own king']){
  const describe=descriptions[name],F=new Map(boards.map(b=>[b.id,b.cands.map(c=>({ok:c.ok,f:Int32Array.from(new Set(describe(b.board,c.move).map(id)))}))]));
  const curve={};
  for(let k=1;k<fams.length;k++){let hit=0,n=0,both=0,pairsN=0;
    for(let mask=0;mask<1<<fams.length;mask++){const tr=fams.filter((_,i)=>mask>>i&1);if(tr.length!==k) continue;
      const trIds=boards.filter(b=>tr.includes(b.fam)).map(b=>b.id),te=boards.filter(b=>!tr.includes(b.fam)).map(b=>b.id);
      for(const s of seeds){const p=train(trIds,F,s),h=new Set(te.filter(p));hit+=h.size;n+=te.length;
        for(const t of new Set(te.map(x=>x.slice(0,-1)))){pairsN++;if(te.filter(x=>x.slice(0,-1)===t).every(x=>h.has(x))) both++;}}}
    curve[`train${k}fam`]={boardsRight:+(hit/n).toFixed(2),twinPairsBothRight:+(both/pairsN).toFixed(2)};}
  console.log(JSON.stringify({learningCurve:name,curve}));
}
// Novelty: of the facts that tell a held-out board's safe capture from its other captures,
// the share never produced by any move of the training families.
for(const name of Object.keys(descriptions)){let unseen=0,total=0;
  for(const fam of fams){const seen=new Set(boards.filter(b=>b.fam!==fam).flatMap(b=>b.cands.flatMap(c=>descriptions[name](b.board,c.move))));
    for(const b of boards.filter(b=>b.fam===fam)){const caps=b.cands.filter(c=>c.move.captured),T=caps.map(c=>new Set(descriptions[name](b.board,c.move)));
      const diff=new Set(T.flatMap(t=>[...t].filter(x=>!T.every(u=>u.has(x)))));for(const x of diff){total++;if(!seen.has(x)) unseen++;}}}
  console.log(JSON.stringify({novelty:name,distinguishingFacts:total,unseenInTraining:+(unseen/total).toFixed(2)}));}

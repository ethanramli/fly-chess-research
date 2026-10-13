// Read-only decomposition of action-specific gain recovery and ranking
// revival. Associations do not establish a unique causal explanation.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createChessCueEncoder} from '../src/lowram/chess-cue.mjs';
const{values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'},csv:{type:'string'}}});
if(!args.run||!args.out||!args.csv||existsSync(args.out)||existsSync(args.csv))throw Error('Require completed run and new JSON/CSV outputs');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),r=JSON.parse(readFileSync(join(args.run,'report.json'))),audit=JSON.parse(readFileSync(join(args.run,'audit.json')));
assert.equal(r.complete,true);assert.equal(audit.passed,true);assert.equal(audit.reportSha256,hash(join(args.run,'report.json')));
assert.equal(hash('.codebase/src/lowram/chess-cue.mjs'),r.identity.sources['.codebase/src/lowram/chess-cue.mjs']);
const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
const b=new Chess(r.identity.puzzle.fen),encoder=createChessCueEncoder(mapping,{...r.protocol.encoder,seed:r.protocol.encoderSeed}),kc=mapping.groups.flatMap(g=>g.kc);
const cells=move=>new Set(encoder.encode(b,move,{objective:r.identity.puzzle.objective,plies:r.identity.puzzle.plies}).stimulation.map(s=>s.index));
const rank=(probe,move)=>[...probe.rows].sort((a,b)=>b.score-a.score).findIndex(v=>v.move===move)+1;
const score=(probe,move)=>probe.rows.find(v=>v.move===move).score;
const a=r.results.find(v=>v.condition==='adaptive'),previousBad=new Set(),steps=[];
for(let i=0;i<a.receipts.length;i++){
  const t=a.receipts[i],before=i?a.probes[i-1]:a.before,current=cells(t.event.move),comparisons=[];
  for(const old of previousBad){if(old===t.event.move)continue;const oldCells=cells(old),selected=[];
    for(let j=0;j<kc.length;j++)if(oldCells.has(kc[j])&&!current.has(kc[j]))selected.push(j);
    const differences=selected.map(j=>t.after.gains[j]-t.before.gains[j]);
    comparisons.push({previousBadMove:old,oldOnlyEdges:selected.length,recoveringEdges:differences.filter(v=>v>0).length,
      depressingEdges:differences.filter(v=>v<0).length,meanGainChange:selected.length?differences.reduce((x,y)=>x+y,0)/selected.length:null,
      rankBefore:rank(before,old),rankAfter:rank(t.probeAfter,old),scoreBefore:score(before,old),scoreAfter:score(t.probeAfter,old),
      returnedToTop:t.probeAfter.choice===old});
  }
  steps.push({attempt:i+1,current:t.event.move,comparisons});if(t.event.status==='failure')previousBad.add(t.event.move);
}
const revived=steps.flatMap(s=>s.comparisons.filter(c=>c.returnedToTop).map(c=>({attempt:s.attempt,current:s.current,...c})));
const result={reportSha256:hash(join(args.run,'report.json')),sourceSha256:hash('.codebase/scripts/diagnose-adaptive-review.mjs'),gates:r.summary.gates,revivals:revived,steps,
  interpretation:'The unchanged source-derived rule can recover depressed efficacy of relatively inactive cells during punishment of a different cue. Co-occurrence with revived bad rankings motivates testing recovery and representation separately; it is not proof of causal necessity or a biologically justified replacement rule.',
  limitations:['Direct stimulation membership is not all recurrent activity. Counts refer to permitted edges, not unique KCs.',
    'Absolute scores can fall while ranking rises; neither gain recovery nor a rank change establishes new attractiveness.',
    'No new learning, interference ablation, unfamiliar-position evaluation or gate replacement runs here.']};
const lines=['condition,stage,move,score,rank,preferred'];
for(const condition of r.results)for(const[stage,probe]of[['before',condition.before],...condition.probes.map((v,i)=>['event-'+(i+1),v])]){
  const ranked=[...probe.rows].sort((a,b)=>b.score-a.score);
  for(let i=0;i<ranked.length;i++){const v=ranked[i];lines.push([condition.condition,stage,v.move,v.score,i+1,v.move===probe.choice].join(','));}
}
writeFileSync(args.out,JSON.stringify(result,null,2),{flag:'wx'});writeFileSync(args.csv,lines.join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify({revivals:revived,csvRows:lines.length-1,gates:r.summary.gates}));

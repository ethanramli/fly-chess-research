// Replay the recorded v7 eta-0.5 teaching pulses (cue, recorded DAN factors) in the surrogate
// and compare the surrogate's ranks with the recorded full-graph ranks after every lesson.
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate}=await import(pathToFileURL(resolve(process.argv[2])).href);
const S=buildSurrogate();
const dir='runs/stage1-retention-probe-v7-spaced-alpha-three';
// scratch agreement
const scratch=JSON.parse(readFileSync(dir+'/scratch.json','utf8')).panels;
let sc=0,scRankExact=0; for(const p of scratch){const a=S.assess(S.panels.get(p.panelId)); if(a.choice===p.choice) sc++; if(a.rank===p.rank) scRankExact++;}
console.log('scratch: choice agreement',sc,'/',scratch.length,' certified-rank exact',scRankExact);
let n=0,exactA=0,within1A=0,corrAgree=0,afterExact=0,afterCorrect=0; const traj=[];
for(const f of readdirSync(dir).filter(f=>f.startsWith('probe-eta0.5-'))){
  const j=JSON.parse(readFileSync(dir+'/'+f,'utf8')); S.reset(); const A=S.panels.get(j.aPanelId); const sur=[];
  for(const l of j.lessons){ const P=S.panels.get(l.panelId);
    for(const e of l.events) for(const p of e.pulses){ if(!p.channel) continue;
      const stim=p.phase==='task'?P.cues.get(e.move):P.child.get(e.move);
      S.update(stim,p.factors,p.alphaFactors,j.eta);}
    const a=S.assess(A), t=S.assess(P); n++;
    if(a.rank===l.a.rank) exactA++; if(Math.abs(a.rank-l.a.rank)<=1) within1A++; if(a.correct===l.a.correct) corrAgree++;
    if(t.rank===l.after.rank) afterExact++; if(t.correct===l.after.correct) afterCorrect++;
    sur.push(a.rank);
  }
  traj.push({A:j.aPanelId,recorded:j.aRankTrajectory.join(','),surrogate:sur.join(','),recRetained:j.retained,surRetained:S.assess(A).correct});
}
console.log({lessons:n,Arank_exact:exactA,Arank_within1:within1A,Acorrect_agree:corrAgree,taughtBoardAfterRank_exact:afterExact,taughtBoardCorrect_agree:afterCorrect});
for(const t of traj) console.log(t);

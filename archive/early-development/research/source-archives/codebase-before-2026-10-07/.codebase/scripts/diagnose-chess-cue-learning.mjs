// Descriptive decomposition only. Alternate readouts cannot replace acceptance.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
const {values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'}}});
if(!args.run||!args.out)throw Error('Require --run RUN_DIRECTORY --out NEW_JSON');
const path=join(args.run,'report.json'),report=JSON.parse(readFileSync(path));
if(!report.complete)throw Error('Require complete frozen experiment');
const other=c=>c==='A'?'B':'A', rows=[];
for(const r of report.results){
  const sets=Object.fromEntries(['A','B'].map(k=>[k,new Set(r.cues[k].map(s=>s.index))]));
  const intersection=[...sets.A].filter(i=>sets.B.has(i)).length,union=new Set([...sets.A,...sets.B]).size;
  const phases={};
  for(const phase of ['baseline','acquisition','reversal']){
    const p=r.probes[phase],safe=other(phase==='reversal'?r.job.reversedPunished:r.job.initialPunished);
    const signedChoice=p.A.signedScore<=p.B.signedScore?'A':'B',mbonChoice=p.A.MBONscore>=p.B.MBONscore?'A':'B';
    phases[phase]={safe,acceptedDecoderChoice:p.choice,acceptedDecoderCorrect:p.choice===safe,
      clippedMargin:p[other(safe)].score-p[safe].score,signedMargin:p[other(safe)].signedScore-p[safe].signedScore,
      clippedTie:p.A.score===p.B.score,bothHighSaturated:p.A.score===1&&p.B.score===1,
      outOfPanel:{A:p.A.outsidePanel,B:p.B.outsidePanel},
      diagnosticSignedChoice:signedChoice,diagnosticSignedCorrect:signedChoice===safe,
      diagnosticMBONChoice:mbonChoice,diagnosticMBONCorrect:mbonChoice===safe};
  }
  rows.push({job:r.job,cueOverlap:{A:sets.A.size,B:sets.B.size,intersection,union,jaccard:intersection/union},phases});
}
const counts=Object.fromEntries(report.protocol.conditions.map(condition=>{
  const selected=rows.filter(r=>r.job.condition===condition);
  return[condition,Object.fromEntries(['acquisition','reversal'].map(phase=>[phase,{
    acceptedCorrect:selected.filter(r=>r.phases[phase].acceptedDecoderCorrect).length,
    signedDiagnosticCorrect:selected.filter(r=>r.phases[phase].diagnosticSignedCorrect).length,
    mbonDiagnosticCorrect:selected.filter(r=>r.phases[phase].diagnosticMBONCorrect).length,
    clippedTies:selected.filter(r=>r.phases[phase].clippedTie).length,
    bothHighSaturated:selected.filter(r=>r.phases[phase].bothHighSaturated).length}]))];
}));
const diagnostic={sourceReportSha256:createHash('sha256').update(readFileSync(path)).digest('hex'),
  sourceScriptSha256:createHash('sha256').update(readFileSync('.codebase/scripts/diagnose-chess-cue-learning.mjs')).digest('hex'),
  originalGates:report.summary.gates,originalAllGatesPassed:report.summary.allGatesPassed,counts,rows,
  limitations:['Descriptive readout comparisons do not isolate why learning failed or establish the causal role of cue overlap.',
    'Unclipped GF and MBON alternatives are post hoc diagnostic comparisons, not accepted choices, replacement gates or validated interfaces.',
    'Experimental safe labels are not verified chess consequences; none of these counts establish chess reasoning or transfer.']};
writeFileSync(args.out,JSON.stringify(diagnostic,null,2),{flag:'wx'});console.log(JSON.stringify({counts,originalGates:diagnostic.originalGates}));

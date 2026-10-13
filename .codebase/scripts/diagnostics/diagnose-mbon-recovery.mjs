// Descriptive recovery predictions only. Never changes learning acceptance.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const {values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'}}});
if(!args.run||!args.out||existsSync(args.out))throw Error('Require completed --run and new --out');
const report=JSON.parse(readFileSync(join(args.run,'report.json'))),audit=JSON.parse(readFileSync(join(args.run,'audit.json')));
assert.equal(report.complete,true);assert.equal(audit.allChecksPassed,true);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
assert.equal(audit.reportSHA256,hash(join(args.run,'report.json')));
const other=x=>x==='A'?'B':'A';
const rows=report.results.filter(r=>r.job.condition==='informative').map(r=>{
  const old=r.job.initialPunished,newPunished=r.job.reversedPunished;
  const acq=r.trials[report.protocol.acquisitionTrials-1].cueMemory,rev=r.trials.at(-1).cueMemory;
  const recovery=Object.fromEntries(['MBON12','MBON01'].map(type=>{
    const key=type+'/'+old+'-only',a=acq[key],b=rev[key];
    return[type,{selectedEdges:a?.count??0,acquiredMean:a?.mean??null,reversedMean:b?.mean??null,
      delta:a&&b?b.mean-a.mean:null,scope:'Directly stimulated old-action-unique KC inputs, grouped by MBON type'}];
  }));
  return {seed:r.job.seed,oldPunished:old,newPunished,
    ranking:Object.fromEntries(['baseline','acquisition','reversal'].map(phase=>[phase,{M:r.probes[phase].M,choice:r.probes[phase].choice,V_A:r.probes[phase].A.score,V_B:r.probes[phase].B.score}])),
    oldActionVChange:r.probes.reversal[old].score-r.probes.acquisition[old].score,
    newlyPunishedVChange:r.probes.reversal[newPunished].score-r.probes.acquisition[newPunished].score,
    oldActionUniqueRecovery:recovery,
    strictAcquisition:r.probes.acquisition[other(old)].score>r.probes.acquisition[old].score,
    strictReversal:r.probes.reversal[old].score>r.probes.reversal[newPunished].score,
    rankingCrossed:r.probes.acquisition.M*r.probes.reversal.M<0,
    GFdiagnostic:Object.fromEntries(['baseline','acquisition','reversal'].map(phase=>{
      const p=r.probes[phase],choice=p.A.GFscore<=p.B.GFscore?'A':'B',signedChoice=p.A.signedScore<=p.B.signedScore?'A':'B';
      const safe=phase==='reversal'?old:other(old);
      return[phase,{choice,signedChoice,correct:choice===safe,signedCorrect:signedChoice===safe,
        scores:{A:p.A.GFscore,B:p.B.GFscore},sameAsBaseline:choice===(r.probes.baseline.A.GFscore<=r.probes.baseline.B.GFscore?'A':'B')}];
    })),
    reversalTrajectory:r.trials.slice(report.protocol.acquisitionTrials).map(t=>({trial:t.trial,cue:t.cue,delivered:t.delivered,
      responseBeforeUpdate:{MBON12:t.response.MBON12,MBON01:t.response.MBON01,V:t.response.score},
      localFactors:t.update.factors,changedEdges:t.update.changedEdges,efficacyAfterUpdate:t.cueMemory}))};
});
const counts={acquisition:rows.filter(r=>r.strictAcquisition).length,reversal:rows.filter(r=>r.strictReversal).length,
  rankingCrossed:rows.filter(r=>r.rankingCrossed).length,
  oldMBON12UniqueRecovery:rows.filter(r=>r.oldActionUniqueRecovery.MBON12.delta>0).length,
  oldActionVRose:rows.filter(r=>r.oldActionVChange>0).length,
  GFdiagnosticAcquisition:rows.filter(r=>r.GFdiagnostic.acquisition.correct).length,
  GFdiagnosticReversal:rows.filter(r=>r.GFdiagnostic.reversal.correct).length,
  GFdiagnosticChangedAfterAcquisition:rows.filter(r=>!r.GFdiagnostic.acquisition.sameAsBaseline).length,
  GFdiagnosticChangedAfterReversal:rows.filter(r=>!r.GFdiagnostic.reversal.sameAsBaseline).length};
const result={sourceReportSha256:hash(join(args.run,'report.json')),sourceScriptSha256:hash('.codebase/scripts/diagnostics/diagnose-mbon-recovery.mjs'),
  originalGates:report.summary.gates,originalAllGatesPassed:report.summary.allGatesPassed,counts,rows,
  limitations:['Descriptive reused experiment, not new validation or a replacement gate.',
    'Mean gain changes do not establish a biological omission relay, receptor kinetics or causal necessity.',
    'Trial responses precede their updates and use different cues/stimuli; only phase-end probes measure simultaneous A/B ranking without reinforcement.',
    'No omission-only trials, relay intervention, new propagation horizon, puzzle consequence feedback or transfer ran.']};
writeFileSync(args.out,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({counts,originalGates:result.originalGates}));

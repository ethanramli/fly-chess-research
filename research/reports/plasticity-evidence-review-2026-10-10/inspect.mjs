// Read existing JSON evidence only. No graph import, inference or learner update.
import {readFileSync, existsSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dirs = [
  'association-validation-v1-2026-09-30', 'association-validation-v2-2026-09-30',
  'positive-channel-association-v1-2026-10-06', 'positive-channel-association-resumed-2026-10-06',
  'positive-channel-association-v2-2026-10-06', 'recovery-comparison-v1-2026-10-05',
  'recovery-causal-v1-2026-10-06', 'compartment-input-conjoined-balanced-2026-10-06',
  'training-volume-resumed2-2026-10-06', 'adaptive-contrastive-coverage-v1-2026-10-07',
  'adaptive-near-transfer-repair-v2-2026-10-07/run',
  'adaptive-near-transfer-repair-transfer-v1-2026-10-07/run',
  'multi-context-stability-v1-2026-10-07', 'multi-context-stability-transfer-v1-2026-10-07/run',
  'stability-feedback-dose-v2-2026-10-07', 'stability-dose-transfer-v1-2026-10-07/run',
  'capture-retention-assay-v3-2026-10-07',
  'adaptive-contrastive-coverage-v2-2026-10-09/resume',
  'bound-ray-feedback-development-completion-2026-10-08'
];
const paths = dirs.flatMap(d=>['report.json','audit.json','aggregate.json','summary.json'].map(f=>`research/reports/${d}/${f}`))
  .concat(['runs/gamma2-temporal-hypothesis-v2/result.json','runs/gamma2-temporal-hypothesis-v2/audit.json',
    'runs/gamma2-adaptive-target-v1/result.json','runs/gamma2-adaptive-target-v1/audit.json',
    'runs/gamma2-adaptive-cue10-v1/result.json','runs/gamma2-adaptive-cue10-v1/audit.json',
    'runs/adaptive-temporal-loop-v1-resumed/result.json','runs/adaptive-temporal-loop-v1-resumed/audit.json']);
const records=[];
for(const path of paths.filter(existsSync)){
  const bytes=readFileSync(path), data=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
  const summary=Object.fromEntries(Object.entries(data).filter(([k])=>
    /^(passed|allChecksPassed|allAuditChecksPassed|allGatesPassed|complete|gates|counts|acceptance|summary|checks|failures|status|scope|directionPass|specificityPass|usefulChoice|causalChoice|adaptiveAdvantage|replayedFrames|graphRows|choices|strongestCompetitorMargins|resources|schema|protocolHash|reportHash|reportSha256|reportSHA256|rawReportHash)$/.test(k)));
  records.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),rootKeys:Object.keys(data),summary});
}
if(process.argv.includes('--save'))writeFileSync('research/reports/plasticity-evidence-review-2026-10-10/evidence-index.json',
  JSON.stringify({date:'2026-10-10',scope:'Existing artifact bytes and reported gates only; no new neural replay or biological validation',records},null,2)+'\n');
for(const r of records)console.log(JSON.stringify({path:r.path,keys:r.rootKeys,
  passed:r.summary.passed??r.summary.allAuditChecksPassed??r.summary.allChecksPassed,
  gates:r.summary.gates??r.summary.summary?.gates,
  allGatesPassed:r.summary.summary?.allGatesPassed,
  summary:r.summary.summary?.acquiredRepair!==undefined?r.summary.summary:undefined}));

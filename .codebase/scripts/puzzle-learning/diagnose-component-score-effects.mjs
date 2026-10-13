import fs from 'node:fs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const dir='research/reports/punishment-component-probe-v1-2026-10-07/run';
const report=JSON.parse(fs.readFileSync(`${dir}/report.json`));
const audit=JSON.parse(fs.readFileSync(`${dir}/audit.json`));
if(!audit.passed||audit.reportSha256!==await sha256(`${dir}/report.json`))throw Error('Unaudited input');
const base=report.panels.find(p=>p.condition==='before');
const effects=report.panels.map(p=>{
 const success=p.rows.filter(r=>r.consequence==='success'),failure=p.rows.filter(r=>r.consequence==='failure');
 return {condition:p.condition,choice:p.choice,bestSuccessScore:Math.max(...success.map(r=>r.score)),bestFailureScore:Math.max(...failure.map(r=>r.score)),margin:Math.max(...success.map(r=>r.score))-Math.max(...failure.map(r=>r.score)),maxAbsoluteScoreChange:Math.max(...p.rows.map(r=>Math.abs(r.score-base.rows.find(b=>b.move===r.move).score)))};
});
const out='research/reports/component-score-effects-v1-2026-10-07';if(fs.existsSync(out))throw Error('Output exists');fs.mkdirSync(out);
const result={reportSha256:await sha256(`${dir}/report.json`),auditSha256:await sha256(`${dir}/audit.json`),sourceSha256:await sha256(import.meta.filename),effects,scope:'Descriptive score differences from audited artificial interventions; no new neural computation. Distinct scores rule out identical published output, not all implementation errors.'};
fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

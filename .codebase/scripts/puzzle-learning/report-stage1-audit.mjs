#!/usr/bin/env node
// Read-only report for a Stage 1 matrix audit (schema lichess-curriculum-matrix-audit-v1).
// It displays the per-gate verdicts already stored in acceptanceEvidence.reports[] and never recomputes them.
// Verdict sources (in order): replica checks[Dn] boolean, failed[] membership, deferred[] membership; otherwise "not stated".
// Threshold text mirrors the frozen gates in .codebase/src/puzzle-learning/curriculum-stage-acceptance.mjs:
//   D1 training >=22/24                                                   :100
//   D2 validation >=14/16 and >=3 per stratum                             :101-103
//   D3 final >=52/64, >=12/16 per stratum, 8 families of 8, each >=6     :104-107
//   D4 consequence-probe signs >=104/128                                  :108
//   D5 counterfactual pairs >=26/32, all probeOrderingReversed            :109-110
//   D6 causal advantage >=10 and paired family-bootstrap lower95 >0       :112-118 (BOOTSTRAPS=10000, :6)
//   D7 retention >=14/16, before==after, sentinels correct; deferred (policy B) :122-134
//   D8 all six state-audit checks true                                    :136-140
// Producer wiring: .codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v8.mjs:311-383 (deriveAcceptanceEvidence);
// .codebase/src/puzzle-learning/lichess-curriculum-matrix.mjs:213-294 (audit writer).
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const fmt=(value,of)=>value===undefined||value===null?'not stated':`${value}/${of}`;
const strata=(byStratum,of)=>byStratum?` (strata ${Object.values(byStratum).map(v=>`${v}/${of}`).join(' ')})`:'';
const byCheckpoint=m=>Array.isArray(m.validationByCheckpoint)
  ?`by block ${m.validationByCheckpoint.map(r=>`${r.blockIndex}:${r.correct}/16`).join(' ')}`:null;
const controlTraining=m=>m.controlTraining&&Object.keys(m.controlTraining).length
  ?Object.entries(m.controlTraining).map(([k,r])=>`${k} ${r.correct}/24@${r.blockIndex}`).join(', '):null;

const GATES=[
  {id:'D1',threshold:'training >=22/24',ref:'curriculum-stage-acceptance.mjs:100',
    observed:m=>fmt(m.trainingCorrect,24),controls:controlTraining},
  {id:'D2',threshold:'validation >=14/16 and >=3 per stratum',ref:'curriculum-stage-acceptance.mjs:101-103',
    observed:m=>m.validationCorrect!==undefined?`${fmt(m.validationCorrect,16)}${strata(m.validationByStratum,4)}`:byCheckpoint(m),
    controls:()=>null},
  {id:'D3',threshold:'final >=52/64, >=12/16 per stratum, 8 families of 8 each >=6',ref:'curriculum-stage-acceptance.mjs:104-107',
    observed:m=>`${fmt(m.finalCorrect,64)}${strata(m.finalByStratum,16)}`,controls:()=>null},
  {id:'D4',threshold:'probe signs >=104/128',ref:'curriculum-stage-acceptance.mjs:108',
    observed:m=>fmt(m.consequenceSignCorrect,128),controls:()=>null},
  {id:'D5',threshold:'counterfactual pairs >=26/32, all probeOrderingReversed',ref:'curriculum-stage-acceptance.mjs:109-110',
    observed:m=>fmt(m.counterfactualPairsCorrect,32),controls:()=>null},
  {id:'D6',threshold:'advantage >=10 and paired family-bootstrap lower95 >0, per control',ref:'curriculum-stage-acceptance.mjs:112-118',
    observed:m=>m.causalAdvantages?Object.entries(m.causalAdvantages).map(([k,v])=>`${k} ${v}`).join(', '):null,
    controls:m=>m.pairedFamilyBootstrap?Object.entries(m.pairedFamilyBootstrap)
      .map(([k,v])=>`${k} lower95 ${v?.lower95}`).join(', '):null},
  {id:'D7',threshold:'retention >=14/16, before==after, sentinels correct (deferred under policy B)',ref:'curriculum-stage-acceptance.mjs:122-134',
    observed:m=>fmt(m.retentionCorrect,16),controls:()=>null},
  {id:'D8',threshold:'all six state-audit checks true',ref:'curriculum-stage-acceptance.mjs:136-140',
    observed:()=>'boolean state audit',controls:()=>null},
];

// Verdict is only what the file states: checks[Dn] boolean, else failed[] or deferred[] membership.
function verdict(id,report){
  if(Array.isArray(report.deferred)&&report.deferred.includes(id))return 'deferred';
  if(report.checks&&typeof report.checks[id]==='boolean')return report.checks[id]?'pass':'fail';
  if(Array.isArray(report.failed)&&report.failed.includes(id))return 'fail';
  return 'not stated';
}

function replicaReport(report){
  const metrics=report.metrics??{};
  const gates=GATES.map(gate=>({gate:gate.id,threshold:gate.threshold,ref:gate.ref,
    observed:gate.observed(metrics)??'not stated',controls:gate.controls(metrics),verdict:verdict(gate.id,report)}));
  const firstFail=gates.find(g=>g.verdict==='fail')?.gate??null;
  const why=[];
  if(report.missingPrerequisites?.length)why.push(`missing ${report.missingPrerequisites.join(',')}`);
  if(report.unknown?.length)why.push(`unknown: ${report.unknown.join('; ')}`);
  return {replica:report.replica,status:report.status??'not stated',stageAccepted:report.stageAccepted===true,
    gates,firstFailingGate:firstFail,firstFailingNote:firstFail?null:(why.join(' | ')||(report.status==='accepted'?'none':'no failing gate stated'))};
}

export function buildReport(audit){
  const evidence=audit.acceptanceEvidence??{};
  const reports=Array.isArray(evidence.reports)?evidence.reports.map(replicaReport):[];
  return {schema:audit.schema??'not stated',status:audit.status??'not stated',stageAccepted:audit.stageAccepted===true,
    fullNeuralReplay:audit.fullNeuralReplay??'not stated',memoryContinuityVerified:audit.memoryContinuityVerified??'not stated',
    diagnosis:Array.isArray(audit.diagnosis)?audit.diagnosis:[],
    evidence:{schema:evidence.schema??'not stated',status:evidence.status??'not stated',
      unknown:Array.isArray(evidence.unknown)?evidence.unknown:[]},
    checkpointSelection:evidence.checkpointSelection
      ?{schema:evidence.checkpointSelection.schema,frozen:evidence.checkpointSelection.frozen,status:evidence.checkpointSelection.status}:null,
    replicas:reports,
    firstFailing:reports.map(r=>({replica:r.replica,gate:r.firstFailingGate??r.firstFailingNote}))};
}

function table(header,rows){
  const all=[header,...rows],widths=header.map((_,i)=>Math.max(...all.map(r=>String(r[i]??'').length)));
  return all.map(r=>r.map((c,i)=>String(c??'').padEnd(widths[i])).join('  ').trimEnd());
}

export function formatReport(r){
  const out=[`Schema: ${r.schema}`,`Status: ${r.status}  stageAccepted: ${r.stageAccepted}`,
    `fullNeuralReplay: ${r.fullNeuralReplay}  memoryContinuityVerified: ${r.memoryContinuityVerified}`,
    `Acceptance evidence: ${r.evidence.schema} status=${r.evidence.status}`];
  if(r.checkpointSelection)out.push(`Checkpoint selection: ${r.checkpointSelection.schema} frozen=${r.checkpointSelection.frozen} status=${r.checkpointSelection.status??'not stated'}`);
  for(const u of r.evidence.unknown)out.push(`Evidence unknown: ${u}`);
  if(!r.replicas.length)out.push('No per-replica reports in acceptanceEvidence.reports (gate verdicts not stated).');
  for(const rep of r.replicas){
    out.push('',`Replica ${rep.replica}: status=${rep.status} stageAccepted=${rep.stageAccepted}`);
    out.push(...table(['Gate','Observed','Threshold','Controls','Verdict'],
      rep.gates.map(g=>[g.gate,g.observed,`${g.threshold} [${g.ref}]`,g.controls??'',g.verdict])).map(l=>'  '+l));
  }
  out.push('','Diagnosis (verbatim from audit):',...(r.diagnosis.length?r.diagnosis:['(none)']).map(d=>`  ${d}`));
  if(r.replicas.length){
    out.push('','First failing gate per replica:');
    for(const f of r.firstFailing)out.push(`  replica ${f.replica}: ${f.gate??'none'}`);
    for(const rep of r.replicas)if(!rep.firstFailingGate&&rep.firstFailingNote)out.push(`  replica ${rep.replica} note: ${rep.firstFailingNote}`);
  }
  return out.join('\n');
}

const isMain=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isMain){
  const args=process.argv.slice(2),json=args.includes('--json'),paths=args.filter(a=>a!=='--json');
  if(paths.length!==1){console.error('usage: report-stage1-audit.mjs PATH_TO_AUDIT_JSON [--json]');process.exit(2);}
  const report=buildReport(JSON.parse(readFileSync(paths[0],'utf8')));
  console.log(json?JSON.stringify(report,null,2):formatReport(report));
}

// Versioned extension of the frozen Stage 1 gate. In addition to the original
// D1-D8 criteria, require a separate causal comparison for Stockfish teaching.
import {evaluateStage1ReplicasAcceptance as evaluateStage1ReplicasAcceptanceV1}
  from './curriculum-stage-acceptance.mjs';

const HASH=/^[a-f0-9]{64}$/;
const STOCKFISH_CONTROLS=['outcome-only','stockfish-shuffled'];
const BOOTSTRAPS=10_000;
const BOOTSTRAP_SEED=20261023;
const successful=row=>row?.correct===true&&row?.unique===true&&row?.unaided===true;

function xorshift(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/0x1_0000_0000;};}

function compareToControl(final,control){
  const byTrial=new Map(control.map(row=>[row.trialId,row]));
  if(byTrial.size!==64||final.some(row=>{
    const other=byTrial.get(row.trialId);
    return !other||other.familyId!==row.familyId||other.stratum!==row.stratum
      ||other.taskCriterion!==row.taskCriterion||other.positionSha256!==row.positionSha256
      ||other.boardHistorySha256!==row.boardHistorySha256
      ||other.candidateSetSha256!==row.candidateSetSha256
      ||other.certificateSha256!==row.certificateSha256;
  }))return null;
  const familyDelta=new Map();
  for(const row of final){const other=byTrial.get(row.trialId);
    familyDelta.set(row.familyId,(familyDelta.get(row.familyId)??0)
      +Number(successful(row))-Number(successful(other)));}
  const families=[...familyDelta.keys()].sort(),random=xorshift(BOOTSTRAP_SEED),samples=new Array(BOOTSTRAPS);
  for(let sample=0;sample<BOOTSTRAPS;sample++){
    let delta=0;for(let i=0;i<families.length;i++)delta+=familyDelta.get(families[Math.floor(random()*families.length)]);
    samples[sample]=delta;
  }
  samples.sort((a,b)=>a-b);
  const lower95=samples[Math.floor((BOOTSTRAPS-1)*0.025)];
  const advantage=final.reduce((n,row)=>n+Number(successful(row)),0)
    -control.reduce((n,row)=>n+Number(successful(row)),0);
  return {advantage,pairedFamilyBootstrapLower95:lower95,families:families.length,
    resamples:BOOTSTRAPS,seed:BOOTSTRAP_SEED,rng:'xorshift32',passed:advantage>=10&&lower95>0};
}

function stockfishGate(evidence){
  const final=evidence?.finalChoices,controls=evidence?.controls;
  if(!Array.isArray(final)||final.length!==64||!controls)return {status:'unknown',reason:'Final choices or Stockfish controls are missing'};
  const results={};
  for(const name of STOCKFISH_CONTROLS){
    const rows=controls[name];
    if(!Array.isArray(rows)||rows.length!==64||rows.some(row=>typeof row?.trialId!=='string'
      ||typeof row?.familyId!=='string'||typeof row?.stratum!=='string'
      ||typeof row?.taskCriterion!=='string'||!HASH.test(row?.positionSha256??'')
      ||!HASH.test(row?.boardHistorySha256??'')||!HASH.test(row?.candidateSetSha256??'')
      ||!HASH.test(row?.certificateSha256??'')||typeof row?.correct!=='boolean'
      ||typeof row?.unique!=='boolean'||typeof row?.unaided!=='boolean'))
      return {status:'unknown',reason:`Matched ${name} choices are missing or malformed`};
    const result=compareToControl(final,rows);
    if(!result)return {status:'unknown',reason:`${name} choices do not match the final positions and certificates`};
    results[name]=result;
  }
  return {status:Object.values(results).every(row=>row.passed)?'passed':'gate-failed',controls:results,
    criterion:'Informative verified-consequence plus Stockfish teaching must beat both outcome-only and matched shuffled-Stockfish controls by at least 10 choices, with a positive paired family-bootstrap 95% lower bound',
    scope:'Separately tests whether Stockfish assistance adds causal value beyond verified-outcome teaching and matched shuffled Stockfish error'};
}

/** Apply frozen D1-D8 plus the separately tested Stockfish contribution gate. */
export function evaluateStage1ReplicasAcceptance({replicas,requiredReplicaCount}={}){
  const base=evaluateStage1ReplicasAcceptanceV1({replicas,requiredReplicaCount});
  const reports=base.reports?.map((report,index)=>{
    if(!report)return null;
    const result=stockfishGate(replicas[index]);
    const checks={...report.checks,D9:result.status==='passed'};
    const status=result.status==='unknown'||report.status==='unknown'?'unknown'
      :result.status==='gate-failed'||report.status==='gate-failed'?'gate-failed':'accepted';
    return {...report,schema:'curriculum-stage1-acceptance-v2',status,stageAccepted:status==='accepted',
      checks,failed:[...new Set([...(report.failed??[]),...(result.status==='gate-failed'?['D9']:[])])],
      unknown:[...(report.unknown??[]),...(result.status==='unknown'?[result.reason]:[])],
      metrics:{...report.metrics,stockfishAssistance:result.controls??null},stockfishAssistance:result};
  });
  if(!reports||reports.length!==requiredReplicaCount||reports.some(row=>row.status==='unknown'))
    return {schema:'curriculum-stage1-replica-acceptance-v2',status:'unknown',stageAccepted:false,
      requiredReplicaCount,acceptedReplicas:reports?.filter(row=>row.stageAccepted).length??0,
      reports:reports??[],scope:'D1-D8 plus separate Stockfish-assistance evidence; incomplete evidence cannot promote a stage'};
  const failed=reports.filter(row=>row.status==='gate-failed');
  return {schema:'curriculum-stage1-replica-acceptance-v2',status:failed.length?'gate-failed':'accepted',
    stageAccepted:failed.length===0,requiredReplicaCount,acceptedReplicas:reports.length-failed.length,
    failedReplicas:failed.map(row=>row.replica),reports,
    scope:'Every registered replica must pass frozen D1-D8 and the separately tested Stockfish-assistance gate D9'};
}

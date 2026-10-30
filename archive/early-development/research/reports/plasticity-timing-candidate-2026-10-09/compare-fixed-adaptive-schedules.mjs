import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const paths={fixedProtocol:'research/data/gamma2-temporal-hypothesis-v2/protocol.json',
  adaptiveProtocol:'research/data/gamma2-adaptive-target-v1/protocol.json',
  fixedRun:'runs/gamma2-temporal-hypothesis-v2/result.json',fixedAudit:'runs/gamma2-temporal-hypothesis-v2/audit.json',
  adaptiveRun:'runs/gamma2-adaptive-target-v1/result.json',adaptiveAudit:'runs/gamma2-adaptive-target-v1/audit.json'};
const [fixedProtocol,adaptiveProtocol,fixed,oldAudit,adaptive,newAudit]=Object.values(paths).map(read);
for(const key of ['graphPath','annotationPath','mappingPath','model','fen','task','encoder','readout','memory','timing','conditions','runtime'])
  assert.deepEqual(adaptiveProtocol[key],fixedProtocol[key],`Changed experimental factor: ${key}`);
assert(oldAudit.directionPass&&oldAudit.specificityPass&&newAudit.directionPass&&newAudit.specificityPass);
assert.equal(oldAudit.replayedFrames,152);assert.equal(newAudit.replayedFrames,152);
const margin=(arm,stage,move)=>arm[stage].rows.find(r=>r.move===move).score;
const arms=condition=>{
  const x=condition.results.find(r=>r.condition==='informative');
  const start=margin(x,'initial','f7h7')-margin(x,'initial','f7g8');
  const end=margin(x,'final','f7h7')-margin(x,'final','f7g8');
  return {condition:x.condition,initialMargin:start,finalMargin:end,marginChange:end-start,
    finalChoice:x.final.choice,finalStatus:x.finalChoiceStatus};
};
const fixedInfo=arms(fixed),adaptiveInfo=arms(adaptive);
assert.equal(fixedInfo.finalChoice,'f7g8');assert.equal(adaptiveInfo.finalChoice,'f7g8');
assert.equal(fixedInfo.finalStatus,'failure');assert.equal(adaptiveInfo.finalStatus,'failure');
const result={schema:'matched-fixed-adaptive-schedule-comparison-v1',inputs:Object.fromEntries(
  Object.entries(paths).map(([k,path])=>[k,{path,sha256:hash(path)}])),
  matchedFactors:['from-scratch model/config/seed','graph and mapped cells','encoder/config/seed','readout',
    'temporal memory and pulse timing','two action experiences per arm','152 frames per run','four conditions'],
  scheduleChange:{fixed:'Qe6 failure then Qh7 success',adaptive:'measured top-error Qg8 then Qh7 success'},
  fixedInformative:fixedInfo,adaptiveInformative:adaptiveInfo,
  adaptiveMarginGainOverFixed:adaptiveInfo.marginChange-fixedInfo.marginChange,
  controls:{fixed:fixed.results.filter(r=>r.condition!=='informative').map(r=>({condition:r.condition,
    change:margin(r,'final','f7h7')-margin(r,'final','f7g8')-margin(r,'initial','f7h7')+margin(r,'initial','f7g8')})),
    adaptive:adaptive.results.filter(r=>r.condition!=='informative').map(r=>({condition:r.condition,
      change:margin(r,'final','f7h7')-margin(r,'final','f7g8')-margin(r,'initial','f7h7')+margin(r,'initial','f7g8')}))},
  scope:'One fixed model seed and one puzzle. Descriptive matched pilot; adaptive targeting improves the measured pair margin, but both schedules fail the all-legal choice gate. No reliability, retention, reversal or transfer claim.'};
const out='runs/gamma2-adaptive-target-v1/schedule-comparison.json';
writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));

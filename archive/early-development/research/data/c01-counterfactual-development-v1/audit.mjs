import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {checkCaptureRetentionAction} from '../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs';
import {createAllLegalBoundRayCueEncoder} from '../../../.codebase/src/chess-input/bound-ray-relational-cue.mjs';

const dir='research/data/c01-counterfactual-development-v1',sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const candidate=JSON.parse(readFileSync(`${dir}/candidate.json`)),record=JSON.parse(readFileSync(`${dir}/verification.json`));
assert.equal(candidate.schema,'c01-training-development-counterfactual-v1');
assert.equal(candidate.status,'exploratory-training-candidate-only');
assert(candidate.exclusions.includes('never use as validation or final data'));
for(const [path,expected] of Object.entries(record.sourceHashes))assert.equal(sha(readFileSync(path)),expected,`Source changed: ${path}`);
assert.equal(sha(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')),record.mappingSha256);
const task={objective:'capture-retention',plies:1},seeds=[20261011,20261012,20261013];
const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
let legal=0,cuePresentations=0;const probeOutcomes={};
for(const position of candidate.positions){
  const board=new Chess();board.loadPgn(position.pgn);assert.equal(board.fen(),position.fen);assert.deepEqual(position.task,task);
  assert.equal(board.board().flat().filter(Boolean).length,6);assert.equal(board.isCheck(),false);
  const actions=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
  assert.equal(position.allLegalEvidence.length,actions.length);assert.equal(position.allLegalCount,actions.length);
  probeOutcomes[position.id]={};
  for(const row of position.allLegalEvidence){
    assert(actions.includes(row.move));
    const checked=checkCaptureRetentionAction(board,row.move,task,row.proof);
    assert.deepEqual(checked,row.checked);assert.equal(checked.verified,true);legal++;
    if(candidate.positions[0].probes.some(p=>p.move===row.move)||candidate.positions[1].probes.some(p=>p.move===row.move))
      probeOutcomes[position.id][row.move]=checked.status;
    for(const seed of seeds){
      const encoder=createAllLegalBoundRayCueEncoder(mapping,{seed,maxCells:8,totalCurrent:12,maxCellCurrent:1.5,maxRelationCells:4});
      const cue=encoder.encode(board,row.move,task);assert.equal(cue.stimulation.length,8);assert.equal(cue.accounting.totalCurrent,12);
      assert(!cue.tokens.some(token=>/success|failure|safe|unsafe|certificate|recaptur/i.test(token)));cuePresentations++;
    }
  }
  assert.deepEqual(actions.sort(),position.allLegalEvidence.map(row=>row.move).sort());
}
assert.equal(legal,record.legalActionsIndependentlyVerified);assert.equal(cuePresentations,record.allLegalCuePresentations);
assert.deepEqual(probeOutcomes,record.candidateProbeOutcomes);
assert.deepEqual(probeOutcomes['rook-below'],{'e4e3':'failure','e4e5':'success'});
assert.deepEqual(probeOutcomes['rook-above'],{'e4e3':'success','e4e5':'failure'});
for(const move of ['e4e3','e4e5'])for(const seed of seeds){
  const enc=createAllLegalBoundRayCueEncoder(mapping,{seed,maxCells:8,totalCurrent:12,maxCellCurrent:1.5,maxRelationCells:4});
  const a=enc.encode(new Chess(candidate.positions[0].fen),move,task).stimulation.map(c=>c.index).sort((x,y)=>x-y);
  const b=enc.encode(new Chess(candidate.positions[1].fen),move,task).stimulation.map(c=>c.index).sort((x,y)=>x-y);
  assert.notDeepEqual(a,b,'Counterfactual probe cue did not change');
}
assert.equal(record.identicalCounterfactualProbeStimulationSets,0);
const audit={schema:'c01-training-development-counterfactual-independent-audit-v1',candidateSha256:sha(readFileSync(`${dir}/candidate.json`)),
  generatorSha256:record.sourceHashes[`${dir}/generate.mjs`],auditScriptSha256:sha(readFileSync(`${dir}/audit.mjs`)),
  sourcePinsVerified:Object.keys(record.sourceHashes).length,allLegalCertificatesReplayed:legal,
  allLegalCueReplays:cuePresentations,probeOrderingReverses:true,identicalCounterfactualProbeStimulationSets:0,
  status:'development candidate only; do not use for validation/final or interpret as neural evidence'};
writeFileSync(`${dir}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(audit));

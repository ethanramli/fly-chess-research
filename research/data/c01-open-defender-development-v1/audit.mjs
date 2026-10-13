import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {checkCaptureRetentionAction} from '../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs';
import {createAllLegalBoundRayCueEncoder} from '../../../.codebase/src/chess-input/bound-ray-relational-cue.mjs';

const dir='research/data/c01-open-defender-development-v1',sha=b=>createHash('sha256').update(b).digest('hex');
const candidate=JSON.parse(readFileSync(`${dir}/candidate.json`)),v=JSON.parse(readFileSync(`${dir}/verification.json`));
assert.equal(candidate.status,'exploratory-training-only; outcomes inspected');assert(candidate.exclusions.includes('never use as validation or final data'));
for(const [path,hash] of Object.entries(v.sourceHashes))assert.equal(sha(readFileSync(path)),hash,path);
const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping,legalRows=[];let cues=0;
for(const p of candidate.positions){const b=new Chess();b.loadPgn(p.pgn);assert.equal(b.fen(),p.fen);assert.deepEqual(p.task,{objective:'capture-retention',plies:1});
  const legal=b.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));assert.equal(legal.length,p.allLegalCount);assert.equal(legal.length,p.allLegalEvidence.length);
  for(const row of p.allLegalEvidence){assert(legal.includes(row.move));assert.deepEqual(checkCaptureRetentionAction(b,row.move,p.task,row.proof),row.checked);legalRows.push(row);
    for(const seed of v.seeds){const enc=createAllLegalBoundRayCueEncoder(mapping,{seed,maxCells:8,totalCurrent:12,maxCellCurrent:1.5,maxRelationCells:4});const cue=enc.encode(b,row.move,p.task);assert.equal(cue.stimulation.length,8);assert.equal(cue.accounting.totalCurrent,12);assert(!cue.tokens.some(t=>/success|failure|safe|unsafe|certificate|recaptur/i.test(t)));cues++;}}
  assert.deepEqual(p.probes.map(x=>x.move),candidate.probeMovesByFamily[p.familyId]);}
assert.equal(legalRows.length,v.independentlyCheckedLegalActions);assert.equal(cues,v.allLegalCuePresentations);
for(const family of new Set(candidate.positions.map(p=>p.familyId))){const pair=candidate.positions.filter(p=>p.familyId===family);assert.equal(pair.length,2);
  for(const move of candidate.probeMovesByFamily[family])assert.notEqual(pair[0].probes.find(x=>x.move===move).checked.status,pair[1].probes.find(x=>x.move===move).checked.status);}
const audit={schema:'c01-open-defender-development-independent-audit-v1',candidateSha256:sha(readFileSync(`${dir}/candidate.json`)),
  sourcePinsVerified:Object.keys(v.sourceHashes).length,independentLegalProofReplays:legalRows.length,allLegalCueReplays:cues,
  twoCounterfactualFamiliesReverseBothProbes:true,status:'training-development only; never validation/final; no neural evidence'};
writeFileSync(`${dir}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(audit));

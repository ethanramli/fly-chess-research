import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs';
import {createAllLegalBoundRayCueEncoder} from '../../../.codebase/src/chess-input/bound-ray-relational-cue.mjs';

const dir='research/data/c01-open-defender-development-v1';
if(['candidate.json','verification.json'].some(name=>existsSync(`${dir}/${name}`)))throw Error('Published artifact exists');
const task={objective:'capture-retention',plies:1};
const specs=[
  ['e-file-open','4r2k/8/4p3/8/p3Q3/8/8/1K6 w - - 0 1','r6k/8/4p3/8/p3Q3/8/8/1K6 w - - 0 1',['e4e6','e4a4']],
  ['d-file-mirror','k2r4/8/3p4/8/3Q3p/8/8/6K1 w - - 0 1','k6r/8/3p4/8/3Q3p/8/8/6K1 w - - 0 1',['d4d6','d4h4']],
];
const mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json',mappingBytes=readFileSync(mappingPath),mapping=JSON.parse(mappingBytes).mapping;
const sha=b=>createHash('sha256').update(b).digest('hex'),seeds=[20261011,20261012,20261013],positions=[];
let legalCount=0,cueCount=0;
for(const [id,firstFen,secondFen,probes] of specs)for(const [side,fen] of [['defender-a',firstFen],['defender-b',secondFen]]){
  const board=new Chess(fen);assert.equal(board.isCheck(),false);assert.equal(board.board().flat().filter(Boolean).length,6);
  const pgn=board.pgn(),all=[];
  for(const move of board.moves({verbose:true})){
    const uci=move.from+move.to+(move.promotion??''),proof=certifyCaptureRetentionAction(board,uci,task),checked=checkCaptureRetentionAction(board,uci,task,proof);
    assert.equal(checked.verified,true);all.push({move:uci,proof,checked});legalCount++;
    for(const seed of seeds){const enc=createAllLegalBoundRayCueEncoder(mapping,{seed,maxCells:8,totalCurrent:12,maxCellCurrent:1.5,maxRelationCells:4});const cue=enc.encode(board,uci,task);
      assert.equal(cue.stimulation.length,8);assert.equal(cue.accounting.totalCurrent,12);assert(!cue.tokens.some(t=>/success|failure|safe|unsafe|certificate|recaptur/i.test(t)));cueCount++;}
  }
  const rows=all.filter(row=>probes.includes(row.move));assert.deepEqual(rows.map(row=>row.move),probes);
  const expected=side==='defender-a'?['failure','success']:['success','failure'];assert.deepEqual(rows.map(row=>row.checked.status),expected);
  assert.equal(board.pgn(),pgn);positions.push({familyId:id,member:side,fen,pgn,task,probeMoves:probes,probes:rows,allLegalCount:all.length,allLegalEvidence:all});
}
for(const pair of [positions.slice(0,2),positions.slice(2,4)]){
  const inventories=pair.map(p=>new Chess(p.fen).board().flat().filter(Boolean).map(x=>`${x.color}:${x.type}`).sort());assert.deepEqual(inventories[0],inventories[1]);
  const familyMoves=specs.find(([id])=>id===pair[0].familyId)[3];
  for(const move of familyMoves)assert.notEqual(pair[0].probes.find(x=>x.move===move).checked.status,pair[1].probes.find(x=>x.move===move).checked.status);
}
const sourcePaths=['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs','.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs','.codebase/src/chess-input/bound-ray-relational-cue.mjs',
  '.codebase/src/chess-input/relational-chess-cue-v3.mjs',mappingPath,'package.json','package-lock.json','node_modules/chess.js/package.json',
  'node_modules/chess.js/dist/esm/chess.js','research/data/c01-open-defender-development-v1/generate.mjs'];
const candidate={schema:'c01-open-defender-development-candidate-v1',status:'exploratory-training-only; outcomes inspected',stratum:'open-defender',
  exclusions:['never use as validation or final data','not a frozen curriculum family','not learner evidence'],probeMovesByFamily:Object.fromEntries(specs.map(([id,,,moves])=>[id,moves])),positions,
  interpretation:'Two file-reflected six-piece families each contain a pair whose only counterfactual change is moving an open-line black rook defender; both capture outcomes reverse.'};
const verification={schema:'c01-open-defender-development-verification-v1',sourceHashes:Object.fromEntries(sourcePaths.map(p=>[p,sha(readFileSync(p))])),
  mappingSha256:sha(mappingBytes),families:2,positions:4,maxPieces:6,probesPerBoard:2,independentlyCheckedLegalActions:legalCount,
  allLegalCuePresentations:cueCount,seeds,cueDose:{cells:8,totalCurrent:12},probeOutcomes:Object.fromEntries(positions.map(p=>[`${p.familyId}:${p.member}`,Object.fromEntries(p.probes.map(x=>[x.move,x.checked.status]))])),
  scope:'Static, inspected training-development candidates only. No graph or neural evidence.'};
writeFileSync(`${dir}/candidate.json`,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});writeFileSync(`${dir}/verification.json`,JSON.stringify(verification,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({dir,families:2,positions:4,legalCount,cueCount,probeOutcomes:verification.probeOutcomes}));

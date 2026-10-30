import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs';
import {createAllLegalBoundRayCueEncoder} from '../../../.codebase/src/chess-input/bound-ray-relational-cue.mjs';

const root=process.cwd(),out='research/data/c01-counterfactual-development-v1';
if(['candidate.json','verification.json'].some(name=>existsSync(`${out}/${name}`)))
  throw Error('Development publication already exists; preserve it and choose a new version');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const task={objective:'capture-retention',plies:1},probes=['e4e3','e4e5'];
const fens={'rook-below':'7k/8/8/4p3/4Q3/4p3/K7/4r3 w - - 0 1','rook-above':'4r2k/8/8/4p3/4Q3/4p3/K7/8 w - - 0 1'};
const mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json';
const mappingBytes=readFileSync(mappingPath),mapping=JSON.parse(mappingBytes).mapping;
const seeds=[20261011,20261012,20261013],config=seed=>({seed,maxCells:8,totalCurrent:12,maxCellCurrent:1.5,maxRelationCells:4});
const positions=[],stimuli=[];let legalActions=0;
for(const [id,fen] of Object.entries(fens)){
  const board=new Chess(fen);assert.equal(board.isCheck(),false);assert.equal(board.board().flat().filter(Boolean).length,6);
  const pgn=board.pgn(),rows=[];
  for(const move of board.moves({verbose:true})){
    const uci=move.from+move.to+(move.promotion??''),proof=certifyCaptureRetentionAction(board,uci,task);
    const checked=checkCaptureRetentionAction(board,uci,task,proof);
    assert.equal(checked.verified,true);assert.equal(checked.status,proof.status);
    rows.push({move:uci,proof,checked});legalActions++;
    for(const seed of seeds){
      const encoder=createAllLegalBoundRayCueEncoder(mapping,config(seed)),cue=encoder.encode(board,uci,task);
      assert.equal(cue.stimulation.length,8);assert.equal(cue.accounting.totalCurrent,12);
      assert(!cue.tokens.some(token=>/success|failure|safe|unsafe|certificate|recaptur/i.test(token)));
      stimuli.push({position:id,move:uci,seed,stimulation:cue.stimulation.map(c=>c.index)});
    }
  }
  assert.deepEqual(probes.map(move=>rows.find(row=>row.move===move)?.proof.status),
    id==='rook-below'?['failure','success']:['success','failure']);
  assert.equal(board.pgn(),pgn);
  positions.push({id,fen,pgn,task,probes:rows.filter(row=>probes.includes(row.move)),allLegalCount:rows.length,
    allLegalEvidence:rows});
}
const stripped=positions.map(p=>new Chess(p.fen).board().flat().filter(Boolean)
  .map(piece=>({square:piece.square,color:piece.color,type:piece.type})).sort((a,b)=>a.color.localeCompare(b.color)||a.type.localeCompare(b.type)||a.square.localeCompare(b.square)));
for(let i=0;i<stripped[0].length;i++)if(stripped[0][i].type!=='r'||stripped[1][i].type!=='r')
  assert.deepEqual(stripped[0][i],stripped[1][i]);
assert.equal(stripped[0].filter(p=>p.type==='r').length,1);
for(const seed of seeds){
  const byMove=Object.fromEntries(positions.map(p=>[p.id,Object.fromEntries(stimuli.filter(x=>x.position===p.id&&x.seed===seed&&probes.includes(x.move)).map(x=>[x.move,new Set(x.stimulation)]))]));
  for(const move of probes){const a=byMove['rook-below'][move],b=byMove['rook-above'][move];assert(a&&b);assert.notDeepEqual([...a].sort((x,y)=>x-y),[...b].sort((x,y)=>x-y));}
}
const sourcePaths=[
  '.codebase/src/search-and-feedback/capture-retention-action-domain.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
  '.codebase/src/chess-input/bound-ray-relational-cue.mjs',
  '.codebase/src/chess-input/relational-chess-cue-v3.mjs',mappingPath,'package.json','package-lock.json',
  'research/data/c01-counterfactual-development-v1/generate.mjs',
  'node_modules/chess.js/package.json','node_modules/chess.js/dist/esm/chess.js'];
const hashes=Object.fromEntries(sourcePaths.map(path=>[path,sha(readFileSync(path))]));
const candidate={schema:'c01-training-development-counterfactual-v1',status:'exploratory-training-candidate-only',stratum:'blocked-defender',
  exclusions:['never use as validation or final data','outcomes were inspected during development','not a frozen C01 family or training schedule'],
  interpretation:'Two six-piece legal positions retain the same material, queen, targets and probe actions; moving the single black rook from e1 to e8 changes the available recapture and reverses both task outcomes.',positions};
const verification={schema:'c01-training-development-counterfactual-audit-v1',sourceHashes:hashes,
  mappingSha256:sha(mappingBytes),positionCount:2,maximumPieces:6,legalActionsIndependentlyVerified:legalActions,
  candidateProbeOutcomes:Object.fromEntries(positions.map(p=>[p.id,Object.fromEntries(p.probes.map(row=>[row.move,row.checked.status]))])),
  allLegalCuePresentations:stimuli.length,projectionSeeds:seeds,cueDose:{cells:8,totalCurrent:12},
  teacherOutcomeTokensInCues:0,identicalCounterfactualProbeStimulationSets:0,
  scope:'Static software-generated C01 training-development pair only; no neural graph, no validation/final data, no learning claim.'};
writeFileSync(`${out}/candidate.json`,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
writeFileSync(`${out}/verification.json`,JSON.stringify(verification,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,legalActions,stimuli:stimuli.length,verification}));

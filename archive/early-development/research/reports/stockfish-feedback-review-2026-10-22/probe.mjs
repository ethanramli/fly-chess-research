// User-authorized review during research pause. Eight numerical cells only;
// invented fixture root IDs and transcripts are not anatomical or engine evidence.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Chess} from 'chess.js';
import {SparseTrainer} from '../../../.codebase/src/supervised-baselines/trainer.mjs';
import {ReversalMemory} from '../../../.codebase/src/neural-learning/reversal-memory.mjs';
import {StockfishValueBrain} from '../../../.codebase/src/puzzle-learning/stockfish-value-brain.mjs';
import {certifyMate} from '../../../.codebase/src/search-and-feedback/mate-certificate.mjs';
import {gradeStockfishChoice,conservativeValueError} from '../../../.codebase/src/search-and-feedback/stockfish-feedback-rubric.mjs';
import {stockfishTarget} from '../../../.codebase/src/search-and-feedback/stockfish-target.mjs';

function fixture(){
  const graph={row:Int32Array.from([0,0,0,0,0,0,0,2,4]),col:Int32Array.from([0,1,0,1]),
    sign:Int8Array.from([1,1,1,1]),initial:Float32Array.from([1,1,1,1]),input:Int32Array.from([0]),output:Int32Array.from([7])};
  const mapping={readyForCandidateExperiment:true,groups:['left','right'].flatMap((side,i)=>[
    {side,mbonType:'MBON01',danType:'PAM02',kc:[i],edges:[2+i],dan:[{index:2+i*2,rootId:String(100+i*2)}]},
    {side,mbonType:'MBON12',danType:'PPL103',kc:[i],edges:[i],dan:[{index:3+i*2,rootId:String(101+i*2)}]}])};
  const model=new SparseTrainer(graph,{inputDim:1,outputs:1});
  const memory=new ReversalMemory(model,mapping);model.forward([0]);
  const brain=new StockfishValueBrain({model,memory,mapping,rest:Float32Array.from(model.h[model.steps]),
    encoder:{encode:()=>({stimulation:[{index:0,current:1.5}]})},
    readouts:{MBON12:[{index:6}],MBON01:[{index:7}]}});
  const board=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),task={objective:'forced-mate',plies:1};
  const engine={binarySha256:'a'.repeat(64),settingsHash:'b'.repeat(64)};
  const chosen='f7e7',child=new Chess();child.loadPgn(board.pgn());child.move(chosen);
  const review={criterion:'full-game-expected-score',context:{fen:board.fen(),pgn:board.pgn(),task},actor:'w',chosen,
    taskProof:certifyMate(child,'w',{plies:0}),engine,
    analyses:board.moves({verbose:true}).flatMap(move=>[100,200].map(budget=>{
      const after=new Chess();after.loadPgn(board.pgn());after.move(move);
      return {move:move.from+move.to+(move.promotion??''),budget,engine,fen:after.fen(),pgn:after.pgn(),completed:true,
        transcript:['info depth 10 score cp 0 wdl 0 0 1000 nodes 200 pv h8h7']};
    }))};
  return {brain,review};
}

const a=fixture(),receipt=await a.brain.replayValue(a.review);
assert.equal(receipt.taskEvidence.status,'failure');
assert.equal(receipt.outcomeChannel,'PPL103');
assert.equal(receipt.channel,'PAM02');
assert.equal(receipt.update.events,1);
const original=fixture(),grade=gradeStockfishChoice(original.review);
const forgedBudget=structuredClone(original.review);
for(const record of forgedBudget.analyses)record.transcript[0]=record.transcript[0].replace('nodes 200','nodes 1');
assert(gradeStockfishChoice(forgedBudget).selectedExpectedScore);
const multipv=stockfishTarget([
  'info depth 10 multipv 1 score cp 150 wdl 700 250 50 nodes 1000 pv e2e4',
  'info depth 10 multipv 2 score cp -150 wdl 50 250 700 nodes 1000 pv d2d4',
],{actor:'w',sideToMove:'w',completed:true});
assert.equal(multipv.utility,-0.65);
const pseudoShuffle=fixture();
const shuffled=await pseudoShuffle.brain.replayValue(pseudoShuffle.review,{condition:'shuffled',
  shuffle:{schema:'matched-stockfish-error-shuffle-v1',scheduleSha256:'c'.repeat(64),eventIndex:0,
    error:-Math.sign(receipt.error.error)*0.01}});
assert.equal(Math.abs(shuffled.deliveredError),0.01);
assert.notEqual(Math.abs(shuffled.deliveredError),Math.abs(receipt.error.error));
const terminal=fixture();terminal.review.chosen='f7h7';
const terminalBoard=new Chess();terminalBoard.loadPgn(terminal.review.context.pgn);terminalBoard.move('f7h7');
terminal.review.taskProof=certifyMate(terminalBoard,'w',{plies:0});
const terminalReceipt=await terminal.brain.replayValue(terminal.review,{condition:'outcome-only'});
assert.equal(terminalReceipt.taskEvidence.status,'success');
assert.equal(terminalReceipt.skipped,true);assert.equal(terminal.brain.memory.events,0);

const files=['.codebase/src/puzzle-learning/stockfish-value-brain.mjs',
  '.codebase/src/search-and-feedback/stockfish-feedback-rubric.mjs',
  '.codebase/src/search-and-feedback/stockfish-target.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/tests/puzzle-learning/stockfish-value-brain.test.mjs',fileURLToPath(import.meta.url)];
const result={schema:'stockfish-feedback-quality-review-probes-v1',createdAt:new Date().toISOString(),
  scope:'Synthetic interface observations, no full connectome, real engine call, efficacy or transfer experiment.',
  sources:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
  observations:{
    combinedFeedback:{verifiedTaskStatus:receipt.taskEvidence.status,declaredOutcomeChannel:receipt.outcomeChannel,
      actualChannel:receipt.channel,updates:receipt.update.events,
      finding:'One value-error update occurs; no separate checked-outcome pulse is delivered.'},
    selectedAction:{reviewChosen:a.review.chosen,freshUnaidedChoice:receipt.rootAssessment.choice,
      choiceAgreement:a.review.chosen===receipt.rootAssessment.choice,
      finding:'Adapter requires a legal reviewed action, not agreement with recorded unaided choice; replay role must be explicit.'},
    budgetProvenance:{declaredBudgets:grade.budgets,reportedNodes:1,accepted:true,
      finding:'Adapter alone does not bind declared budgets/completion to authentic UCI transactions.'},
    multiplePrincipalVariations:{acceptedUtility:multipv.utility,selectedLastVariation:2,
      finding:'Parser accepts latest score from multipv 2; collector must pin MultiPV=1 or parser must explicitly select principal variation 1.'},
    matchedShuffle:{informativeError:receipt.error.error,acceptedShuffledError:shuffled.deliveredError,
      finding:'Hash-shaped schedule ID is insufficient to verify schedule membership or matched magnitude.'},
    terminalOutcome:{verifiedStatus:terminalReceipt.taskEvidence.status,skipped:terminalReceipt.skipped,
      updates:terminal.brain.memory.events,reason:terminalReceipt.reason,
      finding:'Even outcome-only skips a certified terminal success because the shared adapter requires a child-action value.'},
    predictionVersusQuality:{poorMoveWithUnderestimate:conservativeValueError({selectedExpectedScore:{low:0.6,high:0.6}},-0.8).error,
      goodMoveWithOverestimate:conservativeValueError({selectedExpectedScore:{low:0.9,high:0.9}},1).error,
      finding:'Residual sign reflects value correction, not move-quality valence. These are mathematical examples, not a bug by themselves.'}},
  verdict:'Not ready to qualify as validated high-quality integrated feedback.'};
const out=new URL('./probe-results.json',import.meta.url);
assert(!existsSync(out),'Preserve prior probe publication');
writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({observations:Object.keys(result.observations).length,output:fileURLToPath(out),verdict:result.verdict}));

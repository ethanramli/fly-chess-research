// No graph or learned weights. Training-only, fixed rule over the CURRENT encoder's tokens.
// Rule was selected from code semantics, not fitted to task labels.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import os from 'node:os';
import {createPublicAttackMapEncoderV2} from '../../../.codebase/src/chess-input/public-attack-map-cue-v2.mjs';
import {checkCaptureRetentionAction} from '../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs';
assert(process.execArgv.includes('--max-old-space-size=256'));
const directory='research/data/lichess-stage1-synthetic-v1';
const rows=readFileSync(`${directory}/train.jsonl`,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const plan=JSON.parse(readFileSync(`${directory}/train-plan.json`,'utf8'));
const mapping={readyForCandidateExperiment:true,groups:['MBON01','MBON12','MBON07'].map((mbonType,i)=>({mbonType,kc:[i]}))};
const encoder=createPublicAttackMapEncoderV2(mapping);
const decisions=new Map(),errors=[];
let actions=0,correct=0,captures=0,captureCorrect=0,positive=0,truePositive=0,falsePositive=0,falseNegative=0;
for(const row of rows){
  assert.equal(row.split,'train');const {context,candidates}=row.lesson;
  const board=new Chess();board.loadPgn(context.pgn);assert.equal(board.fen(),context.fen);
  const reviewed=[];
  for(const candidate of candidates){
    const checked=checkCaptureRetentionAction(board,candidate.move,context.task,candidate.proof);
    assert.equal(checked.status,candidate.status);assert.equal(checked.learningAllowed,true);
    const {tokens}=encoder.encode(board,candidate.move,context.task);
    const isCapture=tokens.includes('act:capture');
    const attacks=tokens.filter(token=>token.startsWith('act:capture|att:'));
    const predicted=isCapture&&attacks.length>0&&attacks.every(token=>token.endsWith('att:none')||token.endsWith(':pin'));
    const expected=checked.status==='success';
    actions++;correct+=Number(predicted===expected);captures+=Number(isCapture);captureCorrect+=Number(isCapture&&predicted===expected);
    positive+=Number(expected);truePositive+=Number(predicted&&expected);falsePositive+=Number(predicted&&!expected);falseNegative+=Number(!predicted&&expected);
    if(predicted!==expected)errors.push({lessonId:row.lesson.lessonId,move:candidate.move,tokens,predicted,expected});
    reviewed.push({move:candidate.move,score:Number(predicted),expected});
  }
  const best=Math.max(...reviewed.map(x=>x.score)),top=reviewed.filter(x=>x.score===best);
  decisions.set(row.lesson.lessonId,{correct:top.length===1&&top[0].expected,unique:top.length===1,reviewed});
}
const boardCorrect=[...decisions.values()].filter(x=>x.correct).length;
const pairsCorrect=plan.counterfactualPairs.filter(p=>decisions.get(p.firstPanelId).correct&&decisions.get(p.secondPanelId).correct).length;
const probes=plan.probeActions.map(p=>decisions.get(p.panelId).reviewed.find(x=>x.move===p.actionId));
const result={scope:'Training-only fixed symbolic comparator using the current encoder tokens; no neural simulation, parameter fitting or final-set inference',
  rule:'capture AND every supplied attacker token is none or geometrically pinned',
  counts:{boards:rows.length,boardCorrect,pairs:plan.counterfactualPairs.length,pairsCorrect,actions,correct,captures,captureCorrect,
    positive,truePositive,falsePositive,falseNegative,probes:probes.length,probesCorrect:probes.filter(x=>Boolean(x.score)===x.expected).length},errors,
  rssMiB:process.memoryUsage().rss/2**20,freeMiB:os.freemem()/2**20};
assert(result.rssMiB<2048&&result.freeMiB>=256);
writeFileSync('research/reports/research-maturity-review-2026-10-30/training-shortcut-output.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));

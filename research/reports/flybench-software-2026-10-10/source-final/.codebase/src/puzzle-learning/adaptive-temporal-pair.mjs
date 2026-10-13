import assert from 'node:assert/strict';
import { verifiedExperience } from '../search-and-feedback/verified-feedback.mjs';

// Select from current unaided scores. The teacher supplies checked consequences,
// never a gain delta. Controls replay the informative schedule in the runner.
export function selectTemporalPair(board, task, assessment, experiences, successMove) {
  const legal = board.moves({verbose:true}).map(m => m.from+m.to+(m.promotion??'')).sort();
  assert.equal(assessment.fen, board.fen());
  assert.equal(assessment.pgn, board.pgn());
  assert.deepEqual(assessment.task, task);
  assert.deepEqual(assessment.rows.map(r=>r.move).sort(), legal);
  assert(assessment.rows.every(r=>Number.isFinite(r.score)));
  const best = Math.max(...assessment.rows.map(r=>r.score));
  const top = assessment.rows.filter(r=>r.score===best);
  assert.equal(assessment.choice, top.length===1 ? top[0].move : null);
  if (top.length!==1) return {moves:[],reason:'tied-choice'};
  const check = move => {
    const e=experiences.get(move); assert(e, 'Missing consequence evidence');
    const v=verifiedExperience(board,move,task,e.proof);
    for(const key of ['status','actor','learningAllowed','certificateSha256']) assert.equal(e[key],v[key]);
    return v;
  };
  const chosen=check(top[0].move);
  if(chosen.status!=='failure') return {moves:[],reason:chosen.status==='success'?'verified-success':'unknown-choice'};
  const alternative=check(successMove);
  if(alternative.status!=='success') return {moves:[],reason:'unverified-alternative'};
  return {moves:[chosen.move,successMove],reason:'current-verified-error'};
}

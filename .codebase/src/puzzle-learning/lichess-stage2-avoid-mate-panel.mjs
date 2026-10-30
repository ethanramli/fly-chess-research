// Bind source-history Lichess positions to Stage 2 bounded avoid-mate families.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {verifiedExperience} from '../search-and-feedback/verified-feedback.mjs';

const strata=['actual-mate','escapable-check','mandatory-defense','misleading-improving-move'];
const uci=move=>move.from+move.to+(move.promotion??'');
const sha256=value=>createHash('sha256').update(value).digest('hex');

export function bindLichessStage2AvoidMatePanel(record,family){
  assert(['train','validation','final'].includes(record?.split));
  const lesson=record.lesson,history=record.history;
  assert.equal(lesson?.schema,'lichess-avoid-mate-lesson-v1');
  assert.equal(history?.schema,'lichess-history-binding-v1');
  assert.equal(history.historyStatus,'verified-standard-start-prefix');
  assert.equal(history.puzzleId,lesson.puzzleId);assert.equal(history.gameId,lesson.gameId);
  assert.deepEqual(history.context?.fen,lesson.context?.fen);
  assert.deepEqual(history.context?.pgn,lesson.context?.pgn);
  assert.equal(sha256(history.context.pgn),history.prefixPgnSha256,'Stage 2 source-prefix hash mismatch');
  assert.equal(lesson.stage2DomainEligible,true);
  const task=lesson.context?.task;
  if(family?.stratum==='actual-mate'||family?.stratum==='escapable-check')
    assert(task?.objective==='forced-mate'&&[1,3].includes(task.plies));
  else assert.deepEqual(task,{objective:'avoid-mate',plies:3});
  assert.equal(family?.split,record.split);assert.equal(family?.stage,2);
  assert.equal(family?.puzzleId,lesson.puzzleId);assert.equal(family?.gameId,lesson.gameId);
  assert.match(family?.panelId??'',/^[A-Za-z0-9_-]{1,128}$/);
  assert.match(family?.familyId??'',/^[A-Za-z0-9_-]{1,128}$/);
  assert.match(family?.registrationSha256??'',/^[a-f0-9]{64}$/);
  assert(strata.includes(family?.stratum),'Stage 2 family requires a registered semantic stratum');
  const board=new Chess();board.loadPgn(lesson.context.pgn);
  assert.equal(board.fen(),lesson.context.fen,'Stage 2 lesson history/FEN mismatch');
  assert(board.board().flat().filter(Boolean).length<=6,'Stage 2 avoid-mate panel exceeds six-piece bound');
  const legal=board.moves({verbose:true}).map(uci).sort();
  assert(legal.length>0&&legal.length<=256);
  assert(Array.isArray(lesson.candidates));
  const candidates=[...lesson.candidates].sort((a,b)=>a.move.localeCompare(b.move));
  assert.deepEqual(candidates.map(row=>row.move),legal,'Require exact all-legal Stage 2 consequences');
  const context=structuredClone(lesson.context);
  const experiences=candidates.map(candidate=>{
    const checked=verifiedExperience(board,candidate.move,task,candidate.proof);
    assert.equal(checked.learningAllowed,true,'Unknown Stage 2 consequence cannot enter a teaching panel');
    for(const key of ['status','actor','certificateSha256'])
      assert.equal(candidate[key],checked[key],`Prepared Stage 2 ${key} does not replay`);
    return {context:structuredClone(context),move:candidate.move,proof:structuredClone(candidate.proof),
      status:checked.status,actor:checked.actor,learningAllowed:true,
      certificateSha256:checked.certificateSha256};
  });
  assert(experiences.some(row=>row.status==='success'));
  assert(experiences.some(row=>row.status==='failure'));
  return {panelId:family.panelId,familyId:family.familyId,stage:2,split:record.split,
    stratum:family.stratum,taskCriterion:task.objective,puzzleId:lesson.puzzleId,gameId:lesson.gameId,
    familyRegistrationSha256:family.registrationSha256,sourcePrefixPgnSha256:history.prefixPgnSha256,
    context,experiences,scope:`${record.split}-only Stage 2 bounded avoid-mate panel; all legal actions independently checked; not a full-game safety judgement`};
}

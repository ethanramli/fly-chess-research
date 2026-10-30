// Bind source-bound Lichess lessons to split-specific Stage 1 families and
// capture fresh all-legal rankings without allowing evaluation panels to teach.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {checkCaptureRetentionAction} from '../search-and-feedback/capture-retention-action-domain.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const STRATA=['open-defender','blocked-defender','absent-defender','pinned-apparent-defender'];
const uci=move=>move.from+move.to+(move.promotion??'');
const sha256=value=>createHash('sha256').update(value).digest('hex');

function positionBoard(context){
  assert(typeof context?.pgn==='string'&&context.pgn.length<=65536);
  const board=new Chess();board.loadPgn(context.pgn);
  assert.equal(board.fen(),context.fen,'Task PGN differs from its declared position');
  return board;
}

function occupancy(board){
  return new Map(board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&[
    String.fromCharCode(97+col)+(8-row),`${piece.color}:${piece.type}`]).filter(Boolean)));
}

function occupancyDiff(before,after){
  const a=occupancy(before),b=occupancy(after);
  return [...new Set([...a.keys(),...b.keys()])].sort().flatMap(square=>{
    const from=a.get(square)??null,to=b.get(square)??null;
    return from===to?[]:[{square,before:from,after:to}];
  });
}

function verifySyntheticSourceTask(record,history,lesson){
  const taskPosition=record.syntheticPosition,context=lesson.context;
  assert.equal(taskPosition?.schema,'lichess-synthetic-task-position-v1');
  assert.match(taskPosition.sourceRecordSha256??'',/^[a-f0-9]{64}$/);
  assert.equal(record.sourceRecordSha256,taskPosition.sourceRecordSha256);
  assert.equal(context.historyKind,'synthetic-root-position');
  assert.equal(context.parentSourceRecordSha256,taskPosition.sourceRecordSha256);
  assert.deepEqual(context.task,{objective:'capture-retention',plies:1});
  assert.equal(taskPosition.sourceFen,history.context?.fen);
  assert.equal(taskPosition.taskFen,context.fen);
  assert(Array.isArray(taskPosition.mutation)&&taskPosition.mutation.length>0);
  assert(Array.isArray(taskPosition.occupancyDiff));
  const source=positionBoard(history.context),task=positionBoard(context);
  assert.equal(history.prefixPgnSha256,sha256(history.context.pgn),'Authentic source-prefix hash mismatch');
  assert.equal(history.context.fen,taskPosition.sourceFen);
  assert.equal(context.parentSourceRecordSha256,taskPosition.sourceRecordSha256);
  assert.equal(task.history().length,0,'Synthetic task PGN must have no played plies');
  assert.equal(taskPosition.sideToMove,task.turn(),'Synthetic side-to-move binding mismatch');
  assert(occupancy(task).size<=6,'Stage 1 synthetic task exceeds the six-piece bound');
  const fields=context.fen.split(' ');
  assert.equal(fields.length,6,'Require a complete synthetic FEN');
  assert.equal(fields[2],'-','Stage 1 synthetic tasks cannot retain castling rights');
  assert.equal(fields[3],'-','Stage 1 synthetic tasks cannot retain en-passant rights');
  assert.deepEqual(taskPosition.occupancyDiff,occupancyDiff(source,task),
    'Synthetic task occupancy diff is incomplete or does not match its source');
  assert.deepEqual(taskPosition.mutation,taskPosition.occupancyDiff,
    'Synthetic mutation must be the complete, canonical occupancy diff');
  const identity=sha256(JSON.stringify({taskFen:context.fen,historyKind:context.historyKind,
    sourceRecordSha256:taskPosition.sourceRecordSha256,mutation:taskPosition.mutation,task:context.task}));
  assert.equal(taskPosition.taskPositionSha256,identity,'Synthetic task-position identity mismatch');
  return {source,task};
}

function bindLichessPanel(record,family,expectedSplit,scope){
  assert.equal(record?.split,expectedSplit,`Expected ${expectedSplit} source row`);
  const lesson=record.lesson,history=record.history;
  assert.equal(lesson?.schema,'lichess-capture-lesson-v1');
  assert.equal(history?.schema,'lichess-history-binding-v1');
  assert.equal(history.historyStatus,'verified-standard-start-prefix');
  assert.equal(lesson.stage1DomainEligible,true);
  assert.equal(history.puzzleId,lesson.puzzleId);assert.equal(history.gameId,lesson.gameId);
  const synthetic=lesson.context?.historyKind==='synthetic-root-position';
  if(synthetic)verifySyntheticSourceTask(record,history,lesson);
  else{
    assert.equal(history.context?.fen,lesson.context?.fen,'Prepared FEN differs from source-bound history');
    assert.equal(history.context?.pgn,lesson.context?.pgn,'Prepared PGN differs from source-bound history');
    assert.equal(sha256(lesson.context.pgn),history.prefixPgnSha256,'Source-prefix identity mismatch');
  }
  assert(typeof lesson.context?.pgn==='string'&&lesson.context.pgn.length<=65536);
  assert.equal(family?.split,expectedSplit);assert.equal(family?.stage,1);
  assert.equal(family?.puzzleId,lesson.puzzleId);
  if(lesson.lessonId!==undefined)assert.equal(family?.lessonId,lesson.lessonId);
  assert.match(family?.panelId??'',/^[A-Za-z0-9_-]{1,128}$/);
  assert.match(family?.familyId??'',/^[A-Za-z0-9_-]{1,128}$/);
  assert(isHash(family?.registrationSha256),'Require pinned family assignment');
  assert(STRATA.includes(family?.stratum),'Stage 1 family requires a registered semantic stratum');

  const task=lesson.context.task;
  assert.deepEqual(task,{objective:'capture-retention',plies:1});
  const board=positionBoard(lesson.context);
  const legal=board.moves({verbose:true}).map(uci).sort();
  assert(legal.length>0&&legal.length<=256);
  assert(Array.isArray(lesson.candidates));
  const candidates=[...lesson.candidates].sort((a,b)=>a.move.localeCompare(b.move));
  assert.deepEqual(candidates.map(candidate=>candidate.move),legal,'Require exact all-legal candidate coverage');
  const experiences=candidates.map(candidate=>{
    const checked=checkCaptureRetentionAction(board,candidate.move,task,candidate.proof);
    assert.notEqual(checked.status,'unknown','Unknown teacher evidence cannot enter a training panel');
    for(const key of ['status','actor','learningAllowed','certificateSha256'])
      assert.equal(candidate[key],checked[key],`Prepared Lichess ${key} does not replay`);
    assert.equal(checked.learningAllowed,true);
    return {context:structuredClone(lesson.context),move:candidate.move,proof:structuredClone(candidate.proof),
      status:checked.status,actor:checked.actor,learningAllowed:true,
      certificateSha256:checked.certificateSha256};
  });
  assert(experiences.some(experience=>experience.status==='success'));
  assert(experiences.some(experience=>experience.status==='failure'));
  return {panelId:family.panelId,familyId:family.familyId,stage:1,split:expectedSplit,
    stratum:family.stratum??null,taskCriterion:task.objective,
    familyRegistrationSha256:family.registrationSha256,puzzleId:lesson.puzzleId,gameId:lesson.gameId,
    sourcePrefixPgnSha256:history.prefixPgnSha256,
    sourceRecordSha256:synthetic?record.sourceRecordSha256:null,
    taskPositionSha256:synthetic?record.syntheticPosition.taskPositionSha256:null,
    context:structuredClone(lesson.context),experiences,
    scope};
}

export function bindLichessTrainingPanel(record,family){
  return bindLichessPanel(record,family,'train',
    'Training-only Stage 1 panel; prepared source-prefix identity and every legal task consequence replayed; independent source/family audit remains required; not overall move quality');
}

export function bindLichessEvaluationPanel(record,family){
  assert(['validation','final'].includes(record?.split),'Evaluation panels must be validation or final');
  return bindLichessPanel(record,family,record.split,
    `${record.split}-only Stage 1 evaluation panel; source history and every legal consequence replayed; no teaching is performed`);
}

async function assessLichessPanel(panel,brain,expectedSplit){
  assert.equal(panel?.split,expectedSplit);assert([1,2].includes(panel?.stage));
  assert.equal(typeof brain?.assess,'function');assert.equal(typeof brain?.memoryFingerprint,'function');
  if(panel.context.historyKind==='synthetic-root-position'){
    assert.match(panel.sourcePrefixPgnSha256??'',/^[a-f0-9]{64}$/);
    assert.match(panel.sourceRecordSha256??'',/^[a-f0-9]{64}$/);
    assert.match(panel.taskPositionSha256??'',/^[a-f0-9]{64}$/);
  }
  const board=positionBoard(panel.context);
  const history=board.pgn(),task=panel.context.task,moves=board.moves({verbose:true});
  const memoryHash=brain.memoryFingerprint();
  const raw=await brain.assess(board,moves,task);
  assert.equal(board.pgn(),history,'Assessment changed source history');
  assert.equal(brain.memoryFingerprint(),memoryHash,'Unaided assessment changed persistent memory');
  const legal=moves.map(uci).sort(),rows=[...raw.rows].sort((a,b)=>a.move.localeCompare(b.move));
  assert.deepEqual(rows.map(row=>row.move),legal,'Require a fresh all-legal learner ranking');
  assert(rows.every(row=>Number.isFinite(row.score)),'Non-finite learner score');
  const top=Math.max(...rows.map(row=>row.score));
  const tiedTopMoves=rows.filter(row=>row.score===top).map(row=>row.move);
  const choice=tiedTopMoves.length===1?tiedTopMoves[0]:null;
  assert.equal(raw.choice,choice,'Learner choice must agree with its ranking, including ties');
  return {panelId:panel.panelId,familyId:panel.familyId,stage:panel.stage,split:expectedSplit,
    stratum:panel.stratum,taskCriterion:task.objective,
    experiences:structuredClone(panel.experiences),
    assessment:{fen:board.fen(),pgn:history,task:structuredClone(task),memoryHash,
      rows,choice,tiedTopMoves,evaluations:rows.length},
    scope:expectedSplit==='train'
      ?'Unaided all-legal training assessment before consequence feedback; tie is recorded as no unique choice'
      :`Unaided all-legal ${expectedSplit} assessment; read-only and never taught`};
}

export async function assessLichessTrainingPanel(panel,brain){
  const result=await assessLichessPanel(panel,brain,'train');
  return {...result,scope:'Unaided all-legal training assessment before consequence feedback; tie is recorded as no unique choice'};
}

export async function assessLichessEvaluationPanel(panel,brain){
  assert(['validation','final'].includes(panel?.split),'Evaluation assessment requires validation/final data');
  const result=await assessLichessPanel(panel,brain,panel.split);
  return {...result,scope:`Unaided all-legal ${panel.split} assessment; read-only and never taught`};
}

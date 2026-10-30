// Independent validation-only source/history/consequence replay. Never opens final rows or loads a learner.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,statSync,writeFileSync,renameSync} from 'node:fs';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {checkCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';

const {values:a}=parseArgs({options:{rows:{type:'string'},source:{type:'string'},prepared:{type:'string'},candidateAudit:{type:'string'},out:{type:'string'}}});
assert(a.rows&&a.source&&a.prepared&&a.candidateAudit&&a.out&&!existsSync(a.out));
const root=resolve('.'),inside=path=>{const p=resolve(path),r=relative(root,p);assert(r===''||!r.startsWith('..')&&!isAbsolute(r),'Path escapes workspace');return p;};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=(path,max)=>{const p=inside(path);assert(statSync(p).size<=max,`Input exceeds ${max} bytes`);return readFileSync(p);};
const rowsBytes=read(a.rows,64*2**20),sourceBytes=read(join(a.source,'manifest.json'),2**20);
const source=JSON.parse(sourceBytes),preparedBytes=read(join(a.prepared,'manifest.json'),2**20),prepared=JSON.parse(preparedBytes);
const candidateAuditBytes=read(a.candidateAudit,2**20),candidateAudit=JSON.parse(candidateAuditBytes);
assert.equal(candidateAudit.schema,'lichess-validation-stage1-prefilter-audit-v2');assert.equal(candidateAudit.passed,true);
assert.equal(candidateAudit.finalSplitInspected,false);assert.equal(candidateAudit.graphLaunchAuthorized,false);
assert.equal(source.schema,'lichess-source-game-pgn-batch-v1');assert.equal(source.sourceSplit,'validation');
assert.equal(source.status,'complete-response-id-coverage-verified');
assert.equal(source.sourceRows.sha256,sha(rowsBytes));assert.equal(source.api.responseSha256,sha(read(join(a.source,'response.pgn'),24*2**20)));
const rows=rowsBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
const recordsBytes=read(join(a.prepared,'lessons.jsonl'),64*2**20),records=recordsBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
assert.equal(prepared.schema,'lichess-prepared-lessons-v1');assert.equal(prepared.split,'validation');
assert.equal(prepared.input.sha256,sha(rowsBytes));assert.equal(prepared.counts.sourceRows,rows.length);
assert.equal(prepared.counts.prepared,rows.length);assert.equal(prepared.counts.rejected,0);
assert.equal(prepared.outputSha256,sha(recordsBytes));assert.equal(prepared.neuralEventsDelivered,0);
assert.equal(prepared.graphLaunchAuthorized,false);assert.equal(records.length,rows.length);
const ids=rows.map(row=>row.source?.gameId);assert(ids.every(id=>typeof id==='string'&&/^[A-Za-z0-9]{8}$/.test(id)));
assert.equal(new Set(ids).size,ids.length);assert.deepEqual([...source.api.requestIds].sort(),[...ids].sort());
assert.deepEqual(Object.keys(source.games).sort(),ids.map(id=>id+'.pgn').sort());
const task={objective:'capture-retention',plies:1};let eligible=0,success=0,failure=0,unknown=0,plies=0;
const position=board=>board.fen().split(' ').slice(0,4).join(' '),uci=move=>move.from+move.to+(move.promotion??'');
for(let index=0;index<rows.length;index++){
  const row=rows[index],record=records[index],lesson=record.lesson,binding=record.history,id=row.source.gameId;
  assert.equal(row.schema,'lichess-puzzle-source-row-v1');assert.equal(record.split,'validation');
  assert.equal(lesson.schema,'lichess-capture-lesson-v1');assert.equal(binding.schema,'lichess-history-binding-v1');
  assert.equal(lesson.puzzleId,row.puzzleId);assert.equal(lesson.gameId,id);assert.equal(binding.puzzleId,row.puzzleId);
  const gameBytes=read(join(a.source,id+'.pgn'),65536),gameHash=sha(gameBytes),pgn=gameBytes.toString('utf8');
  assert.equal(source.games[id+'.pgn'],gameHash);assert.equal(prepared.sourceGames[resolve(a.source,id+'.pgn')],gameHash);
  const board=new Chess();board.loadPgn(pgn);const headers=board.getHeaders();assert.equal(headers.GameId,id);
  const site=new URL(headers.Site),siteMatch=site.pathname.match(/^\/(?:game\/)?([A-Za-z0-9]{8})\/?$/);
  assert.equal(site.hostname,'lichess.org');assert(siteMatch&&siteMatch[1]===id);
  const history=board.history({verbose:true});assert(history.length>0&&history.length<=512);assert.equal(history[0].before,DEFAULT_POSITION);
  const initial=new Chess(row.initialFen).fen(),fields=initial.split(' ');
  const setup=(Number(fields[5])-1)*2+(fields[1]==='w'?1:2);
  assert.equal(history[setup-1]?.before,initial);assert.equal(uci(history[setup-1]),row.setupMove);
  assert.equal(history[setup-1].after,new Chess(row.solverFen).fen());assert.equal(binding.setupPly,setup);
  assert.equal(binding.setupMove,row.setupMove);assert.equal(binding.sourcePgnSha256,gameHash);
  assert.equal(binding.gameId,id);assert.equal(binding.historyStatus,'verified-standard-start-prefix');
  assert.equal(lesson.context.task.objective,task.objective);assert.equal(lesson.context.task.plies,task.plies);
  const context=new Chess();context.loadPgn(lesson.context.pgn);
  assert.equal(context.fen(),lesson.context.fen);assert.equal(context.fen(),history[setup-1].after);
  assert.deepEqual(context.history(),history.slice(0,setup).map(move=>move.san));
  assert.equal(binding.prefixPgnSha256,sha(Buffer.from(lesson.context.pgn)));
  const legal=board.moves({verbose:true}).map(uci).sort(),candidateMoves=lesson.candidates.map(item=>item.move).sort();
  assert.deepEqual(candidateMoves,legal);assert.equal(lesson.candidates.length,legal.length);
  const checked=checkCaptureRetentionActions(board,task,lesson.candidates);
  const counts={success:0,failure:0,unknown:0};
  for(let i=0;i<checked.length;i++){
    const item=lesson.candidates[i],proof=checked[i];assert.equal(item.status,proof.status);
    assert.equal(item.certificateSha256,proof.certificateSha256);assert.equal(item.learningAllowed,proof.learningAllowed);
    counts[proof.status]++;success+=Number(proof.status==='success');failure+=Number(proof.status==='failure');unknown+=Number(proof.status==='unknown');
  }
  assert.deepEqual(lesson.counts,counts);const pieces=board.board().flat().filter(Boolean).length;
  const isEligible=pieces<=6&&counts.success>0&&counts.failure>0&&counts.unknown===0;
  assert.equal(lesson.pieceCount,pieces);assert.equal(lesson.stage1DomainEligible,isEligible);
  assert.equal(lesson.neuralEventsDelivered,0);eligible+=Number(isEligible);plies+=history.length;
}
assert.equal(eligible,prepared.counts.stage1DomainEligible);assert.equal(unknown,prepared.counts.unknownActions);
const result={schema:'lichess-validation-lessons-audit-v1',passed:true,created:new Date().toISOString(),
  rowsSha256:sha(rowsBytes),sourceManifestSha256:sha(sourceBytes),preparedManifestSha256:sha(preparedBytes),
  preparedLessonsSha256:sha(recordsBytes),candidateAuditSha256:sha(candidateAuditBytes),
  puzzleCount:rows.length,sourceGames:ids.length,sourcePlies:plies,stage1DomainEligible:eligible,
  consequenceActions:{success,failure,unknown},finalSplitInspected:false,neuralEventsDelivered:0,
  eligibleForNeuralTeaching:false,relationFamilyDisjointnessEstablished:false,graphLaunchAuthorized:false,
  scope:'Validation source histories and all-legal one-reply certificates independently replayed; no family split, neural teaching, or launch authorization'};
const output=inside(a.out),partial=output+'.partial';writeFileSync(partial,JSON.stringify(result,null,2)+'\n',{flag:'wx'});renameSync(partial,output);
console.log(JSON.stringify(result));

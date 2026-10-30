// Independent bounded integration audit for a single public API development sample.
// Replays raw PGN directly and uses the separate consequence checker, not the producer.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,renameSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';

const {values:a}=parseArgs({options:{prepared:{type:'string'},out:{type:'string'}}});
assert(a.prepared&&a.out&&!existsSync(a.out),'Require prepared directory and fresh audit output');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=(path,max)=>{assert(statSync(path).size<=max,'Audit input exceeds bound');return readFileSync(path);};
const manifestPath=join(a.prepared,'manifest.json'),manifestBytes=read(manifestPath,65536);
const manifest=JSON.parse(manifestBytes);
assert.equal(manifest.schema,'lichess-prepared-lessons-v1');
assert.equal(manifest.input.format,'PuzzleAndGame');assert.equal(manifest.split,'development');
assert.equal(manifest.counts.sourceRows,1);assert.equal(manifest.counts.prepared,1);assert.equal(manifest.counts.rejected,0);
for(const [path,expected] of Object.entries(manifest.sources))assert.equal(sha(read(path,4*1024*1024)),expected,`Changed source ${path}`);
const inputBytes=read(manifest.input.path,262144);assert.equal(sha(inputBytes),manifest.input.sha256);
const payload=JSON.parse(inputBytes);
assert(!/^\s*</.test(payload.game.pgn));assert(Buffer.byteLength(payload.game.pgn)<=65536);
const source=new Chess();source.loadPgn(payload.game.pgn);
const history=source.history({verbose:true}),last=history.at(-1);
assert.equal(history[0].before,DEFAULT_POSITION);assert(history.length<=512);
assert.equal(history.length,payload.puzzle.initialPly+1);
assert.equal(last.from+last.to+(last.promotion??''),payload.puzzle.lastMove);
assert.equal(source.fen().split(' ').slice(0,4).join(' '),new Chess(payload.puzzle.fen).fen().split(' ').slice(0,4).join(' '));
const body=read(join(a.prepared,'lessons.jsonl'),2*1024*1024);assert.equal(sha(body),manifest.outputSha256);
const lines=body.toString('utf8').trim().split('\n');assert.equal(lines.length,1);
const record=JSON.parse(lines[0]),lesson=record.lesson,binding=record.history;
assert.equal(record.split,'development');assert.equal(lesson.puzzleId,payload.puzzle.id);
assert.equal(lesson.gameId,payload.game.id);assert.equal(binding.sourcePgnSha256,sha(payload.game.pgn));
assert.equal(binding.prefixPgnSha256,sha(lesson.context.pgn));assert.equal(binding.setupPly,history.length);
assert.deepEqual(binding.context,{fen:lesson.context.fen,pgn:lesson.context.pgn});
const board=new Chess();board.loadPgn(lesson.context.pgn);
assert.equal(board.fen(),source.fen());assert.deepEqual(board.history(),source.history());
assert.equal(lesson.context.fen,source.fen());
assert.deepEqual(Object.keys(lesson.context).sort(),['fen','pgn','task']);
assert.deepEqual(lesson.context.task,{objective:'capture-retention',plies:1});
assert(!board.isGameOver(),'This audit expects a nonterminal development sample');
const legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).sort();
assert.deepEqual(lesson.candidates.map(c=>c.move),legal);
const counts={success:0,failure:0,unknown:0};
for(const candidate of lesson.candidates){
  assert.deepEqual(candidate.context,lesson.context);
  const checked=checkCaptureRetentionAction(board,candidate.move,lesson.context.task,candidate.proof);
  assert.equal(candidate.status,checked.status);assert.equal(candidate.actor,board.turn());
  assert.equal(candidate.learningAllowed,checked.learningAllowed);
  assert.equal(candidate.certificateSha256,checked.certificateSha256);counts[checked.status]++;
}
assert.deepEqual(lesson.counts,counts);
const pieceCount=board.board().flat().filter(Boolean).length,reasons=[];
if(pieceCount>6)reasons.push('exceeds-stage-1-six-piece-limit');
if(counts.unknown)reasons.push('incomplete-consequence-coverage');
if(!counts.success||!counts.failure)reasons.push('missing-success-failure-contrast');
assert.equal(lesson.pieceCount,pieceCount);assert.deepEqual(lesson.reasons,reasons);
assert.equal(lesson.stage1DomainEligible,reasons.length===0);
assert.equal(manifest.counts.stage1DomainEligible,Number(reasons.length===0));
assert.equal(manifest.counts.unknownActions,counts.unknown);
assert.equal(lesson.neuralEventsDelivered,0);assert.equal(manifest.neuralEventsDelivered,0);
assert.equal(manifest.graphLaunchAuthorized,false);
const auditorPath=fileURLToPath(import.meta.url);
const result={schema:'lichess-api-lesson-audit-v1',passed:true,created:new Date().toISOString(),
  manifestSha256:sha(manifestBytes),inputSha256:sha(inputBytes),outputSha256:sha(body),
  auditorSha256:sha(readFileSync(auditorPath)),puzzleId:payload.puzzle.id,sourcePlies:history.length,
  candidates:legal.length,counts,pieceCount,stage1DomainEligible:reasons.length===0,
  peakRssMiB:process.resourceUsage().maxRSS/1024,
  scope:'One API development fixture: source history, exact legal coverage and independently rechecked one-reply consequences. No neural delivery, learning, family transfer or curriculum pass'};
writeFileSync(a.out+'.partial',JSON.stringify(result,null,2)+'\n',{flag:'wx'});renameSync(a.out+'.partial',a.out);
console.log(JSON.stringify(result));

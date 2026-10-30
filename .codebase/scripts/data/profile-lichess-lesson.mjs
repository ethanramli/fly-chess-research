// Bounded development timing only. Never loads a graph or grants teaching permission.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';
import {bindLichessCsvHistory} from '../../src/puzzle-learning/lichess-history.mjs';
import {prepareLichessCaptureLesson} from '../../src/puzzle-learning/lichess-capture-lesson.mjs';
const {values:a}=parseArgs({options:{rows:{type:'string'},games:{type:'string'},index:{type:'string'},out:{type:'string'}}});
assert(a.rows&&a.games&&a.out&&!existsSync(a.out));assert(process.execArgv.includes('--max-old-space-size=256'));
const bytes=readFileSync(a.rows);assert(bytes.length<=64*2**20);
const rows=bytes.toString('utf8').trim().split('\n');assert(rows.length<=4096);
const index=Number(a.index);assert(Number.isSafeInteger(index)&&index>=0&&index<rows.length);
const row=JSON.parse(rows[index]);assert(row.source.gameId.match(/^[A-Za-z0-9]{8}$/));
const pgn=readFileSync(a.games+'/'+row.source.gameId+'.pgn');assert(pgn.length<=65536);
const calls={};
for(const name of ['pgn','history','moves']){
  const original=Chess.prototype[name];calls[name]={calls:0,milliseconds:0};
  Chess.prototype[name]=function(...args){const start=performance.now();calls[name].calls++;
    try{return original.apply(this,args);}finally{calls[name].milliseconds+=performance.now()-start;}};
}
let start=performance.now();const binding=bindLichessCsvHistory(row,{gameId:row.source.gameId,pgn:pgn.toString('utf8')});
const bindingMilliseconds=performance.now()-start;start=performance.now();
const lesson=prepareLichessCaptureLesson(binding);
const lessonMilliseconds=performance.now()-start;
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={schema:'lichess-lesson-profile-v1',index,puzzleId:row.puzzleId,gameId:row.source.gameId,
  inputs:{rowsSha256:sha(bytes),gameSha256:sha(pgn)},bindingMilliseconds,lessonMilliseconds,calls,
  candidates:lesson.candidates.length,pieceCount:lesson.pieceCount,counts:lesson.counts,
  peakRssMiB:process.resourceUsage().maxRSS/1024,
  scope:'One training row, inclusive instrumented method timing; not matched throughput, whole-corpus or neural evidence.'};
writeFileSync(a.out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));

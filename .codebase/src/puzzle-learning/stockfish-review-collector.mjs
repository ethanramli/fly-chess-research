// Collect bounded, all-legal child-position Stockfish estimates for one audited
// Lichess training panel. Estimates remain distinct from task certificates.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {Chess} from 'chess.js';
import {bindLichessStockfishReview} from './lichess-stockfish-review.mjs';

const uci=move=>move.from+move.to+(move.promotion??'');
const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

async function fileHash(path){
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(path))hash.update(chunk);
  return hash.digest('hex');
}

class UciAnalyzer{
  constructor(executable,{args=[],timeoutMs=120000,threads=1,hashMiB=32,guard=()=>{},record=()=>{}}={}){
    assert(Number.isSafeInteger(timeoutMs)&&timeoutMs>=1000&&timeoutMs<=600000);
    assert.equal(threads,1,'Curriculum Stockfish collection is single-threaded');
    assert(Number.isSafeInteger(hashMiB)&&hashMiB>=1&&hashMiB<=128);
    this.timeoutMs=timeoutMs;this.guard=guard;this.record=record;this.pending=null;this.failed=null;
    this.child=spawn(executable,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});
    this.child.stdin.on('error',error=>this.fail(error));
    this.child.on('error',error=>this.fail(error));
    this.child.on('exit',(code,signal)=>this.fail(Error(`Stockfish exited (${code}, ${signal})`)));
    this.lines=createInterface({input:this.child.stdout});
    this.lines.on('line',line=>{
      if(line.length>65536)return this.fail(Error('Oversized UCI line'));
      this.record('out',line);this.transcript?.push(line);
      if(line.startsWith('id name '))this.name=line.slice(8);
      if(line.startsWith('option name '))this.options.add(line.slice(12).split(' type ',1)[0]);
      if(this.pending?.match(line)){const pending=this.pending;this.pending=null;
        clearTimeout(pending.timer);pending.resolve(line);}
    });
    this.child.stderr.on('data',chunk=>this.record('stderr',chunk.toString().slice(0,65536)));
    Object.assign(this,{threads,hashMiB,options:new Set()});
  }
  fail(error){
    if(this.failed)return;this.failed=error;
    if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}
    this.child.kill();
  }
  send(command){if(this.failed)throw this.failed;this.record('in',command);this.child.stdin.write(command+'\n');}
  command(command,match){
    if(this.pending)throw Error('Concurrent UCI commands are forbidden');
    if(this.failed)return Promise.reject(this.failed);
    return new Promise((resolve,reject)=>{
      this.pending={match,resolve,reject,timer:setTimeout(()=>this.fail(Error(`UCI timeout: ${command}`)),this.timeoutMs)};
      try{this.send(command);}catch(error){this.fail(error);}
    });
  }
  async initialize(){
    await this.command('uci',line=>line==='uciok');
    assert(/stockfish/i.test(this.name??''),'Engine did not identify as Stockfish');
    assert(this.options.has('Threads')&&this.options.has('Hash')&&this.options.has('UCI_ShowWDL')
      &&this.options.has('Clear Hash')&&this.options.has('UCI_LimitStrength')
      &&this.options.has('Ponder')&&this.options.has('MultiPV'),
      'Stockfish must support pinned Threads, Hash, WDL, strength, pondering, MultiPV, and hash reset settings');
    this.send(`setoption name Threads value ${this.threads}`);
    this.send(`setoption name Hash value ${this.hashMiB}`);
    this.send('setoption name UCI_ShowWDL value true');
    this.send('setoption name UCI_LimitStrength value false');
    this.send('setoption name Ponder value false');
    this.send('setoption name MultiPV value 1');
    await this.command('isready',line=>line==='readyok');
  }
  async analyze(position,budget,search='nodes'){
    this.guard();this.transcript=[];
    this.send('ucinewgame');this.send('setoption name Clear Hash');
    await this.command('isready',line=>line==='readyok');
    this.send(`position ${position}`);
    const bestmove=await this.command(`go ${search} ${budget}`,line=>line.startsWith('bestmove '));
    this.guard();
    const match=bestmove.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?|0000)(?: |$)/);
    assert(match,'Invalid Stockfish bestmove response');
    const transcript=this.transcript;this.transcript=null;
    return {transcript,completed:match[1]!=='0000'};
  }
  close(){if(!this.failed)this.child.kill();this.lines.close();}
}

// budgets are fixed node (default) or depth limits shared by every legal move.
// Node-limited searches usually stop mid-iteration, so their latest score is
// often only a bound and the exact-score rule rejects it; depth-limited searches
// end on a completed iteration. Caller pins this identity in the registration.
export async function collectLichessStockfishReview(panel,{executable,binarySha256=null,
  budgets=[10000,50000],search='nodes',timeoutMs=120000,maxElapsedMs=900000,hashMiB=32,guard,record,args=[],
  analyzerFactory=(path,options)=>new UciAnalyzer(path,options)}={}){
  assert(typeof executable==='string'&&executable.length>0);
  assert.equal(typeof guard,'function','Register a resource guard for Stockfish and Node RSS/free memory');
  assert.equal(typeof record,'function','Stream raw UCI input/output to the run log');
  assert(Number.isSafeInteger(maxElapsedMs)&&maxElapsedMs>=1000&&maxElapsedMs<=3600000);
  assert(['nodes','depth'].includes(search),'Stockfish search limit must be nodes or depth');
  const [low,high]=search==='nodes'?[1000,5000000]:[1,64];
  assert(Array.isArray(budgets)&&budgets.length>=2&&budgets.length<=4
    &&budgets.every(n=>Number.isSafeInteger(n)&&n>=low&&n<=high)
    &&new Set(budgets).size===budgets.length,`Require two to four distinct bounded ${search} budgets`);
  const binary=await fileHash(executable);
  assert(binarySha256===null||binarySha256===binary,'Stockfish binary hash differs from registration');
  const settings={schema:'stockfish-review-settings-v1',threads:1,hashMiB,showWDL:true,
  limitStrength:false,ponder:false,multiPv:1,clearHashBeforeEachSearch:true,
    search,budgets:[...budgets],timeoutMs,maxElapsedMs,args:[...args]};
  const engine={binarySha256:binary,settingsHash:createHash('sha256').update(JSON.stringify(settings)).digest('hex')};
  const board=new Chess();board.loadPgn(panel.context.pgn);
  assert.equal(board.fen(),panel.context.fen,'Lichess source history differs from displayed position');
  const historyKind=panel.context.historyKind??'standard-start-pgn';
  const history=board.history({verbose:true});
  let rootPosition;
  if(historyKind==='synthetic-root-position'){
    assert.equal(history.length,0,'Synthetic task positions must be rooted at their exact FEN');
    assert.match(panel.sourcePrefixPgnSha256??'',/^[a-f0-9]{64}$/,
      'Synthetic task position must retain its audited source-prefix identity');
    const fields=panel.context.fen.split(' ');
    assert.equal(fields.length,6,'Require a complete synthetic task FEN');
    assert.equal(fields[2],'-','Stage 1 synthetic FEN roots must not retain castling rights');
    assert.equal(fields[3],'-','Stage 1 synthetic FEN roots must not retain en-passant rights');
    rootPosition=`fen ${panel.context.fen}`;
    const rooted=new Chess(panel.context.fen);
    assert.equal(rooted.fen(),panel.context.fen,'Synthetic root FEN is not canonical/legal');
  }else{
    assert.equal(historyKind,'standard-start-pgn','Unknown panel history kind');
    const replayed=new Chess();
    for(const move of history)replayed.move(uci(move));
    assert.equal(replayed.fen(),board.fen(),'Standard-start source history replay mismatch');
    rootPosition='startpos';
  }
  const legal=board.moves({verbose:true});assert(legal.length>0&&legal.length<=256);
  const analyzer=analyzerFactory(executable,{args,timeoutMs,hashMiB,guard,record});
  const analyses=[];
  const started=performance.now();
  try{
    await analyzer.initialize();
    assert.equal(typeof analyzer.name,'string','Stockfish did not identify itself');
    engine.name=analyzer.name;
    engine.settingsHash=createHash('sha256').update(JSON.stringify({...settings,name:analyzer.name})).digest('hex');
    for(const move of legal){
      guard();
      const child=new Chess();child.loadPgn(panel.context.pgn);child.move(move);
      const line=[...history.map(uci),uci(move)].join(' ');
      const position=historyKind==='synthetic-root-position'
        ?`${rootPosition} moves ${uci(move)}`
        :`${rootPosition}${line?' moves '+line:''}`;
      for(const budget of budgets){
        if(performance.now()-started>=maxElapsedMs)throw Error('Stockfish panel deadline reached; review remains incomplete');
        const result=await analyzer.analyze(position,budget,search);
        analyses.push({move:uci(move),budget,engine,fen:child.fen(),pgn:child.pgn(),
          completed:result.completed,transcript:result.transcript});
      }
    }
  }finally{analyzer.close();}
  return bindLichessStockfishReview(panel,{criterion:'full-game-expected-score',context:structuredClone(panel.context),
    actor:board.turn(),engine,analyses});
}

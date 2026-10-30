// Source-side replay only. No solution labels or metadata enter the neural cue.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess, DEFAULT_POSITION} from 'chess.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const uci=move=>move.from+move.to+(move.promotion??'');
const position=board=>board.fen().split(' ').slice(0,4).join(' ');

function gameMoves(pgn,gameId){
  assert.equal(typeof pgn,'string','Require source PGN');
  assert(Buffer.byteLength(pgn)<=65536,'Source PGN exceeds 64 KiB');
  assert(!/^\s*</.test(pgn),'HTML is not source PGN');
  assert.match(gameId,/^[A-Za-z0-9]{8}$/,'Invalid source game ID');
  const game=new Chess();game.loadPgn(pgn);
  const moves=game.history({verbose:true});
  assert(moves.length>0&&moves.length<=512,'Source game must have 1..512 plies');
  assert.equal(moves[0].before,DEFAULT_POSITION,'Require standard-start history');
  const site=game.getHeaders().Site;
  if(site&&site!=='?'){
    const url=new URL(site);
    assert(['lichess.org','www.lichess.org'].includes(url.hostname),'Wrong PGN source host');
    const siteMatch=url.pathname.match(/^\/(?:game\/)?([A-Za-z0-9]{8})\/?$/);
    assert(siteMatch&&siteMatch[1]===gameId,'PGN source game mismatch');
  }
  return moves;
}

function play(board,text){
  assert.match(text,/^[a-h][1-8][a-h][1-8][qrbn]?$/,'Invalid source UCI move');
  return board.move({from:text.slice(0,2),to:text.slice(2,4),...(text[4]?{promotion:text[4]}:{})});
}

function bind({puzzleId,gameId,pgn,setupPly,setupMove,solutionMoves,initialFen,solverFen,api}){
  assert.match(puzzleId,/^[A-Za-z0-9]{1,16}$/,'Invalid puzzle ID');
  assert(typeof solverFen==='string'&&solverFen.length<=128,'Missing bounded solver FEN');
  const moves=gameMoves(pgn,gameId);
  assert(Number.isSafeInteger(setupPly)&&setupPly>=1&&setupPly<=moves.length,'Setup ply outside source history');
  assert(Array.isArray(solutionMoves)&&solutionMoves.length>=1&&solutionMoves.length<=79,'Invalid solution length');
  assert.equal(uci(moves[setupPly-1]),setupMove,'Setup move does not match source history');
  const board=new Chess();
  for(const move of moves.slice(0,setupPly-1))board.move(move);
  if(initialFen)assert.equal(board.fen(),new Chess(initialFen).fen(),'Initial FEN does not match source history');
  const beforeFen=board.fen();
  board.move(moves[setupPly-1]);
  // API FEN counters may be reset. Keep actual replay counters in every context.
  if(api)assert.equal(position(board),position(new Chess(solverFen)),'Solver position does not match source history');
  else assert.equal(board.fen(),new Chess(solverFen).fen(),'Solver FEN does not match source history');
  const context={fen:board.fen(),pgn:board.pgn()};
  for(const move of solutionMoves)play(board,move);
  return {schema:'lichess-history-binding-v1',puzzleId,gameId,setupPly,setupMove,initialFen:beforeFen,
    context,sourcePgnSha256:hash(pgn),prefixPgnSha256:hash(context.pgn),
    reportedSolverFen:solverFen,sourceFormat:api?'PuzzleAndGame':'CSV',
    solutionMoves:[...solutionMoves],historyStatus:'verified-standard-start-prefix',
    scope:'Source line legality and game-prefix binding only; no consequence or move-quality proof'};
}

export function bindLichessCsvHistory(row,{gameId,pgn}){
  assert.equal(row?.schema,'lichess-puzzle-source-row-v1','Unsupported source row');
  assert.equal(row.source?.gameId,gameId,'Source game ID mismatch');
  const fen=new Chess(row.initialFen).fen().split(' ');
  const setupPly=(Number(fen[5])-1)*2+(fen[1]==='w'?1:2);
  if(row.source.puzzlePly!=null)assert.equal(row.source.puzzlePly,setupPly,'Source URL ply mismatch');
  const url=new URL(row.source.gameUrl);
  assert(['lichess.org','www.lichess.org'].includes(url.hostname),'Wrong source host');
  const match=url.pathname.match(/^\/(?:game\/)?([A-Za-z0-9]{8})(?:\/(white|black))?\/?$/);
  assert(match&&match[1]===gameId,'Source URL game mismatch');
  if(match[2])assert.equal(match[2][0],fen[1],'Source orientation mismatch');
  if(url.hash)assert.equal(url.hash,`#${setupPly}`,'Source URL ply mismatch');
  const result=bind({puzzleId:row.puzzleId,gameId,pgn,setupPly,setupMove:row.setupMove,
    solutionMoves:row.solutionMoves,initialFen:row.initialFen,solverFen:row.solverFen,api:false});
  assert.equal(new Chess(result.context.fen).turn(),row.solverColor,'Solver side mismatch');
  return result;
}

export function bindLichessApiHistory(payload){
  assert(payload?.game&&payload?.puzzle,'Require PuzzleAndGame payload');
  const {game,puzzle}=payload;
  assert(Number.isSafeInteger(puzzle.initialPly)&&puzzle.initialPly>=0&&puzzle.initialPly<512,'Invalid initialPly');
  // Cross-check the API's zero-based setup index against both PGN and position.
  assert.equal(gameMoves(game.pgn,game.id).length,puzzle.initialPly+1,'API PGN must end at the setup move');
  return bind({puzzleId:puzzle.id,gameId:game.id,pgn:game.pgn,setupPly:puzzle.initialPly+1,
    setupMove:puzzle.lastMove,solutionMoves:puzzle.solution,solverFen:puzzle.fen,api:true});
}

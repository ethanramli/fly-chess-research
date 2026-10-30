// Classify the immediate recapture relation for the Stage 1 task only.
// Returns unknown for check positions or overlapping mechanisms.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';

const uci=move=>move.from+move.to+(move.promotion??'');
const square=(file,rank)=>String.fromCharCode(97+file)+String(rank+1);
function piecesWithSquares(board){return board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&
  {...piece,square:square(col,7-row)}).filter(Boolean));}
function placement(board,from,to,remove=[]){
  const cells=board.board().map(rank=>rank.map(piece=>piece&&{type:piece.type,color:piece.color}));
  const index=value=>({row:8-Number(value[1]),col:value.charCodeAt(0)-97});
  for(const value of remove){const at=index(value);cells[at.row][at.col]=null;}
  const a=index(from),b=index(to),piece=cells[a.row][a.col];assert(piece);
  cells[a.row][a.col]=null;cells[b.row][b.col]=piece;const ranks=[];
  for(let row=0;row<8;row++){let text='',empty=0;for(let col=0;col<8;col++){
    const cell=cells[row][col];if(!cell){empty++;continue;}if(empty){text+=empty;empty=0;}
    text+=cell.color==='w'?cell.type.toUpperCase():cell.type;
  }if(empty)text+=empty;ranks.push(text);}
  const fields=board.fen().split(' ');return `${ranks.join('/')} ${fields[1]} ${fields[2]} ${fields[3]} ${fields[4]} ${fields[5]}`;
}
function pathSquares(from,to){
  const fx=from.charCodeAt(0)-97,fy=Number(from[1])-1,tx=to.charCodeAt(0)-97,ty=Number(to[1])-1;
  if(fx!==tx&&fy!==ty&&Math.abs(tx-fx)!==Math.abs(ty-fy))return [];
  const dx=Math.sign(tx-fx),dy=Math.sign(ty-fy),out=[];let x=fx+dx,y=fy+dy;
  while(x!==tx||y!==ty){out.push(square(x,y));x+=dx;y+=dy;}return out;
}
function pseudoAttack(piece,from,target){
  const dx=target.charCodeAt(0)-from.charCodeAt(0),dy=Number(target[1])-Number(from[1]);
  const ax=Math.abs(dx),ay=Math.abs(dy);
  if(piece.type==='p')return ax===1&&dy===(piece.color==='w'?1:-1);
  if(piece.type==='n')return ax*ay===2;
  if(piece.type==='k')return Math.max(ax,ay)===1;
  return piece.type==='r'?(dx===0||dy===0):piece.type==='b'?(ax===ay):piece.type==='q'?(dx===0||dy===0||ax===ay):false;
}
function hypotheticalRecaptureLeavesKingSafe(board,from,target,remove=[]){
  const changed=new Chess(placement(board,from,target,remove));
  const defender=board.turn(),king=piecesWithSquares(changed).find(piece=>piece.type==='k'&&piece.color===defender);
  assert(king,'Missing defender king');return !changed.isAttacked(king.square,defender==='w'?'b':'w');
}

export function classifyCaptureRetentionStratum(board,move){
  const beforeFen=board.fen(),beforePgn=board.pgn();
  const action=board.moves({verbose:true}).find(candidate=>uci(candidate)===move);
  assert(action?.captured,'Require a legal capture action');
  const actor=board.turn(),target=action.to;board.move(action);
  try{
    if(board.isCheck())return {status:'unknown',reason:'capture-gives-check'};
    const legal=board.moves({verbose:true}).filter(reply=>reply.to===target&&reply.captured);
    if(legal.length)return {status:'classified',stratum:'open-defender',recaptures:legal.map(uci).sort()};
    const defenders=board.turn(),pieces=piecesWithSquares(board).filter(piece=>piece.color===defenders&&piece.type!=='k');
    const pinned=[],blocked=[];
    for(const piece of pieces){
      const path=pathSquares(piece.square,target);if(!pseudoAttack(piece,piece.square,target))continue;
      const blockers=path.filter(at=>board.get(at));
      if(blockers.length){
        if(!blockers.some(at=>board.get(at)?.type==='k')&&hypotheticalRecaptureLeavesKingSafe(board,piece.square,target,blockers))blocked.push(piece.square);
      }else if(!hypotheticalRecaptureLeavesKingSafe(board,piece.square,target))pinned.push(piece.square);
    }
    if(pinned.length&&blocked.length)return {status:'unknown',reason:'overlapping-pin-and-blocker',pinned,blocked};
    if(pinned.length)return {status:'classified',stratum:'pinned-apparent-defender',pinned};
    if(blocked.length)return {status:'classified',stratum:'blocked-defender',blocked};
    return {status:'classified',stratum:'absent-defender'};
  }finally{board.undo();assert.equal(board.fen(),beforeFen);assert.equal(board.pgn(),beforePgn);}
}

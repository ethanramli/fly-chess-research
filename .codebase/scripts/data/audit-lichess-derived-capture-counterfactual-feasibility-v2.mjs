// Independent replay of training-only one-piece counterfactual feasibility rows.
// Does not import the producer or its task-certificate implementation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,readFileSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {Chess} from 'chess.js';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const refs=[
  {path:'research/data/lichess-matched-capture-prepared-v1/train-chunk-000/lessons.jsonl',sha256:'a56e4ebee7eb365d7a5e90f28e610541e10c535bf14da4dc3a4ee01d49162b72'},
  {path:'research/data/lichess-matched-capture-prepared-v1/train-chunk-001/lessons.jsonl',sha256:'5a72a8e46d286aa32727d0bfa0a5808281dacdb779647b15d7e3ea3ddb8f1142'}
];
const reportRef={path:'research/reports/babysit-stage1-direct-counterfactual-feasibility-2026-10-23.json',sha256:'107c56b0ad70aeefc2e271aa09a31b6270304a4abd4eaf631a982b88589e2a9e'};
const output='research/reports/babysit-stage1-direct-counterfactual-feasibility-audit-v2-2026-10-23.json';
const started=performance.now(),cpuStart=process.cpuUsage();let peakRss=0,lastCpu=process.cpuUsage(),checked=0;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const uci=move=>move.from+move.to+(move.promotion??'');
function inside(path){const target=resolve(root,path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel));return target;}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'resource guard');assert(performance.now()-started<=300000,'elapsed guard');}
const cpuPacer=makeCpuDutyPacer(0.5,guard);
async function pace(){const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await cpuPacer((used.user+used.system)/1000);guard();}
function piecesWithSquares(board){return board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&
  {...piece,square:String.fromCharCode(97+col)+(8-row)}).filter(Boolean));}
function relocatedFen(board,from,to){
  const cells=board.board().map(rank=>rank.map(piece=>piece&&{type:piece.type,color:piece.color}));
  const index=square=>({row:8-Number(square[1]),col:square.charCodeAt(0)-97});
  const a=index(from),b=index(to),piece=cells[a.row][a.col];assert(piece&&!cells[b.row][b.col]);
  cells[a.row][a.col]=null;cells[b.row][b.col]=piece;const ranks=[];
  for(let row=0;row<8;row++){let text='',empty=0;for(let col=0;col<8;col++){
    const cell=cells[row][col];if(!cell){empty++;continue;}if(empty){text+=empty;empty=0;}
    text+=cell.color==='w'?cell.type.toUpperCase():cell.type;
  }if(empty)text+=empty;ranks.push(text);}
  const fields=board.fen().split(' ');return `${ranks.join('/')} ${fields[1]} ${fields[2]} ${fields[3]} ${fields[4]} ${fields[5]}`;
}
function legalStaticPosition(board){
  const kings=piecesWithSquares(board).filter(piece=>piece.type==='k');if(kings.length!==2||board.isCheck())return false;
  const other=kings.find(piece=>piece.color!==board.turn());
  return !board.isAttacked(other.square,board.turn());
}
function directStatus(board,move){
  const action=board.moves({verbose:true}).find(candidate=>uci(candidate)===move);
  if(!action?.captured)return null;
  const target=action.to;board.move(action);
  try{return board.moves({verbose:true}).some(reply=>reply.to===target&&reply.captured)?'failure':'success';}
  finally{board.undo();}
}
function sourceRows(){
  const map=new Map();
  for(const ref of refs){const bytes=readFileSync(inside(ref.path));assert.equal(sha(bytes),ref.sha256);
    for(const line of bytes.toString('utf8').split(/\r?\n/))if(line){const row=JSON.parse(line);
      assert(!map.has(row.lesson.puzzleId),'Duplicate puzzle across pinned source chunks');map.set(row.lesson.puzzleId,row);}}
  return map;
}

async function main(){
  assert(!existsSync(inside(output)),'Preserve an existing audit');
  const reportBytes=readFileSync(inside(reportRef.path));assert.equal(sha(reportBytes),reportRef.sha256);
  const report=JSON.parse(reportBytes);assert.equal(report.schema,'lichess-derived-capture-counterfactual-feasibility-v1');
  assert.equal(report.neuralEventsDelivered,0);assert.equal(report.graphLaunchAuthorized,false);
  assert.equal(report.validationInspected,false);assert.equal(report.finalInspected,false);
  assert.deepEqual(report.inputs,refs);
  const sources=sourceRows(),seen=new Set(),sourceGames=new Set(),flipsByDirection={};let eligible=0;
  for(const row of sources.values())if(row.lesson?.stage1DomainEligible&&row.lesson.pieceCount<=6)eligible++;
  for(const flip of report.flips){
    guard();const source=sources.get(flip.puzzleId);assert(source,'Unpinned source puzzle');
    assert.equal(source.lesson.gameId,flip.gameId);assert.equal(source.lesson.context.fen,flip.sourceFen);
    const base=new Chess();base.loadPgn(source.lesson.context.pgn);assert.equal(base.fen(),flip.sourceFen);
    assert(source.lesson.stage1DomainEligible&&source.lesson.pieceCount<=6);
    assert.equal(base.fen().split(' ')[2],'-');assert.equal(base.fen().split(' ')[3],'-');
    const {color,type,from,to}=flip.changedPiece,original=base.get(from);
    assert(original&&original.color===color&&original.type===type&&type!=='k');assert(!base.get(to));
    const rebuilt=relocatedFen(base,from,to);assert.equal(rebuilt,flip.syntheticFen);
    const changed=new Chess(rebuilt);assert(legalStaticPosition(changed),'Synthetic board violates static legal-position checks');
    assert.equal(changed.board().flat().filter(Boolean).length,source.lesson.pieceCount);
    const move=flip.unchangedCapture;assert.notEqual(move.slice(0,2),from);assert.notEqual(move.slice(2,4),from);
    const before=directStatus(base,move),after=directStatus(changed,move);
    assert(before&&after&&before!==after,'Independent legal-reply result did not reproduce the flip');
    assert.equal(before,flip.sourceOutcome);assert.equal(after,flip.counterfactualOutcome);
    const key=[flip.puzzleId,move,from,to].join(':');assert(!seen.has(key),'Duplicate emitted counterfactual');seen.add(key);
    sourceGames.add(flip.gameId);const direction=`${before}-to-${after}`;
    flipsByDirection[direction]=(flipsByDirection[direction]??0)+1;
    checked++;if(checked%128===0)await pace();
  }
  const sourceRowsCount=sources.size,sourceRowsWithFlip=new Set(report.flips.map(row=>row.puzzleId)).size;
  assert.equal(report.counts.sourceRows,sourceRowsCount);assert.equal(report.counts.eligibleRows,eligible);
  assert.equal(report.counts.flipPairs,checked);assert.equal(report.counts.rootsWithAnyFlip,sourceRowsWithFlip);
  assert.equal(report.counts.uniqueSourceGamesWithFlip,sourceGames.size);
  assert.deepEqual(report.counts.byStratum,flipsByDirection);
  const audit={schema:'lichess-derived-capture-counterfactual-feasibility-audit-v1',passed:true,
    inputs:{report:{...reportRef},sources:refs},replayedFlips:checked,sourceRows:sourceRowsCount,
    eligibleRows:eligible,sourcePuzzleRootsWithFlip:sourceRowsWithFlip,sourceGamesWithFlip:sourceGames.size,
    directions:flipsByDirection,relationFamilyDiversityEstablished:false,relationFamilyDisjointnessEstablished:false,
    graphLaunchAuthorized:false,neuralEventsDelivered:0,validationInspected:false,finalInspected:false,
    resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20,cpuDuty:0.5},
    scope:'Independent replay of the emitted training-only static board mutations and immediate legal recapture consequences. Does not establish family diversity, source-history equivalence, train/validation disjointness, neural learning or reasoning.'};
  const path=inside(output);mkdirSync(dirname(path),{recursive:true});const bytes=Buffer.from(JSON.stringify(audit,null,2)+'\n');
  const partial=path+'.partial',fd=openSync(partial,'wx');try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);process.stdout.write(JSON.stringify({passed:true,replayedFlips:checked,
    sourcePuzzleRootsWithFlip:sourceRowsWithFlip,sourceGamesWithFlip:sourceGames.size,
    relationFamilyDiversityEstablished:false,graphLaunchAuthorized:false,elapsedSeconds:audit.resources.elapsedSeconds})+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'audit-error',error:String(error).slice(0,500)})+'\n');process.exitCode=2;});

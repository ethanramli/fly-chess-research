// Training-only feasibility probe for one-piece board counterfactuals.
// Derived FENs are synthetic and this report never authorizes neural teaching.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,readFileSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const refs=[
  {path:'research/data/lichess-matched-capture-prepared-v1/train-chunk-000/lessons.jsonl',sha256:'a56e4ebee7eb365d7a5e90f28e610541e10c535bf14da4dc3a4ee01d49162b72'},
  {path:'research/data/lichess-matched-capture-prepared-v1/train-chunk-001/lessons.jsonl',sha256:'5a72a8e46d286aa32727d0bfa0a5808281dacdb779647b15d7e3ea3ddb8f1142'}
];
const task={objective:'capture-retention',plies:1},maxSeconds=300,maxEvaluations=20000;
const output='research/reports/babysit-stage1-direct-counterfactual-feasibility-2026-10-23.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const uci=move=>move.from+move.to+(move.promotion??'');
const started=performance.now(),cpuStart=process.cpuUsage();let peakRss=0,evaluations=0,lastCpu=process.cpuUsage();
function inside(path){const target=resolve(root,path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel));return target;}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'resource guard');assert(performance.now()-started<=maxSeconds*1000,'elapsed guard');}
const cpuPacer=makeCpuDutyPacer(0.5,guard);
async function pace(){const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await cpuPacer((used.user+used.system)/1000);guard();}
function piecesWithSquares(board){return board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&
  {...piece,square:String.fromCharCode(97+col)+(8-row)}).filter(Boolean));}
function placement(board,from,to){
  const cells=board.board().map(rank=>rank.map(piece=>piece&&{type:piece.type,color:piece.color}));
  const index=square=>({row:7-(Number(square[1])-1),col:square.charCodeAt(0)-97});
  const a=index(from),b=index(to),piece=cells[a.row][a.col];assert(piece&&!cells[b.row][b.col]);
  cells[a.row][a.col]=null;cells[b.row][b.col]=piece;
  const ranks=[];
  for(let row=0;row<8;row++){let text='',empty=0;for(let col=0;col<8;col++){
    const cell=cells[row][col];if(!cell){empty++;continue;}if(empty){text+=empty;empty=0;}
    text+=cell.color==='w'?cell.type.toUpperCase():cell.type;
  }if(empty)text+=empty;ranks.push(text);}
  return ranks.join('/');
}
function legalStaticPosition(board){
  const kings=piecesWithSquares(board).filter(piece=>piece.type==='k');
  if(kings.length!==2)return false;
  const side=board.turn(),other=side==='w'?'b':'w';
  const otherKing=kings.find(piece=>piece.color===other);
  return !board.isCheck()&&!board.isAttacked(otherKing.square,side);
}
function outcome(board,move){
  const proof=certifyCaptureRetentionAction(board,move,task);
  const checked=checkCaptureRetentionAction(board,move,task,proof);
  assert.equal(checked.verified,true);assert.notEqual(checked.status,'unknown');
  return checked.status;
}
function rowRecords(){
  const records=[];
  for(const ref of refs){const bytes=readFileSync(inside(ref.path));assert.equal(sha(bytes),ref.sha256,`Input changed: ${ref.path}`);
    for(const line of bytes.toString('utf8').split(/\r?\n/))if(line)records.push({record:JSON.parse(line),ref});}
  return records;
}

async function main(){
  assert(!existsSync(inside(output)),'Preserve an existing probe report');
  const counts={sourceRows:0,eligibleRows:0,rootsWithAnyFlip:0,uniqueSourceGamesWithFlip:0,
    mutationsChecked:0,captureComparisons:0,flipPairs:0,byStratum:{}};
  const flips=[],sourceGames=new Set(),unique=new Set();
  for(const {record,ref} of rowRecords()){
    guard();counts.sourceRows++;
    const lesson=record.lesson;if(!lesson?.stage1DomainEligible||lesson.pieceCount>6)continue;
    counts.eligibleRows++;
    const base=new Chess();base.loadPgn(lesson.context.pgn);assert.equal(base.fen(),lesson.context.fen);
    if(base.isGameOver()||base.fen().split(' ')[2]!=='-'||base.fen().split(' ')[3]!=='-')continue;
    const captures=base.moves({verbose:true}).filter(move=>move.captured).map(uci).sort();
    if(!captures.length)continue;
    const before=new Map(captures.map(move=>[move,outcome(base,move)]));
  const occupied=piecesWithSquares(base).filter(piece=>piece.type!=='k');
    let rootFound=false;
    for(const piece of occupied){
      const from=piece.square,fromIndex={row:7-(Number(from[1])-1),col:from.charCodeAt(0)-97};
      for(let row=0;row<8;row++)for(let col=0;col<8;col++){
        const to=String.fromCharCode(97+col)+(8-row);if(row===fromIndex.row&&col===fromIndex.col)continue;
        if(base.get(to))continue;
        const fen=`${placement(base,from,to)} ${base.turn()} - - ${base.fen().split(' ')[4]} ${base.fen().split(' ')[5]}`;
        let variant;try{variant=new Chess(fen);}catch{continue;}
        if(!legalStaticPosition(variant))continue;
        counts.mutationsChecked++;
        const legal=new Set(variant.moves({verbose:true}).map(uci));
        for(const move of captures){
          if(!legal.has(move)||move.slice(0,2)===from||move.slice(2,4)===from)continue;
          guard();assert(++evaluations<=maxEvaluations,'comparison bound');counts.captureComparisons++;
          const after=outcome(variant,move);if(evaluations%128===0)await pace();
          if(after===before.get(move))continue;
          const key=[lesson.puzzleId,move,from,to].join(':');if(unique.has(key))continue;unique.add(key);
          const rowOut={puzzleId:lesson.puzzleId,gameId:lesson.gameId,sourceChunk:ref.path,
            sourceFen:base.fen(),syntheticFen:fen,changedPiece:{color:piece.color,type:piece.type,from,to},
            unchangedCapture:move,sourceOutcome:before.get(move),counterfactualOutcome:after,
            scope:'training-only static board perturbation; synthetic history; feasibility evidence only'};
          flips.push(rowOut);counts.flipPairs++;rootFound=true;sourceGames.add(lesson.gameId);
          const bucket=`${before.get(move)}-to-${after}`;counts.byStratum[bucket]=(counts.byStratum[bucket]??0)+1;
        }
      }
    }
    if(rootFound)counts.rootsWithAnyFlip++;
  }
  guard();const report={schema:'lichess-derived-capture-counterfactual-feasibility-v1',
    status:'diagnostic-complete',method:'Relocate one non-king piece to an empty square in a legal static board derived from a training Lichess root; require the same capture action to remain legal and its independently checked immediate recapture-retention outcome to flip.',
    inputs:refs.map(ref=>({path:ref.path,sha256:ref.sha256})),counts:{...counts,uniqueSourceGamesWithFlip:sourceGames.size},
    bounds:{maxSeconds,maxEvaluations,maxRssMiB:2048,minFreeMiB:256,heapMiB:256,cpuDuty:0.5},
    resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20},
    flips,neuralEventsDelivered:0,graphLaunchAuthorized:false,validationInspected:false,finalInspected:false,
    limitations:['Derived FENs do not retain authentic move history; this probe cannot authorize use in the current source-bound panel path.','Counts measure construction feasibility only, not independent relation-family diversity, train/validation disjointness, learner feedback quality, biological learning or reasoning.','The source and mutation report are training-only; no validation or final rows were read.']};
  const path=inside(output);mkdirSync(dirname(path),{recursive:true});const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');
  assert(bytes.length<=64*2**20,'Probe report exceeds 64 MiB');
  const partial=path+'.partial',fd=openSync(partial,'wx');try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);process.stdout.write(JSON.stringify({status:report.status,counts:report.counts,
    report:relative(root,path).replaceAll('\\','/'),elapsedSeconds:report.resources.elapsedSeconds,
    peakRssMiB:report.resources.peakRssMiB,graphLaunchAuthorized:false})+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'probe-error',error:String(error).slice(0,500)})+'\n');process.exitCode=2;});

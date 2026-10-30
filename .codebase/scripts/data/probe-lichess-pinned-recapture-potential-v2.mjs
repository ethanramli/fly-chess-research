// Search training-only Lichess-rooted boards for open-to-pinned recapture pairs.
// Synthetic positions remain diagnostic and cannot authorize neural teaching.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,readFileSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {Chess} from 'chess.js';
import {classifyCaptureRetentionStratum} from '../../src/puzzle-learning/capture-retention-stratum.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const [input,output]=process.argv.slice(2);
assert(input&&output,'Usage: node probe-lichess-pinned-recapture-potential.mjs INPUT OUTPUT');
const maxSeconds=300,maxEvaluations=10000;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const uci=move=>move.from+move.to+(move.promotion??'');
const started=performance.now(),cpuStart=process.cpuUsage();let peakRss=0,evaluations=0,lastCpu=process.cpuUsage();
function inside(path){const target=resolve(root,path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel));return target;}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'resource guard');assert(performance.now()-started<=maxSeconds*1000,'elapsed guard');}
const cpuPacer=makeCpuDutyPacer(0.5,guard);
async function pace(){const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await cpuPacer((used.user+used.system)/1000);guard();}
function squares(board){return board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&{...piece,square:String.fromCharCode(97+col)+(8-row)}).filter(Boolean));}
function placement(board,from,to){
  const cells=board.board().map(rank=>rank.map(piece=>piece&&{type:piece.type,color:piece.color}));
  const a={row:8-Number(from[1]),col:from.charCodeAt(0)-97},b={row:8-Number(to[1]),col:to.charCodeAt(0)-97},piece=cells[a.row][a.col];
  assert(piece&&!cells[b.row][b.col]);cells[a.row][a.col]=null;cells[b.row][b.col]=piece;
  return cells.map(rank=>{let text='',empty=0;for(const cell of rank){if(!cell){empty++;continue;}if(empty){text+=empty;empty=0;}text+=cell.color==='w'?cell.type.toUpperCase():cell.type;}return text+(empty||'');}).join('/');
}
function valid(board){
  const kings=squares(board).filter(piece=>piece.type==='k');if(kings.length!==2||board.isCheck())return false;
  const other=board.turn()==='w'?'b':'w';return !board.isAttacked(kings.find(piece=>piece.color===other).square,board.turn());
}

async function main(){
  assert(!existsSync(inside(output)),'Preserve an existing pin-probe report');
  const pinFixture=new Chess('1k6/8/1n6/8/p7/8/8/R2R3K w - - 0 1');
  assert.equal(classifyCaptureRetentionStratum(pinFixture,'a1a4').stratum,'open-defender');
  const pinnedFixture=new Chess(`${placement(pinFixture,'d1','b1')} w - - 0 1`);
  assert.equal(classifyCaptureRetentionStratum(pinnedFixture,'a1a4').stratum,'pinned-apparent-defender');
  assert.equal(pinnedFixture.moves({verbose:true}).some(move=>move.from==='a1'&&move.to==='a4'),true);
  const bytes=readFileSync(inside(input)),data=JSON.parse(bytes);
  assert.equal(data.schema,'lichess-derived-capture-counterfactual-feasibility-v1');
  const roots=new Map(data.flips.map(row=>[row.puzzleId,{puzzleId:row.puzzleId,gameId:row.gameId,fen:row.sourceFen}]));
  const counts={sourceRoots:roots.size,sourceCaptures:0,mutationsChecked:0,captureComparisons:0,pinnedPairs:0,rootsWithPinnedPair:0};
  const pairs=[],seen=new Set(),sourceGames=new Set();
  for(const rootRow of roots.values()){
    guard();const base=new Chess(rootRow.fen);if(!valid(base))continue;
    const captures=base.moves({verbose:true}).filter(move=>move.captured).map(uci).sort();
    const openCaptures=captures.filter(move=>classifyCaptureRetentionStratum(new Chess(rootRow.fen),move).stratum==='open-defender');
    counts.sourceCaptures+=openCaptures.length;if(!openCaptures.length)continue;
    let found=false;
    for(const piece of squares(base)){
      for(let row=0;row<8;row++)for(let col=0;col<8;col++){
        const to=String.fromCharCode(97+col)+(8-row);if(to===piece.square||base.get(to))continue;
        const fen=`${placement(base,piece.square,to)} ${base.turn()} - - 0 1`;
        let variant;try{variant=new Chess(fen);}catch{continue;}
        if(!valid(variant))continue;
        counts.mutationsChecked++;
        const legal=new Set(variant.moves({verbose:true}).map(uci));
        for(const move of openCaptures){
          if(!legal.has(move)||move.slice(0,2)===piece.square||move.slice(2,4)===piece.square)continue;
          guard();assert(++evaluations<=maxEvaluations,'comparison bound');counts.captureComparisons++;
          const result=classifyCaptureRetentionStratum(variant,move);if(evaluations%128===0)await pace();
          if(result.status!=='classified'||result.stratum!=='pinned-apparent-defender')continue;
          const key=[rootRow.puzzleId,move,piece.square,to].join(':');if(seen.has(key))continue;seen.add(key);
          pairs.push({puzzleId:rootRow.puzzleId,gameId:rootRow.gameId,sourceFen:rootRow.fen,syntheticFen:fen,
            unchangedCapture:move,sourceStratum:'open-defender',syntheticStratum:result.stratum,
            changedPiece:{color:piece.color,type:piece.type,from:piece.square,to},pinnedSquares:result.pinned,
            scope:'training-only synthetic static board; open to absolute-pin recapture counterfactual; feasibility only'});
          counts.pinnedPairs++;sourceGames.add(rootRow.gameId);found=true;if(pairs.filter(pair=>pair.puzzleId===rootRow.puzzleId).length>=4)break;
        }
        if(pairs.filter(pair=>pair.puzzleId===rootRow.puzzleId).length>=4)break;
      }
      if(pairs.filter(pair=>pair.puzzleId===rootRow.puzzleId).length>=4)break;
    }
    if(found)counts.rootsWithPinnedPair++;if(evaluations>=maxEvaluations)break;
  }
  guard();const report={schema:'lichess-pinned-recapture-potential-v2',status:'diagnostic-complete',
    input:{path:input,sha256:sha(bytes)},counts:{...counts,uniqueSourceGamesWithPinnedPair:sourceGames.size},
    bounds:{maxSeconds,maxEvaluations,maxRssMiB:2048,minFreeMiB:256,heapMiB:256,cpuDuty:0.5},
    resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20},
    pairs,neuralEventsDelivered:0,graphLaunchAuthorized:false,validationInspected:false,finalInspected:false,
    scope:'Targeted one-piece relocation search over deduplicated training roots only. Synthetic FEN positions do not preserve source game history or authorize Stage 1 family registration, learning, or reasoning.'};
  const path=inside(output);mkdirSync(dirname(path),{recursive:true});const reportBytes=Buffer.from(JSON.stringify(report,null,2)+'\n');
  const partial=path+'.partial',fd=openSync(partial,'wx');try{writeFileSync(fd,reportBytes);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);process.stdout.write(JSON.stringify({status:report.status,counts:report.counts,report:relative(root,path).replaceAll('\\','/'),...report.resources,graphLaunchAuthorized:false})+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'probe-error',error:String(error).slice(0,500)})+'\n');process.exitCode=2;});


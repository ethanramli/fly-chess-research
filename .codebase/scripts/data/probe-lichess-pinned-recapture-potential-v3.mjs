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
const maxSeconds=600,maxEvaluations=30000;
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
function placementMany(board,relocations){
  const cells=board.board().map(rank=>rank.map(piece=>piece&&{type:piece.type,color:piece.color}));
  const index=square=>({row:8-Number(square[1]),col:square.charCodeAt(0)-97});
  for(const {from} of relocations){const at=index(from);assert(cells[at.row][at.col]);cells[at.row][at.col]=null;}
  for(const {from,to} of relocations){const a=index(from),b=index(to),piece=board.get(from);
    assert(piece&&!cells[b.row][b.col]);cells[b.row][b.col]={type:piece.type,color:piece.color};}
  return cells.map(rank=>{let text='',empty=0;for(const cell of rank){if(!cell){empty++;continue;}if(empty){text+=empty;empty=0;}text+=cell.color==='w'?cell.type.toUpperCase():cell.type;}return text+(empty||'');}).join('/');
}
const coords=square=>({file:square.charCodeAt(0)-97,rank:Number(square[1])-1});
function pseudoAttacks(type,color,from,to){
  const a=coords(from),b=coords(to),df=b.file-a.file,dr=b.rank-a.rank,af=Math.abs(df),ar=Math.abs(dr);
  if(type==='n')return af*ar===2;
  if(type==='k')return Math.max(af,ar)===1;
  if(type==='p')return af===1&&dr===(color==='w'?1:-1);
  if(type==='b')return af===ar&&af>0;
  if(type==='r')return (df===0||dr===0)&&(af+ar)>0;
  if(type==='q')return (af===ar||df===0||dr===0)&&(af+ar)>0;
  return false;
}
function rayBeyond(kingSquare,defenderSquare){
  const k=coords(kingSquare),d=coords(defenderSquare),df=d.file-k.file,dr=d.rank-k.rank;
  if(df!==0&&dr!==0&&Math.abs(df)!==Math.abs(dr))return [];
  const sx=Math.sign(df),sy=Math.sign(dr),out=[];let file=d.file+sx,rank=d.rank+sy;
  while(file>=0&&file<8&&rank>=0&&rank<8){out.push(String.fromCharCode(97+file)+String(rank+1));file+=sx;rank+=sy;}
  return out;
}
function supportsRay(type,kingSquare,pinnerSquare){
  const a=coords(kingSquare),b=coords(pinnerSquare),df=Math.abs(a.file-b.file),dr=Math.abs(a.rank-b.rank);
  return type==='q'?(df===0||dr===0||df===dr):type==='r'?(df===0||dr===0):type==='b'&&df===dr;
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
  const pairs=[],seen=new Set(),sourceGames=new Set(),perRoot=new Map();
  for(const rootRow of roots.values()){
    guard();const base=new Chess(rootRow.fen);if(!valid(base))continue;
    const actor=base.turn(),defender=actor==='w'?'b':'w',boardPieces=squares(base);
    const openCaptures=base.moves({verbose:true}).filter(move=>move.captured&&
      classifyCaptureRetentionStratum(new Chess(rootRow.fen),uci(move)).stratum==='open-defender');
    counts.sourceCaptures+=openCaptures.length;if(!openCaptures.length)continue;
    let found=false;
    const kingSquare=boardPieces.find(piece=>piece.color===defender&&piece.type==='k')?.square;
    if(!kingSquare)continue;
    for(const action of openCaptures){
      const move=uci(action),after=new Chess(rootRow.fen);after.move(move);const target=action.to;
      if(!after.moves({verbose:true}).some(reply=>reply.to===target&&reply.captured))continue;
      for(const d of boardPieces.filter(piece=>piece.color===defender&&piece.type!=='k'&&piece.square!==target)){
        const dTargets=[];
        for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++){
          const square=String.fromCharCode(97+file)+String(rank+1);
          if(square!==target&&square!==action.from&&pseudoAttacks(d.type,d.color,square,target))dTargets.push(square);
        }
        for(const p of boardPieces.filter(piece=>piece.color===actor&&['b','r','q'].includes(piece.type)&&piece.square!==action.from)){
          for(const dTo of dTargets){
            if(dTo===kingSquare||dTo===p.square||dTo===action.from||dTo===target)continue;
            for(const pTo of rayBeyond(kingSquare,dTo)){
              if(!supportsRay(p.type,kingSquare,pTo)||pTo===p.square||pTo===d.square||pTo===action.from||pTo===target||pTo===dTo)continue;
              const relocations=[{from:p.square,to:pTo},{from:d.square,to:dTo}];
              let variant,fen;
              try{fen=`${placementMany(base,relocations)} ${actor} - - 0 1`;variant=new Chess(fen);}catch{continue;}
              if(!valid(variant)||!variant.moves({verbose:true}).some(candidate=>uci(candidate)===move))continue;
              counts.mutationsChecked++;guard();assert(++evaluations<=maxEvaluations,'comparison bound');counts.captureComparisons++;
              const result=classifyCaptureRetentionStratum(variant,move);if(evaluations%128===0)await pace();
              if(result.status!=='classified'||result.stratum!=='pinned-apparent-defender')continue;
              const afterVariant=new Chess(fen);afterVariant.move(move);
              if(afterVariant.moves({verbose:true}).some(reply=>reply.to===target&&reply.captured))continue;
              const key=[rootRow.puzzleId,move,p.square,pTo,d.square,dTo].join(':');if(seen.has(key))continue;seen.add(key);
              pairs.push({puzzleId:rootRow.puzzleId,gameId:rootRow.gameId,sourceFen:rootRow.fen,syntheticFen:fen,
                unchangedCapture:move,sourceStratum:'open-defender',syntheticStratum:result.stratum,
                relocations:relocations.map(row=>({...row,color:base.get(row.from).color,type:base.get(row.from).type})),
                pinnedSquares:result.pinned,scope:'training-only two-piece hypothetical board; source history retained separately; feasibility only'});
              counts.pinnedPairs++;sourceGames.add(rootRow.gameId);found=true;
              const count=(perRoot.get(rootRow.puzzleId)??0)+1;perRoot.set(rootRow.puzzleId,count);
              if(count>=4)break;
            }
            if((perRoot.get(rootRow.puzzleId)??0)>=4)break;
          }
          if((perRoot.get(rootRow.puzzleId)??0)>=4)break;
        }
        if((perRoot.get(rootRow.puzzleId)??0)>=4)break;
      }
      if((perRoot.get(rootRow.puzzleId)??0)>=4)break;
    }
    if(found)counts.rootsWithPinnedPair++;if(evaluations>=maxEvaluations)break;
  }
  guard();const report={schema:'lichess-pinned-recapture-potential-v3',status:'diagnostic-complete',
    input:{path:input,sha256:sha(bytes)},counts:{...counts,uniqueSourceGamesWithPinnedPair:sourceGames.size},
    bounds:{maxSeconds,maxEvaluations,maxRssMiB:2048,minFreeMiB:256,heapMiB:256,cpuDuty:0.5},
    resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20},
    pairs,neuralEventsDelivered:0,graphLaunchAuthorized:false,validationInspected:false,finalInspected:false,
    scope:'Targeted two-piece relocation search over deduplicated training roots only. Hypothetical FEN positions are separate from the source task and preserve its provenance; this diagnostic does not establish complete relevant history, Stage 1 family registration, learning, or reasoning.'};
  const path=inside(output);mkdirSync(dirname(path),{recursive:true});const reportBytes=Buffer.from(JSON.stringify(report,null,2)+'\n');
  const partial=path+'.partial',fd=openSync(partial,'wx');try{writeFileSync(fd,reportBytes);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);process.stdout.write(JSON.stringify({status:report.status,counts:report.counts,report:relative(root,path).replaceAll('\\','/'),...report.resources,graphLaunchAuthorized:false})+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'probe-error',error:String(error).slice(0,500)})+'\n');process.exitCode=2;});


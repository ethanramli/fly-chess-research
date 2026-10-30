// Feasibility only: can one audited Lichess capture root support all four
// frozen Stage 1 recapture strata in a six-piece synthetic micro-task?
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess} from 'chess.js';
import {classifyCaptureRetentionStratum} from '../../src/puzzle-learning/capture-retention-stratum.mjs';

const {values:a}=parseArgs({options:{batches:{type:'string'},audit:{type:'string'},out:{type:'string'}}});
assert(a.batches&&a.audit&&a.out);assert(process.execArgv.includes('--max-old-space-size=256'));
const root=resolve('.'),sha=b=>createHash('sha256').update(b).digest('hex');
const strata=['absent-defender','open-defender','blocked-defender','pinned-apparent-defender'];
const started=performance.now();let evaluations=0,peakRss=0;
function guard(){evaluations++;peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(evaluations<=200_000,'Evaluation bound exhausted');
  assert(performance.now()-started<=1800_000,'Elapsed-time bound exhausted');
  assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'Resource guard');}
function read(path){const target=resolve(root,path),rel=relative(root,target);
  assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Input escaped repository root');
  return readFileSync(target);}
const uci=m=>m.from+m.to+(m.promotion??'');
function pieces(board){return board.board().flatMap((rank,y)=>rank.map((p,x)=>p&&{
  type:p.type,color:p.color,square:String.fromCharCode(97+x)+(8-y)})).filter(Boolean);}
function makeBoard(cells,turn){
  const ranks=Array.from({length:8},(_,y)=>{let s='',n=0;for(let x=0;x<8;x++){
    const p=cells.get(String.fromCharCode(97+x)+(8-y));if(!p){n++;continue;}
    if(n){s+=n;n=0;}s+=p.color==='w'?p.type.toUpperCase():p.type;
  }if(n)s+=n;return s;});
  return new Chess(`${ranks.join('/')} ${turn} - - 0 1`);
}
function legalStatic(board){
  const kings=pieces(board).filter(p=>p.type==='k');if(kings.length!==2)return false;
  const enemy=board.turn()==='w'?'b':'w',king=kings.find(p=>p.color===enemy);
  return !board.isCheck()&&!board.isAttacked(king.square,board.turn());
}
function category(board,move){
  guard();
  if(!board.moves({verbose:true}).some(candidate=>uci(candidate)===move))return null;
  const before=board.fen();const result=classifyCaptureRetentionStratum(board,move);
  assert.equal(board.fen(),before);return result.status==='classified'?result.stratum:null;
}
function hasCore(rootBoard,move){
  const all=pieces(rootBoard),actor=all.find(p=>p.square===move.slice(0,2)),target=all.find(p=>p.square===move.slice(2,4));
  if(!actor||!target)return null;
  const core=all.filter(p=>p.type==='k'||p.square===actor.square||p.square===target.square);
  if(core.length!==4)return null;
  const cells=new Map(core.map(p=>[p.square,p]));
  let board;try{board=makeBoard(cells,rootBoard.turn());}catch{return null;}
  if(!legalStatic(board)||!board.moves({verbose:true}).some(m=>uci(m)===move&&m.captured))return null;
  const capture=board.moves({verbose:true}).find(m=>uci(m)===move);board.move(capture);
  const nonChecking=!board.isCheck();board.undo();if(!nonChecking)return null;
  return {cells,board:makeBoard(cells,rootBoard.turn()),actor,target};
}
function enumerateOne(board,move,base,types,colors,required){
  for(const color of colors)for(const type of types)for(let rank=1;rank<=8;rank++)for(let file=0;file<8;file++){
    const square=String.fromCharCode(97+file)+rank;if(base.cells.has(square))continue;
    const cells=new Map(base.cells);cells.set(square,{color,type,square});let candidate;
    try{candidate=makeBoard(cells,board.turn());}catch{continue;}
    if(pieces(candidate).length>6||!legalStatic(candidate))continue;
    const result=category(candidate,move);if(result===required)return true;
  }
  return false;
}
function hasBlocked(board,move,base){
  const target=move.slice(2,4),tx=target.charCodeAt(0)-97,ty=Number(target[1])-1;
  for(const [dx,dy,types] of [[1,0,['r','q']],[-1,0,['r','q']],[0,1,['r','q']],
    [0,-1,['r','q']],[1,1,['b','q']],[1,-1,['b','q']],[-1,1,['b','q']],[-1,-1,['b','q']]]){
    const ray=[];for(let x=tx+dx,y=ty+dy;x>=0&&x<8&&y>=0&&y<8;x+=dx,y+=dy)
      ray.push(String.fromCharCode(97+x)+(y+1));
    for(let i=0;i<ray.length;i++)for(let j=i+1;j<ray.length;j++){
      const attacker=ray[j],blocker=ray[i];if(base.cells.has(attacker)||base.cells.has(blocker))continue;
      for(const type of types){const cells=new Map(base.cells);
        cells.set(attacker,{color:board.turn()==='w'?'b':'w',type,square:attacker});
        cells.set(blocker,{color:board.turn(),type:'p',square:blocker});let candidate;
        try{candidate=makeBoard(cells,board.turn());}catch{continue;}
        if(legalStatic(candidate)&&category(candidate,move)==='blocked-defender')return true;
      }
    }
  }
  return false;
}
function hasPinned(board,move,base){
  const target=move.slice(2,4),tx=target.charCodeAt(0)-97,ty=Number(target[1])-1;
  const kings=pieces(base.board).filter(p=>p.type==='k'),enemyKing=kings.find(p=>p.color!==board.turn());
  const knightSquares=[];for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){
    if(Math.abs(dx*dy)!==2)continue;const x=tx+dx,y=ty+dy;
    if(x>=0&&x<8&&y>=0&&y<8)knightSquares.push(String.fromCharCode(97+x)+(y+1));
  }
  for(let kr=1;kr<=8;kr++)for(let kf=0;kf<8;kf++){
    const kingSquare=String.fromCharCode(97+kf)+kr;
    if(kingSquare!==enemyKing.square&&base.cells.has(kingSquare))continue;
    for(const knight of knightSquares){if(knight===kingSquare||base.cells.has(knight)&&knight!==enemyKing.square)continue;
      const x=knight.charCodeAt(0)-97,y=Number(knight[1])-1,kdx=Math.sign(x-kf),kdy=Math.sign(y-(kr-1));
      if(!(kdx===0||kdy===0||Math.abs(x-kf)===Math.abs(y-(kr-1))))continue;
      const between=[];for(let bx=kf+kdx,by=kr-1+kdy;bx!==x||by!==y;bx+=kdx,by+=kdy)
        between.push(String.fromCharCode(97+bx)+(by+1));
      const baseWithoutKing=new Map(base.cells);baseWithoutKing.delete(enemyKing.square);
      if(between.some(square=>baseWithoutKing.has(square)))continue;
      for(let sx=x+kdx,sy=y+kdy;sx>=0&&sx<8&&sy>=0&&sy<8;sx+=kdx,sy+=kdy){
        const slider=String.fromCharCode(97+sx)+(sy+1);if(baseWithoutKing.has(slider))continue;
        const cells=new Map(baseWithoutKing);cells.set(kingSquare,{color:enemyKing.color,type:'k',square:kingSquare});
        cells.set(knight,{color:enemyKing.color,type:'n',square:knight});
        cells.set(slider,{color:board.turn(),type:kdx===0||kdy===0?'r':'b',square:slider});let candidate;
        try{candidate=makeBoard(cells,board.turn());}catch{continue;}
        if(legalStatic(candidate)&&category(candidate,move)==='pinned-apparent-defender')return true;
      }
    }
  }
  return false;
}
const packBytes=read(join(a.batches,'manifest.json')),pack=JSON.parse(packBytes),auditBytes=read(a.audit);
const audit=JSON.parse(auditBytes);assert.equal(pack.phase,'complete');assert.equal(pack.pending,null);
assert.equal(audit.schema,'lichess-csv-lesson-batch-audit-v1');assert.equal(audit.passed,true);
assert.equal(audit.batchManifestSha256,sha(packBytes));assert.equal(audit.finalSplitInspected,false);
assert.equal(audit.sourceHistoryVerified,true);assert.equal(audit.consequenceCertificatesRechecked,true);
const rows={train:[],validation:[]};
for(const split of ['train','validation']){
  const entries=pack.completed.filter(row=>row.job.startsWith(`prepare-${split}-`));assert.equal(entries.length,4);
  for(const item of entries){
    const dir=join(a.batches,`${split}-chunk-${item.job.slice(-3)}`);
    const manifestBytes=read(join(dir,'manifest.json'));assert.equal(sha(manifestBytes),item.manifestSha256);
    const manifest=JSON.parse(manifestBytes);assert.equal(manifest.split,split);
    const lessonBytes=read(join(dir,'lessons.jsonl'));assert.equal(sha(lessonBytes),manifest.outputSha256);
    rows[split].push(...lessonBytes.toString('utf8').split(/\r?\n/).filter(Boolean)
      .map(line=>({line,record:JSON.parse(line)})));
  }
  assert.equal(rows[split].length,128);
}
assert(!pack.completed.some(row=>row.job.includes('final')));
const result={schema:'stage1-synthetic-microfamily-feasibility-v2',
  inputs:{batchManifestSha256:sha(packBytes),lessonAuditSha256:sha(auditBytes)},
  finalSplitInspected:false,neuralEventsDelivered:0,graphLaunchAuthorized:false,bySplit:{},
  scope:'Static feasibility only. Each candidate task keeps the Lichess-derived capture coordinates and piece identities but is a synthetic FEN-rooted micro-position; no task is authentic game history and no training is authorized.'};
for(const split of ['train','validation']){
  const roots=[];
  for(const {line,record:row} of rows[split]){
      if(!row.lesson?.stage1DomainEligible)continue;
      const source=new Chess();source.loadPgn(row.lesson.context.pgn);
      const solutionMove=row.history?.solutionMoves?.[0];
      if(typeof solutionMove!=='string'||!source.moves({verbose:true})
        .some(m=>uci(m)===solutionMove&&m.captured))continue;
      const move=solutionMove,base=hasCore(source,move);if(!base)continue;
      const found={};found['absent-defender']=category(base.board,move)==='absent-defender';
      found['open-defender']=enumerateOne(base.board,move,base,['n','p','r','b','q'],[source.turn()==='w'?'b':'w'],'open-defender');
      found['blocked-defender']=hasBlocked(base.board,move,base);
      found['pinned-apparent-defender']=hasPinned(base.board,move,base);
      roots.push({puzzleId:row.lesson.puzzleId,gameId:row.lesson.gameId,move,
        sourceRecordSha256:sha(Buffer.from(line)),strata:found,
        allFour:strata.every(name=>found[name])});
  }
  const complete=roots.filter(x=>x.allFour);
  result.bySplit[split]={eligibleCoreCaptures:roots.length,
    capturesWithAllFour:complete.length,
    distinctPuzzleRootsWithAllFour:new Set(complete.map(x=>x.puzzleId)).size,
    distinctSourceGamesWithAllFour:new Set(complete.map(x=>x.gameId)).size,
    coverage:Object.fromEntries(strata.map(s=>[s,roots.filter(x=>x.strata[s]).length])),
    candidates:complete.slice(0,16)};
}
result.resources={evaluations,peakRssMiB:peakRss/2**20,elapsedSeconds:(performance.now()-started)/1000};
const out=resolve(root,a.out),outRel=relative(root,out);assert(outRel&&!outRel.startsWith('..')&&!isAbsolute(outRel));
assert(!existsSync(out)&&!existsSync(`${out}.partial`),'Output already exists');
const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
writeFileSync(`${out}.partial`,bytes,{flag:'wx'});renameSync(`${out}.partial`,out);
process.stdout.write(JSON.stringify({status:'complete',bySplit:Object.fromEntries(Object.entries(result.bySplit)
  .map(([split,row])=>[split,{eligibleCoreCaptures:row.eligibleCoreCaptures,
    capturesWithAllFour:row.capturesWithAllFour,
    distinctPuzzleRootsWithAllFour:row.distinctPuzzleRootsWithAllFour,
    distinctSourceGamesWithAllFour:row.distinctSourceGamesWithAllFour,coverage:row.coverage}])),
  report:a.out,finalSplitInspected:false,graphLaunchAuthorized:false,resources:result.resources})+'\n');

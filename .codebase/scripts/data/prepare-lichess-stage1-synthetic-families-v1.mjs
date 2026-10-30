// Stage 1 synthetic counterfactual families from source-bound Lichess puzzles.
// Each family keeps one puzzle's first-solution capture (actor/target squares
// and piece types) inside explicitly hypothetical <=6-piece task positions.
// Teacher-side preparation only: no learner, Stockfish or neural event runs here.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {closeSync,existsSync,fsyncSync,mkdirSync,openSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess} from 'chess.js';
import {classifyCaptureRetentionStratum} from '../../src/puzzle-learning/capture-retention-stratum.mjs';
import {certifyCaptureRetentionActions,checkCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';

export const SCHEMA='lichess-stage1-synthetic-families-v1';
export const TASK=Object.freeze({objective:'capture-retention',plies:1});
// Predeclared split compositions: [template, pairs] per family, in order.
export const COMPOSITION={
  train:[['pin',2],['pin',2],['pin',2],['blocked',2],['blocked',1],['absent',3]],
  validation:[['pin',2],['pin',2],['blocked',2],['absent',2]],
  final:[['pin',4],['pin',4],['pin',4],['pin',4],['blocked',4],['blocked',4],['absent',4],['absent',4]],
};
const LABEL={pin:['pinned-apparent-defender','open-defender'],blocked:['blocked-defender','blocked-defender'],
  absent:['absent-defender','absent-defender']};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const uci=move=>move.from+move.to+(move.promotion??'');
const files='abcdefgh';
const SQUARES=[...files].flatMap(f=>[1,2,3,4,5,6,7,8].map(r=>f+r));

function rng(seedText){
  let x=createHash('sha256').update(seedText).digest().readUInt32LE(0)||1;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/0x1_0000_0000;};
}
const pick=(random,items)=>items[Math.floor(random()*items.length)];
const xy=square=>[square.charCodeAt(0)-97,Number(square[1])-1];
const sq=(x,y)=>x>=0&&x<8&&y>=0&&y<8?files[x]+(y+1):null;

export function fenFromCells(cells,turn){
  const ranks=[];
  for(let y=7;y>=0;y--){let row='',empty=0;
    for(let x=0;x<8;x++){const piece=cells.get(sq(x,y));
      if(!piece){empty++;continue;}if(empty){row+=empty;empty=0;}
      row+=piece.color==='w'?piece.type.toUpperCase():piece.type;}
    if(empty)row+=empty;ranks.push(row);}
  return `${ranks.join('/')} ${turn} - - 0 1`;
}

// Static legality plus the bounded task contract; null when unusable.
export function taskBoard(cells,turn){
  if(cells.size>6)return null;
  const kings=[...cells.values()].filter(piece=>piece.type==='k');
  if(kings.length!==2||kings[0].color===kings[1].color)return null;
  for(const [square,piece] of cells)if(piece.type==='p'&&(square[1]==='1'||square[1]==='8'))return null;
  let board;try{board=new Chess(fenFromCells(cells,turn));}catch{return null;}
  const enemy=turn==='w'?'b':'w';
  const enemyKing=[...cells].find(([,piece])=>piece.type==='k'&&piece.color===enemy)[0];
  if(board.inCheck()||board.isAttacked(enemyKing,turn)||board.isGameOver())return null;
  const legal=board.moves({verbose:true});
  if(!legal.length||legal.length>64)return null;
  return board;
}

// Complete all-legal certificates for one board; null when any proof is unknown.
export function certify(board){
  const proofs=certifyCaptureRetentionActions(board,TASK);
  const checked=checkCaptureRetentionActions(board,TASK,proofs);
  if(checked.some(row=>row.status==='unknown'))return null;
  return proofs.map(({move,proof},index)=>({move,proof,status:checked[index].status,actor:board.turn(),
    learningAllowed:checked[index].learningAllowed,certificateSha256:checked[index].certificateSha256}));
}

export function stratumOf(board,move){
  const result=classifyCaptureRetentionStratum(board,move);
  return result.status==='classified'?result.stratum:null;
}

function legalCapture(board,move){
  const action=board.moves({verbose:true}).find(candidate=>uci(candidate)===move);
  return action&&action.captured&&!action.promotion&&!action.flags.includes('e')?action:null;
}

// Evaluate one counterfactual pair: board1 retains only F, board2 retains only G,
// G fails on board1 and F fails on board2, with the registered focal strata.
function checkPair(template,cells1,cells2,turn,focal){
  const one=taskBoard(cells1,turn);if(!one||!legalCapture(one,focal))return null;
  const two=taskBoard(cells2,turn);if(!two||!legalCapture(two,focal))return null;
  const firstCandidates=certify(one);if(!firstCandidates)return null;
  const successOne=firstCandidates.filter(row=>row.status==='success').map(row=>row.move);
  if(successOne.length!==1||successOne[0]!==focal)return null;
  const secondCandidates=certify(two);if(!secondCandidates)return null;
  const successTwo=secondCandidates.filter(row=>row.status==='success').map(row=>row.move);
  if(successTwo.length!==1||successTwo[0]===focal)return null;
  const other=successTwo[0];
  if(!legalCapture(one,other)||firstCandidates.find(row=>row.move===other)?.status!=='failure')return null;
  if(secondCandidates.find(row=>row.move===focal)?.status!=='failure')return null;
  const focalTwo=template==='pin'?focal:other;
  const labels=[stratumOf(one,focal),stratumOf(two,focalTwo)];
  if(labels[0]!==LABEL[template][0]||labels[1]!==LABEL[template][1])return null;
  return {boards:[one,two],candidates:[firstCandidates,secondCandidates],actionIds:[focal,other],
    focal:[focal,focalTwo],labels};
}

function lineType(dx,dy){return dx===0||dy===0?'r':'b';}
const KNIGHT=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
const KING=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

// Geometric attack set for proposals only; checkPair re-verifies with chess.js.
function attackSquares(type,color,from,cells){
  const [x,y]=xy(from),out=[];
  if(type==='p'){const dy=color==='w'?1:-1;for(const dx of [-1,1]){const s=sq(x+dx,y+dy);if(s)out.push(s);}return out;}
  if(type==='n'||type==='k'){for(const [dx,dy] of type==='n'?KNIGHT:KING){const s=sq(x+dx,y+dy);if(s)out.push(s);}return out;}
  const dirs=[...(type!=='b'?[[1,0],[-1,0],[0,1],[0,-1]]:[]),...(type!=='r'?[[1,1],[1,-1],[-1,1],[-1,-1]]:[])];
  for(const [dx,dy] of dirs)for(let k=1;k<8;k++){const s=sq(x+dx*k,y+dy*k);if(!s)break;out.push(s);if(cells.has(s))break;}
  return out;
}
const pawnRankOk=(type,square)=>type!=='p'||(square[1]!=='1'&&square[1]!=='8');
function defenderSquares(type,color,cells,attacked,notAttacked){
  return SQUARES.filter(square=>!cells.has(square)&&pawnRankOk(type,square)).filter(square=>{
    const hits=attackSquares(type,color,square,cells);
    return hits.includes(attacked)&&!hits.includes(notAttacked);
  });
}
function placeKings(cells,random,own,enemy){
  const options=SQUARES.filter(square=>!cells.has(square));
  const ownKing=pick(random,options),enemyKing=pick(random,options.filter(square=>square!==ownKing));
  return [ownKing,enemyKing];
}

// One template attempt. Returns two cell maps or null; validity is checked by checkPair.
function propose(template,root,random){
  const own=root.turn,enemy=own==='w'?'b':'w';
  const cells=new Map([[root.from,{type:root.actorType,color:own}],[root.to,{type:root.targetType,color:enemy}]]);
  const free=()=>{const options=SQUARES.filter(square=>!cells.has(square));return options.length?pick(random,options):null;};
  const place=(type,color)=>{const square=free();if(square)cells.set(square,{type,color});return square;};
  if(template==='absent'){
    // D defends T2 only; board2 relocates D to defend T1 only.
    const secondType=pick(random,['n','b','r','p']);
    const seconds=attackSquares(root.actorType,own,root.from,cells)
      .filter(square=>!cells.has(square)&&pawnRankOk(secondType,square));
    if(!seconds.length)return null;
    const second=pick(random,seconds);cells.set(second,{type:secondType,color:enemy});
    const defenderType=pick(random,['n','b','r','q']);
    const firstOptions=defenderSquares(defenderType,enemy,cells,second,root.to);
    if(!firstOptions.length)return null;
    const first=pick(random,firstOptions);
    const secondOptions=defenderSquares(defenderType,enemy,cells,root.to,second).filter(square=>square!==first);
    if(!secondOptions.length)return null;
    const relocated=pick(random,secondOptions);
    const [ownKing,enemyKing]=placeKings(new Map([...cells,[first,1],[relocated,1]]),random);
    const one=new Map(cells),two=new Map(cells);
    one.set(first,{type:defenderType,color:enemy});two.set(relocated,{type:defenderType,color:enemy});
    for(const board of [one,two]){board.set(ownKing,{type:'k',color:own});board.set(enemyKing,{type:'k',color:enemy});}
    return [one,two];
  }
  if(template==='blocked'){
    // D -- T2 -- T1 on one line; board2 moves D to the far side of T1.
    const [tx,ty]=xy(root.to);
    const lines=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].flatMap(([dx,dy])=>{
      const near=[];for(let k=1;k<8;k++){const s=sq(tx+dx*k,ty+dy*k);if(!s||cells.has(s))break;near.push(s);}
      const far=[];for(let k=1;k<8;k++){const s=sq(tx-dx*k,ty-dy*k);if(!s||cells.has(s))break;far.push(s);}
      const reach=attackSquares(root.actorType,own,root.from,cells);
      return near.flatMap((second,index)=>reach.includes(second)&&index<near.length-1&&far.length
        ?[{dx,dy,second,beyond:near.slice(index+1),far}]:[]);
    });
    if(!lines.length)return null;
    const line=pick(random,lines),slider=pick(random,['q',lineType(line.dx,line.dy)]);
    const secondType=pick(random,['n','b','r','p']);if(!pawnRankOk(secondType,line.second))return null;
    cells.set(line.second,{type:secondType,color:enemy});
    const first=pick(random,line.beyond),relocated=pick(random,line.far);
    const [ownKing,enemyKing]=placeKings(new Map([...cells,[first,1],[relocated,1]]),random);
    const one=new Map(cells),two=new Map(cells);
    one.set(first,{type:slider,color:enemy});two.set(relocated,{type:slider,color:enemy});
    for(const board of [one,two]){board.set(ownKing,{type:'k',color:own});board.set(enemyKing,{type:'k',color:enemy});}
    return [one,two];
  }
  // pin: P -- D -- k collinear, D defends T1 only off the pin line; board2 moves k.
  const defender=free();if(!defender)return null;
  cells.set(defender,{type:pick(random,['n','b','r','q']),color:enemy});
  const [ex,ey]=xy(defender),[px,py]=pick(random,[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
  const kingSquare=sq(ex-px,ey-py);if(!kingSquare||cells.has(kingSquare))return null;
  cells.set(kingSquare,{type:'k',color:enemy});
  const ray=[];for(let k=1;k<8;k++){const square=sq(ex+px*k,ey+py*k);if(!square)break;ray.push(square);}
  const open=[];for(const square of ray){if(cells.has(square))break;open.push(square);}
  if(!open.length)return null;
  cells.set(pick(random,open),{type:pick(random,['q',lineType(px,py)]),color:own});
  place('k',own);if(cells.size!==6)return null;
  const moved=new Map(cells);moved.delete(kingSquare);
  const target=pick(random,SQUARES.filter(square=>!moved.has(square)));moved.set(target,{type:'k',color:enemy});
  return [cells,moved];
}

export function rootFromHistory(history){
  assert.equal(history?.schema,'lichess-history-binding-v1');
  assert.equal(history.historyStatus,'verified-standard-start-prefix');
  assert.equal(sha256(Buffer.from(history.context.pgn)),history.prefixPgnSha256,'Source prefix hash mismatch');
  const board=new Chess();board.loadPgn(history.context.pgn);
  assert.equal(board.fen(),history.context.fen,'Source history does not reach its position');
  const move=history.solutionMoves?.[0];if(typeof move!=='string')return null;
  const action=legalCapture(board,move);
  if(!action||action.piece==='k')return null;
  return {turn:board.turn(),from:action.from,to:action.to,actorType:action.piece,targetType:action.captured,move};
}

export function buildPair(template,root,seed,maxAttempts){
  const random=rng(seed);
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const proposal=propose(template,root,random);if(!proposal)continue;
    const pair=checkPair(template,proposal[0],proposal[1],root.turn,root.move);
    if(pair)return {...pair,attempts:attempt};
  }
  return null;
}

function occupancy(board){
  return new Map(board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&[
    String.fromCharCode(97+col)+(8-row),`${piece.color}:${piece.type}`]).filter(Boolean)));
}
export function occupancyDiff(before,after){
  const a=occupancy(before),b=occupancy(after);
  return [...new Set([...a.keys(),...b.keys()])].sort().flatMap(square=>{
    const from=a.get(square)??null,to=b.get(square)??null;
    return from===to?[]:[{square,before:from,after:to}];
  });
}

export function taskRecord({split,sourceLine,history,board,candidates,lessonId}){
  const sourceRecordSha256=sha256(Buffer.from(sourceLine));
  const source=new Chess();source.loadPgn(history.context.pgn);
  const fen=board.fen(),pgn=new Chess(fen).pgn();
  const context={fen,pgn,task:{...TASK},historyKind:'synthetic-root-position',parentSourceRecordSha256:sourceRecordSha256};
  const mutation=occupancyDiff(source,board);
  const taskPositionSha256=sha256(JSON.stringify({taskFen:fen,historyKind:context.historyKind,
    sourceRecordSha256,mutation,task:context.task}));
  const counts=Object.fromEntries(['success','failure','unknown'].map(status=>[status,candidates.filter(row=>row.status===status).length]));
  return {split,sourceRecordSha256,
    syntheticPosition:{schema:'lichess-synthetic-task-position-v1',sourceRecordSha256,sourceFen:history.context.fen,
      taskFen:fen,sideToMove:board.turn(),mutation,occupancyDiff:mutation,taskPositionSha256},
    lesson:{schema:'lichess-capture-lesson-v1',puzzleId:history.puzzleId,gameId:history.gameId,lessonId,context,
      pieceCount:occupancy(board).size,candidates,counts,stage1DomainEligible:true,reasons:[],neuralEventsDelivered:0,
      scope:'Explicitly synthetic FEN-rooted Stage 1 task bound to a verified Lichess source puzzle; all-legal one-reply capture-retention certificates, not overall move quality'},
    history};
}

function atomicWrite(path,text){
  const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

export function prepareSplit({split,sourceLines,maxAttempts=20000,guard=()=>{},onProgress=()=>{}}){
  const composition=COMPOSITION[split];assert(composition,'Unknown split');
  const sources=sourceLines.map(line=>({line,record:JSON.parse(line)}))
    .filter(({record})=>record.split===split&&record.history)
    .map(entry=>({...entry,order:sha256(Buffer.from(`${SCHEMA}:${entry.record.history.puzzleId}`))}))
    .sort((a,b)=>a.order.localeCompare(b.order));
  const usedGames=new Set(),rows=[],assignments=[],pairs=[],probes=[],attemptLog=[],failed=new Set();
  const remaining=sources.flatMap(entry=>{
    const root=rootFromHistory(entry.record.history);
    if(!root)attemptLog.push({puzzleId:entry.record.history.puzzleId,result:'no-first-solution-capture'});
    return root?[{...entry,root}]:[];
  });
  for(const [familyIndex,[template,pairCount]] of composition.entries()){
    let family=null;
    for(const entry of remaining){
      guard();
      const history=entry.record.history,root=entry.root,key=`${history.puzzleId}:${template}:${pairCount}`;
      if(usedGames.has(history.gameId)||failed.has(key))continue;
      const built=[],seen=new Set();
      for(let pairIndex=0;pairIndex<pairCount;pairIndex++){
        let pair=null;
        for(let variant=0;variant<4&&!pair;variant++){
          const candidate=buildPair(template,root,`${SCHEMA}:${history.puzzleId}:${template}:${pairIndex}:${variant}`,maxAttempts);
          if(!candidate)break;
          if(!seen.has(candidate.boards[0].fen())&&!seen.has(candidate.boards[1].fen()))pair=candidate;
        }
        if(!pair)break;
        seen.add(pair.boards[0].fen());seen.add(pair.boards[1].fen());built.push(pair);
      }
      attemptLog.push({puzzleId:history.puzzleId,template,result:built.length===pairCount?'family-built':'insufficient-pairs',pairs:built.length});
      onProgress({family:familyIndex,template,roots:attemptLog.length,built:built.length===pairCount});
      if(built.length===pairCount){family={entry,root,built};break;}
      failed.add(key);
    }
    assert(family,`No source root supports ${split} family ${familyIndex} (${template})`);
    remaining.splice(remaining.indexOf(family.entry),1);
    const history=family.entry.record.history;usedGames.add(history.gameId);
    const familyId=`s1syn-${split}-f${familyIndex}-${template}`;
    family.built.forEach((pair,pairIndex)=>{
      const ids=['a','b'].map(side=>`${familyId}-p${pairIndex}${side}`);
      pair.boards.forEach((board,index)=>{
        rows.push(taskRecord({split,sourceLine:family.entry.line,history,board,candidates:pair.candidates[index],lessonId:ids[index]}));
        assignments.push({split,stage:1,puzzleId:history.puzzleId,lessonId:ids[index],panelId:ids[index],familyId,
          stratum:pair.labels[index],focalAction:pair.focal[index],template});
        probes.push(...pair.actionIds.map(actionId=>({panelId:ids[index],actionId})));
      });
      pairs.push({pairId:`${familyId}-p${pairIndex}`,familyId,firstPanelId:ids[0],secondPanelId:ids[1],actionIds:[...pair.actionIds]});
    });
  }
  return {rows,assignments,pairs,probes,attemptLog,sourcesConsidered:sources.length};
}

export async function main(){
  const {values:args}=parseArgs({options:{split:{type:'string'},sources:{type:'string',multiple:true},out:{type:'string'},
    'max-attempts':{type:'string'}}});
  assert(['train','validation','final'].includes(args.split)&&args.sources?.length&&args.out,
    'Usage: --split train|validation|final --sources FILE... --out DIR');
  assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with --max-old-space-size=256');
  const started=performance.now();let peak=0;
  const guard=()=>{peak=Math.max(peak,process.memoryUsage().rss);
    assert(peak<=2048*2**20&&os.freemem()>=256*2**20,'Resource guard');
    assert(performance.now()-started<=3600_000,'Elapsed-time guard');};
  const inputs=[],sourceLines=[];
  for(const path of args.sources){const bytes=readFileSync(path);inputs.push({path:path.replaceAll('\\','/'),sha256:sha256(bytes)});
    sourceLines.push(...bytes.toString('utf8').split(/\r?\n/).filter(Boolean));}
  const out=resolve(args.out);mkdirSync(out,{recursive:true});
  const rowsPath=join(out,`${args.split}.jsonl`);assert(!existsSync(rowsPath),'Preserve existing split output');
  const result=prepareSplit({split:args.split,sourceLines,maxAttempts:Number(args['max-attempts']??20000),guard,
    onProgress:row=>process.stderr.write(JSON.stringify(args.split==='final'?{family:row.family,built:row.built}:row)+'\n')});
  const rowsText=result.rows.map(row=>JSON.stringify(row)).join('\n')+'\n';
  const families={schema:args.split==='train'?'lichess-stage1-training-families-v1':'lichess-stage1-evaluation-families-v1',
    assignments:result.assignments};
  const familiesText=JSON.stringify(families,null,1)+'\n';
  const plan={schema:'lichess-stage1-synthetic-split-plan-v1',split:args.split,
    panelIds:result.assignments.map(row=>row.panelId),probeActions:result.probes,counterfactualPairs:result.pairs};
  atomicWrite(rowsPath,rowsText);
  atomicWrite(join(out,`${args.split}-families.json`),familiesText);
  atomicWrite(join(out,`${args.split}-plan.json`),JSON.stringify(plan,null,1)+'\n');
  const manifest={schema:`${SCHEMA}-manifest`,split:args.split,inputs,composition:COMPOSITION[args.split],
    outputs:{rows:sha256(Buffer.from(rowsText)),families:sha256(Buffer.from(familiesText))},
    counts:{rows:result.rows.length,families:new Set(result.assignments.map(row=>row.familyId)).size,
      pairs:result.pairs.length,sourcesConsidered:result.sourcesConsidered,
      strata:Object.fromEntries(Object.entries(Object.groupBy(result.assignments,row=>row.stratum)).map(([k,v])=>[k,v.length]))},
    attemptLog:args.split==='final'?{entries:result.attemptLog.length}:result.attemptLog,
    elapsedMs:Math.round(performance.now()-started),peakRssMiB:+(peak/2**20).toFixed(1),
    scope:'Teacher-side synthetic task preparation; requires the separate independent audit before any registration. No learner, Stockfish or neural event.'};
  atomicWrite(join(out,`${args.split}-manifest.json`),JSON.stringify(manifest,null,1)+'\n');
  process.stdout.write(JSON.stringify({split:args.split,...manifest.counts,elapsedMs:manifest.elapsedMs,peakRssMiB:manifest.peakRssMiB})+'\n');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(error=>{process.stderr.write(String(error?.stack??error).slice(0,2000)+'\n');process.exitCode=2;});

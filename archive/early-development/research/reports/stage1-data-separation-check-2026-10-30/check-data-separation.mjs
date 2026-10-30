// Read-only Stage 1 data-separation check. Binds each requested split through the
// production panel binders and reports counts and input hashes only. Validation and
// final FENs, placements, PGNs, moves and identifiers are never emitted.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {closeSync,existsSync,fsyncSync,openSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';
import {bindLichessTrainingPanel,bindLichessEvaluationPanel} from '../../../.codebase/src/puzzle-learning/lichess-curriculum-panel.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const DATA_DIR='research/data/lichess-stage1-synthetic-v1';
const SPLITS=['train','validation','final'];
const KEY_TYPES=['exact','exactWithHistory','symmetry','placementOnly'];
const FILES='abcdefgh';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
// Parse errors from sealed inputs can echo file content, so they are replaced with a generic message.
const parseJson=text=>{try{return JSON.parse(text);}catch{throw new Error('invalid JSON input');}};

export function exactKey(fen){return fen.split(' ').slice(0,4).join(' ');}
export function placementKey(fen){return fen.split(' ')[0];}

const expandRank=rank=>rank.replace(/\d/g,n=>'.'.repeat(+n));
const compressRank=rank=>rank.replace(/\.+/g,dots=>String(dots.length));
const swapCase=ch=>ch===ch.toUpperCase()?ch.toLowerCase():ch.toUpperCase();

// Horizontal mirror (files a<->h) and/or colour flip (ranks reversed, colours and side swapped) of exact fields.
function transform([placement,side,castling,ep],{mirror,flip}){
  let ranks=placement.split('/').map(expandRank);
  if(mirror)ranks=ranks.map(rank=>[...rank].reverse().join(''));
  if(flip)ranks=ranks.reverse().map(rank=>rank.replace(/[a-zA-Z]/g,swapCase));
  const rights=castling==='-'?'':[...castling].map(ch=>flip?swapCase(ch):ch).join('');
  let square=ep;
  if(square!=='-'&&mirror)square=FILES[7-FILES.indexOf(square[0])]+square[1];
  if(square!=='-'&&flip)square=square[0]+(9-Number(square[1]));
  const turn=flip?(side==='w'?'b':'w'):side;
  return [ranks.map(compressRank).join('/'),turn,[...'KQkq'].filter(ch=>rights.includes(ch)).join('')||'-',square].join(' ');
}

// Smallest of the valid transforms of exact; mirrors need castling to be '-'.
export function symmetryKey(fen){
  const fields=exactKey(fen).split(' '),variants=[exactKey(fen),transform(fields,{mirror:false,flip:true})];
  if(fields[2]==='-')variants.push(transform(fields,{mirror:true,flip:false}),transform(fields,{mirror:true,flip:true}));
  return variants.sort()[0];
}

export function boardKeys(fen,moves){
  const exact=exactKey(fen);
  return {exact,exactWithHistory:sha256(`${exact}\n${moves.join(' ')}`),symmetry:symmetryKey(fen),placementOnly:placementKey(fen)};
}

// Keys that occur more than once within one split.
export function repeatedKeys(keys){
  const seen=new Set(),repeated=new Set();
  for(const key of keys){if(seen.has(key))repeated.add(key);seen.add(key);}
  return repeated;
}

export function duplicateBoards(keys){const repeated=repeatedKeys(keys);return keys.filter(key=>repeated.has(key)).length;}

// Distinct keys present on both sides, and boards on each side carrying one of them.
export function sharedKeys(leftKeys,rightKeys){
  const right=new Set(rightKeys),shared=new Set(leftKeys.filter(key=>right.has(key)));
  return {sharedKeys:shared.size,leftBoards:leftKeys.filter(key=>shared.has(key)).length,
    rightBoards:rightKeys.filter(key=>shared.has(key)).length};
}

// Counterfactual pairs: ids, unordered panel pairs, unordered board pairs by exact key, and panel reuse.
export function pairStats(pairs,exactByPanel,boardsInSplit){
  const boardPairs=new Set(),panelUse=new Map();let unresolvedPairs=0;
  for(const pair of pairs){
    const a=exactByPanel.get(pair.firstPanelId),b=exactByPanel.get(pair.secondPanelId);
    if(a===undefined||b===undefined)unresolvedPairs++;else boardPairs.add(JSON.stringify([a,b].sort()));
    for(const panel of new Set([pair.firstPanelId,pair.secondPanelId]))panelUse.set(panel,(panelUse.get(panel)??0)+1);
  }
  return {pairs:pairs.length,distinctPairIds:new Set(pairs.map(pair=>pair.pairId)).size,
    distinctUnorderedPanelPairs:new Set(pairs.map(pair=>JSON.stringify([pair.firstPanelId,pair.secondPanelId].sort()))).size,
    distinctUnorderedBoardPairsByExact:boardPairs.size,unresolvedPairs,distinctPanelsCovered:panelUse.size,
    panelsInMultiplePairs:[...panelUse.values()].filter(n=>n>1).length,boardsInSplit};
}

function readInput(name){
  const bytes=readFileSync(resolve(ROOT,DATA_DIR,name));
  return {bytes,input:{path:`${DATA_DIR}/${name}`,sha256:sha256(bytes)}};
}

// Same inputs and panel binding as the data audit; its source-record replay is not repeated here.
function loadSplit(split){
  const rows=readInput(`${split}.jsonl`),families=readInput(`${split}-families.json`),plan=readInput(`${split}-plan.json`);
  const registrationSha256=sha256(families.bytes),bind=split==='train'?bindLichessTrainingPanel:bindLichessEvaluationPanel;
  const byLesson=new Map(rows.bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(line=>{
    const row=parseJson(line);return [row.lesson?.lessonId,row];}));
  const boards=[];let bindFailures=0;
  for(const family of parseJson(families.bytes.toString('utf8')).assignments){
    try{
      const panel=bind(byLesson.get(family.lessonId),{...family,registrationSha256});
      const board=new Chess();board.loadPgn(panel.context.pgn);
      boards.push({panelId:panel.panelId,familyId:panel.familyId,keys:boardKeys(board.fen(),board.history())});
    }catch{bindFailures++;}
  }
  return {boards,bindFailures,pairs:parseJson(plan.bytes.toString('utf8')).counterfactualPairs,
    inputs:{rows:rows.input,families:families.input,plan:plan.input}};
}

function atomicWrite(path,text){
  assert(!existsSync(path),'Preserve existing check output');
  const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

export async function main(){
  const {values:args}=parseArgs({options:{splits:{type:'string',default:SPLITS.join(',')},out:{type:'string'}}});
  const requested=args.splits.split(','),splits=SPLITS.filter(split=>requested.includes(split));
  assert.equal(splits.length,requested.length,'Use --splits from train,validation,final without repeats');
  assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with --max-old-space-size=256');
  const started=performance.now(),loaded=Object.fromEntries(splits.map(split=>[split,loadSplit(split)]));
  const crossSplit={};
  for(let i=0;i<splits.length;i++)for(let j=i+1;j<splits.length;j++){
    const left=loaded[splits[i]].boards,right=loaded[splits[j]].boards;
    crossSplit[`${splits[i]}-${splits[j]}`]=Object.fromEntries(KEY_TYPES.map(type=>[type,
      sharedKeys(left.map(board=>board.keys[type]),right.map(board=>board.keys[type]))]));
  }
  const report={schema:'stage1-data-separation-check-v1',
    scope:'Counts and input hashes only. Validation and final FENs, placements, PGNs, moves and identifiers are never emitted; train family IDs appear only under trainWitnessFamilyIds.',
    inputs:Object.fromEntries(splits.map(split=>[split,loaded[split].inputs])),
    splits:Object.fromEntries(splits.map(split=>{
      const {boards,bindFailures,pairs}=loaded[split];
      return [split,{boards:boards.length,bindFailures,
        duplicateBoards:Object.fromEntries(KEY_TYPES.map(type=>[type,duplicateBoards(boards.map(board=>board.keys[type]))])),
        counterfactualPairs:pairStats(pairs,new Map(boards.map(board=>[board.panelId,board.keys.exact])),boards.length)}];})),
    crossSplit};
  if(loaded.train){
    const trainBoards=loaded.train.boards,others=splits.filter(split=>split!=='train').flatMap(split=>loaded[split].boards);
    const repeated=Object.fromEntries(KEY_TYPES.map(type=>[type,repeatedKeys(trainBoards.map(board=>board.keys[type]))]));
    const otherKeys=Object.fromEntries(KEY_TYPES.map(type=>[type,new Set(others.map(board=>board.keys[type]))]));
    report.trainWitnessFamilyIds=[...new Set(trainBoards.filter(board=>KEY_TYPES.some(type=>
      repeated[type].has(board.keys[type])||otherKeys[type].has(board.keys[type]))).map(board=>board.familyId))].sort();
  }
  report.elapsedMs=Math.round(performance.now()-started);
  report.peakRssMiB=+(process.memoryUsage.rss()/2**20).toFixed(1);
  const text=JSON.stringify(report,null,1)+'\n';
  if(args.out)atomicWrite(resolve(args.out),text);
  process.stdout.write(text);
  return splits.every(split=>loaded[split].bindFailures===0)?0:1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().then(code=>{process.exitCode=code;},error=>{process.stderr.write(String(error?.stack??error).slice(0,2000)+'\n');process.exitCode=2;});

// Apply the same one-piece capture-retention counterfactual to audited v7 train
// and validation rows. Static variants remain candidate data, never teaching.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {relative,resolve,isAbsolute,join} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{batches:{type:'string'},audit:{type:'string'},out:{type:'string'}}});
assert(a.batches&&a.audit&&a.out&&!existsSync(a.out));
assert(process.execArgv.includes('--max-old-space-size=256'));
const root=resolve('.'),sha=b=>createHash('sha256').update(b).digest('hex');
const task={objective:'capture-retention',plies:1};
const bounds={splits:['train','validation'],maxRowsPerSplit:128,maxEvaluationsPerSplit:20000,
  maxSeconds:1800,maxRssMiB:2048,minFreeMiB:256,cpuDuty:0.5};
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel));return target;}
function read(path,max){const bytes=readFileSync(local(path));assert(bytes.length<=max);return bytes;}
function uci(move){return move.from+move.to+(move.promotion??'');}
function pieces(board){return board.board().flatMap((rank,row)=>rank.map((piece,col)=>piece&&
  {...piece,square:String.fromCharCode(97+col)+(8-row)}).filter(Boolean));}
function placement(board,from,to){
  const cells=board.board().map(rank=>rank.map(piece=>piece&&{type:piece.type,color:piece.color}));
  const idx=square=>({row:7-(Number(square[1])-1),col:square.charCodeAt(0)-97});
  const a=idx(from),b=idx(to),piece=cells[a.row][a.col];assert(piece&&!cells[b.row][b.col]);
  cells[a.row][a.col]=null;cells[b.row][b.col]=piece;
  return cells.map(rank=>{let text='',empty=0;for(const cell of rank){if(!cell){empty++;continue;}
    if(empty){text+=empty;empty=0;}text+=cell.color==='w'?cell.type.toUpperCase():cell.type;}
    if(empty)text+=empty;return text;}).join('/');
}
function legalStatic(board){
  const kings=pieces(board).filter(piece=>piece.type==='k');if(kings.length!==2)return false;
  const side=board.turn(),other=side==='w'?'b':'w',king=kings.find(piece=>piece.color===other);
  return !board.isCheck()&&!board.isAttacked(king.square,side);
}
function outcome(board,move){
  const proof=certifyCaptureRetentionAction(board,move,task);
  const checked=checkCaptureRetentionAction(board,move,task,proof);
  assert.equal(checked.verified,true);assert.notEqual(checked.status,'unknown');return checked.status;
}
function sourceRows(batches,audit){
  const pack=JSON.parse(read(join(batches,'manifest.json'),16*2**20));
  const auditDoc=JSON.parse(read(audit,2**20));
  const packBytes=read(join(batches,'manifest.json'),16*2**20);
  assert.equal(pack.phase,'complete');assert.equal(pack.pending,null);
  assert.equal(auditDoc.schema,'lichess-csv-lesson-batch-audit-v1');assert.equal(auditDoc.passed,true);
  assert.equal(auditDoc.batchManifestSha256,sha(packBytes));assert.equal(auditDoc.finalSplitInspected,false);
  assert.equal(auditDoc.sourceHistoryVerified,true);assert.equal(auditDoc.consequenceCertificatesRechecked,true);
  const rows={train:[],validation:[]},chunks=[];
  for(const split of bounds.splits){
    const entries=pack.completed.filter(row=>new RegExp(`^prepare-${split}-\\d{3}$`).test(row.job));
    assert.equal(entries.length,4,`Require exactly four ${split} chunks`);
    for(const entry of entries){
      const expected=join(batches,`${split}-chunk-${entry.job.slice(-3)}`);
      const chunkManifest=read(join(expected,'manifest.json'),2**20);
      assert.equal(sha(chunkManifest),entry.manifestSha256);const manifest=JSON.parse(chunkManifest);
      assert.equal(manifest.split,split);const lessonBytes=read(join(expected,'lessons.jsonl'),16*2**20);
      assert.equal(sha(lessonBytes),manifest.outputSha256);
      const lines=lessonBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
      assert.equal(lines.length,32);chunks.push({job:entry.job,manifestSha256:entry.manifestSha256,
        lessonsSha256:sha(lessonBytes),rows:lines.length});
      for(const line of lines)rows[split].push({line,record:JSON.parse(line),chunk:relative(root,expected).replaceAll('\\','/')});
    }
    assert.equal(rows[split].length,bounds.maxRowsPerSplit);
  }
  assert(!pack.completed.some(row=>row.job.includes('final')),'Final inputs are prohibited');
  return {pack,auditDoc,rows,chunks};
}

async function main(){
  assert(process.execArgv.includes('--max-old-space-size=256'));
  const batches=local(a.batches),audit=local(a.audit),out=local(a.out);
  assert(!existsSync(out));
  const inputs=sourceRows(batches,audit);mkdirSync(out,{recursive:false});
  const started=performance.now(),cpuStart=process.cpuUsage();let lastCpu=process.cpuUsage(),peakRss=0,evaluations=0;
  const pacer=makeCpuDutyPacer(bounds.cpuDuty,guard);
  function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
    assert(peakRss<=bounds.maxRssMiB*2**20&&os.freemem()>=bounds.minFreeMiB*2**20,'resource guard');
    assert(performance.now()-started<=bounds.maxSeconds*1000,'elapsed guard');}
  async function pace(){const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();
    await pacer((used.user+used.system)/1000);guard();}
  const report={schema:'lichess-v7-stage1-capture-counterfactual-feasibility-v1',
    method:'For each audited, source-bound Stage 1 root, move one non-king piece to an empty square in a legal static FEN. Keep the same capture action and require its independent one-reply retention consequence to flip.',
    inputs:{batchManifestSha256:sha(read(join(batches,'manifest.json'),16*2**20)),
      lessonAuditSha256:sha(read(audit,2**20)),chunks:inputs.chunks},bounds,
    bySplit:{},neuralEventsDelivered:0,graphLaunchAuthorized:false,finalSplitInspected:false,
    scope:'Candidate construction from audited train and validation roots only; static variants are synthetic-history candidates and are not learning authorization.'};
  for(const split of bounds.splits){
    const counts={rows:0,eligibleRows:0,rootsWithFlip:0,mutations:0,evaluations:0,flipPairs:0,byTransition:{}};
    const flips=[],unique=new Set();
    for(const {line,record,chunk} of inputs.rows[split]){
      guard();counts.rows++;assert.equal(record.split,split);
      const lesson=record.lesson;if(!lesson?.stage1DomainEligible)continue;
      counts.eligibleRows++;
      assert.equal(record.history?.historyStatus,'verified-standard-start-prefix');
      const base=new Chess();base.loadPgn(lesson.context.pgn);
      assert.equal(base.fen(),lesson.context.fen);assert.equal(record.history.prefixPgnSha256,sha(Buffer.from(lesson.context.pgn)));
      assert.equal(base.history({verbose:true})[0]?.before,DEFAULT_POSITION);
      if(base.isGameOver()||base.fen().split(' ')[2]!=='-'||base.fen().split(' ')[3]!=='-')continue;
      assert(pieces(base).length<=6);
      const captures=base.moves({verbose:true}).filter(move=>move.captured).map(uci).sort();if(!captures.length)continue;
      const before=new Map(captures.map(move=>[move,outcome(base,move)]));let rootFound=false;
      for(const piece of pieces(base).filter(piece=>piece.type!=='k')){
        for(let row=0;row<8;row++)for(let col=0;col<8;col++){
          const to=String.fromCharCode(97+col)+(8-row);if(to===piece.square||base.get(to))continue;
          let variant;try{variant=new Chess(`${placement(base,piece.square,to)} ${base.turn()} - - ${base.fen().split(' ')[4]} ${base.fen().split(' ')[5]}`);}catch{continue;}
          if(!legalStatic(variant))continue;counts.mutations++;
          const legal=new Set(variant.moves({verbose:true}).map(uci));
          for(const move of captures){
            if(!legal.has(move)||move.slice(0,2)===piece.square||move.slice(2,4)===piece.square)continue;
            counts.evaluations++;assert(counts.evaluations<=bounds.maxEvaluationsPerSplit,'comparison bound');evaluations++;
            const after=outcome(variant,move);if(evaluations%128===0)await pace();if(after===before.get(move))continue;
            const key=[lesson.puzzleId,move,piece.square,to].join(':');if(unique.has(key))continue;unique.add(key);
            flips.push({split,puzzleId:lesson.puzzleId,gameId:lesson.gameId,sourceChunk:chunk,
              sourceRecordSha256:sha(Buffer.from(line)),sourceFen:base.fen(),syntheticFen:variant.fen(),
              changedPiece:{color:piece.color,type:piece.type,from:piece.square,to},unchangedCapture:move,
              sourceOutcome:before.get(move),counterfactualOutcome:after,
              scope:'static board perturbation of an audited Lichess root; synthetic history'});
            const transition=`${before.get(move)}-to-${after}`;counts.byTransition[transition]=(counts.byTransition[transition]??0)+1;
            counts.flipPairs++;rootFound=true;
          }
        }
      }
      if(rootFound)counts.rootsWithFlip++;
    }
    report.bySplit[split]={counts,flips};
  }
  guard();report.resources={elapsedSeconds:(performance.now()-started)/1000,
    cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20};
  const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');assert(bytes.length<=64*2**20);
  writeFileSync(join(out,'report.json.partial'),bytes,{flag:'wx'});renameSync(join(out,'report.json.partial'),join(out,'report.json'));
  const manifest={schema:'lichess-v7-stage1-capture-counterfactual-candidates-v1',reportSha256:sha(bytes),
    inputs:report.inputs,counts:Object.fromEntries(bounds.splits.map(split=>[split,report.bySplit[split].counts])),
    finalSplitInspected:false,neuralEventsDelivered:0,graphLaunchAuthorized:false,
    scope:'Candidate feasibility only; no family audit, learning or reasoning claim.'};
  const m=Buffer.from(JSON.stringify(manifest,null,2)+'\n');writeFileSync(join(out,'manifest.json.partial'),m,{flag:'wx'});
  renameSync(join(out,'manifest.json.partial'),join(out,'manifest.json'));
  process.stdout.write(JSON.stringify({status:'complete',counts:manifest.counts,finalSplitInspected:false,
    graphLaunchAuthorized:false,elapsedSeconds:report.resources.elapsedSeconds,peakRssMiB:report.resources.peakRssMiB})+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'probe-error',error:String(error).slice(0,500)})+'\n');process.exitCode=2;});

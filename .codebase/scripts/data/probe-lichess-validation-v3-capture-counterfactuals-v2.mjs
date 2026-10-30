// Apply the registered one-piece capture-retention counterfactual to the
// independently audited validation corpus. Static FENs are candidate stimuli only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {relative,resolve,isAbsolute,join} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{prepared:{type:'string'},audit:{type:'string'},out:{type:'string'}}});
assert(a.prepared&&a.audit&&a.out&&!existsSync(a.out));assert(process.execArgv.includes('--max-old-space-size=256'));
const root=resolve('.'),sha=b=>createHash('sha256').update(b).digest('hex'),task={objective:'capture-retention',plies:1};
const bounds={maxValidationRows:1022,maxEligibleRows:192,maxEvaluations:100000,maxSeconds:1800,
  maxRssMiB:2048,minFreeMiB:256,cpuDuty:0.5};
function local(path){const target=resolve(path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel));return target;}
function read(path,max){const bytes=readFileSync(local(path));assert(bytes.length<=max);return bytes;}
const uci=move=>move.from+move.to+(move.promotion??'');
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
function legalStatic(board){const kings=pieces(board).filter(piece=>piece.type==='k');if(kings.length!==2)return false;
  // The side to move may legally be in check. Reject only a position where
  // the side that just moved left its own king attacked.
  const side=board.turn(),previousMoverKing=kings.find(piece=>piece.color!==(side));
  return !board.isAttacked(previousMoverKing.square,side);}
function outcome(board,move){const proof=certifyCaptureRetentionAction(board,move,task);
  const checked=checkCaptureRetentionAction(board,move,task,proof);assert.equal(checked.verified,true);
  assert.notEqual(checked.status,'unknown');return checked.status;}

async function main(){
  const prepared=local(a.prepared),audit=local(a.audit),out=local(a.out);assert(!existsSync(out));
  const manifestBytes=read(join(prepared,'manifest.json'),16*2**20),manifest=JSON.parse(manifestBytes);
  const auditBytes=read(audit,2*2**20),auditDoc=JSON.parse(auditBytes);
  const lessonBytes=read(join(prepared,'lessons.jsonl'),64*2**20),lines=lessonBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  assert.equal(manifest.schema,'lichess-prepared-lessons-v1');assert.equal(manifest.split,'validation');
  assert.equal(manifest.outputSha256,sha(lessonBytes));assert.equal(manifest.counts.prepared,1022);
  assert.equal(auditDoc.schema,'lichess-validation-lessons-audit-v3');assert.equal(auditDoc.passed,true);
  assert.equal(auditDoc.preparedManifestSha256,sha(manifestBytes));assert.equal(auditDoc.preparedLessonsSha256,sha(lessonBytes));
  assert.equal(auditDoc.stage1DomainEligible,bounds.maxEligibleRows);assert.equal(auditDoc.finalSplitInspected,false);
  assert.equal(auditDoc.eligibleForNeuralTeaching,false);assert.equal(auditDoc.graphLaunchAuthorized,false);
  assert.equal(lines.length,bounds.maxValidationRows);const records=lines.map(line=>({line,record:JSON.parse(line)}));
  const started=performance.now(),cpuStart=process.cpuUsage();let lastCpu=process.cpuUsage(),peakRss=0,evaluations=0;
  const pacer=makeCpuDutyPacer(bounds.cpuDuty,guard);
  function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
    assert(peakRss<=bounds.maxRssMiB*2**20&&os.freemem()>=bounds.minFreeMiB*2**20,'resource guard');
    assert(performance.now()-started<=bounds.maxSeconds*1000,'elapsed guard');}
  async function pace(){const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await pacer((used.user+used.system)/1000);guard();}
  const counts={validationRows:0,eligibleRows:0,rootsWithFlip:0,mutations:0,evaluations:0,flipPairs:0,byTransition:{}};
  const flips=[],seen=new Set();
  for(const {line,record} of records){
    guard();counts.validationRows++;assert.equal(record.split,'validation');
    if(record.lesson?.stage1DomainEligible!==true)continue;counts.eligibleRows++;
    assert.equal(record.history?.historyStatus,'verified-standard-start-prefix');
    const base=new Chess();base.loadPgn(record.lesson.context.pgn);
    assert.equal(base.fen(),record.lesson.context.fen);assert.equal(base.history({verbose:true})[0]?.before,DEFAULT_POSITION);
    assert.equal(record.history.prefixPgnSha256,sha(Buffer.from(record.lesson.context.pgn)));
    if(base.isGameOver()||base.fen().split(' ')[2]!=='-'||base.fen().split(' ')[3]!=='-')continue;
    assert(pieces(base).length<=6);
    const captures=base.moves({verbose:true}).filter(move=>move.captured).map(uci).sort();if(!captures.length)continue;
    const before=new Map(captures.map(move=>[move,outcome(base,move)]));let rootFound=false;
    for(const piece of pieces(base).filter(piece=>piece.type!=='k'))for(let row=0;row<8;row++)for(let col=0;col<8;col++){
      const to=String.fromCharCode(97+col)+(8-row);if(to===piece.square||base.get(to))continue;
      let variant;try{variant=new Chess(`${placement(base,piece.square,to)} ${base.turn()} - - ${base.fen().split(' ')[4]} ${base.fen().split(' ')[5]}`);}catch{continue;}
      if(!legalStatic(variant))continue;counts.mutations++;
      const legal=new Set(variant.moves({verbose:true}).map(uci));
      for(const move of captures){
        if(!legal.has(move)||move.slice(0,2)===piece.square||move.slice(2,4)===piece.square)continue;
        counts.evaluations++;assert(counts.evaluations<=bounds.maxEvaluations,'comparison bound');evaluations++;
        const after=outcome(variant,move);if(evaluations%128===0)await pace();if(after===before.get(move))continue;
        const key=[record.lesson.puzzleId,move,piece.square,to].join(':');if(seen.has(key))continue;seen.add(key);
        flips.push({split:'validation',puzzleId:record.lesson.puzzleId,gameId:record.lesson.gameId,
          sourceChunk:'research/data/lichess-validation-prepared-v3/lessons.jsonl',sourceRecordSha256:sha(Buffer.from(line)),
          sourceFen:base.fen(),syntheticFen:variant.fen(),changedPiece:{color:piece.color,type:piece.type,from:piece.square,to},
          unchangedCapture:move,sourceOutcome:before.get(move),counterfactualOutcome:after,
          scope:'validation-only static board perturbation of an audited Lichess root; synthetic history'});
        const transition=`${before.get(move)}-to-${after}`;counts.byTransition[transition]=(counts.byTransition[transition]??0)+1;
        counts.flipPairs++;rootFound=true;
      }
    }
    if(rootFound)counts.rootsWithFlip++;
  }
  guard();mkdirSync(out,{recursive:false});
  const report={schema:'lichess-validation-v3-stage1-capture-counterfactual-feasibility-v1',
    method:'Same bounded one-piece capture-retention mutation used for the audited training roots; source and synthetic positions remain separate and explicit.',
    inputs:{preparedManifestSha256:sha(manifestBytes),preparedLessonsSha256:sha(lessonBytes),lessonAuditSha256:sha(auditBytes)},
    bounds,counts,flips,resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20},
    finalSplitInspected:false,neuralEventsDelivered:0,graphLaunchAuthorized:false,
    scope:'Validation-only candidate construction; no family audit, neural teaching, or final-set access.'};
  const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');assert(bytes.length<=64*2**20);
  writeFileSync(join(out,'report.json.partial'),bytes,{flag:'wx'});renameSync(join(out,'report.json.partial'),join(out,'report.json'));
  writeFileSync(join(out,'manifest.json.partial'),JSON.stringify({schema:'lichess-validation-v3-stage1-capture-counterfactual-candidates-v1',
    reportSha256:sha(bytes),counts,finalSplitInspected:false,neuralEventsDelivered:0,graphLaunchAuthorized:false,
    scope:report.scope},null,2)+'\n',{flag:'wx'});renameSync(join(out,'manifest.json.partial'),join(out,'manifest.json'));
  process.stdout.write(JSON.stringify({status:'complete',counts,elapsedSeconds:report.resources.elapsedSeconds,
    peakRssMiB:report.resources.peakRssMiB,finalSplitInspected:false,graphLaunchAuthorized:false})+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'probe-error',error:String(error).slice(0,500)})+'\n');process.exitCode=2;});

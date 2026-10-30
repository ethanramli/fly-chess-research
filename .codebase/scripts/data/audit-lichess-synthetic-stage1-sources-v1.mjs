// Candidate provenance only. Never parses the reserved final JSONL or grants
// teaching permission. Does not import the curator or its row producer.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,statSync,createReadStream,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {Chess} from 'chess.js';
import {makeCpuDutyPacer,publishAtomicJson} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{corpus:{type:'string'},out:{type:'string'},'cpu-duty':{type:'string'}}});
assert(a.corpus&&a.out&&Number(a['cpu-duty'])===0.5&&process.execArgv.includes('--max-old-space-size=256'));
assert(!existsSync(a.out),'Require fresh audit output');
const started=performance.now(),cpuStart=process.cpuUsage();let peakRss=0,lastCpu=process.cpuUsage();
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'Source audit memory guard');
  assert(performance.now()-started<=300000,'Source audit elapsed bound');}
const pacer=makeCpuDutyPacer(0.5,guard);
async function pace(){guard();const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await pacer((used.user+used.system)/1000);guard();}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bounded=(path,max)=>{guard();assert(statSync(path).size<=max,'Audit input exceeds bound');return readFileSync(path);};
const hashFile=async path=>{const hash=createHash('sha256');for await(const chunk of createReadStream(path)){hash.update(chunk);await pace();}return hash.digest('hex');};
const isHash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const manifestBytes=bounded(join(a.corpus,'manifest.json'),65536),m=JSON.parse(manifestBytes);
assert.equal(m.schema,'lichess-puzzle-corpus-v2');assert.equal(m.source.license,'CC0-1.0');
assert.equal(m.source.url,'https://database.lichess.org/');assert(isHash(m.source.inputBytesSha256));
assert.equal(m.curator.node,process.version);assert.equal(m.curator.cpuDuty,0.5);
assert(Number.isSafeInteger(m.curator.maxPieces)&&m.curator.maxPieces>=2&&m.curator.maxPieces<=32);
assert(Number.isSafeInteger(m.curator.limitPerSplit)&&m.curator.limitPerSplit>=1&&m.curator.limitPerSplit<=4096);
assert.equal(sha(bounded(m.curator.scriptPath,4*2**20)),m.curator.scriptSha256);
assert.equal(sha(bounded('.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs',4*2**20)),m.curator.pacerSha256);
assert.equal(m.status.fullGameHistoryRetrieved,false);assert.equal(m.status.consequenceCertificatesCreated,false);
assert.equal(m.status.eligibleForNeuralTeaching,false);assert.equal(m.status.finalSplitMustRemainSealedAfterProtocolFreeze,true);
if(m.curator.onlySplit!==undefined){
  assert(['train','validation'].includes(m.curator.onlySplit));
  for(const split of ['train','validation'])if(split!==m.curator.onlySplit)assert.equal(m.counts.selected[split],0);
  assert.equal(m.counts.selected.final,0);
  if(m.curator.requireMatchedCaptures){assert.equal(m.curator.onlySplit,'train');
    assert.equal(sha(bounded('.codebase/src/puzzle-learning/mixed-capture-filter.mjs',65536)),m.curator.captureFilterSha256);}
}
assert.equal(typeof m.curator.requireFirstSolutionCapture,'boolean');
if(m.curator.requireFirstSolutionCapture)assert(['train','validation'].includes(m.curator.onlySplit));
assert(isHash(m.outputs['final.jsonl'])); // Manifest identity only; no final file access.
const selected=new Map(),positions=new Set(),counts={train:0,validation:0};
const uci=/^[a-h][1-8][a-h][1-8][qrbn]?$/;
function play(board,move){assert(uci.test(move),'Malformed source move');board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});}
for(const split of ['train','validation']){
  const bytes=bounded(join(a.corpus,split+'.jsonl'),64*2**20);assert.equal(sha(bytes),m.outputs[split+'.jsonl']);
  const lines=bytes.toString('utf8').split('\n');assert.equal(lines.pop(),'','Require complete canonical JSONL');
  if(bytes.length===0)assert.equal(lines.length,0);
  assert(lines.length<=m.curator.limitPerSplit);
  for(const line of lines){
    guard();assert(Buffer.byteLength(line)<=65536,'Candidate row exceeds bound');const row=JSON.parse(line);
    assert.equal(row.schema,'lichess-puzzle-source-row-v1');assert(/^[A-Za-z0-9]{1,16}$/.test(row.puzzleId));
    assert(!selected.has(row.puzzleId),'Duplicate puzzle');assert(/^[A-Za-z0-9]{8}$/.test(row.source.gameId));
    const splitValue=createHash('sha256').update('lichess-game-split-v1:'+row.source.gameId).digest().readUInt32BE(0)/2**32;
    assert.equal(split,splitValue<0.8?'train':splitValue<0.9?'validation':'final');
    assert.equal(row.source.license,'CC0-1.0');assert.equal(row.source.url,m.source.url);
    assert([row.rating,row.ratingDeviation,row.plays].every(n=>Number.isSafeInteger(n)&&n>=0));
    assert(Number.isSafeInteger(row.popularity));assert(row.rating>=m.curator.minRating&&row.rating<=m.curator.maxRating);
    assert(Array.isArray(row.themes)&&Array.isArray(row.openingTags));
    assert([...row.themes,...row.openingTags].every(s=>typeof s==='string'&&s.length<=1024));
    assert(m.curator.requiredThemes.every(theme=>row.themes.includes(theme)));
    const url=new URL(row.source.gameUrl);assert(['lichess.org','www.lichess.org'].includes(url.hostname));
    const match=url.pathname.match(/^\/([A-Za-z0-9]{8})(?:\/(white|black))?\/?$/);assert(match);
    assert.equal(match[1],row.source.gameId);assert.equal(match[2]??null,row.source.gameColor);
    const board=new Chess(row.initialFen),initialTurn=board.turn();
    const expectedPly=2*(Number(row.initialFen.trim().split(/\s+/)[5])-1)+(initialTurn==='w'?1:2);
    const ply=url.hash.match(/^#(\d+)$/)?.[1];assert.equal(ply?Number(ply):null,row.source.puzzlePly);
    if(ply)assert.equal(Number(ply),expectedPly);if(match[2])assert.equal(match[2][0],initialTurn);
    play(board,row.setupMove);assert.equal(board.fen(),row.solverFen);assert.equal(board.turn(),row.solverColor);
    if(m.curator.requireFirstSolutionCapture){
      const first=row.solutionMoves[0];assert(board.moves({verbose:true}).some(move=>
        `${move.from}${move.to}${move.promotion??''}`===first&&move.captured),
      'First puzzle solution move must be a legal capture');
    }
    assert(board.board().flat().filter(Boolean).length<=m.curator.maxPieces);
    if(m.curator.requireMatchedCaptures){
      assert.equal(split,'train');
      // Independently recompute the candidate filter; do not import its helper.
      const outcomes=[];
      const captureActions=board.moves({verbose:true}).filter(v=>v.captured);
      assert(!captureActions.some(v=>v.promotion),'Capture-promotion roots outside this filter');
      for(const action of captureActions){
        board.move(action);
        let guarded;
        try{guarded=board.moves({verbose:true}).filter(reply=>reply.to===action.to&&reply.captured).length>0;}
        finally{board.undo();}
        outcomes.push({from:action.from,targetType:action.captured,guarded});
      }
      const safe=outcomes.filter(o=>!o.guarded);assert.equal(safe.length,1,'Missing unique retained capture');
      assert(outcomes.some(o=>o.guarded&&o.from===safe[0].from&&o.targetType===safe[0].targetType),'Missing matched recapturable capture');
    }
    const position=board.fen().split(' ').slice(0,4).join(' ');assert(!positions.has(position),'Duplicate solver position');positions.add(position);
    assert(Array.isArray(row.solutionMoves)&&row.solutionMoves.length>=1&&row.solutionMoves.length<=79);
    for(const move of row.solutionMoves)play(board,move);
    assert.equal(row.history.status,'unresolved');assert.equal(row.history.fullGamePgnRetrieved,false);
    assert.equal(row.consequence.status,'unverified');assert.equal(row.consequence.certificate,null);
    selected.set(row.puzzleId,{row,occurrences:0});counts[split]++;await pace();
  }
  assert.equal(counts[split],m.counts.selected[split]);
}
// Independently parse only selected train/validation IDs from the full source.
function csv(line){
  const fields=[];let rest=line;
  for(;;){const match=rest.match(/^(?:"((?:[^"]|"")*)"|([^",]*))(,|$)/);assert(match,'Malformed source CSV');
    fields.push(match[1]===undefined?match[2]:match[1].replaceAll('""','"'));
    rest=rest.slice(match[0].length);if(match[3]===''){assert.equal(rest,'');return fields;}}
}
const columns=['PuzzleId','FEN','Moves','Rating','RatingDeviation','Popularity','NbPlays','Themes','GameUrl','OpeningTags','DailyDate'];
assert.deepEqual(m.source.schema,columns);
const hash=createHash('sha256'),source=createReadStream(m.source.sourcePath);source.on('data',chunk=>{guard();hash.update(chunk);});
const lines=createInterface({input:source,crlfDelay:Infinity});let lineCount=0,sourceRows=0;
for await(const line of lines){
  if(++lineCount%1024===0)await pace();
  if(lineCount===1){assert.deepEqual(csv(line),columns);continue;}if(!line)continue;sourceRows++;
  const id=line.match(/^"?([A-Za-z0-9]{1,16})"?,/)?.[1];if(!selected.has(id))continue;
  const fields=csv(line);assert.equal(fields.length,columns.length);const {row}=selected.get(id);
  const words=text=>text.trim()?text.trim().split(/\s+/):[];
  assert.deepEqual([fields[0],fields[1],words(fields[2]),...fields.slice(3,7).map(Number),words(fields[7]),fields[8],words(fields[9]),fields[10]||null],
    [row.puzzleId,row.initialFen,[row.setupMove,...row.solutionMoves],row.rating,row.ratingDeviation,row.popularity,row.plays,
      row.themes,row.source.gameUrl,row.openingTags,row.dailyDate],'Candidate differs from pinned CSV row');
  selected.get(id).occurrences++;
}
await pace();assert.equal(hash.digest('hex'),m.source.inputBytesSha256);assert.equal(sourceRows,m.counts.sourceRows);
assert([...selected.values()].every(s=>s.occurrences===1),'Candidate missing or repeated in source CSV');
let compressedSourceChecked=false;
if(m.source.extractionReceipt){
  const extraction=JSON.parse(bounded(m.source.extractionReceipt,65536));assert.equal(extraction.schema,'lichess-archive-extraction-v1');
  assert.equal(extraction.status,'published');assert.equal(resolve(extraction.path),resolve(m.source.sourcePath));
  assert.equal(extraction.sha256,m.source.inputBytesSha256);assert.equal(extraction.archiveSha256,m.source.compressedBytesSha256);
  assert.equal(await hashFile(extraction.archive),extraction.archiveSha256);compressedSourceChecked=true;
}else assert.equal(m.source.compressedBytesSha256,null);
guard();
const report={schema:'lichess-source-candidate-audit-v1',sourceChecksPassed:true,manifestSha256:sha(manifestBytes),
  inputBytesSha256:m.source.inputBytesSha256,compressedSourceChecked,checkedSplits:counts,sourceRows,
  finalSplitInspected:false,relationFamilyDisjointnessEstablished:false,fullGameHistoryVerified:false,
  consequenceCertificatesVerified:false,graphLaunchAuthorized:false,eligibleForNeuralTeaching:false,
  auditor:{path:fileURLToPath(import.meta.url),sha256:sha(readFileSync(fileURLToPath(import.meta.url)))},
  resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20,cpuDuty:0.5},
  scope:'Train/validation source membership, legal line, source-game split and metadata integrity only; no final-content, history, family, consequence or learning claim'};
publishAtomicJson(a.out,report);console.log(JSON.stringify({sourceChecksPassed:true,checkedSplits:counts,finalSplitInspected:false,eligibleForNeuralTeaching:false}));

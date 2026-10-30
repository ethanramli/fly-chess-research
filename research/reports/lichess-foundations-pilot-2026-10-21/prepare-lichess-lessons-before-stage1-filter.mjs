// Bounded source-to-certificate preparation; never loads or updates a graph.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream,existsSync,mkdirSync,readFileSync,renameSync,statSync,writeFileSync,appendFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {join,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {bindLichessApiHistory,bindLichessCsvHistory} from '../../src/puzzle-learning/lichess-history.mjs';
import {prepareLichessCaptureLesson} from '../../src/puzzle-learning/lichess-capture-lesson.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{'api-json':{type:'string'},rows:{type:'string'},games:{type:'string'},
  split:{type:'string',default:'development'},out:{type:'string'},help:{type:'boolean'},
  'cpu-duty':{type:'string',default:'0.5'},'max-seconds':{type:'string',default:'300'},
  'start-row':{type:'string',default:'0'},'row-limit':{type:'string',default:'4096'}}});
if(a.help){
  console.log('Usage: node --max-old-space-size=256 .codebase/scripts/data/prepare-lichess-lessons.mjs (--api-json FILE | --rows JSONL --games PGN_DIRECTORY) --out FRESH_DIRECTORY [--split development|train|validation] [--cpu-duty 0.5] [--max-seconds 300] [--start-row 0] [--row-limit 4096]');
  process.exit(0);
}
assert(a.out&&Boolean(a['api-json'])!==Boolean(a.rows),'Require output and exactly one input format');
assert(['development','train','validation'].includes(a.split),'Final families are not supported by this preparation command');
assert(!a['api-json']||a.split==='development','API samples are development fixtures only');
assert(!a.rows||a.games,'CSV rows require a source-game PGN directory');
assert(process.execArgv.includes('--max-old-space-size=256'),'Require registered heap limit');
const cpuDuty=Number(a['cpu-duty']),maxSeconds=Number(a['max-seconds']);
assert(cpuDuty===0.5&&Number.isSafeInteger(maxSeconds)&&maxSeconds>=1&&maxSeconds<=7200,'Invalid preparation resource limits');
const startRow=Number(a['start-row']),rowLimit=Number(a['row-limit']);
assert(Number.isSafeInteger(startRow)&&startRow>=0&&Number.isSafeInteger(rowLimit)&&rowLimit>0
  &&startRow+rowLimit<=4096,'Invalid source row range');
assert(!a['api-json']||(startRow===0&&rowLimit===4096),'Row ranges require CSV input');
const out=resolve(a.out),input=resolve(a['api-json']??a.rows);
assert(!existsSync(out),'Output must be fresh');
assert(statSync(input).size<=64*1024*1024,'Input exceeds 64 MiB');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sources=new Map(),started=performance.now(),cpuStarted=process.cpuUsage();
let peakRss=0,lastCpu=process.cpuUsage();
function guard(){
  peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'Lesson preparation memory guard');
  assert(performance.now()-started<=maxSeconds*1000,'Lesson preparation elapsed bound');
}
const pace=makeCpuDutyPacer(cpuDuty,guard);
async function paceRow(){
  guard();const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();
  await pace((used.user+used.system)/1000);guard();
}
guard();
mkdirSync(out,{recursive:false});
const lessonPath=join(out,'lessons.jsonl.partial');writeFileSync(lessonPath,'',{flag:'wx'});
const counts={sourceRows:0,prepared:0,rejected:0,stage1DomainEligible:0,unknownActions:0};
const rejections=[],outputHash=createHash('sha256');
let outputBytes=0,inputRows=0;
function prepare(row){
  guard();
  counts.sourceRows++;assert(counts.sourceRows<=4096,'Input exceeds 4096 rows');
  let binding,lesson;
  try{
    if(a['api-json'])binding=bindLichessApiHistory(row);
    else{
      assert.match(row.source?.gameId??'',/^[A-Za-z0-9]{8}$/,'Invalid source game ID');
      const path=join(resolve(a.games),row.source.gameId+'.pgn');
      assert(statSync(path).size<=65536,'Source PGN exceeds 64 KiB');
      const bytes=readFileSync(path);sources.set(path,sha(bytes));
      binding=bindLichessCsvHistory(row,{gameId:row.source.gameId,pgn:bytes.toString('utf8')});
    }
    lesson=prepareLichessCaptureLesson(binding);
  }catch(error){
    counts.rejected++;
    rejections.push({row:counts.sourceRows,puzzleId:row?.puzzleId??row?.puzzle?.id??null,reason:String(error.message).slice(0,256)});
    return;
  }
  // Publication/storage errors are fatal, not malformed-source rejections.
  guard();
  const line=JSON.stringify({split:a.split,history:binding,lesson})+'\n',bytes=Buffer.byteLength(line);
  assert(bytes<=2*1024*1024,'Prepared row exceeds 2 MiB');
  assert(outputBytes+bytes<=64*1024*1024,'Prepared output exceeds 64 MiB');
  appendFileSync(lessonPath,line);outputHash.update(line);outputBytes+=bytes;
  counts.prepared++;counts.stage1DomainEligible+=Number(lesson.stage1DomainEligible);
  counts.unknownActions+=lesson.counts?.unknown??0;
}
if(a['api-json']){
  assert(statSync(input).size<=262144,'API payload exceeds 256 KiB');
  prepare(JSON.parse(readFileSync(input,'utf8')));
  await paceRow();
}else{
  for await(const line of createInterface({input:createReadStream(input),crlfDelay:Infinity})){
    if(!line.trim())continue;
    assert(Buffer.byteLength(line)<=262144,'Source row exceeds 256 KiB');
    const index=inputRows++;assert(inputRows<=4096,'Input exceeds 4096 rows');
    if(index>=startRow&&index<startRow+rowLimit){
      prepare(JSON.parse(line));
      await paceRow();
    }
  }
}
const modules=['.codebase/scripts/data/prepare-lichess-lessons.mjs',
  '.codebase/src/puzzle-learning/lichess-history.mjs','.codebase/src/puzzle-learning/lichess-capture-lesson.mjs',
  '.codebase/src/search-and-feedback/capture-retention-action-domain.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
  '.codebase/src/search-and-feedback/puzzle-search.mjs',
  '.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs','package-lock.json'];
guard();
const manifest={schema:'lichess-prepared-lessons-v1',created:new Date().toISOString(),argv:process.argv.slice(1),
  input:{path:input,sha256:sha(readFileSync(input)),format:a['api-json']?'PuzzleAndGame':'curated-csv-rows'},
  split:a.split,sourceGames:Object.fromEntries(sources),counts,rejections,
  selection:a.rows?{startRow,rowLimit,totalInputRows:inputRows,selectedInputRows:counts.sourceRows}:null,
  sources:Object.fromEntries(modules.map(path=>[path,sha(readFileSync(path))])),node:process.version,
  outputSha256:outputHash.digest('hex'),outputBytes,
  bounds:{maxInputBytes:64*1024*1024,maxSourceRows:4096,maxHistoryPlies:512,maxPgnBytes:65536,
    maxOutputRowBytes:2*1024*1024,maxOutputBytes:64*1024*1024,maxRssMiB:2048,minFreeMiB:256,
    maxSeconds,cpuDuty,heapMiB:256,deadlineScope:'Soft row boundary; a synchronous bounded certificate call is not interruptible.'},
  resources:{cpu:process.cpuUsage(cpuStarted),peakRssMiB:Math.max(peakRss/2**20,process.resourceUsage().maxRSS/1024),cpuDuty},
  elapsedSeconds:(performance.now()-started)/1000,
  peakRssMiB:process.resourceUsage().maxRSS/1024,neuralEventsDelivered:0,graphLaunchAuthorized:false,
  scope:'Teacher preparation only; domain eligibility is not family separation, G0 qualification, neural delivery or a passed curriculum stage'};
writeFileSync(join(out,'manifest.json.partial'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
renameSync(lessonPath,join(out,'lessons.jsonl'));
renameSync(join(out,'manifest.json.partial'),join(out,'manifest.json'));
console.log(JSON.stringify({out,counts,neuralEventsDelivered:0,peakRssMiB:manifest.peakRssMiB}));
if(counts.rejected||!counts.prepared)process.exitCode=1;

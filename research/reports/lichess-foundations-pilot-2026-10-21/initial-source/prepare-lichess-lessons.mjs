// Bounded source-to-certificate preparation; never loads or updates a graph.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream,existsSync,mkdirSync,readFileSync,renameSync,statSync,writeFileSync,appendFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {join,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {bindLichessApiHistory,bindLichessCsvHistory} from '../../src/puzzle-learning/lichess-history.mjs';
import {prepareLichessCaptureLesson} from '../../src/puzzle-learning/lichess-capture-lesson.mjs';

const {values:a}=parseArgs({options:{'api-json':{type:'string'},rows:{type:'string'},games:{type:'string'},
  split:{type:'string',default:'development'},out:{type:'string'},help:{type:'boolean'}}});
if(a.help){
  console.log('Usage: node --max-old-space-size=256 .codebase/scripts/data/prepare-lichess-lessons.mjs (--api-json FILE | --rows JSONL --games PGN_DIRECTORY) --out FRESH_DIRECTORY [--split development|train|validation]');
  process.exit(0);
}
assert(a.out&&Boolean(a['api-json'])!==Boolean(a.rows),'Require output and exactly one input format');
assert(['development','train','validation'].includes(a.split),'Final families are not supported by this preparation command');
assert(!a['api-json']||a.split==='development','API samples are development fixtures only');
assert(!a.rows||a.games,'CSV rows require a source-game PGN directory');
const out=resolve(a.out),input=resolve(a['api-json']??a.rows);
assert(!existsSync(out),'Output must be fresh');
assert(statSync(input).size<=64*1024*1024,'Input exceeds 64 MiB');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sources=new Map(),started=performance.now();
mkdirSync(out,{recursive:false});
const lessonPath=join(out,'lessons.jsonl.partial');writeFileSync(lessonPath,'',{flag:'wx'});
const counts={sourceRows:0,prepared:0,rejected:0,stage1DomainEligible:0,unknownActions:0};
const rejections=[];
function prepare(row){
  counts.sourceRows++;assert(counts.sourceRows<=4096,'Input exceeds 4096 rows');
  try{
    let binding;
    if(a['api-json'])binding=bindLichessApiHistory(row);
    else{
      assert.match(row.source?.gameId??'',/^[A-Za-z0-9]{8}$/,'Invalid source game ID');
      const path=join(resolve(a.games),row.source.gameId+'.pgn');
      assert(statSync(path).size<=65536,'Source PGN exceeds 64 KiB');
      const bytes=readFileSync(path);sources.set(path,sha(bytes));
      binding=bindLichessCsvHistory(row,{gameId:row.source.gameId,pgn:bytes.toString('utf8')});
    }
    const lesson=prepareLichessCaptureLesson(binding);
    counts.prepared++;counts.stage1DomainEligible+=Number(lesson.stage1DomainEligible);
    counts.unknownActions+=lesson.counts?.unknown??0;
    appendFileSync(lessonPath,JSON.stringify({split:a.split,history:binding,lesson})+'\n');
  }catch(error){
    counts.rejected++;
    rejections.push({row:counts.sourceRows,puzzleId:row?.puzzleId??row?.puzzle?.id??null,reason:String(error.message).slice(0,256)});
  }
}
if(a['api-json']){
  assert(statSync(input).size<=262144,'API payload exceeds 256 KiB');
  prepare(JSON.parse(readFileSync(input,'utf8')));
}else{
  for await(const line of createInterface({input:createReadStream(input),crlfDelay:Infinity})){
    if(!line.trim())continue;
    assert(Buffer.byteLength(line)<=262144,'Source row exceeds 256 KiB');
    prepare(JSON.parse(line));
  }
}
const modules=['.codebase/scripts/data/prepare-lichess-lessons.mjs',
  '.codebase/src/puzzle-learning/lichess-history.mjs','.codebase/src/puzzle-learning/lichess-capture-lesson.mjs',
  '.codebase/src/search-and-feedback/capture-retention-action-domain.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
  '.codebase/src/search-and-feedback/puzzle-search.mjs','package-lock.json'];
const manifest={schema:'lichess-prepared-lessons-v1',created:new Date().toISOString(),argv:process.argv.slice(1),
  input:{path:input,sha256:sha(readFileSync(input)),format:a['api-json']?'PuzzleAndGame':'curated-csv-rows'},
  split:a.split,sourceGames:Object.fromEntries(sources),counts,rejections,
  sources:Object.fromEntries(modules.map(path=>[path,sha(readFileSync(path))])),node:process.version,
  outputSha256:sha(readFileSync(lessonPath)),elapsedSeconds:(performance.now()-started)/1000,
  peakRssMiB:process.resourceUsage().maxRSS/1024,neuralEventsDelivered:0,graphLaunchAuthorized:false,
  scope:'Teacher preparation only; domain eligibility is not family separation, G0 qualification, neural delivery or a passed curriculum stage'};
writeFileSync(join(out,'manifest.json.partial'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
renameSync(lessonPath,join(out,'lessons.jsonl'));
renameSync(join(out,'manifest.json.partial'),join(out,'manifest.json'));
console.log(JSON.stringify({out,counts,neuralEventsDelivered:0,peakRssMiB:manifest.peakRssMiB}));
if(counts.rejected||!counts.prepared)process.exitCode=1;

// Independent source-history and consequence replay. Never imports the lesson
// producer/history binder, opens final rows, loads a graph or promotes a stage.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream,readFileSync,statSync,existsSync,realpathSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {resolve,join,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {checkCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {makeCpuDutyPacer,publishAtomicJson} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{config:{type:'string'},batches:{type:'string'},corpus:{type:'string'},
  'source-audit':{type:'string'},'games-root':{type:'string'},out:{type:'string'},
  'cpu-duty':{type:'string',default:'0.5'},'max-seconds':{type:'string',default:'900'}}});
assert(a.config&&a.batches&&a.corpus&&a['source-audit']&&a['games-root']&&a.out&&!existsSync(a.out));
assert(process.execArgv.includes('--max-old-space-size=256')&&Number(a['cpu-duty'])===0.5);
const maxSeconds=Number(a['max-seconds']);assert(Number.isSafeInteger(maxSeconds)&&maxSeconds>=1&&maxSeconds<=7200);
const root=realpathSync('.'),started=performance.now(),cpuStart=process.cpuUsage();
let peakRss=0,lastCpu=process.cpuUsage();
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);
  assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'CSV lesson audit memory guard');
  assert(performance.now()-started<=maxSeconds*1000,'CSV lesson audit elapsed bound');}
const pacer=makeCpuDutyPacer(0.5,guard);
async function pace(){guard();const cpu=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await pacer((cpu.user+cpu.system)/1000);guard();}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function local(path){const actual=realpathSync(resolve(path)),delta=relative(root,actual);
  assert(!isAbsolute(delta)&&delta!=='..'&&!delta.startsWith('..\\')&&!delta.startsWith('../'),'Audit path escapes workspace');return actual;}
function read(path,max){guard();path=local(path);assert(statSync(path).size<=max,'Audit input exceeds bound');return readFileSync(path);}
async function hashFile(path){const h=createHash('sha256');for await(const bytes of createReadStream(local(path))){h.update(bytes);await pace();}return h.digest('hex');}
const configBytes=read(a.config,2**20),config=JSON.parse(configBytes.toString('utf8').replace(/^\uFEFF/,'')),expand=text=>text.replace(/\{(\w+)\}/g,(_,key)=>{
  assert.equal(typeof config.paths[key],'string');return config.paths[key];});
for(const [path,hash] of Object.entries(config.pins))assert.equal(await hashFile(expand(path)),hash,'Changed registered input: '+path);
const packageBytes=read(join(a.batches,'manifest.json'),16*2**20),pack=JSON.parse(packageBytes);
assert.equal(pack.schema,'lichess-preparation-batches-v1');assert.equal(pack.phase,'complete');
assert.equal(pack.configSha256,sha(configBytes));assert.equal(pack.pending,null);
assert.equal(pack.neuralEventsDelivered,0);assert.equal(pack.graphLaunchAuthorized,false);
assert.deepEqual(pack.completed.map(e=>e.job),config.preparation.order);
assert(pack.completed.length>=1&&pack.completed.length<=128);
const corpusBytes=read(join(a.corpus,'manifest.json'),65536),corpus=JSON.parse(corpusBytes);
const sourceAuditBytes=read(a['source-audit'],65536),sourceAudit=JSON.parse(sourceAuditBytes);
assert.equal(sourceAudit.schema,'lichess-source-candidate-audit-v1');assert.equal(sourceAudit.sourceChecksPassed,true);
assert.equal(sourceAudit.manifestSha256,sha(corpusBytes));assert.equal(sourceAudit.finalSplitInspected,false);
assert.equal(await hashFile(sourceAudit.auditor.path),sourceAudit.auditor.sha256);
assert.equal(local(config.paths.sourceManifest),local(join(a.corpus,'manifest.json')));
assert.equal(local(config.paths.sourceAudit),local(a['source-audit']));
const rows={},gameManifests={},cursors={train:0,validation:0},totals={train:{rows:0,eligible:0,unknownActions:0},validation:{rows:0,eligible:0,unknownActions:0}};
for(const split of ['train','validation']){
  const bytes=read(join(a.corpus,split+'.jsonl'),64*2**20);
  assert.equal(sha(bytes),corpus.outputs[split+'.jsonl']);assert(bytes.length===0||bytes.at(-1)===10);
  rows[split]=bytes.toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));
  assert(rows[split].length<=4096);assert.equal(rows[split].length,sourceAudit.checkedSplits[split]);
  if(split==='validation'&&corpus.curator?.onlySplit==='train'){
    assert.equal(rows[split].length,0,'Training-only corpus contains validation rows');
    continue; // No validation games were requested or prepared.
  }
  assert(rows[split].length>0,'Empty split requires explicit training-only declaration');
  const gm=JSON.parse(read(join(a['games-root'],split,'manifest.json'),2**20));gameManifests[split]=gm;
  assert.equal(gm.sourceSplit,split);assert.equal(gm.sourceRows.sha256,sha(bytes));
  assert.equal(gm.status,'complete-response-id-coverage-verified');
  const ids=[...new Set(rows[split].map(row=>row.source.gameId))].sort();
  assert.deepEqual([...gm.api.requestIds].sort(),ids);assert.deepEqual(Object.keys(gm.games).sort(),ids.map(id=>id+'.pgn'));
  assert.equal(await hashFile(join(a['games-root'],split,'response.pgn')),gm.api.responseSha256);
}
const uci=move=>move.from+move.to+(move.promotion??'');
const task={objective:'capture-retention',plies:1};
function checkRecord(record,row,split){
  assert.equal(record.split,split);assert.equal(row.schema,'lichess-puzzle-source-row-v1');
  const id=row.source.gameId;assert(/^[A-Za-z0-9]{8}$/.test(id));
  const gameBytes=read(join(a['games-root'],split,id+'.pgn'),65536);
  assert.equal(sha(gameBytes),gameManifests[split].games[id+'.pgn']);
  const source=new Chess();source.loadPgn(gameBytes.toString('utf8'));
  const headers=source.getHeaders();assert.equal(headers.GameId,id);
  const site=new URL(headers.Site);assert.equal(site.hostname,'lichess.org');assert.equal(site.pathname,'/'+id);
  const history=source.history({verbose:true});assert(history.length>0&&history.length<=512);
  assert.equal(history[0].before,DEFAULT_POSITION);
  const initial=new Chess(row.initialFen).fen(),fields=initial.split(' ');
  const setup=(Number(fields[5])-1)*2+(fields[1]==='w'?1:2);assert(setup>=1&&setup<=history.length);
  assert.equal(history[setup-1].before,initial);assert.equal(uci(history[setup-1]),row.setupMove);
  assert.equal(history[setup-1].after,new Chess(row.solverFen).fen());
  const {lesson,history:binding}=record;
  assert.equal(lesson.schema,'lichess-capture-lesson-v1');assert.equal(binding.schema,'lichess-history-binding-v1');
  assert.equal(lesson.puzzleId,row.puzzleId);assert.equal(lesson.gameId,id);
  assert.equal(binding.puzzleId,row.puzzleId);assert.equal(binding.gameId,id);assert.equal(binding.setupPly,setup);
  assert.equal(binding.setupMove,row.setupMove);assert.equal(binding.initialFen,initial);
  assert.equal(binding.reportedSolverFen,row.solverFen);assert.equal(binding.sourceFormat,'CSV');
  assert.equal(binding.historyStatus,'verified-standard-start-prefix');
  assert.equal(binding.sourcePgnSha256,sha(gameBytes));assert.deepEqual(binding.solutionMoves,row.solutionMoves);
  assert.deepEqual(Object.keys(lesson.context).sort(),['fen','pgn','task']);assert.deepEqual(lesson.context.task,task);
  const board=new Chess();board.loadPgn(lesson.context.pgn);assert.equal(board.fen(),history[setup-1].after);
  assert.equal(lesson.context.fen,board.fen());
  assert.equal(board.turn(),row.solverColor);assert.deepEqual(board.history(),history.slice(0,setup).map(m=>m.san));
  assert.deepEqual(binding.context,{fen:lesson.context.fen,pgn:lesson.context.pgn});
  assert.equal(binding.prefixPgnSha256,sha(lesson.context.pgn));
  const pieceCount=board.board().flat().filter(Boolean).length;assert.equal(lesson.pieceCount,pieceCount);
  const counts={success:0,failure:0,unknown:0};let reasons=[];
  if(board.isGameOver()){
    assert.deepEqual(lesson.candidates,[]);reasons=['terminal-position'];
  }else{
    const legalDetails=board.moves({verbose:true}),legal=legalDetails.map(uci).sort();assert(legal.length>0&&legal.length<=256);
    assert.deepEqual(lesson.candidates.map(c=>c.move),legal);
    const checkedActions=checkCaptureRetentionActions(board,task,lesson.candidates);
    for(const [i,candidate] of lesson.candidates.entries()){
      assert.deepEqual(candidate.context,lesson.context);
      const checked=checkedActions[i];
      assert.equal(candidate.status,checked.status);assert.equal(candidate.actor,board.turn());
      assert.equal(candidate.learningAllowed,checked.learningAllowed);assert.equal(candidate.certificateSha256,checked.certificateSha256);
      counts[checked.status]++;
    }
    assert.deepEqual(lesson.counts,counts);
    if(corpus.curator?.requireMatchedCaptures){
      assert(!legalDetails.some(m=>m.captured&&m.promotion),'Capture-promotion outside declared comparison');
      const success=lesson.candidates.filter(c=>c.status==='success');
      assert.equal(success.length,1,'Missing full-history unique retained capture');
      const safe=legalDetails.find(m=>uci(m)===success[0].move);assert(safe.captured);
      assert(legalDetails.some(m=>m.captured===safe.captured&&m.from===safe.from
        &&lesson.candidates.find(c=>c.move===uci(m)).status==='failure'),'Missing full-history matched recapturable capture');
    }
    if(pieceCount>6)reasons.push('exceeds-stage-1-six-piece-limit');
    if(counts.unknown)reasons.push('incomplete-consequence-coverage');
    if(!counts.success||!counts.failure)reasons.push('missing-success-failure-contrast');
  }
  assert.deepEqual(lesson.reasons,reasons);assert.equal(lesson.stage1DomainEligible,reasons.length===0);
  assert.equal(lesson.neuralEventsDelivered,0);
  return {eligible:Number(reasons.length===0),unknownActions:counts.unknown};
}
for(const entry of pack.completed){
  const manifestBytes=read(entry.manifest,65536);assert.equal(sha(manifestBytes),entry.manifestSha256);
  const m=JSON.parse(manifestBytes),argv=config.jobs[entry.job].argv.map(expand),arg=flag=>argv[argv.indexOf(flag)+1];
  const split=arg('--split');assert(['train','validation'].includes(split));
  assert.equal(m.schema,'lichess-prepared-lessons-v1');assert.equal(m.input.format,'curated-csv-rows');assert.equal(m.split,split);
  assert.equal(local(m.input.path),local(join(a.corpus,split+'.jsonl')));
  assert.equal(m.input.sha256,corpus.outputs[split+'.jsonl']);assert.equal(m.node,process.version);
  assert.equal(m.neuralEventsDelivered,0);assert.equal(m.graphLaunchAuthorized,false);assert.equal(m.counts.rejected,0);
  assert.deepEqual(m.counts,entry.counts);
  assert.equal(m.selection.startRow,Number(arg('--start-row')));assert.equal(m.selection.startRow,cursors[split]);
  assert.equal(m.selection.rowLimit,Number(arg('--row-limit')));assert.equal(m.selection.totalInputRows,rows[split].length);
  assert.equal(m.selection.selectedInputRows,m.selection.rowLimit);assert.equal(m.counts.sourceRows,m.selection.rowLimit);
  for(const [path,h] of Object.entries(m.sources))assert.equal(await hashFile(path),h,'Changed producer dependency');
  for(const [path,h] of Object.entries(m.sourceGames))assert.equal(await hashFile(path),h,'Changed producer source game');
  const output=join(dirname(entry.manifest),'lessons.jsonl');assert.equal(statSync(local(output)).size,m.outputBytes);
  const h=createHash('sha256'),stream=createReadStream(local(output));stream.on('data',chunk=>h.update(chunk));
  let count=0,eligible=0,unknownActions=0;
  for await(const line of createInterface({input:stream,crlfDelay:Infinity})){
    guard();assert(Buffer.byteLength(line)<=2*2**20&&line.length>0);assert(count<m.selection.rowLimit);
    const checked=checkRecord(JSON.parse(line),rows[split][cursors[split]+count],split);
    count++;eligible+=checked.eligible;unknownActions+=checked.unknownActions;await pace();
  }
  assert.equal(h.digest('hex'),m.outputSha256);assert.equal(count,m.counts.prepared);
  assert.equal(eligible,m.counts.stage1DomainEligible);assert.equal(unknownActions,m.counts.unknownActions);
  cursors[split]+=count;totals[split].rows+=count;totals[split].eligible+=eligible;totals[split].unknownActions+=unknownActions;
}
for(const split of ['train','validation'])assert.equal(cursors[split],rows[split].length,'Incomplete source range coverage');
guard();
const result={schema:'lichess-csv-lesson-batch-audit-v1',createdAt:new Date().toISOString(),passed:true,
  configSha256:sha(configBytes),batchManifestSha256:sha(packageBytes),sourceManifestSha256:sha(corpusBytes),
  sourceAuditSha256:sha(sourceAuditBytes),chunks:pack.completed.length,totals,finalSplitInspected:false,
  sourceHistoryVerified:true,consequenceCertificatesRechecked:true,relationFamilyDisjointnessEstablished:false,
  graphLaunchAuthorized:false,eligibleForNeuralTeaching:false,
  auditor:{path:fileURLToPath(import.meta.url),sha256:sha(readFileSync(fileURLToPath(import.meta.url)))},
  resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20,cpuDuty:0.5,maxSeconds},
  scope:'Independent standard-start source-prefix, all-legal immediate-task certificate replay and declared matched-capture checks; requires receiver/family/protocol gates before learning. No neural efficacy, game-quality or reasoning result.'};
publishAtomicJson(a.out,result);console.log(JSON.stringify({passed:true,totals,finalSplitInspected:false,eligibleForNeuralTeaching:false}));

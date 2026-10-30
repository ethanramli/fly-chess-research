// Training-only feasibility probe over already-audited Lichess puzzle source games.
// It looks for real <=6-piece capture-retention positions without changing any board.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,readFileSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {Chess} from 'chess.js';
import {classifyCaptureRetentionStratum} from '../../src/puzzle-learning/capture-retention-stratum.mjs';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const [pgnRoot,rowsPath,auditPath,output]=process.argv.slice(2);
assert(pgnRoot&&rowsPath&&auditPath&&output,'Usage: node probe-lichess-game-history-capture-strata.mjs PGN_ROOT TRAIN_ROWS LESSON_AUDIT OUTPUT');
const maxSeconds=900,maxPositions=500000,maxCaptureChecks=50000;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const uci=move=>move.from+move.to+(move.promotion??'');
const started=performance.now(),cpuStart=process.cpuUsage();let peakRss=0,lastCpu=process.cpuUsage();
function inside(path){const target=resolve(root,path),rel=relative(root,target);assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel));return target;}
function read(path,max){const bytes=readFileSync(inside(path));assert(bytes.length<=max,'Input exceeds size bound');return bytes;}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=2048*2**20&&os.freemem()>=256*2**20,'resource guard');assert(performance.now()-started<=maxSeconds*1000,'elapsed guard');}
const pacer=makeCpuDutyPacer(0.5,guard);
async function pace(){const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await pacer((used.user+used.system)/1000);guard();}
function pieces(board){return board.board().flat().filter(Boolean).length;}

async function main(){
  assert(!existsSync(inside(output)),'Preserve existing probe report');
  const manifestPath=join(pgnRoot,'manifest.json'),manifestBytes=read(manifestPath,4*2**20),manifest=JSON.parse(manifestBytes);
  const rowsBytes=read(rowsPath,64*2**20),auditBytes=read(auditPath,2**20),audit=JSON.parse(auditBytes);
  const rows=rowsBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  const v5=manifest.schema==='lichess-source-pgn-batches-v1';
  if(v5){
    assert.equal(manifest.split,'train');assert.equal(manifest.finalSplitInspected,false);
    assert.equal(manifest.graphLaunchAuthorized,false);assert.equal(manifest.neuralEventsDelivered,0);
    assert.equal(manifest.candidateRowsSha256,sha(rowsBytes));assert.equal(manifest.candidateRowCount,rows.length);
  }else{
    assert.equal(manifest.schema,'lichess-source-game-pgn-batch-v1');assert.equal(manifest.sourceSplit,'train');
    assert.equal(manifest.sourceRows.sha256,sha(rowsBytes));assert.equal(manifest.sourceRows.rowCount,rows.length);
    assert.equal(manifest.status,'complete-response-id-coverage-verified');
    assert.deepEqual([...manifest.api.requestIds].sort(),rows.map(row=>row.source.gameId).sort());
  }
  assert.equal(audit.passed,true);assert.equal(audit.sourceHistoryVerified,true);assert.equal(audit.consequenceCertificatesRechecked,true);
  assert.equal(audit.finalSplitInspected,false);assert.equal(audit.graphLaunchAuthorized,false);assert.equal(audit.eligibleForNeuralTeaching,false);
  const ids=rows.map(row=>row.source.gameId).sort();assert.equal(new Set(ids).size,ids.length);
  if(v5){assert.equal(ids.length,manifest.uniqueGameCount);assert.deepEqual(Object.keys(manifest.games).sort(),ids);}
  else assert.deepEqual(Object.keys(manifest.games).sort(),ids.map(id=>id+'.pgn'));

  const counts={games:0,plies:0,positions:0,positionsAtMostSixPieces:0,eligiblePositions:0,captureActions:0,
    verifiedCaptureActions:0,unknownCaptureActions:0,byStratum:{},gamesByStratum:{},uniquePositionKeysByStratum:{}};
  const examples=Object.fromEntries(['open-defender','blocked-defender','absent-defender','pinned-apparent-defender'].map(key=>[key,[]]));
  const positionSets=Object.fromEntries(Object.keys(examples).map(key=>[key,new Set()]));
  for(const id of ids){
    guard();const gamePath=join(pgnRoot,`${id}.pgn`),pgnBytes=read(gamePath,65536);
    assert.equal(sha(pgnBytes),manifest.games[v5?id:id+'.pgn'],`PGN changed: ${id}`);
    const game=new Chess();game.loadPgn(pgnBytes.toString('utf8'));
    const headers=game.getHeaders();assert.equal(headers.GameId,id);
    const site=new URL(headers.Site);assert.equal(site.hostname,'lichess.org');assert(['/'+id,'/game/'+id].includes(site.pathname));
    const history=game.history({verbose:true});assert(history.length>0&&history.length<=512);
    counts.games++;
    for(let ply=0;ply<history.length;ply++){
      guard();counts.plies++;assert(counts.positions<maxPositions,'position bound');
      const position=new Chess(history[ply].before);counts.positions++;
      if(pieces(position)>6||position.isCheck()||position.isGameOver())continue;
      counts.positionsAtMostSixPieces++;
      const captures=position.moves({verbose:true}).filter(move=>move.captured);
      if(!captures.length)continue;
      counts.eligiblePositions++;
      for(const move of captures){
        guard();assert(++counts.captureActions<=maxCaptureChecks,'capture-action bound');
        const action=uci(move),result=classifyCaptureRetentionStratum(new Chess(position.fen()),action);
        if(result.status!=='classified'){counts.unknownCaptureActions++;continue;}
        const proof=certifyCaptureRetentionAction(new Chess(position.fen()),action,{objective:'capture-retention',plies:1});
        const checked=checkCaptureRetentionAction(new Chess(position.fen()),action,{objective:'capture-retention',plies:1},proof);
        assert.equal(checked.verified,true);assert.notEqual(checked.status,'unknown');counts.verifiedCaptureActions++;
        const stratum=result.stratum;counts.byStratum[stratum]=(counts.byStratum[stratum]??0)+1;
        if(!counts.gamesByStratum[stratum])counts.gamesByStratum[stratum]=new Set();counts.gamesByStratum[stratum].add(id);
        const key=`${id}:${ply}:${position.fen()}`;positionSets[stratum].add(key);
        if(examples[stratum].length<24)examples[stratum].push({gameId:id,ply,fen:position.fen(),action,
          stratum,taskStatus:checked.status,certificateSha256:sha(Buffer.from(JSON.stringify(proof)))});
        if(counts.captureActions%128===0)await pace();
      }
      assert(counts.positions<=maxPositions,'position bound');
    }
  }
  for(const key of Object.keys(examples)){
    counts.gamesByStratum[key]=counts.gamesByStratum[key]?.size??0;
    counts.uniquePositionKeysByStratum[key]=positionSets[key].size;
  }
  guard();const report={schema:'lichess-game-history-capture-strata-feasibility-v1',status:'diagnostic-complete',
    inputs:{pgnManifest:{path:manifestPath,sha256:sha(manifestBytes)},trainRows:{path:rowsPath,sha256:sha(rowsBytes)},
      auditedLessonReport:{path:auditPath,sha256:sha(auditBytes)}},counts,examples,
    bounds:{maxSeconds,maxPositions,maxCaptureChecks,maxRssMiB:2048,minFreeMiB:256,heapMiB:256,cpuDuty:0.5},
    resources:{elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),peakRssMiB:peakRss/2**20},
    finalSplitInspected:false,validationInspected:false,neuralEventsDelivered:0,graphLaunchAuthorized:false,
    scope:'Training-only feasibility scan of authentic positions from already-audited Lichess source games. It preserves game history and independently checks immediate capture-retention certificates, but does not establish Stage 1 family diversity, split disjointness, production-panel eligibility, learner feedback quality, neural learning or reasoning.'};
  const target=inside(output);mkdirSync(dirname(target),{recursive:true});const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');
  const partial=target+'.partial',fd=openSync(partial,'wx');try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}renameSync(partial,target);
  process.stdout.write(JSON.stringify({status:report.status,counts,report:relative(root,target).replaceAll('\\','/'),...report.resources,graphLaunchAuthorized:false})+'\n');
}
main().catch(error=>{process.stderr.write(JSON.stringify({status:'probe-error',error:String(error).slice(0,500)})+'\n');process.exitCode=2;});

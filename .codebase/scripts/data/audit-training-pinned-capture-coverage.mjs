// Inspect only the already-audited Stage 1 training chunks for pin-stratum coverage.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {classifyCaptureRetentionStratum} from '../../src/puzzle-learning/capture-retention-stratum.mjs';

const [auditPath,manifestPath,output,...trainPaths]=process.argv.slice(2);
assert(auditPath&&manifestPath&&output&&trainPaths.length===4,'Expected audit, manifest, output, and four train chunks');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const audit=JSON.parse(readFileSync(auditPath));
assert.equal(audit.schema,'lichess-csv-lesson-batch-audit-v1');
assert.equal(audit.passed,true);assert.equal(audit.finalSplitInspected,false);
assert.equal(audit.sourceHistoryVerified,true);assert.equal(audit.consequenceCertificatesRechecked,true);
assert.equal(audit.eligibleForNeuralTeaching,false,'This scan cannot grant teaching authorization');
const manifestBytes=readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
assert.equal(manifest.schema,'lichess-preparation-batches-v1');
assert.equal(manifest.phase,'complete');assert.equal(manifest.pending,null);assert.equal(manifest.completed.length,8);
assert.equal(sha(manifestBytes),audit.batchManifestSha256,'Lesson audit does not bind the pinned batch manifest');
const totals={sourceRows:0,eligibleRows:0,captureActions:0,byStratum:{},unknownReasons:{}};
const puzzlesByStratum={},gamesByStratum={};const inputs=[];
for(const path of trainPaths){
  const bytes=readFileSync(path);inputs.push({path,sha256:sha(bytes)});
  for(const line of bytes.toString('utf8').split(/\r?\n/))if(line){
    const record=JSON.parse(line);totals.sourceRows++;
    assert.equal(record.split,'train','Training-only action received another split');
    const lesson=record.lesson;assert.equal(lesson?.schema,'lichess-capture-lesson-v1');
    if(!lesson.stage1DomainEligible)continue;
    assert.equal(record.history?.historyStatus,'verified-standard-start-prefix');
    assert.equal(record.history?.puzzleId,lesson.puzzleId);assert.equal(record.history?.gameId,lesson.gameId);
    const board=new Chess();board.loadPgn(lesson.context.pgn);assert.equal(board.fen(),lesson.context.fen);
    totals.eligibleRows++;
    for(const move of board.moves({verbose:true}).filter(row=>row.captured)){
      totals.captureActions++;const id=move.from+move.to+(move.promotion??'');
      const result=classifyCaptureRetentionStratum(board,id);
      if(result.status!=='classified'){
        const key=result.reason??'unknown';totals.unknownReasons[key]=(totals.unknownReasons[key]??0)+1;continue;
      }
      totals.byStratum[result.stratum]=(totals.byStratum[result.stratum]??0)+1;
      puzzlesByStratum[result.stratum]??=new Set();puzzlesByStratum[result.stratum].add(lesson.puzzleId);
      gamesByStratum[result.stratum]??=new Set();gamesByStratum[result.stratum].add(lesson.gameId);
    }
  }
}
assert.equal(totals.sourceRows,128);assert.equal(totals.eligibleRows,20);
for(const [stratum,ids] of Object.entries(puzzlesByStratum))puzzlesByStratum[stratum]=[...ids].sort();
for(const [stratum,ids] of Object.entries(gamesByStratum))gamesByStratum[stratum]=[...ids].sort();
const report={schema:'lichess-training-pinned-capture-coverage-v1',status:'diagnostic-complete',
  inputs:{audit:{path:auditPath,sha256:sha(readFileSync(auditPath))},manifest:{path:manifestPath,sha256:sha(manifestBytes)},trainChunks:inputs},
  totals,distinctPuzzleRootsByStratum:Object.fromEntries(Object.entries(puzzlesByStratum).map(([key,value])=>[key,value.length])),
  distinctSourceGamesByStratum:Object.fromEntries(Object.entries(gamesByStratum).map(([key,value])=>[key,value.length])),
  puzzleIdsByStratum:puzzlesByStratum,neuralEventsDelivered:0,graphLaunchAuthorized:false,
  validationInspected:false,finalInspected:false,
  scope:'Read-only classification of captures in four existing audited training chunks. It does not inspect validation/final lesson rows, prove family disjointness, authorize neural teaching, or establish learning/reasoning.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,totals,distinctPuzzleRootsByStratum:report.distinctPuzzleRootsByStratum,
  distinctSourceGamesByStratum:report.distinctSourceGamesByStratum,validationInspected:false,finalInspected:false,
  graphLaunchAuthorized:false,report:output}));

// FEN-only Stage 1 domain prescreen. This does not bind history or authorize learning.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';
import os from 'node:os';
import {certifyCaptureRetentionActions,checkCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';

const {values:a}=parseArgs({options:{corpus:{type:'string'},out:{type:'string'}}});
assert(a.corpus&&a.out&&!existsSync(a.out)&&process.execArgv.includes('--max-old-space-size=256'));
const sha=b=>createHash('sha256').update(b).digest('hex');
function guard(){assert(process.memoryUsage().rss<=2048*2**20&&os.freemem()>=256*2**20,'Prefilter resource guard');}
const corpus=resolve(a.corpus),manifestBytes=readFileSync(join(corpus,'manifest.json'));
const manifest=JSON.parse(manifestBytes),input=readFileSync(join(corpus,'validation.jsonl'));
assert.equal(manifest.schema,'lichess-puzzle-corpus-v2');assert.equal(manifest.curator.onlySplit,'validation');
assert.equal(manifest.status.eligibleForNeuralTeaching,false);assert.equal(manifest.counts.selected.train,0);
assert.equal(manifest.counts.selected.final,0);assert.equal(sha(input),manifest.outputs['validation.jsonl']);
const sourceRows=input.toString('utf8').split('\n').filter(Boolean);assert.equal(sourceRows.length,manifest.counts.selected.validation);
const selected=[];let tested=0,domainCandidates=0,unknownCandidates=0;
for(const line of sourceRows){
  guard();
  assert(Buffer.byteLength(line)<=65536);const row=JSON.parse(line);
  assert.equal(row.schema,'lichess-puzzle-source-row-v1');assert.equal(row.source?.gameId?.length,8);
  assert.equal(row.source?.license,'CC0-1.0');assert.equal(row.source?.url,'https://database.lichess.org/');
  const board=new Chess(row.solverFen);assert(board.board().flat().filter(Boolean).length<=6);tested++;
  if(board.isGameOver())continue;
  const task={objective:'capture-retention',plies:1},proofs=certifyCaptureRetentionActions(board,task);
  const checked=checkCaptureRetentionActions(board,task,proofs),counts={success:0,failure:0,unknown:0};
  for(const action of checked)counts[action.status]++;
  if(counts.unknown)unknownCandidates++;
  if(!counts.unknown&&counts.success>0&&counts.failure>0){
    domainCandidates++;selected.push({line,puzzleId:row.puzzleId,gameId:row.source.gameId,counts});
  }
}
const ids=new Set(selected.map(row=>row.puzzleId));assert.equal(ids.size,selected.length);
const out=resolve(a.out);mkdirSync(out);const body=selected.map(row=>row.line).join('\n')+(selected.length?'\n':'');
writeFileSync(join(out,'validation.jsonl.partial'),body,{flag:'wx'});
renameSync(join(out,'validation.jsonl.partial'),join(out,'validation.jsonl'));
const result={schema:'lichess-validation-stage1-prefilter-v2',sourceManifestSha256:sha(manifestBytes),
  sourceRowsSha256:sha(input),tested,domainCandidates,unknownCandidates,selected:selected.length,selectedPuzzleIds:selected.map(row=>row.puzzleId),
  selectedGameIds:[...new Set(selected.map(row=>row.gameId))].sort(),outputSha256:sha(Buffer.from(body)),
  outputBytes:Buffer.byteLength(body),split:'validation',finalSplitInspected:false,neuralEventsDelivered:0,
  graphLaunchAuthorized:false,eligibleForNeuralTeaching:false,
  scope:'FEN-only exact one-reply capture-retention domain prescreen; source-game history, relation families and learning remain unverified.'};
writeFileSync(join(out,'manifest.json.partial'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
renameSync(join(out,'manifest.json.partial'),join(out,'manifest.json'));
console.log(JSON.stringify({tested,selected:result.selected,distinctGames:result.selectedGameIds.length,
  finalSplitInspected:false,graphLaunchAuthorized:false}));

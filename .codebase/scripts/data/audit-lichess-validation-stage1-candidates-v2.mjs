// Independent FEN-only replay of the validation Stage 1 outcome-contrast prescreen.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {parseArgs} from 'node:util';
import {Chess} from 'chess.js';
import os from 'node:os';

const {values:a}=parseArgs({options:{corpus:{type:'string'},filtered:{type:'string'},out:{type:'string'}}});
assert(a.corpus&&a.filtered&&a.out&&!existsSync(a.out)&&process.execArgv.includes('--max-old-space-size=256'));
const sha=b=>createHash('sha256').update(b).digest('hex');
function guard(){assert(process.memoryUsage().rss<=2048*2**20&&os.freemem()>=256*2**20,'Audit resource guard');}
const corpus=resolve(a.corpus),filtered=resolve(a.filtered);
const sourceManifestBytes=readFileSync(join(corpus,'manifest.json')),sourceManifest=JSON.parse(sourceManifestBytes);
const sourceBytes=readFileSync(join(corpus,'validation.jsonl')),sourceLines=sourceBytes.toString('utf8').split('\n').filter(Boolean);
const filteredManifestBytes=readFileSync(join(filtered,'manifest.json')),filteredManifest=JSON.parse(filteredManifestBytes);
const filteredBytes=readFileSync(join(filtered,'validation.jsonl')),filteredLines=filteredBytes.toString('utf8').split('\n').filter(Boolean);
assert.equal(sourceManifest.schema,'lichess-puzzle-corpus-v2');assert.equal(sourceManifest.curator.onlySplit,'validation');
assert.equal(sha(sourceBytes),sourceManifest.outputs['validation.jsonl']);
assert.equal(filteredManifest.schema,'lichess-validation-stage1-prefilter-v2');
assert.equal(filteredManifest.sourceManifestSha256,sha(sourceManifestBytes));assert.equal(filteredManifest.sourceRowsSha256,sha(sourceBytes));
assert.equal(sha(filteredBytes),filteredManifest.outputSha256);assert.equal(filteredLines.length,filteredManifest.selected);
const selected=[];let tested=0,unknownCandidates=0;
for(const line of sourceLines){
  guard();
  const row=JSON.parse(line);assert.equal(row.schema,'lichess-puzzle-source-row-v1');
  assert.equal(row.source?.license,'CC0-1.0');assert.equal(row.source?.url,'https://database.lichess.org/');
  const board=new Chess(row.solverFen);assert(board.board().flat().filter(Boolean).length<=6);
  tested++;if(board.isGameOver())continue;
  const legal=board.moves({verbose:true});assert(legal.length>0&&legal.length<=256);
  const counts={success:0,failure:0,unknown:0};
  for(const action of legal){
    if(!action.captured){counts.failure++;continue;}
    const target=action.to;board.move(action);
    try{
      const replies=board.moves({verbose:true});
      if(replies.length>256)counts.unknown++;
      else if(replies.some(reply=>reply.to===target&&reply.captured))counts.failure++;
      else counts.success++;
    }finally{board.undo();}
  }
  if(counts.unknown)unknownCandidates++;
  if(!counts.unknown&&counts.success>0&&counts.failure>0)selected.push(line);
}
assert.deepEqual(filteredLines,selected,'Filtered set differs from independent recapture replay');
const report={schema:'lichess-validation-stage1-prefilter-audit-v2',passed:true,sourceManifestSha256:sha(sourceManifestBytes),
  prefilterManifestSha256:sha(filteredManifestBytes),tested,unknownCandidates,selected:selected.length,finalSplitInspected:false,
  neuralEventsDelivered:0,graphLaunchAuthorized:false,eligibleForNeuralTeaching:false,
  scope:'Independent FEN-only Stage 1 task-domain replay; source-history and teaching authorization remain unverified.'};
mkdirSync(dirname(resolve(a.out)),{recursive:true});writeFileSync(resolve(a.out)+'.partial',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
renameSync(resolve(a.out)+'.partial',resolve(a.out));console.log(JSON.stringify({passed:true,tested,selected,finalSplitInspected:false,graphLaunchAuthorized:false}));

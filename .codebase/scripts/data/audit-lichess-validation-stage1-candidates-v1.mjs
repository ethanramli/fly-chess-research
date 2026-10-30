// Independent FEN-only replay of the validation capture/recapture prescreen.
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
assert.equal(filteredManifest.schema,'lichess-validation-stage1-prefilter-v1');
assert.equal(filteredManifest.sourceManifestSha256,sha(sourceManifestBytes));assert.equal(filteredManifest.sourceRowsSha256,sha(sourceBytes));
assert.equal(sha(filteredBytes),filteredManifest.outputSha256);assert.equal(filteredLines.length,filteredManifest.selected);
const selected=[];let tested=0;
for(const line of sourceLines){
  guard();
  const row=JSON.parse(line);assert.equal(row.schema,'lichess-puzzle-source-row-v1');
  assert.equal(row.source?.license,'CC0-1.0');assert.equal(row.source?.url,'https://database.lichess.org/');
  const board=new Chess(row.solverFen);assert(board.board().flat().filter(Boolean).length<=6);
  const captures=board.moves({verbose:true}).filter(move=>move.captured);
  const retained=[],recaptured=[];tested++;
  if(captures.length>=2&&!captures.some(move=>move.promotion))for(const move of captures){
    board.move(move);let defended;
    try{defended=board.moves({verbose:true}).some(reply=>reply.to===move.to&&reply.captured);}
    finally{board.undo();}
    if(defended)recaptured.push(move);else retained.push(move);
  }
  if(retained.length===1&&recaptured.some(move=>move.from===retained[0].from&&move.captured===retained[0].captured))
    selected.push(line);
}
assert.deepEqual(filteredLines,selected,'Filtered set differs from independent recapture replay');
const report={schema:'lichess-validation-stage1-prefilter-audit-v1',passed:true,sourceManifestSha256:sha(sourceManifestBytes),
  prefilterManifestSha256:sha(filteredManifestBytes),tested,selected:selected.length,finalSplitInspected:false,
  neuralEventsDelivered:0,graphLaunchAuthorized:false,eligibleForNeuralTeaching:false,
  scope:'Independent FEN-only capture/recapture prescreen replay; not source-history or teaching authorization.'};
mkdirSync(dirname(resolve(a.out)),{recursive:true});writeFileSync(resolve(a.out)+'.partial',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
renameSync(resolve(a.out)+'.partial',resolve(a.out));console.log(JSON.stringify({passed:true,tested,selected,finalSplitInspected:false,graphLaunchAuthorized:false}));

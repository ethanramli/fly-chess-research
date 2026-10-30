// Execute only the source's checkpoint-selection expression with mocked paths.
// Does not invoke a runner, load checkpoints, train or replay an audit.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync('.codebase/src/puzzle-learning/lichess-curriculum-matrix-v2.mjs','utf8');
const begin=source.indexOf('const previous=savedActive?');
const end=source.indexOf('const prefixBlocks=',begin);
assert(begin>0&&end>begin);
const expression=source.slice(begin,end);
let scans=0;
const old='old-attempt/stage-checkpoint-008.json.gz';
const latest='resumed-attempt/stage-checkpoint-016.json.gz';
const selected=Function('savedActive','existsSync','latestCheckpoint','lineageDir',expression+'return previous;')(
  {latestCheckpoint:old,attempt:'resumed-attempt'},()=>true,()=>{scans++;return latest;},'new-lineage');
assert.equal(selected,old);assert.equal(scans,0);
const result={scope:'Exact source expression, mocked path existence and checkpoint scanner; no runner invoked',
  savedPointer:old,newerPublishedCheckpoint:latest,selected,scansOfActiveAttempt:scans};
writeFileSync('research/reports/codebase-weakness-review-2026-10-30/recovery-selection-output.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));

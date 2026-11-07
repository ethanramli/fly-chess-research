import {readFileSync,writeFileSync,createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir='research/reports/overnight-peer-review-2026-11-02/primary-methodology/';
const result={command:'node --max-old-space-size=256 '+dir+'checks.mjs',graphPasses:0};
const path='runs/memory-retention-2026-11-01/long-term-memory-v1-live-pilot-v1/frames-fly-memory-informative.jsonl';
const frames=[];
for await(const line of createInterface({input:createReadStream(path),crlfDelay:Infinity})) {
 const r=JSON.parse(line);
 if(r.kind==='frame')frames.push({context:r.context,before:r.before,after:r.after});
 if(r.kind==='trial'){result.firstTrial={trial:r.trial,frames,changedFrames:frames.filter(f=>f.before!==f.after).length};break;}
}
assert(result.firstTrial.frames.some(f=>f.context.step==='choice'&&f.before!==f.after));
let checker=readFileSync('research/reports/interference-limits-2026-11-02/check-certificate.mjs','utf8');
checker=checker.replace(/^import .*;\r?\n/gm,'');
const writes=[];
vm.runInNewContext(checker,{assert,readFileSync,createHash,Buffer,console:{log:x=>writes.push(x)},writeFileSync:(p,s)=>writes.push({suppressedPath:p,receipt:JSON.parse(s)})});
result.certificate=writes;
let tail=0;for(let k=44;k<=60;k++){let c=1;for(let j=1;j<=k;j++)c=c*(61-j)/j;tail+=c*2**-60;}
result.binomialChance44of60=tail;
writeFileSync(dir+'checks.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({choiceStateChanges:result.firstTrial.changedFrames,certificate:'passed without shared writes',chance:tail}));

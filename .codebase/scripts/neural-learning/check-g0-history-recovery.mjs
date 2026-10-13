// Completed synthetic runs only; equality does not validate biological learning.
import assert from 'node:assert/strict';
import {readFileSync,createReadStream} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {streamRows} from '../../src/runtime/storage.mjs';

const [whole,interrupted,resumed]=process.argv.slice(2);
assert(whole&&interrupted&&resumed,'Require uninterrupted, interrupted and resumed directories');
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const a=json(join(whole,'result.json')),b=json(join(resumed,'result.json'));
assert(a.diagnosticComplete&&b.diagnosticComplete);
assert.equal(a.G0Passed,false);assert.equal(b.G0Passed,false);
assert.equal(json(join(whole,'protocol.json')).fixture,true);
for(const key of ['identity','stageResults','memories','branchResults','baselines','replicaResponses','receiptCount','chainHash'])
  assert.deepEqual(a[key],b[key],key);
async function hash(path){const h=createHash('sha256');for await(const bytes of createReadStream(path))h.update(bytes);return h.digest('hex');}
assert.equal(await hash(join(whole,'receipts.jsonl')),await hash(join(resumed,'receipts.jsonl')),'Receipt bytes differ');
const interruption=json(join(interrupted,'interruption.json'));
assert.equal(interruption.publishedPendingReceipt,10119);
assert.equal(interruption.exitCode,75);
const checkpoint=JSON.parse(gunzipSync(readFileSync(b.invocation.resumedFrom),{maxOutputLength:16*2**20}));
assert.equal(dirname(resolve(b.invocation.resumedFrom)),resolve(interrupted),'Resume checkpoint must belong to interrupted run');
assert.equal(checkpoint.pendingReceipt.sequence,10119);
assert.equal(checkpoint.pendingReceipt.kind,'frame');
assert.equal(checkpoint.pendingReceipt.stageId,'reversal:reset:informative');
assert.equal(checkpoint.stageStarted,true);assert.equal(checkpoint.session.pending.cursor,1);
const counts={};
for await(const row of streamRows(join(resumed,'receipts.jsonl')))counts[row.kind]=(counts[row.kind]??0)+1;
assert.deepEqual(counts,{baselines:1,'stage-start':24,'lesson-start':672,frame:12768,lesson:672,'stage-end':24});
console.log(JSON.stringify({passed:true,scope:'Synthetic full-run receipt/state equality and reset-frame pending recovery only; no biological or G0 claim',counts}));

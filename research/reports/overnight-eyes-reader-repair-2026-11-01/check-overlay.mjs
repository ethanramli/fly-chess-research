import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadGraph,readNpz} from '../../../.codebase/src/runtime/graph.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const graph=loadGraph('.cache/full.npz'),original=Int8Array.from(graph.sign),roots=readNpz('.cache/full.npz',['root_ids']).root_ids;
const p=JSON.parse(readFileSync('research/reports/mbon05-sign-provenance-2026-11-01/proposed-variant.json'));
assert.equal(sha(readFileSync('.cache/full.npz')),p.parentGraphSha256);
const expected=new Set(p.edgeSignOverrides.map(e=>e.edgeIndex));assert.equal(expected.size,112);
for(const e of p.edgeSignOverrides){assert.equal(graph.sign[e.edgeIndex],e.previous);assert.equal(roots[graph.col[e.edgeIndex]].toString(),e.presynapticRootId);graph.sign[e.edgeIndex]=e.proposed;}
let changes=0;for(let e=0;e<original.length;e++){if(original[e]!==graph.sign[e]){assert(expected.has(e));changes++;}}
assert.equal(changes,112);
const result={pass:true,changes,releasedSignIdentity:sha(Buffer.from(original.buffer)),variantSignIdentity:sha(Buffer.from(graph.sign.buffer)),graph:p.parentGraphSha256,source:sha(readFileSync(new URL(import.meta.url)))};
writeFileSync('research/reports/overnight-eyes-reader-repair-2026-11-01/overlay-check.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));

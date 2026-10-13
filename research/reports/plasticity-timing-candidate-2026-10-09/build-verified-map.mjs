// Static source authentication and edge selection only; no learner execution.
import {readFileSync,createReadStream,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readNpz} from '../../../.codebase/src/runtime/graph.mjs';
const paths={graph:'.cache/full.npz',annotations:'.cache/flywire-annotations-v2.1.0.tsv',
  mapping:'research/reports/reversal-candidate-2026-10-05/mapping.json'};
const previous=JSON.parse(readFileSync(paths.mapping)),hashes={};
for(const [key,path] of Object.entries(paths)){
  const h=createHash('sha256');for await(const b of createReadStream(path))h.update(b);hashes[key]=h.digest('hex');
}
assert.equal(hashes.graph,previous.inputs.graph);assert.equal(hashes.annotations,previous.inputs.annotations);
const {root_ids:roots,csr_indptr:row,csr_indices:col,sign}=readNpz(paths.graph,
  ['root_ids','csr_indptr','csr_indices','sign']);
const target=JSON.parse(readFileSync(new URL('./target.json',import.meta.url)));
assert.deepEqual(hashes,target.hashes);
const selected=new Set(target.groups.flatMap(g=>g.candidateEdges));
const posts=new Map();for(let j=0;j<row.length-1;j++)for(let e=row[j];e<row[j+1];e++)if(selected.has(e))posts.set(e,j);
const wanted=new Set([...posts.values(),...Array.from(selected,e=>col[e]),
  ...previous.mapping.groups.filter(g=>g.danType==='PPL103').flatMap(g=>g.dan.map(c=>c.index))]);
const byRoot=new Map([...wanted].map(i=>[roots[i].toString(),i]));
const cells=new Map();let header;
for await(const line of createInterface({input:createReadStream(paths.annotations),crlfDelay:Infinity})){
  const f=line.split('\t');if(!header){header=f;continue;}
  const get=k=>f[header.indexOf(k)],index=byRoot.get(get('root_id'));
  if(index!==undefined){assert(!cells.has(index));cells.set(index,{index,rootId:get('root_id'),
    type:get('hemibrain_type'),side:get('side'),cellClass:get('cell_class')});}
}
assert.equal(cells.size,wanted.size);
const groups=[];
for(const g of previous.mapping.groups.filter(g=>g.danType==='PPL103')){
  const edges=g.edges.filter(e=>selected.has(e)),kc=[],kcTypes=[],kcRootIds=[],mbon=[];
  assert.equal(g.dan.length,1);
  const dan=g.dan.map(d=>{const c=cells.get(d.index);assert.equal(c.rootId,d.rootId);
    assert.equal(c.type,'PPL103');assert.equal(c.cellClass,'DAN');assert.equal(c.side,g.side);return c;});
  for(const e of edges){
    const pre=cells.get(col[e]),post=cells.get(posts.get(e));
    assert.equal(sign[e],1);assert.equal(pre.cellClass,'Kenyon_Cell');assert.match(pre.type,/^KCg-/);
    assert.equal(pre.side,g.side);assert.equal(post.type,'MBON12');
    assert.equal(g.kc[g.edges.indexOf(e)],pre.index);
    kc.push(pre.index);kcTypes.push(pre.type);kcRootIds.push(pre.rootId);mbon.push(post);
  }
  groups.push({side:g.side,mbonType:'MBON12',danType:'PPL103',dan,edges,kc,kcTypes,kcRootIds,mbon});
}
assert.equal(groups.reduce((n,g)=>n+g.edges.length,0),122);
const mapping={schema:'gamma2-rate-timing-map-v1',readyForCandidateExperiment:true,inputs:hashes,groups,
  approximation:'Authenticated released identities and existing positive gamma-KC/MBON12 edges. Coarse hemisphere/compartment association; receptor identities, synapse coordinates and dynamic feasibility remain unverified.'};
writeFileSync(new URL('./rate-timing-map.json',import.meta.url),JSON.stringify(mapping,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({edges:122,groups:groups.length,uniqueKCs:new Set(groups.flatMap(g=>g.kc)).size,
  uniqueMBONs:new Set(groups.flatMap(g=>g.mbon.map(c=>c.index))).size}));

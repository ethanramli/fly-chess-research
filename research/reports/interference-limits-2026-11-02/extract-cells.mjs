// Static anatomy only: no model construction, forward pass or learning.
import { readNpz } from '../../../.codebase/src/runtime/graph.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const out = 'research/reports/interference-limits-2026-11-02/';
const base = 'runs/memory-retention-2026-11-01/';
const run = base + 'eye-graph-memory-cubic-v1-recovery1/';
const files = ['.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv', base+'activity-reliability-v2/result.json', run+'frames-4102-informative.jsonl', ...['T2','T3','Delay','Rev'].map(p=>run+`snapshot-4102-informative-${p}.json`)];
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const json = p => JSON.parse(readFileSync(p));
const a = readNpz(files[0], ['root_ids','csr_indptr','csr_indices','sign','syn_count']);
const lines = readFileSync(files[1],'utf8').trim().split('\n'), keys = lines.shift().trim().split('\t');
const ann = new Map(lines.map(l=>{const v=l.trimEnd().split('\t');const r=Object.fromEntries(keys.map((k,i)=>[k,v[i]??'']));return [r.root_id,r];}));
const cell = i => ({index:i,root:a.root_ids[i].toString(),...Object.fromEntries(['cell_class','cell_type','hemibrain_type','side'].map(k=>[k,ann.get(a.root_ids[i].toString())?.[k]]))});
const postOf = e => {let lo=0,hi=a.csr_indptr.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(a.csr_indptr[m]<=e)lo=m;else hi=m;}return lo;};
const edge = e => ({edge:e,pre:cell(a.csr_indices[e]),post:cell(postOf(e)),sign:a.sign[e],retainedSynCount:a.syn_count[e]});
// Read the header without materializing the receipt body.
const text=readFileSync(files[3],'utf8'); const h=JSON.parse(text.slice(0,text.indexOf('\n')));
const states=Object.fromEntries(['T2','T3','Delay','Rev'].map(p=>[p,json(run+`snapshot-4102-informative-${p}.json`).snapshot]));
const selected=json(files[2]).selectedEdges;
const cells=selected.map(s=>{const g=h.mapping.groups[s.group];assert.equal(g.edges[s.slot],s.edge);assert.equal(a.csr_indices[s.edge],s.kc);assert.equal(a.sign[s.edge],1);return {...s,...edge(s.edge),compartmentCrosswalk:'MBON05 gamma4>gamma1gamma2; PAM08 grouping, not per-contact compartment localization',snapshots:Object.fromEntries(Object.entries(states).map(([p,x])=>[p,{gain:x.gains[s.slot],trace:x.traces[s.slot],states:x.states.slice(4*s.slot,4*s.slot+4)}]))};});
const selectedKcs=new Set(selected.map(s=>s.kc));const contacts=[];
for(let post=0;post<a.root_ids.length;post++)for(let e=a.csr_indptr[post];e<a.csr_indptr[post+1];e++){
 const pre=a.csr_indices[e];if(!selectedKcs.has(pre)&&!selectedKcs.has(post))continue;
 const ca=cell(pre),cb=cell(post);
 if(/APL/.test(ca.cell_type+' '+ca.hemibrain_type)||/APL/.test(cb.cell_type+' '+cb.hemibrain_type)||ca.cell_class==='Kenyon_Cell'&&cb.cell_class==='Kenyon_Cell')contacts.push(edge(e));
}
assert.equal(contacts.length,12);
const result={schema:'static-cell-evidence-v1',pins:Object.fromEntries(files.map(p=>[p,sha(p)])),cells,contacts,teachingPopulation:h.mapping.groups[0].dan.map(d=>cell(d.index)),items:h.items.map(({fen,moves})=>({fen,moves})),config:h.config,graphPasses:0};
writeFileSync(out+'cell-evidence.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cells:cells.map(c=>({slot:c.slot,edge:c.edge,kc:c.pre.root,post:c.post.root})),contacts:contacts.length,danPopulation:result.teachingPopulation.length}));

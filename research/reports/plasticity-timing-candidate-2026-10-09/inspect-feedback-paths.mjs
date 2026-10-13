// Static CSR paths only: no model construction, inference or weight changes.
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import os from 'node:os';
import assert from 'node:assert/strict';
import { readNpz } from '../../../.codebase/src/runtime/graph.mjs';
const protocolPath='research/data/mate-conjoined-input-v1/protocol.json';
const p=JSON.parse(readFileSync(protocolPath));
const hashes={};
for(const path of [protocolPath,p.graphPath,p.annotationPath,p.mappingPath]){
  const hash=createHash('sha256');for await(const b of createReadStream(path))hash.update(b);
  hashes[path]=hash.digest('hex');
}
assert.equal(hashes[p.graphPath],p.graphSha256);assert.equal(hashes[p.annotationPath],p.annotationSha256);
let peakRss=0;
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<768*2**20 && os.freemem()>256*2**20,'Resource guard');}
guard();
const {csr_indptr:row,csr_indices:col,sign,root_ids:roots,syn_count:counts}=readNpz(p.graphPath,
  ['csr_indptr','csr_indices','sign','root_ids','syn_count']);guard();
const mapping=JSON.parse(readFileSync(p.mappingPath)).mapping;
const sources=new Set(p.readouts.MBON12.map(c=>c.index));
for(const c of p.readouts.MBON12)assert.equal(roots[c.index].toString(),c.rootId);
const targets=mapping.groups.filter(g=>g.danType==='PPL103').flatMap(g=>g.dan);
const direct=[],twoHop=[];
for(const target of targets){
  assert.equal(roots[target.index].toString(),target.rootId);
  for(let e=row[target.index];e<row[target.index+1];e++){
    const relay=col[e];
    if(sources.has(relay))direct.push({from:relay,to:target.index,edge:e,sign:sign[e],synapses:counts[e]});
    for(let f=row[relay];f<row[relay+1];f++)if(sources.has(col[f]) && relay!==target.index && relay!==col[f])
      twoHop.push({from:col[f],via:relay,to:target.index,edges:[f,e],signs:[sign[f],sign[e]],
        netSign:sign[f]*sign[e],synapses:[counts[f],counts[e]]});
  }
  guard();
}
const wanted=new Set([...sources,...targets.map(c=>c.index),...twoHop.map(p=>p.via)]);
const byRoot=new Map([...wanted].map(i=>[roots[i].toString(),i])),annotations={};let header;
for await(const line of createInterface({input:createReadStream(p.annotationPath),crlfDelay:Infinity})){
  const fields=line.split('\t');if(!header){header=fields;continue;}
  const get=key=>fields[header.indexOf(key)];const index=byRoot.get(get('root_id'));
  if(index!==undefined)annotations[index]={rootId:get('root_id'),type:get('hemibrain_type'),cellClass:get('cell_class'),side:get('side')};
}
for(const source of sources)assert.equal(annotations[source]?.type,'MBON12');
for(const target of targets)assert.equal(annotations[target.index]?.type,'PPL103');
guard();
const summary={direct:direct.length,directNegative:direct.filter(p=>p.sign<0).length,
  twoHop:twoHop.length,twoHopNegative:twoHop.filter(p=>p.netSign<0).length,peakRssMiB:peakRss/2**20};
const report={hashes,summary,direct,twoHop,annotations,
  scope:'Complete direct and two-edge paths from registered MBON12 readouts to mapped PPL103 cells; static released signs, not net dynamic inhibition. Longer paths not enumerated.'};
writeFileSync(new URL('./feedback-paths.json',import.meta.url),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));

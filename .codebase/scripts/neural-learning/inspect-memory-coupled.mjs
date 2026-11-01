// Reproduce the pinned development trajectories solely to inspect phase states missing from test receipts.
// Exact summary equality required; no new setting, extra independent sample or changed learning path.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import os from 'node:os';
import { makeRule } from '../../src/neural-learning/memory-assay-rule-local-coupled.mjs';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-recorded.mjs';
import { buildFixture } from '../../src/neural-learning/memory-assay-fixture.mjs';

const {values:args}=parseArgs({options:{out:{type:'string'}}});
if(!args.out||existsSync(args.out)) throw Error('Require fresh --out');
const run='runs/memory-retention-2026-10-31/coupled-v1-dev';
const original=readFileSync(`${run}/summaries.jsonl`), published=original.toString('utf8').trim().split('\n').map(JSON.parse);
const manifest=JSON.parse(readFileSync(`${run}/manifest.json`,'utf8'));
if(manifest.status!=='complete') throw Error('Original incomplete');
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [file,hash] of Object.entries(manifest.sources)) if(sha(readFileSync(file))!==hash) throw Error(`Source changed: ${file}`);
if(sha(original)!==manifest.summaries.sha256) throw Error('Original summaries changed');
let current, context, fixture, total=0, matched=0;
const phases=[], start=performance.now();
registerRule('local-coupled-v1', f=>{fixture=f;current=makeRule('local-coupled-v1',f);return current;});
const guard=()=>{if(process.memoryUsage().rss>2048*2**20||os.freemem()<256*2**20||performance.now()-start>300000) throw Error('Diagnostic resource/time guard');};
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
for(const seed of manifest.profile.seeds) {
  guard(); const before=performance.now();
  const summaries=runCellSeed({...manifest.profile,seed,writeRecord:row=>{
    total++;
    if(row.kind==='start') context=row.config;
    if(row.kind!=='test'||context.arm!=='informative') return;
    const memory=current.memory, f=fixture;
    const later=new Set(['B+','B-','C+','C-'].flatMap(id=>[...f.images[id].focal]));
    const groups={};
    for(const id of ['A+','A-']) for(const shared of [false,true]) {
      const ks=[...f.images[id].focal].filter(k=>later.has(k)===shared);
      for(const [channel,offset] of [['P',0],['R',f.nKC]]) {
        const edges=ks.map(k=>k+offset);
        groups[`${id}_${shared?'shared':'unique'}_${channel}`]={n:edges.length,fast:mean(edges.map(e=>memory.gains[e])),slow:mean(edges.map(e=>memory.slow[e]))};
      }
    }
    phases.push({seed,test:row.test,stateHash:row.stateHash,A:row.outcomes.A,groups});
  }});
  for(const summary of summaries) {
    const old=published.find(r=>r.seed===seed&&r.arm===summary.arm);
    if(!isDeepStrictEqual(old,summary)) throw Error('Diagnostic changed original trajectory');
    matched++;
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,performance.now()-before); guard();
}
writeFileSync(args.out,JSON.stringify({scope:'Same-seed diagnostic replay, not additional independent learning evidence',originalManifestSha256:sha(readFileSync(`${run}/manifest.json`)),matchedTrajectories:matched,generatedRecords:total,phases,wallSeconds:(performance.now()-start)/1000,peakRssMiB:process.resourceUsage().maxRSS/1024},null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({matchedTrajectories:matched,phaseStates:phases.length})+'\n');

// No graph execution. Pin a new condition and record exact static cue coverage.
import assert from 'node:assert/strict';
import {readFileSync,createReadStream,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
async function hash(path){const h=createHash('sha256');for await(const b of createReadStream(path))h.update(b);return h.digest('hex');}
const source='research/data/gamma2-adaptive-target-cue10-v1/protocol.json',p=read(source);
const coarsePath='research/reports/reversal-candidate-2026-10-05/mapping.json';
const gamma=read(p.mappingPath),coarse=read(coarsePath).mapping;
const gammaKC=new Set(gamma.groups.flatMap(g=>g.kc)),pamGroups=coarse.groups.filter(g=>g.danType==='PAM02');
assert.equal(pamGroups.length,2);assert(pamGroups.every(g=>g.dan.length===6&&g.edges.length>0));
const pamKC=new Set(pamGroups.flatMap(g=>g.kc));
const coverage={gammaKCs:gammaKC.size,pamKCs:pamKC.size,
  directSharedKCs:[...gammaKC].filter(i=>pamKC.has(i)),
  groups:pamGroups.map(g=>({side:g.side,dan:g.dan.length,edges:g.edges.length})),
  hashes:{[p.mappingPath]:await hash(p.mappingPath),[coarsePath]:await hash(coarsePath)},
  scope:'Static direct eligibility coverage only; recurrent propagation and plasticity not tested'};
assert.equal(coverage.directSharedKCs.length,0);
const dir='research/reports/adaptive-temporal-loop-2026-10-09';
writeFileSync(`${dir}/static-coverage.json`,JSON.stringify(coverage,null,2)+'\n',{flag:'wx'});
for(const [path,h] of Object.entries(p.sources))assert.equal(await hash(path),h,`Inherited dependency changed: ${path}`);
p.schema='adaptive-temporal-loop-v1';p.maxPairs=4;
p.conditions=['informative','fixed-target','swapped','absent','disabled'];
p.scope='Bounded development test of repeated current-error feedback, equal-dose fixed-target comparison and yoked controls. No reasoning, transfer or biological validation.';
p.gates={epsilon:1e-8,choice:'Informative Qh7 unique all-legal top; swapped/absent/disabled fail.',
  adaptiveAdvantage:'Informative strongest-competitor margin exceeds fixed-target margin by epsilon at matched lesson count.',
  persistence:'Same-memory repeated all-legal assessment agrees exactly; computational persistence only.'};
delete p.comparison;delete p.gateBasis;delete p.adaptiveTarget;
p.protocolSource=source;p.sources[source]=await hash(source);
p.runnerPath=`${dir}/run.mjs`;p.auditorPath=`${dir}/audit.mjs`;
for(const path of [p.runnerPath,p.auditorPath,`${dir}/prepare.mjs`,`${dir}/README.md`,
  '.codebase/src/puzzle-learning/adaptive-temporal-pair.mjs'])p.sources[path]=await hash(path);
p.runnerSha256=await hash(p.runnerPath);p.auditorSha256=await hash(p.auditorPath);
mkdirSync('research/data/adaptive-temporal-loop-v1',{recursive:false});
writeFileSync('research/data/adaptive-temporal-loop-v1/protocol.json',JSON.stringify(p,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({coverage,protocol:'research/data/adaptive-temporal-loop-v1/protocol.json'}));

import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const priorPath='research/data/gamma2-temporal-hypothesis-v2/protocol.json';
const prior=JSON.parse(readFileSync(priorPath,'utf8'));
const root='research/reports/plasticity-timing-candidate-2026-10-09/';
const runnerPath=root+'run-adaptive-target.mjs',auditorPath=root+'audit-adaptive-target.mjs';
const sources={...prior.sources,[priorPath]:hash(priorPath),[runnerPath]:hash(runnerPath)};
for(const file of readdirSync('.codebase/src',{recursive:true}).filter(f=>f.endsWith('.mjs'))){
  const path='.codebase/src/'+file.replaceAll('\\','/');sources[path]=hash(path);}
const directory='research/data/gamma2-adaptive-target-v1';mkdirSync(directory,{recursive:false});
const protocol={...prior,schema:'gamma2-adaptive-target-v1',
  scope:'Hypothesis-only feedback test: does teaching the frozen unaided top wrong move improve its ranking against a certified winning alternative? No retention/reversal/transfer acceptance.',
  protocolSource:priorPath,runnerPath,runnerSha256:hash(runnerPath),auditorPath,auditorSha256:hash(auditorPath),sources,
  adaptiveTarget:{rule:'Before any feedback, rank all legal actions. Select the unique top action only if its independently replayed proof says failure; otherwise preflight aborts.',
    successMove:'f7h7',previousFixedMistake:'f7e6',seed:prior.model.seed},
  gateBasis:'Fresh-model pre-feedback ranking is required to reproduce Qg8 as unique top verified failure. Every arm selects its own measured top error; exposure count and successful contrast are identical.',
  moves:undefined,successMove:'f7h7',gates:{...prior.gates,
    specificity:'Informative Qh7-minus-adaptively selected top-error margin change exceeds each control by epsilon.',
    choice:'After feedback the all-legal correct Qh7 is the unique top action; report exact status and margin.'},
  sources};
delete protocol.moves;
writeFileSync(directory+'/protocol.json',JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:directory+'/protocol.json',conditions:protocol.conditions,lessonsPerArm:2,
  selectedMistake:'derived only from each arm pre-feedback all-legal ranking',scientificSettingsInherited:'gamma2-temporal-hypothesis-v2'}));

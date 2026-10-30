import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=JSON.parse(readFileSync('research/data/mate-conjoined-input-v1/protocol.json','utf8'));
const directory='research/data/gamma2-temporal-hypothesis-v2';mkdirSync(directory,{recursive:false});
const root='research/reports/plasticity-timing-candidate-2026-10-09/';
const files=['package.json','package-lock.json','research/data/mate-conjoined-input-v1/protocol.json',
  root+'rate-timing-map.json',root+'run-temporal-hypothesis.mjs',
  ...readdirSync('.codebase/src',{recursive:true}).filter(f=>f.endsWith('.mjs')).map(f=>'.codebase/src/'+f.replaceAll('\\','/'))];
const sources=Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
const protocol={schema:'gamma2-temporal-hypothesis-v2',scope:'Authorized hypothesis-only training: local bidirectional response and familiar margin specificity. No retention/reversal/transfer acceptance.',
  graphPath:base.graphPath,annotationPath:base.annotationPath,mappingPath:root+'rate-timing-map.json',
  model:base.model,fen:base.fen,task:base.task,encoder:{...base.encoderConfig,taskFamily:'forced-mate'},
  readout:{algorithm:'readMBON: mean(MBON12)-mean(MBON01), larger preferred',cells:base.readouts},
  memory:{eta:0.5,minGain:0.2,maxGain:1.8,activityScale:1.5,referenceMode:'fixed-unstimulated-model',
    tauKC:0.4,tauShort:0.6,tauLong:1,stepDuration:0.075},
  timing:{cueFrame:2,leadFrames:2,tailFrames:16,current:1.5},
  conditions:['informative','swapped','absent','disabled'],moves:['f7e6','f7h7'],
  gates:{epsilon:1e-8,direction:'Informative stimulated-edge mean gain decreases for failure and increases for success; swapped reverses both signs.',
    specificity:'Informative Qh7-minus-Qe6 margin change is positive and exceeds every control by epsilon.',
    choice:'Report all-legal top consequence separately; pair margin is insufficient for useful acquisition.'},
  approximations:['Model time units uncalibrated; 8 steps per frame produce a 1.2-unit early pulse lead.',
    'Above fixed reference rate, separate response filters, bounded engineering gains; no receptor/coordinate validation.',
    'Only teaching frames advance memory physiology; assessment is a read-only measurement intervention.',
    'Transient neurons reset at lesson boundary while local memory traces persist; no long-term retention claim.'],
  runtime:{heapMiB:256,cpuDuty:0.5,maxRss:768*2**20,minFree:256*2**20},sources};
writeFileSync(directory+'/protocol.json',JSON.stringify(protocol,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:directory+'/protocol.json',arms:4,lessons:8,frames:152}));

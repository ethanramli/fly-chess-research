// Fixture-only registration; no connectome execution is authorized by this package.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {planG0HistoryDiagnostic} from '../../src/neural-learning/g0-reversal-history-diagnostic.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';

const {values:a}=parseArgs({options:{out:{type:'string'}}});
assert(a.out&&process.execArgv.includes('--max-old-space-size=256'));
const templatePath='research/data/curriculum-g0-runner-fixture-v2/protocol.json';
const p=JSON.parse(readFileSync(templatePath,'utf8'));
assert.equal(p.fixture,true);
const mapping=JSON.parse(readFileSync(p.mappingPath,'utf8'));
mkdirSync(a.out,{recursive:false});
p.mappingPath=join(a.out,'mapping.json').replaceAll('\\','/');
writeFileSync(p.mappingPath,JSON.stringify(mapping,null,2)+'\n',{flag:'wx'});
for(const key of ['sources','dependencies','phases','conditions','shuffleSeed','scheduleHash','earlyStop','registrationPeakRssMiB'])delete p[key];
Object.assign(p,{schema:'g0-reversal-history-diagnostic-v1',created:new Date().toISOString(),
  projectionSeeds:[20261011],planHash:digest(planG0HistoryDiagnostic()),maxPresentations:16000,
  stopping:'complete-all-matched-diagnostic-stages',scope:'Six-neuron diagnostic software/recovery fixture only; not G0 or connectome learning.'});
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
p.sources={};
const pending=['.codebase/scripts/neural-learning/run-g0-reversal-history-diagnostic.mjs',
  '.codebase/scripts/neural-learning/register-g0-history-fixture.mjs',p.mappingPath,templatePath,
  'documentation/design/neural-learning/g0-reversal-history-diagnostic.md'];
while(pending.length){
  const path=pending.pop();if(p.sources[path])continue;
  p.sources[path]=sha(path);if(!path.endsWith('.mjs'))continue;
  for(const m of readFileSync(path,'utf8').matchAll(/\b(?:from\s+|import\s*\(\s*|import\s+)['"](\.[^'"]+)['"]/g)){
    const target=relative(process.cwd(),resolve(dirname(path),m[1])).replaceAll('\\','/');
    assert(!target.startsWith('..'));pending.push(target);
  }
}
p.dependencies=Object.fromEntries(['package-lock.json','node_modules/chess.js/package.json',
  'node_modules/chess.js/dist/esm/chess.js'].map(path=>[path,sha(path)]));
writeFileSync(join(a.out,'protocol.json'),JSON.stringify(p,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({protocol:join(a.out,'protocol.json'),fixture:true,sources:Object.keys(p.sources).length,planHash:p.planHash}));

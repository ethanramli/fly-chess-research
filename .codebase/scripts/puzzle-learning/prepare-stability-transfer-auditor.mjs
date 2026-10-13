import fs from 'node:fs';
const original='.codebase/scripts/puzzle-learning/audit-near-transfer-repair-transfer-v2.mjs';
const target='.codebase/scripts/puzzle-learning/audit-stability-transfer.mjs';
let source=fs.readFileSync(original,'utf8');
for(const [old,next]of [
 ['research/data/adaptive-near-transfer-repair-transfer-v1/protocol.json','research/data/multi-context-stability-transfer-v1/protocol.json'],
 ['.codebase/scripts/puzzle-learning/evaluate-near-transfer-repair-transfer.mjs','.codebase/scripts/puzzle-learning/evaluate-stability-transfer.mjs'],
 [original,target],
 ]){if(!source.includes(old))throw Error(`Missing source ${old}`);source=source.replaceAll(old,next);}
source=source.replace("const snapshot = conditionSnapshots[condition];", "assert.deepEqual(position, p.positions.find(x => x.id === position.id), 'Exact pinned position');\n  const snapshot = conditionSnapshots[condition];");
fs.writeFileSync(target,source,{flag:'wx'});
console.log('Separate transfer artifact auditor prepared; no active pinned sources changed.');

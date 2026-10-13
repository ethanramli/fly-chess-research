import { createReadStream, readFileSync, mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import { loadGraph, readNpz } from '../src/lowram/graph.mjs';
import { SparseTrainer } from '../src/lowram/trainer.mjs';
import { ReversalMemory } from '../src/lowram/reversal-memory.mjs';
import { digest, annotationHash } from '../src/lowram/mushroom-body.mjs';
import { fixedStateHash } from '../src/lowram/association-validation.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, resume: { type: 'string' },
  'cpu-duty': { type: 'string', default: '0.5' }, 'max-jobs': { type: 'string', default: '24' } } });
const duty = Number(args['cpu-duty']), maxJobs = Number(args['max-jobs']);
if (!args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1) || !Number.isSafeInteger(maxJobs) || maxJobs < 1 || maxJobs > 24) throw Error('Require new output directory and bounded options');
const started = performance.now(), cpuStart = process.cpuUsage();
function guard() { if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard; resume last completed job checkpoint'); }
async function pace(t) {
  let remaining = (performance.now() - t) * (1 / duty - 1);
  do { const n = Math.min(250, Math.max(0, remaining)); await new Promise(r => setTimeout(r,n)); remaining -= n; guard(); } while (remaining > 0);
}
guard();
const protocolPath = 'research/data/gf-memory-probe-v1/protocol.json';
const protocol = JSON.parse(readFileSync(protocolPath)), source = JSON.parse(readFileSync(join(protocol.sourceRun, 'report.json')));
assert.equal(source.complete, true); assert.equal(source.summary.allGatesPassed, true);
const sourceAudit = JSON.parse(readFileSync(join(protocol.sourceRun,'audit.json')));
// The published independent audit's layout is pinned below; its pass is not a GF gate.
assert.ok(sourceAudit);
const inputs = {}, sources = {};
for (const path of [protocolPath, join(protocol.sourceRun,'report.json'), join(protocol.sourceRun,'audit.json'), protocol.anatomy, protocol.mapping,
  '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv']) inputs[path] = await sha256(path);
assert.equal(inputs['.cache/full.npz'], graphHash); assert.equal(inputs['.cache/flywire-annotations-v2.1.0.tsv'], annotationHash);
for (const [path, hash] of Object.entries(source.identity.sources)) assert.equal(await sha256(path), hash, `Original experiment source changed: ${path}`);
for (const path of ['.codebase/scripts/probe-gf-memory.mjs', '.codebase/src/lowram/reversal-memory.mjs', '.codebase/src/lowram/trainer.mjs',
  '.codebase/src/lowram/graph.mjs', '.codebase/src/lowram/mushroom-body.mjs', '.codebase/src/lowram/association-validation.mjs']) sources[path] = await sha256(path);
const anatomy = JSON.parse(readFileSync(protocol.anatomy)), mapping = JSON.parse(readFileSync(protocol.mapping)).mapping;
const setupStart = performance.now(), graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz',['root_ids']).root_ids;
const gf = anatomy.giantFibers;
assert.equal(gf.length,2); for (const c of gf) assert.equal(ids[c.index].toString(),c.rootId);
const direct = new Set(gf.flatMap(c => Array.from(graph.col.subarray(graph.row[c.index],graph.row[c.index+1]))));
const roots = new Map([...direct].map(i => [ids[i].toString(),i]));
const calibrationCells = []; let header;
for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
  const row = line.split('\t'); if (!header) { header = row; continue; }
  const get = key => row[header.indexOf(key)] ?? '';
  const type = get('cell_type') || get('hemibrain_type'), index = roots.get(get('root_id'));
  if (index !== undefined && ['LC4','LPLC2'].includes(type)) calibrationCells.push({ index, rootId: get('root_id'), type });
}
assert.ok(calibrationCells.length); assert.equal(new Set(calibrationCells.map(c=>c.index)).size,calibrationCells.length);
const model = new SparseTrainer(graph, source.identity.model), memory = new ReversalMemory(model,mapping,source.protocol);
const naive = memory.snapshot(); assert.equal(fixedStateHash(model,memory.edges),source.identity.invariant);
let evaluations = 0;
function raw() {
  const h = model.h[model.steps];
  const mbon = Object.fromEntries(Object.entries(source.identity.readouts).map(([type,cells]) => [type,cells.reduce((s,c)=>s+h[c.index],0)/cells.length]));
  return { gf: gf.map(c => h[c.index]), mbon: { ...mbon, score: mbon.MBON12 - mbon.MBON01 } };
}
model.forward([0]); evaluations++; const resting = raw();
model.forward([0],calibrationCells.map(c => ({index:c.index,current:protocol.calibrationCurrent}))); evaluations++; const panel = raw();
const ranges = panel.gf.map((v,i) => v-resting.gf[i]);
const calibration = { cells: calibrationCells, resting, panel, ranges,
  usable: ranges.every(v => Number.isFinite(v) && v > protocol.minimumCalibrationRange) };
await pace(setupStart);
const identity = { schema:protocol.schema, inputs, sources, gf:gf.map(c=>({rootId:c.rootId,index:c.index})),
  model:model.config, memory:memory.config, invariant:source.identity.invariant, calibration, duty };
let state = { identity, nextJob:0, results:[] };
if (args.resume) {
  const prior = JSON.parse(readFileSync(args.resume)); assert.equal(digest(prior.identity),digest(identity),'Resume identity mismatch');
  assert.equal(prior.results.length,prior.nextJob); assert.ok(prior.nextJob >= 0 && prior.nextJob <= source.results.length); state=prior;
}
mkdirSync(dirname(args.out),{recursive:true}); mkdirSync(args.out);
function save(name) { const tmp=join(args.out,name+'.partial'); mkdirSync(tmp); writeFileSync(join(tmp,'state.json'),JSON.stringify(state)); renameSync(tmp,join(args.out,name)); }
save('initial');
async function probe(cues) {
  const memoryBefore = digest(memory.snapshot()), result = {};
  for (const key of ['A','B']) {
    guard(); const t = performance.now(); model.forward([0],cues[key].map(index=>({index,current:source.protocol.current}))); evaluations++;
    const response = raw(), normalized = response.gf.map((v,i)=>(v-resting.gf[i])/ranges[i]);
    result[key] = { ...response, normalized: calibration.usable ? normalized : null,
      danger: calibration.usable ? Math.max(...normalized) : null }; await pace(t);
  }
  assert.equal(digest(memory.snapshot()),memoryBefore,'Read-only probe changed memory');
  assert.equal(fixedStateHash(model,memory.edges),identity.invariant,'Fixed state changed');
  return { ...result, choice:calibration.usable ? (result.A.danger <= result.B.danger ? 'A':'B') : null, memoryHash:memoryBefore };
}
let completed = 0, stop = false; process.on('SIGINT',()=>{stop=true;});
while (state.nextJob < source.results.length && completed < maxJobs && !stop) {
  const index=state.nextJob, original=source.results[index];
  // The frozen original driver publishes 18 checkpoints per job: start + 16 trials + completion.
  const checkpointPath=join(protocol.sourceRun,`checkpoint-${String(6+18*index).padStart(5,'0')}`,'state.json');
  const acquisition=JSON.parse(readFileSync(checkpointPath));
  assert.deepEqual(acquisition.active.job,original.job); assert.equal(acquisition.active.nextTrial,source.protocol.acquisitionTrials);
  assert.equal(digest(acquisition.identity),digest(source.identity)); assert.deepEqual(acquisition.active.cues,original.cues);
  const probes={}; memory.restore(naive); probes.baseline=await probe(original.cues);
  memory.restore(acquisition.active.memory); probes.acquisition=await probe(original.cues);
  memory.restore(original.memory); probes.reversal=await probe(original.cues);
  memory.restore(naive); probes.reset=await probe(original.cues);
  memory.restore(original.memory); probes.restored=await probe(original.cues);
  for (const phase of ['baseline','acquisition','reversal','reset','restored']) for (const cue of ['A','B']) assert.deepEqual(probes[phase][cue].mbon,original.probes[phase][cue] &&
    { MBON12:original.probes[phase][cue].MBON12, MBON01:original.probes[phase][cue].MBON01, score:original.probes[phase][cue].score },`Original MBON response differs: ${index}/${phase}/${cue}`);
  assert.deepEqual(probes.baseline,probes.reset); assert.deepEqual(probes.reversal,probes.restored);
  const other=c=>c==='A'?'B':'A', initialSafe=other(original.job.initialPunished), reversedSafe=other(original.job.reversedPunished);
  const margin=(p,safe)=>p[other(safe)].danger-p[safe].danger;
  state.results.push({job:original.job,cues:original.cues,acquisitionCheckpoint:checkpointPath,acquisitionCheckpointSha256:await sha256(checkpointPath),probes,
    summary:{ acquisitionChoiceCorrect:probes.acquisition.choice===initialSafe, reversalChoiceCorrect:probes.reversal.choice===reversedSafe,
      acquisitionEffect:calibration.usable ? margin(probes.acquisition,initialSafe)-margin(probes.baseline,initialSafe):null,
      reversalEffect:calibration.usable ? margin(probes.reversal,reversedSafe)-margin(probes.acquisition,reversedSafe):null,
      resetExact:true,restorationExact:true,fixedStatePreserved:true }});
  state.nextJob++; completed++; save(`job-${String(state.nextJob).padStart(3,'0')}`);
  console.log(JSON.stringify({job:state.nextJob,...original.job,...state.results.at(-1).summary}));
}
const summary=Object.fromEntries(source.protocol.conditions.map(condition=>{
  const rows=state.results.filter(r=>r.job.condition===condition);
  return [condition,{jobs:rows.length,acquisitionCorrect:rows.filter(r=>r.summary.acquisitionChoiceCorrect).length,
    reversalCorrect:rows.filter(r=>r.summary.reversalChoiceCorrect).length,
    acquisitionEffects:rows.map(r=>r.summary.acquisitionEffect),reversalEffects:rows.map(r=>r.summary.reversalEffect)}];
}));
const cpu=process.cpuUsage(cpuStart), report={complete:state.nextJob===source.results.length,identity,protocol,summary,results:state.results,evaluationsThisInvocation:evaluations,
  command:{argv:process.argv,execArgv:process.execArgv,node:process.version},
  resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,elapsedSeconds:(performance.now()-started)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,cpuDuty:duty},
  scope:'Observational GF replay diagnostic on existing synthetic cues. No new training, biological validation, Gate B acceptance or chess learning.'};
writeFileSync(join(args.out,'report.json.partial'),JSON.stringify(report,null,2)); renameSync(join(args.out,'report.json.partial'),join(args.out,'report.json'));
console.log(JSON.stringify({complete:report.complete,calibrationUsable:calibration.usable,summary,resources:report.resources}));

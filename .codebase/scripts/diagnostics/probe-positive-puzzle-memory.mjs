import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v2.mjs';
import { MappedPuzzleBrain } from '../../src/puzzle-learning/mapped-puzzle-brain.mjs';
import { experienceBoard } from '../../src/puzzle-learning/puzzle-experience-plan.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

// Read-only causal memory intervention. No observe(), teaching, fitting or test data.
const { values: args } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' },
  resume: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
const duty = Number(args['cpu-duty']);
if (!args.run || !args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1)) throw Error('Require audited run and fresh output');
const started = performance.now(), cpuStart = process.cpuUsage();
function guard() { if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
  throw Error('Soft memory guard; resume last published intervention'); }
async function pace(duration) { let remaining = duration * (1 / duty - 1);
  do { const n = Math.min(250, Math.max(0, remaining)); await new Promise(r => setTimeout(r,n)); remaining -= n; guard(); } while (remaining > 0); }
guard();
const read = path => JSON.parse(readFileSync(path));
const reportPath = join(args.run,'report.json'), source = read(reportPath), auditPath = join(args.run,'audit-prefix.json'), audit = read(auditPath);
assert.equal(source.complete,true); assert.equal(source.identity.schema,'positive-puzzle-pipeline-v1');
assert.equal(audit.passed,true); assert.equal(audit.prefixExact,true);
assert.equal(await sha256(reportPath),audit.reportSha256);
for (const [path, hash] of Object.entries({...source.identity.inputs,...source.identity.sources})) assert.equal(await sha256(path),hash);
assert.equal(await sha256('.cache/full.npz'),graphHash);
const fixture = source.results.find(r => r.condition === 'informative' && r.row.id === 'pipeline-kqk-fixture');
assert.ok(fixture); const receiptPath = fixture.receiptRefs[0].path, receipt = read(receiptPath);
assert.equal(await sha256(receiptPath),fixture.receiptRefs[0].sha256);
assert.equal(receipt.event.status,'success'); assert.equal(receipt.event.channel,'PAM02');
assert.deepEqual(receipt.before,fixture.beforeMemory);
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json', mapping = read(mappingPath).mapping;
assert.equal(digest(mapping),source.identity.mappingHash);
const masks = mapping.groups.flatMap(g => g.edges.map(() => g.danType));
const memoryStates = {
  baseline: fixture.beforeMemory,
  'after-first-event': receipt.after,
  'first-PAM02-only': {...receipt.after,gains:receipt.after.gains.map((v,i) => masks[i] === 'PAM02' ? v : receipt.before.gains[i])},
  'first-PPL103-only': {...receipt.after,gains:receipt.after.gains.map((v,i) => masks[i] === 'PPL103' ? v : receipt.before.gains[i])},
  final: fixture.afterMemory,
  restored: fixture.afterMemory,
};
const inputs = {}, sources = {};
for (const path of [reportPath,auditPath,receiptPath,mappingPath]) inputs[path] = await sha256(path);
for (const path of ['.codebase/scripts/diagnostics/probe-positive-puzzle-memory.mjs',...Object.keys(source.identity.sources)]) sources[path] = await sha256(path);
const graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz',['root_ids']).root_ids;
const model = new SparseTrainer(graph,source.identity.model), memory = new ReversalMemory(model,mapping,source.protocol.memory);
for (const cells of [...Object.values(source.identity.readouts),...mapping.groups.map(g => g.dan)])
  for (const cell of cells) assert.equal(ids[cell.index].toString(),cell.rootId);
assert.equal(fixedStateHash(model,memory.edges),source.identity.invariant);
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]);
const encoder = createRelationalChessCueEncoder(mapping,source.protocol.encoder);
assert.equal(encoder.identity,source.identity.encoderIdentity);
const brain = new MappedPuzzleBrain({model,memory,mapping,rest,encoder,readouts:source.identity.readouts,
  maxPresentations:192,guard,pace});
const board = experienceBoard(fixture.row), task = {objective:fixture.row.objective,plies:fixture.row.plies};
const jobs = Object.keys(memoryStates), identity = {schema:'positive-puzzle-memory-probe-v1',inputs,sources,jobs,duty};
let state = {identity,nextJob:0,results:[]};
if (args.resume) { state = read(args.resume); assert.deepEqual(state.identity,identity); assert.equal(state.nextJob,state.results.length); }
mkdirSync(args.out,{recursive:true});
function save(name) { const temporary = join(args.out,name+'.partial'); mkdirSync(temporary);
  writeFileSync(join(temporary,'state.json'),JSON.stringify(state)); renameSync(temporary,join(args.out,name)); }
save('initial');
function resources() { const cpu = process.cpuUsage(cpuStart); return {peakRssMiB:process.resourceUsage().maxRSS/1024,
  elapsedSeconds:(performance.now()-started)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,cpuDuty:duty,
  presentationsThisInvocation:brain.presentations}; }
process.on('uncaughtException',error => {writeFileSync(join(args.out,'interruption.json'),JSON.stringify({error:String(error.stack),resources:resources(),nextJob:state.nextJob},null,2));process.exit(1);});
for (;state.nextJob < jobs.length;) {
  guard(); const job = jobs[state.nextJob]; memory.restore(memoryStates[job]);
  const fingerprint = digest(memory.snapshot());
  const assessment = await brain.assess(board,board.moves({verbose:true}),task);
  assert.equal(digest(memory.snapshot()),fingerprint); assert.equal(fixedStateHash(model,memory.edges),source.identity.invariant);
  if (job === 'baseline') assert.deepEqual(assessment,fixture.before);
  if (job === 'final' || job === 'restored') assert.deepEqual(assessment,fixture.after);
  state.results.push({job,memory:memory.snapshot(),assessment,fixedStatePreserved:true}); state.nextJob++;
  save(`intervention-${String(state.nextJob).padStart(3,'0')}`);
  console.log(JSON.stringify({job,choice:assessment.choice}));
}
writeFileSync(join(args.out,'report.json.partial'),JSON.stringify({complete:true,identity,results:state.results,
  resources:resources(),command:{argv:process.argv,execArgv:process.execArgv,node:process.version},
  scope:'Artificial saved-memory subset interventions on a training fixture, without learning. Separates first-event population contributions from later net changes; not biological pathway necessity, transfer or a new success gate.'},null,2));
renameSync(join(args.out,'report.json.partial'),join(args.out,'report.json'));

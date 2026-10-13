// Timing fixture using the existing, source-registered mechanism; not a transfer assay.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { createBoundRayRelationalCueEncoder } from '../../src/chess-input/bound-ray-relational-cue.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { bindFeedbackToAssessment } from '../../src/puzzle-learning/feedback-quality.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const started = performance.now(), cpuStart = process.cpuUsage();
const out = process.argv[2];
assert.ok(out && !existsSync(out));
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
assert.ok(process.argv.includes('--cpu-duty') && process.argv.includes('0.5'));
const protocolPath = 'research/data/bound-ray-feedback-development-v1/protocol.json';
const p = JSON.parse(readFileSync(protocolPath));
const manifest = JSON.parse(readFileSync('research/source-archives/bound-ray-feedback-development-v1/manifest.json'));
assert.equal(await sha256(protocolPath), manifest.protocolSha256);
for (const [path, hash] of Object.entries({...p.inputHashes, ...p.sourceHashes})) assert.equal(await sha256(path), hash, path);
assert.equal(await sha256(p.graphPath), p.graphSha256);
assert.equal(await sha256(p.annotationPath), p.annotationSha256);
const panel = JSON.parse(readFileSync(p.data.trainPath, 'utf8').trim().split(/\r?\n/)[0]);
const board = new Chess(); board.loadPgn(panel.pgn); assert.equal(board.fen(), panel.fen);
const candidate = panel.candidates[0];
const experience = {...verifiedExperience(board, candidate.move, p.task, candidate.proof), proof: candidate.proof,
  context: {fen: board.fen(), pgn: board.pgn(), task: p.task}};
assert.equal(experience.learningAllowed, true);
mkdirSync(out, {recursive: true});
function publish(name, value) { const path = `${out}/${name}`; writeFileSync(path+'.partial', JSON.stringify(value,null,2)+'\n', {flag:'wx'}); renameSync(path+'.partial',path); }
const identity = {protocolSha256: await sha256(protocolPath), runnerSha256: await sha256('.codebase/scripts/puzzle-learning/time-one-feedback-round.mjs'),
  graphSha256:p.graphSha256, annotationSha256:p.annotationSha256, mappingHash:p.mappingHash,
  panelId:panel.id, move:candidate.move, model:p.model, memory:p.memory, encoder:p.encoders.find(e=>e.id==='bound-ray'),
  conditions:['informative','no-channel','shuffled','disabled'], cpuDuty:0.5,
  scope:'One first training candidate, fresh memory per arm; shuffled is an opposite-valence single-event control and cannot be count-balanced. No transfer or learning acceptance gate.'};
publish('protocol.json',identity);
let peakRssBytes=0;
function guard() { peakRssBytes=Math.max(peakRssBytes,process.memoryUsage().rss); assert.ok(peakRssBytes<=768*2**20 && os.freemem()>=256*2**20,'Resource guard'); }
async function pace(ms) { while(ms>0) { const n=Math.min(250,ms); await new Promise(r=>setTimeout(r,n)); ms-=n; guard(); } }
guard(); const graph=loadGraph(p.graphPath); guard();
const mapping=JSON.parse(readFileSync(p.mappingPath)).mapping; assert.equal(digest(mapping),p.mappingHash);
const ids=readNpz(p.graphPath,['root_ids']).root_ids;
for(const cell of [...Object.values(p.readouts).flat(),...mapping.groups.flatMap(g=>g.dan)]) assert.equal(ids[cell.index].toString(),cell.rootId);
const model=new SparseTrainer(graph,p.model), memory=new ReversalMemory(model,mapping,p.memory);
const initial=memory.snapshot(), fixed=fixedStateHash(model,memory.edges);
const t=performance.now(); model.forward([0]); const rest=Float32Array.from(model.h[model.steps]); await pace(performance.now()-t);
const encoder=createBoundRayRelationalCueEncoder(mapping,identity.encoder.config); assert.equal(encoder.identity,identity.encoder.identity);
const results=[];
for(const condition of identity.conditions) {
  memory.restore(initial);
  const armStarted=performance.now(), armCpu=process.cpuUsage();
  const brain=new DualValencePuzzleBrain({model,memory,mapping,encoder,readouts:p.readouts,rest,current:p.current,guard,pace,maxPresentations:12});
  const assess=async()=> {
    const hash=digest(memory.snapshot()),rows=[];
    for(const c of panel.candidates) rows.push({move:c.move,...await brain.evoke(encoder.encode(board,c.move,p.task).stimulation)});
    assert.equal(digest(memory.snapshot()),hash);
    return {rows,choice:[...rows].sort((a,b)=>b.score-a.score)[0].move,memoryHash:hash};
  };
  const before=await assess();
  const feedback=bindFeedbackToAssessment(board,p.task,{fen:board.fen(),pgn:board.pgn(),task:p.task,...before},experience,digest(memory.snapshot()));
  const channel=condition==='no-channel'?null:condition==='shuffled'?'PPL103':'PAM02';
  const feedbackStarted=performance.now();
  const receipt=await brain.replay(experience,{channel,plasticityEnabled:condition!=='disabled'});
  const feedbackSeconds=(performance.now()-feedbackStarted)/1000;
  assert.equal(fixedStateHash(model,memory.edges),fixed);
  publish(`${condition}-pending.json`,{identity,memory:memory.snapshot(),pending:{feedback,receipt}});
  publish(`${condition}-receipt.json`,{feedback,receipt});
  const learned=memory.snapshot(), after=await assess();
  memory.restore(initial); const reset=await assess(); assert.deepEqual(reset,before);
  memory.restore(learned); const restored=await assess(); assert.deepEqual(restored,after);
  if(condition==='disabled') assert.deepEqual(learned,initial);
  // Independent receipt recurrence verification from recorded local measurements.
  let offset=0;
  for(let g=0;g<mapping.groups.length;g++) for(let i=0;i<mapping.groups[g].edges.length;i++,offset++) {
    const old=receipt.before.gains[offset],k=receipt.local.kc[offset],D=receipt.local.factors[g];
    const expected=condition==='disabled'?old:Math.max(memory.config.minGain,Math.min(memory.config.maxGain,old+memory.config.eta*D*(k+old-1)));
    assert.equal(receipt.after.gains[offset],expected);
  }
  const cpu=process.cpuUsage(armCpu);
  const result={condition,before,after,reset,restored,channel,feedbackSeconds,wallSeconds:(performance.now()-armStarted)/1000,
    cpuSeconds:(cpu.user+cpu.system)/1e6,presentations:brain.presentations,changedEdges:receipt.update.changedEdges,
    initialMemoryHash:digest(initial),finalMemoryHash:digest(learned),recurrenceChecks:offset};
  publish(`${condition}-result.json`,result); results.push(result);
  console.log(JSON.stringify(result));
}
const cpu=process.cpuUsage(cpuStart);
publish('report.json',{identity,results,metrics:{wallSeconds:(performance.now()-started)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,peakRssBytes},
  validation:'Certificates rechecked by receiver, local recurrences checked, fixed state preserved, reset/restoration exact. No independent fresh-graph replay audit.'});

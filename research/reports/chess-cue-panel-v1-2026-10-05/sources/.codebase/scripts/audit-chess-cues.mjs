// Arithmetic/input consistency audit; no encoder, readout, teacher or brain import.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';

const {values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'},compare:{type:'string'}}});
if(!args.run||!args.out)throw Error('Require --run RUN_DIRECTORY --out NEW_AUDIT_JSON');
const read=p=>JSON.parse(readFileSync(p)),hash=v=>createHash('sha256').update(v).digest('hex'),digest=v=>hash(JSON.stringify(v));
const report=read(join(args.run,'report.json'));assert.equal(report.complete,true);
for(const [p,h]of Object.entries(report.identity.inputs))assert.equal(hash(readFileSync(p)),h,`Input changed: ${p}`);
for(const [p,h]of Object.entries(report.identity.sources))assert.equal(hash(readFileSync(p)),h,`Source changed: ${p}`);
assert.equal(report.learningApplied,false);assert.equal(report.summary.graphAndParametersUnchanged,true);
const mapping=read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping;
const pool=[...new Set(mapping.groups.flatMap(g=>g.kc))].sort((a,b)=>a-b),config=report.protocol.encoder;
assert.equal(report.identity.encoderIdentity,digest({schema:'chess-cue-v1',mapping,config,pool}));
const bucket=(token,size)=>createHash('sha256').update(`${config.seed}\0${token}`).digest().readUInt32LE(0)%size;
const checks=['Pinned source/input hashes, declared disabled learning and encoder identity'];
assert.equal(report.results.length,report.identity.jobs.length);
for(let n=0;n<report.results.length;n++){
  const {job,cue,rawGF,excessGF}=report.results[n];assert.deepEqual(job,report.identity.jobs[n]);
  const spec=report.protocol.positions.find(p=>p.id===job.position),board=new Chess(spec.fen);for(const move of spec.moves)board.move(move);
  assert.equal(cue.fen,board.fen());assert.equal(cue.actor,board.turn());assert.equal(cue.move,job.move);
  const legal=board.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion??'')===job.move);assert.ok(legal);
  assert.equal(cue.historyPlies,board.history().length);assert.ok(cue.historyPlies<=config.maxHistoryPlies);
  const pieces=board.board().flat().filter(Boolean);
  assert.equal(cue.tokens.length,pieces.length*2+11);assert.equal(new Set(cue.tokens).size,cue.tokens.length);
  for(const p of pieces){const token=`piece:${p.color}:${p.type}:${p.square}`;assert.ok(cue.tokens.includes(token));assert.ok(cue.tokens.includes(`${token}|action:${job.move}`));}
  for(const token of [`turn:${board.turn()}`,`action:${job.move}`,`origin:${legal.from}`,`destination:${legal.to}`,
    `moving:${legal.color}:${legal.piece}`,`promotion:${legal.promotion??'-'}`,`task:${report.protocol.taskContext.objective}:${report.protocol.taskContext.plies}`])assert.ok(cue.tokens.includes(token));
  const fields=board.fen().split(' ');for(const token of [`castling:${fields[2]}`,`ep:${fields[3]}`,`halfmove:${fields[4]}`,`repetition:${cue.repetitions}`])assert.ok(cue.tokens.includes(token));
  assert.deepEqual(cue.assignments,cue.tokens.map(token=>({token,index:pool[bucket(token,pool.length)]})));
  const unique=[...new Set(cue.assignments.map(a=>a.index))];unique.sort((a,b)=>bucket(`budget:${a}`,2**32)-bucket(`budget:${b}`,2**32)||a-b);
  const selected=unique.slice(0,config.maxCells).sort((a,b)=>a-b),current=Math.min(config.maxCellCurrent,config.totalCurrent/selected.length);
  assert.deepEqual(cue.stimulation,selected.map(index=>({index,current})));
  const a=cue.accounting;assert.equal(a.featureCount,cue.tokens.length);assert.equal(a.uniqueProjectedCells,unique.length);assert.equal(a.collisions,cue.tokens.length-unique.length);
  assert.equal(a.stimulatedCells,selected.length);assert.equal(a.droppedCells,unique.length-selected.length);
  assert.equal(a.droppedFeatures,cue.assignments.filter(a=>!selected.includes(a.index)).length);assert.equal(a.totalCurrent,current*selected.length);
  assert.equal(a.currentPerCell,current);assert.equal(a.poolCells,pool.length);assert.ok(a.totalCurrent<=config.totalCurrent+1e-12);
  assert.equal(rawGF.length,2);assert.ok(rawGF.every(Number.isFinite));assert.deepEqual(excessGF,rawGF.map((v,i)=>v-report.identity.resting[i]));
  if(job.repeat){const first=report.results.find(r=>r.job.position===job.position&&r.job.move===job.move);assert.deepEqual(cue,first.cue);assert.deepEqual(rawGF,first.rawGF);}
}
checks.push('All legal board/action feature inventories, fixed projection assignments, stimulation limits, collision/drop accounting and exact repeats');
const samples=report.results.filter(r=>!r.job.repeat).map(r=>r.rawGF),c=report.calibration;
assert.equal(c.sampleCount,samples.length);assert.equal(c.sampleHash,digest(samples));
assert.deepEqual(c.min,[0,1].map(i=>Math.min(...samples.map(v=>v[i]))));assert.deepEqual(c.max,[0,1].map(i=>Math.max(...samples.map(v=>v[i]))));
assert.deepEqual(c.range,c.max.map((v,i)=>v-c.min[i]));assert.equal(c.usable,c.range.every(v=>v>=c.minRange));
for(const s of report.summary.positions){
  const rows=report.results.filter(r=>r.job.position===s.position&&!r.job.repeat);assert.equal(s.candidates,rows.length);
  assert.equal(s.distinctCues,new Set(rows.map(r=>digest(r.cue.stimulation))).size);assert.equal(s.distinctGFResponses,new Set(rows.map(r=>digest(r.rawGF))).size);
  const scores=c.usable?rows.map(r=>Math.max(...r.rawGF.map((v,i)=>Math.min(1,Math.max(0,(v-c.min[i])/c.range[i]))))):null;
  assert.equal(s.distinctClippedScores,scores?new Set(scores).size:null);assert.deepEqual(s.scoreRange,scores?[Math.min(...scores),Math.max(...scores)]:null);
}
checks.push('Label-free calibration min/max/range/sample hash and per-position response/score diversity');
if(args.compare){const replay=read(join(args.compare,'report.json'));for(const key of ['identity','results','calibration','summary'])assert.deepEqual(replay[key],report[key],`Replay differs: ${key}`);checks.push('Completed panel replay matches exact scientific records');}
const audit={allChecksPassed:true,checkedCandidates:report.results.length,checks,reportSha256:hash(readFileSync(join(args.run,'report.json'))),
  sourceSha256:hash(readFileSync('.codebase/scripts/audit-chess-cues.mjs')),
  limitations:['Consistency audit uses the same chess.js legality library; it does not independently re-simulate neurons.',
    'Naive input sensitivity and calibration are not learning, successful puzzle choices, reasoning, biological validation or held-out transfer.']};
writeFileSync(args.out,JSON.stringify(audit,null,2),{flag:'wx'});console.log(JSON.stringify(audit));

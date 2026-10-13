import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const read=f=>JSON.parse(fs.readFileSync(f));
const root='research/reports/multi-context-stability-transfer-v1-2026-10-07/run';
const report=read(`${root}/report.json`),audit=read(`${root}/audit.json`);
assert.ok(audit.passed);assert.equal(audit.reportSha256,await sha256(`${root}/report.json`));
const pp='research/data/multi-context-stability-transfer-v1/protocol.json',p=read(pp);
for(const [f,h] of Object.entries({...p.inputs,...p.sources}))assert.equal(await sha256(f),h);
const encoder=createCompartmentChessCueEncoder(read(p.mappingPath).mapping,{...p.encoder,...p.variant});
function cue(position,key){const b=new Chess(position.fen);const m=b.moves({verbose:true}).find(x=>x.from+x.to+(x.promotion??'')===key);assert.ok(m);return encoder.encode(b,m,{objective:position.objective,plies:position.plies});}
const training=[{id:'c4-training',fen:'5r1k/6pp/7N/8/2Q5/8/8/K7 w - - 0 1',move:'c4g8',objective:'forced-mate',plies:3},{id:'d5-training',fen:'5r1k/6pp/7N/3Q4/8/8/8/K7 w - - 0 1',move:'d5g8',objective:'forced-mate',plies:3}];
const trained=training.map(x=>({position:x,cue:cue(x,x.move)}));
function overlap(a,b){const ac=a.stimulation.map(x=>x.index),bc=b.stimulation.map(x=>x.index);const tc=a.tokens.filter(x=>b.tokens.includes(x));return {sharedCells:ac.filter(x=>bc.includes(x)).length,cellsA:ac.length,cellsB:bc.length,sharedTokens:tc.length,tokensA:a.tokens.length,tokensB:b.tokens.length,identicalStimulation:JSON.stringify(a.stimulation)===JSON.stringify(b.stimulation)};}
const effects=report.panels.filter(x=>x.condition==='informative').map(panel=>{
 const control=report.panels.find(x=>x.condition==='disabled'&&x.position.id===panel.position.id);
 const margin=x=>Math.max(...x.rows.filter(r=>r.consequence==='success').map(r=>r.score))-Math.max(...x.rows.filter(r=>r.consequence==='failure').map(r=>r.score));
 const winners=panel.rows.filter(r=>r.consequence==='success');
 return {position:panel.position.id,choice:panel.choice,informativeMargin:margin(panel),disabledMargin:margin(control),marginChange:margin(panel)-margin(control),successes:winners.map(r=>({move:r.move,scoreChange:r.score-control.rows.find(x=>x.move===r.move).score,overlapWithTrained:trained.map(t=>({training:t.position.id,...overlap(cue(panel.position,r.move),t.cue)})),overlapWithChosenFailure:overlap(cue(panel.position,r.move),cue(panel.position,panel.choice))}))};
});
const out='research/reports/stability-transfer-diagnostic-v1-2026-10-07';assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
const result={reportSha256:await sha256(`${root}/report.json`),auditSha256:await sha256(`${root}/audit.json`),protocolSha256:await sha256(pp),sourceSha256:await sha256(import.meta.filename),encoderIdentity:encoder.identity,effects,scope:'Offline input-token/projection overlap and audited score differences. No graph, feedback, memory changes, causal attribution or reasoning proof.'};
fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

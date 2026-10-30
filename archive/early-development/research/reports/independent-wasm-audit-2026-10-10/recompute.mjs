import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
const dir = new URL('.', import.meta.url);
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const json = p => JSON.parse(readFileSync(p));
const metric = v => {
  const s = v.toSorted((a,b) => a-b), n = s.length;
  return { values: v, conventionalMedian: (s[Math.floor((n-1)/2)] + s[Math.floor(n/2)])/2,
    nearestRankP50: s[Math.ceil(n*.5)-1], sampledP95: s[Math.ceil(n*.95)-1], min: s[0], max: s.at(-1) };
};
const runs = [];
for (const kind of ['wasm', 'zero-reset']) {
  const base = `runs/move-latency-${kind}-v1/`, report = json(base+'report.json');
  const samples = readFileSync(base+'samples.jsonl','utf8').trim().split('\n').map(JSON.parse);
  assert.equal(samples.length,32);
  const fixtures = [];
  for (const f of report.protocol.fixtures) {
    const game = f.fen ? new Chess(f.fen) : new Chess();
    for (const m of f.moves ?? []) game.move(m);
    const legal = game.moves({verbose:true}), rows = samples.filter(s=>s.fixture===f.id);
    assert.equal(rows.length,8);
    assert.deepEqual(rows.map(s=>s.name),['oracle','candidate','candidate','oracle','oracle','candidate','candidate','oracle']);
    assert.deepEqual(rows.map(s=>s.pair),[0,0,1,1,2,2,3,3]);
    for (const row of rows) {
      assert.equal(row.candidates,legal.length); assert.equal(row.outputs.length,legal.length);
      assert.deepEqual(row.outputs,rows[0].outputs); assert.deepEqual(row.chosen,rows[0].chosen);
      let best = 0;
      for (let i=1;i<legal.length;i++) if (game.turn()==='w' ? row.outputs[i][0]>row.outputs[best][0] : row.outputs[i][0]<row.outputs[best][0]) best=i;
      assert.equal(row.chosen.from+row.chosen.to+(row.chosen.promotion??''),legal[best].lan);
      assert.equal(row.chosen.score,row.outputs[best][0]);
    }
    const eq = report.equivalence.filter(e=>e.fixture===f.id);
    assert.deepEqual(eq.map(e=>e.move),legal.map(m=>m.lan));
    for(let i=0;i<eq.length;i++) assert.deepEqual(eq[i].prediction,rows[0].outputs[i]);
    const metrics = Object.fromEntries(['oracle','candidate'].map(name=>[name,Object.fromEntries(
      ['elapsedMs','cpuMs','forwardMs','restMs'].map(key=>[key,metric(rows.filter(s=>s.name===name).map(s=>s[key]))]))]));
    const old = report.summaries.find(s=>s.fixture===f.id);
    for(const name of ['oracle','candidate']) {
      assert.equal(metrics[name].elapsedMs.nearestRankP50,old[name].medianMs);
      assert.equal(metrics[name].elapsedMs.sampledP95,old[name].p95Ms);
    }
    const pairs = Array.from({length:4},(_,i)=>{
      const a=rows.find(s=>s.name==='oracle'&&s.pair===i),b=rows.find(s=>s.name==='candidate'&&s.pair===i);
      return {pair:i,reductionPercent:100*(1-b.elapsedMs/a.elapsedMs),candidateFaster:b.elapsedMs<a.elapsedMs};
    });
    fixtures.push({id:f.id,candidates:legal.length,metrics,pairs,
      conventionalMedianReductionPercent:100*(1-metrics.candidate.elapsedMs.conventionalMedian/metrics.oracle.elapsedMs.conventionalMedian),
      nearestRankReductionPercent:100*(1-metrics.candidate.elapsedMs.nearestRankP50/metrics.oracle.elapsedMs.nearestRankP50)});
  }
  const sources=Object.entries(report.sources).map(([path,expected])=>({path,expected,current:hash(path),matches:hash(path)===expected}));
  const conventionalGate=fixtures.every(f=>f.metrics.candidate.elapsedMs.conventionalMedian<f.metrics.oracle.elapsedMs.conventionalMedian&&f.metrics.candidate.elapsedMs.sampledP95<=f.metrics.oracle.elapsedMs.sampledP95);
  runs.push({kind,reportSHA256:hash(base+'report.json'),samplesSHA256:hash(base+'samples.jsonl'),fixtures,sources,
    declaredGate:report.latencyGatePassed,conventionalPerFixtureGate:conventionalGate,resources:report.resources,coldStart:report.coldStart,command:report.command,
    measuredCpuMs:Object.fromEntries(['oracle','candidate'].map(n=>[n,samples.filter(s=>s.name===n).reduce((sum,s)=>sum+s.cpuMs,0)]))});
}
const frozen='research/reports/move-latency-wasm-2026-10-10/';
const production='.codebase/src/supervised-baselines/trainer.mjs';
const candidate=readFileSync(frozen+'candidate-trainer.mjs','utf8');
assert.equal(readFileSync(production,'utf8'),candidate.replace("../../../.codebase/src/runtime/sparse-accumulator.mjs","../runtime/sparse-accumulator.mjs"));
const completion=json(frozen+'completion.json');
const evidence=Object.entries(completion.evidence).map(([p,expected])=>({path:p,matches:hash(frozen+p)===expected}));
assert.ok(evidence.every(e=>e.matches));
const raw=readFileSync(frozen+'production-full-regression.txt');
const tap=raw[0]===255&&raw[1]===254?raw.subarray(2).toString('utf16le'):raw.toString('utf8');
assert.match(tap,/# tests 221/);assert.match(tap,/# pass 221/);assert.match(tap,/# fail 0/);
const result={timestamp:new Date().toISOString(),runs,evidence,productionImportOnlyIdentity:true,
  productionSHA256:hash(production),accumulatorSHA256:hash('.codebase/src/runtime/sparse-accumulator.mjs'),historical221TapConfirmed:true};
writeFileSync(new URL('recomputed.json',dir),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({runs:runs.map(r=>({kind:r.kind,gate:r.conventionalPerFixtureGate,fixtures:r.fixtures.map(f=>({id:f.id,median:f.conventionalMedianReductionPercent,lowerMiddle:f.nearestRankReductionPercent,pairWins:f.pairs.filter(p=>p.candidateFaster).length,cpu:f.metrics.candidate.cpuMs.conventionalMedian/or(f)})),sourceMismatches:r.sources.filter(s=>!s.matches).map(s=>s.path)})),evidence}));
function or(f){return f.metrics.oracle.cpuMs.conventionalMedian;}

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { Chess } from 'chess.js';
import { SparseTrainer as Production } from '../../../.codebase/src/supervised-baselines/trainer.mjs';
import { SparseTrainer as Oracle, random } from '../move-latency-wasm-2026-10-10/oracle-trainer.mjs';
import { SparseAccumulator } from '../../../.codebase/src/runtime/sparse-accumulator.mjs';
import { saveCheckpoint, loadCheckpoint } from '../../../.codebase/src/runtime/storage.mjs';
import { adamStep } from '../../../.codebase/src/supervised-baselines/adam.mjs';
import { Gamma4Memory } from '../../../.codebase/src/neural-learning/mushroom-body.mjs';
import { chooseFlyMove } from '../../../.codebase/src/evaluation-and-performance/fly-policy.mjs';
const out = new URL('.',import.meta.url), checks=[];
const graph = () => ({row:Int32Array.of(0,2,2,4),col:Int32Array.of(0,2,0,2),sign:Int8Array.of(1,-1,1,-1),
  initial:Float32Array.of(2,1,1,2),input:Int32Array.of(0),output:Int32Array.of(0,2)});
const equal = (a,b) => {
  for(const key of ['h','activity','drive','alpha','prediction','params','grads','signedMagnitude','dh','previousDh','driveGrad','preAdjoint','count']) assert.deepEqual(a[key],b[key],key);
};
let cases=0;
for(const precision of ['float32','float64']) for(const steps of [1,2,8]) for(const seed of [2,53,201]) {
  const cfg={precision,steps,seed,inputDim:3,outputs:2},a=new Oracle(graph(),cfg),b=new Production(graph(),cfg),rng=random(seed);
  a.recordBoundaryAdjoints();b.recordBoundaryAdjoints();
  for(const initial of [null,Float64Array.of(1e-20,2,9.9)]) {
    const x=[rng(),0,-rng()],stim=[{index:0,current:3},{index:2,current:-.2}];
    assert.deepEqual(b.forward(x,stim,initial),a.forward(x,stim,initial));equal(a,b);
    a.backward([.2,-.6]);b.backward([.2,-.6]);equal(a,b);
    assert.deepEqual(a.step(),b.step());equal(a,b);
    a.forward(x);b.forward(x);a.backward([.4,.1]);b.backward([.4,.1]);
    assert.deepEqual(adamStep(a),adamStep(b));equal(a,b);
    a.forward(x);b.forward(x);equal(a,b);cases++;
  }
  const mapping={edges:[0]},ma=new Gamma4Memory(a,mapping),mb=new Gamma4Memory(b,mapping);
  ma.pair([.2],.3);mb.pair([.2],.3);ma.advance(.5);mb.advance(.5);ma.pair([.4],.1);mb.pair([.4],.1);
  const sa=ma.snapshot(),sb=mb.snapshot();assert.deepEqual(sa,sb);
  ma.pair([.6],.5);mb.pair([.6],.5);ma.restore(sa);mb.restore(sb);
  a.forward([.1,0,0]);b.forward([.1,0,0]);equal(a,b);
}
checks.push({name:'actual-production numerical, gradients, SGD, Adam, local-memory restore',cases,passed:true,scope:'constructed 3-neuron signed graph, both precisions, null/nonzero state; synthetic mapping is not biological evidence'});
const stale=[];
for(const [name,Type] of [['production',Production],['archived-oracle',Oracle]]) {
  const cfg={steps:8,inputDim:3,outputs:2,seed:53},donor=new Type(graph(),cfg),loaded=new Type(graph(),cfg);
  for(let i=0;i<donor.params.magnitude.length;i++) donor.setMagnitude(i,.05+.03*i);
  const checkpoint=new URL(`checkpoint-${name}`,out).pathname;
  // URL pathname starts with slash before the Windows drive; use fileURLToPath.
  const path=(await import('node:url')).fileURLToPath(new URL(`checkpoint-${name}`,out));
  saveCheckpoint(donor,path,{scope:'synthetic-audit'});loadCheckpoint(loaded,path);
  assert.deepEqual(loaded.params,donor.params);
  const expected=[...donor.forward([1,0,0])],actual=[...loaded.forward([1,0,0])];
  assert.notDeepEqual(actual,expected);
  const oldSigned=[...loaded.signedMagnitude],persisted=[...loaded.params.magnitude];
  // Synchronize only the disposable audit object to diagnose, never patch source.
  loaded.refreshSignedMagnitude();const refreshed=[...loaded.forward([1,0,0])];assert.deepEqual(refreshed,expected);
  stale.push({name,actual,expected,refreshed,oldSigned,persisted,reproduced:true});
}
checks.push({name:'checkpoint stale-derived-weight defect',stale});
for(const Type of [Float32Array,Float64Array]) {
  const g={row:Int32Array.of(0,0,3,4),col:Int32Array.of(0,1,2,2)},acc=new SparseAccumulator(g,Type);
  const large=Type===Float32Array?2**30:1e16;
  const w=Type.of(large,1,-large,.25),d=Type.of(-0,.5,-2),p=Type.of(1,1,1);
  for(let repeat=0;repeat<4;repeat++) {
    acc.prepare(w,d);const actual=[...acc.accumulate(p)];
    const expected=Array.from(d,(z,j)=>{for(let k=g.row[j];k<g.row[j+1];k++)z+=w[k]*p[g.col[k]];return z;});
    assert.deepEqual(actual,expected);w[1]+=.25;g.col[3]=repeat%2;p[1]-=.125;
  }
  assert.throws(()=>acc.memory.grow(1),RangeError);
  for(const invalid of [-1,3,2147483647]) {g.col[0]=invalid;acc.prepare(w,d);assert.throws(()=>acc.accumulate(p));}
  g.col[0]=0;
  for(const invalid of [-1,5]) {g.row[1]=invalid;acc.prepare(w,d);assert.throws(()=>acc.accumulate(p));}
}
checks.push({name:'serial cancellation/signed-zero/refreshed graph/state/fixed memory/logical bounds',passed:true});
const game=new Chess(),before=game.pgn(),fen=game.fen();
await assert.rejects(()=>chooseFlyMove({forward:()=>{throw Error('probe failure');}},game),/probe failure/);
assert.equal(game.fen(),fen);assert.equal(game.pgn(),before);
await assert.rejects(()=>chooseFlyMove({forward:()=>[NaN]},game),/Nonfinite/);assert.equal(game.fen(),fen);
for(const moves of [[],['e4'],['Nf3','Nf6','Ng1','Ng8']]) {
  const board=new Chess();for(const m of moves)board.move(m);
  const oldFen=board.fen(),oldPgn=board.pgn(),legal=board.moves({verbose:true});let i=0;
  const choice=await chooseFlyMove({forward:()=>[i++,0]},board);
  assert.equal(choice.from+choice.to+(choice.promotion??''),(board.turn()==='w'?legal.at(-1):legal[0]).lan);
  assert.equal(board.fen(),oldFen);assert.equal(board.pgn(),oldPgn);
  const tie=await chooseFlyMove({forward:()=>[0,0]},board);assert.equal(tie.from+tie.to+(tie.promotion??''),legal[0].lan);
}
checks.push({name:'real policy both-colour perspective, tie order, history, thrown/nonfinite failure restoration',passed:true});
let generated;
const source=readFileSync('.codebase/src/runtime/sparse-accumulator.mjs','utf8');
class CaptureModule {constructor(bytes){generated=Uint8Array.from(bytes);return new WebAssembly.Module(bytes);}}
vm.runInNewContext(source.replace('export class SparseAccumulator','class SparseAccumulator'),{TextEncoder,WebAssembly:{Module:CaptureModule}});
assert.ok(WebAssembly.validate(generated));
writeFileSync(new URL('generated-accumulator.wasm',out),generated,{flag:'wx'});
const module=new WebAssembly.Module(generated);
checks.push({name:'actual generated binary captured from production generator',bytes:generated.length,
  sha256:createHash('sha256').update(generated).digest('hex'),imports:WebAssembly.Module.imports(module),exports:WebAssembly.Module.exports(module),valid:true});
writeFileSync(new URL('production-probes.json',out),JSON.stringify({timestamp:new Date().toISOString(),checks},null,2),{flag:'wx'});
console.log(JSON.stringify({checks:checks.map(c=>({name:c.name,passed:c.passed,cases:c.cases,stale:c.stale}))}));

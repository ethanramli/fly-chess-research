import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Chess } from 'chess.js';
import { SparseTrainer as Production } from '../../../.codebase/src/supervised-baselines/trainer.mjs';
import { SparseTrainer as Oracle } from '../move-latency-wasm-2026-10-10/oracle-trainer.mjs';
import { encodeFen } from '../../../.codebase/src/supervised-baselines/positions.mjs';
import { loadGraph } from '../../../.codebase/src/runtime/graph.mjs';
import { graphHash, sha256 } from '../../../.codebase/scripts/runtime/fetch-graph.mjs';
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
assert.ok(process.argv.includes('--cpu-duty') && process.argv.at(-1)==='0.5');
const out=new URL('.',import.meta.url),begin=performance.now(),cpu=process.cpuUsage();
const guard=()=>{assert.ok(process.memoryUsage().rss<=768*2**20);assert.ok(os.freemem()>=256*2**20);};
const digest=arrays=>{const h=createHash('sha256');for(const a of arrays)h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));return h.digest('hex');};
guard();assert.equal(await sha256('.cache/full.npz'),graphHash);
const graph=loadGraph('.cache/full.npz'),prior=JSON.parse(readFileSync('runs/move-latency-wasm-v1/report.json'));
const cfg={...prior.protocol.model,seed:prior.protocol.seed},a=new Oracle(graph,cfg),b=new Production(graph,cfg);
guard();
const fixed=m=>digest([...Object.values(graph),...Object.values(m.params),m.signedMagnitude]);
const original=fixed(a);assert.equal(fixed(b),original);assert.equal(original,prior.parametersAndGraphSHA256);
let count=0;
for(const f of prior.protocol.fixtures){
  const board=f.fen?new Chess(f.fen):new Chess();for(const m of f.moves??[])board.move(m);
  const fen=board.fen(),pgn=board.pgn();
  for(const move of board.moves({verbose:true})){
    guard();const t=performance.now();board.move(move);
    try{
      const x=encodeFen(board.fen()),expected=[...a.forward(x)],actual=[...b.forward(x)];
      assert.deepEqual(actual,expected);
      for(const k of ['h','activity'])for(let i=0;i<a[k].length;i++)assert.deepEqual(b[k][i],a[k][i],`${f.id}/${move.lan}/${k}/${i}`);
      for(const k of ['drive','alpha','prediction'])assert.deepEqual(b[k],a[k]);
      const stateHash=digest([...b.h,...b.activity,b.drive,b.alpha]);
      const old=prior.equivalence.find(e=>e.fixture===f.id&&e.move===move.lan);
      assert.equal(stateHash,old.activitySHA256);assert.deepEqual(actual,old.prediction);
      appendFileSync(new URL('full-graph-successors.jsonl',out),JSON.stringify({fixture:f.id,move:move.lan,stateHash,prediction:actual})+'\n');
      count++;
    }finally{board.undo();}
    await new Promise(r=>setTimeout(r,Math.max(1,performance.now()-t)));guard();
  }
  assert.equal(board.fen(),fen);assert.equal(board.pgn(),pgn);assert.equal(fixed(a),original);assert.equal(fixed(b),original);
  console.log(JSON.stringify({fixture:f.id,successorsVerified:count}));
}
assert.equal(count,92);
const usage=process.cpuUsage(cpu);
const report={timestamp:new Date().toISOString(),passed:true,count,graphSHA256:graphHash,parametersAndGraphSHA256:original,
  precision:b.config.precision,steps:b.steps,neurons:b.n,edges:graph.col.length,scope:'Independently rerun all 92 frozen successors, actual production versus archived JS oracle, exact complete trajectory buffers and recorded hashes; no timing comparison or learning',
  resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,freeMiBAtEnd:os.freemem()/2**20,elapsedSeconds:(performance.now()-begin)/1000,cpuSeconds:(usage.user+usage.system)/1e6,cpuDuty:.5},
  command:{executable:process.execPath,execArgv:process.execArgv,argv:process.argv,node:process.version}};
writeFileSync(new URL('full-graph-replay.json',out),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import os from 'node:os';
import {Chess} from 'chess.js';
import {loadGraph} from '../../../.codebase/src/runtime/graph.mjs';
import {SparseTrainer} from '../../../.codebase/src/supervised-baselines/trainer.mjs';
import {createEyesV1,loadRetina} from '../../../.codebase/src/chess-input/eyes-v1.mjs';
import {neuronReaderCells} from '../../../.codebase/src/neural-learning/neuron-reader.mjs';
import {recordEyesCandidates} from '../../../.codebase/src/puzzle-learning/record-neuron-candidates.mjs';
const out=process.argv[2];assert(out&&!existsSync(out));mkdirSync(out,{recursive:true});
const start=performance.now(),wait=new Int32Array(new SharedArrayBuffer(4));
const guard=()=>{assert(process.memoryUsage().rss<=2048*2**20&&os.freemem()>=256*2**20&&performance.now()-start<120000);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const paths=['.cache/full.npz','.codebase/src/chess-input/eyes-v1.mjs','.codebase/src/puzzle-learning/record-neuron-candidates.mjs','.codebase/src/neural-learning/neuron-reader.mjs','.codebase/src/supervised-baselines/trainer.mjs'];
const pins=Object.fromEntries(paths.map(p=>[p,sha(readFileSync(p))]));
const model=new SparseTrainer(loadGraph('.cache/full.npz'),{steps:8,inputDim:1,outputs:1,seed:47});
const eyes=createEyesV1(loadRetina('.cache/full.npz')),board=new Chess();
board.move('Nf3');board.move('Nf6');
const memoryIdentity=sha('explicit-no-attached-memory-v1'),memory={identity:memoryIdentity,attached:false};
const manifest={roster:neuronReaderCells,config:{...model.config},memoryIdentity};
const before={fen:board.fen(),pgn:board.pgn()},rows=[];
for(const moves of [['e2e4','d2d4'],['d2d4','e2e4']]) {
 model.h[0].fill(7);
 const set=[];
 for await(const r of recordEyesCandidates({board,moves,eyes,model,manifest,persistentState:()=>memory,guard,pace:async ms=>Atomics.wait(wait,0,0,ms)}))set.push(r);
 assert.equal(set.length,3);rows.push(set);
}
for(const r of rows[0].slice(0,2)) {
 const other=rows[1].find(x=>x.action===r.action);assert.deepEqual(r.observation,other.observation);assert.equal(r.setIdentity,other.setIdentity);
}
const copy=JSON.stringify(rows);model.h[8].fill(0);assert.equal(JSON.stringify(rows),copy);
assert.deepEqual({fen:board.fen(),pgn:board.pgn()},before);assert.deepEqual(memory,{identity:memoryIdentity,attached:false});
for(const [p,h] of Object.entries(pins))assert.equal(sha(readFileSync(p)),h);
guard();
writeFileSync(out+'/result.json',JSON.stringify({status:'pass',scope:'full released graph software contract; no task decoding or memory compatibility claim',pins,config:model.config,eyes:eyes.identity,rows,wallSeconds:(performance.now()-start)/1000,maxRssMiB:process.resourceUsage().maxRSS/1024},null,2));
console.log(JSON.stringify({status:'pass',candidates:4,wallSeconds:(performance.now()-start)/1000}));

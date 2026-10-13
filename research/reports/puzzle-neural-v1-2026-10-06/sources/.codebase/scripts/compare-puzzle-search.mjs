// Fixed-budget search comparison from saved frozen root readouts. Depth one
// only: there is no policy cache for future positions and no teacher access.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {searchPuzzle} from '../src/lowram/experimental-puzzle-search.mjs';
import {uci} from '../src/lowram/puzzle-search.mjs';
const{values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'}}});
if(!args.run||!args.out||existsSync(args.out))throw Error('Require completed run and new output');
const r=JSON.parse(readFileSync(join(args.run,'report.json')));assert.equal(r.complete,true);assert.equal(r.protocol.search.maxDepth,1);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
assert.equal(hash('.codebase/src/lowram/experimental-puzzle-search.mjs'),r.identity.sources['.codebase/src/lowram/experimental-puzzle-search.mjs']);
const rows=[];
for(const a of r.results){const b=new Chess(r.identity.puzzle.fen),probes={};
  for(const phase of['before','after']){
    const scores=new Map(a[phase].rows.map(v=>[v.move,v.score]));
    const evaluator={evaluate:async(board,moves)=>{assert.equal(board.fen(),b.fen());assert.equal(board.pgn(),b.pgn());const values=moves.map(m=>scores.get(uci(m))),top=Math.max(...values),weights=values.map(v=>Math.exp(r.protocol.priorScale*(v-top))),total=weights.reduce((x,y)=>x+y,0);return{priors:weights.map(v=>v/total),value:0};}};
    const s=await searchPuzzle(evaluator,b,r.protocol.search);
    // Compare the persisted scientific representation, not chess.js Move
    // prototypes or undefined fields omitted by JSON checkpoint serialization.
    if(phase==='before')for(const key of['candidates','evaluations','simulations','nodes','terminalLeaves','unknownCutoffs'])assert.deepEqual(JSON.parse(JSON.stringify(s[key])),a.calculation[key]);
    probes[phase]={move:uci(s.move),candidates:s.candidates,evaluations:s.evaluations,simulations:s.simulations,nodes:s.nodes,terminalLeaves:s.terminalLeaves,unknownCutoffs:s.unknownCutoffs,stoppedBy:s.stoppedBy};
  }
  rows.push({condition:a.condition,probes});
}
const result={reportSha256:hash(join(args.run,'report.json')),sourceSha256:hash('.codebase/scripts/compare-puzzle-search.mjs'),rows,scope:'Same frozen root readouts and identical depth-one search bounds, no new neural presentations or teacher labels. Not a deep-search or transfer benchmark.'};
writeFileSync(args.out,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(rows.map(v=>({condition:v.condition,before:v.probes.before.move,after:v.probes.after.move}))));

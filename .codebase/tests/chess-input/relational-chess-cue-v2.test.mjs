import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createRelationalChessCueEncoder} from '../../src/chess-input/relational-chess-cue-v2.mjs';
import {createChessCueEncoder} from '../../src/chess-input/chess-cue.mjs';
const mapping={readyForCandidateExperiment:true,groups:[{kc:Array.from({length:693},(_,i)=>i+100)}]};
test('V2 canonicalizes actor-relative castling rights under colour/rank exchange',()=>{
  const e=createRelationalChessCueEncoder(mapping),white=new Chess(),black=new Chess(white.fen().replace(' w ',' b '));
  const a=e.encode(white,'e2e4'),b=e.encode(black,'e7e5');assert.deepEqual(a.tokens,b.tokens);assert.deepEqual(a.stimulation,b.stimulation);assert.ok(a.tokens.includes('castle:KQkq'));
  const wa=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w Kq - 0 1'),ba=new Chess('r3k2r/8/8/8/8/8/8/R3K2R b Qk - 0 1');
  assert.deepEqual(e.encode(wa,'e1f1').tokens,e.encode(ba,'e8f8').tokens);
});
test('fixed cell cap matches physical cue count/amplitude for both encoders on every training legal move',()=>{
  const b=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),config={seed:14009,maxCells:14,totalCurrent:21,maxCellCurrent:1.5};
  for(const e of [createChessCueEncoder(mapping,config),createRelationalChessCueEncoder(mapping,config)])for(const m of b.moves({verbose:true})){
    const c=e.encode(b,m);assert.equal(c.stimulation.length,14);assert.ok(c.stimulation.every(v=>v.current===1.5));assert.equal(c.accounting.totalCurrent,21);
  }
});

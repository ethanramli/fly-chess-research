import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createRelationalChessCueEncoder} from '../../src/chess-input/relational-chess-cue.mjs';
const mapping={readyForCandidateExperiment:true,groups:[{kc:Array.from({length:693},(_,i)=>i+100)}]},encoder=createRelationalChessCueEncoder(mapping);
test('relative input preserves a file-reflected mating net and colour/rank exchange without outcome labels',()=>{
  const a=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),b=new Chess('k7/2Q5/1K6/8/8/8/8/8 w - - 0 1'),c=new Chess('8/8/8/8/8/6k1/5q2/7K b - - 0 1');
  const original=encoder.encode(a,'f7g7');
  for(const cue of [encoder.encode(b,'c7b7'),encoder.encode(c,'f2g2')]){assert.deepEqual(cue.tokens,original.tokens);assert.deepEqual(cue.stimulation,original.stimulation);}
  assert.equal(a.history().length,0);assert.equal(a.fen(),'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
});
test('counterfactual king geometry and different candidates remain visible under the invariances',()=>{
  const a=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),b=new Chess('7k/5Q2/4K3/8/8/8/8/8 w - - 0 1');
  const good=encoder.encode(a,'f7g7');
  assert.notDeepEqual(good.tokens,encoder.encode(b,'f7g7').tokens);assert.notDeepEqual(good.stimulation,encoder.encode(b,'f7g7').stimulation);
  assert.notDeepEqual(good.stimulation,encoder.encode(a,'f7d7').stimulation);
  assert.ok(!good.tokens.some(v=>v.includes('f7')||v.includes('g7')||v.includes('answer')||v.includes('reward')));
  a.move('Qg7#');b.move('Qg7+');assert.equal(a.isCheckmate(),true);assert.equal(b.isCheckmate(),false);
});
test('relational encoding preserves draw context, special moves, bounds and teacher isolation',()=>{
  const b=new Chess();for(const m of ['Nf3','Nf6','Ng1','Ng8'])b.move(m);
  const cue=encoder.encode(b,'e2e4');assert.equal(cue.repetitions,2);assert.notDeepEqual(cue.tokens,encoder.encode(new Chess(b.fen()),'e2e4').tokens);
  assert.ok(cue.tokens.includes('castle:KQkq'));
  const ep=encoder.encode(new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'),'e5d6');assert.ok(ep.tokens.includes('capture:p'));assert.ok(ep.tokens.includes('ep-from-target:0,0'));
  const promo=encoder.encode(new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1'),'a7a8n');assert.ok(promo.tokens.some(v=>v.startsWith('action:p:')&&v.endsWith(':n')));
  for(const extra of [{answer:'e2e4'},{reward:1},{id:'test'},{score:3}])assert.throws(()=>encoder.encode(b,'e2e4',{objective:'forced-mate',plies:1,...extra}),/teacher labels/);
  assert.throws(()=>encoder.encode(b,'e2e5'),/legal action/);assert.throws(()=>createRelationalChessCueEncoder(mapping,{maxHistoryPlies:1}).encode(b,'e2e4'),/history exceeds/);
  assert.ok(cue.stimulation.length<=64);assert.ok(cue.stimulation.every(v=>encoder.pool.includes(v.index)&&v.current<=1.5));assert.ok(cue.accounting.totalCurrent<=24+1e-12);
});

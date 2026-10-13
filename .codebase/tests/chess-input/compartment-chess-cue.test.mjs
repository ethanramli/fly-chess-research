import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v2.mjs';
const mapping={readyForCandidateExperiment:true,groups:[
  {danType:'PAM02',kc:Array.from({length:84},(_,i)=>100+i)},
  {danType:'PPL103',kc:Array.from({length:664},(_,i)=>150+i)}]};
const config={seed:14009,maxCells:14,totalCurrent:21,maxCellCurrent:1.5};

test('factorial inputs preserve exact original baseline and physical dose across every legal candidate',()=>{
  const board=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),original=createRelationalChessCueEncoder(mapping,config);
  const before=board.pgn();
  for(const conjoin of [false,true]) for(const stratify of [false,true]) {
    const encoder=createCompartmentChessCueEncoder(mapping,{...config,conjoin,stratify});
    for(const move of board.moves({verbose:true})) {
      const cue=encoder.encode(board,move);
      assert.equal(cue.stimulation.length,14); assert.equal(new Set(cue.stimulation.map(c=>c.index)).size,14);
      assert.ok(cue.stimulation.every(c=>c.current===1.5)); assert.equal(cue.accounting.totalCurrent,21);
      if(!conjoin&&!stratify) assert.deepEqual(cue.stimulation,original.encode(board,move).stimulation);
      if(stratify) for(const type of ['PAM02','PPL103']) assert.ok(cue.projection.coverage[type]>=7);
    }
  }
  assert.equal(board.pgn(),before);
});

test('candidate conjunctions retain relational symmetries and counterfactual context without teacher labels',()=>{
  const encoder=createCompartmentChessCueEncoder(mapping,{...config,conjoin:true,stratify:true});
  const a=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const b=new Chess('k7/2Q5/1K6/8/8/8/8/8 w - - 0 1');
  const c=new Chess('7k/5Q2/4K3/8/8/8/8/8 w - - 0 1');
  assert.deepEqual(encoder.encode(a,'f7g7').stimulation,encoder.encode(b,'c7b7').stimulation);
  assert.notDeepEqual(encoder.encode(a,'f7g7').tokens,encoder.encode(c,'f7g7').tokens);
  assert.notDeepEqual(encoder.encode(a,'f7g7').tokens,encoder.encode(a,'f7d7').tokens);
  assert.ok(encoder.encode(a,'f7g7').tokens.every(t=>t.startsWith('joint:')));
  assert.throws(()=>encoder.encode(a,'f7g7',{objective:'forced-mate',plies:1,answer:'f7g7'}),/teacher labels/);
  assert.throws(()=>encoder.encode(a,'f7g5'),/legal action/);
  assert.throws(()=>createCompartmentChessCueEncoder(mapping,{...config,maxCells:15}));
  assert.throws(()=>createCompartmentChessCueEncoder({...mapping,groups:[]},{...config,stratify:true}));
});

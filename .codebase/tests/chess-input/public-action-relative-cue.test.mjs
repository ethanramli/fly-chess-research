import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createPublicActionRelativeEncoder} from '../../src/chess-input/public-action-relative-cue.mjs';

const mapping={readyForCandidateExperiment:true,groups:[
  {mbonType:'MBON01',kc:Array.from({length:40},(_,i)=>i)},
  {mbonType:'MBON12',kc:Array.from({length:400},(_,i)=>100+i)}]};
const task={objective:'capture-retention',plies:1};
const frame=(board,action)=>({schema:'public-lesson-frame-v1',fen:board.fen(),pgn:board.pgn(),action,task});
const jaccard=(a,b)=>{const A=new Set(a),B=new Set(b);const i=[...A].filter(x=>B.has(x)).length;return i/(A.size+B.size-i);};
const cells=cue=>cue.stimulation.map(row=>row.index);

test('moves on one board receive mostly distinct cells in both plastic compartments',()=>{
  const encoder=createPublicActionRelativeEncoder(mapping,{seed:7});
  const board=new Chess('8/5R2/4Kb2/8/7Q/8/5q2/4k3 w - - 0 1');
  const capture=encoder.encode(frame(board,'f7f6')),quiet=encoder.encode(frame(board,'h4h2'));
  assert(jaccard(cells(capture),cells(quiet))<0.5);
  for(const cue of [capture,quiet]){
    assert(cue.stimulation.some(row=>row.index<40)&&cue.stimulation.some(row=>row.index>=100),'both compartments');
    assert(cue.stimulation.every(row=>row.current<=1.5));
  }
  assert(capture.tokens.includes('act:captures:b')&&quiet.tokens.includes('act:captures:none'));
});

test('the same local relation on another board reuses the same tokens',()=>{
  const encoder=createPublicActionRelativeEncoder(mapping,{seed:7});
  const one=encoder.encode(frame(new Chess('7k/8/8/3r4/8/8/3R4/K7 w - - 0 1'),'d2d5'));
  const two=encoder.encode(frame(new Chess('k7/8/8/8/5r2/8/8/5R1K w - - 0 1'),'f1f4'));
  assert(one.tokens.includes('act:captures:r')&&two.tokens.includes('act:captures:r'));
  assert(one.tokens.includes('act:vector:r:0,3')&&two.tokens.includes('act:vector:r:0,3'));
});

test('position cues anchor on the last public move and reject labels or illegal actions',()=>{
  const encoder=createPublicActionRelativeEncoder(mapping,{seed:7});
  const board=new Chess('7k/8/8/3r4/8/8/3R4/K7 w - - 0 1');board.move('Rxd5');
  const state=encoder.encode(frame(board,null));
  assert(state.tokens.includes('state:anchor:last-move')&&state.tokens.every(token=>!token.startsWith('act:')));
  assert.throws(()=>encoder.encode({...frame(board,null),label:'success'}),/no teacher labels/);
  assert.throws(()=>encoder.encode(frame(new Chess(),'e2e5')),/Illegal/);
  assert.throws(()=>encoder.encode({...frame(new Chess(),'e2e4'),task:{objective:'forced-mate',plies:1}}),/no teacher labels/);
  assert.notEqual(createPublicActionRelativeEncoder(mapping,{seed:8}).identity,encoder.identity);
});

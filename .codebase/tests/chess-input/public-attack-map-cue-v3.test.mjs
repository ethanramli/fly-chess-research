import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createPublicAttackMapEncoderV2} from '../../src/chess-input/public-attack-map-cue-v2.mjs';
import {createPublicAttackMapEncoderV3} from '../../src/chess-input/public-attack-map-cue-v3.mjs';

const range=(a,n)=>Array.from({length:n},(_,i)=>a+i);
const mapping={readyForCandidateExperiment:true,groups:['MBON01','MBON12','MBON07'].map((mbonType,i)=>({mbonType,kc:range(1000*i,1000)}))};
const task={objective:'capture-retention',plies:1};
const encoder=createPublicAttackMapEncoderV3(mapping,{seed:20261029});
const v2=createPublicAttackMapEncoderV2(mapping,{seed:20261029});
const tokens=(fen,move)=>encoder.encode(new Chess(fen),move,task).tokens;
const isExtra=t=>/^(chk|ekz|okz):/.test(t);
const zone=(fen,move)=>tokens(fen,move).filter(t=>/^(ekz|okz):/.test(t)).sort();

// Hand-made positions (mover's view, after the candidate move):
// A 'k7/8/8/8/8/8/8/R3K3 w': Ra1-b1 is quiet and gives no check; black king a8 is a corner king.
// B 'k7/8/8/3r4/8/8/5P2/6K1 b': Rd5-d2 is quiet and gives no check; white king g1 has a pawn on f2.
const A='k7/8/8/8/8/8/8/R3K3 w - - 0 1', B='k7/8/8/3r4/8/8/5P2/6K1 b - - 0 1';
const FENS=[new Chess().fen(), A, B, 'k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1', '8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1',
  'r3k2r/pppq1ppp/2npbn2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1'];

test('folding back the v3 tokens (removing chk:, ekz:, okz:) gives exactly the v2 tokens', () => {
  for(const [fen,move] of [
    ['k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1','g5f4'],      // capture
    ['k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1','a8b8'],      // quiet
    ['8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1','h4g5'],        // pin case
    ['8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1','g7f7'],        // pin case, king capture-free move
    ['8/5R2/4Kb2/8/7Q/8/5q2/4k3 w - - 0 1','f7f6'],      // pin case
    [B,'d5d2'],[A,'a1b1']]){
    const board=new Chess(fen);
    const folded=encoder.encode(board,move,task).tokens.filter(t=>!isExtra(t));
    assert.deepEqual(folded,v2.encode(board,move,task).tokens,`${fen} ${move}`);
  }
});

test('the v2 part of the stimulation equals v2 exactly (index and current) for many legal moves', () => {
  let n=0;
  for(const fen of FENS){
    const board=new Chess(fen);
    for(const m of board.moves({verbose:true})){
      const move=m.from+m.to+(m.promotion??'');
      const cue=encoder.encode(board,move,task), v2cue=v2.encode(board,move,task);
      const k=v2cue.stimulation.length;
      assert.deepEqual(cue.stimulation.slice(0,k),v2cue.stimulation,`${fen} ${move}`);
      assert.deepEqual(cue.stimulation.slice(0,k).map(s=>s.index).sort((a,b)=>a-b),v2cue.stimulation.map(s=>s.index));
      n++;
    }
  }
  assert(n>=20);
});

test('extraMaxCells 0 gives stimulation deep-equal to v2', () => {
  const none=createPublicAttackMapEncoderV3(mapping,{seed:20261029,extraMaxCells:0});
  for(const [fen,move] of [[A,'a1a7'],[A,'a1b1'],[B,'d5d2']]){
    const cue=none.encode(new Chess(fen),move,task), v2cue=v2.encode(new Chess(fen),move,task);
    assert.deepEqual(cue.stimulation,v2cue.stimulation,`${fen} ${move}`);
    assert.equal(cue.accounting.extra.cells,0);
  }
});

test('extra cells never overlap v2 cells; total and extra budgets hold', () => {
  let sawExtra=false;
  for(const fen of FENS){
    const board=new Chess(fen);
    for(const m of board.moves({verbose:true})){
      const move=m.from+m.to+(m.promotion??'');
      const cue=encoder.encode(board,move,task);
      const k=v2.encode(board,move,task).stimulation.length;
      const v2Cells=new Set(cue.stimulation.slice(0,k).map(s=>s.index));
      const extra=cue.stimulation.slice(k);
      sawExtra||=extra.length>0;
      assert(extra.every(s=>!v2Cells.has(s.index)),`${fen} ${move}`);
      assert.equal(new Set(extra.map(s=>s.index)).size,extra.length);
      assert(cue.stimulation.length<=128+64);
      assert(extra.length<=64);
      assert(extra.every(s=>s.current>0&&s.current<=1.5));
      assert(extra.reduce((s,c)=>s+c.current,0)<=96+1e-9);
      assert.equal(cue.accounting.extra.cells,extra.length);
    }
  }
  assert(sawExtra);
  const cue=encoder.encode(new Chess(A),'a1a7',task);
  assert.equal(cue.assignments.filter(a=>a.token.startsWith('chk:')).length,3*8);
});

test('the check token is chk:yes for a checking move and chk:no for a quiet non-checking move', () => {
  assert(tokens(A,'a1a7').includes('chk:yes'));    // Ra7 checks Ka8 along the a-file
  assert(!tokens(A,'a1a7').includes('chk:no'));
  assert(tokens(A,'a1b1').includes('chk:no'));     // Rb1 does not check
  assert(!tokens(A,'a1b1').includes('chk:yes'));
  assert(tokens(B,'d5d2').includes('chk:no'));
});

test('enemy and own king-zone tokens on the corner black king and the white king', () => {
  // After Rb1 the enemy king on a8 has three on-board neighbours. In mover orientation (White, +dy = rank up):
  // a7 (0,-1) is safe and empty; b8 (1,0) and b7 (1,-1) are attacked by the rook on the b-file.
  assert.deepEqual(zone(A,'a1b1'),[
    'ekz:0,-1:safe:empty','ekz:1,-1:att:empty','ekz:1,0:att:empty',
    'okz:-1,0:safe:empty','okz:-1,1:safe:empty','okz:0,1:safe:empty','okz:1,0:safe:empty','okz:1,1:safe:empty'].sort());
  assert(zone(A,'a1b1').filter(t=>t.startsWith('ekz:')).length<8);
});

test('king-zone tokens use the mover orientation for a Black mover (dy negated)', () => {
  // After Rd2 the white king on g1 has five neighbours. f2 holds a white pawn that the rook attacks along rank 2.
  // Mover Black: +dy points toward rank 1, so f2 (board rank up) is (-1,-1), and g2 is (0,-1).
  assert.deepEqual(zone(B,'d5d2'),[
    'ekz:-1,-1:att:opp','ekz:-1,0:safe:empty','ekz:0,-1:safe:empty','ekz:1,-1:safe:empty','ekz:1,0:safe:empty',
    'okz:0,1:safe:empty','okz:1,0:safe:empty','okz:1,1:safe:empty'].sort());
});

test('king-zone cells use kingZoneCellsPerToken and the extra budget stays bounded', () => {
  const kzEncoder=createPublicAttackMapEncoderV3(mapping,{seed:20261029,kingZoneCellsPerToken:2});
  const cue=kzEncoder.encode(new Chess(B),'d5d2',task);
  const zoneCount=cue.tokens.filter(t=>/^(ekz|okz):/.test(t)).length;
  assert.equal(zoneCount,8);
  assert.equal(cue.assignments.filter(a=>/^(ekz|okz):/.test(a.token)).length,zoneCount*3*2);
  const full=encoder.encode(new Chess(B),'d5d2',task);
  assert.equal(full.assignments.filter(a=>/^(ekz|okz):/.test(a.token)).length,zoneCount*3*4);
  assert(full.stimulation.length<=128+64);
  assert.throws(()=>createPublicAttackMapEncoderV3(mapping,{kingZoneCellsPerToken:0}),/Invalid/);
  assert.throws(()=>createPublicAttackMapEncoderV3(mapping,{kingZoneCellsPerToken:9}),/Invalid/);
  assert.throws(()=>createPublicAttackMapEncoderV3(mapping,{extraMaxCells:65}),/Invalid/);
  assert.throws(()=>createPublicAttackMapEncoderV3(mapping,{extraMaxCells:-1}),/Invalid/);
  assert.throws(()=>createPublicAttackMapEncoderV3(mapping,{extraTotalCurrent:97}),/Invalid/);
  assert.throws(()=>createPublicAttackMapEncoderV3(mapping,{chkCellsPerToken:0}),/Invalid/);
});

test('policy: no token states a mate or escape verdict or counts safe squares', () => {
  for(const [fen,move] of [[A,'a1a7'],[A,'a1b1'],[B,'d5d2'],['k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1','g5f4']]){
    for(const t of tokens(fen,move)){
      assert(!/mate|escape/i.test(t),t);
      assert(!/\d+\s*safe|safe\s*\d+|count/i.test(t),t);
      if(/^(ekz|okz):/.test(t)) assert.match(t,/^(ekz|okz):-?\d,-?\d:(att|safe):(own|opp|empty)$/,t);
      if(t.startsWith('chk:')) assert.match(t,/^chk:(yes|no)$/,t);
    }
  }
});

test('budget: v2 part keeps v2 currents, extra part keeps its own currents, both within bounds', () => {
  const cue=encoder.encode(new Chess(B),'d5d2',task);
  const k=v2.encode(new Chess(B),'d5d2',task).stimulation.length;
  const v2Part=cue.stimulation.slice(0,k), extra=cue.stimulation.slice(k);
  assert(k<=128);
  assert(v2Part.every(s=>s.current<=1.5&&s.current>0));
  assert(v2Part.reduce((s,c)=>s+c.current,0)<=192+1e-9);
  assert(extra.every(s=>s.current<=1.5&&s.current>0));
  assert(extra.reduce((s,c)=>s+c.current,0)<=96+1e-9);
  const capped=createPublicAttackMapEncoderV3(mapping,{seed:20261029,maxCells:32,totalCurrent:24,extraMaxCells:0})
    .encode(new Chess(B),'d5d2',task);
  assert.equal(capped.stimulation.length,32);
  assert(capped.stimulation.every(s=>Math.abs(s.current-0.75)<1e-12));
  const small=createPublicAttackMapEncoderV3(mapping,{seed:20261029,extraMaxCells:4,extraTotalCurrent:2})
    .encode(new Chess(B),'d5d2',task);
  assert.equal(small.stimulation.length-v2.encode(new Chess(B),'d5d2',task).stimulation.length,4);
  assert(small.stimulation.slice(-4).every(s=>Math.abs(s.current-0.5)<1e-12));
  assert.notEqual(encoder.identity,v2.identity);
});

test('the mover-perspective cue after a move equals the action cue', () => {
  const board=new Chess(B),child=new Chess();child.loadPgn(board.pgn());child.move({from:'d5',to:'d2'});
  const action=encoder.encode(board,'d5d2',task),value=encoder.encode(child,null,task);
  assert.equal(value.perspective,'mover');
  assert.deepEqual(value.tokens,action.tokens);
  assert.deepEqual(value.stimulation,action.stimulation);
});

test('frames with an unsupported objective or plies throw', () => {
  const board=new Chess(B);
  assert.throws(()=>encoder.encode(board,'d5d2',{objective:'avoid-loss',plies:3}),/accepted objectives/);
  assert.throws(()=>encoder.encode(board,'d5d2',{objective:'forced-mate',plies:3}),/accepted objectives/); // not in capture-retention family
  assert.throws(()=>encoder.encode(board,'d5d2',{objective:'capture-retention',plies:2}),/accepted objectives/);
  assert.throws(()=>encoder.encode(board,'d5d2',{objective:'capture-retention',plies:1,label:'success'}),/accepted objectives/);
  const king=createPublicAttackMapEncoderV3(mapping,{taskFamily:'king-safety'});
  assert.doesNotThrow(()=>king.encode(board,'d5d2',{objective:'forced-mate',plies:1}));
  assert.doesNotThrow(()=>king.encode(board,'d5d2',{objective:'forced-mate',plies:3}));
  assert.doesNotThrow(()=>king.encode(board,'d5d2',{objective:'avoid-mate',plies:3}));
  assert.throws(()=>king.encode(board,'d5d2',{objective:'avoid-mate',plies:1}),/accepted objectives/);
  assert.throws(()=>king.encode(board,'d5d2',task),/accepted objectives/);
  assert.throws(()=>createPublicAttackMapEncoderV3(mapping,{taskFamily:'mate'}),/Invalid/);
  assert.throws(()=>encoder.encode(board,'d5e4',task),/Illegal/);
  assert.throws(()=>createPublicAttackMapEncoderV3({...mapping,readyForCandidateExperiment:false}),/Invalid/);
});

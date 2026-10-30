import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createPublicActionRelativeEncoderV2} from '../../src/chess-input/public-action-relative-cue-v2.mjs';
import {createPublicActionRelativeEncoderV3} from '../../src/chess-input/public-action-relative-cue-v3.mjs';

const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json','utf8')).mapping;
const task={objective:'capture-retention',plies:1};
const v2=createPublicActionRelativeEncoderV2(mapping,{seed:20261101}),v3=createPublicActionRelativeEncoderV3(mapping,{seed:20261101});
const childOf=(fen,move)=>{const board=new Chess(fen),child=new Chess();child.loadPgn(board.pgn());
  child.move({from:move.slice(0,2),to:move.slice(2,4),...(move[4]?{promotion:move[4]}:{})});return {board,child};};

test('v3 action tokens are the v2 relative pieces and vector conjoined with the action tag', () => {
  const board=new Chess('r6k/8/p7/8/p7/8/R7/7K w - - 0 1'),a=v3.encode(board,'a2a4',task),b=v2.encode(board,'a2a4',task);
  const at=b.tokens.filter(t=>t.startsWith('act:at:')).map(t=>t.replace('act:at:','act:at:rxp:'));
  assert.deepEqual(a.tokens,['task:capture-retention:1','act:vec:rxp:0,2',...at].sort());
  assert.equal(a.perspective,'actor');assert.notEqual(a.tokens.length,0);
  assert.notEqual(v2.identity,v3.identity);
});

test('the same relative piece under different actions gives different tokens', () => {
  const board=new Chess('r6k/8/p7/8/p7/8/R7/7K w - - 0 1');
  const capture=v3.encode(board,'a2a4',task).tokens,quiet=v3.encode(board,'a2b2',task).tokens;
  const shared=capture.filter(t=>quiet.includes(t));
  assert.deepEqual(shared,['task:capture-retention:1']);
});

test('child cue after a move is the move cue from the mover side, minus the captured piece', () => {
  for(const [fen,move,captured] of [['r6k/8/p7/8/p7/8/R7/7K w - - 0 1','a2a4','rxp:opp:p'],
    ['r6k/8/p7/8/p7/8/R7/7K w - - 0 1','a2b2',null],['k7/7r/8/7P/8/7P/8/K6R b - - 0 1','h7h5','rxp:opp:p'],
    ['k7/7r/8/7P/8/7P/8/K6R b - - 0 1','h7g7',null]]){
    const {board,child}=childOf(fen,move),action=v3.encode(board,move,task),position=v3.encode(child,null,task);
    assert.equal(position.perspective,'mover');
    const expected=action.tokens.filter(token=>!(captured&&token===`act:at:${captured}:0,0`));
    assert.deepEqual(position.tokens,expected,`${fen} ${move}`);
  }
});

test('positions without public history keep the v2 own-king cue', () => {
  const board=new Chess('k7/7r/8/7P/8/7P/8/K6R b - - 0 1');
  const a=v2.encode(board,null,task),b=v3.encode(board,null,task);
  assert.equal(b.perspective,'side-to-move');assert.deepEqual(b.tokens,a.tokens);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createPublicActionRelativeEncoder} from '../../src/chess-input/public-action-relative-cue.mjs';
import {createPublicActionRelativeEncoderV2} from '../../src/chess-input/public-action-relative-cue-v2.mjs';

const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json','utf8')).mapping;
const task={objective:'capture-retention',plies:1};
const v1=createPublicActionRelativeEncoder(mapping,{seed:20261101}),v2=createPublicActionRelativeEncoderV2(mapping,{seed:20261101});
const childOf=(fen,move)=>{const board=new Chess(fen),child=new Chess();child.loadPgn(board.pgn());
  child.move({from:move.slice(0,2),to:move.slice(2,4),...(move[4]?{promotion:move[4]}:{})});return {board,child};};

test('v2 action cues are the v1 action cues', () => {
  for(const [fen,move] of [['r6k/8/p7/8/p7/8/R7/7K w - - 0 1','a2a4'],['k7/7r/8/7P/8/7P/8/K6R b - - 0 1','h7h5']]){
    const board=new Chess(fen),a=v1.encode(board,move,task),b=v2.encode(board,move,task);
    assert.deepEqual(b.tokens,a.tokens);assert.deepEqual(b.stimulation,a.stimulation);assert.equal(b.perspective,'actor');
  }
  assert.notEqual(v1.identity,v2.identity);
});

test('child cue after a move is the move cue from the mover side, minus the captured piece', () => {
  for(const [fen,move,captured] of [['r6k/8/p7/8/p7/8/R7/7K w - - 0 1','a2a4','opp:p'],
    ['r6k/8/p7/8/p7/8/R7/7K w - - 0 1','a2b2',null],['k7/7r/8/7P/8/7P/8/K6R b - - 0 1','h7h5','opp:p'],
    ['k7/7r/8/7P/8/7P/8/K6R b - - 0 1','h7g7',null]]){
    const {board,child}=childOf(fen,move),action=v2.encode(board,move,task),position=v2.encode(child,null,task);
    assert.equal(position.perspective,'mover');
    const expected=action.tokens.filter(token=>!(captured&&token===`act:at:${captured}:0,0`));
    assert.deepEqual(position.tokens,expected,`${fen} ${move}`);
    if(captured)assert.equal(action.tokens.length,position.tokens.length+1);
    // v1 used separate side-to-move state tokens that the move cue never drives.
    assert(v1.encode(child,null,task).tokens.every(token=>token.startsWith('state:')||token.startsWith('task:')));
  }
});

test('positions without public history keep the v1 own-king cue from the side to move', () => {
  const board=new Chess('k7/7r/8/7P/8/7P/8/K6R b - - 0 1');
  const a=v1.encode(board,null,task),b=v2.encode(board,null,task);
  assert.equal(b.perspective,'side-to-move');assert.deepEqual(b.tokens,a.tokens);assert.deepEqual(b.stimulation,a.stimulation);
});

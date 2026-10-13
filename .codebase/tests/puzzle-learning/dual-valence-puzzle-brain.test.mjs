import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';

function fixture() {
  // Eight-cell numerical fixture; root IDs are not fly anatomical claims.
  const graph = { row: Int32Array.from([0,0,0,0,0,0,0,2,4]), col: Int32Array.from([0,1,0,1]),
    sign: Int8Array.from([1,1,1,1]), initial: Float32Array.from([1,1,1,1]),
    input: Int32Array.from([0]), output: Int32Array.from([7]) };
  const mapping = { readyForCandidateExperiment: true, groups: ['left','right'].flatMap((side,i) => [
    { side, danType:'PAM02', kc:[i], edges:[2+i], dan:[{index:2+i*2,rootId:String(100+i*2)}] },
    { side, danType:'PPL103', kc:[i], edges:[i], dan:[{index:3+i*2,rootId:String(101+i*2)}] }]) };
  const model = new SparseTrainer(graph,{inputDim:1,outputs:1});
  const memory = new ReversalMemory(model,mapping); model.forward([0]);
  const rest = Float32Array.from(model.h[model.steps]);
  const brain = new DualValencePuzzleBrain({model,memory,mapping,rest,
    encoder:{encode:()=>({stimulation:[{index:0,current:1.5}]})},
    readouts:{MBON12:[{index:6}],MBON01:[{index:7}]} });
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'), task={objective:'forced-mate',plies:1};
  const experience = move => {
    const successor = new Chess(board.fen()); successor.move({from:move.slice(0,2),to:move.slice(2,4)});
    const proof=certifyMate(successor,'w',{plies:0});
    return {...verifiedExperience(board,move,task,proof),proof,context:{fen:board.fen(),pgn:board.pgn(),task}};
  };
  return {brain,memory,mapping,model,board,task,experience};
}

test('checked success/failure select opposite channels and causal memory survives restoration',async()=>{
  for(const [move,channel] of [['f7h7','PAM02'],['f7f6','PPL103']]) {
    const a=fixture(), invariant=fixedStateHash(a.model,a.memory.edges), before=a.memory.snapshot();
    const receipt=await a.brain.replay(a.experience(move));
    assert.equal(receipt.event.channel,channel); assert.equal(receipt.event.actor,'w');
    assert.deepEqual(receipt.presentation.reinforcementCells,a.brain.reinforcement.populations[channel]);
    assert.equal(receipt.learningApplied,true); assert.notDeepEqual(a.memory.snapshot(),before);
    assert.equal(fixedStateHash(a.model,a.memory.edges),invariant);
    const b=fixture(); b.memory.restore(a.memory.snapshot());
    assert.deepEqual(await a.brain.replay(a.experience(move)),await b.brain.replay(b.experience(move)));
  }
});

test('unknown and forged consequences fail before stimulation; controls freeze or omit explicitly',async()=>{
  const a=fixture(), before=a.memory.snapshot();
  const unknown={status:'unknown',learningAllowed:false,experimentalPulse:null};
  assert.equal((await a.brain.replay(unknown)).skipped,true);
  await assert.rejects(a.brain.replay(unknown,{channel:'PAM02'}),/Unknown/);
  const forged=a.experience('f7h7'); forged.actor='b'; await assert.rejects(a.brain.replay(forged));
  assert.equal(a.brain.presentations,0); assert.deepEqual(a.memory.snapshot(),before);
  const disabled=await a.brain.replay(a.experience('f7h7'),{plasticityEnabled:false});
  assert.equal(disabled.event.channel,'PAM02'); assert.deepEqual(a.memory.snapshot(),before);
  const absent=await a.brain.replay(a.experience('f7h7'),{channel:null});
  assert.equal(absent.event.delivered,false); assert.equal(absent.presentation.stimulation.length,1);
  // No external channel is not a forced suppression of endogenous DAN activity.
  assert.equal(a.memory.events,1);
  const frozen=a.memory.snapshot(); await a.brain.assess(a.board,a.board.moves({verbose:true}),a.task);
  assert.deepEqual(a.memory.snapshot(),frozen);
});

test('capture-retention certificates enter the existing dual-valence adapter in the matching channel', async () => {
  for (const [fen, move, expected] of [
    ['6k1/8/8/8/p6r/1P6/8/RK6 w - - 0 1', 'a1a4', 'failure'],
    ['6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1', 'a1a4', 'success'],
  ]) {
    const fixtureState = fixture(), board = new Chess(fen), task = { objective: 'capture-retention', plies: 1 };
    const cueMapping = { ...fixtureState.mapping, readyForCandidateExperiment: true };
    fixtureState.brain.encoder = createRelationalChessCueEncoder(cueMapping, { maxCells: 2, totalCurrent: 3 });
    const proof = certifyCaptureRetention(board, move);
    const experience = { ...verifiedExperience(board, move, task, proof), proof,
      context: { fen: board.fen(), pgn: board.pgn(), task } };
    const receipt = await fixtureState.brain.replay(experience);
    assert.equal(receipt.event.status, expected);
    assert.equal(receipt.event.channel, expected === 'success' ? 'PAM02' : 'PPL103');
    assert.ok(receipt.cue.tokens.includes('task:capture-retention:1'));
    assert.equal(receipt.learningApplied, true);
  }
});

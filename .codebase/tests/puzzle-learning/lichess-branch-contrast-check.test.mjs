import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {findKingGuardContrast} from '../../src/puzzle-learning/lichess-branch-contrast.mjs';
import {checkLegalBranchContrast} from '../../src/puzzle-learning/lichess-branch-contrast-check.mjs';
const fixture=()=>new Chess('8/4k3/8/3p1p2/8/8/8/K2R1R2 w - - 0 1');

test('independent derivation checker accepts strict pairs and rejects forged outcomes/history/actions',async()=>{
  const board=fixture(),{pair}=await findKingGuardContrast(board);
  assert.equal(checkLegalBranchContrast(board,pair).verified,true);
  for(const change of [
    p=>p.variants[1].branch.reverse(),
    p=>p.variants[1].context.pgn+=' *',
    p=>p.variants[1].context.task.objective='mate',
    p=>p.variants[1].candidates.pop(),
    p=>p.variants[1].candidates.find(c=>c.move===p.variants[1].winner).status='failure',
    p=>p.variants[1].winner=p.variants[0].winner,
  ]){
    const changed=structuredClone(pair);change(changed);
    assert.throws(()=>checkLegalBranchContrast(board,changed));
  }
});

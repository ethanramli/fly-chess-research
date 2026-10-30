// Tests for the v2 Stage 1 data audit. Uses train-only and synthetic inputs; validation and final files are never opened.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditSplit,boardKeys,crossSplitSeparation} from '../../scripts/data/audit-lichess-stage1-synthetic-families-v2.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const DATA=resolve(ROOT,'research/data/lichess-stage1-synthetic-v1');
const FEN_LIKE=/[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8]+\//;

// Train-only inputs: rows, families, plan and the source chunks listed in the train manifest.
function trainInputs(){
  const read=name=>readFileSync(resolve(DATA,name));
  const text=name=>read(name).toString('utf8');
  return {
    rowLines:text('train.jsonl').split(/\r?\n/).filter(Boolean),
    familyBytes:read('train-families.json'),
    familyDoc:JSON.parse(text('train-families.json')),
    plan:JSON.parse(text('train-plan.json')),
    sourceLines:JSON.parse(text('train-manifest.json')).inputs.flatMap(({path})=>
      readFileSync(resolve(ROOT,path),'utf8').split(/\r?\n/).filter(Boolean)),
  };
}

test('train split passes the v2 audit unchanged (24 boards, 12 pairs)',()=>{
  const result=auditSplit({split:'train',...trainInputs()});
  assert.deepEqual(result.failures,[]);
  assert.equal(result.passed,true);
  assert.equal(result.boards,24);
  assert.equal(result.pairs,12);
});

test('12 renamed copies of one valid pair fail as a repeated counterfactual pair',()=>{
  const inputs=trainInputs(),[pair]=inputs.plan.counterfactualPairs;
  inputs.plan.counterfactualPairs=Array.from({length:12},(_,i)=>({...pair,pairId:`${pair.pairId}-copy${i}`}));
  const result=auditSplit({split:'train',...inputs});
  assert.equal(result.passed,false);
  assert.ok(result.failures.includes('repeated counterfactual pair'),result.failures.join('; '));
});

test('cross-split helper counts shared exact and colour-flip symmetry keys',()=>{
  const base='4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
  const flipped='4k3/4p3/8/8/8/8/8/4K3 b - - 0 1'; // colour flip of base: ranks reversed, colours and side swapped
  const rows=fen=>[{keys:boardKeys(fen,['Ke2'])}];
  const same=crossSplitSeparation({train:rows(base),validation:rows(base)});
  assert.equal(same.separation['train-validation'].exact,1);
  assert.equal(same.positionsSeparated,false);
  const flip=crossSplitSeparation({train:rows(base),final:rows(flipped)});
  assert.equal(flip.separation['train-final'].exact,0);
  assert.equal(flip.separation['train-final'].symmetry,1);
  assert.equal(flip.positionsSeparated,false);
});

test('validation and final result objects carry no FEN-like strings',()=>{
  // ponytail: train rows relabelled as evaluation rows (the evaluation binder checks split labels); only the result object is inspected.
  for(const split of ['validation','final']){
    const inputs=trainInputs();
    inputs.rowLines=inputs.rowLines.map(line=>JSON.stringify({...JSON.parse(line),split}));
    inputs.familyDoc={...inputs.familyDoc,assignments:inputs.familyDoc.assignments.map(a=>({...a,split}))};
    const result=auditSplit({split,...inputs});
    assert.match(JSON.stringify(result.keys),FEN_LIKE); // keys exist and would match if serialized
    assert.doesNotMatch(JSON.stringify(result),FEN_LIKE);
    assert.equal(typeof result.failures,'number');
  }
});

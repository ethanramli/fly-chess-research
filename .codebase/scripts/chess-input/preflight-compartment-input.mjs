import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createCompartmentChessCueEncoder} from '../../src/chess-input/compartment-chess-cue.mjs';
const {values:args}=parseArgs({options:{out:{type:'string'}}});
if(!args.out||existsSync(args.out))throw Error('Require fresh --out');
const protocolPath='research/data/compartment-input-association-v1/protocol.json';
const mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json';
const p=JSON.parse(readFileSync(protocolPath)),mapping=JSON.parse(readFileSync(mappingPath)).mapping;
const board=new Chess(p.fen),rows=[];
for(const variant of p.variants)for(const seed of p.seeds)for(const [action,move]of Object.entries(p.actions)){
  const encoder=createCompartmentChessCueEncoder(mapping,{...p.encoder,seed,conjoin:variant.conjoin,stratify:variant.stratify});
  const cue=encoder.encode(board,move,p.taskContext);
  assert.equal(cue.stimulation.length,14);assert.ok(cue.stimulation.every(c=>c.current===1.5));
  assert.equal(cue.accounting.totalCurrent,21);
  rows.push({variant:variant.id,seed,action,cue});
}
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
mkdirSync(args.out,{recursive:true});
writeFileSync(join(args.out,'report.json'),JSON.stringify({passed:true,rows,
  inputs:{[protocolPath]:hash(protocolPath),[mappingPath]:hash(mappingPath)},
  sources:Object.fromEntries(['.codebase/scripts/chess-input/preflight-compartment-input.mjs','.codebase/src/chess-input/compartment-chess-cue.mjs','.codebase/src/chess-input/relational-chess-cue-v2.mjs'].map(path=>[path,hash(path)])),
  scope:'48 deterministic cue/dose checks on the pinned mapping; no graph propagation, teaching, learning or transfer'},null,2));
console.log(JSON.stringify({passed:true,cues:rows.length}));

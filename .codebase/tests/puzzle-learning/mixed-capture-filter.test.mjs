import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hasMatchedCaptureOutcomes} from '../../src/puzzle-learning/mixed-capture-filter.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');

test('matched source filter requires one safe and one guarded same-mover same-type capture',()=>{
  const board=new Chess('8/8/2k5/2p1p3/3Q4/8/8/K7 w - - 1 2'),fen=board.fen(),pgn=board.pgn();
  assert.equal(hasMatchedCaptureOutcomes(board),true);assert.equal(board.fen(),fen);assert.equal(board.pgn(),pgn);
  for(const bad of [
    '7k/8/8/2p1p3/3Q4/8/8/K7 w - - 1 2',
    '8/8/3k4/2p1p3/3Q4/8/8/K7 w - - 1 2',
    '8/8/2k5/2r1p3/3Q4/8/8/K7 w - - 1 2',
    '8/8/3k4/3p1p2/8/8/8/1K1R1R2 w - - 2 2',
  ])assert.equal(hasMatchedCaptureOutcomes(new Chess(bad)),false);
});

test('training-only source filter skips reserved-split semantics and has independent audit rejection',t=>{
  const directory=mkdtempSync(join(tmpdir(),'flychess-mixed-capture-'));
  t.after(()=>{assert(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});});
  const split=id=>{const n=createHash('sha256').update('lichess-game-split-v1:'+id).digest().readUInt32BE(0)/2**32;
    return n<0.8?'train':n<0.9?'validation':'final';};
  const ids={train:[],validation:[],final:[]};
  for(let i=0;Object.values(ids).some(v=>v.length<2);i++){
    const id='test'+String(i).padStart(4,'0');ids[split(id)].push(id);
  }
  const csv=join(directory,'source.csv'),out=join(directory,'corpus');
  const header='PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate';
  const row=(id,fen,moves,game)=>[id,fen,moves,1000,80,0,1,'short',`https://lichess.org/${game}/black#2`,'',''].join(',');
  const records=[
    row('matched','8/2k5/8/2p1p3/3Q4/8/8/K7 b - - 0 1','c7c6 d4e5',ids.train[0]),
    row('unguarded','6k1/8/8/2p1p3/3Q4/8/8/K7 b - - 0 1','g8h8 d4c5',ids.train[1]),
    row('reservedval','deliberately-invalid','bad',ids.validation[0]),
    row('reservedfinal','deliberately-invalid','bad',ids.final[0]),
  ];
  writeFileSync(csv,header+'\n'+records.join('\n')+'\n');
  const curator=fileURLToPath(new URL('../../scripts/data/curate-lichess-puzzles.mjs',import.meta.url));
  const auditor=fileURLToPath(new URL('../../scripts/data/audit-lichess-source-candidates.mjs',import.meta.url));
  const run=args=>spawnSync(process.execPath,['--max-old-space-size=256',...args],{encoding:'utf8',timeout:30000,maxBuffer:2**20});
  let result=run([curator,'--input',csv,'--out',out,'--max-pieces','6','--only-split','train','--require-matched-captures']);
  assert.equal(result.status,0,result.error?.message??result.stderr);
  const manifestPath=join(out,'manifest.json'),m=JSON.parse(readFileSync(manifestPath));
  assert.deepEqual(m.counts.selected,{train:1,validation:0,final:0});assert.equal(m.counts.metadataMatched,2);assert.equal(m.counts.rejected,0);
  const report=join(directory,'audit.json');result=run([auditor,'--corpus',out,'--out',report,'--cpu-duty','0.5']);
  assert.equal(result.status,0,result.error?.message??result.stderr);
  assert.equal(JSON.parse(readFileSync(report)).eligibleForNeuralTeaching,false);
  const train=join(out,'train.jsonl'),selected=JSON.parse(readFileSync(train));
  selected.initialFen='6k1/8/8/2p1p3/3Q4/8/8/K7 b - - 0 1';selected.setupMove='g8h8';
  const board=new Chess(selected.initialFen);board.move('Kh8');selected.solverFen=board.fen();
  selected.solutionMoves=['d4c5'];writeFileSync(train,JSON.stringify(selected)+'\n');
  m.outputs['train.jsonl']=sha(readFileSync(train));writeFileSync(manifestPath,JSON.stringify(m)+'\n');
  result=run([auditor,'--corpus',out,'--out',join(directory,'forged-audit.json'),'--cpu-duty','0.5']);
  assert.notEqual(result.status,0);assert.match(result.stderr,/Missing unique retained capture/);
});

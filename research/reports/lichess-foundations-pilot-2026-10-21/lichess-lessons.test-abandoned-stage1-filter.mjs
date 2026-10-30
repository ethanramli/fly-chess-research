import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {zstdCompressSync} from 'node:zlib';
import {existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {bindLichessApiHistory,bindLichessCsvHistory} from '../../src/puzzle-learning/lichess-history.mjs';
import {prepareLichessCaptureLesson} from '../../src/puzzle-learning/lichess-capture-lesson.mjs';

function fixture(pgn='1. f3 e5 2. g4',solution=['d8h4']){
  const b=new Chess();b.loadPgn(pgn);const moves=b.history({verbose:true});
  const m=moves.at(-1);
  return {game:{id:'abcd1234',pgn},puzzle:{id:'fixture',initialPly:moves.length-1,
    lastMove:m.from+m.to+(m.promotion??''),fen:b.fen().split(' ').slice(0,4).join(' ')+' 0 1',solution}};
}

test('API history keeps real move counters and source setup while isolating the solution',()=>{
  const payload=fixture(),bound=bindLichessApiHistory(payload);
  assert.equal(bound.setupPly,3);assert.equal(bound.context.fen.split(' ')[5],'2');
  assert.equal(bound.reportedSolverFen.split(' ')[5],'1');
  const b=new Chess();b.loadPgn(bound.context.pgn);assert.equal(b.history().length,3);
  assert(!bound.context.pgn.includes('Qh4'));assert(!Object.hasOwn(bound.context,'solutionMoves'));
});

test('CSV history matches full FEN and trims later source-game moves',()=>{
  const payload=fixture(),board=new Chess();board.loadPgn(payload.game.pgn);
  const solverFen=board.fen();board.undo();const initialFen=board.fen();
  const row={schema:'lichess-puzzle-source-row-v1',puzzleId:'fixture',
    source:{gameId:'abcd1234',gameUrl:'https://lichess.org/abcd1234/white#3',puzzlePly:3},
    initialFen,setupMove:'g2g4',solverFen,solverColor:'b',solutionMoves:['d8h4']};
  const source={gameId:'abcd1234',pgn:payload.game.pgn+' Qh4#'};
  const bound=bindLichessCsvHistory(row,source);
  assert.equal(bound.context.fen,solverFen);assert(!bound.context.pgn.includes('Qh4'));
  assert.throws(()=>bindLichessCsvHistory({...row,solverFen:payload.puzzle.fen},source),/Solver FEN/);
  assert.throws(()=>bindLichessCsvHistory(row,{...source,gameId:'zzzz1234'}),/game ID/);
});

test('API rejects inconsistent history, HTML, setup index, board and solution',()=>{
  const mutations=[
    p=>{p.game.pgn='<html>signup</html>';},p=>{p.puzzle.initialPly--;},
    p=>{p.puzzle.lastMove='g2g3';},p=>{p.puzzle.fen=new Chess().fen();},
    p=>{delete p.puzzle.fen;},p=>{p.puzzle.solution=['e1e8'];},
    p=>{p.game.pgn='[SetUp "1"]\n[FEN "6k1/8/8/8/8/8/8/RK6 w - - 0 1"]\n\n1. Ra2';},
    p=>{p.game.pgn='[Site "https://lichess.org/zzzz1234"]\n\n'+p.game.pgn;},
  ];
  for(const mutate of mutations){const p=fixture();mutate(p);assert.throws(()=>bindLichessApiHistory(p));}
});

test('prepared proof candidates cover every legal action without neural delivery or stage admission',()=>{
  const bound=bindLichessApiHistory(fixture('1. e4 d5',['e4d5']));
  const lesson=prepareLichessCaptureLesson(bound),b=new Chess();b.loadPgn(bound.context.pgn);
  assert.equal(lesson.candidates.length,b.moves().length);
  assert(lesson.candidates.some(c=>c.move==='e4d5'&&c.status==='failure'));
  assert(lesson.candidates.every(c=>c.context.task.objective==='capture-retention'));
  assert.equal(lesson.stage1DomainEligible,false);assert(lesson.reasons.includes('exceeds-stage-1-six-piece-limit'));
  assert.equal(lesson.neuralEventsDelivered,0);assert.equal(lesson.counts.unknown,0);
  const unknown=prepareLichessCaptureLesson(bound,{maxReplies:1}).candidates.find(c=>c.move==='e4d5');
  assert.equal(unknown.status,'unknown');assert.equal(unknown.learningAllowed,false);
  assert.equal(unknown.certificateSha256,null);
});

test('stage1-only preparation excludes oversized boards before action certification',()=>{
  const bound=bindLichessApiHistory(fixture());
  const lesson=prepareLichessCaptureLesson(bound,{stage1Only:true,maxReplies:1});
  assert(lesson.pieceCount>6);assert.deepEqual(lesson.context,{...bound.context,task:{objective:'capture-retention',plies:1}});
  assert.deepEqual(lesson.candidates,[]);assert.deepEqual(lesson.counts,{success:0,failure:0,unknown:0});
  assert.equal(lesson.certificateCoverage,'excluded-piece-limit');assert.equal(lesson.stage1DomainEligible,false);
  assert.deepEqual(lesson.reasons,['exceeds-stage-1-six-piece-limit']);assert.equal(lesson.neuralEventsDelivered,0);
});

test('changed bound history is rejected before certificate preparation',()=>{
  const bound=bindLichessApiHistory(fixture());bound.context.pgn+=' Qh4#';
  assert.throws(()=>prepareLichessCaptureLesson(bound),/Changed source prefix/);
});

function cliFixture(t){
  const directory=mkdtempSync(join(tmpdir(),'flychess-lichess-'));
  t.after(()=>{
    assert(resolve(directory).startsWith(resolve(tmpdir())+sep),'Cleanup outside intended temporary root');
    rmSync(directory,{recursive:true,force:true});
  });
  const input=join(directory,'source.json'),out=join(directory,'prepared');
  writeFileSync(input,JSON.stringify(fixture('1. e4 d5',['e4d5'])));
  const script=fileURLToPath(new URL('../../scripts/data/prepare-lichess-lessons.mjs',import.meta.url));
  const run=(extra=[])=>spawnSync(process.execPath,['--max-old-space-size=256',...extra,script,
    '--api-json',input,'--out',out],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  return {directory,input,out,run};
}

test('preparation CLI and separate API audit agree on a bounded fixture',t=>{
  const f=cliFixture(t),prepared=f.run();assert.equal(prepared.status,0,prepared.stderr);
  const manifest=JSON.parse(readFileSync(join(f.out,'manifest.json')));
  assert.equal(manifest.counts.prepared,1);assert.equal(manifest.neuralEventsDelivered,0);
  assert(manifest.outputBytes<=manifest.bounds.maxOutputBytes);
  const audit=spawnSync(process.execPath,['--max-old-space-size=256',
    fileURLToPath(new URL('../../scripts/data/audit-lichess-api-lessons.mjs',import.meta.url)),
    '--prepared',f.out,'--out',join(f.directory,'audit.json')],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(audit.status,0,audit.stderr);
});

test('publication failure exits without a completed manifest or source-rejection substitution',t=>{
  const f=cliFixture(t),preloader=join(f.directory,'fail-append.mjs');
  writeFileSync(preloader,"import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module'; fs.appendFileSync=()=>{throw Error('injected-publication-failure');}; syncBuiltinESMExports();");
  const result=f.run(['--import',pathToFileURL(preloader).href]);
  assert.notEqual(result.status,0);assert.match(result.stderr,/injected-publication-failure/);
  assert(!existsSync(join(f.out,'manifest.json')));assert(!existsSync(join(f.out,'lessons.jsonl')));
  assert(existsSync(join(f.out,'lessons.jsonl.partial')));
});

test('invalid source is quarantined with a nonzero CLI exit and no lessons',t=>{
  const f=cliFixture(t),payload=fixture();payload.game.pgn='<html>signup</html>';
  writeFileSync(f.input,JSON.stringify(payload));const result=f.run();assert.equal(result.status,1);
  const manifest=JSON.parse(readFileSync(join(f.out,'manifest.json')));
  assert.equal(manifest.counts.prepared,0);assert.equal(manifest.counts.rejected,1);
  assert.match(manifest.rejections[0].reason,/HTML/);assert.equal(readFileSync(join(f.out,'lessons.jsonl'),'utf8'),'');
});

test('stream curator filters the solver position but keeps a seven-to-six setup capture',t=>{
  const f=cliFixture(t),csv=join(f.directory,'source.csv'),out=join(f.directory,'curated');
  const header='PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate';
  const rows=[
    ['six','6k1/8/8/8/p6r/1P6/8/RK6 b - - 0 1','g8g7 a1a4','abcd0001'],
    ['seven','6k1/8/8/8/p6r/1P6/8/RKB5 b - - 0 1','g8g7 a1a4','abcd0002'],
    ['reduced','6k1/8/8/8/pP5r/8/8/R1B3K1 b - - 0 1','h4b4 a1a4','abcd0003'],
  ];
  writeFileSync(csv,header+'\n'+rows.map(([id,fen,moves,game])=>
    [id,fen,moves,1000,80,0,1,'hangingPiece',`https://lichess.org/${game}/black#2`,'',''].join(',')).join('\n')+'\n');
  const result=spawnSync(process.execPath,['--max-old-space-size=256',
    fileURLToPath(new URL('../../scripts/data/curate-lichess-puzzles.mjs',import.meta.url)),
    '--input',csv,'--out',out,'--limit-per-split','4','--max-pieces','6'],
    {encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(readFileSync(join(out,'manifest.json'))).counts.rejected,0);
  const selected=['train','validation','final'].flatMap(split=>readFileSync(join(out,split+'.jsonl'),'utf8')
    .trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)));
  assert.deepEqual(selected.map(row=>row.puzzleId).sort(),['reduced','six']);
  assert(selected.every(row=>row.history.status==='unresolved'&&row.consequence.status==='unverified'));
  assert.equal(JSON.parse(readFileSync(join(out,'manifest.json'))).curator.maxPieces,6);
});

test('source replay retains castling/en-passant/promotion legality and rejects malformed promotion or pin moves',t=>{
  const f=cliFixture(t),csv=join(f.directory,'source.csv');
  const header='PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate';
  const rows=[
    ['castling','r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','e1g1 e8c8'],
    ['ep','7k/8/8/3pP3/8/8/8/K7 w - d6 0 2','e5d6 h8h7'],
    ['promotion','7k/P7/8/8/8/8/8/2K5 w - - 0 1','a7a8q h8h7'],
    ['missing-promotion','7k/P7/8/8/8/8/8/2K5 w - - 0 1','a7a8 h8h7'],
    ['extra-promotion','6k1/8/8/8/p6r/1P6/8/RK6 b - - 0 1','g8g7q a1a4'],
    ['pinned','4r2k/8/8/8/8/8/4R3/4K3 w - - 0 1','e2f2 h8h7'],
  ];
  writeFileSync(csv,header+'\n'+rows.map(([id,fen,moves],i)=>{
    const fields=fen.split(' '),color=fields[1]==='w'?'white':'black';
    const ply=(Number(fields[5])-1)*2+(fields[1]==='w'?1:2);
    return [id,fen,moves,1000,80,0,1,'short',`https://lichess.org/probe00${i}/${color}#${ply}`,'',''].join(',');
  }).join('\n')+'\n');
  const result=spawnSync(process.execPath,['--max-old-space-size=256',
    fileURLToPath(new URL('../../scripts/data/curate-lichess-puzzles.mjs',import.meta.url)),
    '--input',csv,'--out',f.out,'--limit-per-split','8','--max-pieces','6'],
    {encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(result.status,0,result.stderr);
  const manifest=JSON.parse(readFileSync(join(f.out,'manifest.json')));
  assert.equal(manifest.counts.rejected,3);
  const selected=['train','validation','final'].flatMap(split=>readFileSync(join(f.out,split+'.jsonl'),'utf8')
    .split('\n').filter(Boolean).map(line=>JSON.parse(line)));
  assert.deepEqual(selected.map(row=>row.puzzleId).sort(),['castling','ep','promotion']);
});

function sourceCorpus(t){
  const f=cliFixture(t),csv=join(f.directory,'source.csv');
  const games={};for(let i=0;i<1000&&Object.keys(games).length<2;i++){
    const id='g'+String(i).padStart(7,'0');
    const n=createHash('sha256').update('lichess-game-split-v1:'+id).digest().readUInt32BE(0)/2**32;
    if(n<0.8)games.train??=id;else if(n<0.9)games.validation??=id;
  }
  assert(games.train&&games.validation);
  const header='PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate';
  const quote=s=>String(s).includes(',')||String(s).includes('"')?'"'+String(s).replaceAll('"','""')+'"':String(s);
  const rows=Object.entries(games).map(([split,id],index)=>[
    split+'row',index?'6k1/8/8/8/p6r/1P6/8/R1K5 b - - 0 1':'6k1/8/8/8/p6r/1P6/8/RK6 b - - 0 1',
    'g8g7  a1a4',1000,80,0,1,'hangingPiece endgame',`https://lichess.org/${id}/black#2`,'Fixture,"tag"','',
  ]);
  writeFileSync(csv,header+'\n'+rows.map(row=>row.map(quote).join(',')).join('\n')+'\n');
  const curated=spawnSync(process.execPath,['--max-old-space-size=256',
    fileURLToPath(new URL('../../scripts/data/curate-lichess-puzzles.mjs',import.meta.url)),
    '--input',csv,'--out',f.out,'--max-pieces','6','--limit-per-split','4'],
    {encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(curated.status,0,curated.stderr);
  return {...f,csv,audit:name=>spawnSync(process.execPath,['--max-old-space-size=256',
    fileURLToPath(new URL('../../scripts/data/audit-lichess-source-candidates.mjs',import.meta.url)),
    '--corpus',f.out,'--out',join(f.directory,name),'--cpu-duty','0.5'],
    {encoding:'utf8',timeout:30000,maxBuffer:1024*1024})};
}

test('source audit verifies independent CSV membership and never opens reserved final rows',t=>{
  const f=sourceCorpus(t);rmSync(join(f.out,'final.jsonl'));
  const archive=join(f.directory,'source.csv.zst'),receipt=join(f.directory,'extraction.json');
  const bytes=readFileSync(f.csv),compressed=zstdCompressSync(bytes);writeFileSync(archive,compressed);
  const hash=value=>createHash('sha256').update(value).digest('hex');
  writeFileSync(receipt,JSON.stringify({schema:'lichess-archive-extraction-v1',status:'published',
    archive,archiveSha256:hash(compressed),path:f.csv,sha256:hash(bytes)}));
  const manifestPath=join(f.out,'manifest.json'),manifest=JSON.parse(readFileSync(manifestPath));
  manifest.source.extractionReceipt=receipt;manifest.source.compressedBytesSha256=hash(compressed);
  writeFileSync(manifestPath,JSON.stringify(manifest));
  const result=f.audit('source-audit.json');assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(readFileSync(join(f.directory,'source-audit.json')));
  assert.equal(report.sourceChecksPassed,true);assert.deepEqual(report.checkedSplits,{train:1,validation:1});
  assert.equal(report.finalSplitInspected,false);assert.equal(report.eligibleForNeuralTeaching,false);
  assert.equal(report.fullGameHistoryVerified,false);assert.equal(report.graphLaunchAuthorized,false);
  assert.equal(report.compressedSourceChecked,true);
  writeFileSync(archive,'changed archive');const changed=f.audit('changed-archive.json');
  assert.equal(changed.status,1);assert(!existsSync(join(f.directory,'changed-archive.json')));
});

test('source audit rejects rehashed candidate fabrication and consequence promotion',t=>{
  const f=sourceCorpus(t),path=join(f.out,'train.jsonl'),manifestPath=join(f.out,'manifest.json');
  const original=JSON.parse(readFileSync(path,'utf8').trim()),manifest=JSON.parse(readFileSync(manifestPath));
  for(const [name,change,message] of [
    ['rating',row=>{row.rating++;},/Candidate differs from pinned CSV row/],
    ['consequence',row=>{row.consequence.status='success';},/unverified/],
    ['position',row=>{row.solverFen=row.initialFen;},null],
  ]){
    const row=structuredClone(original);change(row);const bytes=JSON.stringify(row)+'\n';writeFileSync(path,bytes);
    manifest.outputs['train.jsonl']=createHash('sha256').update(bytes).digest('hex');writeFileSync(manifestPath,JSON.stringify(manifest));
    const result=f.audit(name+'.json');assert.equal(result.status,1);
    if(message)assert.match(result.stderr,message);assert(!existsSync(join(f.directory,name+'.json')));
  }
});

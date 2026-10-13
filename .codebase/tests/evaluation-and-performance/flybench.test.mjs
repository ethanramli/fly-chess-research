import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { updateRating, nearestOpponent, replayGame, outcome, ratingReport } from '../../src/evaluation-and-performance/flybench.mjs';
import { StockfishOpponent } from '../../src/evaluation-and-performance/stockfish-opponent.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

test('Glicko published example and rating uncertainty', () => {
  const result = updateRating({ rating: 1500, rd: 200 }, [
    { rating: 1400, rd: 30, score: 1 }, { rating: 1550, rd: 100, score: 0 }, { rating: 1700, rd: 300, score: 0 },
  ]);
  assert.ok(Math.abs(result.rating - 1464.1) < 0.1);
  assert.ok(Math.abs(result.rd - 151.4) < 0.1);
  const lose = opponent => updateRating({ rating: 1000, rd: 350 }, [{ rating: opponent, rd: 30, score: 0 }]);
  assert.ok(lose(700).rating < lose(1300).rating);
  assert.ok(result.rd < 200);
  assert.throws(() => updateRating({ rating: 1000, rd: 350 }, [{ rating: 700, rd: 30, score: 0.2 }]));
});

test('Outcome perspective, legal history and interruption stay distinct', () => {
  const game = replayGame(['f2f3', 'e7e5', 'g2g4'], ['d8h4']);
  assert.equal(outcome(game, 'w'), 0); assert.equal(outcome(game, 'b'), 1);
  assert.equal(outcome(new Chess(), 'w'), null);
  assert.equal(outcome(new Chess('8/8/8/8/8/8/8/K6k w - - 0 1'), 'w'), 0.5);
  const repeat = replayGame([], Array.from({ length: 2 }, () => ['g1f3', 'g8f6', 'f3g1', 'f6g8']).flat());
  assert.equal(repeat.isThreefoldRepetition(), true); assert.equal(outcome(repeat, 'b'), 0.5);
  assert.throws(() => replayGame([], ['e2e5']));
});

test('Adaptive opponents and honest one-sided report', () => {
  const ladder = [{ rating: 1320 }, { rating: 1500 }];
  assert.equal(nearestOpponent(ladder, 900), ladder[0]);
  assert.equal(nearestOpponent(ladder, 1490), ladder[1]);
  const report = ratingReport({ protocol: { games: 50, scale: 'fixture' }, rating: { rating: 982.64, rd: 100 }, results: [{ score: 0 }] });
  assert.equal(report.estimate, 982.6); assert.equal(report.complete, false);
  assert.match(report.status, /not bracketed/); assert.equal(report.decimalAccuracyEstablished, false);
});

test('UCI handshake, limits, complete history and abrupt process failure', async () => {
  const fixture = `const r=require('node:readline').createInterface({input:process.stdin});r.on('line',s=>{
    if(s==='uci')console.log('id name Fixture\\noption name UCI_Elo type spin default 1320 min 1320 max 3190\\noption name UCI_LimitStrength type check default false\\nuciok');
    if(s==='isready')console.log('readyok');if(s.startsWith('go '))console.log('bestmove d8h4');
  });`;
  const transcript = [];
  const engine = new StockfishOpponent(process.execPath, { args: ['-e', fixture], record: (direction, line) => transcript.push({ direction, line }), timeout: 2000 });
  try {
    await engine.initialize(); assert.deepEqual(engine.range, [1320, 3190]);
    await assert.rejects(engine.newGame(700), /Unsupported/);
    await engine.newGame(1320);
    assert.deepEqual(await engine.move(['f2f3', 'e7e5', 'g2g4'], 1), { from: 'd8', to: 'h4' });
    assert.ok(transcript.some(row => row.line === 'position startpos moves f2f3 e7e5 g2g4'));
    const pending = engine.command('never-replies', line => line === 'impossible');
    engine.child.kill(); await assert.rejects(pending, /exited/);
  } finally { engine.close(); }
});

const realEngine = resolve('.codebase/vendor/stockfish/sf-19/extracted/stockfish/stockfish-windows-x86-64-universal.exe');
test('Real Stockfish complete runner, prefix recovery, audit and tamper rejection (synthetic player)', { skip: process.platform !== 'win32' || !existsSync(realEngine), timeout: 120000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'flybench-check-'));
  const runner = resolve('.codebase/scripts/evaluation-and-performance/flybench.mjs');
  const base = ['--max-old-space-size=256', runner, '--stockfish', realEngine,
    '--adapter', resolve('.codebase/tests/evaluation-and-performance/fixtures/mate-player.mjs'),
    '--openings', resolve('.codebase/tests/evaluation-and-performance/fixtures/openings.json'),
    '--games', '4', '--initial-rating', '3190', '--move-ms', '50', '--cpu-duty', '0.5'];
  const invoke = extra => execFileSync(process.execPath, [...base, ...extra], { windowsHide: true, encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'pipe'] });
  invoke(['--out', join(dir, 'original')]);
  const original = JSON.parse(readFileSync(join(dir, 'original/state.json'), 'utf8'));
  assert.deepEqual(original.results.map(row => row.score), [0, 1, 0, 1]);
  const prefix = structuredClone(original);
  prefix.results = prefix.results.slice(0, 1); prefix.rating = { rating: 3190, rd: 350 };
  prefix.current = { index: 1, moves: [] };
  writeFileSync(join(dir, 'prefix.json'), JSON.stringify(prefix));
  invoke(['--out', join(dir, 'resumed'), '--resume', join(dir, 'prefix.json')]);
  const resumed = JSON.parse(readFileSync(join(dir, 'resumed/state.json'), 'utf8'));
  assert.deepEqual(resumed.rating, original.rating);
  assert.deepEqual(resumed.results.map(row => row.score), [0, 1, 0, 1]);
  assert.ok(existsSync(join(dir, 'resumed/interrupted-game.json')));
  assert.ok(existsSync(join(dir, 'resumed/game-001.pgn')));
  const audit = execFileSync(process.execPath, [resolve('.codebase/scripts/evaluation-and-performance/audit-flybench.mjs'), '--state', join(dir, 'resumed/state.json')], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(JSON.parse(audit).softwareAudit, 'pass');
  prefix.results[0].score = 1;
  writeFileSync(join(dir, 'bad-prefix.json'), JSON.stringify(prefix));
  assert.throws(() => invoke(['--out', join(dir, 'rejected'), '--resume', join(dir, 'bad-prefix.json')]), /Resume game certificate mismatch/);
  const cappedOpenings = join(dir, 'capped-openings.json');
  writeFileSync(cappedOpenings, JSON.stringify([['e2e4'], ['e2e4']]));
  assert.throws(() => invoke(['--out', join(dir, 'capped'), '--openings', cappedOpenings, '--max-plies', '1']), /Ply cap reached/);
  const capped = JSON.parse(readFileSync(join(dir, 'capped/state.json'), 'utf8'));
  assert.equal(capped.results.length, 0); assert.equal(capped.current.moves.length, 1);
  const mutating = join(dir, 'mutating.mjs');
  writeFileSync(mutating, `export async function createPlayer(){let memory=0;return {name:'Synthetic mutation fixture',files:[${JSON.stringify(mutating)}],identity:()=>({graph:'none',model:'synthetic',memory,encoder:'none',readout:'none',policy:'fixture'}),reset:async()=>{},choose:async()=>{memory++;return {from:'d8',to:'h4'}}}}`);
  assert.throws(() => invoke(['--out', join(dir, 'mutation'), '--adapter', mutating]), /Fly persistent identity changed/);
  const mutation = JSON.parse(readFileSync(join(dir, 'mutation/state.json'), 'utf8'));
  assert.equal(mutation.results.length, 1); assert.deepEqual(mutation.rating, { rating: 3190, rd: 350 });
});

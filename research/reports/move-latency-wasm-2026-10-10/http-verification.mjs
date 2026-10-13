// Run against the existing production server after the serial comparison.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';

const base = process.argv[2];
assert.match(base ?? '', /^http:\/\/127\.0\.0\.1:\d+$/);
const mode = process.argv[3] ?? 'production';
assert.ok(['staged', 'production'].includes(mode));
const dir = new URL('.', import.meta.url);
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const trainer = '.codebase/src/supervised-baselines/trainer.mjs';
const before = hash(trainer);
const benchmark = JSON.parse(readFileSync('runs/move-latency-wasm-v1/report.json'));
assert.equal(benchmark.latencyGatePassed, true);
const samples = readFileSync('runs/move-latency-wasm-v1/samples.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const checks = [];
async function post(route, body, status = 200) {
  const begin = performance.now();
  const response = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return { data, elapsedMs: performance.now() - begin };
}
for (const humanColor of ['w', 'b']) {
  let { data: game } = await post('/api/new', { humanColor });
  const replay = new Chess();
  if (humanColor === 'w') {
    replay.move('e4');
    ({ data: game } = await post('/api/human-move', { id: game.id, from: 'e2', to: 'e4' }));
  }
  assert.equal(game.fen, replay.fen());
  const fixture = humanColor === 'w' ? 'black-after-e4' : 'white-start';
  const expected = samples.find(s => s.fixture === fixture && s.name === 'candidate').chosen;
  assert.ok(expected);
  assert.ok(replay.moves({ verbose: true }).some(m => m.from === expected.from && m.to === expected.to));
  replay.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
  const { data: after, elapsedMs } = await post('/api/fly-move', { id: game.id });
  assert.equal(after.fen, replay.fen());
  assert.equal(after.turn, humanColor);
  assert.equal(after.history.length, humanColor === 'w' ? 2 : 1);
  assert.equal(after.flyScore, expected.score);
  assert.deepEqual([after.history.at(-1).from, after.history.at(-1).to], [expected.from, expected.to]);
  const pgnReplay = new Chess(); pgnReplay.loadPgn(after.pgn);
  assert.equal(pgnReplay.fen(), after.fen);
  assert.ok(after.peakResidentMiB <= 768);
  const refused = await post('/api/fly-move', { id: game.id }, 400);
  assert.equal(refused.data.error, 'It is your turn');
  checks.push({ fixture, elapsedMs, expected, snapshot: after, wrongTurnRejected: true, pgnReplayPassed: true });
}
const page = await fetch(base + '/');
assert.equal(page.status, 200);
assert.match(await page.text(), /FlyChess/);
assert.equal(hash(trainer), before);
writeFileSync(new URL(mode === 'staged' ? 'staged-http-verification.json' : 'http-verification.json', dir), JSON.stringify({
  timestamp: new Date().toISOString(), command: process.argv, node: process.version,
  mode, coverage: 'Existing server HTTP move selection, application, history and PGN replay; no visual browser inspection',
  trainerSHA256: before, accumulatorSHA256: hash('.codebase/src/runtime/sparse-accumulator.mjs'),
  serverSHA256: hash('.codebase/scripts/browser/play-server.mjs'), checks, passed: true,
}, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ passed: true, checks: checks.map(({ fixture, elapsedMs }) => ({ fixture, elapsedMs })) }));

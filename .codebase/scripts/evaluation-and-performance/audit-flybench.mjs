import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { sha256 } from '../runtime/fetch-graph.mjs';
import { updateRating, nearestOpponent } from '../../src/evaluation-and-performance/flybench.mjs';

const { values } = parseArgs({ options: { state: { type: 'string' }, out: { type: 'string' } } });
if (!values.state) throw Error('--state is required');
const state = JSON.parse(readFileSync(values.state, 'utf8')), p = state.protocol;
assert.ok(['flybench-v1', 'flybench-v2'].includes(p.version));
assert.equal(await sha256(p.engine.path), p.engine.sha256, 'Engine bytes changed');
for (const [path, hash] of Object.entries(p.pins)) assert.equal(await sha256(path), hash, `Input changed: ${path}`);
let rating = { rating: p.initialRating, rd: p.initialRD };
const identity = createHash('sha256').update(JSON.stringify(p.identity)).digest('hex');
assert.ok(state.results.length <= p.games);
for (const [i, row] of state.results.entries()) {
  assert.equal(row.index, i); assert.equal(row.flyColor, i % 2 ? 'b' : 'w');
  assert.equal(row.frozenIdentity, identity);
  assert.deepEqual(row.opening, p.openings[Math.floor(i / 2)]);
  const expected = i % 2 ? state.results[i - 1].opponent : nearestOpponent(p.ladder, rating.rating);
  const expectedOpponent = p.engine.kind === 'nova-raw-policy'
    ? { ...expected, conditioningInput: expected.conditioningInput ?? Math.max(p.engine.range[0], Math.min(p.engine.range[1], expected.elo)) }
    : expected;
  if (p.engine.kind === 'nova-raw-policy') assert.ok(Number.isInteger(expectedOpponent.conditioningInput) && expectedOpponent.conditioningInput >= p.engine.range[0] && expectedOpponent.conditioningInput <= p.engine.range[1]);
  if (p.engine.kind !== 'nova-raw-policy') assert.ok(Number.isInteger(expectedOpponent.elo) && expectedOpponent.elo >= p.engine.range[0] && expectedOpponent.elo <= p.engine.range[1]);
  assert.deepEqual(row.opponent, expectedOpponent);
  const game = new Chess();
  for (const move of [...row.opening, ...row.moves]) {
    assert.equal(game.isGameOver(), false, 'Move after termination'); game.move(move);
  }
  assert.ok(game.isGameOver(), 'Incomplete game was scored');
  assert.equal(game.fen(), row.finalFen);
  const score = game.isCheckmate() ? (game.turn() === row.flyColor ? 0 : 1) : 0.5;
  assert.equal(row.score, score);
  const pgnGame = new Chess(); pgnGame.loadPgn(row.pgn);
  assert.equal(pgnGame.fen(), game.fen());
  assert.deepEqual(pgnGame.history(), game.history(), 'PGN history mismatch');
  if (i % 2) rating = updateRating(rating, state.results.slice(i - 1, i + 1).map(r => {
    const { conditioningInput, input, ...reference } = r.opponent;
    return { ...reference, score: r.score };
  }));
}
assert.deepEqual(state.rating, rating);
const result = { softwareAudit: 'pass', games: state.results.length,
  coverage: 'Pinned files and engine, complete legal replay, history, terminal result, colour schedule, adaptive opponents, rating reconstruction',
  limits: 'Shares chess.js and Glicko arithmetic with runner; does not validate adapter honesty, biological identities or reference calibration' };
if (values.out) writeFileSync(values.out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));

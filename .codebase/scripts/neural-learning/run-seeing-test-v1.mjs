// Seeing test v1 (2026-11-03): can the brain's memory cells tell a white knight from a white bishop on e4, on real positions that are otherwise identical?
// No chess judgement and no piece counting.
// Read-only; memory never changes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { leaveOneGameOut } from '../../src/neural-learning/eye-test-v2-runner.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { applyEdit, replayGame } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
assert.equal(args['cpu-duty'], '0.5');
assert(args.config, 'Missing --config');
const registration = readFileSync(args.config), config = JSON.parse(registration.toString('utf8').replace(/^﻿/, ''));
const out = config.paths.run;
assert(!existsSync(out), 'Fresh output required');
const sha = x => createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const fileHash = async p => { const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b); return h.digest('hex'); };
const atomic = (path, body) => { writeFileSync(path + '.partial', JSON.stringify(body) + '\n'); renameSync(path + '.partial', path); };
const started = performance.now(), cpuStarted = process.cpuUsage(), sleep = new Int32Array(new SharedArrayBuffer(4));
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 3600000, 'Resource guard');
}
function pace() {
  const cpu = process.cpuUsage(cpuStarted);
  let delay = 2 * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  while (delay > 0) {
    Atomics.wait(sleep, 0, 0, Math.min(delay, 100));
    delay = 2 * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  }
}
for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Changed input ${path}`);

guard(); mkdirSync(out, { recursive: true });
const manifest = { schema: 'seeing-test-v1-run-v1', status: 'running', pid: process.pid, argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 3600 },
  scope: 'read-only Seeing test v1; memory never changes' };
atomic(`${out}/manifest.json`, manifest);

const gameIdOf = pgn => pgn.match(/^\[Site "([^"]*)"\]/m)?.[1]?.replace(/#.*$/, '').split('/').filter(Boolean).pop() ?? '';
const uciOf = move => move.from + move.to + (move.promotion ?? '');
const blackKingSquare = fen => new Chess(fen).board().flat().find(p => p && p.type === 'k' && p.color === 'b')?.square;

// First ply (ply >= 16, White to move, e4 empty) whose knight/bishop pair is usable; null if none.
function buildPair(gameId, pgn) {
  let entries;
  try { entries = replayGame(pgn); } catch { return null; }
  for (const entry of entries) {
    if (entry.ply < 16 || entry.fen.split(' ')[1] !== 'w' || new Chess(entry.fen).get('e4')) continue;
    let knight, bishop;
    try {
      knight = applyEdit(entry.fen, { kind: 'value', square: 'e4', piece: { type: 'n', color: 'w' } });
      bishop = applyEdit(entry.fen, { kind: 'value', square: 'e4', piece: { type: 'b', color: 'w' } });
    } catch { continue; }
    const king = blackKingSquare(entry.fen);
    if (!king || new Chess(knight).isAttacked(king, 'w') || new Chess(bishop).isAttacked(king, 'w')) continue;
    const legal = fen => new Map(new Chess(fen).moves({ verbose: true }).map(m => [uciOf(m), m]));
    const onKnight = legal(knight), onBishop = legal(bishop);
    const move = [...onKnight.keys()].sort().find(uci => {
      const m = onKnight.get(uci);
      return onBishop.has(uci) && m.color === 'w' && !m.captured && !m.promotion && m.from !== 'e4' && m.to !== 'e4';
    });
    if (move) return { gameId, ply: entry.ply, move, knight, bishop };
  }
  return null;
}

try {
  // Step 1: pairs, one per game, 48 distinct games in file order.
  const games = readFileSync(config.paths.games, 'utf8').split(/\r?\n\r?\n(?=\[Event )/).filter(chunk => chunk.trim());
  const pairs = [], seen = new Set();
  for (const pgn of games) {
    if (pairs.length >= 48) break;
    const gameId = gameIdOf(pgn);
    if (!gameId || seen.has(gameId)) continue;
    const pair = buildPair(gameId, pgn);
    if (pair) { pairs.push(pair); seen.add(gameId); }
  }
  if (pairs.length < 48) throw Error(`Found ${pairs.length} pairs; need 48`);
  writeFileSync(`${out}/pairs.jsonl`, pairs.map(p => JSON.stringify(p) + '\n').join(''));

  // Model, eyes and retina, loaded as in the eye test.
  const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
  const indices = new Map(Array.from(roots, (root, i) => [root.toString(), i]));
  const kcs = [];
  let header;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
    const fields = line.split('\t'); if (!header) { header = fields; continue; }
    const index = indices.get(fields[header.indexOf('root_id')]);
    if (index !== undefined && fields[header.indexOf('cell_class')] === 'Kenyon_Cell') kcs.push(index);
  }
  const kcIndices = [...new Set(kcs)].sort((a, b) => a - b);
  const retina = loadRetina('.cache/full.npz');
  const eyes = createEyesV2(retina);

  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
  const rawForward = model.forward.bind(model);
  model.forward = (...values) => { const result = rawForward(...values); pace(); return result; };

  // Step 2: memory hash before any pass.
  const magnitudes = () => {
    const m = model.params.magnitude;
    return createHash('sha256').update(Buffer.from(m.buffer, m.byteOffset, m.byteLength)).digest('hex');
  };
  const before = magnitudes();

  // Step 3: one pass per board, 96 in total.
  let passes = 0;
  const pass = stimulation => {
    guard();
    if (passes >= 96) throw Error('Pass budget exceeded');
    model.forward([0], stimulation);
    passes++;
    const h = model.h[model.steps];
    return Float64Array.from(kcIndices, i => h[i]);
  };
  const rawOf = stimulation => {
    const m = new Map(stimulation.map(x => [x.index, x.current]));
    return Float64Array.from(retina.retina_idx, i => m.get(i) ?? 0);
  };
  const brainRows = [], rawRows = [];
  for (const p of pairs) {
    const sg = eyes.encode(p.knight, p.move).stimulation, sb = eyes.encode(p.bishop, p.move).stimulation;
    brainRows.push({ good: pass(sg), bad: pass(sb) });
    rawRows.push({ good: rawOf(sg), bad: rawOf(sb) });
  }

  // Step 4: leave-one-game-out, good = knight board, bad = bishop board.
  const brainCv = leaveOneGameOut(brainRows, pairs);
  const rawCv = leaveOneGameOut(rawRows, pairs);

  // Step 5: memory must be unchanged.
  if (magnitudes() !== before) throw Error('Memory changed');

  const counts = { brain: brainCv.correct, raw: rawCv.correct };
  const elapsedSeconds = Number(((performance.now() - started) / 1000).toFixed(3));
  atomic(`${out}/summary.json`, {
    schema: 'seeing-test-v1', question: 'knight vs bishop on e4', counts, outOf: 48, chance: 24,
    rule: 'brain >= 44 sees; brain <= 30 image lost; otherwise partial; raw is the ceiling',
    outcome: counts.brain >= 44 ? 'sees' : counts.brain <= 30 ? 'lost' : 'partial',
    passes, memoryUnchanged: true, elapsedSeconds,
  });
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete' });
} catch (error) {
  atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: error.message });
  throw error;
}

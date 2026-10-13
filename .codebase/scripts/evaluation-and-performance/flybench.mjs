import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, appendFileSync, renameSync, mkdirSync, existsSync, readdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { Chess } from 'chess.js';
import { StockfishOpponent } from '../../src/evaluation-and-performance/stockfish-opponent.mjs';
import { NovaOpponent } from '../../src/evaluation-and-performance/nova-opponent.mjs';
import { updateRating, nearestOpponent, replayGame, outcome, ratingReport } from '../../src/evaluation-and-performance/flybench.mjs';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { createUntrainedFly, chooseFlyMove } from '../../src/evaluation-and-performance/fly-policy.mjs';
import { random } from '../../src/supervised-baselines/trainer.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: {
  stockfish: { type: 'string' }, nova: { type: 'string' }, out: { type: 'string' }, resume: { type: 'string' },
  games: { type: 'string', default: '50' }, 'initial-rating': { type: 'string', default: '1000' },
  seed: { type: 'string', default: '47' }, 'move-ms': { type: 'string', default: '100' },
  'max-plies': { type: 'string', default: '400' }, 'cpu-duty': { type: 'string', default: '0.5' },
  openings: { type: 'string' }, references: { type: 'string' }, adapter: { type: 'string' }, help: { type: 'boolean' },
} });
if (args.help) {
  console.log('FlyBench: (--stockfish PATH | --nova ONNX_PATH) --out NEW_DIRECTORY [--games 50] [--resume state.json]\n' +
    '[--adapter MODULE] [--references JSON] [--openings JSON] [--seed 47] [--initial-rating 1000]\n' +
    '[--move-ms 100] [--max-plies 400] --cpu-duty 0.5\nSee documentation/design/evaluation-and-performance/flybench.md');
  process.exit(0);
}
if (!args.out || Boolean(args.stockfish) === Boolean(args.nova)) throw Error('Provide --out and exactly one of --stockfish or --nova');
if (!process.execArgv.includes('--max-old-space-size=256')) throw Error('Run node --max-old-space-size=256');
const integer = (value, name, min, max) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw Error(`Invalid ${name}`);
  return n;
};
const games = integer(args.games, 'games', 2, 1000);
if (games % 2) throw Error('Games must be even for colour pairs');
const seed = integer(args.seed, 'seed', 0, 0xffffffff);
const moveMs = integer(args['move-ms'], 'move-ms', 1, 10000);
const maxPlies = integer(args['max-plies'], 'max-plies', 1, 1000);
const initial = Number(args['initial-rating']);
if (!Number.isFinite(initial)) throw Error('Invalid initial rating');
if (Number(args['cpu-duty']) !== 0.5) throw Error('This protocol requires --cpu-duty 0.5');
const out = resolve(args.out), enginePath = resolve(args.stockfish ?? args.nova);
if (args.nova && enginePath.split(/[\\/]/).at(-1) !== 'nova_v3b.onnx') throw Error('Expected pinned Nova v3b ONNX file');
if (existsSync(out)) throw Error('Output already exists; resume into a NEW directory');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const references = args.references ? read(args.references) : null;
if (args.nova && !references) throw Error('Nova requires --references with a declared calibration scale; raw conditioning inputs are not Elo ratings');
if (args.nova && (!references.scale || !Array.isArray(references.evidenceFiles) || !references.evidenceFiles.length || !Array.isArray(references.ladder))) throw Error('Nova references require scale, evidenceFiles and a measured ladder');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const atomic = (path, value) => { writeFileSync(path + '.partial', JSON.stringify(value, null, 2)); renameSync(path + '.partial', path); };
const uci = move => move.from + move.to + (move.promotion ?? '');
let engine, state, player, frozenIdentity, peakCombinedMiB = 0, lastSample = 0, childRSS = 0;
const started = performance.now();
const cpuStart = process.cpuUsage();
function guard() {
  if (engine?.child.pid && performance.now() - lastSample >= 2000) {
    lastSample = performance.now();
    childRSS = process.platform === 'win32'
      ? Number(execFileSync('powershell.exe', ['-NoProfile', '-Command', `(Get-Process -Id ${engine.child.pid} -ErrorAction Stop).WorkingSet64`], { windowsHide: true, timeout: 10000, encoding: 'utf8' }).trim())
      : Number(readFileSync(`/proc/${engine.child.pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/)?.[1]) * 1024;
    if (!Number.isFinite(childRSS)) throw Error('Cannot measure Stockfish memory');
  }
  const combined = process.memoryUsage().rss + childRSS;
  peakCombinedMiB = Math.max(peakCombinedMiB, combined / 2 ** 20);
  if (combined > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Memory guard interrupted evaluation');
}
function memoryPreflight() {
  guard();
  if (args.nova && process.memoryUsage().rss + 420 * 2 ** 20 > 768 * 2 ** 20) {
    throw Error('Nova initialization refused: less than 420 MiB RSS headroom remains under the 768 MiB guard');
  }
}
const pace = async ms => { guard(); await new Promise(resolve => setTimeout(resolve, Math.max(1, ms))); guard(); };
function identity() {
  const value = player.identity();
  if (!value || typeof value !== 'object' || value instanceof Promise) throw Error('Adapter identity must be a synchronous object');
  return digest(value);
}
function frozen() { if (identity() !== frozenIdentity) throw Error('Fly persistent identity changed during evaluation'); }
function save() {
  state.resources = { invocation: process.argv, elapsedSeconds: (performance.now() - started) / 1000,
    cpuMicroseconds: process.cpuUsage(cpuStart), peakCombinedMiB, nodePeakRSSMiB: process.resourceUsage().maxRSS / 1024,
    opponentChildRSS: 'Sampled every >=2 seconds when the opponent uses a child process; otherwise included in Node RSS', hostname: os.hostname() };
  atomic(join(out, 'state.json'), state);
  atomic(join(out, 'result.json'), ratingReport(state));
}
// Pin all live module sources; imported local adapter dependencies must also be
// declared in files. No changes to active or archived experiment sources.
async function sourcePins(dir, result = {}) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await sourcePins(path, result);
    else if (entry.name.endsWith('.mjs')) result[resolve(path)] = await sha256(path);
  }
  return result;
}
guard();
// An exclusive repository lock serializes FlyBench instances. This is not proof
// that other graph experiments are absent; check authoritative processes first.
const lockPath = resolve('.cache/flybench.lock');
mkdirSync(resolve('.cache'), { recursive: true });
const lock = openSync(lockPath, 'wx');
writeFileSync(lock, JSON.stringify({ pid: process.pid, out, started: new Date().toISOString() }));
try {
  mkdirSync(out, { recursive: true });
  const recordEngine = (direction, line) => appendFileSync(join(out, args.nova ? 'engine.jsonl' : 'uci.jsonl'), JSON.stringify({ direction, line }) + '\n');
  engine = args.nova ? new NovaOpponent(enginePath, { seed, record: recordEngine })
    : new StockfishOpponent(enginePath, { timeout: moveMs + 30000, record: recordEngine });
  if (args.nova) memoryPreflight();
  await engine.initialize();
  guard();
  let factory;
  if (args.adapter) {
    factory = (await import(pathToFileURL(resolve(args.adapter)).href)).createPlayer;
    if (typeof factory !== 'function') throw Error('Adapter must export createPlayer');
    player = await factory({ seed, pace, guard });
  } else {
    const graphPath = resolve('.cache/full.npz');
    guard();
    if (await sha256(graphPath) !== graphHash) throw Error('Graph checksum mismatch');
    const fly = createUntrainedFly(loadGraph(graphPath), seed);
    const paramsHash = () => {
      const hash = createHash('sha256');
      for (const array of Object.values(fly.params)) hash.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
      return hash.digest('hex');
    };
    player = { name: `Untrained fly seed ${seed}`, files: [graphPath],
      identity: () => ({ graph: graphHash, model: fly.config, parameters: paramsHash(), memory: 'none',
        encoder: 'encodeFen', readout: 'random head output 0, White perspective', policy: 'unaided one-ply all-legal' }),
      reset: async () => {}, choose: game => chooseFlyMove(fly, game, pace) };
  }
  if (!player?.name || !Array.isArray(player.files) || !player.files.length || typeof player.reset !== 'function' || typeof player.choose !== 'function') throw Error('Invalid player adapter');
  frozenIdentity = identity();
  for (const key of ['graph', 'model', 'memory', 'encoder', 'readout', 'policy']) if (!(key in player.identity())) throw Error(`Adapter identity lacks ${key}`);
  const pins = await sourcePins(fileURLToPath(new URL('../../src', import.meta.url)));
  pins[fileURLToPath(import.meta.url)] = await sha256(fileURLToPath(import.meta.url));
  pins[resolve('package.json')] = await sha256('package.json');
  const hashingSource = fileURLToPath(new URL('../runtime/fetch-graph.mjs', import.meta.url));
  pins[hashingSource] = await sha256(hashingSource);
  pins[resolve('package-lock.json')] = await sha256('package-lock.json');
  if (args.nova) pins[resolve('.codebase/scripts/evaluation-and-performance/fetch-nova.mjs')] = await sha256('.codebase/scripts/evaluation-and-performance/fetch-nova.mjs');
  // Stockfish may load a network from disk instead of its embedded copy.
  for (const dir of new Set([...(args.nova ? [] : [dirname(enginePath)]), resolve('.')])) {
    for (const name of readdirSync(dir)) if (name.endsWith('.nnue')) pins[join(dir, name)] = await sha256(join(dir, name));
  }
  for (const file of engine.files ?? []) pins[resolve(file)] = await sha256(file);
  if (args.adapter) pins[resolve(args.adapter)] = await sha256(resolve(args.adapter));
  for (const file of player.files) pins[resolve(file)] = await sha256(resolve(file));
  const defaults = [1320, 1500, 1700, 1900, 2100, 2300, 2500, 2700, 2900, 3190];
  let ladder = references ? references.ladder : defaults
    .filter(elo => !args.nova && elo >= engine.range[0] && elo <= engine.range[1]).map(elo => ({ elo, rating: elo, rd: 100 }));
  if (!ladder?.length || ladder.length > 100) throw Error('Invalid opponent ladder');
  for (const row of ladder) {
    if (!Number.isFinite(row.rating) || !Number.isFinite(row.rd) || row.rd < 0) throw Error('Invalid ladder entry');
    if (!args.nova && (!Number.isInteger(row.elo) || row.elo < engine.range[0] || row.elo > engine.range[1])) throw Error('Invalid Stockfish ladder entry');
    if (args.nova && row.conditioningInput !== undefined && (!Number.isInteger(row.conditioningInput) || row.conditioningInput < engine.range[0] || row.conditioningInput > engine.range[1])) throw Error('Nova conditioningInput must be between 800 and 2700');
    if (args.nova && row.conditioningInput === undefined && (!Number.isInteger(row.elo) || row.elo < engine.range[0] || row.elo > engine.range[1])) throw Error('Nova ladder rows outside 800-2700 require conditioningInput');
  }
  if (references) {
    if (!references.scale || !Array.isArray(references.evidenceFiles) || !references.evidenceFiles.length) throw Error('References require scale and evidenceFiles');
    for (const file of references.evidenceFiles) pins[resolve(file)] = await sha256(resolve(file));
  }
  const rng = random(seed);
  const openings = args.openings ? read(args.openings) : Array.from({ length: games / 2 }, () => {
    const game = new Chess(), moves = [];
    for (let i = 0; i < 6 && !game.isGameOver(); i++) { const legal = game.moves({ verbose: true }); const move = legal[Math.floor(rng() * legal.length)]; game.move(move); moves.push(uci(move)); }
    return moves;
  });
  if (!Array.isArray(openings) || openings.length !== games / 2) throw Error('One opening per colour pair is required');
  for (const opening of openings) if (!Array.isArray(opening) || opening.length > 100 || replayGame(opening).isGameOver()) throw Error('Invalid opening');
  const protocol = { version: args.nova ? 'flybench-v2' : 'flybench-v1', games, seed, initialRating: initial, initialRD: 350,
    scale: references?.scale ?? 'Nominal Stockfish-setting scale; uncalibrated against human or measured reference ratings',
    referencesMeasured: Boolean(references), ladder, openings, pins, player: player.name, identity: player.identity(),
    engine: { kind: engine.kind ?? 'stockfish-uci', name: engine.name, path: enginePath,
      sha256: await sha256(enginePath), files: engine.files ?? [], identity: engine.identity?.() ?? null,
      range: engine.range, threads: 1, hashMiB: args.nova ? null : 32, moveMs: args.nova ? null : moveMs,
      calibration: engine.ratingScale ?? 'Stockfish UCI_Elo setting; not human-calibrated in this protocol',
      rawConditioningInputs: args.nova ? ladder.map(row => ({ referenceRating: row.rating, input: row.conditioningInput ?? Math.max(engine.range[0], Math.min(engine.range[1], row.elo)) })) : null },
    maxPlies, cpuDuty: 0.5, ratingAlgorithm: 'Glicko-1 pair periods, no inactivity inflation',
    recovery: args.nova ? 'Restart unfinished game from its pinned opening; Nova sampling sequence is reseeded by protocol seed and game index' : 'Restart unfinished game with cleared engine hash and reset fly; Stockfish random state is not recoverable',
    adjudication: 'Automatic claims of threefold repetition and fifty-move draw; caps/errors are interruptions, never scores' };
  state = { protocol, rating: { rating: initial, rd: 350 }, results: [], current: null };
  if (args.resume) {
    const prior = read(args.resume);
    if (digest(prior.protocol) !== digest(protocol)) throw Error('Resume protocol/source/snapshot mismatch; pass original options');
    if (!Array.isArray(prior.results) || prior.results.length > games) throw Error('Invalid resume results');
    let recomputed = { rating: initial, rd: 350 };
    for (let i = 0; i < prior.results.length; i++) {
      const row = prior.results[i];
      if (row.index !== i || row.flyColor !== (i % 2 ? 'b' : 'w') || outcome(replayGame(openings[Math.floor(i / 2)], row.moves), row.flyColor) !== row.score) throw Error('Resume game certificate mismatch');
      const selectedReference = i % 2 ? prior.results[i - 1].opponent : nearestOpponent(ladder, recomputed.rating);
      const expected = engine.kind === 'nova-raw-policy'
        ? { ...selectedReference, conditioningInput: selectedReference.conditioningInput ?? Math.max(engine.range[0], Math.min(engine.range[1], selectedReference.elo)) }
        : selectedReference;
      if (engine.kind === 'nova-raw-policy' && (!Number.isInteger(expected.conditioningInput) || expected.conditioningInput < engine.range[0] || expected.conditioningInput > engine.range[1])) throw Error('Resume Nova conditioning input mismatch');
      if (digest(expected) !== digest(row.opponent)) throw Error('Resume opponent mismatch');
      if (i % 2) recomputed = updateRating(recomputed, prior.results.slice(i - 1, i + 1).map(r => {
        const { conditioningInput, input, ...reference } = r.opponent;
        return { ...reference, score: r.score };
      }));
    }
    if (digest(recomputed) !== digest(prior.rating)) throw Error('Resume rating mismatch');
    state.results = prior.results; state.rating = recomputed;
    for (const row of state.results) writeFileSync(join(out, `game-${String(row.index + 1).padStart(3, '0')}.pgn`), row.pgn + '\n');
    atomic(join(out, 'resume-input.json'), prior);
    if (prior.current) atomic(join(out, 'interrupted-game.json'), prior.current);
  }
  atomic(join(out, 'protocol.json'), protocol); save();
  for (let index = state.results.length; index < games; index++) {
    guard(); frozen(); await player.reset(); frozen();
    const opening = openings[Math.floor(index / 2)], flyColor = index % 2 ? 'b' : 'w';
    const selectedReference = index % 2 ? state.results[index - 1].opponent : nearestOpponent(ladder, state.rating.rating);
    const opponent = engine.kind === 'nova-raw-policy'
      ? { ...selectedReference, conditioningInput: selectedReference.conditioningInput ?? Math.max(engine.range[0], Math.min(engine.range[1], selectedReference.elo)) }
      : selectedReference;
    if (engine.kind === 'nova-raw-policy' && (!Number.isInteger(opponent.conditioningInput) || opponent.conditioningInput < engine.range[0] || opponent.conditioningInput > engine.range[1])) throw Error('Nova calibration ladder lacks a supported conditioning input');
    const game = replayGame(opening);
    state.current = { index, flyColor, opponent, opening, moves: [] }; save();
    await engine.newGame(engine.kind === 'nova-raw-policy' ? opponent.conditioningInput : opponent.elo, index);
    while (!game.isGameOver()) {
      if (state.current.moves.length >= maxPlies) throw Error('Ply cap reached; unfinished game has no rating score');
      guard(); frozen();
      const begin = performance.now();
      const move = game.turn() === flyColor
        ? await player.choose(replayGame(opening, state.current.moves))
        : await engine.move([...opening, ...state.current.moves], moveMs);
      frozen(); guard();
      const played = game.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
      state.current.moves.push(uci(played));
      appendFileSync(join(out, 'moves.jsonl'), JSON.stringify({ index, ply: state.current.moves.length, move: uci(played), fen: game.fen(), frozenIdentity }) + '\n');
      save();
      if (game.turn() === flyColor) await pace(performance.now() - begin);
    }
    frozen();
    const score = outcome(game, flyColor), result = score === 0.5 ? '1/2-1/2' : (score === 1) === (flyColor === 'w') ? '1-0' : '0-1';
    const opponentName = engine.kind === 'nova-raw-policy' ? `${engine.name} pool-rating ${opponent.rating} input-${opponent.conditioningInput}` : engine.name;
    game.header('Event', protocol.version === 'flybench-v2' ? 'FlyBench v2' : 'FlyBench v1', 'White', flyColor === 'w' ? player.name : opponentName,
      'Black', flyColor === 'b' ? player.name : opponentName, 'Result', result);
    state.results.push({ ...state.current, score, pgn: game.pgn(), finalFen: game.fen(), frozenIdentity });
    writeFileSync(join(out, `game-${String(index + 1).padStart(3, '0')}.pgn`), game.pgn() + '\n');
    state.current = null;
    if (index % 2) state.rating = updateRating(state.rating, state.results.slice(-2).map(row => {
      const { conditioningInput, input, ...reference } = row.opponent;
      return { ...reference, score: row.score };
    }));
    save();
    console.log(`Game ${index + 1}/${games}: ${score}; rating ${state.rating.rating.toFixed(1)}, RD ${state.rating.rd.toFixed(1)}`);
  }
  console.log(JSON.stringify(ratingReport(state), null, 2));
} catch (error) {
  if (state) { state.interruption = { message: error.message, at: new Date().toISOString() }; save(); }
  throw error;
} finally {
  try { await engine?.close(); } finally { closeSync(lock); unlinkSync(lockPath); }
}

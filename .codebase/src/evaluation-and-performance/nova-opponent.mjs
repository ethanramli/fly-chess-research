import { existsSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { random } from '../supervised-baselines/trainer.mjs';

export const NOVA_REVISION = '018627575b71c9c17e9e5cc207c1b87db057dfbc';
export const NOVA_MODEL_SHA256 = 'c2256701b1fe1d8d6a909e8c9d4765d5e034d11d75c805df4900647dc2c16422';
export const NOVA_DATA_SHA256 = '92688b422b18ba5b311b6cd42a5578bdbf2803a3c79d594d4544fe346d219086';
const piecePlane = { P: 0, N: 1, B: 2, R: 3, Q: 4, K: 5, p: 6, n: 7, b: 8, r: 9, q: 10, k: 11 };
const promotionOffset = { n: 4096, b: 8192, r: 12288 };

function encodePosition(fen) {
  const planes = new Float32Array(18 * 64);
  const [placement, turn, castling, ep] = fen.split(' ');
  for (const [row, rank] of placement.split('/').entries()) {
    let file = 0;
    for (const cell of rank) {
      if (/\d/.test(cell)) file += Number(cell);
      else { planes[piecePlane[cell] * 64 + (7 - row) * 8 + file] = 1; file++; }
    }
  }
  if (turn === 'w') planes.fill(1, 12 * 64, 13 * 64);
  for (const [i, right] of ['K', 'Q', 'k', 'q'].entries()) if (castling.includes(right)) planes.fill(1, (13 + i) * 64, (14 + i) * 64);
  if (ep !== '-') planes[17 * 64 + ep.charCodeAt(0) - 97] = 1;
  return planes;
}

function moveIndex(move) {
  const square = value => value.charCodeAt(0) - 97 + (Number(value[1]) - 1) * 8;
  return (promotionOffset[move.promotion] ?? 0) + square(move.from) * 64 + square(move.to);
}

export class NovaOpponent {
  constructor(modelPath, { seed = 47, record = () => {} } = {}) {
    this.path = resolve(modelPath);
    if (this.path.split(/[\\/]/).at(-1) !== 'nova_v3b.onnx') throw Error('Expected pinned Nova v3b ONNX file');
    this.files = [this.path, join(dirname(this.path), 'nova_v3b.onnx.data')];
    this.name = 'Nova v3b raw policy';
    this.range = [800, 2700];
    this.kind = 'nova-raw-policy';
    this.ratingScale = 'FlyBench reference-pool scale supplied via --references; Nova raw-policy input is separately logged';
    this.seed = seed;
    this.record = record;
    this.hashes = [NOVA_MODEL_SHA256, NOVA_DATA_SHA256];
    this.ort = null;
  }
  async initialize() {
    if (!this.files.every(existsSync)) throw Error('Nova weights missing; run npm run fetch:nova');
    if (os.freemem() < 256 * 2 ** 20) throw Error('Nova initialization refused: less than 256 MiB system memory is free');
    this.ort = await import('onnxruntime-web');
    this.ort.env.wasm.numThreads = 1;
    this.session = await this.ort.InferenceSession.create(this.path, {
      executionProviders: ['wasm'],
      externalData: [this.files[1]],
      graphOptimizationLevel: 'disabled',
    });
    if (!this.session.inputNames.includes('positions') || !this.session.inputNames.includes('conditioning') || this.session.outputNames.length !== 1) {
      throw Error(`Unexpected Nova ONNX inputs/outputs: ${this.session.inputNames} / ${this.session.outputNames}`);
    }
  }
  identity() {
    return { model: 'Nova v3b', revision: NOVA_REVISION, sha256: this.hashes,
      policy: 'raw policy logits sampled at temperature 1; no hosted calibration/filter',
      conditionedRatingRange: this.range, classical: 0.5, aggression: 0.5 };
  }
  newGame(conditioningInput, gameIndex = 0) {
    if (!Number.isInteger(conditioningInput) || conditioningInput < this.range[0] || conditioningInput > this.range[1]) throw Error(`Unsupported raw Nova conditioning input ${conditioningInput}`);
    this.conditioningInput = conditioningInput;
    this.rng = random((this.seed + Math.imul(gameIndex + 1, 0x9e3779b1)) >>> 0);
  }
  async move(moves) {
    const game = new Chess();
    for (const move of moves) game.move(move);
    const legal = game.moves({ verbose: true });
    if (!legal.length) throw Error('Nova called after game end');
    const position = new this.ort.Tensor('float32', encodePosition(game.fen()), [1, 18, 8, 8]);
    const conditioning = new this.ort.Tensor('float32', new Float32Array([(this.conditioningInput - 800) / 1900, 0.5, 0.5]), [1, 3]);
    this.record('in', JSON.stringify({ rawConditioningInput: this.conditioningInput, fen: game.fen() }));
    const result = await this.session.run({ positions: position, conditioning });
    const logits = result[this.session.outputNames[0]]?.data;
    if (!logits || logits.length !== 16384) throw Error('Unexpected Nova policy output');
    const candidates = legal.map(move => ({ move, logit: logits[moveIndex(move)] })).filter(row => Number.isFinite(row.logit));
    if (candidates.length !== legal.length) throw Error('Nova returned nonfinite legal-move logits');
    const max = Math.max(...candidates.map(row => row.logit));
    const weights = candidates.map(row => Math.exp(row.logit - max));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (!(total > 0) || !Number.isFinite(total)) throw Error('Nova legal-move distribution is invalid');
    let draw = this.rng() * total, selected = candidates.at(-1).move;
    for (let i = 0; i < candidates.length; i++) if ((draw -= weights[i]) < 0) { selected = candidates[i].move; break; }
    const uci = selected.from + selected.to + (selected.promotion ?? '');
    this.record('out', JSON.stringify({ move: uci, rawConditioningInput: this.conditioningInput }));
    return { from: selected.from, to: selected.to, ...(selected.promotion ? { promotion: selected.promotion } : {}) };
  }
  async close() { await this.session?.release(); }
}

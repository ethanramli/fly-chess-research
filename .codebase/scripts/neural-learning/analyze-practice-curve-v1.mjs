// Practice curve: does more practice help nearest-neighbour retrieval? Brain-free.
// Uses only the 96 practice pairs. For each size N, takes seeded random subsets of practice pairs,
// then runs leave-one-out inside each subset. Writes one JSON file and prints a table.
// Usage: node --max-old-space-size=512 analyze-practice-curve-v1.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planesWhole, planesCentred } from '../../src/neural-learning/centred-board-v1.mjs';
import { leaveOneOut } from '../../src/neural-learning/pathway-trace-analysis-v1.mjs';
import { seededShuffle } from '../../src/neural-learning/engineered-memory-task-v2.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const rel = (p) => join(root, p);
const traceDir = 'runs/engineered-memory-test-2026-11-03/pathway-trace-v1';
const paths = {
  pairs: rel('runs/restart-data-2026-11-03/pairs-train-capture/pairs.jsonl'),
  summary: rel('runs/engineered-memory-test-2026-11-03/engineered-memory-test-v2/summary.json'),
  groups: rel(`${traceDir}/groups.json`),
  boards: rel(`${traceDir}/boards.json`),
  final: rel(`${traceDir}/final.f32`),
};
const outPath = rel('runs/engineered-memory-test-2026-11-03/practice-curve-v1.json');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const KS = [3, 5];
const SIZES = [24, 48, 72, 96];
const REPEATS = 10;

// Read inputs. Pairs and split give the practice game ids in a fixed order.
const pairsBuf = readFileSync(paths.pairs);
const summaryBuf = readFileSync(paths.summary);
const groupsBuf = readFileSync(paths.groups);
const boardsBuf = readFileSync(paths.boards);
const pairs = pairsBuf.toString('utf8').trim().split('\n').map((l) => JSON.parse(l));
const { split } = JSON.parse(summaryBuf.toString('utf8'));
const experience = new Set(split.experience);
const practicePairs = pairs.filter((p) => experience.has(p.gameId));
if (practicePairs.length !== 96) throw new Error(`Expected 96 practice pairs, got ${practicePairs.length}`);
const practiceIds = practicePairs.map((p) => p.gameId);

// Pathway trace: final.f32 holds one row per board, n floats each. Read the file once.
const groups = JSON.parse(groupsBuf.toString('utf8'));
const boards = JSON.parse(boardsBuf.toString('utf8'));
const keyIndex = new Map(boards.keys.map((k, i) => [k, i]));
const n = boards.n;
const finalBuf = readFileSync(paths.final);
if (finalBuf.length % 4 !== 0 || finalBuf.byteOffset % 4 !== 0) throw new Error('final.f32 not aligned for Float32');
const finalF32 = new Float32Array(finalBuf.buffer, finalBuf.byteOffset, finalBuf.length / 4);
if (finalF32.length !== boards.keys.length * n) throw new Error('final.f32 size does not match boards.json');

// Pull one description's vector per board, using only the group's indices (mode 'none', no scaling).
function traceVector(gameKey, group) {
  const b = keyIndex.get(gameKey);
  if (b === undefined) throw new Error(`Missing trace board ${gameKey}`);
  const out = new Float64Array(group.length);
  group.forEach((idx, j) => {
    out[j] = finalF32[b * n + idx];
  });
  return out;
}

// Build { good, bad } for every practice id, keyed in practiceIds order.
function describeAll(vectorOf) {
  return practicePairs.map((p) => ({ good: vectorOf(p, 'good'), bad: vectorOf(p, 'bad') }));
}

const descriptions = {
  whole: describeAll((p, side) => planesWhole(p[side].fen, p.move)),
  centred: describeAll((p, side) => planesCentred(p[side].fen, p.move)),
  kc: describeAll((p, side) => traceVector(`${p.gameId}:${side}`, groups.kc)),
  photoreceptor: describeAll((p, side) => traceVector(`${p.gameId}:${side}`, groups.photoreceptor)),
};

// Mean of per-repeat fractions for one (description, k, N).
function curvePoint(pairsList, k, size) {
  const repeats = size === 96 ? 1 : REPEATS;
  const fractions = [];
  for (let r = 0; r < repeats; r++) {
    const order = seededShuffle(practiceIds.map((_, i) => i), 1000 + r).slice(0, size);
    const subset = order.map((i) => pairsList[i]);
    const { correct, total } = leaveOneOut(subset, k);
    fractions.push(correct / total);
  }
  const mean = fractions.reduce((a, b) => a + b, 0) / fractions.length;
  return { mean, repeats, fractions };
}

const results = {};
for (const [name, pairsList] of Object.entries(descriptions)) {
  results[name] = {};
  for (const k of KS) {
    results[name][k] = {};
    for (const size of SIZES) {
      results[name][k][size] = curvePoint(pairsList, k, size);
    }
  }
}

// Plain table: rows are description and k, columns are N.
console.log('description    k  ' + SIZES.map((s) => `N=${String(s).padEnd(6)}`).join(' '));
for (const name of Object.keys(results)) {
  for (const k of KS) {
    const cells = SIZES.map((s) => results[name][k][s].mean.toFixed(3).padEnd(8));
    console.log(`${name.padEnd(14)} ${String(k).padEnd(2)} ${cells.join(' ')}`);
  }
}

const doc = {
  inputs: {
    pairsSha256: sha256(pairsBuf),
    summarySha256: sha256(summaryBuf),
    groupsSha256: sha256(groupsBuf),
    boardsSha256: sha256(boardsBuf),
    finalSha256: sha256(finalBuf),
  },
  design: { sizes: SIZES, repeats: REPEATS, seeds: 'seededShuffle(seed = 1000 + r); N=96 uses one repeat', ks: KS, mode: 'none' },
  results,
};
mkdirSync(rel('runs/engineered-memory-test-2026-11-03'), { recursive: true });
writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
console.log(`Wrote ${outPath}`);

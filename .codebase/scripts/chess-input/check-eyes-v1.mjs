// Static check of the frozen eyes-v1 interface: geometry, piece separation and
// three hand-written example stimulations. Hashes the graph file; never loads it
// as a graph and never simulates.
import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { crc32, deflateSync } from 'node:zlib';
import { createEyesV1, loadRetina } from '../../src/chess-input/eyes-v1.mjs';

const GRAPH_REL = '.cache/full.npz';
const GRAPH = fileURLToPath(new URL(`../../../${GRAPH_REL}`, import.meta.url));
const TYPES = [...'pnbrqk'];
const TILE = 48;
const PANEL = 8 * (TILE + 1) - 1; // 8 tiles with one 1 px line between neighbours
const GAP = 16;
const LINE = [70, 80, 100];
const BACKGROUND = [18, 24, 38];
const EXAMPLES = [
  { name: 'white-opening', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', action: 'e2e4' },
  { name: 'black-reply', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', action: 'e7e5' },
  { name: 'capture', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', action: 'f3e5' },
];

const { values } = parseArgs({ options: { out: { type: 'string' } } });
if (!values.out) throw new Error('usage: node check-eyes-v1.mjs --out <dir>');
const outDir = values.out;

const hash = createHash('sha256');
for await (const chunk of createReadStream(GRAPH)) hash.update(chunk);

const retina = loadRetina(GRAPH);
const eyes = createEyesV1(retina);
const n = retina.retina_idx.length;
const uv = retina.retina_uv;

const r4 = (x) => Math.round(x * 1e4) / 1e4;
const squareName = (s) => String.fromCharCode(97 + (s % 8)) + (Math.floor(s / 8) + 1);
const mean = (xs) => xs.reduce((sum, v) => sum + v, 0) / xs.length;
const QUANTILE = { min: 0, p5: 0.05, median: 0.5, max: 1 };

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  return sorted[lo] + (sorted[Math.ceil(pos)] - sorted[lo]) * (pos - lo);
}

function spread(xs, keys) {
  const sorted = Float64Array.from(xs).sort();
  return Object.fromEntries(keys.map((k) => [k, r4(quantile(sorted, QUANTILE[k]))]));
}

// Photoreceptor indices grouped by square (retina_square gives each one's square).
const bySquare = Array.from({ length: 64 }, () => []);
for (let k = 0; k < n; k++) bySquare[retina.retina_square[k]].push(k);
const squareCounts = bySquare.map((ks) => ks.length);
const squareColumns = bySquare.map(
  (ks) => new Set(ks.map((k) => `${uv[2 * k]},${uv[2 * k + 1]}`)).size,
);

const ink = Object.fromEntries(TYPES.map((t) => [t, eyes.pictureInk(t)]));
const pairs = [];
for (let s = 0; s < 64; s++) {
  const ks = bySquare[s];
  if (ks.length === 0) throw new Error(`square ${squareName(s)} has no photoreceptors`);
  for (let i = 0; i < TYPES.length; i++) {
    for (let j = i + 1; j < TYPES.length; j++) {
      const a = ink[TYPES[i]];
      const b = ink[TYPES[j]];
      let sum = 0;
      for (const k of ks) sum += Math.abs(a[k] - b[k]);
      pairs.push({ square: squareName(s), a: TYPES[i], b: TYPES[j], value: sum / ks.length });
    }
  }
}
const worst = [...pairs]
  .sort((x, y) => x.value - y.value)
  .slice(0, 5)
  .map((p) => ({ ...p, value: r4(p.value) }));
const meanInk = Object.fromEntries(TYPES.map((t) => [t, r4(mean(ink[t]))]));

const cellRects = eyes.cells(); // x0,x1,y0,y1 per photoreceptor, y down
const kOf = new Map(Array.from(retina.retina_idx, (index, k) => [index, k]));
const stimuli = EXAMPLES.map((ex) => eyes.encode(ex.fen, ex.action).stimulation);
const examples = EXAMPLES.map((ex, p) => {
  const currents = stimuli[p].map((s) => s.current);
  const maxCurrent = Math.max(0, ...currents);
  if (maxCurrent > 1.5 + 1e-6) throw new Error(`${ex.name}: current ${maxCurrent} exceeds the 1.5 bound`);
  return {
    ...ex,
    drivenPhotoreceptors: currents.filter((c) => c > 0).length,
    totalCurrent: r4(currents.reduce((sum, c) => sum + c, 0)),
    maxCurrent: r4(maxCurrent),
  };
});

// Weighted overlap of two stimulations: 1 = identical input, 0 = nothing shared.
function overlap(a, b) {
  const other = new Map(b.map((s) => [s.index, s.current]));
  let shared = 0;
  let total = 0;
  for (const { index, current } of a) {
    const y = other.get(index) ?? 0;
    shared += Math.min(current, y);
    total += Math.max(current, y);
    other.delete(index);
  }
  for (const y of other.values()) total += y;
  return r4(shared / total);
}
const sameBoardMoves = [
  ['e2e4', 'd2d4'],
  ['e2e4', 'g1f3'],
].map(([a, b]) => ({ a, b, overlap: overlap(eyes.encode(EXAMPLES[0].fen, a).stimulation, eyes.encode(EXAMPLES[0].fen, b).stimulation) }));

// Square-major pixel grid. -1 marks an untouched pixel so the background shows
// through; overlapping cells keep the brighter value.
const clip = (v) => Math.min(TILE, Math.max(0, v));
function fillGrid(stimulation) {
  const grid = new Int16Array(64 * TILE * TILE).fill(-1);
  for (const { index, current } of stimulation) {
    const k = kOf.get(index);
    if (k === undefined) throw new Error(`stimulation index ${index} is not in retina_idx`);
    const base = retina.retina_square[k] * TILE * TILE;
    const grey = Math.round((255 * current) / 1.5);
    const x0 = clip(Math.floor(cellRects[4 * k] * TILE));
    const x1 = clip(Math.ceil(cellRects[4 * k + 1] * TILE));
    const y0 = clip(Math.floor(cellRects[4 * k + 2] * TILE));
    const y1 = clip(Math.ceil(cellRects[4 * k + 3] * TILE));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const at = base + y * TILE + x;
        grid[at] = Math.max(grid[at], grey);
      }
    }
  }
  return grid;
}

const W = 3 * PANEL + 2 * GAP;
const H = PANEL;
const rgb = Buffer.alloc(W * H * 3); // gaps between panels stay black
function paint(x, y, [r, g, b]) {
  const o = (y * W + x) * 3;
  rgb[o] = r;
  rgb[o + 1] = g;
  rgb[o + 2] = b;
}
stimuli.forEach((stimulation, p) => {
  const grid = fillGrid(stimulation);
  const ox = p * (PANEL + GAP);
  for (let y = 0; y < PANEL; y++) for (let x = 0; x < PANEL; x++) paint(ox + x, y, LINE);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const base = ((7 - row) * 8 + col) * TILE * TILE; // rank 8 on top, file a on the left
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const v = grid[base + y * TILE + x];
          paint(ox + col * (TILE + 1) + x, row * (TILE + 1) + y, v < 0 ? BACKGROUND : [v, v, v]);
        }
      }
    }
  }
});

// Minimal 8-bit RGB PNG: filter byte 0 on every row.
const stride = W * 3;
const raw = Buffer.alloc((stride + 1) * H);
for (let y = 0; y < H; y++) rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type RGB
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', deflateSync(raw)),
  pngChunk('IEND', Buffer.alloc(0)),
]);

const report = {
  graph: { path: GRAPH_REL, sha256: hash.digest('hex') },
  identity: eyes.identity,
  config: eyes.config,
  photoreceptors: n,
  perSquare: {
    photoreceptors: spread(squareCounts, ['min', 'median', 'max']),
    distinctColumns: spread(squareColumns, ['min', 'median', 'max']),
  },
  pieceSeparation: {
    ...spread(pairs.map((p) => p.value), ['min', 'p5', 'median']),
    worst,
  },
  meanInk,
  examples,
  sameBoardMoves,
  boardsNotUsed: 'Examples are hand-written fixtures. No training, development or locked puzzle was read.',
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'check.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(outDir, 'eye-view.png'), png);
console.log(
  JSON.stringify({
    out: outDir,
    photoreceptors: n,
    graphSha256: report.graph.sha256,
    pieceSeparationMin: report.pieceSeparation.min,
    drivenPhotoreceptors: Object.fromEntries(examples.map((e) => [e.name, e.drivenPhotoreceptors])),
  }),
);

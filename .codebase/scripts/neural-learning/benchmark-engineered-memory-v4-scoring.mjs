// Memory v4 scoring benchmark (synthetic only: random vectors, no graph, retina or chess data). Times frozenScores on a full NearestEpisodeMemory (capacity 2048, k 3) and a 100 x 5177 Float32 cache round trip. Design: documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md section 9.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { NearestEpisodeMemory } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';

const DIM = 5177, STORED = 1552, CAPACITY = 2048, K = 3;
const POSITIONS = 10, QUERIES = 37; // timed positions, moves per position
const TEST_POSITIONS = 184, SCORED_ARM_SEEDS = 21; // 7 scored arms x 3 seeds (none scores nothing)
const CACHE_ROWS = 100;
const round = x => Number(x.toFixed(3));

const rng = mulberry32(20261104);
const randomVector = () => Float64Array.from({ length: DIM }, () => rng() * 2 - 1);
const rssMiB = () => process.memoryUsage().rss / 2 ** 20;
let peakRssMiB = rssMiB();

const memory = new NearestEpisodeMemory({ capacity: CAPACITY, k: K });
for (let i = 0; i < STORED; i++) memory.write(randomVector(), rng() < 0.5 ? 1 : -1, `bench-${i}`);
memory.fingerprint(); // a real run computes this once per store, outside the per-position time

let worstQueryMs = 0;
// One position: frozenScores over QUERIES random candidate vectors (forward, then reverse).
function timeOnePosition(p) {
  const queries = new Map(Array.from({ length: QUERIES }, (_, i) => [`p${p}-q${i}`, randomVector()]));
  const score = id => {
    const t0 = performance.now();
    const s = memory.score(queries.get(id));
    worstQueryMs = Math.max(worstQueryMs, performance.now() - t0);
    return s;
  };
  const t0 = performance.now();
  frozenScores([...queries.keys()], score, () => memory.fingerprint());
  return performance.now() - t0;
}

timeOnePosition(0); // warm-up, not reported
worstQueryMs = 0;
const timings = Array.from({ length: POSITIONS }, (_, p) => timeOnePosition(p + 1));
const msPerPosition = timings.reduce((a, b) => a + b, 0) / POSITIONS;
peakRssMiB = Math.max(peakRssMiB, rssMiB());

// Cache round trip in the OS temp folder, removed afterwards.
const dir = mkdtempSync(join(tmpdir(), 'memory-v4-bench-'));
let cache;
try {
  const file = join(dir, 'cache.f32');
  const block = Float32Array.from({ length: CACHE_ROWS * DIM }, () => rng() * 2 - 1);
  const bytes = Buffer.from(block.buffer, block.byteOffset, block.byteLength);
  let t0 = performance.now();
  writeFileSync(file, bytes);
  const writeMs = performance.now() - t0;
  t0 = performance.now();
  const onDisk = readFileSync(file);
  const back = new Float32Array(onDisk.buffer.slice(onDisk.byteOffset, onDisk.byteOffset + onDisk.byteLength));
  const readMs = performance.now() - t0;
  cache = { rows: CACHE_ROWS, bytes: bytes.length, writeMs: round(writeMs), readMs: round(readMs), bitwiseEqual: Buffer.compare(bytes, Buffer.from(back.buffer)) === 0, rssMiB: round(rssMiB()) };
} finally {
  rmSync(dir, { recursive: true, force: true });
}
peakRssMiB = Math.max(peakRssMiB, rssMiB());

console.log(JSON.stringify({
  msPerPosition: round(msPerPosition),
  worstQueryMs: round(worstQueryMs),
  projectedMinutesFor21ArmSeeds: round(msPerPosition * TEST_POSITIONS * SCORED_ARM_SEEDS / 60000),
  peakRssMiB: round(Math.max(peakRssMiB, process.resourceUsage().maxRSS / 1024)),
  cache,
}, null, 2));

// Memory v6 data (2026-11-05): test-set exclusion and read-only rows from pinned KC cache folders. Pure: no brain, no writes. Protocol: documentation/design/neural-learning/memory-v6-proposal-2026-11-05.md sections 2 and 5.
import { closeSync, openSync, readFileSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { positionId } from './engineered-memory-task-v3.mjs';

export const COLUMNS = 5177;

const board = p => p.fen.split(' ')[0];

// Generator order is kept. A board used by practice gives the reason 'practice-board' even when it is also an earlier test board.
export function buildTestSet({ newPositions, practiceBoards, earlierTestBoards }) {
  const practice = new Set(practiceBoards);
  const earlier = new Set(earlierTestBoards);
  const seen = new Set();
  const freshTest = [];
  const excluded = [];
  for (const p of newPositions) {
    const id = positionId(p);
    if (seen.has(id)) throw Error(`Duplicate position id in newPositions: ${id}`);
    seen.add(id);
    const b = board(p);
    if (practice.has(b)) excluded.push({ id, reason: 'practice-board' });
    else if (earlier.has(b)) excluded.push({ id, reason: 'earlier-test-board' });
    else freshTest.push(id);
  }
  return { freshTest, excluded };
}

// keys.json row 0 is 'blank'; keys start at row 1. Same layout as memory-v5-data.mjs.
function loadCacheDir(dir) {
  const { rows } = JSON.parse(readFileSync(join(dir, 'keys.json'), 'utf8'));
  if (rows[0] !== 'blank') throw Error(`${dir}/keys.json: row 0 must be 'blank'`);
  const index = new Map(rows.slice(1).map((key, i) => [key, i + 1]));
  if (index.size !== rows.length - 1) throw Error(`${dir}/keys.json repeats a key`);
  return { file: join(dir, 'kc-cache.f32'), index };
}

function readRow(file, rowIndex, columns) {
  const bytes = columns * 4;
  const buf = Buffer.alloc(bytes);
  const fd = openSync(file, 'r');
  let n;
  try {
    n = readSync(fd, buf, 0, bytes, rowIndex * bytes);
  } finally {
    closeSync(fd);
  }
  if (n !== bytes) throw Error(`${file}: row ${rowIndex} is missing or truncated`);
  const out = new Float32Array(columns);
  for (let j = 0; j < columns; j++) out[j] = buf.readFloatLE(j * 4);
  return out;
}

// ponytail: reopens the file per row, as memory-v5-data.mjs does; keep one fd if row reads become the bottleneck.
export function openRowsMany(dirs, { columns = COLUMNS } = {}) {
  if (dirs.length === 0) throw Error('openRowsMany needs a cache folder');
  const caches = dirs.map(loadCacheDir);
  const where = new Map();
  for (const cache of caches) {
    for (const [key, row] of cache.index) {
      if (where.has(key)) throw Error(`Key in two cache folders: ${key}`);
      where.set(key, { file: cache.file, row });
    }
  }
  return {
    row(key) {
      const hit = where.get(key);
      if (!hit) throw Error(`Unknown key: ${key}`);
      return readRow(hit.file, hit.row, columns);
    },
    blank: () => readRow(caches[0].file, 0, columns),
    keys: () => [...where.keys()],
  };
}

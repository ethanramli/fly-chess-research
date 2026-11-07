import test from 'node:test';
import assert from 'node:assert/strict';
import { closeSync, mkdtempSync, openSync, readFileSync, readSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { positionId, splitPositions } from '../../src/neural-learning/engineered-memory-task-v3.mjs';
import { COLUMNS, buildPartition, openRows, practiceOrder } from '../../src/neural-learning/memory-v5-data.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ALL_PATH = join(ROOT, 'runs/restart-data-2026-11-04/capture-choice-positions-max50-v1/positions.jsonl');
const V4_PATH = join(ROOT, 'runs/restart-data-2026-11-03/capture-choice-positions-v1/positions.jsonl');
const DRY_DIR = join(ROOT, 'runs/engineered-memory-test-2026-11-04/v4-dry-run-limit24-mask');
const ROW_BYTES = COLUMNS * 4;

const readJsonl = path => readFileSync(path, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
const board = p => p.fen.split(' ')[0];

function bytesAt(file, offset, length) {
  const buf = Buffer.alloc(length);
  const fd = openSync(file, 'r');
  try {
    assert.equal(readSync(fd, buf, 0, length, offset), length);
  } finally {
    closeSync(fd);
  }
  return buf;
}

test('partition on the real files', t => {
  const all = readJsonl(ALL_PATH);
  const v4 = readJsonl(V4_PATH);
  const part = buildPartition({ all, v4 });
  const byId = new Map(all.map(p => [positionId(p), p]));
  const v4Ids = new Set(v4.map(positionId));

  assert.equal(part.practice.length, 750);
  assert.equal(part.foldA.length + part.foldB.length, 750);
  assert.equal(new Set([...part.foldA, ...part.foldB]).size, 750, 'folds overlap');
  assert.equal(new Set(part.foldA.map(id => byId.get(id).gameId)).size, 99);

  t.diagnostic(`counts ${JSON.stringify(part.counts)}`);
  t.diagnostic(`foldBoardRepeats ${part.foldBoardRepeats}`);
  assert.equal(part.counts.all, all.length);
  assert.equal(part.counts.fresh, part.freshTest.length);
  assert.equal(part.counts.dropped, part.droppedBoardRepeats.length);

  // All 572 v4 positions are in all, identical, and the v4 practice set is in practice.
  assert.equal(v4.length, 572);
  for (const p of v4) assert.equal(JSON.stringify(byId.get(positionId(p))), JSON.stringify(p));
  const { practice: v4Practice } = splitPositions(v4, 198);
  assert.equal(v4Practice.length, 388);
  const practiceIds = new Set(part.practice);
  assert.ok(v4Practice.every(p => practiceIds.has(positionId(p))));

  // Fresh positions are new by id and by board, and are not practice boards.
  assert.ok(part.freshTest.every(id => !v4Ids.has(id)), 'fresh id in v4');
  const practiceBoards = new Set(part.practice.map(id => board(byId.get(id))));
  const v4Boards = new Set(v4.map(board));
  assert.ok(part.freshTest.every(id => !practiceBoards.has(board(byId.get(id)))), 'fresh board in practice');
  assert.ok(part.freshTest.every(id => !v4Boards.has(board(byId.get(id)))), 'fresh board in v4');

  // Practice order is deterministic and matches splitPositions on the v4 practice games.
  const once = practiceOrder(all).map(positionId);
  assert.deepEqual(practiceOrder(all).map(positionId), once);
  assert.deepEqual(practiceOrder([...all].reverse()).map(positionId), once);
  const v4Games = new Set(v4Practice.map(p => p.gameId));
  assert.deepEqual(practiceOrder(v4).filter(p => v4Games.has(p.gameId)).map(positionId), v4Practice.map(positionId));
});

test('openRows reads pinned rows by offset', () => {
  const rows = openRows({ v4Dir: DRY_DIR, v5Dir: null });
  const cache = join(DRY_DIR, 'kc-cache.f32');
  const keys = rows.keys();
  const first = keys[0];

  const got = rows.row(first);
  assert.ok(got instanceof Float32Array);
  assert.equal(got.length, COLUMNS);
  assert.ok(Buffer.from(got.buffer, got.byteOffset, got.byteLength).equals(bytesAt(cache, ROW_BYTES, ROW_BYTES)), 'first key is not row 1');

  // Rows are copies, not views of a shared buffer.
  got[0] = 12345;
  assert.notEqual(rows.row(first)[0], 12345);

  assert.ok(Buffer.from(rows.blank().buffer).equals(bytesAt(cache, 0, ROW_BYTES)), 'blank is not row 0');
  assert.throws(() => rows.row('no-such-game:1|a1'), /Unknown key/);

  const tmp = mkdtempSync(join(tmpdir(), 'memory-v5-data-'));
  try {
    writeFileSync(join(tmp, 'keys.json'), JSON.stringify({ rows: ['blank', first, 'synthetic:1|a1'] }));
    writeFileSync(join(tmp, 'kc-cache.f32'), Buffer.alloc(3 * ROW_BYTES));
    assert.throws(() => openRows({ v4Dir: DRY_DIR, v5Dir: tmp }), /both v4 and v5/);

    // A v5-only key reads from the v5 cache; v4 keys still read from v4.
    writeFileSync(join(tmp, 'keys.json'), JSON.stringify({ rows: ['blank', 'synthetic:1|a1'] }));
    writeFileSync(join(tmp, 'kc-cache.f32'), Buffer.concat([Buffer.alloc(ROW_BYTES), Buffer.from(new Float32Array(COLUMNS).fill(0.5).buffer)]));
    const mixed = openRows({ v4Dir: DRY_DIR, v5Dir: tmp });
    assert.ok(mixed.row('synthetic:1|a1').every(v => v === 0.5));
    assert.ok(Buffer.from(mixed.row(first).buffer).equals(bytesAt(cache, ROW_BYTES, ROW_BYTES)));
    assert.equal(mixed.keys().length, keys.length + 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

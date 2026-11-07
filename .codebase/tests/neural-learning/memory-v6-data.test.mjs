import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildTestSet, COLUMNS, openRowsMany } from '../../src/neural-learning/memory-v6-data.mjs';

const C = 4;
const TMP = mkdtempSync(join(tmpdir(), 'memory-v6-data-'));
after(() => rmSync(TMP, { recursive: true, force: true }));

const floats = rows => Buffer.from(Float32Array.from(rows.flat()).buffer);
function folder(name, rows, data) {
  const dir = join(TMP, name);
  mkdirSync(dir);
  writeFileSync(join(dir, 'keys.json'), JSON.stringify({ rows }));
  writeFileSync(join(dir, 'kc-cache.f32'), floats(data));
  return dir;
}
const p = (gameId, ply, fen) => ({ gameId, ply, fen });

test('buildTestSet excludes practice and earlier-test boards, practice first, and keeps generator order', () => {
  const newPositions = (function* () {
    yield p('g3', 2, 'F2 w - - 0 1');
    yield p('g1', 1, 'P1 b KQkq - 0 3'); // practice and earlier test: practice wins
    yield p('g2', 1, 'E1 w - - 0 1');
    yield p('g3', 1, 'F1 b - - 0 2');
  })();
  const got = buildTestSet({ newPositions, practiceBoards: new Set(['P1']), earlierTestBoards: new Set(['E1', 'P1']) });
  assert.deepEqual(got, {
    freshTest: ['g3:2', 'g3:1'],
    excluded: [
      { id: 'g1:1', reason: 'practice-board' },
      { id: 'g2:1', reason: 'earlier-test-board' },
    ],
  });
});

test('buildTestSet refuses a duplicate position id in newPositions', () => {
  const newPositions = [p('g1', 1, 'F1 w - - 0 1'), p('g1', 1, 'F2 w - - 0 1')];
  assert.throws(
    () => buildTestSet({ newPositions, practiceBoards: new Set(), earlierTestBoards: new Set() }),
    /Duplicate position id/,
  );
});

test('openRowsMany reads rows from three folders, takes blank from the first, and copies rows', () => {
  const A = folder('a', ['blank', 'a|m1', 'a|m2'], [[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3]]);
  const B = folder('b', ['blank', 'b|m1'], [[9, 9, 9, 9], [4, 0, 0, -4]]);
  const Cd = folder('c', ['blank', 'c|m1'], [[0, 0, 0, 0], [5, 6, 7, 8]]);
  const rows = openRowsMany([A, B, Cd], { columns: C });
  assert.deepEqual(rows.keys(), ['a|m1', 'a|m2', 'b|m1', 'c|m1']);
  assert.deepEqual(Array.from(rows.row('a|m2')), [3, 3, 3, 3]);
  assert.deepEqual(Array.from(rows.row('b|m1')), [4, 0, 0, -4]);
  assert.deepEqual(Array.from(rows.row('c|m1')), [5, 6, 7, 8]);
  assert.deepEqual(Array.from(rows.blank()), [1, 1, 1, 1]); // not B's row 0
  assert.ok(rows.row('a|m1') instanceof Float32Array);

  rows.row('a|m1')[0] = 99;
  assert.equal(rows.row('a|m1')[0], 2);
  assert.throws(() => rows.row('zz|1'), /Unknown key/);

  const overlap = folder('d', ['blank', 'a|m2'], [[0, 0, 0, 0], [7, 7, 7, 7]]);
  assert.throws(() => openRowsMany([A, overlap], { columns: C }), /two cache folders/);
});

test('openRowsMany refuses a repeated key, a folder without blank in row 0, and reads past a truncated cache', () => {
  const repeated = folder('r', ['blank', 'x|1', 'x|1'], [[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2]]);
  assert.throws(() => openRowsMany([repeated], { columns: C }), /repeats a key/);

  const noBlank = folder('n', ['x|1'], [[1, 1, 1, 1]]);
  assert.throws(() => openRowsMany([noBlank], { columns: C }), /row 0 must be 'blank'/);

  const short = folder('s', ['blank', 'x|1', 'x|2'], [[0, 0, 0, 0], [1, 1, 1, 1]]);
  const rows = openRowsMany([short], { columns: C });
  assert.deepEqual(Array.from(rows.row('x|1')), [1, 1, 1, 1]);
  assert.throws(() => rows.row('x|2'), /truncated/);
});

test('openRowsMany defaults to the 5177 columns of the v4 and v5 caches', () => {
  assert.equal(COLUMNS, 5177);
  assert.throws(() => openRowsMany([]), /needs a cache folder/);
});

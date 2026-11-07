// Memory v5 data (2026-11-05): position partition and read-only rows from pinned KC caches. Pure: no brain, no writes.
import { createHash } from 'node:crypto';
import { closeSync, openSync, readFileSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { positionId, splitPositions } from './engineered-memory-task-v3.mjs';

export const COLUMNS = 5177;

const PRACTICE_GAMES = 198;
const PRACTICE_SIZE = 750;

const sha256 = text => createHash('sha256').update(text).digest('hex');
const board = p => p.fen.split(' ')[0];

// Game ids sorted by sha256(salt + gameId), compared as hex strings.
function gameRank(gameIds, salt) {
  const key = new Map(gameIds.map(g => [g, sha256(salt + g)]));
  return [...key.keys()].sort((a, b) => (key.get(a) < key.get(b) ? -1 : key.get(a) > key.get(b) ? 1 : 0));
}

// Same order as splitPositions: game hash rank, then ply.
export function practiceOrder(positions) {
  const rank = new Map(gameRank([...new Set(positions.map(p => p.gameId))], 'engineered-memory-v3-split:').map((g, i) => [g, i]));
  return [...positions].sort((a, b) => rank.get(a.gameId) - rank.get(b.gameId) || a.ply - b.ply);
}

export function buildPartition({ all, v4 }) {
  const allById = new Map(all.map(p => [positionId(p), p]));
  if (allById.size !== all.length) throw Error('Duplicate position id in all');
  for (const p of v4) {
    const q = allById.get(positionId(p));
    if (!q || JSON.stringify(q) !== JSON.stringify(p)) throw Error(`v4 position missing or not identical in all: ${positionId(p)}`);
  }
  const v4Ids = new Set(v4.map(positionId));
  const v4Boards = new Set(v4.map(board));

  const { practice: v4Practice, test: v4Test } = splitPositions(v4, PRACTICE_GAMES);
  const practiceGames = new Set(v4Practice.map(p => p.gameId));
  const testGames = new Set(v4Test.map(p => p.gameId));

  const practicePos = practiceOrder(all.filter(p => practiceGames.has(p.gameId)));
  if (practicePos.length !== PRACTICE_SIZE) throw Error(`Practice has ${practicePos.length} positions, expected ${PRACTICE_SIZE}`);
  const practiceBoards = new Set(practicePos.map(board));

  // Folds: practice games in hash order; the first half is fold A.
  const games = gameRank([...practiceGames], 'memory-v5-fold:');
  const foldAGames = new Set(games.slice(0, Math.floor(games.length / 2)));
  const foldAPos = practicePos.filter(p => foldAGames.has(p.gameId));
  const foldBPos = practicePos.filter(p => !foldAGames.has(p.gameId));
  const foldABoards = new Set(foldAPos.map(board));
  const foldBoardRepeats = foldBPos.filter(p => foldABoards.has(board(p))).length;

  // Fresh test: held-out games, new ids and new boards, minus boards already in practice.
  const candidates = practiceOrder(all.filter(p => testGames.has(p.gameId) && !v4Ids.has(positionId(p)) && !v4Boards.has(board(p))));
  const dropped = candidates.filter(p => practiceBoards.has(board(p)));
  const fresh = candidates.filter(p => !practiceBoards.has(board(p)));

  const ids = list => list.map(positionId);
  return {
    practice: ids(practicePos),
    foldA: ids(foldAPos),
    foldB: ids(foldBPos),
    freshTest: ids(fresh),
    droppedBoardRepeats: ids(dropped),
    foldBoardRepeats,
    counts: {
      all: all.length,
      practice: practicePos.length,
      foldA: foldAPos.length,
      foldB: foldBPos.length,
      fresh: fresh.length,
      dropped: dropped.length,
    },
  };
}

// keys.json row 0 is 'blank'; keys start at row 1.
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

export function openRows({ v4Dir, v5Dir = null, columns = COLUMNS }) {
  const v4 = loadCacheDir(v4Dir);
  const dirs = [v4];
  if (v5Dir) {
    const v5 = loadCacheDir(v5Dir);
    for (const key of v5.index.keys()) if (v4.index.has(key)) throw Error(`Key in both v4 and v5 caches: ${key}`);
    dirs.push(v5);
  }
  return {
    row(key) {
      const dir = dirs.find(d => d.index.has(key));
      if (!dir) throw Error(`Unknown key: ${key}`);
      return readRow(dir.file, dir.index.get(key), columns);
    },
    blank: () => readRow(v4.file, 0, columns),
    keys: () => dirs.flatMap(d => [...d.index.keys()]),
  };
}

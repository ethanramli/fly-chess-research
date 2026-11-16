// Constructed development positions adapted from the November 16 roadmap checks.
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { certifyLandingSquare } from '../search-and-feedback/landing-square-certificate.mjs';
import {
  SQUARES, coordinates as xy, squareAt as name, DIRECTIONS as DIRS, opposite,
  legalCandidates, recordsForCandidate, combine, singleConceptNumbers,
} from '../search-and-feedback/concept-records-v1.mjs';

export const PAIR_TYPES = [
  'which attacker is pinned',
  'shared defender: pinned or free',
  'shared defender: free or elsewhere',
];

const FILES = 'abcdefgh';

function fenOf(map) {
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    let row = '', empty = 0;
    for (const f of FILES) { const c = map.get(f + r); if (c) { row += (empty || '') + c; empty = 0; } else empty++; }
    rows.push(row + (empty || ''));
  }
  return `${rows.join('/')} w - - 0 1`;
}
const pawnOk = (char, square) => char.toLowerCase() !== 'p' || (square[1] !== '1' && square[1] !== '8');
const emptySquares = map => SQUARES.filter(s => !map.has(s));
// Squares a piece of this type on q attacks, given the pieces in map (pure geometry; pawns are white when the letter is upper case).
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
function attacksOnMap(map, q, char) {
  const [x, y] = xy(q), type = char.toLowerCase(), out = [];
  const step = (dx, dy) => { const t = name(x + dx, y + dy); if (t) out.push(t); };
  const ray = (dx, dy) => { for (let k = 1; k < 8; k++) { const t = name(x + k * dx, y + k * dy); if (!t) break; out.push(t); if (map.has(t)) break; } };
  if (type === 'p') { const dy = char === 'P' ? 1 : -1; step(1, dy); step(-1, dy); }
  if (type === 'n') KNIGHT.forEach(([dx, dy]) => step(dx, dy));
  if (type === 'k') DIRS.forEach(([dx, dy]) => step(dx, dy));
  if (type === 'r' || type === 'q') DIRS.slice(0, 4).forEach(([dx, dy]) => ray(dx, dy));
  if (type === 'b' || type === 'q') DIRS.slice(4).forEach(([dx, dy]) => ray(dx, dy));
  return out;
}
// Squares from which a white piece of this type would attack t on this board.
const attackFrom = (map, char, t) => emptySquares(map).filter(q => pawnOk(char, q) && attacksOnMap(map, q, char).includes(t));

const CROSSOVERS = [['R', 'r', 'P', 'n'], ['R', 'r', 'P', 'b'], ['Q', 'q', 'P', 'n'], ['Q', 'q', 'P', 'r'], ['Q', 'q', 'N', 'r'], ['Q', 'q', 'B', 'r'], ['Q', 'r', 'P', 'n'], ['Q', 'r', 'P', 'b']];
const EQUAL_TAKES = [['N', 'p'], ['B', 'p'], ['R', 'p'], ['R', 'n'], ['R', 'b'], ['Q', 'n'], ['Q', 'r']];

function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function legalStart(fen) {
  const fields = fen.split(' ');
  const board = new Chess(fen);
  fields[1] = opposite(board.turn());
  fields[3] = '-';
  return !board.inCheck() && !new Chess(fields.join(' ')).inCheck();
}

export function matchRows(fen) {
  return legalCandidates(fen).map(candidate => {
    const records = recordsForCandidate(candidate);
    return { move: candidate.move, records, score: combine(records).score, candidate };
  });
}

export function checkerRows(fen, rows) {
  const board = new Chess(fen);
  return rows.map(row => {
    const { certificate } = certifyLandingSquare(board, row.move);
    if (!certificate) throw Error(`Checker returned no answer for ${row.move} on ${fen}`);
    const { capturedValue, moverValue, recaptures, replies } = certificate;
    return {
      ...row,
      checker: capturedValue - (recaptures.length ? moverValue : 0),
      capturedValue,
      moverValue,
      recaptureCount: recaptures.length,
      replyCount: replies.length,
    };
  });
}

export function sameFixedSumDifference(rows, first, second) {
  function difference(items) {
    const a = items.find(row => row.move === first);
    const b = items.find(row => row.move === second);
    if (!a || !b) return null;
    const from = singleConceptNumbers(a.records);
    const to = singleConceptNumbers(b.records);
    return from.map((value, i) => value - to[i]);
  }
  const a = difference(rows[0]);
  const b = difference(rows[1]);
  return a !== null && b !== null && a.every((value, i) => value === b[i]);
}

export function isNamedFlip(fens, rows, bestMoves, type, { legacyPinScope = false } = {}) {
  const [before, after] = fens.map(fen => new Chess(fen));
  const samePiece = (a, b) => a?.type === b?.type && a?.color === b?.color;
  const changed = SQUARES.filter(square => !samePiece(before.get(square), after.get(square)));
  if (changed.length !== 2 || before.turn() !== after.turn()) return false;
  const from = changed.find(square => before.get(square) && !after.get(square));
  const to = changed.find(square => after.get(square) && !before.get(square));
  if (!from || !to || !samePiece(before.get(from), after.get(to))) return false;
  const piece = before.get(from);
  if (piece.color !== opposite(before.turn())) return false;

  const movedDefender = type === PAIR_TYPES[2];
  if (movedDefender === (piece.type === 'k')) return false;
  const held = (records, piece) => records.pins.some(pin =>
    pin.piece === piece && !pin.line.includes(records.to));
  const freed = [];
  const newlyHeld = [];
  for (const move of bestMoves) {
    const [first, second] = rows.map(boardRows => boardRows.find(row => row.move === move)?.records);
    if (!first || !second) return false;
    const firstReach = first.reach.map(record => record.piece).sort();
    const secondReach = second.reach.map(record => record.piece).sort();
    if (movedDefender) {
      if (!firstReach.includes(from) || secondReach.includes(to) || held(first, from)) return false;
      const retained = firstReach.filter(square => square !== from);
      if (retained.join() !== secondReach.join() ||
          retained.some(square => held(first, square) !== held(second, square))) return false;
    } else if (firstReach.join() !== secondReach.join()) {
      return false;
    }
    freed.push(firstReach.filter(square => held(first, square) && !held(second, square)));
    newlyHeld.push(firstReach.filter(square => !held(first, square) && held(second, square)));
  }

  if (movedDefender || legacyPinScope) return true;
  if (type === PAIR_TYPES[1]) return freed[0].some(square => freed[1].includes(square));
  return freed[0].some(square => newlyHeld[1].some(other => square !== other));
}

export function splitForFamily(family) {
  const hash = createHash('sha256').update(`fly-combination-split-v1:${family}`).digest();
  return hash[0] < 128 ? 'development' : 'held-back development';
}

export function canonicalBoard(fen) {
  const board = new Chess(fen);
  const variants = [];
  for (const mirrorFile of [false, true]) {
    for (const swapColor of [false, true]) {
      const cells = SQUARES.map(square => {
        const [x, y] = xy(square);
        const piece = board.get(name(mirrorFile ? 7 - x : x, swapColor ? 7 - y : y));
        if (!piece) return '.';
        const color = swapColor ? opposite(piece.color) : piece.color;
        return color === 'w' ? piece.type.toUpperCase() : piece.type;
      }).join('');
      variants.push((swapColor ? opposite(board.turn()) : board.turn()) + cells);
    }
  }
  return variants.sort()[0];
}

export function generateFlipPairs({ seed = 20261117, pairsPerType = 20, maxAttempts = 400000 } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff ||
      !Number.isSafeInteger(pairsPerType) || pairsPerType < 1 ||
      !Number.isSafeInteger(maxAttempts) || maxAttempts < 1)
    throw Error('Expected an unsigned 32-bit seed and positive integer pair and attempt limits');

  const rand = seededRandom(seed);
  const pick = list => list[Math.floor(rand() * list.length)];
  const takenBoards = new Set();
  const pairs = [];
  const counts = {};
  let rejections;

  function no(reason) {
    rejections[reason] = (rejections[reason] ?? 0) + 1;
    return null;
  }

  function certify(fenA, fenB, first, second, type) {
    const fens = [fenA, fenB];
    if (!fens.every(legalStart)) return no('a king starts in check');
    const boards = fens.map(matchRows);
    const bestMoves = [first, second];
    for (const [i, rows] of boards.entries()) {
      const intended = rows.find(row => row.move === bestMoves[i]);
      const alternative = rows.find(row => row.move === bestMoves[1 - i]);
      if (!intended || !alternative) return no('an intended capture is not legal on both boards');
      if (intended.score <= 0 || intended.score <= alternative.score)
        return no('the intended captures do not swap order');
      if (rows.some(row => row.move !== intended.move && row.score >= intended.score))
        return no('the intended move is not uniquely best by a pawn or more');
    }

    if (!isNamedFlip(fens, boards, bestMoves, type))
      return no('the edit changes other reach facts or misses the named fact');
    const checked = fens.map((fen, i) => checkerRows(fen, boards[i]));
    if (checked.some(rows => rows.some(row => row.score !== row.checker)))
      return no('the match step disagrees with the checker');
    if (!sameFixedSumDifference(checked, first, second))
      return no('the two best moves have different feature differences');
    return fens.map((fen, i) => ({ fen, best: bestMoves[i] }));
  }

  function placeWhiteKing(map) { const q = pick(emptySquares(map)); map.set(q, 'K'); }
  function addBystanders(map) {
    const n = Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) { const c = pick(['p', 'P', 'p', 'n', 'N']); const q = pick(emptySquares(map)); if (pawnOk(c, q)) map.set(q, c); }
  }
  function pinLine(map, pinner) {
    const [dx, dy] = pick(DIRS), diagonal = dx !== 0 && dy !== 0;
    const p = pick(emptySquares(map)), [px, py] = xy(p), i = 1 + Math.floor(rand() * 4), j = 1 + Math.floor(rand() * 3);
    const s = name(px + i * dx, py + i * dy), k = name(px + (i + j) * dx, py + (i + j) * dy);
    if (!s || !k) return null;
    const between = [];
    for (let n = 1; n < i + j; n++) if (n !== i) between.push(name(px + n * dx, py + n * dy));
    if ([p, s, k, ...between].some(q => map.has(q))) return null;
    return { p, s, k, between, pinner: pinner ?? (diagonal ? pick(['B', 'B', 'Q']) : pick(['R', 'R', 'Q'])), line: [p, s, k, ...between] };
  }

  // (white taker 1, black piece 1, white taker 2, black piece 2): piece 1 is worth more, but taker 1 is so dear that being taken back makes capture 2 better.

  // One defender of both targets: pinned (king behind it) or free (king elsewhere).
  function sharedDefender(elsewhere) {
    const map = new Map(), L = pinLine(map);
    if (!L) return no('construction: line does not fit');
    const defender = pick(['n', 'n', 'b', 'r']);
    map.set(L.p, L.pinner); map.set(L.s, defender); map.set(L.k, 'k');
    placeWhiteKing(map);
    const reach = attacksOnMap(map, L.s, defender).filter(t => !map.has(t) && !L.line.includes(t));
    if (reach.length < 2) return no('construction: defender reaches fewer than two free squares');
    const t1 = pick(reach), t2 = pick(reach.filter(t => t !== t1));
    const [w1, x1, w2, x2] = pick(CROSSOVERS);
    if (!pawnOk(x1, t1) || !pawnOk(x2, t2)) return no('construction: pawn on an end rank');
    map.set(t1, x1); map.set(t2, x2);
    const from1 = attackFrom(map, w1, t1); if (!from1.length) return no('construction: no square for taker 1');
    const q1 = pick(from1); map.set(q1, w1);
    const from2 = attackFrom(map, w2, t2); if (!from2.length) return no('construction: no square for taker 2');
    const q2 = pick(from2); map.set(q2, w2);
    addBystanders(map);
    const freeMap = new Map(map); freeMap.delete(L.k);
    const k2 = pick(emptySquares(freeMap).filter(q => !L.line.includes(q))); freeMap.set(k2, 'k');
    if (!elsewhere) {
      const pair = certify(fenOf(map), fenOf(freeMap), q1 + t1, q2 + t2, PAIR_TYPES[1]);
      return pair && { changedFact: `black king ${L.k} -> ${k2}`, boards: pair };
    }

    const moved = new Map(freeMap);
    moved.delete(L.s);
    const alternatives = emptySquares(moved).filter(square => {
      if (square === L.s) return false;
      const targets = attacksOnMap(moved, square, defender);
      return !targets.includes(t1) && !targets.includes(t2);
    });
    if (!alternatives.length) return no('construction: no square away from both targets');
    const s2 = pick(alternatives);
    moved.set(s2, defender);
    const pair = certify(fenOf(freeMap), fenOf(moved), q2 + t2, q1 + t1, PAIR_TYPES[2]);
    return pair && { changedFact: `black ${defender} ${L.s} -> ${s2}`, boards: pair };
  }

  // Two attackers, one per target; the king stands behind one or the other.
  function whichAttacker() {
    const map = new Map(), A = pinLine(map); if (!A) return no('construction: line does not fit');
    map.set(A.p, A.pinner); map.set(A.s, 'x');
    const B = pinLine(map); if (!B) return no('construction: line does not fit');
    if ([B.p, B.s, B.k, ...B.between].some(q => A.line.includes(q))) return no('construction: lines cross');
    const typeA = pick(['n', 'n', 'b', 'r']), typeB = pick(['n', 'n', 'b', 'r']);
    map.set(A.s, typeA); map.set(B.p, B.pinner); map.set(B.s, typeB); map.set(A.k, 'k');
    placeWhiteKing(map);
    // Pawn guards so that taking a pinned attacker with its pinning piece is not simply winning a piece.
    for (const s of [A.s, B.s]) {
      const [x, y] = xy(s);
      const spots = [name(x - 1, y + 1), name(x + 1, y + 1)].filter(q => q && !map.has(q) && pawnOk('p', q) && !A.line.includes(q) && !B.line.includes(q));
      if (!spots.length) return no('construction: no square for a pawn guard');
      map.set(pick(spots), 'p');
    }
    const all = [...A.line, ...B.line];
    const reachA = attacksOnMap(map, A.s, typeA).filter(t => !map.has(t) && !all.includes(t)), reachB = attacksOnMap(map, B.s, typeB).filter(t => !map.has(t) && !all.includes(t));
    const onlyA = reachA.filter(t => !reachB.includes(t)), onlyB = reachB.filter(t => !reachA.includes(t));
    if (!onlyA.length || !onlyB.length) return no('construction: no target reached by one attacker only');
    const tA = pick(onlyA), tB = pick(onlyB), [w, x] = pick(EQUAL_TAKES);
    if (!pawnOk(x, tA) || !pawnOk(x, tB)) return no('construction: pawn on an end rank');
    map.set(tA, x); map.set(tB, x);
    const fromA = attackFrom(map, w, tA); if (!fromA.length) return no('construction: no square for taker 1');
    const qA = pick(fromA); map.set(qA, w);
    const fromB = attackFrom(map, w, tB); if (!fromB.length) return no('construction: no square for taker 2');
    const qB = pick(fromB); map.set(qB, w);
    addBystanders(map);
    const other = new Map(map); other.delete(A.k);
    if (other.has(B.k)) return no('construction: second king square is taken');
    other.set(B.k, 'k');
    const pair = certify(fenOf(map), fenOf(other), qA + tA, qB + tB, PAIR_TYPES[0]);
    return pair && { changedFact: `black king ${A.k} -> ${B.k}`, boards: pair };
  }

  const builders = [whichAttacker, () => sharedDefender(false), () => sharedDefender(true)];
  for (const [index, type] of PAIR_TYPES.entries()) {
    rejections = {};
    let attempts = 0;
    let accepted = 0;
    while (accepted < pairsPerType && attempts < maxAttempts) {
      attempts++;
      const pair = builders[index]();
      if (!pair) continue;
      const keys = pair.boards.map(board => canonicalBoard(board.fen));
      if (keys.some(key => takenBoards.has(key)) || new Set(keys).size !== keys.length) {
        no('a board repeats a family under reflection or color swap');
        continue;
      }
      keys.forEach(key => takenBoards.add(key));
      accepted++;
      const family = `${seed}:${index + 1}:${attempts}`;
      pairs.push({ id: family, family, split: splitForFamily(family), type, ...pair });
    }
    counts[type] = { accepted, attempts, rejections };
  }
  return { seed, pairsPerType, maxAttempts, counts, pairs };
}

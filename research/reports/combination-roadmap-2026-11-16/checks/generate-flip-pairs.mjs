// Design check: can flip pairs be built automatically, and do the claims made on five hand-built boards hold on them?
// Random construction, then every rule is checked with the repo's checker. No real or sealed game is read. Nothing is learned and no graph runs.
// Usage: node generate-flip-pairs.mjs [pairsPerType=30] [seed=20261116] > flip-pairs.json   (progress goes to stderr)
import { Chess, SQUARES, legalMoves, truth, recordsFor, combine, mulberry32 } from './lib.mjs';

const WANT = Number(process.argv[2] ?? 30), SEED = Number(process.argv[3] ?? 20261116);
const rand = mulberry32(SEED);
const FILES = 'abcdefgh';
const xy = s => [FILES.indexOf(s[0]), Number(s[1]) - 1];
const name = (x, y) => (x >= 0 && x < 8 && y >= 0 && y < 8 ? FILES[x] + (y + 1) : null);
const pick = list => list[Math.floor(rand() * list.length)];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function fenOf(map) {
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    let row = '', empty = 0;
    for (const f of FILES) { const c = map.get(f + r); if (c) { row += (empty || '') + c; empty = 0; } else empty++; }
    rows.push(row + (empty || ''));
  }
  return `${rows.join('/')} w - - 0 1`;
}
const boardOf = map => { try { return new Chess(fenOf(map)); } catch { return null; } };
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

const reject = {};
const no = reason => { reject[reason] = (reject[reason] ?? 0) + 1; return null; };
const features = (fen, move) => { const r = recordsFor(fen, move); return [r.reach.length, r.pins.length, r.worth.taken, r.worth.moved]; };

// Scores every legal non-king move with the checker and with the match step. Returns null with a reason when a rule fails.
function scoreBoard(fen) {
  let board;
  try { board = new Chess(fen); } catch { return { fail: 'invalid board' }; }
  if (board.inCheck()) return { fail: 'side to move is in check' };
  const parts = fen.split(' '); parts[1] = 'b';
  try { if (new Chess(parts.join(' ')).inCheck()) return { fail: 'side not to move is in check' }; } catch { return { fail: 'invalid board' }; }
  const rows = [];
  for (const move of legalMoves(fen)) {
    const t = truth(fen, move);
    if (t === null) continue;
    const joined = combine(recordsFor(fen, move)).score;
    if (joined !== t.score) return { fail: 'match step differs from the checker on some move (king reply, discovered or double check)' };
    rows.push({ move, score: t.score });
  }
  if (!rows.length) return { fail: 'no non-king move' };
  const top = Math.max(...rows.map(r => r.score)), tops = rows.filter(r => r.score === top);
  if (tops.length !== 1) return { fail: 'best move is not unique' };
  const second = Math.max(...rows.filter(r => r.score !== top).map(r => r.score), -99);
  if (top - second < 1 || top <= 0) return { fail: 'best move does not lead by a pawn or is not a gain' };
  return { best: tops[0].move, top, second, moves: rows.length };
}

// The flip rules: both boards pass, best moves differ, and the two best moves have the same single-concept numbers difference on both boards.
function certify(fenA, fenB, wantA, wantB) {
  if (wantA) {
    let pre;
    try { pre = [truth(fenA, wantA).score, truth(fenA, wantB).score, truth(fenB, wantA).score, truth(fenB, wantB).score]; } catch { return no('an intended capture is not legal'); }
    if (!(pre[0] > pre[1] && pre[0] > 0 && pre[3] > pre[2] && pre[3] > 0)) return no('the intended captures do not swap order between the boards');
  }
  const a = scoreBoard(fenA); if (a.fail) return no(a.fail);
  const b = scoreBoard(fenB); if (b.fail) return no(b.fail);
  if (a.best === b.best) return no('best move is the same on both boards');
  if (wantA && (a.best !== wantA || b.best !== wantB)) return no('best moves are not the two intended captures');
  let fa, fb;
  try { fa = [features(fenA, a.best), features(fenA, b.best)]; fb = [features(fenB, a.best), features(fenB, b.best)]; } catch { return no('a best move is not legal on the other board'); }
  const diff = f => f[0].map((x, i) => x - f[1][i]);
  const leak = JSON.stringify(diff(fa)) !== JSON.stringify(diff(fb));
  if (leak) return no('single-concept numbers differ between the boards (a fixed sum could separate them)');
  return { boards: [{ fen: fenA, best: a.best, score: a.top, next: a.second, moves: a.moves }, { fen: fenB, best: b.best, score: b.top, next: b.second, moves: b.moves }] };
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
const CROSSOVERS = [['R', 'r', 'P', 'n'], ['R', 'r', 'P', 'b'], ['Q', 'q', 'P', 'n'], ['Q', 'q', 'P', 'r'], ['Q', 'q', 'N', 'r'], ['Q', 'q', 'B', 'r'], ['Q', 'r', 'P', 'n'], ['Q', 'r', 'P', 'b']];

// One defender of both targets: pinned (king behind it) or free (king elsewhere).
function sharedDefender() {
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
  const pair = certify(fenOf(map), fenOf(freeMap), q1 + t1, q2 + t2);
  if (!pair) return null;
  // Third board: the defender stands where it reaches neither target. Best move returns to capture 1.
  let third = null;
  for (let tries = 0; tries < 12 && !third; tries++) {
    const m3 = new Map(freeMap); m3.delete(L.s);
    const s2 = pick(emptySquares(m3)); if (!pawnOk(defender, s2)) continue;
    m3.set(s2, defender);
    const c = certifyQuiet(fenOf(freeMap), fenOf(m3), q2 + t2, q1 + t1);
    if (c) third = c;
  }
  return { type: 'shared defender: pinned or free', changedFact: `black king ${L.k} -> ${k2}`, ...pair, third };
}
// Same rules, but rejections of the optional third board are not counted in the main tally.
function certifyQuiet(fenA, fenB, wantA, wantB) { const saved = { ...reject }; const c = certify(fenA, fenB, wantA, wantB); for (const k of Object.keys(reject)) delete reject[k]; Object.assign(reject, saved); return c; }

const EQUAL_TAKES = [['N', 'p'], ['B', 'p'], ['R', 'p'], ['R', 'n'], ['R', 'b'], ['Q', 'n'], ['Q', 'r']];
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
  const pair = certify(fenOf(map), fenOf(other), qA + tA, qB + tB);
  return pair && { type: 'which attacker is pinned', changedFact: `black king ${A.k} -> ${B.k}`, ...pair };
}

const out = { schema: 'concept-flip-pairs-design-check-v1', seed: SEED, wantedPerType: WANT, types: {} };
for (const [label, make] of [['shared defender: pinned or free', sharedDefender], ['which attacker is pinned', whichAttacker]]) {
  for (const k of Object.keys(reject)) delete reject[k];
  const pairs = [], started = Date.now();
  let attempts = 0;
  while (pairs.length < WANT && attempts < 400000 && Date.now() - started < 20 * 60 * 1000) {
    attempts++;
    const pair = make();
    if (pair) { pairs.push({ id: `${label.split(':')[0].replaceAll(' ', '-')}-${pairs.length + 1}`, ...pair }); process.stderr.write(`${label}: ${pairs.length}/${WANT} after ${attempts} tries\n`); }
  }
  out.types[label] = { accepted: pairs.length, attempts, seconds: Math.round((Date.now() - started) / 1000), rejections: { ...reject }, pairs };
}
console.log(JSON.stringify(out, null, 1));

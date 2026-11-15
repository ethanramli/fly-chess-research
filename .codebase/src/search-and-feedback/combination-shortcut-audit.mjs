// Development-only audit: can a simple rule pass the twin pairs of the three-idea combination test?
// Protocol: documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md (Phase C, and the Phase B quiet task).
// Report: research/reports/combination-shortcut-audit-2026-11-16/README.md
// Hand-built development boards only. No sealed games, no learner, no graph, no files written.
import { Chess } from 'chess.js';
import { certifyLandingSquare, combinedAnswer, PIECE_VALUES } from './landing-square-certificate.mjs';
import { uci } from './puzzle-search.mjs';

const lower = cert => cert.capturedValue < cert.moverValue;
const pinned = cert => cert.pinnedAttackers.length > 0;

// What each group's twins must show in the checker, besides good and bad answers.
export const GROUPS = {
  'pin, as written': {
    protocol: 'C2 pin pairs (also the C1 pin pairs): captured value lower; the only attacker is pinned (good) or the pin line is blocked (bad)',
    facts: (g, b) => g.capture && b.capture && lower(g) && lower(b) && pinned(g) && !pinned(b) && g.attackers.length === 1 },
  'recapture, as written': {
    protocol: 'C2 recapture pairs (also the C1 recapture pairs): captured value lower; pinned attacker on both; an extra unpinned attacker absent (good) or present (bad)',
    facts: (g, b) => g.capture && b.capture && lower(g) && lower(b) && pinned(g) && pinned(b) },
  'value': {
    protocol: 'C2 value pairs: pinned and unpinned attackers on both; captured value at least the mover (good) or lower (bad)',
    facts: (g, b) => g.capture && b.capture && pinned(g) && pinned(b) && g.recaptures.length > 0 && b.recaptures.length > 0 && !lower(g) && lower(b) },
  'pin, matched pieces': {
    protocol: 'Proposed fix: as the pin group, but the blocker sits off the line in the good twin, so both twins have the same pieces',
    facts: (g, b) => g.capture && b.capture && lower(g) && lower(b) && pinned(g) && !pinned(b) && g.attackers.length === 1 },
  'pin, moves reversed': {
    protocol: 'Proposed fix: as the matched pin group, but the enemy has more legal moves in the good twin, so counting enemy moves points the wrong way',
    facts: (g, b) => g.capture && b.capture && lower(g) && lower(b) && pinned(g) && !pinned(b) && g.attackers.length === 1 && g.replies.length > b.replies.length },
  'recapture, matched pieces': {
    protocol: 'Proposed fix: as the recapture group, but the extra piece sits where it does not attack the target in the good twin',
    facts: (g, b) => g.capture && b.capture && lower(g) && lower(b) && pinned(g) && pinned(b) },
  'recapture, king defence': {
    protocol: 'Proposed fix: the extra attacker is the king on both twins; the target is defended (good) or the defender sits elsewhere (bad)',
    facts: (g, b) => g.capture && b.capture && lower(g) && lower(b) && pinned(g) && pinned(b) && g.attackers.length === b.attackers.length },
  'idea 1 training': {
    protocol: 'Idea 1 alone: a capture that loses material if recaptured, no pins; recapture absent (good) or present (bad)',
    facts: (g, b) => g.capture && b.capture && lower(g) && lower(b) && !pinned(g) && !pinned(b) },
  'idea 2 training, as written': {
    protocol: 'Idea 2 alone: a quiet move whose only attacker is pinned (good) or not pinned (bad); the checker test boards',
    facts: (g, b) => !g.capture && !b.capture && pinned(g) && !pinned(b) },
  'idea 2 training, matched pieces': {
    protocol: 'Proposed fix: as idea 2, with the unpinning piece off the line in the good twin',
    facts: (g, b) => !g.capture && !b.capture && pinned(g) && !pinned(b) },
  'idea 3 training': {
    protocol: 'Idea 3 alone: always legally recaptured, no pins; captured value at least the mover (good) or lower (bad)',
    facts: (g, b) => g.capture && b.capture && !pinned(g) && !pinned(b) && g.recaptures.length > 0 && b.recaptures.length > 0 && !lower(g) && lower(b) },
  'quiet safety': {
    protocol: 'Phase B quiet-move safety: no capture; no legal capture of the moved piece (good) or one (bad); no pins',
    facts: (g, b) => !g.capture && !b.capture && !pinned(g) && !pinned(b) },
};

// White moves in every pair. "good" and "bad" are the twin boards; the move is the same on both.
export const PAIRS = [
  { id: 'pin-file', group: 'pin, as written', move: 'a5d5', good: '4k3/8/4b3/R2n4/8/8/8/4R1K1 w - - 0 1', bad: '4k3/8/4b3/R2np3/8/8/8/4R1K1 w - - 0 1',
    note: 'Rook takes knight; the e6 bishop is pinned on the e-file. Bad twin: a black pawn on e5 blocks the pin.' },
  { id: 'pin-diagonal', group: 'pin, as written', move: 'e2e4', good: '7k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1', bad: '7k/8/5n2/8/4p3/2P5/1B2Q3/6K1 w - - 0 1',
    note: 'Queen takes pawn; the f6 knight is pinned on the long diagonal. Bad twin: a white pawn on c3 blocks the pin.' },
  { id: 'recapture-file', group: 'recapture, as written', move: 'a5d5', good: '4k3/8/4b3/R2n4/8/8/8/4R1K1 w - - 0 1', bad: '4k3/8/2p1b3/R2n4/8/8/8/4R1K1 w - - 0 1',
    note: 'Pinned e6 bishop on both. Bad twin: a black pawn on c6 also attacks d5.' },
  { id: 'recapture-diagonal', group: 'recapture, as written', move: 'e2e4', good: '7k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1', bad: '4r2k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1',
    note: 'Pinned f6 knight on both. Bad twin: a black rook on e8 also attacks e4.' },
  { id: 'value-file', group: 'value', move: 'a5d5', good: '4k3/8/2p1b3/R2r4/8/8/8/4R1K1 w - - 0 1', bad: '4k3/8/2p1b3/R2n4/8/8/8/4R1K1 w - - 0 1',
    note: 'Rook takes rook (good) or knight (bad); c6 pawn recaptures on both.' },
  { id: 'value-diagonal', group: 'value', move: 'e2e4', good: '4r2k/8/5n2/8/4q3/8/1B2Q3/6K1 w - - 0 1', bad: '4r2k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1',
    note: 'Queen takes queen (good) or pawn (bad); e8 rook recaptures on both.' },
  { id: 'pin-file-matched', group: 'pin, matched pieces', move: 'a5d5', good: '4k3/8/4b3/R2n3p/8/8/8/4R1K1 w - - 0 1', bad: '4k3/8/4b3/R2np3/8/8/8/4R1K1 w - - 0 1',
    note: 'The black pawn is on h5 (off the pin line) in the good twin and on e5 in the bad twin.' },
  { id: 'pin-diagonal-matched', group: 'pin, matched pieces', move: 'e2e4', good: '7k/8/5n2/8/4p3/P7/1B2Q3/6K1 w - - 0 1', bad: '7k/8/5n2/8/4p3/2P5/1B2Q3/6K1 w - - 0 1',
    note: 'The white pawn is on a3 in the good twin and on c3 in the bad twin.' },
  { id: 'pin-pawn-moves-reversed', group: 'pin, moves reversed', move: 'a4d4', good: '4k3/8/8/4p3/R2n4/7r/8/K3R3 w - - 0 1', bad: '4k3/8/8/4p3/R2n4/4r3/8/K3R3 w - - 0 1',
    note: 'Rook takes knight; the e5 pawn is pinned on the e-file and cannot take on d4. The black rook stands on h3 (14 moves) in the good twin and blocks the pin on e3 (10 moves) in the bad twin, so the enemy has more moves on the good board.' },
  { id: 'recapture-file-matched', group: 'recapture, matched pieces', move: 'a5d5', good: '4k3/2p5/4b3/R2n4/8/8/8/4R1K1 w - - 0 1', bad: '4k3/8/2p1b3/R2n4/8/8/8/4R1K1 w - - 0 1',
    note: 'The black pawn is on c7 (attacks d6, not d5) in the good twin and on c6 in the bad twin.' },
  { id: 'recapture-diagonal-matched', group: 'recapture, matched pieces', move: 'e2e4', good: '1r5k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1', bad: '4r2k/8/5n2/8/4p3/8/1B2Q3/6K1 w - - 0 1',
    note: 'The black rook is on b8 in the good twin and on e8 in the bad twin.' },
  { id: 'recapture-king', group: 'recapture, king defence', move: 'b4d5', good: '8/8/4kn1R/3p4/1N2P3/8/8/6K1 w - - 0 1', bad: '8/8/4kn1R/3p4/1N6/8/P7/6K1 w - - 0 1',
    note: 'Knight takes pawn; the f6 knight is pinned by the h6 rook and the e6 king attacks d5 on both. The white pawn defends d5 from e4 (good) or stands on a2 (bad).' },
  { id: 'idea1-training', group: 'idea 1 training', move: 'a5d5', good: '4k3/8/8/R2n4/8/8/8/6K1 w - - 0 1', bad: '4k3/8/2p5/R2n4/8/8/8/6K1 w - - 0 1',
    note: 'Rook takes knight; a black pawn on c6 recaptures in the bad twin.' },
  { id: 'idea2-training', group: 'idea 2 training, as written', move: 'b4d6', good: '4k3/4b3/8/8/1B6/8/8/4RK2 w - - 0 1', bad: '4k3/4b3/8/8/1B6/8/4P3/4RK2 w - - 0 1',
    note: 'The checker\'s own test boards: bishop to d6; the e7 bishop is pinned unless a white pawn on e2 blocks the e-file.' },
  { id: 'idea2-training-matched', group: 'idea 2 training, matched pieces', move: 'b4d6', good: '4k3/4b3/8/8/1B6/8/P7/4RK2 w - - 0 1', bad: '4k3/4b3/8/8/1B6/8/4P3/4RK2 w - - 0 1',
    note: 'The white pawn is on a2 in the good twin and on e2 in the bad twin.' },
  { id: 'idea3-training', group: 'idea 3 training', move: 'a5d5', good: '4k3/8/2p5/R2r4/8/8/8/6K1 w - - 0 1', bad: '4k3/8/2p5/R2n4/8/8/8/6K1 w - - 0 1',
    note: 'Rook takes rook (good) or knight (bad); the c6 pawn recaptures on both.' },
  { id: 'quiet-pawn-attacker', group: 'quiet safety', move: 'g1f3', good: '4k3/8/8/8/8/8/8/4K1N1 w - - 0 1', bad: '4k3/8/8/8/4p3/8/8/4K1N1 w - - 0 1',
    note: 'Knight to f3; a black pawn on e4 attacks f3 in the bad twin.' },
];

// Checker gap, not a pair: a two-square pawn step that the opponent can take en passant.
export const EN_PASSANT_CASE = { id: 'quiet-en-passant', move: 'e2e4', fen: '4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1',
  note: 'After e2-e4 the d4 pawn can take it en passant (d4xe3). The capture lands on e3, not on the landing square e4.' };

// Not a twin pair: two different moves that differ in two facts. Good because nothing can recapture, although the value is poor;
// bad because the knight is recaptured. Only a comparison like this separates the combined rule from a sum with a graded value score.
export const OVERRIDE_CASE = {
  good: { fen: '4k3/8/8/3p4/8/8/8/3QK3 w - - 0 1', move: 'd1d5', note: 'Queen takes an undefended pawn.' },
  bad: { fen: '4k3/8/2p5/R2n4/8/8/8/6K1 w - - 0 1', move: 'a5d5', note: 'Rook takes a knight that a pawn recaptures.' },
};

// Rejects bad FENs and positions where the side not to move is already in check.
export function legalStart(fen) {
  const board = new Chess(fen);
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  if (new Chess(parts.join(' ')).inCheck()) throw Error(`Side not to move is in check: ${fen}`);
  return board;
}

const squares = [...'abcdefgh'].flatMap(f => [...'12345678'].map(r => f + r));
const pieceList = board => squares.map(s => board.get(s)).filter(Boolean);
const material = (board, color) => pieceList(board)
  .filter(p => p.color === color && p.type !== 'k').reduce((sum, p) => sum + PIECE_VALUES[p.type], 0);

// Everything a board-only rule may use. Computed from the FEN and move alone; the checker is never called here.
export function boardFeatures(fen, move) {
  const board = legalStart(fen);
  const action = board.moves({ verbose: true }).find(m => uci(m) === move);
  if (!action) throw Error(`Illegal move ${move} on ${fen}`);
  const own = board.turn(), opp = own === 'w' ? 'b' : 'w';
  const before = { pieces: pieceList(board).length, ownMaterial: material(board, own), oppMaterial: material(board, opp) };
  board.move(action);
  const replies = board.moves({ verbose: true });
  return {
    moverValue: PIECE_VALUES[action.piece],
    capturedValue: action.captured ? PIECE_VALUES[action.captured] : 0,
    ...before,
    attackers: board.attackers(action.to, opp).length, // pseudo-legal: ignores pins
    defenders: board.attackers(action.to, own).length,
    legalRecapture: replies.some(r => r.to === action.to && Boolean(r.captured)), // full chess rules
    oppMobility: replies.length, // full chess rules
  };
}

const sign = x => (x ? 1 : 0);

// Board-only controls see boardFeatures() and nothing else.
export const BOARD_CONTROLS = {
  'piece value': { rule: 'captured value minus mover value', score: f => f.capturedValue - f.moverValue },
  'recapture only, attacked': { rule: '-1 if any enemy piece attacks the landing square (pins ignored)', score: f => -sign(f.attackers > 0) },
  'recapture only, legal': { rule: '-1 if the enemy has a legal capture on the landing square (full chess rules)', score: f => -sign(f.legalRecapture) },
  'attacker count': { rule: 'minus the number of enemy pieces attacking the landing square (pins ignored)', score: f => -f.attackers },
  'attackers minus defenders': { rule: 'defenders minus attackers of the landing square (pins ignored)', score: f => f.defenders - f.attackers },
  'fewer pieces': { rule: 'minus the number of pieces on the board before the move', score: f => -f.pieces },
  'material balance': { rule: 'own material minus enemy material before the move', score: f => f.ownMaterial - f.oppMaterial },
  'enemy mobility': { rule: 'minus the number of legal enemy replies (full chess rules)', score: f => -f.oppMobility },
  'fixed sum of concept scores': { rule: '[not attacked] + [no legal recapture] + [captured value at least mover value], each 0 or 1',
    score: f => sign(f.attackers === 0) + sign(!f.legalRecapture) + sign(f.capturedValue >= f.moverValue) },
  'fixed sum, graded value': { rule: '[not attacked] + [no legal recapture] + (captured value minus mover value)',
    score: f => sign(f.attackers === 0) + sign(!f.legalRecapture) + (f.capturedValue - f.moverValue) },
  'attackers, moves and value': { rule: '100 x (captured value minus mover value) minus 10 x attackers minus legal enemy replies; no pin rule',
    score: f => 100 * (f.capturedValue - f.moverValue) - 10 * f.attackers - f.oppMobility },
  'piece count plus value': { rule: '(captured value minus mover value) minus 10 x pieces on the board; no idea at all',
    score: f => f.capturedValue - f.moverValue - 10 * f.pieces },
};

// Oracle controls read the checker's answer fields. They are not information the fly has.
export const ORACLE_CONTROLS = {
  'oracle: recaptures field': { rule: '1 if certificate.recaptures is empty', score: c => sign(c.recaptures.length === 0) },
  'oracle: pin label field': { rule: '1 if certificate.pinnedAttackers is not empty', score: c => sign(c.pinnedAttackers.length > 0) },
  'oracle: combined answer': { rule: '1 if combinedAnswer(certificate) is good', score: c => sign(combinedAnswer(c) === 'good') },
  'oracle: fixed sum': { rule: '[recaptures empty] + [captured value at least mover value], from certificate fields',
    score: c => sign(c.recaptures.length === 0) + sign(c.capture && c.capturedValue >= c.moverValue) },
};

export function certify(fen, move) {
  const result = certifyLandingSquare(legalStart(fen), move);
  if (result.status === 'unknown') throw Error(`Checker returned unknown on ${fen}`);
  return result.certificate;
}

// The proposed generator check: both twins hold the same number of pieces and the same material for each side.
export function samePieces(pair) {
  const f = [pair.good, pair.bad].map(fen => boardFeatures(fen, pair.move));
  return f[0].pieces === f[1].pieces && f[0].ownMaterial === f[1].ownMaterial && f[0].oppMaterial === f[1].oppMaterial;
}

// Checks each pair against the checker, then scores every control. A pair is correct only when the good twin scores strictly higher.
export function runAudit(pairs = PAIRS) {
  const checked = pairs.map(pair => {
    const g = certify(pair.good, pair.move), b = certify(pair.bad, pair.move);
    const answers = { good: combinedAnswer(g), bad: combinedAnswer(b) };
    if (answers.good !== 'good' || answers.bad !== 'bad') throw Error(`Pair ${pair.id} does not flip: ${JSON.stringify(answers)}`);
    if (!GROUPS[pair.group].facts(g, b)) throw Error(`Pair ${pair.id} does not show the facts of group "${pair.group}"`);
    const features = { good: boardFeatures(pair.good, pair.move), bad: boardFeatures(pair.bad, pair.move) };
    const scores = {};
    for (const [name, c] of Object.entries(BOARD_CONTROLS)) scores[name] = [c.score(features.good), c.score(features.bad)];
    for (const [name, c] of Object.entries(ORACLE_CONTROLS)) scores[name] = [c.score(g), c.score(b)];
    const correct = Object.fromEntries(Object.entries(scores).map(([name, [x, y]]) => [name, x > y]));
    return { id: pair.id, group: pair.group, move: pair.move, good: pair.good, bad: pair.bad, note: pair.note,
      samePieces: samePieces(pair), checker: { good: g, bad: b }, features, scores, correct };
  });
  const groups = [...new Set(checked.map(p => p.group))];
  const controls = [...Object.keys(BOARD_CONTROLS), ...Object.keys(ORACLE_CONTROLS)];
  const table = Object.fromEntries(controls.map(name => [name, Object.fromEntries(groups.map(group => {
    const rows = checked.filter(p => p.group === group);
    return [group, { correct: rows.filter(p => p.correct[name]).length, total: rows.length }];
  }))]));
  return { pairs: checked, groups, controls, table, override: overrideComparison(), enPassant: enPassantGap() };
}

// Scores every control on OVERRIDE_CASE. Correct when the good board's move scores strictly higher.
export function overrideComparison({ good, bad } = OVERRIDE_CASE) {
  const certs = [certify(good.fen, good.move), certify(bad.fen, bad.move)];
  if (combinedAnswer(certs[0]) !== 'good' || combinedAnswer(certs[1]) !== 'bad') throw Error('Override case does not hold');
  const features = [boardFeatures(good.fen, good.move), boardFeatures(bad.fen, bad.move)];
  const correct = {};
  for (const [name, c] of Object.entries(BOARD_CONTROLS)) correct[name] = c.score(features[0]) > c.score(features[1]);
  for (const [name, c] of Object.entries(ORACLE_CONTROLS)) correct[name] = c.score(certs[0]) > c.score(certs[1]);
  return { good, bad, correct };
}

// Shows what the checker says about a pawn that can be taken en passant right after its two-square step.
export function enPassantGap({ fen, move } = EN_PASSANT_CASE) {
  const cert = certify(fen, move);
  const board = legalStart(fen);
  board.move(board.moves({ verbose: true }).find(m => uci(m) === move));
  const enPassant = board.moves({ verbose: true }).filter(m => m.flags.includes('e')).map(uci);
  return { fen, move, checkerStatus: cert.recaptures.length ? 'failure' : 'success', recaptures: cert.recaptures, enPassantCaptures: enPassant };
}

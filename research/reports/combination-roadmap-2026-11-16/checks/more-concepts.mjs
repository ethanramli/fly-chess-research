// Design check 5: the same match step with two more concept families (guard for king replies, check answer), on boards the three-concept match step gets wrong. Report: ../README.md
import { legalStart, truth, successor, reachRecords, pinRecords, piecesOf, PIECE_VALUES } from './lib.mjs';

function extended(fen, move, { pinAppliesToGuards = false } = {}) {
  const s = successor(fen, move), t = s.to;
  const threats = reachRecords(s.board, s.enemy, t);                         // enemy pieces, king included
  const pins = pinRecords(s.board, s.enemy);                                 // blocks on enemy non-king pieces
  const myPins = pinRecords(s.board, s.mover);
  let guards = reachRecords(s.board, s.mover, t);                            // my pieces that reach the landing square
  if (pinAppliesToGuards) guards = guards.filter(g => !myPins.some(p => p.piece === g.piece && !p.line.includes(t)));
  const king = piecesOf(s.board, s.enemy).find(p => p.type === 'k').square;
  const checkers = reachRecords(s.board, s.mover, king).map(r => r.piece);   // my pieces that reach the enemy king
  const otherCheckers = checkers.filter(c => c !== t);
  const live = threats.filter(r => {
    if (r.type === 'k') return guards.length === 0;                          // guard block
    if (otherCheckers.length) return false;                                  // check-answer block: taking the moved piece leaves another check
    const pin = pins.find(p => p.piece === r.piece);
    return !pin || pin.line.includes(t);                                     // pin block
  });
  const moved = PIECE_VALUES[s.action.piece], taken = s.action.captured ? PIECE_VALUES[s.action.captured] : 0;
  return { threats: threats.map(r => r.piece), guards: guards.map(r => r.piece), checkers, live: live.map(r => r.piece), score: taken - (live.length ? moved : 0) };
}

const CASES = [
  ['king reply, landing square guarded by a pawn', '8/8/4k3/3p4/1N2P3/8/8/6K1 w - - 0 1', 'b4d5'],
  ['king reply, landing square not guarded', '8/8/4k3/3p4/1N6/8/P7/6K1 w - - 0 1', 'b4d5'],
  ['king reply, the guard is itself pinned (still guards)', '8/8/4k3/3p4/1N6/8/8/r2R2K1 w - - 0 1', 'b4d5'],
  ['double check: pawn c7 reaches d6 but may not take', '4k3/2p5/3p4/8/4N3/8/8/4R1K1 w - - 0 1', 'e4d6'],
  ['same board without the rook: single check by the moved knight', '4k3/2p5/3p4/8/4N3/8/8/6K1 w - - 0 1', 'e4d6'],
];
for (const [name, fen, move] of CASES) {
  legalStart(fen);
  const t = truth(fen, move), e = extended(fen, move), wrong = extended(fen, move, { pinAppliesToGuards: true });
  console.log(`${name}\n  ${fen} ${move}\n  checker ${t.score} (legal recaptures ${JSON.stringify(t.recaptures)}) | extended match step ${e.score} (threats ${JSON.stringify(e.threats)}, guards ${JSON.stringify(e.guards)}, checkers ${JSON.stringify(e.checkers)}, live ${JSON.stringify(e.live)}) | if pins cancelled guards: ${wrong.score} ${e.score === t.score ? 'OK' : '*** MISMATCH'}`);
}

// Design check 6: on random-play positions (no real or sealed games), how often does the match step over reach, pin and worth records
// equal the checker's legal-reply answer, and what causes each miss? Also cross-checks the geometry reach labeller against chess.js attackers().
import { Chess, uciOf, truth, recordsFor, combine, reachRecords, successor, mulberry32, other } from './lib.mjs';

const rand = mulberry32(20261116);
const tally = { boards: 0, moves: 0, agree: 0, captures: 0, captureAgree: 0, closedBoards: 0, topSame: 0, reachMismatch: 0 };
const cause = {};
const bump = k => { cause[k] = (cause[k] ?? 0) + 1; };
const withGuard = { agree: 0, closedBoards: 0, topSame: 0 };
const examples = {};

for (let game = 0; game < 150; game++) {
  const board = new Chess();
  for (let ply = 0; ply < 90 && !board.isGameOver(); ply++) {
    const moves = board.moves({ verbose: true });
    if (ply >= 8 && ply % 3 === 0) {
      const fen = board.fen();
      let closed = true, closedG = true;
      const rows = [];
      for (const m of moves) {
        if (m.piece === 'k') continue;
        const u = uciOf(m), t = truth(fen, u), rec = recordsFor(fen, u), j = combine(rec);
        // cross-check reach labeller
        const s = successor(fen, u);
        const mine = reachRecords(s.board, s.enemy, s.to).map(r => r.piece).sort().join(',');
        if (mine !== s.board.attackers(s.to, s.enemy).sort().join(',')) tally.reachMismatch++;
        // match step with the king counted as an attacker unless one of the mover's pieces guards the landing square
        const recK = recordsFor(fen, u, { kingAttackers: true });
        const guarded = reachRecords(s.board, s.mover, s.to).length > 0;
        const recG = { ...recK, reach: recK.reach.filter(r => r.type !== 'k' || !guarded) };
        const jg = combine(recG);
        tally.moves++; if (m.captured) tally.captures++;
        const ok = j.score === t.score, okG = jg.score === t.score;
        if (ok) { tally.agree++; if (m.captured) tally.captureAgree++; } else {
          closed = false;
          const kingOnly = recK.reach.some(r => r.type === 'k');
          const k = t.inCheckAfter ? (okG ? 'check after, fixed by king rule' : 'check after the move (discovered or double check, or king cannot take)') : kingOnly ? (okG ? 'enemy king is an attacker' : 'enemy king attacker, other') : m.flags.includes('e') ? 'en passant' : m.promotion ? 'promotion' : 'other';
          bump(k); examples[k] ??= `${fen} ${u} checker ${t.score} match step ${j.score}`;
        }
        if (okG) withGuard.agree++; else closedG = false;
        rows.push({ u, t: t.score, j: j.score, jg: jg.score });
      }
      if (rows.length) {
        tally.boards++;
        if (closed) tally.closedBoards++;
        if (closedG) withGuard.closedBoards++;
        const tops = (key) => { const mx = Math.max(...rows.map(r => r[key])); return rows.filter(r => r[key] === mx).map(r => r.u).join(','); };
        if (tops('t') === tops('j')) tally.topSame++;
        if (tops('t') === tops('jg')) withGuard.topSame++;
      }
    }
    board.move(moves[Math.floor(rand() * moves.length)]);
  }
}
const pct = (a, b) => `${a}/${b} (${(100 * a / b).toFixed(1)}%)`;
console.log('positions sampled:', tally.boards, '| non-king moves:', tally.moves, '| reach labeller mismatches against chess.js attackers():', tally.reachMismatch);
console.log('match step (reach, pin, worth) equals checker: moves', pct(tally.agree, tally.moves), '| captures', pct(tally.captureAgree, tally.captures));
console.log('positions where every non-king move agrees:', pct(tally.closedBoards, tally.boards), '| positions where the set of top moves is the same:', pct(tally.topSame, tally.boards));
console.log('causes of misses:', JSON.stringify(cause, null, 1));
console.log('with a king rule added (king is an attacker unless the landing square is guarded): moves', pct(withGuard.agree, tally.moves), '| closed positions', pct(withGuard.closedBoards, tally.boards), '| same top set', pct(withGuard.topSame, tally.boards));
console.log('examples:', JSON.stringify(examples, null, 1));

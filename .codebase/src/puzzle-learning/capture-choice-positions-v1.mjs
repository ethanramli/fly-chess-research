// Finds real game positions where the side to move has a safe capture and an unsafe capture.
// Labels are for the teacher only. Pure functions: no file or network access.
import { Chess } from 'chess.js';
import { replayGame } from './twin-pair-generator-v1.mjs';
import { certifyCaptureRetention } from '../search-and-feedback/capture-retention-certificate.mjs';

// Cut a multi-game PGN text into one string per game.
export function splitPgn(text) {
  return text.split(/\r?\n(?=\[Event )/).map(game => game.trim()).filter(Boolean);
}

// Read the GameId header. Throws if it is missing.
export function gameIdOf(pgn) {
  const match = /^\[GameId "([^"]+)"\]/m.exec(pgn);
  if (!match) throw Error('Missing GameId header');
  return match[1];
}

// Label every legal move with its teacher outcome, sorted by UCI.
export function labelMoves(fen) {
  const board = new Chess(fen);
  return board.moves({ verbose: true }).map(move => {
    const uci = move.from + move.to + (move.promotion ?? '');
    const capture = Boolean(move.captured);
    let outcome = 'quiet';
    if (capture) {
      // King captures are outside the checker's scope.
      if (move.piece === 'k') outcome = 'unknown';
      else {
        const { status } = certifyCaptureRetention(board, uci);
        outcome = status === 'success' ? 'safe' : status === 'failure' ? 'unsafe' : 'unknown';
      }
    }
    return { uci, capture, outcome };
  }).sort((a, b) => (a.uci < b.uci ? -1 : a.uci > b.uci ? 1 : 0));
}

// True when the position has at least one safe and one unsafe move.
export function qualifies(moves) {
  return moves.some(m => m.outcome === 'safe') && moves.some(m => m.outcome === 'unsafe');
}

// Scan one game for qualifying positions, spaced at least minGap plies apart.
export function positionsFromGame(pgn, { minPly = 10, maxPerGame = 2, minGap = 10 } = {}) {
  const gameId = gameIdOf(pgn);
  const replay = replayGame(pgn);
  const taken = [];
  let lastTaken = -Infinity;
  for (const { ply, fen } of replay) {
    if (taken.length >= maxPerGame) break;
    if (ply < minPly || ply - lastTaken < minGap) continue;
    const moves = labelMoves(fen);
    if (!qualifies(moves)) continue;
    taken.push({ gameId, ply, fen, history: replay.slice(0, ply).map(e => e.uci), moves });
    lastTaken = ply;
  }
  return taken;
}

import { digest } from '../neural-learning/mushroom-body.mjs';

// Only returned assessment summaries are cached, never neural activity or replay.
// identity() must cover fixed graph/model/encoder/readout and persistent memory.
export function createAssessmentCache({ assess, identity, guard, capacity = 4, maxRows = 256 }) {
  if (typeof assess !== 'function' || typeof identity !== 'function' || typeof guard !== 'function'
      || !Number.isSafeInteger(capacity) || capacity < 1 || capacity > 8
      || !Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 256) throw Error('Invalid bounded assessment cache');
  const entries = new Map();
  const stats = { hits: 0, misses: 0, invalidations: 0, avoidedCandidatePresentations: 0 };
  let generation = null;
  return {
    stats,
    clear() { entries.clear(); generation = null; },
    async assess(board, moves, task) {
      guard();
      const fen = board.fen(), history = board.pgn();
      if (history.length > 65536 || !Array.isArray(moves) || moves.length < 1 || moves.length > maxRows) throw Error('Assessment cache bound');
      const before = identity();
      if (typeof before !== 'string' || before.length < 1 || before.length > 4096) throw Error('Missing bounded cache identity');
      if (generation !== before) { if (generation !== null) stats.invalidations++; entries.clear(); generation = before; }
      const key = digest({ fen, history, task, moves: moves.map(m => m.from + m.to + (m.promotion ?? '')) });
      if (entries.has(key)) {
        const stored = entries.get(key); entries.delete(key); entries.set(key,stored);
        stats.hits++; stats.avoidedCandidatePresentations += moves.length;
        guard(); return structuredClone(stored);
      }
      const result = await assess(board,moves,task);
      if (identity() !== before || board.fen() !== fen || board.pgn() !== history) throw Error('Assessment changed frozen identity or board');
      if (!Array.isArray(result?.rows) || result.rows.length !== moves.length) throw Error('Invalid bounded assessment summary');
      if (Buffer.byteLength(JSON.stringify(result)) > 262144) throw Error('Assessment summary storage bound');
      stats.misses++; entries.set(key,structuredClone(result));
      if (entries.size > capacity) entries.delete(entries.keys().next().value);
      guard(); return result;
    },
  };
}

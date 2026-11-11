// Fly connections memory v1, revision 2 section 6: graph-free engineered-store comparison arms (Raw Eyes and fixed random-feature stores).
// Engineered comparisons only. These stores are not the fly and carry no biological status. Pure: no files, network, graph or neural model.
import { makeRandomExpansion } from './kc-episodic-memory-v2.mjs';
import { buildStore, calibrationKeys, fitPipeline, transformFor } from './engineered-memory-task-v5.mjs';
import { COLUMNS } from './memory-v5-data.mjs';
import { replayPacketBoard } from './fly-connections-packet-v1.mjs';
import { scoreAllLegal } from './fly-connections-metrics-v1.mjs';
import { uci as uciOf } from '../search-and-feedback/puzzle-search.mjs';

const KEYS = ['raw-pc', 'random-pc'];
// Same random expansion as memory-v5-worker.mjs: fan-in 6, seed 20261103, 5% of units kept.
const RANDOM = { fanIn: 6, seed: 20261103, keep: 0.05 };
const CAPACITY = 4096;
const K = 3;
// Calibration order: A boards, then B, then R; first appearance on the tape within each group.
const TRAINING_RANK = new Map([['A', 0], ['B', 1], ['R', 2]]);

function boardOf(records, id) {
  const record = records.get(id);
  if (!record) throw Error(`No board record for ${id}`);
  return record;
}

// Raw and random-expansion features built from a caller's eyes object, as in memory-v5-worker.mjs.
function featuresOf(records, eyes, retinaIdx) {
  if (typeof eyes?.encode !== 'function') throw Error('eyes must provide encode(fen, uci)');
  if (!retinaIdx?.length) throw Error('retinaIdx must be a nonempty index array');
  const expand = makeRandomExpansion({ inputs: retinaIdx.length, units: COLUMNS, fanIn: RANDOM.fanIn, seed: RANDOM.seed });
  const rawOf = key => {
    const i = key.lastIndexOf('|');
    const { fen } = boardOf(records, key.slice(0, i));
    const stimulus = new Map(Array.from(eyes.encode(fen, key.slice(i + 1)).stimulation, x => [x.index, x.current]));
    return Float64Array.from(retinaIdx, idx => stimulus.get(idx) ?? 0);
  };
  return { rawOf, randomOf: key => expand(rawOf(key), RANDOM.keep) };
}

function checkTape(tape, records, shuffled) {
  if (!Array.isArray(tape?.events) || tape.events.length === 0) throw Error('tape.events must be a nonempty array');
  if (shuffled) {
    const { shuffledPulses } = tape;
    if (!Array.isArray(shuffledPulses) || shuffledPulses.length !== tape.events.length || !shuffledPulses.every(p => typeof p === 'boolean')) {
      throw Error('shuffledPulses must hold one boolean per event');
    }
    if (shuffledPulses.filter(Boolean).length !== tape.events.filter(e => e.pulse === true).length) throw Error('shuffledPulses must keep the exact pulse count');
  }
  tape.events.forEach((e, i) => {
    const record = boardOf(records, e.boardId);
    if (!TRAINING_RANK.has(e.group) || e.group !== record.group) throw Error(`Tape event ${i} is not a training event on ${e.boardId}`);
    if (typeof e.pulse !== 'boolean') throw Error(`Tape event ${i} pulse must be boolean`);
    if (!record.legal.includes(e.move)) throw Error(`Tape event ${i}: ${e.move} is not legal on ${e.boardId}`);
  });
}

// Writes the delivered pulse code only. The stored value is +1 for a pulse and -1 for none,
// because NearestEpisodeMemory accepts only +1 or -1 (the contract's 0 would throw in write).
export function runStoreBaseline({ key, records, tape, eyes, retinaIdx, evaluate, shuffled = false }) {
  if (!KEYS.includes(key)) throw Error(`Unknown store key: ${key}`);
  if (!(records instanceof Map)) throw Error('records must be a Map of boardId to board record');
  if (typeof shuffled !== 'boolean') throw Error('shuffled must be boolean');
  if (!Array.isArray(evaluate)) throw Error('evaluate must be an array of boardIds');
  checkTape(tape, records, shuffled);

  const legalOf = id => boardOf(records, id).legal;
  const { rawOf, randomOf } = featuresOf(records, eyes, retinaIdx);
  const firstSeen = new Map();
  for (const e of tape.events) if (!firstSeen.has(e.boardId)) firstSeen.set(e.boardId, e.group);
  const trainingIds = [...firstSeen].sort(([, a], [, b]) => TRAINING_RANK.get(a) - TRAINING_RANK.get(b)).map(([id]) => id);
  const pipeline = fitPipeline(transformFor(key, { legalOf, rawOf, randomOf }), calibrationKeys(trainingIds, legalOf));

  const slots = tape.events.map(e => ({ slot: e.sequence, id: e.boardId, uci: e.move }));
  const values = tape.events.map((e, i) => ((shuffled ? tape.shuffledPulses[i] : e.pulse) ? 1 : -1));
  const { memory, counts } = buildStore({ slots, values, apply: pipeline.apply, capacity: CAPACITY, k: K, arm: `${key}-${shuffled ? 'shuffled' : 'delivered'}` });

  const perBoard = evaluate.map(id => {
    const record = boardOf(records, id);
    if (record.group === 'R') throw Error(`${id} is an R board; R boards carry no chess criterion`);
    const ranked = [...record.legal].sort().map(move => ({ move, score: memory.score(pipeline.apply(id, move)) }));
    const r = scoreAllLegal(replayPacketBoard(record), ranked, record.outcomes);
    return { boardId: id, gameId: record.gameId, group: record.group, s: r.s, c: r.c, success: r.success, margin: r.margin };
  });
  return { key, shuffled, counts, rmsSha256: pipeline.rmsSha256, perBoard };
}

// chess.js flags: 'c' is a capture, 'e' an en passant capture (isCapture() omits 'e').
const isCapture = m => m.flags.includes('c') || m.flags.includes('e');

// Exact expected all-legal success under uniform choice within each policy domain.
export function uniformBaselines(record) {
  if (!record || typeof record !== 'object') throw Error('record must be a board record');
  if (record.group === 'R') throw Error(`${record.boardId} is an R board; R boards carry no chess criterion`);
  const moves = replayPacketBoard(record).moves({ verbose: true });
  if (moves.length === 0) throw Error(`${record.boardId} has no legal moves`);
  if (moves.map(uciOf).sort().join(' ') !== [...record.legal].sort().join(' ')) throw Error(`${record.boardId}: record.legal differs from the replayed moves`);
  const succeeds = m => {
    const v = record.outcomes[uciOf(m)];
    if (typeof v !== 'boolean') throw Error(`Outcome for ${uciOf(m)} must be boolean`);
    return v;
  };
  const fraction = set => {
    const numerator = set.filter(succeeds).length;
    return { numerator, denominator: set.length, value: numerator / set.length };
  };
  const allLegal = { ...fraction(moves), fallback: false };
  // An empty policy domain falls back to uniform all-legal, and the flag says so.
  const policy = set => (set.length === 0 ? { ...allLegal, fallback: true } : { ...fraction(set), fallback: false });
  const captures = moves.filter(isCapture);
  return {
    boardId: record.boardId,
    allLegal,
    allCaptures: policy(captures),
    nonKingCaptures: policy(captures.filter(m => m.piece !== 'k')),
  };
}

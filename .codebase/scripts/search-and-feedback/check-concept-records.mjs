// Volume 3, Process and Evidence. Replay the design fixture and optionally generate fresh development pairs.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import {
  combine, extraConceptsFor, singleConceptNumbers,
} from '../../src/search-and-feedback/concept-records-v1.mjs';
import {
  canonicalBoard, checkerRows, generateFlipPairs, isNamedFlip, legalStart, matchRows, PAIR_TYPES,
  sameFixedSumDifference, splitForFamily,
} from '../../src/puzzle-learning/flip-pair-generator-v1.mjs';

const fixturePath = new URL('../../src/search-and-feedback/concept-flip-pairs-v1.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const WEIGHTS = [0, 0.25, 0.5, 1, 2, 4, 8, 16];
const noPin = ({ records }) => combine({ ...records, pins: [] }).score;
const noReach = ({ records }) => records.worth.taken;
const noWorth = ({ records }) => Number(records.worth.taken > 0) - Number(combine(records).live.length > 0);
const match = row => row.score;

function pick(rows, score) {
  let top = -Infinity;
  let moves = [];
  for (const row of rows) {
    const value = score(row);
    if (value > top) {
      top = value;
      moves = [];
    }
    if (value === top) moves.push(row.move);
  }
  return moves;
}

function credit(rows, score, best) {
  let top = -Infinity;
  let tied = 0;
  let hit = false;
  for (const row of rows) {
    const value = score(row);
    if (value > top) {
      top = value;
      tied = 0;
      hit = false;
    }
    if (value === top) {
      tied++;
      if (row.move === best) hit = true;
    }
  }
  return hit ? 1 / tied : 0;
}

function evaluatePairs(pairs, rowsFor, score) {
  const byType = {};
  let solved = 0;
  let boardCredit = 0;
  for (const pair of pairs) {
    const totals = byType[pair.type] ??= { pairs: 0, solved: 0, boardCredit: 0 };
    const [a, b] = pair.boards.map(board => credit(rowsFor(board.fen), score, board.best));
    const won = Number(a === 1 && b === 1);
    totals.pairs++;
    totals.solved += won;
    totals.boardCredit += a + b;
    solved += won;
    boardCredit += a + b;
  }
  return { pairs: pairs.length, solved, boards: 2 * pairs.length, boardCredit, byType };
}

function fixedScore([reach, pin, taken, moved], legalRecapture) {
  return row => {
    const [reached, held, worthTaken, worthMoved] = row.features;
    return -reach * (legalRecapture ? Number(row.recaptureCount > 0) : reached) +
      pin * held + taken * worthTaken - moved * worthMoved;
  };
}

function fitFixed(evaluate, { grid = WEIGHTS, legalRecapture = false } = {}) {
  const pins = legalRecapture ? [0] : [...grid, ...grid.slice(1).map(value => -value)];
  let best;
  let settings = 0;
  for (const reach of grid) for (const pin of pins) for (const taken of grid) for (const moved of grid) {
    settings++;
    const weights = [reach, pin, taken, moved];
    const result = evaluate(fixedScore(weights, legalRecapture));
    if (!best || (result.solved ?? 0) > (best.solved ?? 0) ||
        ((result.solved ?? 0) === (best.solved ?? 0) && result.boardCredit > best.boardCredit + 1e-12))
      best = { weights, ...result };
  }
  return { settings, ...best };
}

export function checkConceptRecords(generated) {
  const cache = new Map();
  function rowsFor(fen) {
    if (!cache.has(fen)) {
      assert.ok(legalStart(fen), `Invalid starting position: ${fen}`);
      const rows = checkerRows(fen, matchRows(fen));
      const board = new Chess(fen);
      const moves = board.moves({ verbose: true }).filter(move => move.piece !== 'k')
        .map(({ from, to, promotion }) => from + to + (promotion ?? '')).sort();
      assert.deepEqual(rows.map(row => row.move).sort(), moves, fen);
      const pieces = board.board().flat().filter(Boolean).length;
      for (const row of rows) {
        assert.equal(row.score, row.checker, `${row.move} on ${fen}`);
        row.piecesLeft = pieces - Number(row.capturedValue > 0);
        row.features = singleConceptNumbers(row.records);
      }
      cache.set(fen, rows);
    }
    return cache.get(fen);
  }

  const familyForBoard = new Map();
  function verifyPairs(pairs, { acceptLegacyPinScope = false } = {}) {
    const ids = new Set();
    const legacyPinScopeExceptions = [];
    for (const pair of pairs) {
      const { boards, family, id, split, type } = pair;
      assert.ok(!ids.has(id) && PAIR_TYPES.includes(type), id);
      ids.add(id);
      assert.equal(split, splitForFamily(family), id);
      assert.equal(boards.length, 2, id);
      assert.notEqual(boards[0].best, boards[1].best, id);
      const rows = boards.map(board => {
        const canonical = canonicalBoard(board.fen);
        assert.equal(familyForBoard.get(canonical) ?? family, family, `Board crosses families: ${id}`);
        familyForBoard.set(canonical, family);
        const checked = rowsFor(board.fen);
        assert.deepEqual(pick(checked, row => row.checker), [board.best], id);
        assert.ok(checked.find(row => row.move === board.best).checker > 0, id);
        return checked;
      });
      const bestMoves = boards.map(board => board.best);
      const fens = boards.map(board => board.fen);
      if (!isNamedFlip(fens, rows, bestMoves, type)) {
        assert.ok(acceptLegacyPinScope && type === PAIR_TYPES[1] &&
          isNamedFlip(fens, rows, bestMoves, type, { legacyPinScope: true }), `Wrong edit: ${id}`);
        legacyPinScopeExceptions.push(id);
      }
      // The same ordered difference forces every raw fixed sum to give the
      // same ordering (or tie) to these two moves on both boards.
      assert.ok(sameFixedSumDifference(rows, ...bestMoves), `Fixed sum can escape: ${id}`);
    }
    return legacyPinScopeExceptions;
  }

  function controls(pairs) {
    const evaluate = score => evaluatePairs(pairs, rowsFor, score);
    const development = pairs.filter(pair => pair.split === 'development');
    const heldBack = pairs.filter(pair => pair.split === 'held-back development');
    const fit = fitFixed(score => evaluatePairs(development, rowsFor, score));
    const exactBoards = new Map(pairs.flatMap(pair =>
      pair.boards.map(board => [board.fen, { family: pair.family, best: board.best }])));
    const recallHits = pairs.filter(pair => pair.boards.every(board => {
      const past = exactBoards.get(board.fen);
      return past.family !== pair.family && past.best === board.best;
    })).length;
    const fixedSum = fitFixed(evaluate);
    assert.equal(fixedSum.solved, 0);
    return {
      families: new Set(pairs.map(pair => pair.family)).size,
      distinctBoards: new Set(pairs.flatMap(pair => pair.boards.map(board => board.fen))).size,
      match: evaluate(match),
      fixedSum,
      fixedSumFitByFamily: {
        development: fit,
        heldBack: evaluatePairs(heldBack, rowsFor, fixedScore(fit.weights)),
      },
      checkerCeiling: evaluate(row => row.checker),
      fixedSumWithLegalRecapture: fitFixed(evaluate, { legalRecapture: true }),
      pinRemoved: evaluate(noPin),
      reachRemoved: evaluate(noReach),
      worthRemoved: evaluate(noWorth),
      mostValuableCapture: evaluate(noReach),
      materialDifference: evaluate(row => row.capturedValue ? row.capturedValue - row.moverValue : -99),
      fewestReachingPieces: evaluate(row => -row.records.reach.length + (row.capturedValue ? 0.5 : 0)),
      fewestPiecesLeft: evaluate(row => -row.piecesLeft),
      fewestLegalReplies: evaluate(row => -row.replyCount),
      exactRecallAcrossFamilies: {
        pairs: pairs.length,
        solved: recallHits,
        reason: 'An exact board from the same family cannot be recalled.',
      },
    };
  }

  verifyPairs(fixture.handPairs);
  const legacyPinScopeExceptions = verifyPairs(fixture.pairs, { acceptLegacyPinScope: true });
  const handBoards = fixture.handBoards;
  const scoreHand = makeScore => handBoards.reduce((sum, board) =>
    sum + credit(rowsFor(board.fen), makeScore(board), board.best), 0);
  const swap = (partner, field) => board => row => {
    const other = handBoards.find(item => item.id === board[partner]);
    const records = other && rowsFor(other.fen).find(item => item.move === row.move)?.records;
    return combine(records ? { ...row.records, [field]: records[field] } : row.records).score;
  };
  const hand = {
    match: scoreHand(() => match),
    pinRemoved: scoreHand(() => noPin),
    reachRemoved: scoreHand(() => noReach),
    worthRemoved: scoreHand(() => noWorth),
    pinSwapped: scoreHand(swap('pinPartner', 'pins')),
    reachSwapped: scoreHand(swap('reachPartner', 'reach')),
    fixedSum: fitFixed(score => ({ boardCredit: scoreHand(() => score) }), { grid: WEIGHTS.slice(0, -1) }),
    fixedSumWithLegalRecapture: fitFixed(score => ({ boardCredit: scoreHand(() => score) }),
      { grid: WEIGHTS.slice(0, -1), legalRecapture: true }),
    fewestLegalReplies: scoreHand(() => row => -row.replyCount),
  };

  const traps = fixture.traps.map(({ id, fen, move, checkerScore, needs }) => {
    const row = checkerRows(fen, matchRows(fen).filter(candidate => candidate.move === move))[0];
    assert.equal(row.checker, checkerScore, id);
    const extra = extraConceptsFor(row.candidate);
    assert.deepEqual(extra, needs, id);
    if (!needs.length) assert.equal(row.score, checkerScore, id);
    return { id, move, matchScore: row.score, checkerScore, outsideScope: extra };
  });

  const savedPairs = { ...controls(fixture.pairs), legacyPinScopeExceptions };
  assert.equal(savedPairs.match.solved, fixture.pairs.length);
  const report = { hand, traps, savedPairs, freshPairs: null };
  if (generated) {
    verifyPairs(generated.pairs);
    for (const type of PAIR_TYPES) {
      const { accepted, attempts, rejections } = generated.counts[type];
      assert.equal(generated.pairs.filter(pair => pair.type === type).length, accepted);
      assert.equal(accepted + Object.values(rejections).reduce((sum, count) => sum + count, 0), attempts);
    }
    const checked = controls(generated.pairs);
    assert.equal(checked.match.solved, generated.pairs.length);
    report.freshPairs = {
      ...generated,
      results: checked,
      reachedQuota: PAIR_TYPES.every(type => generated.counts[type].accepted === generated.pairsPerType),
    };
  }
  report.distinctBoardsChecked = cache.size;
  report.nonKingMovesChecked = [...cache.values()].reduce((sum, rows) => sum + rows.length, 0);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: {
    out: { type: 'string' },
    generate: { type: 'boolean' },
    seed: { type: 'string' },
    'pairs-per-type': { type: 'string' },
    'max-attempts': { type: 'string' },
  } });
  const optionalNumber = name => values[name] === undefined ? undefined : Number(values[name]);
  if (!values.generate && ['seed', 'pairs-per-type', 'max-attempts'].some(name => values[name] !== undefined))
    throw Error('Use --generate with generation options');
  const report = checkConceptRecords(values.generate ? generateFlipPairs({
    seed: optionalNumber('seed'), pairsPerType: optionalNumber('pairs-per-type'),
    maxAttempts: optionalNumber('max-attempts'),
  }) : undefined);
  const json = JSON.stringify(report, null, 2) + '\n';
  if (values.out) writeFileSync(values.out, json, { flag: 'wx' });
  else process.stdout.write(json);
  if (report.freshPairs && !report.freshPairs.reachedQuota) process.exitCode = 1;
}

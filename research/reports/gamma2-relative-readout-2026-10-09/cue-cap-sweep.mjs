import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { createCompartmentChessCueEncoder } from '../../../.codebase/src/chess-input/compartment-chess-cue.mjs';

const json = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const protocol = json('research/data/adaptive-near-transfer-v4/protocol.json');
const encoderPath = '.codebase/src/chess-input/compartment-chess-cue.mjs';
assert.equal(hash(encoderPath), protocol.sources[encoderPath]);
const mapping = json(protocol.mappingPath).mapping;
const trainPlan = json('research/data/smothered-acquisition-v1/fixed-plan.json');
const training = trainPlan.experiences.find(e => e.status === 'success');
const trainBoard = new Chess(training.context.fen);
const report = json('research/reports/adaptive-near-transfer-v4-2026-10-07/report.json');
const caps = [14, 28, 42];
const sweep = caps.map(maxCells => {
  const encoder = createCompartmentChessCueEncoder(mapping,
    { ...protocol.encoder, maxCells, totalCurrent: 21, conjoin: false, stratify: true });
  let train;
  try { train = encoder.encode(trainBoard, training.move, training.context.task); }
  catch (error) {
    return { maxCells, trainEncoderIdentity: encoder.identity, trainingMove: training.move,
      error: String(error), positions: [] };
  }
  const trainCells = new Set(train.stimulation.map(c => c.index));
  const positions = report.panels.filter(p => p.condition === 'informative').map(panel => {
    const board = new Chess(panel.position.fen);
    const absent = report.panels.find(p => p.condition === 'absent' && p.position.id === panel.position.id);
    const rows = panel.rows.map(row => {
      const cue = encoder.encode(board, row.move,
        { objective: panel.position.objective, plies: panel.position.plies });
      const cells = new Set(cue.stimulation.map(c => c.index));
      const overlap = [...trainCells].filter(i => cells.has(i)).length;
      const neutral = absent.rows.find(r => r.move === row.move);
      return { move: row.move, consequence: row.consequence, deltaScore: row.score - neutral.score,
        overlap, jaccard: overlap / (trainCells.size + cells.size - overlap),
        cueCells: cells.size, currentPerCell: cue.accounting.currentPerCell,
        totalCurrent: cue.accounting.totalCurrent };
    });
    const correct = rows.find(r => r.consequence === 'success');
    const learnedWrong = rows.reduce((best, row) => row.deltaScore > best.deltaScore ? row : best);
    const patterns = new Set(rows.map(row => encoder.encode(board, row.move,
      { objective: panel.position.objective, plies: panel.position.plies }).stimulation.map(c=>c.index).join(',')));
    return { id: panel.position.id, successMove: correct.move,
      successVsLearnedTop: { successDelta: correct.deltaScore, successOverlap: correct.overlap,
        learnedTop: learnedWrong.move, learnedTopStatus: learnedWrong.consequence,
        learnedTopDelta: learnedWrong.deltaScore, learnedTopOverlap: learnedWrong.overlap },
      distinctAllLegalCues: patterns.size, legalCount: rows.length };
  });
  return { maxCells, trainingCells: train.stimulation.length,
    trainingCurrentPerCell: train.accounting.currentPerCell, trainingTotalCurrent: train.accounting.totalCurrent,
    positions };
});
const output = { scope: 'Static input-projection sweep on previously inspected development positions; same feature encoder, seed, and total current; no graph inference, learning, or final-family evaluation.',
  encoderSha256: hash(encoderPath), protocolSha256: hash('research/data/adaptive-near-transfer-v4/protocol.json'),
  trainMove: training.move, trainFen: training.context.fen, sweep };
writeFileSync('research/reports/gamma2-relative-readout-2026-10-09/cue-cap-sweep.json', JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(sweep.map(s=>({maxCells:s.maxCells,totalCurrent:s.trainingTotalCurrent,
  perCell:s.trainingCurrentPerCell,positions:s.positions.map(p=>({id:p.id,success:p.successVsLearnedTop.successMove,
    successOverlap:p.successVsLearnedTop.successOverlap,top:p.successVsLearnedTop.learnedTop,
    topStatus:p.successVsLearnedTop.learnedTopStatus,topOverlap:p.successVsLearnedTop.learnedTopOverlap,
    unique:p.distinctAllLegalCues}))}))));

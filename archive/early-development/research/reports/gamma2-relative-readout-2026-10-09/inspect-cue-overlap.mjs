import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { createCompartmentChessCueEncoder } from '../../../.codebase/src/chess-input/compartment-chess-cue.mjs';

const json = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const protocol = json('research/data/adaptive-near-transfer-v4/protocol.json');
const mappingPath = protocol.mappingPath;
assert.equal(hash('.codebase/src/chess-input/compartment-chess-cue.mjs'),
  protocol.sources['.codebase/src/chess-input/compartment-chess-cue.mjs']);
const mapping = json(mappingPath).mapping;
const encoder = createCompartmentChessCueEncoder(mapping,
  { ...protocol.encoder, conjoin: protocol.variant.conjoin, stratify: protocol.variant.stratify });
const acquisition = json('research/data/smothered-acquisition-v1/fixed-plan.json');
const training = acquisition.experiences.find(e => e.status === 'success');
assert(training, 'Missing certified successful training action');
const trainBoard = new Chess(training.context.fen);
const trainCue = encoder.encode(trainBoard, training.move, training.context.task);
const trainTokens = new Set(trainCue.tokens);
const panelReport = json('research/reports/adaptive-near-transfer-v4-2026-10-07/report.json');
const informative = panelReport.panels.filter(p => p.condition === 'informative');
const output = informative.map(panel => {
  const board = new Chess(panel.position.fen);
  const absent = panelReport.panels.find(p => p.condition === 'absent' && p.position.id === panel.position.id);
  const rows = panel.rows.map(row => {
    const cue = encoder.encode(board, row.move, { objective: panel.position.objective, plies: panel.position.plies });
    const a = new Set(trainCue.stimulation.map(c => c.index)), b = new Set(cue.stimulation.map(c => c.index));
    const overlap = [...a].filter(i => b.has(i)).length;
    const neutral = absent.rows.find(r => r.move === row.move);
    return { move: row.move, consequence: row.consequence,
      deltaScore: row.score - neutral.score, trainingCells: a.size, evaluationCells: b.size, overlap,
      jaccard: overlap / (a.size + b.size - overlap), tokenCount: cue.tokens.length,
      tokenOverlap: cue.tokens.filter(t=>trainTokens.has(t)).length,
      sharedTokens: cue.tokens.filter(t=>trainTokens.has(t)) };
  }).sort((a,b)=>b.deltaScore-a.deltaScore);
  return { position: panel.position.id, successDeltaRanks: rows.filter(r=>r.consequence==='success')
    .map(r=>({move:r.move,rank:1+rows.filter(x=>x.deltaScore>r.deltaScore).length})), rows };
});
const result = { scope: 'Post-hoc analysis of saved informative-minus-absent score effects and statically recomputed KC overlap on previously inspected development positions; no new neural inference or training.',
  encoderSha256: hash('.codebase/src/chess-input/compartment-chess-cue.mjs'),
  protocolSha256: hash('research/data/adaptive-near-transfer-v4/protocol.json'),
  trainingMove: training.move, trainingPosition: training.context.fen, trainingCells: trainCue.stimulation.map(c => c.index),
  positions: output };
writeFileSync('research/reports/gamma2-relative-readout-2026-10-09/cue-overlap-exploration-v3.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(output.map(p=>({position:p.position,successDeltaRanks:p.successDeltaRanks,
  top:p.rows.slice(0,4).map(r=>({move:r.move,status:r.consequence,delta:r.deltaScore,overlap:r.overlap}))}))));

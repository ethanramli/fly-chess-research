import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';

const protocolPath = 'research/data/capture-retention-transfer-v2/protocol.json';
const trainPath = 'research/data/capture-retention-transfer-v2/train.jsonl';
const finalPath = 'research/data/capture-retention-transfer-v2/final.jsonl';
const reportPath = process.argv[2] ?? 'research/reports/capture-retention-nearest-cue-baseline-2026-10-07/report.json';
const bytes = path => readFileSync(path), sha = value => createHash('sha256').update(value).digest('hex');
const protocolBytes = bytes(protocolPath), protocol = JSON.parse(protocolBytes);
const mappingBytes = bytes(protocol.cue.mappingPath), mapping = JSON.parse(mappingBytes).mapping;
const cueSourcePath = '.codebase/src/chess-input/relational-chess-cue-v3.mjs';
const cueSourceSha256 = sha(bytes(cueSourcePath)), mappingSha256 = sha(mappingBytes);
if (protocol.inputHashes[cueSourcePath] !== cueSourceSha256
  || protocol.inputHashes[protocol.cue.mappingPath] !== mappingSha256) throw Error('Frozen source/mapping hash mismatch');
const packageJson = JSON.parse(bytes('node_modules/chess.js/package.json'));
if (packageJson.version !== protocol.dependencies['chess.js']) throw Error('chess.js version mismatch');
const encoder = createRelationalChessCueEncoder(mapping, protocol.cue.config);
if (encoder.identity !== protocol.cue.identity) throw Error('Cue identity mismatch');
const load = path => bytes(path).toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
const cueFor = (panel, candidate) => {
  const board = new Chess(); board.loadPgn(panel.pgn);
  return encoder.encode(board, candidate.move, protocol.task);
};
const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  let intersection = 0; for (const x of A) if (B.has(x)) intersection++;
  return intersection / (A.size + B.size - intersection);
};
const train = load(trainPath).flatMap(panel => panel.candidates.map(candidate => {
  const cue = cueFor(panel, candidate);
  return { id: `${panel.id}/${candidate.move}`, cells: cue.stimulation.map(x => x.index),
    status: candidate.proof.status };
})).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const finals = load(finalPath);
const panels = finals.map(panel => {
  const candidates = panel.candidates.map(candidate => {
    const cue = cueFor(panel, candidate), cells = cue.stimulation.map(x => x.index);
    const ranked = train.map(row => ({ row, similarity: jaccard(cells, row.cells) }))
      .sort((a, b) => b.similarity - a.similarity || (a.row.id < b.row.id ? -1 : a.row.id > b.row.id ? 1 : 0));
    return { move: candidate.move, predictedStatus: ranked[0].row.status,
      nearestTrainingExperience: ranked[0].row.id, jaccard: ranked[0].similarity,
      candidateCorrect: ranked[0].row.status === candidate.proof.status };
  });
  const predicted = candidates.filter(c => c.predictedStatus === 'success');
  const correct = panel.candidates.find(c => c.proof.status === 'success')?.move;
  const chosenMove = predicted.length === 1 ? predicted[0].move : null;
  return { panelId: panel.id, candidates, correctMove: correct, chosenMove,
    pairCorrect: chosenMove !== null && chosenMove === correct };
});
const pair = panels.filter(p => ['te-01', 'te-05'].includes(p.panelId));
if (pair.length !== 2) throw Error('Expected frozen te-01/te-05 counterfactual pair');
const report = { schema: 'capture-retention-nearest-cue-baseline-v1', date: '2026-10-07',
  scope: 'Fixed one-nearest-training-cue baseline; final outcomes are used only to score this baseline, never to train or tune an encoder/model.',
  metric: 'Jaccard similarity over selected KC index sets; descending similarity; lexical training event ID breaks ties; a panel is correct only when exactly one candidate is predicted success and it matches the verified success.',
  protocolPath, protocolSha256: sha(protocolBytes), trainPath, trainSha256: sha(bytes(trainPath)),
  finalPath, finalSha256: sha(bytes(finalPath)), mappingPath: protocol.cue.mappingPath, mappingSha256,
  cueSourcePath, cueSourceSha256, scriptPath: fileURLToPath(import.meta.url).replaceAll('\\', '/'),
  scriptSha256: sha(bytes(fileURLToPath(import.meta.url))), chessJsVersion: packageJson.version,
  result: { trainExperiences: train.length, finalPanels: panels.length,
    candidateOutcomeAccuracy: panels.reduce((n, p) => n + p.candidates.filter(c => c.candidateCorrect).length, 0)
      / panels.reduce((n, p) => n + p.candidates.length, 0),
    pairChoiceAccuracy: panels.filter(p => p.pairCorrect).length / panels.length,
    counterfactualPairCorrect: pair.every(p => p.pairCorrect) },
  counterfactualPair: pair, panels };
const out = resolve(reportPath); mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reportPath, result: report.result }));

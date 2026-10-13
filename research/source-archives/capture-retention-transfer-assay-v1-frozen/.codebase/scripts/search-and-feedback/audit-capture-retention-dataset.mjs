import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { checkCaptureRetentionCertificate } from '../../src/search-and-feedback/capture-retention-certificate-check.mjs';

const root = process.cwd(), dataset = resolve(process.argv[2] ?? 'research/data/capture-retention-transfer-v2');
const out = resolve(process.argv[3] ?? 'research/reports/capture-retention-transfer-audit-v1-2026-10-07/audit.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const protocolBytes = readFileSync(resolve(dataset, 'protocol.json')), protocol = JSON.parse(protocolBytes);
if (protocol.schema !== 'capture-retention-transfer-protocol-v2') throw Error('Unexpected frozen protocol schema');
for (const [path, expected] of Object.entries(protocol.inputHashes))
  if (sha(readFileSync(resolve(root, path))) !== expected) throw Error(`Pinned source mismatch: ${path}`);
for (const [path, expected] of Object.entries(protocol.files))
  if (sha(readFileSync(resolve(dataset, path))) !== expected) throw Error(`Dataset file hash mismatch: ${path}`);
const mappingPath = protocol.cue.mappingPath, mappingBytes = readFileSync(resolve(root, mappingPath));
if (sha(mappingBytes) !== protocol.cue.mappingSha256) throw Error('Mapping hash mismatch');
const encoder = createRelationalChessCueEncoder(JSON.parse(mappingBytes).mapping, protocol.cue.config);
if (encoder.identity !== protocol.cue.identity) throw Error('Encoder identity mismatch');
const dependencyEntrypoint = fileURLToPath(import.meta.resolve('chess.js'));
const dependencyPackage = resolve(dirname(dependencyEntrypoint), '..', '..', 'package.json');
const dependencyMetadata = JSON.parse(readFileSync(dependencyPackage, 'utf8'));
if (dependencyMetadata.version !== protocol.dependencies['chess.js']) throw Error('Resolved chess.js version mismatch');

const splits = {}, allFen = new Set(), cueGroups = new Map(), rowsBySplit = {};
for (const split of ['train','validation','final']) {
  const rows = readFileSync(resolve(dataset, `${split}.jsonl`), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  rowsBySplit[split] = [];
  const counts = { success: 0, failure: 0 }, splitCues = new Set();
  for (const panel of rows) {
    if (panel.schema !== 'capture-retention-panel-v1' || allFen.has(panel.fen)) throw Error(`Invalid/overlapping panel ${panel.id}`);
    allFen.add(panel.fen);
    const board = new Chess(); board.loadPgn(panel.pgn);
    if (board.fen() !== panel.fen || panel.task.objective !== 'capture-retention' || panel.task.plies !== 1)
      throw Error(`Board/task binding mismatch ${panel.id}`);
    if (panel.candidates.length !== 2) throw Error(`Expected two diagnostic candidates in ${panel.id}`);
    const outcomes = [];
    for (const candidate of panel.candidates) {
      const legal = board.moves({ verbose: true }).find(move => move.from + move.to === candidate.move);
      if (!legal?.captured) throw Error(`Candidate is not a legal capture: ${panel.id}/${candidate.move}`);
      const checked = checkCaptureRetentionCertificate(board, candidate.move, candidate.proof);
      if (!checked.verified || checked.status !== candidate.proof.status) throw Error(`Certificate failed: ${panel.id}/${candidate.move}`);
      if (board.fen() !== panel.fen || board.pgn() !== panel.pgn) throw Error(`Checker mutated panel ${panel.id}`);
      const cue = encoder.encode(board, candidate.move, panel.task);
      if (cue.tokens.some(token => /success|failure|safe|unsafe|recapture/i.test(token)))
        throw Error(`Outcome token leaked into cue: ${panel.id}/${candidate.move}`);
      const stim = cue.stimulation.map(cell => cell.index).sort((a,b) => a-b);
      const cueKey = JSON.stringify(stim), row = { split, panel: panel.id, move: candidate.move,
        status: checked.status, cueKey, cueHash: sha(Buffer.from(cueKey)), tokens: new Set(cue.tokens), stim: new Set(stim) };
      if (cueGroups.has(cueKey)) cueGroups.get(cueKey).push(row); else cueGroups.set(cueKey, [row]);
      splitCues.add(cueKey); outcomes.push(checked.status); counts[checked.status]++;
      rowsBySplit[split].push(row);
    }
    if (outcomes.slice().sort().join(',') !== 'failure,success') throw Error(`Unbalanced panel ${panel.id}`);
  }
  splits[split] = { panels: rows.length, candidateExperiences: rowsBySplit[split].length,
    consequenceCounts: counts, uniqueCuePatterns: splitCues.size };
}
const collisions = [...cueGroups.values()].filter(group => group.length > 1).map(group => ({
  labelsConflict: new Set(group.map(row => row.status)).size > 1,
  cases: group.map(({ split,panel,move,status }) => ({split,panel,move,status})) }));
const train = rowsBySplit.train, final = rowsBySplit.final, cellOverlaps = [], tokenOverlaps = [];
for (const left of train) for (const right of final) {
  cellOverlaps.push([...left.stim].filter(cell => right.stim.has(cell)).length);
  tokenOverlaps.push([...left.tokens].filter(token => right.tokens.has(token)).length);
}
const summarize = values => ({ min: Math.min(...values), max: Math.max(...values),
  mean: values.reduce((a,b)=>a+b,0)/values.length,
  median: [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)] });
const report = { schema:'capture-retention-dataset-audit-v1', date:'2026-10-07',
  scope:'Independent certificate, split, leakage, exact-cue and overlap audit; no graph inference, learning, candidate selection, Monte Carlo search, or final performance evaluation.',
  protocolSha256:sha(protocolBytes), protocolPath:'research/data/capture-retention-transfer-v2/protocol.json',
  encoderIdentity:encoder.identity, mappingSha256:sha(mappingBytes), splits,
  fullSet:{ distinctPositions:allFen.size, distinctCuePatterns:cueGroups.size,
    exactCueCollisionGroups:collisions, conflictingCueLabels:collisions.filter(group=>group.labelsConflict).length,
    trainToFinalPairwiseCellOverlap:summarize(cellOverlaps), trainToFinalPairwiseTokenOverlap:summarize(tokenOverlaps) },
  sourceHashes:Object.fromEntries(['.codebase/scripts/search-and-feedback/audit-capture-retention-dataset.mjs',
    '.codebase/src/chess-input/relational-chess-cue-v3.mjs',
    '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs','package.json','package-lock.json']
    .map(path=>[path,sha(readFileSync(resolve(root,path)))])),
  resolvedDependency:{ name:'chess.js', version:dependencyMetadata.version,
    entrypoint:dependencyEntrypoint.replaceAll('\\','/'), entrypointSha256:sha(readFileSync(dependencyEntrypoint)),
    packageJson:dependencyPackage.replaceAll('\\','/'), packageJsonSha256:sha(readFileSync(dependencyPackage)) } };
mkdirSync(dirname(out), {recursive:true});
const tmp=`${out}.partial`;writeFileSync(tmp,`${JSON.stringify(report,null,2)}\n`,{flag:'wx'});renameSync(tmp,out);
console.log(JSON.stringify({out,protocolSha256:report.protocolSha256,splits,
  exactCueCollisionGroups:collisions.length,conflictingCueLabels:report.fullSet.conflictingCueLabels,
  trainToFinalPairwiseCellOverlap:report.fullSet.trainToFinalPairwiseCellOverlap}));

import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';

const root = process.cwd();
const protocolPath = 'research/data/capture-retention-transfer-v2/protocol.json';
const finalPath = 'research/data/capture-retention-transfer-v2/final.jsonl';
const reportPath = process.argv[2] ?? 'research/reports/capture-retention-role-ablation-preflight-2026-10-07/report-v2.json';
const bytes = path => readFileSync(path);
const sha = value => createHash('sha256').update(value).digest('hex');
const protocolBytes = bytes(protocolPath), protocol = JSON.parse(protocolBytes);
const mappingBytes = bytes(protocol.cue.mappingPath), mapping = JSON.parse(mappingBytes).mapping;
const mappingSha256 = sha(mappingBytes);
const cueSourcePath = '.codebase/src/chess-input/relational-chess-cue-v3.mjs';
const cueSourceSha256 = sha(bytes(cueSourcePath));
if (protocol.inputHashes[protocol.cue.mappingPath] !== mappingSha256
  || protocol.inputHashes[cueSourcePath] !== cueSourceSha256) throw Error('Frozen mapping/cue source hash mismatch');
const chessPackage = JSON.parse(bytes('node_modules/chess.js/package.json'));
if (chessPackage.version !== protocol.dependencies['chess.js']) throw Error('chess.js version mismatch');
const encoder = createRelationalChessCueEncoder(mapping, protocol.cue.config);
if (encoder.identity !== protocol.cue.identity) throw Error('Cue identity differs from frozen protocol');
const finalBytes = bytes(finalPath);
const rows = finalBytes.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
const pool = encoder.pool;
const bucket = (seed, token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
const swapAnchors = token => token.startsWith('around-target:')
  ? token.replace(/^around-target:/, 'around-origin:')
  : token.startsWith('around-origin:') ? token.replace(/^around-origin:/, 'around-target:') : token;
let candidates = 0, duplicateTokenCues = 0, changedStimulatedSets = 0;
const counts = [], rowsOut = [];
for (const panel of rows) for (const candidate of panel.candidates) {
  const board = new Chess(); board.loadPgn(panel.pgn);
  const cue = encoder.encode(board, candidate.move, protocol.task);
  const tokens = cue.tokens.map(swapAnchors).sort();
  if (new Set(tokens).size !== tokens.length) duplicateTokenCues++;
  const unique = [...new Set(tokens.map(token => pool[bucket(protocol.cue.config.seed, token, pool.length)]))];
  unique.sort((a, b) => bucket(protocol.cue.config.seed, `budget:${a}`, 0x100000000)
    - bucket(protocol.cue.config.seed, `budget:${b}`, 0x100000000) || a - b);
  const indices = unique.slice(0, protocol.cue.config.maxCells).sort((a, b) => a - b);
  const current = Math.min(protocol.cue.config.maxCellCurrent, protocol.cue.config.totalCurrent / indices.length);
  if (indices.length !== cue.stimulation.length || current !== cue.stimulation[0]?.current
    || Math.abs(current * indices.length - protocol.cue.config.totalCurrent) > 1e-9)
    throw Error(`Ablation changes stimulation budget at ${panel.id}/${candidate.move}`);
  const changed = indices.some((index, i) => index !== cue.stimulation[i].index);
  if (changed) changedStimulatedSets++;
  counts.push(indices.length);
  rowsOut.push({ panelId: panel.id, move: candidate.move, stimulatedCells: indices.length,
    totalCurrent: current * indices.length, stimulatedSetChanged: changed });
  candidates++;
}
if (duplicateTokenCues) throw Error('Role namespace swap creates duplicate feature tokens');
const report = {
  schema: 'capture-retention-role-ablation-preflight-v1', date: '2026-10-07',
  scope: 'Static final-cue diagnostic only; no outcome fields are used or reported; no neural activity, learning or choices run.',
  protocolPath, protocolSha256: sha(protocolBytes), finalPath, finalSha256: sha(finalBytes),
  mappingPath: protocol.cue.mappingPath, mappingSha256,
  cueSourcePath, cueSourceSha256,
  scriptPath: fileURLToPath(import.meta.url).replaceAll('\\', '/'), scriptSha256: sha(bytes(fileURLToPath(import.meta.url))),
  chessJsVersion: chessPackage.version,
  ablation: 'Swap around-target and around-origin namespaces on all board-piece relation tokens; retain action/task/global tokens and original hash seed, KC pool, max-cell and current settings.',
  result: { candidateCues: candidates, duplicateTokenCues, stimulatedCellCountRange: [Math.min(...counts), Math.max(...counts)],
    totalCurrentPerCue: protocol.cue.config.totalCurrent, changedStimulatedSets },
  cueIdentity: encoder.identity, rows: rowsOut
};
const out = resolve(root, reportPath);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reportPath, result: report.result, scope: report.scope }));

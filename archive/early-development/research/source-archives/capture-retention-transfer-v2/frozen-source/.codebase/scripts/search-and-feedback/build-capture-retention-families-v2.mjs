import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { checkCaptureRetentionCertificate } from '../../src/search-and-feedback/capture-retention-certificate-check.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';

const root = process.cwd(), out = resolve(process.argv[2] ?? 'research/data/capture-retention-transfer-v2');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const task = { objective: 'capture-retention', plies: 1 };
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const mappingBytes = readFileSync(resolve(root, mappingPath)), mapping = JSON.parse(mappingBytes).mapping;
const cueConfig = { seed: 14009, maxCells: 14, totalCurrent: 21, maxCellCurrent: 1.5 };
const encoder = createRelationalChessCueEncoder(mapping, cueConfig);

const trainingSpecs = [
  ['tr-01','b4','h4',[]], ['tr-02','c4','h4',[]], ['tr-03','d4','f4',[]], ['tr-04','g4','h4',[]],
  ['tr-05','e6','h4',[]], ['tr-06','e7','h4',[]], ['tr-07','e6','h4',[['c2','w','p']]],
  ['tr-08','e7','h4',[['h7','b','p']]],
];
const validationSpecs = [
  ['va-01','c4','f4',[['c2','w','p']]], ['va-02','g4','h4',[['h7','b','p']]],
  ['va-03','e6','h4',[['g1','w','n']]], ['va-04','e7','h4',[['c2','w','p'],['h7','b','p']]],
];
const finalSpecs = [
  { id:'te-01',firstBlocker:'b4',firstAttacker:'h4',secondTarget:'e6',secondAttacker:'c8',secondBlocker:null,extras:[['c2','w','p']] },
  { id:'te-02',firstBlocker:'c4',firstAttacker:'h4',secondTarget:'e6',secondAttacker:'c8',secondBlocker:null,extras:[['h7','b','p']] },
  { id:'te-03',firstBlocker:'d4',firstAttacker:'h4',secondTarget:'e6',secondAttacker:'c8',secondBlocker:null,extras:[['g1','w','n']] },
  { id:'te-04',firstBlocker:'c4',firstAttacker:'f4',secondTarget:'e6',secondAttacker:'c8',secondBlocker:null,extras:[['c2','w','p'],['h7','b','p']] },
  { id:'te-05',firstBlocker:null,firstAttacker:'h4',secondTarget:'e6',secondAttacker:'c8',secondBlocker:'d7',extras:[['c2','w','p']] },
  { id:'te-06',firstBlocker:null,firstAttacker:'h4',secondTarget:'e5',secondAttacker:'b8',secondBlocker:'d6',extras:[['h7','b','p']] },
  { id:'te-07',firstBlocker:null,firstAttacker:'f4',secondTarget:'e4',secondAttacker:'b6',secondBlocker:'d4',extras:[['g1','w','n']] },
  { id:'te-08',firstBlocker:null,firstAttacker:'h4',secondTarget:'e5',secondAttacker:'c7',secondBlocker:'d6',extras:[['c2','w','p'],['h7','b','p']] },
];

function toFen(pieces) {
  const squares = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const [square, color, type] of pieces) {
    const x = square.charCodeAt(0) - 97, y = Number(square[1]) - 1;
    if (x < 0 || x > 7 || y < 0 || y > 7 || squares[y][x]) throw Error(`Invalid/overlapping piece: ${square}`);
    squares[y][x] = color === 'w' ? type.toUpperCase() : type;
  }
  const rows = [];
  for (let y = 7; y >= 0; y--) {
    let row = '', empty = 0;
    for (let x = 0; x < 8; x++) {
      if (!squares[y][x]) empty++;
      else { if (empty) row += empty; empty = 0; row += squares[y][x]; }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} w - - 0 1`;
}

function makePanel(split, spec, index) {
  let id, pieces, moves;
  if (split === 'final') {
    ({ id } = spec);
    pieces = [['b1','w','k'],['g8','b','k'],['a2','w','r'],['e2','w','r'],['a4','b','p'],
      [spec.secondTarget,'b','p'],[spec.firstAttacker,'b','r'],[spec.secondAttacker,'b','b'],...spec.extras];
    if (spec.firstBlocker) pieces.push([spec.firstBlocker,'w','p']);
    if (spec.secondBlocker) pieces.push([spec.secondBlocker,'w','p']);
    moves = ['a2a4',`e2${spec.secondTarget}`];
  } else {
    const [caseId, blocker, firstAttacker, extras] = spec;
    id = caseId;
    pieces = [['b1','w','k'],['g8','b','k'],['a1','w','r'],['e1','w','r'],['a4','b','p'],
      ['e5','b','p'],['e8','b','r'],[firstAttacker,'b','r'],[blocker,'w','p'],...extras];
    moves = ['a1a4','e1e5'];
  }
  const fen = toFen(pieces), board = new Chess(fen);
  if (board.isCheck()) throw Error(`${id}: side to move starts in check`);
  if (!moves.every(move => board.moves({ verbose: true }).some(candidate => candidate.from + candidate.to === move)))
    throw Error(`${id}: a planned candidate is not legal`);
  const orderedMoves = index % 2 ? [...moves].reverse() : moves;
  const candidates = orderedMoves.map(move => {
    const proof = certifyCaptureRetention(board, move);
    const checked = checkCaptureRetentionCertificate(board, move, proof);
    if (!checked.verified || checked.status !== proof.status) throw Error(`${id}/${move}: certificate check failed`);
    const cue = encoder.encode(board, move, task);
    if (cue.tokens.some(token => /success|failure|safe|unsafe|recapture/i.test(token)))
      throw Error(`${id}/${move}: outcome leaked into cue`);
    return { move, proof };
  });
  const outcomes = candidates.map(candidate => candidate.proof.status).sort();
  if (JSON.stringify(outcomes) !== JSON.stringify(['failure','success']))
    throw Error(`${id}: panel must contain exactly one success and one failure, got ${outcomes}`);
  return { schema: 'capture-retention-panel-v1', id, fen, pgn: board.pgn(), task, candidates };
}

const splitSpecs = { train: trainingSpecs, validation: validationSpecs, final: finalSpecs };
const panels = Object.fromEntries(Object.entries(splitSpecs).map(([split, specs]) =>
  [split, specs.map((spec, index) => makePanel(split, spec, index))]));
const allFens = Object.values(panels).flat().map(panel => panel.fen);
if (new Set(allFens).size !== allFens.length) throw Error('Board position overlaps across dataset splits');
const overall = Object.fromEntries(Object.entries(panels).map(([split, rows]) => {
  const counts = { success: 0, failure: 0 }, cues = new Set();
  for (const panel of rows) for (const { move, proof } of panel.candidates) {
    counts[proof.status]++;
    cues.add(createHash('sha256').update(JSON.stringify(encoder.encode(new Chess(panel.fen), move, task).stimulation)).digest('hex'));
  }
  return [split, { panels: rows.length, candidateExperiences: rows.reduce((n, panel) => n + panel.candidates.length, 0),
    consequenceCounts: counts, uniqueCuePatterns: cues.size }];
}));
mkdirSync(out, { recursive: true });
if (['train.jsonl','validation.jsonl','final.jsonl','protocol.json'].some(name => {
  try { readFileSync(resolve(out, name)); return true; } catch { return false; }
})) throw Error('Dataset output already exists; choose a new versioned directory');
for (const split of Object.keys(panels)) {
  const content = panels[split].map(panel => JSON.stringify(panel)).join('\n') + '\n';
  const tmp = resolve(out, `${split}.jsonl.partial`); writeFileSync(tmp, content, { flag: 'wx' });
  renameSync(tmp, resolve(out, `${split}.jsonl`));
}
const inputHashes = Object.fromEntries([mappingPath,'.codebase/src/chess-input/relational-chess-cue-v3.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
  '.codebase/scripts/search-and-feedback/build-capture-retention-families-v2.mjs','package.json','package-lock.json']
  .map(path => [path,sha(readFileSync(resolve(root,path)))]));
const protocol = { schema:'capture-retention-transfer-protocol-v2', date:'2026-10-07', task,
  cue:{ schema:encoder.schema, identity:encoder.identity, mappingPath, mappingSha256:sha(mappingBytes), config:cueConfig },
  inputHashes, dependencies:{'chess.js':'1.4.0'}, splits:overall,
  files:Object.fromEntries(['train.jsonl','validation.jsonl','final.jsonl'].map(name =>
    [name,sha(readFileSync(resolve(out,name)))])),
  design:{ training:'one replay of both candidates per panel; one success and one failure per panel',
    validation:'disjoint panel family for per-criterion checkpoint selection only',
    final:'position family uses shifted candidate squares and an unseen diagonal attacker relation; do not read outcomes for training or selection',
    controls:'same experiences/cue order from common initial memory: absent feedback, matched shuffled binary consequences, disabled plasticity',
    choices:'two-candidate diagnostic only; later all-legal choices and Monte Carlo investigation remain required',
    status:'data preparation only; no graph run or claim of transferable reasoning' } };
const protocolTmp = resolve(out, 'protocol.json.partial');
writeFileSync(protocolTmp, `${JSON.stringify(protocol,null,2)}\n`, {flag:'wx'});
renameSync(protocolTmp, resolve(out,'protocol.json'));
console.log(JSON.stringify({out, protocol:resolve(out,'protocol.json'), splits:overall,
  protocolSha256:sha(readFileSync(resolve(out,'protocol.json')))}));

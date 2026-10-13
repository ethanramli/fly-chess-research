import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { checkCaptureRetentionCertificate } from '../../src/search-and-feedback/capture-retention-certificate-check.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const root = process.cwd();
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const mappingBytes = readFileSync(resolve(root, mappingPath));
const mapping = JSON.parse(mappingBytes).mapping;
const config = { seed: 14009, maxCells: 14, totalCurrent: 21, maxCellCurrent: 1.5 };
const encoder = createRelationalChessCueEncoder(mapping, config);
const fixtures = [
  { id: 'open-ray', family: 'single-candidate-counterfactual', fen: '6k1/8/8/8/p6r/1P6/8/RK6 w - - 0 1',
    move: 'a1a4', attacker: 'h4', blocker: null },
  { id: 'blocked-ray', family: 'single-candidate-counterfactual', fen: '6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1',
    move: 'a1a4', attacker: 'h4', blocker: 'b4' },
  { id: 'bishop-blocked-rook-recapturable', family: 'two-candidate-counterfactual', fen: '1b4k1/8/3P4/4p3/p6r/8/8/RK2R3 w - - 0 1',
    move: 'a1a4', attacker: 'h4', blocker: null },
  { id: 'bishop-blocked-bishop-protected', family: 'two-candidate-counterfactual', fen: '1b4k1/8/3P4/4p3/p6r/8/8/RK2R3 w - - 0 1',
    move: 'e1e5', attacker: 'b8', blocker: 'd6' },
  { id: 'rook-blocked-rook-protected', family: 'two-candidate-counterfactual', fen: '1b4k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1',
    move: 'a1a4', attacker: 'h4', blocker: 'b4' },
  { id: 'rook-blocked-bishop-recapturable', family: 'two-candidate-counterfactual', fen: '1b4k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1',
    move: 'e1e5', attacker: 'b8', blocker: null },
];

function relativeFeature(cue, board, square, anchor) {
  const piece = board.get(square);
  if (!piece) throw Error(`Fixture role is missing at ${square}`);
  const actor = board.turn(), role = piece.color === actor ? 'self' : 'opponent';
  const [sx, sy] = [square.charCodeAt(0) - 97, Number(square[1]) - 1];
  const [ax, ay] = [anchor.charCodeAt(0) - 97, Number(anchor[1]) - 1];
  const expectedX = Math.abs(sx - ax), expectedY = (sy - ay) * (actor === 'w' ? 1 : -1);
  const prefix = `around-${anchor === cue.move.slice(0, 2) ? 'origin' : 'target'}:`;
  const related = cue.assignments.filter(row => {
    if (!row.token.startsWith(prefix)) return false;
    const match = row.token.match(/:(self|opponent):([pnbrqk]):(-?\d+),(-?\d+)$/);
    return match && match[1] === role && match[2] === piece.type
      && Math.abs(Number(match[3])) === expectedX && Number(match[4]) === expectedY;
  });
  const active = new Set(cue.stimulation.map(cell => cell.index));
  return related.map(row => ({ token: row.token, index: row.index, retained: active.has(row.index) }));
}

const rows = fixtures.map(fixture => {
  const board = new Chess(fixture.fen), beforeFen = board.fen(), beforePgn = board.pgn();
  const task = { objective: 'capture-retention', plies: 1 };
  const cue = encoder.encode(board, fixture.move, task);
  const proof = certifyCaptureRetention(board, fixture.move);
  const checked = checkCaptureRetentionCertificate(board, fixture.move, proof);
  if (!checked.verified || checked.status !== proof.status) throw Error(`Certificate mismatch in ${fixture.id}`);
  if (board.fen() !== beforeFen || board.pgn() !== beforePgn) throw Error(`Fixture mutation in ${fixture.id}`);
  const originAttacker = relativeFeature(cue, board, fixture.attacker, fixture.move.slice(0, 2));
  const targetAttacker = relativeFeature(cue, board, fixture.attacker, fixture.move.slice(2, 4));
  const attackerFeatures = [...originAttacker, ...targetAttacker];
  let blockerFeatures = [];
  if (fixture.blocker) {
    blockerFeatures = [
      ...relativeFeature(cue, board, fixture.blocker, fixture.move.slice(0, 2)),
      ...relativeFeature(cue, board, fixture.blocker, fixture.move.slice(2, 4)),
    ];
  }
  const tokenLabels = cue.tokens.filter(token => /success|failure|safe|unsafe|recapture/i.test(token));
  return { id: fixture.id, family: fixture.family, fen: fixture.fen, move: fixture.move,
    attacker: fixture.attacker, blocker: fixture.blocker, verifiedOutcome: checked.status,
    recaptureReplies: proof.certificate?.recaptures ?? [], cueIdentity: cue.identity,
    stimulation: cue.stimulation.map(cell => cell.index).sort((a, b) => a - b),
    stimulationSha256: digest(cue.stimulation.map(cell => cell.index).sort((a, b) => a - b)),
    accounting: cue.accounting,
    attackerFeatureRetained: attackerFeatures.some(feature => feature.retained),
    attackerFeatureTokens: attackerFeatures,
    blockerFeatureRetained: fixture.blocker ? blockerFeatures.some(feature => feature.retained) : null,
    blockerFeatureTokens: blockerFeatures, leakedOutcomeTokens: tokenLabels };
});
const vectors = new Map();
for (const row of rows) vectors.set(row.stimulationSha256, (vectors.get(row.stimulationSha256) ?? 0) + 1);
const report = { schema: 'capture-retention-cue-audit-v1', date: '2026-10-07', scope:
  'Six developer-created counterfactual candidates only; static mapping/encoder and certificate checks; no neural activity, training, search, or final-family evidence.',
  mappingPath, mappingSha256: sha(mappingBytes), encoderIdentity: encoder.identity, config,
  sourceHashes: Object.fromEntries(['.codebase/scripts/search-and-feedback/audit-capture-retention-cues.mjs',
    '.codebase/src/chess-input/relational-chess-cue-v3.mjs',
    '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
    '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
    'package.json', 'package-lock.json'].map(path =>
      [path, sha(readFileSync(resolve(root, path)))])),
  dependencies: { 'chess.js': '1.4.0' },
  summary: { candidates: rows.length, distinctStimulationPatterns: vectors.size,
    exactStimulusCollisions: rows.length - vectors.size,
    candidatesWithRetainedAttackerFeature: rows.filter(row => row.attackerFeatureRetained).length,
    blockedCandidatesWithRetainedBlockerFeature: rows.filter(row => row.blocker !== null && row.blockerFeatureRetained).length,
    outcomeLabelLeakCount: rows.reduce((sum, row) => sum + row.leakedOutcomeTokens.length, 0) },
  rows };
const out = resolve(process.argv[2] ?? 'research/reports/capture-retention-cue-audit-2026-10-07/report.json');
mkdirSync(dirname(out), { recursive: true });
const temporary = `${out}.partial`;
writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
renameSync(temporary, out);
console.log(JSON.stringify({ out, summary: report.summary, mappingSha256: report.mappingSha256,
  encoderIdentity: report.encoderIdentity, sourceHashes: report.sourceHashes }));

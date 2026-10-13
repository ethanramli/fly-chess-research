import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { explainVerifiedLine } from '../../src/search-and-feedback/verified-line-explanation.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out || existsSync(args.out)) throw Error('Require fresh output');
const fixtures = [
  { id: 'rook-concession-supported', fen: '4r2k/6pr/6K1/7Q/8/8/8/5R2 w - - 0 1' },
  { id: 'rook-concession-changed-support', fen: '4r2k/6pr/8/7Q/6K1/8/8/5R2 w - - 0 1' },
];
const sources = {};
for (const path of ['.codebase/scripts/search-and-feedback/probe-verified-lines.mjs', '.codebase/src/search-and-feedback/verified-line-explanation.mjs',
  '.codebase/src/search-and-feedback/verified-feedback.mjs', '.codebase/src/search-and-feedback/mate-certificate.mjs',
  '.codebase/src/search-and-feedback/mate-certificate-check.mjs', '.codebase/src/search-and-feedback/experimental-puzzle-search.mjs']) sources[path] = await sha256(path);
const results = fixtures.map(fixture => {
  const board = new Chess(fixture.fen), successor = new Chess(fixture.fen); successor.move('Rf8+');
  const proof = certifyMate(successor, board.turn(), { plies: 2, maxNodes: 4096, milliseconds: 2000 });
  return { fixture, candidate: 'f1f8', proof,
    explanation: explainVerifiedLine(board, 'f1f8', { objective: 'forced-mate', plies: 3 }, proof) };
});
mkdirSync(args.out, { recursive: true });
writeFileSync(join(args.out, 'report.json'), JSON.stringify({ sources, results,
  scope: 'Teacher-only composed examples with independently replay-checked certificates; no fly inference, neural feedback, learning or transfer ran. No necessity or unique-best-move claim.' }, null, 2));
console.log(JSON.stringify(results.map(r => ({ id: r.fixture.id, status: r.proof.status,
  nodes: r.proof.nodes, materialConcession: r.explanation.materialConcessionObserved,
  mateDespiteConcession: r.explanation.mateDespiteMaterialConcession }))));

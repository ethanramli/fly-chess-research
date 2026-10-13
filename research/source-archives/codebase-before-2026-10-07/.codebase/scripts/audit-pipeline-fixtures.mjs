import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { streamRows } from '../src/lowram/storage.mjs';
import { experienceBoard } from '../src/lowram/puzzle-experience-plan.mjs';
import { certifyMate } from '../src/lowram/mate-certificate.mjs';
import { sha256 } from './fetch-graph.mjs';
const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out || existsSync(args.out)) throw Error('Require fresh --out');
const protocolPath = 'research/data/puzzle-pipeline-v1/protocol.json', p = JSON.parse(readFileSync(protocolPath)), rows = [];
for await (const row of streamRows(p.puzzles)) {
  assert.ok(rows.length < p.maxPuzzles);
  const board = experienceBoard(row), history = board.pgn();
  const proof = certifyMate(board, board.turn(), { plies: row.plies, maxNodes: 4096, milliseconds: 2000 });
  assert.equal(board.pgn(), history); assert.equal(proof.status, 'success');
  assert.equal(proof.certificateCheck.verified, true);
  rows.push({ row, legalCandidates: board.moves().length, proof });
}
mkdirSync(args.out, { recursive: true });
writeFileSync(join(args.out, 'report.json'), JSON.stringify({ passed: true,
  protocolSha256: await sha256(protocolPath), datasetSha256: await sha256(p.puzzles), rows,
  scope: 'Solvability and dataset-contract engineering check only; no graph, learning or transfer ran' }, null, 2));
console.log(JSON.stringify(rows.map(r => ({ id: r.row.id, status: r.proof.status, nodes: r.proof.nodes }))));

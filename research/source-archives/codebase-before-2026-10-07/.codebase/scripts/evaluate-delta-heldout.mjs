import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { uci } from '../src/lowram/experimental-puzzle-search.mjs';
import { positionDelta, forcingCandidates } from '../src/lowram/delta-forcing-candidates.mjs';

const { values: args } = parseArgs({ options: { input: { type: 'string' }, out: { type: 'string' },
  'max-candidates': { type: 'string', default: '16' }, 'quiet-reserve': { type: 'string', default: '2' } } });
if (!args.input || !args.out) throw Error('Require --input and --out');
const maxCandidates = Number(args['max-candidates']), quietReserve = Number(args['quiet-reserve']);
if (!Number.isSafeInteger(maxCandidates) || !Number.isSafeInteger(quietReserve)) throw Error('Invalid bounds');
const bytes = readFileSync(args.input), rows = bytes.toString('utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
function transition(parentFen, childFen) {
  const parent = new Chess(parentFen), found = [];
  for (const move of parent.moves({ verbose: true })) {
    const next = new Chess(parentFen); next.move(move);
    if (next.fen() === childFen) found.push({ move: uci(move), board: next });
  }
  return found.length === 1 ? found[0] : null;
}
const measurements = [];
for (const row of rows) {
  if (row.split !== 'test' || typeof row.parentFen !== 'string' || !row.fenA || !row.fenB) continue;
  for (const child of [['A', row.fenA], ['B', row.fenB]]) {
    const transitionResult = transition(row.parentFen, child[1]);
    if (!transitionResult) { measurements.push({ id: `${row.id}-${child[0]}`, group: row.group,
      kind: row.kind ?? null, unresolvedTransition: true }); continue; }
    const parent = new Chess(row.parentFen), delta = positionDelta(parent, transitionResult.board);
    const shortlist = forcingCandidates(transitionResult.board, delta, { maxCandidates, quietReserve });
    measurements.push({ id: `${row.id}-${child[0]}`, group: row.group, kind: row.kind ?? null,
      transition: transitionResult.move, changedSquares: delta.changedSquares,
      legalCount: shortlist.legalCount, selectedCount: shortlist.candidates.length,
      omittedCount: shortlist.omitted, selected: shortlist.candidates.map(v => v.uci),
      forcingSelected: shortlist.candidates.filter(v => v.tags.length > 0).length });
  }
}
const resolved = measurements.filter(v => !v.unresolvedTransition);
const summary = { rows: measurements.length, sourceRows: rows.length,
  maxCandidates, quietReserve, meanLegal: resolved.reduce((s, v) => s + v.legalCount, 0) / resolved.length,
  meanSelected: resolved.reduce((s, v) => s + v.selectedCount, 0) / resolved.length,
  totalOmitted: measurements.reduce((s, v) => s + (v.omittedCount ?? 0), 0),
  resolvedTransitions: measurements.filter(v => !v.unresolvedTransition).length,
  unresolvedTransitions: measurements.filter(v => v.unresolvedTransition).length,
  scope: 'Held-out parent-to-child state-delta construction only; no best-move label, neural inference, feedback or transfer claim' };
const report = { schema: 'delta-heldout-v1', input: args.input,
  inputSha256: createHash('sha256').update(bytes).digest('hex'), summary, measurements };
mkdirSync(args.out, { recursive: true }); writeFileSync(`${args.out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(summary));

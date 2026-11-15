// Runs the development-only shortcut audit of the three-idea combination test and prints one row per control.
// Usage: node --max-old-space-size=256 .codebase/scripts/search-and-feedback/audit-combination-shortcuts.mjs [--out results.json]
// Report: research/reports/combination-shortcut-audit-2026-11-16/README.md
import { writeFileSync } from 'node:fs';
import { runAudit, BOARD_CONTROLS } from '../../src/search-and-feedback/combination-shortcut-audit.mjs';

const at = process.argv.indexOf('--out');
const out = at > 0 ? process.argv[at + 1] : null;
if (at > 0 && !out) throw Error('--out needs a path');

const result = runAudit();
const cell = ({ correct, total }) => `${correct}/${total}`;
console.log(['control', 'sees', ...result.groups, 'override comparison'].join(' | '));
for (const name of result.controls) {
  const sees = name in BOARD_CONTROLS ? 'board only' : 'oracle';
  console.log([name, sees, ...result.groups.map(g => cell(result.table[name][g])), result.override.correct[name] ? 'right' : 'wrong'].join(' | '));
}
const ep = result.enPassant;
console.log(`checker gap: ${ep.move} on ${ep.fen} is "${ep.checkerStatus}" with recaptures ${JSON.stringify(ep.recaptures)}; en passant captures of the moved pawn: ${JSON.stringify(ep.enPassantCaptures)}`);
if (out) {
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(`wrote ${out}`);
}

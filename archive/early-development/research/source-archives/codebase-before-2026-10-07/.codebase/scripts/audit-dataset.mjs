import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { streamRows } from '../src/lowram/storage.mjs';
import { sha256 } from './fetch-graph.mjs';

const [dir, out] = process.argv.slice(2);
if (!dir || !out) throw Error('Usage: node scripts/audit-dataset.mjs DATASET REPORT');
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
const positions = new Map(), groups = new Map(), ids = new Set(), splits = {};
let total = 0;
const key = fen => fen.split(' ').slice(0, 4).join(' ');
// Independent material calculation from FEN text, not the label generator.
function material(fen) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let result = 0;
  for (const c of fen.split(' ')[0]) {
    const value = values[c.toLowerCase()];
    if (value !== undefined) result += c === c.toUpperCase() ? value : -value;
  }
  return result / 16;
}
for (const split of ['train', 'validation', 'test']) {
  const path = join(dir, `${split}.jsonl`), spec = manifest.files[split];
  if (await sha256(path) !== spec.sha256) throw Error(`Checksum mismatch: ${split}`);
  const summary = { pairs: 0, families: new Set(), early: 0, quietParent: 0, captureParent: 0, materialLabelsChecked: 0 };
  for await (const row of streamRows(path)) {
    if (++total > 10000) throw Error('This bounded audit supports at most 10000 pairs; use a disk-backed audit for larger corpora');
    if (row.split !== split || typeof row.id !== 'string' || typeof row.group !== 'string' || ids.has(row.id)) throw Error('Invalid split or duplicate row id');
    ids.add(row.id);
    if (groups.has(row.group) && groups.get(row.group) !== split) throw Error('Game family crosses splits');
    groups.set(row.group, split); summary.families.add(row.group);
    for (const a of [row.targetA, row.targetB]) if (!Array.isArray(a) || a.length !== manifest.criteria.length || !a.every(Number.isFinite)) throw Error('Invalid target vector');
    const parent = new Chess(row.parentFen), moves = parent.moves({ verbose: true });
    const reachable = new Set([key(parent.fen())]);
    for (const move of moves) { parent.move(move); reachable.add(key(parent.fen())); parent.undo(); }
    const a = new Chess(row.fenA).fen(), b = new Chess(row.fenB).fen();
    if (key(a) === key(b) || !reachable.has(key(a)) || !reachable.has(key(b))) throw Error('Pair is not formed from its parent and legal one-move successors');
    for (const p of new Set([key(row.parentFen), key(a), key(b)])) {
      if (positions.has(p) && positions.get(p) !== split) throw Error('Position crosses splits');
      positions.set(p, split);
    }
    const index = manifest.criteria.indexOf('white_material_balance_div16');
    if (index >= 0) {
      if (material(a) !== row.targetA[index] || material(b) !== row.targetB[index]) throw Error('Material label mismatch');
      summary.materialLabelsChecked += 2;
    }
    summary.pairs++;
    if (row.parentPly < 12) summary.early++;
    summary[moves.some(m => m.isCapture() || m.isEnPassant()) ? 'captureParent' : 'quietParent']++;
  }
  if (summary.pairs !== spec.pairs) throw Error('Manifest pair count mismatch');
  splits[split] = { ...summary, families: summary.families.size };
}
const report = { timestamp: new Date().toISOString(), dataset: dir, totalPairs: total, passed: true, splits,
  checks: ['Actual file checksums and row counts', 'No game families or parent/child position keys cross splits', 'Valid target shapes',
    'FENs accepted by chess.js and legal one-move relationships', 'Independent material labels from FEN text'],
  limitations: ['Capture labels are not independently verified here', 'Does not prove parents reachable from the starting position; generator provenance supplies legal-game histories',
    'Shared chess motifs may exist across splits', 'Test data were inspected for integrity only; no model predictions or checkpoint selection used them'] };
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

#!/usr/bin/env node
// Independent check of the fly-connections MBON05 mapping before graph use. Re-derives the receiving-side gamma-KC masks,
// PAM07 DAN roots and graph signs from the annotation TSV, then compares them with mapFlyConnectionsMemory.
// Does not call the producer's rules or ReversalMemory; the producer runs only to produce the mapping under test.
// Usage (repo root): node --max-old-space-size=512 .codebase/scripts/neural-learning/check-fly-connections-mapping-v1.mjs --graph GRAPH.npz --annotations ANNOTATIONS.tsv --out DIR [--static PAM07.json]
import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';

export const CHECK_SCHEMA = 'fly-connections-mapping-check-v1';
const READER_CELLS = new URL('../../src/neural-learning/neuron-reader-cells.json', import.meta.url);
const STATIC_DEFAULT = new URL('../../../research/reports/fly-connections-memory-v1-2026-11-07/source-evidence/pam07-static-root-check-r2.json', import.meta.url);
const SIDES = ['left', 'right'];
const FIELDS = ['mbon', 'edges', 'kc', 'pam07', 'signsAllPositive'];
const opposite = side => (side === 'left' ? 'right' : 'left');
const sha256 = text => createHash('sha256').update(text).digest('hex');
// Root IDs exceed 2^53: compare canonical decimal text, never Numbers.
const canonicalRoot = text => {
  if (typeof text !== 'string' || !/^[0-9]+$/.test(text)) throw Error('Invalid root identity');
  return BigInt(text).toString();
};

// Streams the annotation TSV once and keeps only Kenyon_Cell, DAN and MBON rows, keyed by canonical root.
// ponytail: written from the contract, not from the producer's code; a rule difference shows up as a mismatch.
async function annotationRows(path) {
  const rows = new Map();
  let col = null;
  const input = createReadStream(path);
  try {
    for await (const line of createInterface({ input, crlfDelay: Infinity })) {
      if (line === '') continue;
      const fields = line.split('\t');
      if (!col) {
        col = Object.fromEntries(['root_id', 'hemibrain_type', 'cell_class', 'side'].map(name => {
          const at = fields.indexOf(name);
          if (at < 0) throw Error(`Missing annotation column ${name}`);
          return [name, at];
        }));
        continue;
      }
      const cls = fields[col.cell_class] ?? '';
      if (!['Kenyon_Cell', 'DAN', 'MBON'].includes(cls)) continue;
      const root = canonicalRoot(fields[col.root_id] ?? '');
      if (rows.has(root)) throw Error('Duplicate annotation root');
      rows.set(root, { cls, type: fields[col.hemibrain_type] ?? '', side: fields[col.side] ?? '' });
    }
  } finally {
    input.destroy();
  }
  if (!col) throw Error('Missing annotation header');
  return rows;
}

// Independent derivation. Producer uses /^KCg-/ for gamma KCs; this follows the contract wording "starting KCg",
// so any annotation type such as KCgX without a hyphen appears as a mismatch rather than being silently copied.
export async function independentSides({ graph, rootIds, annotationPath, readerRaw }) {
  if (rootIds.length !== graph.row.length - 1) throw Error('Root identities do not match graph nodes');
  const rootIndex = new Map(Array.from(rootIds, (id, i) => [id.toString(), i]));
  if (rootIndex.size !== rootIds.length) throw Error('Duplicate graph root identities');
  const annotated = new Map();
  let outsideGraph = 0;
  for (const [rootId, row] of await annotationRows(annotationPath)) {
    const index = rootIndex.get(rootId);
    if (index === undefined) outsideGraph++;
    else annotated.set(index, { ...row, index, rootId });
  }
  const sides = SIDES.map(side => {
    const readers = readerRaw.filter(cell => cell.type === 'MBON05' && cell.receivingSide === side);
    if (readers.length !== 1) throw Error(`Expected one MBON05 reader on ${side}`);
    const [reader] = readers;
    if (rootIds[reader.index]?.toString() !== reader.rootId) throw Error('MBON05 reader root does not match graph index');
    const mbon = annotated.get(reader.index);
    if (mbon?.cls !== 'MBON' || mbon.type !== 'MBON05' || mbon.side !== opposite(side)) throw Error(`MBON05 annotation does not match ${side} receiving side`);
    const edges = [], kc = [];
    for (let e = graph.row[reader.index]; e < graph.row[reader.index + 1]; e++) {
      const pre = annotated.get(graph.col[e]);
      if (pre?.cls !== 'Kenyon_Cell' || pre.side !== side || !pre.type.startsWith('KCg') || graph.sign[e] !== 1) continue;
      edges.push(e);
      kc.push({ index: pre.index, rootId: pre.rootId });
    }
    const pam07 = [...annotated.values()].filter(row => row.cls === 'DAN' && row.type === 'PAM07' && row.side === side)
      .map(row => ({ index: row.index, rootId: row.rootId })).sort((a, b) => a.index - b.index);
    return { side, mbon: { index: reader.index, rootId: reader.rootId }, edges, kc: kc.sort((a, b) => a.index - b.index), pam07,
      signsAllPositive: edges.every(e => graph.sign[e] === 1) };
  });
  return { sides, outsideGraph };
}

// Pure comparison. Returns [] when the producer mapping and the independent derivation agree and match the static PAM07 reference.
export function compareSides({ graph, rootIds, mapping, independent, staticPam07 }) {
  const rootIndex = new Map(Array.from(rootIds, (id, i) => [id.toString(), i]));
  const mismatches = [];
  const compare = (side, field, expected, actual) => {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) mismatches.push({ side, field, expected, actual });
  };
  for (const side of SIDES) {
    const group = mapping.groups.find(g => g.side === side), ind = independent.sides.find(s => s.side === side);
    if (!group || !ind) { mismatches.push({ side, field: 'presence', expected: Boolean(group), actual: Boolean(ind) }); continue; }
    const producer = {
      mbon: { index: group.mbon.index, rootId: group.mbon.rootId },
      edges: [...group.edges].sort((a, b) => a - b),
      kc: group.kc.map((index, k) => ({ index, rootId: group.kcRootIds[k] })).sort((a, b) => a.index - b.index),
      pam07: group.dan.map(d => ({ index: d.index, rootId: d.rootId })).sort((a, b) => a.index - b.index),
      signsAllPositive: group.edges.every(e => graph.sign[e] === 1),
    };
    for (const field of FIELDS) compare(side, field, producer[field], ind[field]);
    for (const { index, rootId } of [producer.mbon, ...producer.pam07, ...producer.kc]) {
      if (rootIndex.get(rootId) !== index) mismatches.push({ side, field: 'rootIndex', expected: index, actual: rootIndex.get(rootId) ?? null });
    }
  }
  compare('both', 'pam07Static', staticPam07.map(c => `${c.side}:${c.index}:${c.rootId}`).sort(),
    independent.sides.flatMap(s => s.pam07.map(d => `${s.side}:${d.index}:${d.rootId}`)).sort());
  compare('both', 'outsideGraph', mapping.annotationRowsOutsideGraph, independent.outsideGraph);
  return mismatches;
}

export async function checkMapping({ graph, rootIds, annotationPath, readerRaw, readerCells, staticPam07 }) {
  const mapping = await mapFlyConnectionsMemory(graph, rootIds, annotationPath, readerCells);
  const independent = await independentSides({ graph, rootIds, annotationPath, readerRaw });
  const mismatches = compareSides({ graph, rootIds, mapping, independent, staticPam07 });
  return { mapping, independent, mismatches };
}

function readStatic(path) {
  const bytes = readFileSync(path);
  const text = bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString('utf16le') : bytes.toString('utf8');
  return JSON.parse(text.replace(/^﻿/, ''));
}

async function fileSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

async function main() {
  const { values: args } = parseArgs({ options: { graph: { type: 'string' }, annotations: { type: 'string' }, out: { type: 'string' }, static: { type: 'string' } } });
  if (!args.graph || !args.annotations || !args.out) throw Error('Usage: --graph NPZ --annotations TSV --out DIR [--static JSON]');
  const reader = JSON.parse(readFileSync(READER_CELLS, 'utf8'));
  const staticPam07 = readStatic(args.static ?? STATIC_DEFAULT).cells.map(c => ({ rootId: canonicalRoot(c.rootId), index: c.index, side: c.side }));
  const countOf = side => staticPam07.filter(c => c.side === side).length;
  if (staticPam07.length !== 18 || countOf('right') !== 10 || countOf('left') !== 8) throw Error('Static PAM07 reference must list 18 roots: 10 right, 8 left');
  const graph = loadGraph(args.graph);
  const rootIds = readNpz(args.graph, ['root_ids']).root_ids;
  const readerCells = neuronReaderCells.cells.filter(cell => cell.type === 'MBON05');
  const { mapping, independent, mismatches } = await checkMapping({ graph, rootIds, annotationPath: args.annotations,
    readerRaw: reader.cells, readerCells, staticPam07 });
  const report = {
    schema: CHECK_SCHEMA,
    pass: mismatches.length === 0,
    graphSha256: await fileSha256(args.graph),
    annotationSha256: await fileSha256(args.annotations),
    mappingIdentity: sha256(JSON.stringify(mapping)),
    perSide: independent.sides.map(s => ({ side: s.side, mbonIndex: s.mbon.index, mbonRootId: s.mbon.rootId, edgeCount: s.edges.length,
      edges: s.edges, kc: s.kc.map(k => k.index), pam07: s.pam07, signsAllPositive: s.signsAllPositive })),
    mismatches,
  };
  mkdirSync(args.out, { recursive: true });
  const target = join(args.out, 'mapping-check.json');
  writeFileSync(`${target}.partial`, `${JSON.stringify(report, null, 2)}\n`);
  renameSync(`${target}.partial`, target);
  process.exitCode = report.pass ? 0 : 1;
}

// Filename match, not path equality: Windows drive-letter casing would make an exact compare skip main silently.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/check-fly-connections-mapping-v1.mjs')) {
  main().catch(error => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}

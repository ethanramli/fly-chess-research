import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';
import { checkMapping, compareSides, independentSides } from '../../scripts/neural-learning/check-fly-connections-mapping-v1.mjs';

const HEADER = 'root_id\themibrain_type\tcell_class\tside';
// Roots above 2^53: neighbouring IDs would collapse to one JS Number.
const BASE = 720575940621164720n;
const rootOf = i => BASE + BigInt(i + 1);
// Node index = position. Node 9 is a graph input absent from the annotation.
const NODES = [
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'right' },      // 0 gamma KC, right
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'left' },       // 1 gamma KC, left
  { type: "KCa'b'-ap1", cls: 'Kenyon_Cell', side: 'right' }, // 2 non-gamma KC
  { type: 'MBON05', cls: 'MBON', side: 'left' },             // 3 soma left, so receives right
  { type: 'MBON05', cls: 'MBON', side: 'right' },            // 4 soma right, so receives left
  { type: 'PAM07', cls: 'DAN', side: 'right' },              // 5
  { type: 'PAM08', cls: 'DAN', side: 'right' },              // 6 not PAM07
  { type: 'PAM07', cls: 'DAN', side: 'left' },               // 7
  { type: 'KCg-m', cls: 'Kenyon_Cell', side: 'left' },       // 8 gamma KC, left
  { type: '', cls: '', side: '' },                           // 9 unannotated
];
// Incoming edges per post node as [pre, sign]. Edge order is CSR order.
const INCOMING = {
  3: [[0, 1], [1, 1], [2, 1], [9, 1]], // right-receiving: KC 0 kept; KC 1 other side; KC 2 non-gamma; 9 unannotated
  4: [[1, -1], [8, 1], [0, 1]],        // left-receiving: KC 1 negative sign; KC 8 kept; KC 0 other side
};
const READERS = [
  { type: 'MBON05', index: 3, rootId: String(rootOf(3)), receivingSide: 'right' },
  { type: 'MBON05', index: 4, rootId: String(rootOf(4)), receivingSide: 'left' },
];
// Stands in for the static PAM07 root crosswalk.
const STATIC = [
  { rootId: String(rootOf(5)), index: 5, side: 'right' },
  { rootId: String(rootOf(7)), index: 7, side: 'left' },
];

function makeGraph(incoming, count) {
  const row = [], col = [], sign = [];
  for (let post = 0; post < count; post++) {
    row.push(col.length);
    for (const [pre, s] of incoming[post] ?? []) { col.push(pre); sign.push(s); }
  }
  row.push(col.length);
  return { row: Int32Array.from(row), col: Int32Array.from(col), sign: Int8Array.from(sign) };
}

// Writes the annotation TSV for the given nodes plus one PAM07 root that is not in the graph.
function fixture(folder, { nodes = NODES, incoming = INCOMING } = {}) {
  const annotationPath = join(folder, 'annotation.tsv');
  const rows = nodes.flatMap((node, i) => (node.cls ? [`${rootOf(i)}\t${node.type}\t${node.cls}\t${node.side}`] : []));
  writeFileSync(annotationPath, [HEADER, ...rows, '7\tPAM07\tDAN\tright', ''].join('\n'));
  return { graph: makeGraph(incoming, nodes.length), rootIds: BigInt64Array.from(nodes, (_, i) => rootOf(i)), annotationPath };
}

async function inTempFolder(run) {
  const folder = mkdtempSync(join(tmpdir(), 'fly-connections-mapping-check-'));
  try { await run(folder); } finally { rmSync(folder, { recursive: true, force: true }); }
}

test('(a) a negative gamma-KC edge is excluded by both sides and the mapping passes', async () => {
  await inTempFolder(async folder => {
    const { graph, rootIds, annotationPath } = fixture(folder);
    assert.equal(graph.sign[4], -1); // KC 1 into the left-receiving MBON05 is negative
    const { mapping, independent, mismatches } = await checkMapping({ graph, rootIds, annotationPath,
      readerRaw: READERS, readerCells: READERS, staticPam07: STATIC });
    assert.deepEqual(mismatches, []);
    assert.equal(mapping.readyForCandidateExperiment, true);
    const right = independent.sides.find(s => s.side === 'right'), left = independent.sides.find(s => s.side === 'left');
    assert.deepEqual(right.edges, [0]);
    assert.deepEqual(right.kc.map(k => k.index), [0]);
    assert.deepEqual(right.pam07, [{ index: 5, rootId: String(rootOf(5)) }]);
    assert.deepEqual(left.edges, [5]);
    assert.equal(left.edges.includes(4), false);
    assert.deepEqual(left.kc.map(k => k.index), [8]);
    assert.deepEqual(left.pam07, [{ index: 7, rootId: String(rootOf(7)) }]);
    assert.ok(left.signsAllPositive && right.signsAllPositive);
    assert.equal(independent.outsideGraph, 1);
    assert.equal(mapping.annotationRowsOutsideGraph, independent.outsideGraph);
  });
});

test('(b) a PAM07 row relabelled to the other side fails against the static reference', async () => {
  await inTempFolder(async folder => {
    const relabelled = NODES.map((node, i) => (i === 5 ? { ...node, side: 'left' } : node));
    const { graph, rootIds, annotationPath } = fixture(folder, { nodes: relabelled });
    const { mismatches } = await checkMapping({ graph, rootIds, annotationPath,
      readerRaw: READERS, readerCells: READERS, staticPam07: STATIC });
    assert.ok(mismatches.length > 0);
    // Producer and independent derivation agree with each other; only the static reference disagrees.
    assert.ok(mismatches.every(m => m.field === 'pam07Static'));
  });
});

test('(c) an extra non-gamma KC edge is excluded by both sides and still passes', async () => {
  await inTempFolder(async folder => {
    const incoming = { ...INCOMING, 4: [...INCOMING[4], [2, 1]] }; // KCa'b' (non-gamma, right) into the left-receiving MBON05
    const { graph, rootIds, annotationPath } = fixture(folder, { incoming });
    assert.equal(graph.col[7], 2);
    const { independent, mismatches } = await checkMapping({ graph, rootIds, annotationPath,
      readerRaw: READERS, readerCells: READERS, staticPam07: STATIC });
    assert.deepEqual(mismatches, []);
    const left = independent.sides.find(s => s.side === 'left');
    assert.deepEqual(left.edges, [5]);
    assert.deepEqual(left.kc.map(k => k.index), [8]);
  });
});

test('(d) a tampered producer mapping fails the comparison', async () => {
  await inTempFolder(async folder => {
    const { graph, rootIds, annotationPath } = fixture(folder);
    const mapping = await mapFlyConnectionsMemory(graph, rootIds, annotationPath, READERS);
    const independent = await independentSides({ graph, rootIds, annotationPath, readerRaw: READERS });
    const compare = tampered => compareSides({ graph, rootIds, mapping: tampered, independent, staticPam07: STATIC });
    assert.deepEqual(compare(mapping), []);

    const extraEdge = structuredClone(mapping);
    const left = extraEdge.groups.find(g => g.side === 'left');
    left.edges.push(4); left.kc.push(1); left.kcRootIds.push(String(rootOf(1))); // negative KC edge added to the mask
    const extra = compare(extraEdge);
    assert.ok(extra.some(m => m.side === 'left' && m.field === 'edges'));
    assert.ok(extra.some(m => m.side === 'left' && m.field === 'kc'));
    assert.ok(extra.some(m => m.side === 'left' && m.field === 'signsAllPositive'));

    const relabelled = structuredClone(mapping);
    relabelled.groups.find(g => g.side === 'right').dan[0].rootId = String(rootOf(7)); // other side's PAM07 root
    const wrongRoot = compare(relabelled);
    assert.ok(wrongRoot.some(m => m.side === 'right' && m.field === 'pam07'));
    assert.ok(wrongRoot.some(m => m.field === 'rootIndex'));
  });
});

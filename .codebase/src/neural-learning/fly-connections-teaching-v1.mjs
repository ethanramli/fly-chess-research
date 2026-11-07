// Source-matched candidate mapping and endpoint extraction for the gamma4
// PAM07 -> MBON05 reversal memory (Gkanias et al., eLife 2022; eqs. 1, 12, 18, 19).
// Computational candidate only: not validated biology, not a learning rule.
// ReversalMemory (reversal-memory.mjs) stays the only plasticity rule.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export const mappingSchema = 'fly-connections-gamma4-pam07-mapping-v1';
const sides = ['left', 'right'];
const requiredColumns = ['root_id', 'hemibrain_type', 'cell_class', 'side'];
const approximation = 'Existing positive KC-to-MBON05 edges from same-receiving-side gamma KCs (KCg-), with same-side PAM07 DAN endpoints. The receiving side is supplied by the caller and only checked against the annotation; MBON05 soma side is not a mask. No synapse-coordinate compartment, receptor identity or measured dopamine release.';
// MBON05 annotation side is the soma side; its dendrites are contralateral (FBbt:00111004, see mushroom-body.mjs).
const opposite = side => (side === 'left' ? 'right' : 'left');

// Root IDs exceed 2^53: JS numbers round silently, so only exact decimal text or BigInt is accepted.
function parseRoot(value) {
  if (typeof value !== 'string' && typeof value !== 'bigint') throw Error('Invalid root identity');
  const text = String(value);
  if (!/^[0-9]+$/.test(text)) throw Error('Invalid root identity');
  return BigInt(text);
}

export async function mapFlyConnectionsMemory(graph, rootIds, annotationPath, readerCells) {
  if (!(rootIds instanceof BigInt64Array) || rootIds.length !== graph.row.length - 1) throw Error('Invalid root identities');
  if (graph.sign.length !== graph.col.length) throw Error('Invalid graph signs');
  const indices = new Map(Array.from(rootIds, (id, i) => [id, i]));
  if (indices.size !== rootIds.length) throw Error('Duplicate graph root identities');

  // Exactly one MBON05 reader per receiving side; the supplied side is authoritative.
  if (!Array.isArray(readerCells) || readerCells.length !== sides.length) throw Error('Expected one MBON05 reader per receiving side');
  const targets = new Map(), targetRoots = new Set();
  for (const cell of readerCells) {
    if (cell?.type !== 'MBON05' || !sides.includes(cell.receivingSide)) throw Error('Invalid MBON05 reader record');
    const root = parseRoot(cell.rootId);
    if (indices.get(root) !== cell.index) throw Error('MBON05 reader identity mismatch');
    if (targets.has(cell.receivingSide) || targetRoots.has(root)) throw Error('Duplicate MBON05 reader');
    targets.set(cell.receivingSide, { index: cell.index, rootId: root.toString() });
    targetRoots.add(root);
  }

  // ponytail: one streamed pass over the annotation; run once per registration.
  const annotated = new Map(), col = {};
  let header, outsideGraph = 0;
  const input = createReadStream(annotationPath);
  try {
    for await (const line of createInterface({ input, crlfDelay: Infinity })) {
      if (line === '') continue;
      const fields = line.split('\t');
      if (!header) {
        header = fields;
        for (const key of requiredColumns) {
          if (!header.includes(key)) throw Error(`Missing annotation column ${key}`);
          col[key] = header.indexOf(key);
        }
        continue;
      }
      const cls = fields[col.cell_class] ?? '';
      if (!['Kenyon_Cell', 'DAN', 'MBON'].includes(cls)) continue;
      const root = parseRoot(fields[col.root_id]);
      const index = indices.get(root);
      if (index === undefined) { outsideGraph++; continue; }
      if (annotated.has(index)) throw Error('Duplicate annotation root');
      annotated.set(index, { index, rootId: root.toString(), cls, type: fields[col.hemibrain_type] ?? '', side: fields[col.side] ?? '' });
    }
  } finally {
    input.destroy(); // a throw mid-stream must not leave the file handle open
  }
  if (!header) throw Error('Missing annotation header');

  const excluded = { nonKenyonOrUnannotated: 0, kenyonNotGammaOrOtherSide: 0, negativeSign: 0 }, groups = [];
  for (const side of sides) {
    const target = targets.get(side), mbon = annotated.get(target.index);
    if (mbon?.cls !== 'MBON' || mbon.type !== 'MBON05' || mbon.side !== opposite(side)) throw Error('Missing or inconsistent MBON05 annotation');
    const dan = [...annotated.values()].filter(c => c.cls === 'DAN' && c.type === 'PAM07' && c.side === side)
      .sort((a, b) => a.index - b.index)
      .map(c => ({ index: c.index, rootId: c.rootId, type: c.type, side: c.side }));
    const edges = [], kc = [], kcRootIds = [];
    for (let e = graph.row[target.index]; e < graph.row[target.index + 1]; e++) {
      const pre = annotated.get(graph.col[e]);
      if (pre?.cls !== 'Kenyon_Cell') { excluded.nonKenyonOrUnannotated++; continue; }
      if (pre.side !== side || !/^KCg-/.test(pre.type)) { excluded.kenyonNotGammaOrOtherSide++; continue; }
      if (graph.sign[e] === -1) { excluded.negativeSign++; continue; }
      if (graph.sign[e] !== 1) throw Error('Invalid graph sign');
      edges.push(e); kc.push(pre.index); kcRootIds.push(pre.rootId);
    }
    groups.push({ side, mbonType: 'MBON05', danType: 'PAM07', mbon: { index: target.index, rootId: target.rootId }, dan, edges, kc, kcRootIds });
  }
  const allEdges = groups.flatMap(g => g.edges);
  if (new Set(allEdges).size !== allEdges.length) throw Error('Overlapping plastic groups');
  return { schema: mappingSchema, groups, excluded, annotationRowsOutsideGraph: outsideGraph,
    readyForCandidateExperiment: groups.every(g => g.dan.length > 0 && g.edges.length > 0), approximation };
}

// Extraction only: reads the one actual endpoint h[steps] and copies the rates the mapping names.
// Negative factor = fixed depressing modulatory convention, not negative dopamine concentration.
// Does not modify model, mapping, graph or memory.
export function actualTeachingInputs(model, mapping, { activityScale = 1.5 } = {}) {
  if (!Number.isFinite(activityScale) || activityScale <= 0) throw Error('Invalid activity scale');
  if (mapping?.schema !== mappingSchema || mapping.readyForCandidateExperiment !== true || !mapping.groups?.length) throw Error('Incomplete or unknown mapping');
  if (!Array.isArray(model.h) || model.h.length !== model.steps + 1) throw Error('Invalid model state');
  const endpoint = model.h[model.steps];
  if (!endpoint || endpoint.length !== model.n) throw Error('Invalid endpoint dimension');
  const inRange = i => Number.isSafeInteger(i) && i >= 0 && i < model.n;
  const rate = i => {
    const value = endpoint[i];
    if (!Number.isFinite(value) || value < 0 || value > model.saturation) throw Error('Invalid endpoint rate');
    return value;
  };
  return mapping.groups.map(g => {
    if (!g.edges.length || g.kc.length !== g.edges.length || !g.dan.length) throw Error('Invalid local group');
    if (!g.kc.every(inRange) || !g.dan.every(c => inRange(c.index))) throw Error('Invalid mapped index');
    for (let i = 0; i < g.edges.length; i++) {
      const e = g.edges[i];
      if (!Number.isSafeInteger(e) || e < 0 || e >= model.graph.col.length || model.graph.sign[e] !== 1 || model.graph.col[e] !== g.kc[i]) throw Error('Mapping does not match model graph');
    }
    const kcRates = Float64Array.from(g.kc, i => rate(i));
    const danRates = Float64Array.from(g.dan, c => rate(c.index));
    // Same operation order as ReversalMemory.observe with a zero reference.
    return { side: g.side, kcRates, danRates, k: kcRates.map(v => v / activityScale),
      factor: -danRates.reduce((sum, v) => sum + v / activityScale, 0) / danRates.length };
  });
}

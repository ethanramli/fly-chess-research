// Reproducible static gate 1 audit. It reads only the sparse edge-sign array.
// It validates pinned source/annotation/mapping identities and reports what is
// still absent; it cannot pass without a separately justified signed-rate trace.
import { createReadStream, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { readNpz } from '../../src/runtime/graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
const paths = { graph: '.cache/full.npz', annotations: '.cache/flywire-annotations-v2.1.0.tsv',
  mapping: 'research/reports/reversal-candidate-2026-10-05/mapping.json',
  upstream: '.cache/incentive-circuit-1610c800/models_base.py' };
async function sha(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) hash.update(chunk);
  return hash.digest('hex');
}

export async function feasibility() {
  const blockers = [], identities = {}, compartments = [];
  for (const [name, path] of Object.entries(paths)) {
    if (!existsSync(path)) blockers.push(`Missing required ${name} source: ${path}`);
    else identities[name] = await sha(path);
  }
  if (blockers.length) return { schema: 'plasticity-signal-anatomy-v1', gate: 'blocked', blockers, identities,
    scope: 'Missing-source audit only; no graph or learner execution' };

  const frozen = JSON.parse(readFileSync(paths.mapping, 'utf8'));
  const expected = { graph: frozen.inputs.graph, annotations: frozen.inputs.annotations,
    upstream: frozen.upstream.files['models_base.py'] };
  for (const key of Object.keys(expected)) if (identities[key] !== expected[key])
    blockers.push(`${key} hash mismatch: expected ${expected[key]}, observed ${identities[key]}`);
  const map = frozen.mapping;
  const groups = map.groups;
  const { sign } = readNpz(paths.graph, ['sign']);
  if (!Array.isArray(groups) || groups.length !== 4) blockers.push('Pinned mapping must contain the four existing left/right MBON12/MBON01 groups');
  const mappedRoots = new Map();
  for (const group of groups ?? []) for (const cell of group.dan ?? []) mappedRoots.set(cell.rootId, cell);
  const annotationCells = new Map(); let header = null, rows = 0;
  for await (const line of createInterface({ input: createReadStream(paths.annotations, { encoding: 'utf8', highWaterMark: 16384 }), crlfDelay: Infinity })) {
    const fields = line.split('\t');
    if (!header) {
      header = fields;
      for (const column of ['root_id', 'hemibrain_type', 'cell_class', 'side'])
        if (!header.includes(column)) blockers.push(`Annotation source missing required column ${column}`);
      continue;
    }
    rows++;
    const row = Object.fromEntries(['root_id', 'hemibrain_type', 'cell_class', 'side']
      .map(name => [name, fields[header.indexOf(name)]]));
    if (mappedRoots.has(row.root_id)) annotationCells.set(row.root_id, row);
  }
  for (const group of groups ?? []) {
    const dan = group.dan ?? [];
    const matched = dan.filter(cell => {
      const row = annotationCells.get(cell.rootId);
      return row && row.hemibrain_type === cell.type && row.cell_class === cell.cellClass && row.side === cell.side;
    });
    const mbon = group.mbonType, danType = group.danType;
    const edgeCount = group.edges?.length ?? 0;
    const edgeSigns = { positive: 0, negative: 0, invalid: 0 };
    for (const edge of group.edges ?? []) {
      if (!Number.isSafeInteger(edge) || edge < 0 || edge >= sign.length) edgeSigns.invalid++;
      else if (sign[edge] === 1) edgeSigns.positive++;
      else if (sign[edge] === -1) edgeSigns.negative++;
      else edgeSigns.invalid++;
    }
    if (edgeSigns.invalid) blockers.push(`${group.side} ${danType}/${mbon}: ${edgeSigns.invalid} mapped edges have invalid graph sign/index`);
    compartments.push({ side: group.side, mbonType: mbon, danType, mappedDANCells: dan.length,
      annotationIdentityMatches: matched.length, permittedExistingEdges: edgeCount,
      observedKCTypes: group.observedKCTypes ?? null, graphEdgeSigns: edgeSigns,
      signConvention: 'raw signs read by mapped edge index; no sign is changed or assigned',
      localSignal: 'not established: no pinned unrectified baseline-relative per-cell dynamic trace',
      targetCompartment: 'not established: coarse subtype/hemisphere group has no receptor or synapse-coordinate identity' });
    if (matched.length !== dan.length) blockers.push(`${group.side} ${danType}: released annotation identity mismatch (${matched.length}/${dan.length})`);
    if (!edgeCount) blockers.push(`${group.side} ${danType}/${mbon}: no permitted existing mapped edges`);
  }
  const source = readFileSync(paths.upstream, 'utf8');
  const sourceHasSignedFactor = source.includes('return w + eta * D * (r_pre + w - w_rest)');
  if (!sourceHasSignedFactor) blockers.push('Pinned upstream signed-factor equation not found at expected implementation text');
  else blockers.push('Upstream equation accepts signed D, but current mapped learner derives rectified above-rest DAN excess only; source sign does not establish current local bidirectional signal');
  blockers.push('No measured or model-derived unrectified local DAN rate trace with a justified tonic baseline is pinned for this exact graph/mapping');
  blockers.push('The current plastic-edge map lacks defensible receptor and anatomical compartment coordinates for assigning distinct potentiation/depression drives');
  blockers.push('No source-backed finite-timescale stabilization state is mapped to these exact target compartments');
  return { schema: 'plasticity-signal-anatomy-v1', gate: 'blocked', identities,
    annotationRowsRead: rows, mappedDANAnnotationJoins: annotationCells.size,
    mappedEdgeTotals: Object.fromEntries(['PPL103', 'PAM02'].map(type => [type,
      compartments.filter(group => group.danType === type).reduce((sum, group) => sum + group.permittedExistingEdges, 0)])),
    sparseSignEdgesInspected: sign.length, compartments, blockers,
    scope: 'Pinned static identity, KC subtype map, and sparse edge-sign audit; no adjacency load, activity simulation, inference, training, or biological validation' };
}

const report = await feasibility();
if (args.out) writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
process.exit(report.gate === 'passed' ? 0 : 1);

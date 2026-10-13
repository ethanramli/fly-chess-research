import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { MappedPuzzleBrain } from '../../src/puzzle-learning/mapped-puzzle-brain.mjs';
import { positionDelta } from '../../src/search-and-feedback/delta-forcing-candidates.mjs';
import { compareCandidateSets } from '../../src/search-and-feedback/paired-candidate-assessment.mjs';
import { uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, 'max-states': { type: 'string', default: '4' },
  'max-candidates': { type: 'string', default: '16' }, 'quiet-reserve': { type: 'string', default: '2' },
  input: { type: 'string', default: 'research/data/coverage-pilot-v2/test.jsonl' },
  'memory-report': { type: 'string' },
  'cpu-duty': { type: 'string', default: '0.5' } } });
if (!args.out) throw Error('Require --out');
const maxStates = Number(args['max-states']), maxCandidates = Number(args['max-candidates']), quietReserve = Number(args['quiet-reserve']), duty = Number(args['cpu-duty']);
if (!Number.isSafeInteger(maxStates) || maxStates < 1 || maxStates > 16 || !Number.isSafeInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 64 || !Number.isSafeInteger(quietReserve) || quietReserve < 0 || quietReserve > maxCandidates || duty < 0.1 || duty > 1) throw Error('Invalid bounds');
const guard = () => { if (process.memoryUsage().rss > 768 * 2 ** 20) throw Error('RSS guard'); };
const protocol = JSON.parse(readFileSync('research/data/compartment-puzzle-pipeline-v1/protocol.json'));
const prerequisite = JSON.parse(readFileSync('research/reports/compartment-input-original-2026-10-06/report.json'));
const mapping = JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
const source = readFileSync(args.input,'utf8').trim().split(/\r?\n/).map(JSON.parse);
function resolvedRows() {
  const out = [];
  for (const row of source) {
    if (row.fen && row.objective === 'forced-mate') {
      out.push({ id: row.id, parent: new Chess(row.fen), child: new Chess(row.fen), group: row.group, task: { objective: row.objective, plies: row.plies }, fixture: true });
      continue;
    }
    if (row.split !== 'test' || !row.parentFen || !row.fenA || !row.fenB) continue;
    for (const [label, fen] of [['A', row.fenA], ['B', row.fenB]]) {
      const parent = new Chess(row.parentFen); let child;
      for (const move of parent.moves({verbose:true})) { const next = new Chess(row.parentFen); next.move(move); if (next.fen() === fen) child = next; }
      if (child) out.push({ id: `${row.id}-${label}`, parent, child, group: row.group });
    }
  }
  return out.slice(0, maxStates);
}
const graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz',['root_ids']).root_ids;
const model = new SparseTrainer(graph, prerequisite.identity.model), memory = new ReversalMemory(model, mapping, prerequisite.identity.memory);
if (args['memory-report']) {
  const learnedReport = JSON.parse(readFileSync(args['memory-report']));
  const learned = learnedReport.state?.results?.find(v => v.condition === 'adaptive')?.finalMemory;
  if (!learned) throw Error('Missing adaptive final memory in report');
  memory.restore(learned);
}
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]);
const encoder = createCompartmentChessCueEncoder(mapping, { ...protocol.encoder, conjoin:false, stratify:false });
const brain = new MappedPuzzleBrain({ model, memory, mapping, encoder, readouts: prerequisite.identity.readouts, rest,
  maxPresentations: maxStates * 256, priorScale: protocol.priorScale, current: protocol.current, guard });
for (const cells of Object.values(prerequisite.identity.readouts)) for (const c of cells) if (ids[c.index].toString() !== c.rootId) throw Error('Readout identity mismatch');
const rows = resolvedRows(), measurements = [];
for (const row of rows) {
  guard(); const before = performance.now(), delta = positionDelta(row.parent, row.child);
  const task = row.task ?? { objective:'forced-mate', plies:1 };
  const paired = await compareCandidateSets(brain, row.child, task, delta, { maxCandidates, quietReserve });
  let focusedProof = null;
  if (row.fixture) {
    const { reviewCommittedChoice } = await import('../../src/search-and-feedback/adaptive-choice-review.mjs');
    focusedProof = reviewCommittedChoice(row.child, paired.focused.choice, task, { maxNodes: 4096, milliseconds: 2000 });
  }
  measurements.push({ id: row.id, group: row.group, legalCount: paired.all.legalCount,
    selectedCount: paired.focused.selectedCount, omitted: paired.omitted, choiceAgreement: paired.choiceAgreement,
    allChoice: paired.all.choice, focusedChoice: paired.focused.choice, omittedMoves: paired.omittedMoves,
    focusedStatus: focusedProof?.status ?? null, focusedCertificate: focusedProof?.certificateSha256 ?? null,
    elapsedMs: performance.now() - before });
}
const report = { schema:'paired-delta-full-graph-v1', maxStates, maxCandidates, quietReserve, input:args.input, variant:'original', measurements,
  summary:{ states:measurements.length, agreement:measurements.filter(v=>v.choiceAgreement).length,
    meanLegal:measurements.reduce((s,v)=>s+v.legalCount,0)/measurements.length,
    meanSelected:measurements.reduce((s,v)=>s+v.selectedCount,0)/measurements.length,
    totalOmitted:measurements.reduce((s,v)=>s+v.omitted,0),
    scope:'Frozen full-graph readout on held-out public states; no feedback, plasticity, best-move labels or reasoning claim'},
  identity:{model:model.config,memory:memory.config,encoder:encoder.identity,readouts:prerequisite.identity.readouts},
  resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,presentations:brain.presentations}};
mkdirSync(args.out,{recursive:true}); writeFileSync(`${args.out}/report.json`,JSON.stringify(report,null,2)); console.log(JSON.stringify(report.summary));

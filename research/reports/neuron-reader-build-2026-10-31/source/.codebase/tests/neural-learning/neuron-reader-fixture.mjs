import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV1 } from '../../src/chess-input/eyes-v1.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';

export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function fixture() {
  // Seventeen numerical cells and synthetic IDs, not a reduced anatomical brain.
  const graph = { row: Int32Array.from({ length: 18 }, (_, i) => Math.max(0, i - 3)),
    col: Int32Array.from({ length: 14 }, (_, i) => i % 3), sign: new Int8Array(14).fill(1),
    initial: new Float32Array(14).fill(1), input: Int32Array.of(0), output: Int32Array.of(3) };
  const model = new SparseTrainer(graph, { steps: 5, inputDim: 1, outputs: 1, precision: 'float64' });
  const { identity, ...base } = neuronReaderCells;
  const body = { ...base, scope: 'synthetic', nodes: 17, graphSha256: hash('synthetic graph'),
    graphStateHash: fixedStateHash({ graph, params: {} }, []),
    cells: base.cells.map((cell, i) => ({ ...cell, rootId: String(i + 1), index: i + 3 })) };
  const roster = { ...body, identity: hash(body) };
  const memory = { identity: hash('synthetic memory only'), gains: Float64Array.of(1, 0.5),
    traces: Float64Array.of(0.1, 0.2), slow: Float64Array.of(0.3), clock: 7,
    pendingReceipt: { id: 3, acknowledged: false } };
  const manifest = { roster, config: { ...model.config }, memoryIdentity: memory.identity };
  const eyes = createEyesV1({ retina_idx: Int32Array.of(0, 1, 2), retina_square: Int8Array.of(28, 27, 12),
    retina_uv: Float32Array.of(0.5, 0.5, 0.5, 0.5, 0.5, 0.5) });
  return { model, manifest, memory, eyes, board: new Chess() };
}
export function contract(observation) {
  return { schema: 'neuron-reader-score-v1', scope: 'synthetic',
    manifestIdentity: observation.manifestIdentity, memoryIdentity: observation.memoryIdentity,
    review: { status: 'reviewed', reviewer: 'software fixture only',
      evidenceSha256: hash('synthetic evidence'), compatibilitySha256: hash('synthetic compatibility') },
    coefficients: Object.fromEntries(Object.keys(observation.means).map(type => [type,
      { value: type === 'MBON05' ? -1 : 0, evidence: type === 'MBON05' ? {
        source: 'synthetic fixture; no biological sign claim', assay: 'numerical calculation',
        scope: 'software only', assumptions: 'arbitrary test sign',
        targets: observation.cells.filter(cell => cell.type === type).map(cell => cell.rootId) } : null }])) };
}
export async function collect(iterator) { const rows = []; for await (const row of iterator) rows.push(row); return rows; }

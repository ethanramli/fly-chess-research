// Pure endpoint measurements and an explicit fixed preference contract; no learning or policy.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const SHA = /^[a-f0-9]{64}$/;
const TYPES = ['MBON05', 'MBON27', 'MBON09', 'MBON07', 'MBON06'];
const COUNTS = [2, 2, 4, 4, 2];
const cells = JSON.parse(readFileSync(new URL('./neuron-reader-cells.json', import.meta.url), 'utf8'));
export const neuronReaderCells = Object.freeze({ ...cells,
  cells: Object.freeze(cells.cells.map(cell => Object.freeze(cell))), identity: hash(cells) });
const readerIdentity = createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');

function validate(manifest) {
  const { roster, config, memoryIdentity } = manifest ?? {};
  const { identity, ...body } = roster ?? {};
  if (roster?.schema !== 'neuron-reader-cells-v1' || !['released-graph', 'synthetic'].includes(roster.scope)
    || !Number.isSafeInteger(roster.nodes) || roster.nodes < 14 || roster.nodes > 262144
    || ![roster.graphSha256, roster.annotationSha256, roster.typeAnnotationsSha256, roster.graphStateHash, memoryIdentity].every(v => typeof v === 'string' && SHA.test(v))
    || identity !== hash(body) || (roster.scope === 'released-graph' && identity !== neuronReaderCells.identity)
    || !Array.isArray(roster.cells) || roster.cells.length !== 14)
    throw Error('Invalid or changed neuron-reader roster/identity');
  const roots = new Set(), indices = new Set();
  let offset = 0;
  for (let t = 0; t < TYPES.length; t++) {
    let previous = -1;
    for (let j = 0; j < COUNTS[t]; j++) {
      const cell = roster.cells[offset++];
      if (cell?.type !== TYPES[t] || typeof cell.rootId !== 'string' || !/^[1-9]\d{0,19}$/.test(cell.rootId)
        || !Number.isSafeInteger(cell.index) || cell.index <= previous || cell.index >= roster.nodes
        || roots.has(cell.rootId) || indices.has(cell.index)
        || !['left', 'right'].includes(cell.somaSide) || !['left', 'right', 'unknown'].includes(cell.receivingSide)
        || typeof cell.knownNT !== 'string' || typeof cell.predictedNT !== 'string')
        throw Error('Invalid, missing or duplicate neuron-reader cell');
      roots.add(cell.rootId); indices.add(cell.index); previous = cell.index;
    }
  }
  if (!config || !Number.isSafeInteger(config.steps) || config.steps < 1
    || !['float32', 'float64'].includes(config.precision) || !['row', 'global'].includes(config.normalization)
    || !Number.isFinite(config.saturation) || config.saturation <= 0
    || !Number.isFinite(config.recurrentScale) || config.recurrentScale <= 0
    || !Number.isSafeInteger(config.inputDim) || config.inputDim < 1
    || !Number.isSafeInteger(config.outputs) || config.outputs < 1
    || !Number.isSafeInteger(config.seed)) throw Error('Invalid neuron-reader model configuration');
  return hash({ rosterIdentity: identity, config, memoryIdentity });
}

export function readNeurons(endpoint, manifest) {
  const manifestIdentity = validate(manifest), { roster, config, memoryIdentity } = manifest;
  const Type = config.precision === 'float64' ? Float64Array : Float32Array;
  if (!(endpoint instanceof Type) || endpoint.length !== roster.nodes) throw Error('Invalid endpoint activity vector');
  const observations = roster.cells.map(cell => {
    const activity = endpoint[cell.index];
    if (!Number.isFinite(activity) || activity < 0 || activity > config.saturation)
      throw Error('Nonfinite or out-of-range neuron activity');
    return { ...cell, activity };
  });
  const means = Object.fromEntries(TYPES.map(type => {
    const population = observations.filter(cell => cell.type === type);
    return [type, population.reduce((sum, cell) => sum + cell.activity / population.length, 0)];
  }));
  const body = { schema: 'neuron-reader-observation-v1', scope: roster.scope, readerIdentity, manifestIdentity,
    rosterIdentity: roster.identity, graphSha256: roster.graphSha256, memoryIdentity,
    config: { ...config }, units: 'endpoint model-rate', cells: observations, means,
    zeroCount: observations.filter(cell => cell.activity === 0).length,
    ceilingCount: observations.filter(cell => cell.activity === config.saturation).length };
  return { ...body, identity: hash(body) };
}

export function scoreNeurons(observation, contract) {
  const { identity, ...body } = observation ?? {};
  if (observation?.schema !== 'neuron-reader-observation-v1' || observation.readerIdentity !== readerIdentity
    || identity !== hash(body) || !['released-graph', 'synthetic'].includes(observation.scope)
    || contract?.schema !== 'neuron-reader-score-v1' || contract.scope !== observation.scope
    || contract.manifestIdentity !== observation.manifestIdentity || contract.memoryIdentity !== observation.memoryIdentity
    || contract.review?.status !== 'reviewed' || typeof contract.review.reviewer !== 'string' || !contract.review.reviewer.trim()
    || ![contract.review.evidenceSha256, contract.review.compatibilitySha256].every(v => typeof v === 'string' && SHA.test(v))
    || Object.keys(contract.coefficients ?? {}).sort().join() !== [...TYPES].sort().join())
    throw Error('Missing, unreviewed or mismatched neuron-reader score contract');
  let score = 0, nonzero = 0;
  const terms = {};
  for (const type of TYPES) {
    const entry = contract.coefficients[type], population = observation.cells?.filter(cell => cell.type === type);
    if (!population || population.length !== COUNTS[TYPES.indexOf(type)]
      || population.some(cell => !Number.isFinite(cell.activity) || cell.activity < 0 || cell.activity > observation.config.saturation))
      throw Error('Invalid copied score population');
    const mean = population.reduce((sum, cell) => sum + cell.activity / population.length, 0);
    if (mean !== observation.means?.[type]) throw Error('Score population/mean mismatch');
    if (!Number.isFinite(mean) || ![-1, 0, 1].includes(entry?.value)) throw Error('Invalid score coefficient/activity');
    if (entry.value !== 0) {
      const evidence = entry.evidence;
      const roots = observation.cells.filter(cell => cell.type === type).map(cell => cell.rootId);
      if (!evidence || !['source', 'assay', 'scope', 'assumptions'].every(key =>
        typeof evidence[key] === 'string' && evidence[key].trim().length > 0 && evidence[key].length <= 8192)
        || (observation.scope === 'released-graph' && !/^https:\/\//.test(evidence.source))
        || !Array.isArray(evidence.targets) || evidence.targets.length !== roots.length
        || new Set(evidence.targets).size !== roots.length || evidence.targets.some(root => !roots.includes(root)))
        throw Error('Nonzero coefficient needs a reviewed source/assay/target record');
      nonzero++;
    }
    terms[type] = entry.value * mean; score += terms[type];
  }
  if (!nonzero || !Number.isFinite(score)) throw Error('Empty or nonfinite neuron-reader score');
  return { schema: 'neuron-reader-score-result-v1', scope: observation.scope, observationIdentity: identity,
    contractIdentity: hash(contract), score, terms,
    meaning: 'Fixed model-rate candidate preference; not calibrated position value or validated biological valence' };
}

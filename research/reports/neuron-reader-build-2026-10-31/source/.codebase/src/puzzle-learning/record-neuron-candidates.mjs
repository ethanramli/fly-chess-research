// Bounded, streamed Eyes inference. No teaching, policy selection or persistent-state advancement.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fixedStateHash } from '../neural-learning/association-validation.mjs';
import { readNeurons } from '../neural-learning/neuron-reader.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const recorderIdentity = createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');

// Stream typed-array spans: fingerprinting must not duplicate neural state in JSON.
function stateHash(value) {
  const hash = createHash('sha256'), stack = new Set();
  function add(item) {
    if (ArrayBuffer.isView(item) && !(item instanceof DataView)) {
      hash.update(item.constructor.name + ':' + item.byteLength + ':');
      hash.update(Buffer.from(item.buffer, item.byteOffset, item.byteLength)); return;
    }
    if (item === null || typeof item !== 'object') {
      if ((item !== null && !['undefined', 'boolean', 'string', 'number', 'bigint'].includes(typeof item))
        || (typeof item === 'number' && !Number.isFinite(item))) throw Error('Invalid persistent-state value');
      hash.update(typeof item + ':' + String(item).length + ':' + String(item)); return;
    }
    if (stack.has(item) || stack.size >= 64 || (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype))
      throw Error('Persistent state must expose complete acyclic plain data');
    stack.add(item);
    const keys = Array.isArray(item) ? [...item.keys()].map(String) : Object.keys(item).sort();
    hash.update((Array.isArray(item) ? 'array:' : 'object:') + keys.length + ':');
    for (const key of keys) { add(key); add(item[key]); }
    stack.delete(item);
  }
  add(value); return hash.digest('hex');
}

export async function* recordEyesCandidates({ board, moves, eyes, model, manifest, persistentState, guard, pace }) {
  if (!board || !Array.isArray(moves) || moves.length < 1 || moves.length > 256
    || new Set(moves).size !== moves.length || moves.some(move => typeof move !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))
    || typeof eyes?.encode !== 'function' || !/^[a-f0-9]{64}$/.test(eyes.identity)
    || typeof persistentState !== 'function' || typeof guard !== 'function' || typeof pace !== 'function'
    || model?.n !== manifest?.roster?.nodes || !Array.isArray(model.h) || model.h.length !== model.steps + 1
    || model.h.some(h => h.length !== model.n) || hash(model.config) !== hash(manifest.config)
    || model.inputDim !== model.config.inputDim || model.steps !== model.config.steps
    || model.saturation !== model.config.saturation)
    throw Error('Invalid or unbounded neuron candidate recording');
  if (fixedStateHash({ graph: model.graph, params: {} }, []) !== manifest.roster.graphStateHash)
    throw Error('Candidate model does not match the pinned sparse graph');
  const actions = [...moves], legal = new Set(board.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? '')));
  if (actions.some(action => !legal.has(action))) throw Error('Illegal neuron-reader candidate');
  const boardState = () => ({ fen: board.fen(), pgn: board.pgn() });
  const boardIdentity = hash(boardState()), initialManifest = hash(manifest), encoderIdentity = eyes.identity;
  const fingerprint = () => {
    const memory = persistentState();
    if (memory?.identity !== manifest.memoryIdentity) throw Error('Persistent-state mechanism identity mismatch');
    return stateHash({ fixed: fixedStateHash(model, []), config: model.config,
      runtime: { nodes: model.n, steps: model.steps, saturation: model.saturation, inputDim: model.inputDim, outputs: model.outputs },
      signedMagnitude: model.signedMagnitude,
      gradients: model.grads, count: model.count, optimizer: model.adam ?? null, memory });
  };
  const frozen = fingerprint();
  const assertUnchanged = () => {
    if (fingerprint() !== frozen || hash(boardState()) !== boardIdentity
      || hash(manifest) !== initialManifest || eyes.identity !== encoderIdentity)
      throw Error('Candidate inference changed persistent state, board or pinned identities; candidate set invalid');
  };
  const input = new Float32Array(model.inputDim);
  const initial = readNeurons(model.h[model.steps], manifest);
  const setIdentity = hash({ boardIdentity, actions: [...actions].sort(), manifestIdentity: initial.manifestIdentity,
    persistentStateIdentity: frozen, encoderIdentity, recorderIdentity });
  for (let ordinal = 0; ordinal < actions.length; ordinal++) {
    guard(); assertUnchanged();
    const action = actions[ordinal], started = performance.now();
    let observation;
    try {
      const cue = eyes.encode(board, action);
      if (cue.schema !== 'eyes-v1' || cue.identity !== encoderIdentity || cue.action !== action)
        throw Error('Candidate cue does not match Eyes identity/action');
      model.forward(input, cue.stimulation, null);
      observation = readNeurons(model.h[model.steps], manifest);
    } finally { assertUnchanged(); }
    await pace(performance.now() - started); guard(); assertUnchanged();
    yield { schema: 'neuron-reader-candidate-v1', scope: manifest.roster.scope, setIdentity, ordinal, action,
      boardIdentity, encoderIdentity, graphSha256: manifest.roster.graphSha256, recorderIdentity,
      persistentStateIdentity: frozen, observation };
  }
  assertUnchanged();
  yield { schema: 'neuron-reader-candidate-set-complete-v1', setIdentity, candidates: actions.length,
    boardIdentity, persistentStateIdentity: frozen };
}

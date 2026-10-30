import { createReadStream, mkdirSync, writeFileSync, readFileSync, renameSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { initializeAdam } from '../supervised-baselines/adam.mjs';

export async function* streamRows(path) {
  let pending = '';
  for await (const chunk of createReadStream(path, { encoding: 'utf8', highWaterMark: 16384 })) {
    pending += chunk;
    let end;
    while ((end = pending.indexOf('\n')) >= 0) {
      if (end > 65536) throw Error('Dataset line exceeds 64 KiB');
      const line = pending.slice(0, end).trim(); pending = pending.slice(end + 1);
      if (line) yield JSON.parse(line);
    }
    if (pending.length > 65536) throw Error('Dataset line exceeds 64 KiB');
  }
  if (pending.trim()) yield JSON.parse(pending);
}

function checksum(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
function checkpointArrays(model) {
  const arrays = { ...model.params };
  if (model.adam) for (const kind of ['first', 'second']) for (const [key, a] of Object.entries(model.adam[kind])) arrays[`adam_${kind}_${key}`] = a;
  return arrays;
}
export function saveCheckpoint(model, dir, state) {
  if (model.count !== 0) throw Error('Checkpoint requires an optimizer boundary');
  if (existsSync(dir) || existsSync(`${dir}.partial`)) throw Error('Checkpoint exists; refusing overwrite');
  mkdirSync(`${dir}.partial`, { recursive: true });
  const arrays = {};
  for (const [name, a] of Object.entries(checkpointArrays(model))) {
    const data = Buffer.from(a.buffer, a.byteOffset, a.byteLength);
    writeFileSync(join(`${dir}.partial`, `${name}.bin`), data);
    arrays[name] = { bytes: data.length, sha256: checksum(data) };
  }
  const optimizer = model.adam ? { kind: 'adam-v1', step: model.adam.step, beta1: 0.9, beta2: 0.999, epsilon: 1e-8 } : undefined;
  writeFileSync(join(`${dir}.partial`, 'manifest.json'), JSON.stringify({ format: optimizer ? 'fly-lowram-checkpoint-v2' : 'fly-lowram-checkpoint-v1', config: model.config, optimizer, arrays, state }, null, 2));
  renameSync(`${dir}.partial`, dir);
}
export function loadCheckpoint(model, dir) {
  const meta = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  if (!['fly-lowram-checkpoint-v1', 'fly-lowram-checkpoint-v2'].includes(meta.format) || JSON.stringify(meta.config) !== JSON.stringify(model.config)) throw Error('Checkpoint config mismatch');
  if (meta.format === 'fly-lowram-checkpoint-v2') {
    const o = meta.optimizer;
    if (o?.kind !== 'adam-v1' || o.beta1 !== 0.9 || o.beta2 !== 0.999 || o.epsilon !== 1e-8 || !Number.isSafeInteger(o.step) || o.step < 0) throw Error('Invalid optimizer checkpoint');
    initializeAdam(model).step = o.step;
  } else if (model.adam) throw Error('Cannot load SGD checkpoint into Adam model');
  for (const [name, a] of Object.entries(checkpointArrays(model))) {
    const spec = meta.arrays[name];
    if (spec?.bytes !== a.byteLength) throw Error('Checkpoint shape mismatch');
    const data = Buffer.from(a.buffer, a.byteOffset, a.byteLength);
    const fd = openSync(join(dir, `${name}.bin`), 'r');
    try { if (readSync(fd, data, 0, data.length, 0) !== data.length) throw Error('Truncated checkpoint'); }
    finally { closeSync(fd); }
    if (checksum(data) !== spec.sha256 || !a.every(Number.isFinite)) throw Error('Invalid checkpoint data');
    if (name === 'magnitude' && !a.every(v => v > 0)) throw Error('Invalid connection magnitude');
    if (name.startsWith('adam_second_') && !a.every(v => v >= 0)) throw Error('Invalid Adam second moment');
  }
  model.refreshSignedMagnitude();
  model.zeroGrad();
  return meta.state;
}

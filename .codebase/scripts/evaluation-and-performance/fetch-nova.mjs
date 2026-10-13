import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { NOVA_DATA_SHA256, NOVA_MODEL_SHA256, NOVA_REVISION } from '../../src/evaluation-and-performance/nova-opponent.mjs';

const directory = resolve('.cache/nova-v3b');
const files = [
  ['nova_v3b.onnx', 1252431, NOVA_MODEL_SHA256],
  ['nova_v3b.onnx.data', 398393344, NOVA_DATA_SHA256],
];
await mkdir(directory, { recursive: true });
for (const [name, size, expected] of files) {
  const destination = join(directory, name);
  if (existsSync(destination)) {
    const hash = createHash('sha256');
    let actualSize = 0;
    for await (const chunk of (await import('node:fs')).createReadStream(destination)) { hash.update(chunk); actualSize += chunk.length; }
    if (actualSize === size && hash.digest('hex') === expected) continue;
    throw Error(`Existing Nova file failed pinned size/hash check: ${destination}`);
  }
  const partial = `${destination}.partial`;
  await rm(partial, { force: true });
  const response = await fetch(`https://huggingface.co/novachess/novachess-engine/resolve/${NOVA_REVISION}/${name}`, { signal: AbortSignal.timeout(600000) });
  if (!response.ok || !response.body) throw Error(`Nova download ${name}: HTTP ${response.status}`);
  const hash = createHash('sha256');
  let actualSize = 0;
  const inspect = new Transform({ transform(chunk, _, callback) { hash.update(chunk); actualSize += chunk.length; callback(null, chunk); } });
  await pipeline(response.body, inspect, createWriteStream(partial, { flags: 'wx' }));
  if (actualSize !== size || hash.digest('hex') !== expected) {
    await rm(partial, { force: true });
    throw Error(`Pinned Nova file failed size/hash check: ${name}`);
  }
  await rename(partial, destination);
}
console.log(JSON.stringify({ revision: NOVA_REVISION, directory, files: files.map(([name, size, sha256]) => ({ name, size, sha256 })) }, null, 2));

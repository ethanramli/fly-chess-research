import { createWriteStream, createReadStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';

export const revision = 'cad733198a14d76a35149ecbe5f68bc6efa97732';
export const graphHash = '4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2';
export const graphURL = `https://huggingface.co/cesp99/fly-chess/resolve/${revision}/graph/full.npz`;
export async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function fetchGraph() {
  const path = '.cache/full.npz';
  await mkdir('.cache', { recursive: true });
  if (existsSync(path)) {
    if (await sha256(path) !== graphHash) throw Error('Cached graph checksum mismatch');
    return path;
  }
  const response = await fetch(graphURL, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw Error(`Graph download: HTTP ${response.status}`);
  await pipeline(response.body, createWriteStream(`${path}.part`, { flags: 'wx' }));
  if (await sha256(`${path}.part`) !== graphHash) {
    await rm(`${path}.part`);
    throw Error('Downloaded graph checksum mismatch');
  }
  await rename(`${path}.part`, path);
  return path;
}
if (process.argv[1]?.endsWith('fetch-graph.mjs')) console.log(await fetchGraph());

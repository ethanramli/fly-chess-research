import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '../runtime/fetch-graph.mjs';

const [leftDir, rightDir, out] = process.argv.slice(2);
if (!leftDir || !rightDir || !out) throw Error('Usage: node scripts/compare-checkpoints.mjs LEFT RIGHT REPORT');
const left = JSON.parse(readFileSync(join(leftDir, 'manifest.json'), 'utf8'));
const right = JSON.parse(readFileSync(join(rightDir, 'manifest.json'), 'utf8'));
const keys = Object.keys(left.arrays).sort(), results = [];
const metadataMatches = ['format', 'config', 'optimizer', 'state'].every(k => JSON.stringify(left[k]) === JSON.stringify(right[k]));
const keysMatch = JSON.stringify(keys) === JSON.stringify(Object.keys(right.arrays).sort());
for (const key of keys) {
  if (!/^[a-zA-Z0-9_]+$/.test(key)) throw Error('Invalid checkpoint array name');
  const a = join(leftDir, `${key}.bin`), b = join(rightDir, `${key}.bin`);
  const leftHash = await sha256(a), rightHash = await sha256(b);
  const bytesMatch = statSync(a).size === left.arrays[key].bytes && statSync(b).size === right.arrays[key]?.bytes;
  results.push({ array: key, bytes: left.arrays[key].bytes, equal: bytesMatch && leftHash === rightHash,
    leftChecksumValid: leftHash === left.arrays[key].sha256,
    rightChecksumValid: rightHash === right.arrays[key]?.sha256 });
}
const passed = metadataMatches && keysMatch && results.every(r => r.equal && r.leftChecksumValid && r.rightChecksumValid);
const report = { timestamp: new Date().toISOString(), leftDir, rightDir, passed, metadataMatches, keysMatch, results,
  scope: 'Actual file sizes and SHA-256 hashes plus optimizer/config/cursor metadata; this run and backend only' };
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed, arrays: results.length, metadataMatches, out }));
if (!passed) process.exitCode = 1;

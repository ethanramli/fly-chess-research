import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
const reportPath = process.argv[2];
if (!reportPath) throw Error('Require report.json path');
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const base = resolve(dirname(reportPath), 'sources');
for (const [path, expected] of Object.entries(report.identity.sources)) {
  if (!path.startsWith('.codebase/') || path.includes('..')) throw Error('Unexpected source path');
  const bytes = readFileSync(path);
  if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error(`Source changed: ${path}`);
  const target = join(base, path);
  mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes, { flag: 'wx' });
}
console.log('Archived exact source bytes matching the completed report hashes');

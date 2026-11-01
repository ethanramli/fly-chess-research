import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { compareRestScores } from '../../scripts/neural-learning/inspect-eye-readout-offset.mjs';

test('a common offset can reverse preference and the complete component is identified', () => {
  const r = compareRestScores([2, 2.8], [1, 2], 1, 1.4, 0);
  assert(r.originalMargin < 0 && r.currentRestMargin > 0);
  assert(Math.abs(r.originalMargin + .05) < 1e-12); assert(Math.abs(r.currentRestMargin - .05) < 1e-12);
  assert(Math.abs(r.commonOffsetComponent + .1) < 1e-12);
  const equal = compareRestScores([2, 2.8], [2, 2], 1, 1.4, 0);
  assert(Math.abs(equal.originalMargin - equal.currentRestMargin) < 1e-12);
  assert.throws(() => compareRestScores([2, 2.8], [0, 2], 1, 1.4, 0));
});

test('an active source run is rejected before output creation or graph access', () => {
  const dir = mkdtempSync(join(tmpdir(), 'eye-readout-offset-')), source = join(dir, 'source'), out = join(dir, 'out');
  mkdirSync(source); writeFileSync(join(source, 'manifest.json'), JSON.stringify({ status: 'running' }));
  const script = fileURLToPath(new URL('../../scripts/neural-learning/inspect-eye-readout-offset.mjs', import.meta.url));
  const r = spawnSync(process.execPath, [script, '--run', source, '--audit', join(dir, 'missing-audit.json'), '--out', out, '--cpu-duty', '.5'], { cwd: dir, encoding: 'utf8', timeout: 10000 });
  // The production contract uses the exact pinned 0.5 spelling.
  assert.notEqual(r.status, 0); assert(!existsSync(out));
  const actual = spawnSync(process.execPath, [script, '--run', source, '--audit', join(dir, 'missing-audit.json'), '--out', out, '--cpu-duty', '0.5'], { cwd: dir, encoding: 'utf8', timeout: 10000 });
  assert.equal(actual.status, 1); assert.match(actual.stderr, /Requires completed controlled run/); assert(!existsSync(out));
});

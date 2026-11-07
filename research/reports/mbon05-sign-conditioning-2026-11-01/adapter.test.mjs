import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
const path = 'research/reports/mbon05-sign-conditioning-2026-11-01/pilot.mjs';
const source = readFileSync(path, 'utf8');

test('fixed-input branch never regenerates stimuli for the changed graph', () => {
  const block = source.slice(source.indexOf('  const frozen = a.stimuli'), source.indexOf('  const t0 = performance.now(), inf = runArm'));
  const fixture = { seed: 4101, items: [{ images: [[{ index: 7, current: 1.5 }]] }, { images: [] }] };
  const context = { a: { stimuli: 'fixed.json', out: 'test' }, seed: 4101, ITEMS: 2,
    readFileSync: () => JSON.stringify(fixture),
    buildItems: () => { throw Error('Stimuli must not be regenerated'); },
    atomic: (path, value) => { assert.equal(JSON.stringify(value), JSON.stringify(fixture)); } };
  vm.runInNewContext(block, context);
  assert.throws(() => vm.runInNewContext(block, { ...context, seed: 4102 }), /seed\/size mismatch/);
});

test('wrong pilot scope refuses before output or graph loading', () => {
  const result = spawnSync(process.execPath, ['--max-old-space-size=256', path, '--variant', 'released', '--out', 'unused'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Pilot requires/);
});

test('existing-output invocation cannot launch a competing graph experiment', () => {
  const result = spawnSync(process.execPath, ['--max-old-space-size=256', path, '--variant', 'released', '--out', 'research/reports/mbon05-sign-conditioning-2026-11-01', '--seeds', '1', '--first', '4101', '--items', '2', '--delay-steps', '400'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Serial prerequisite|Require fresh/);
});

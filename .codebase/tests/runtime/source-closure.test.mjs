import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {test} from 'node:test';
import {sourceClosure, sourceManifest} from '../../scripts/runtime/source-closure.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const write = (root, name, text) => {
  mkdirSync(dirname(join(root, name)), {recursive: true});
  writeFileSync(join(root, name), text);
};

test('closure follows static, re-exported and dynamic relative imports only', () => {
  const root = mkdtempSync(join(tmpdir(), 'source-closure-'));
  try {
    write(root, 'a.mjs', "import {y} from './b.mjs';\nimport fs from 'node:fs';\nimport {f} from 'fakepkg';\nexport const a = y;\n");
    write(root, 'b.mjs', "export {y} from './c.mjs';\n");
    write(root, 'c.mjs', "export const y = () => import('./d.mjs');\n");
    write(root, 'd.mjs', 'export default 1;\n');
    write(root, 'node_modules/fakepkg/package.json', '{"name":"fakepkg","version":"1.2.3"}');
    assert.deepEqual(sourceClosure(['a.mjs'], {root}), ['a', 'b', 'c', 'd'].map(name => ({
      path: `${name}.mjs`, sha256: sha(readFileSync(join(root, `${name}.mjs`)))})));
    assert.deepEqual(sourceManifest(['a.mjs'], {root}).packages, {fakepkg: '1.2.3'});
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('a changed byte in a dependency changes the manifest hash', () => {
  const root = mkdtempSync(join(tmpdir(), 'source-closure-'));
  try {
    write(root, 'a.mjs', "import './d.mjs';\n");
    write(root, 'd.mjs', 'export const v = 1;\n');
    const before = sourceManifest(['a.mjs'], {root}).manifestSha256;
    write(root, 'd.mjs', 'export const v = 2;\n');
    assert.notEqual(sourceManifest(['a.mjs'], {root}).manifestSha256, before);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('an import that escapes the repository root throws', () => {
  const parent = mkdtempSync(join(tmpdir(), 'source-closure-'));
  try {
    write(parent, 'outside.mjs', 'export const x = 1;\n');
    write(parent, 'repo/a.mjs', "import '../outside.mjs';\n");
    assert.throws(() => sourceClosure(['a.mjs'], {root: join(parent, 'repo')}), /escapes repository root/);
  } finally {
    rmSync(parent, {recursive: true, force: true});
  }
});

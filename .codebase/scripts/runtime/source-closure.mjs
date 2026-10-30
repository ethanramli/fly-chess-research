// Static source closure for runtime pins (review W05, ledger L104). Walks relative import, export-from and
// dynamic import('./literal') specifiers from repository roots; records the Node version and installed bare-package versions.
// ponytail: regex scan without comment stripping, so an import written in a comment is over-included (safe for pins).
// ponytail: no symlink or case-folding handling; a missing target fails closed through readFileSync.
// Usage (repo root): node --max-old-space-size=256 .codebase/scripts/runtime/source-closure.mjs ROOT...
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isBuiltin} from 'node:module';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])([^'"\n]+)\1/g;
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// Canonical JSON: sorted object keys, no insignificant whitespace.
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  : JSON.stringify(value);

// Forward-slash path relative to the root; anything outside the root (or the root itself) throws.
function repoPath(base, target, from) {
  const path = relative(base, target).split(sep).join('/');
  if (!path || path === '..' || path.startsWith('../') || isAbsolute(path)) throw new Error(`Import escapes repository root: ${from}`);
  return path;
}

export function sourceManifest(roots, {root = REPO} = {}) {
  const base = resolve(root), rootPaths = roots.map(r => repoPath(base, resolve(base, r), r));
  const files = new Map(), packages = {}, stack = [...rootPaths];
  while (stack.length) {
    const path = stack.pop();
    if (files.has(path)) continue;
    const abs = resolve(base, path), bytes = readFileSync(abs);
    files.set(path, sha256(bytes));
    if (!/\.m?js$/.test(path)) continue;
    for (const [, , spec] of bytes.toString('utf8').matchAll(IMPORT)) {
      if (spec.startsWith('./') || spec.startsWith('../')) stack.push(repoPath(base, resolve(dirname(abs), spec), `${path} -> ${spec}`));
      else if (!isBuiltin(spec)) {
        const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
        packages[name] ??= JSON.parse(readFileSync(resolve(base, 'node_modules', name, 'package.json'), 'utf8')).version;
      }
    }
  }
  const runtime = {node: process.version};
  const list = [...files].map(([path, digest]) => ({path, sha256: digest})).sort((a, b) => compare(a.path, b.path));
  const sortedPackages = Object.fromEntries(Object.entries(packages).sort(([a], [b]) => compare(a, b)));
  return {schema: 'source-closure-v1', roots: rootPaths, files: list, runtime, packages: sortedPackages,
    manifestSha256: sha256(Buffer.from(canonical({files: list, packages: sortedPackages, runtime})))};
}

export const sourceClosure = (roots, options) => sourceManifest(roots, options).files;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {positionals} = parseArgs({allowPositionals: true});
  if (!positionals.length) throw new Error('Usage: node --max-old-space-size=256 source-closure.mjs ROOT...');
  process.stdout.write(JSON.stringify(sourceManifest(positionals), null, 2) + '\n');
}

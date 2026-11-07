// Lists every Lichess game code used by earlier experiments and checks that the old hash split governed them, without opening sealed files.
// Paths containing final, sealed, locked, confirm or holdout are never opened; skipping more is the safe direction.
// Exclusion evidence comes from the split check, not from folder names.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { oldSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';

const DEFAULT_ROOTS = ['archive/early-development', 'research', 'runs', 'documentation'];
const SKIP = /final|sealed|locked|confirm|holdout/i;
const SCAN_EXT = new Set(['.json', '.jsonl', '.pgn', '.md', '.txt', '.csv', '.tsv', '.mjs', '.py']);
const MAX_BYTES = 64 * 1024 * 1024;
const ID_PATTERNS = [
  /lichess\.org\/(?:game\/)?([A-Za-z0-9]{8})(?![A-Za-z0-9])/g,
  /"(?:gameId|sourceGameId|game_id)"\s*:\s*"([A-Za-z0-9]{8})"/g,
];
const PGN_NAME = /^([A-Za-z0-9]{8})\.pgn$/;
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const fail = (message, code) => { console.error(message); process.exit(code); };

let args;
try {
  args = parseArgs({ options: { out: { type: 'string' }, root: { type: 'string', multiple: true } }, strict: true }).values;
} catch (err) {
  fail(err.message, 2);
}
if (!args.out) fail('Usage: --out FRESH_DIR [--root PATH ...]', 2);
if (existsSync(args.out)) fail(`Refusing to write into existing ${args.out}`, 2);

const start = Date.now();
const roots = args.root?.length ? args.root : DEFAULT_ROOTS;
const skipped = [];
const tooLarge = [];
const missingRoots = [];
const files = [];

// Paths are matched relative to their root, so the location of the root itself never triggers a skip.
function walk(shownRoot, dirAbs, rel) {
  for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const shown = `${shownRoot}/${childRel}`;
    if (SKIP.test(childRel)) { skipped.push(shown); continue; }
    if (entry.isDirectory()) walk(shownRoot, join(dirAbs, entry.name), childRel);
    else if (entry.isFile()) files.push({ abs: join(dirAbs, entry.name), shown, name: entry.name });
  }
}

for (const root of roots) {
  const abs = resolve(root);
  if (!existsSync(abs)) { missingRoots.push(root); continue; }
  walk(root.replace(/\\/g, '/').replace(/\/+$/, ''), abs, '');
}

const idsFound = new Map();
const addId = (id, shown) => {
  if (!idsFound.has(id)) idsFound.set(id, new Set());
  idsFound.get(id).add(shown);
};

function splitChecksFor(manifestShown, dirAbs, manifest) {
  const results = [];
  for (const split of ['train', 'validation']) {
    const name = `${split}.jsonl`;
    const file = join(dirAbs, name);
    if (!existsSync(file)) continue;
    const buf = readFileSync(file);
    const hashMatches = sha256(buf) === manifest.outputs[name];
    let rows = 0;
    let mismatches = 0;
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      rows++;
      let gameId;
      try { gameId = JSON.parse(line).source?.gameId; } catch { mismatches++; continue; }
      if (typeof gameId !== 'string' || oldSplit(gameId) !== split) mismatches++;
    }
    results.push({ manifest: manifestShown, split, rows, hashMatches, mismatches });
  }
  return results;
}

const splitChecks = [];
let filesScanned = 0;
for (const f of files) {
  const pgn = PGN_NAME.exec(f.name);
  if (pgn) addId(pgn[1], f.shown);
  if (!SCAN_EXT.has(extname(f.name).toLowerCase())) continue;
  if (statSync(f.abs).size > MAX_BYTES) { tooLarge.push(f.shown); continue; }
  const buf = readFileSync(f.abs);
  const text = buf.toString('utf8');
  filesScanned++;
  for (const pattern of ID_PATTERNS) {
    for (const match of text.matchAll(pattern)) addId(match[1], f.shown);
  }
  if (f.name === 'manifest.json') {
    let manifest;
    try { manifest = JSON.parse(text); } catch { manifest = null; }
    if (manifest?.schema === 'lichess-puzzle-corpus-v2' && manifest.outputs && typeof manifest.outputs === 'object') {
      splitChecks.push(...splitChecksFor(f.shown, join(f.abs, '..'), manifest));
    }
  }
}

const ids = [...idsFound.keys()].sort();
const idsByOldBucket = { train: 0, validation: 0, final: 0 };
const finalBucketFound = [];
for (const id of ids) {
  const bucket = oldSplit(id);
  idsByOldBucket[bucket]++;
  if (bucket === 'final' && finalBucketFound.length < 50) {
    finalBucketFound.push({ id, files: [...idsFound.get(id)].sort() });
  }
}

const idsText = ids.length ? `${ids.join('\n')}\n` : '';
const splitCheckRows = splitChecks.reduce((sum, c) => sum + c.rows, 0);
const splitMismatches = splitChecks.reduce((sum, c) => sum + c.mismatches, 0);
const status = splitCheckRows > 0 && splitMismatches === 0 && splitChecks.every(c => c.hashMatches)
  ? 'passed' : 'failed';

const report = {
  schema: 'old-game-exclusion-v1',
  roots,
  filesScanned,
  skippedCount: skipped.length,
  skipped,
  tooLarge,
  missingRoots,
  idsFound: ids.length,
  idsByOldBucket,
  finalBucketFound,
  splitChecks,
  splitCheckRows,
  splitMismatches,
  status,
  idsSha256: sha256(Buffer.from(idsText)),
  scriptSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
  elapsedSeconds: Number(((Date.now() - start) / 1000).toFixed(3)),
};

mkdirSync(args.out, { recursive: true });
writeFileSync(join(args.out, 'old-game-ids.txt'), idsText);
writeFileSync(join(args.out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${status}: ${ids.length} IDs, ${splitCheckRows} split-check rows, ${splitMismatches} mismatches -> ${args.out}`);
process.exitCode = status === 'passed' ? 0 : 1;

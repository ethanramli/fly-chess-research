import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oldSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';

const script = fileURLToPath(new URL('../../scripts/data/verify-old-game-exclusion.mjs', import.meta.url));
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const NOTES_CODE = 'abcd1234';
const PGN_CODE = 'Zz9Yy8Xx';
const FINAL_CODE = 'fin00001';
const SKIPPED_CODE = 'skp00002';

// First 8-character code at or after `from` whose old split is `split`.
function codeFor(split, from) {
  for (let i = from; ; i++) {
    const id = `g${i.toString(36).padStart(7, '0')}`;
    if (oldSplit(id) === split) return id;
  }
}

const row = id => JSON.stringify({ schema: 'lichess-puzzle-source-row-v1', source: { gameId: id } }) + '\n';

function buildFixture({ trainIds, validationIds }) {
  const root = mkdtempSync(join(tmpdir(), 'old-exclusion-'));
  const setA = join(root, 'data', 'set-a');
  mkdirSync(setA, { recursive: true });
  const trainText = trainIds.map(row).join('');
  const validationText = validationIds.map(row).join('');
  writeFileSync(join(setA, 'train.jsonl'), trainText);
  writeFileSync(join(setA, 'validation.jsonl'), validationText);
  writeFileSync(join(setA, 'final.jsonl'), row(FINAL_CODE));
  writeFileSync(join(setA, 'manifest.json'), JSON.stringify({
    schema: 'lichess-puzzle-corpus-v2',
    outputs: { 'train.jsonl': sha256(Buffer.from(trainText)), 'validation.jsonl': sha256(Buffer.from(validationText)) },
  }));
  writeFileSync(join(root, 'data', 'notes.md'), `See https://lichess.org/${NOTES_CODE}/black#12\n`);
  mkdirSync(join(root, 'data', 'pgn', 'train'), { recursive: true });
  writeFileSync(join(root, 'data', 'pgn', 'train', `${PGN_CODE}.pgn`), '[Event "x"]\n\n1. e4 *\n');
  mkdirSync(join(root, 'data', 'old-final-family'), { recursive: true });
  writeFileSync(join(root, 'data', 'old-final-family', 'x.json'), JSON.stringify({ gameId: SKIPPED_CODE }));
  return root;
}

function runScript(root, out) {
  return spawnSync(process.execPath, ['--max-old-space-size=256', script, '--out', out, '--root', root], { encoding: 'utf8' });
}

test('lists old-split game codes and skips final and sealed paths', () => {
  const trainA = codeFor('train', 0);
  const trainB = codeFor('train', 1000);
  const valA = codeFor('validation', 5000);
  const root = buildFixture({ trainIds: [trainA, trainB], validationIds: [valA] });
  const parent = mkdtempSync(join(tmpdir(), 'old-exclusion-out-'));
  const out = join(parent, 'report');
  try {
    const r = runScript(root, out);
    assert.equal(r.status, 0, r.stderr);
    const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
    const idsText = readFileSync(join(out, 'old-game-ids.txt'), 'utf8');
    const ids = idsText.split('\n');
    for (const id of [NOTES_CODE, PGN_CODE, trainA, trainB, valA]) assert.ok(ids.includes(id), id);
    for (const id of [FINAL_CODE, SKIPPED_CODE]) assert.ok(!ids.includes(id), id);
    assert.equal(report.status, 'passed');
    assert.ok(report.skipped.some(p => p.endsWith('/data/set-a/final.jsonl')));
    assert.ok(report.skipped.some(p => p.endsWith('/data/old-final-family')));
    assert.equal(report.splitCheckRows, 3);
    assert.equal(report.splitMismatches, 0);
    assert.equal(report.idsSha256, sha256(Buffer.from(idsText)));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(parent, { recursive: true, force: true });
  }
});

test('fails when a train row belongs to the validation bucket', () => {
  const trainA = codeFor('train', 0);
  const valA = codeFor('validation', 5000);
  const root = buildFixture({ trainIds: [trainA, valA], validationIds: [valA] });
  const parent = mkdtempSync(join(tmpdir(), 'old-exclusion-out-'));
  const out = join(parent, 'report');
  try {
    const r = runScript(root, out);
    assert.equal(r.status, 1, r.stderr);
    const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
    assert.equal(report.status, 'failed');
    assert.equal(report.splitMismatches, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(parent, { recursive: true, force: true });
  }
});

test('refuses to write into an existing output directory', () => {
  const root = buildFixture({ trainIds: [codeFor('train', 0)], validationIds: [codeFor('validation', 5000)] });
  const parent = mkdtempSync(join(tmpdir(), 'old-exclusion-out-'));
  try {
    const r = runScript(root, parent);
    assert.equal(r.status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(parent, { recursive: true, force: true });
  }
});

// Retrieval check: does a capture-centred board description separate safe from unsafe captures?
// Brain-free. Reads the twin pairs and the split, runs nearest-neighbour retrieval, writes one JSON file.
// Usage: node --max-old-space-size=512 analyze-centred-retrieval-v1.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planesWhole, planesCentred, planesCentredAttack } from '../../src/neural-learning/centred-board-v1.mjs';
import { oracleKnn, leaveOneOut } from '../../src/neural-learning/pathway-trace-analysis-v1.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const pairsPath = join(root, 'runs/restart-data-2026-11-03/pairs-train-capture/pairs.jsonl');
const summaryPath = join(root, 'runs/engineered-memory-test-2026-11-03/engineered-memory-test-v2/summary.json');
const outPath = join(root, 'runs/engineered-memory-test-2026-11-03/centred-retrieval-v1.json');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const pairsBuf = readFileSync(pairsPath);
const summaryBuf = readFileSync(summaryPath);
const pairs = pairsBuf.toString('utf8').trim().split('\n').map((line) => JSON.parse(line));
const { split } = JSON.parse(summaryBuf.toString('utf8'));
const experience = new Set(split.experience);
const newBoards = new Set(split.newBoards);

const descriptions = {
  whole: planesWhole,
  centred: planesCentred,
  centredAttack: planesCentredAttack,
};

// Turn each pair into { good, bad } vectors for one description.
function buildSet(ids, describe) {
  return pairs
    .filter((p) => ids.has(p.gameId))
    .map((p) => ({ good: describe(p.good.fen, p.move), bad: describe(p.bad.fen, p.move) }));
}

const KS = [1, 3, 5];
const results = {};
for (const [name, describe] of Object.entries(descriptions)) {
  const practice = buildSet(experience, describe);
  const fresh = buildSet(newBoards, describe);
  results[name] = {
    practiceCount: practice.length,
    newCount: fresh.length,
    byK: {},
  };
  for (const k of KS) {
    results[name].byK[k] = {
      newBoards: oracleKnn(practice, fresh, k),
      practiceLeaveOneOut: leaveOneOut(practice, k),
    };
  }
}

// Print a plain table.
const pct = (r) => `${r.correct}/${r.total} (${((100 * r.correct) / r.total).toFixed(1)}%)`;
console.log('description    k  new boards            practice leave-one-out');
for (const name of Object.keys(results)) {
  for (const k of KS) {
    const r = results[name].byK[k];
    console.log(`${name.padEnd(14)} ${String(k).padEnd(2)} ${pct(r.newBoards).padEnd(21)} ${pct(r.practiceLeaveOneOut)}`);
  }
}

const doc = {
  inputs: { pairsSha256: sha256(pairsBuf), summarySha256: sha256(summaryBuf) },
  results,
};
mkdirSync(join(root, 'runs/engineered-memory-test-2026-11-03'), { recursive: true });
writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
console.log(`Wrote ${outPath}`);

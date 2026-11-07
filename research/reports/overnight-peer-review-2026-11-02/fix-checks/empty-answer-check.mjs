// Peer-review fix check 2026-11-03: the fixed audit must reject missing answers. Same extraction method as primary-feedback-audit/checks.mjs.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync('.codebase/scripts/neural-learning/audit-long-term-memory-v1-live.mjs', 'utf8');
const from = source.indexOf('      assert.equal(r.tests.length'), block = source.slice(from, source.indexOf('      assert.equal(r.localHash', from));
const run = tests => { let n = 0; runInNewContext(block, { r: { tests, phase: 'Rev' }, start: { items: [1, 2, 3, 4] }, assert, itemEvaluations: 0, validateScore() { n++; } }); return n; };
const full = [0, 1, 2, 3].map(item => { const good = item === 0 ? 1 : 0, margin = (good ? 0 : 1) - (good ? 1 : 0);
  return { item, candidates: [{ score: 1 }, { score: 0 }], margin, correct: margin > 0 }; });
assert.equal(run(full), 8);                                      // positive control: a complete list passes
assert.throws(() => run([]), /AssertionError|Expected values/);  // empty list
assert.throws(() => run([{ item: 0, candidates: [{}, {}] }]));   // one answer of four
assert.throws(() => run([0, 1, 2, 3].map(item => ({ item, candidates: [{}] })))); // one candidate per answer
const result = { command: 'node --max-old-space-size=256 ' + new URL(import.meta.url).pathname.split('/fly-chess-research/')[1], status: 'passed',
  completeListAccepted: true, emptyListRejected: true, partialListRejected: true, missingCandidateRejected: true,
  scope: 'literal predicate extraction from the fixed audit; the full pilot re-audit is in pilot-audit-with-required-answers.json' };
writeFileSync(new URL('empty-answer-check.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));

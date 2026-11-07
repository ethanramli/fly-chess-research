import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const directory = new URL('./', import.meta.url);
const hash = state => {
  const h = createHash('sha256');
  for (const field of ['gains', 'traces', 'states']) h.update(Buffer.from(Float64Array.from(state[field]).buffer));
  return h.update(JSON.stringify([state.time, state.pulses])).digest('hex');
};
function transition(file) {
  const text = readFileSync(new URL(file, directory), 'utf8');
  const start = text.indexOf('function advance('), end = text.indexOf('function validState(', start);
  assert(start >= 0 && end > start);
  // Extract only the owned pure arithmetic function; never execute either audit CLI in this check.
  return new Function('assert', 'hash', 'allowedByMapping', `${text.slice(start, end)}; return advance;`)(assert, hash, new WeakMap());
}

test('performance derivative preserves every bit on 168 reversal observations and rejects corruption', () => {
  const root = 'runs/memory-retention-2026-11-01/eye-graph-memory-cubic-v1-recovery1';
  const rows = readFileSync(`${root}/frames-4102-informative.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  const frames = rows.filter(r => r.kind === 'frame' && r.context.phase === 'REV');
  assert.equal(frames.length, 168);
  const initial = JSON.parse(readFileSync(`${root}/snapshot-4102-informative-Delay.json`)).snapshot;
  const expected = JSON.parse(readFileSync(`${root}/snapshot-4102-informative-Rev.json`)).snapshot;
  const oldAdvance = transition('audit-diagnostic.mjs'), newAdvance = transition('audit-diagnostic-v2.mjs');
  const original = structuredClone(initial), optimized = structuredClone(initial), header = rows[0];
  for (const frame of frames) {
    oldAdvance(original, header.config, header.mapping, frame);
    newAdvance(optimized, header.config, header.mapping, frame);
    assert.deepEqual(optimized, original);
  }
  assert.equal(hash(optimized), hash(expected));
  for (const fn of [oldAdvance, newAdvance]) {
    const broken = structuredClone(initial); broken.gains[0] -= .001;
    assert.throws(() => fn(broken, header.config, header.mapping, frames[0]));
  }
});

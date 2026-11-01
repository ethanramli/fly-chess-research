// Audit one completed arm while the serial experiment continues; no graph execution or learner changes.
import assert from 'node:assert/strict';
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { auditFrames } from './audit-eye-memory.mjs';
const { values: a } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' }, seed: { type: 'string' }, arm: { type: 'string', default: 'informative' }, restored: { type: 'boolean' } } });
assert(a.run && a.seed && a.out && !existsSync(a.out));
const rec = readFileSync(`${a.run}/records.jsonl`, 'utf8').trim().split('\n').map(JSON.parse).find(r => r.seed === Number(a.seed) && r.arm === a.arm);
assert(rec, 'Arm not yet published');
const file = `${a.run}/frames-${a.seed}-${a.arm}${a.restored ? '-restored' : ''}.jsonl`;
for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
  const { initial: s } = JSON.parse(line);
  assert.equal(s.time, 0); assert.equal(s.pulses, 0);
  assert(s.states.every((x, i) => x === (i % 4 === 0 ? 1 : 0)));
  break;
}
const result = await auditFrames(file, a.run, rec);
assert.equal(result.frames, a.arm === 'disabled' ? 0 : 24 * (Object.keys(rec.tests).length - 1) * 7 + 400);
writeFileSync(a.out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'arm-audit-passed', seed: result.seed, arm: result.arm, frames: result.frames, trials: result.trials, restored: result.restored }));

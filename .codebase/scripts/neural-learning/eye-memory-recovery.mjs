// Execution recovery only. The frozen learner, observations and scientific gates are unchanged.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { auditFrames, replayFrame } from './audit-eye-memory.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const hashState = s => {
  const h = createHash('sha256');
  for (const name of ['gains', 'traces', 'states']) h.update(Buffer.from(Float64Array.from(s[name]).buffer));
  return h.update(JSON.stringify([s.time, s.pulses])).digest('hex');
};

export function phasePrefix(bytes, saved) {
  let offset = 0, start, state, frames = 0, trials = 0;
  const tests = {}, pulses = {}, realized = {};
  while (offset < bytes.length) {
    const end = bytes.indexOf(10, offset);
    assert(end >= 0, 'Incomplete receipt before selected checkpoint');
    const r = JSON.parse(bytes.subarray(offset, end).toString('utf8'));
    offset = end + 1;
    if (r.kind === 'start') {
      assert(!start); start = r; state = structuredClone(r.initial);
      assert.equal(start.seed, 4102); assert.equal(start.arm, 'absent');
      assert.equal(hashState(state), r.localHash);
    } else {
      assert(start, 'Missing initial receipt');
      if (r.kind === 'frame') {
        assert.equal(r.frame, frames++); replayFrame(state, start.config, start.mapping, r);
      } else if (r.kind === 'trial') {
        assert.equal(r.context.trial, ++trials); assert.equal(r.valence, null); assert.equal(r.scale, 0); assert.equal(r.level, .75);
        assert.equal(r.unknown, trials % 8 === 0);
        assert.equal(r.context.item, Math.floor((trials - 1) / 24));
        const p = pulses[r.context.phase] ??= { reward: 0, punish: 0, none: 0 };
        p.none++; realized[r.context.phase] ??= [];
      } else if (r.kind === 'test') {
        assert.equal(r.localHash, hashState(state)); tests[r.name] = r.results;
        if (r.name === saved.phase) {
          assert.equal(r.name, 'T1'); assert.equal(trials, 48); assert.equal(frames, 336);
          assert.equal(saved.seed, start.seed); assert.equal(saved.arm, start.arm);
          assert.equal(hashState(saved.snapshot), hashState(state)); assert.deepEqual(saved.snapshot, state);
          assert.deepEqual(saved.tests, r.results);
          return { prefix: bytes.subarray(0, offset), start, snapshot: saved.snapshot, frames, trials, tests, pulses, realized };
        }
      } else assert.fail('Unexpected receipt before selected checkpoint');
    }
  }
  assert.fail('Selected phase test not found');
}

export function validOverlap(bytes) {
  const records = [], byFrame = new Map(), byTrial = new Map();
  let offset = 0;
  while (offset < bytes.length) {
    const end = bytes.indexOf(10, offset);
    if (end < 0) {
      assert(bytes.subarray(offset).every(x => x === 0), 'Unexpected non-NUL incomplete tail');
      return { records, byFrame, byTrial, invalidNulBytes: bytes.length - offset };
    }
    const r = JSON.parse(bytes.subarray(offset, end).toString('utf8')); offset = end + 1;
    records.push(r);
    if (r.kind === 'frame') { assert(!byFrame.has(r.frame)); byFrame.set(r.frame, r); }
    else if (r.kind === 'trial') { assert(!byTrial.has(r.context.trial)); byTrial.set(r.context.trial, r); }
  }
  return { records, byFrame, byTrial, invalidNulBytes: 0 };
}

export async function prepareRecovery(parentPath, outPath) {
  const parent = resolve(parentPath), out = resolve(outPath);
  assert(!relative(process.cwd(), parent).startsWith('..') && parent !== out);
  const manifestBytes = readFileSync(`${parent}/manifest.json`), manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schema, 'eye-graph-memory-cubic-v1'); assert.equal(manifest.status, 'running');
  assert(!existsSync(`${parent}/summary.json`), 'Source already completed');
  for (const [p, expected] of Object.entries(manifest.pins)) assert.equal(digest(readFileSync(p)), expected, `Source changed: ${p}`);
  const completed = JSON.parse(readFileSync(`${parent}/completed.json`));
  assert.deepEqual([completed.seed, completed.arm, completed.records], [4102, 'informative', 5]);
  const recordLines = readFileSync(`${parent}/records.jsonl`, 'utf8').split('\n').slice(0, completed.records);
  const rows = recordLines.map(JSON.parse);
  assert.deepEqual(rows.map(r => [r.seed, r.arm]), [[4101, 'informative'], [4101, 'absent'], [4101, 'shuffled'], [4101, 'disabled'], [4102, 'informative']]);
  assert.equal(rows.at(-1).finalLocalState, completed.finalState);
  const copied = new Set(), copy = name => { if (!copied.has(name)) { copyFileSync(`${parent}/${name}`, `${out}/${name}`); copied.add(name); } };
  for (const row of rows) {
    const suffixes = [`${row.seed}-${row.arm}`];
    if (row.seed === 4101 && row.arm === 'informative') suffixes.push('4101-informative-restored');
    for (const suffix of suffixes) {
      await auditFrames(`${parent}/frames-${suffix}.jsonl`, parent, row);
      copy(`frames-${suffix}.jsonl`);
      for (const name of readdirSync(parent).filter(n => n.startsWith(`snapshot-${suffix}-`) && n.endsWith('.json'))) copy(name);
    }
  }
  const bytes = readFileSync(`${parent}/frames-4102-absent.jsonl`), snapshotBytes = readFileSync(`${parent}/snapshot-4102-absent-T1.json`);
  const resume = phasePrefix(bytes, JSON.parse(snapshotBytes)), overlap = validOverlap(bytes.subarray(resume.prefix.length));
  const state = structuredClone(resume.snapshot);
  for (const r of overlap.records) if (r.kind === 'frame') replayFrame(state, resume.start.config, resume.start.mapping, r);
  writeFileSync(`${out}/records.jsonl`, recordLines.join('\n') + '\n', { flag: 'wx' });
  writeFileSync(`${out}/frames-4102-absent.jsonl`, resume.prefix, { flag: 'wx' });
  for (const name of ['T0', 'T1']) copy(`snapshot-4102-absent-${name}.json`);
  copy('completed.json');
  writeFileSync(`${out}/parent-manifest.json`, manifestBytes, { flag: 'wx' });
  const lineage = { schema: 'eye-memory-phase-recovery-v1', parent: parentPath, parentManifest: digest(manifestBytes),
    parentRecords: digest(readFileSync(`${parent}/records.jsonl`)), sourceReceipt: digest(bytes), checkpoint: { path: 'snapshot-4102-absent-T1.json', sha256: digest(snapshotBytes), localHash: hashState(resume.snapshot) },
    completedArmRecords: rows.length, prefixSha256: digest(resume.prefix), prefixFrames: resume.frames, completedTrials: resume.trials,
    overlapFrames: overlap.byFrame.size, invalidNulBytesPreservedInParent: overlap.invalidNulBytes, copiedFiles: [...copied],
    sourceMetrics: 'original invocation incomplete; resumed timing/RSS is not a whole-run measurement' };
  writeFileSync(`${out}/recovery.json`, JSON.stringify(lineage, null, 2) + '\n', { flag: 'wx' });
  return { rows, resume, overlap, lineage, cachedItems(seed) {
    const row = rows.find(r => r.seed === seed && r.arm === 'informative');
    if (!row) return null;
    const data = readFileSync(`${parent}/frames-${seed}-informative.jsonl`, 'utf8');
    return JSON.parse(data.slice(0, data.indexOf('\n'))).items;
  } };
}

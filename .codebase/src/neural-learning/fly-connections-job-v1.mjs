// Fly connections memory v1: one (seed, arm) job loop. Pure of graph loading: the caller supplies a ready condition.
// Probes and events follow the tape (file formats doc: probe sets, resume and exactly-once). Every append is
// acknowledged by state.json; a restart truncates records.jsonl to the acknowledged bytes and restores the snapshot.
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, truncateSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const STATE = 'fly-connections-job-state-v1';
const RESULT = 'fly-connections-job-result-v1';
// Probe label -> groups ranked, in this order.
const PROBES = {
  T0: ['A', 'B', 'R', 'testA', 'testB'],
  'A-8': ['A'], 'A-16': ['A'], 'A-end': ['A', 'R'],
  'R1-end': ['A', 'B', 'R'],
  'B-8': ['A', 'B'], 'B-16': ['A', 'B'], 'B-end': ['A', 'B', 'R', 'testA', 'testB'],
  'R2-end': ['A', 'B', 'R', 'testA', 'testB'],
};
const byBoardId = (a, b) => (a.boardId < b.boardId ? -1 : a.boardId > b.boardId ? 1 : 0);
const lineOf = value => `${JSON.stringify(value)}\n`;
const writeAtomic = (path, text) => { writeFileSync(`${path}.partial`, text); renameSync(`${path}.partial`, path); };

// Passes and the first fingerprint per label, read from the acknowledged prefix of records.jsonl only.
async function acknowledged(path, bytes) {
  const found = { passes: 0, fingerprints: {} };
  if (bytes === 0) return found;
  const lines = createInterface({ input: createReadStream(path, { end: bytes - 1 }), crlfDelay: Infinity });
  for await (const line of lines) {
    const entry = JSON.parse(line);
    if (entry.type === 'event') { found.passes += entry.receipt.passes; continue; }
    if (entry.type === 'ranking') found.passes += entry.ranking.passes;
    found.fingerprints[entry.label] ??= entry.fingerprint;
  }
  return found;
}

// now() returns milliseconds. extra() returns { peakRssMiB, minFreeMiB } for this invocation.
export async function runJob({ condition, records, tape, arm, dir, now = () => performance.now(), extra = () => ({}) }) {
  const resultPath = join(dir, 'result.json');
  if (existsSync(resultPath)) return JSON.parse(readFileSync(resultPath, 'utf8'));
  if (!(records instanceof Map)) throw Error('records must be a Map of boardId to board record');
  if (condition.describe().arm !== arm) throw Error(`Condition arm ${condition.describe().arm} differs from job arm ${arm}`);
  tape.events.forEach((event, i) => { if (event.sequence !== i) throw Error(`Tape event ${i} has sequence ${event.sequence}`); });

  const started = now(), cpuStarted = process.cpuUsage();
  const statePath = join(dir, 'state.json'), recordsPath = join(dir, 'records.jsonl');
  mkdirSync(join(dir, 'snapshots'), { recursive: true });
  const boardsOf = {};
  for (const record of records.values()) (boardsOf[record.group] ??= []).push(record);
  for (const list of Object.values(boardsOf)) list.sort(byBoardId);

  let cursor = 0, probesDone = [], fingerprint = null, snapshot = null, passes = 0, fingerprints = {};
  const saveState = () => writeAtomic(statePath, JSON.stringify({ schema: STATE, seed: tape.seed, arm, tapeSha256: tape.sha256,
    cursor, probesDone, recordsBytes: statSync(recordsPath).size, fingerprint, snapshot }) + '\n');

  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    if (state.schema !== STATE || state.seed !== tape.seed || state.arm !== arm || state.tapeSha256 !== tape.sha256) {
      throw Error('state.json does not belong to this job');
    }
    if (statSync(recordsPath).size < state.recordsBytes) throw Error('records.jsonl is shorter than its acknowledged state');
    truncateSync(recordsPath, state.recordsBytes);
    condition.restore(state.snapshot);
    if (condition.fingerprint() !== state.fingerprint) throw Error('Restored fingerprint differs from state.json');
    ({ cursor, probesDone, fingerprint, snapshot } = state);
    ({ passes, fingerprints } = await acknowledged(recordsPath, state.recordsBytes));
  } else {
    writeFileSync(recordsPath, '');
    fingerprint = condition.fingerprint();
    snapshot = condition.snapshot();
    saveState();
  }

  const probe = ({ phase: label, cursor: at }) => {
    if (probesDone.includes(label)) return;
    if (!PROBES[label]) throw Error(`Unknown probe label ${label}`);
    const fp = condition.fingerprint();
    const offArm = arm === 'off-local';
    if (offArm && label !== 'T0' && fp !== fingerprints.T0) {
      throw Error(`off-local persistent state changed before ${label}; the off arm must never change`);
    }
    const reuse = false; // code review r1: every arm ranks at every checkpoint (equal pass counts); 'ranking-reused' is never written
    let text = '', added = 0;
    for (const group of PROBES[label]) for (const record of boardsOf[group] ?? []) {
      if (reuse) {
        text += lineOf({ type: 'ranking-reused', label, cursor: at, boardId: record.boardId, group, from: 'T0', fingerprint: fp });
      } else {
        const phase = group === 'R' ? 'R1' : 'chess';
        const ranking = condition.rankBoard(record, { phase });
        added += ranking.passes;
        text += lineOf({ type: 'ranking', label, cursor: at, boardId: record.boardId, group, phase, fingerprint: fp, ranking });
      }
    }
    if (text) appendFileSync(recordsPath, text);
    passes += added;
    const snap = condition.snapshot();
    writeAtomic(join(dir, 'snapshots', `${label}.json`), JSON.stringify(snap) + '\n');
    fingerprints[label] = fp;
    probesDone = [...probesDone, label];
    fingerprint = fp;
    snapshot = snap;
    saveState();
  };

  const teachEvent = i => {
    const event = tape.events[i];
    const record = records.get(event.boardId);
    if (!record) throw Error(`No board record for ${event.boardId}`);
    const options = arm === 'shuffled-local' ? { deliveredPulse: tape.shuffledPulses[i] } : {};
    const { receipt, snapshot: after } = condition.teach(record, event, options);
    appendFileSync(recordsPath, lineOf({ type: 'event', cursor: receipt.sequence, receipt }));
    passes += receipt.passes;
    cursor = i + 1;
    fingerprint = receipt.fingerprintAfter;
    snapshot = after;
    saveState();
  };

  probe(tape.initialProbe);
  for (let i = 0; i < tape.events.length; i++) {
    if (i >= cursor) teachEvent(i);
    for (const p of tape.probeAfter) if (p.cursor === i + 1) probe(p);
  }
  for (const p of [tape.initialProbe, ...tape.probeAfter]) if (!probesDone.includes(p.phase)) throw Error(`Probe ${p.phase} never ran`);

  const wall = (now() - started) / 1000, cpu = process.cpuUsage(cpuStarted);
  const { peakRssMiB = null, minFreeMiB = null } = extra();
  const result = { schema: RESULT, seed: tape.seed, arm, tapeSha256: tape.sha256, status: 'complete', passes,
    events: tape.events.length, wallSeconds: wall, cpuSeconds: (cpu.user + cpu.system) / 1e6,
    secondsPerPass: passes > 0 ? wall / passes : null, peakRssMiB, minFreeMiB, fingerprints, describe: condition.describe() };
  const text = JSON.stringify(result, null, 2) + '\n';
  writeAtomic(resultPath, text);
  return JSON.parse(text);
}

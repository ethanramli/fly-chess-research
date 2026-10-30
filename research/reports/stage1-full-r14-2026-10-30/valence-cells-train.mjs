// TRAINING-ONLY, no graph: for each training probe action (train-plan.json, 24 boards x safe/unsafe capture),
// rebuild its attack-map cue v2 cells with the registered seed and read the final informative memory gains
// on those cells' plastic edges. Tests whether reward (alpha1/MBON07, MBON01) and punishment
// (alpha3/MBON14, MBON12) depression cancel on safe-capture cells. Final and validation data untouched.
// Usage: node research/reports/stage1-full-r14-2026-10-30/valence-cells-train.mjs
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createPublicAttackMapEncoderV2 } from '../../../.codebase/src/chess-input/public-attack-map-cue-v2.mjs';
import { combineAlphaLobeMapping } from '../../../.codebase/src/neural-learning/alpha-lobe-memory.mjs';

const json = p => JSON.parse(readFileSync(p, 'utf8'));
const D = 'research/data/lichess-stage1-synthetic-v1/';
const reg = json(D + 'stage1-full-r14-registration.json').learner;
const mapping = combineAlphaLobeMapping(json('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping,
  json('research/reports/alpha-one-mapping-2026-10-25/mapping.json').mapping,
  json('research/reports/alpha-three-mapping-2026-10-26/mapping.json').mapping);
const train = new Map(readFileSync(D + 'train.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse).map(r => [r.lesson.lessonId, r.lesson]));
const plan = json(D + 'train-plan.json');
const { schema, taskFamily, ...encoderConfig } = reg.encoder;
const runs = { r1: 'runs/lichess-stage1-synthetic-v1-full-r14/r1%3Ainformative/attempt-001',
  r2: 'runs/lichess-stage1-synthetic-v1-full-r14/r2%3Ainformative/attempt-001',
  r3: 'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001/r3%3Ainformative/attempt-001' };
// Score sign of a depression in each MBON: readout = MBON12 - MBON01 - MBON07 + MBON14.
const effect = { MBON12: -1, MBON01: +1, MBON07: +1, MBON14: -1 };
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;

for (const [rep, dir] of Object.entries(runs)) {
  const gains = JSON.parse(gunzipSync(readFileSync(dir + '/stage-checkpoint-032.json.gz'))).state.block.session.memory.gains;
  // KC -> {mbon: [gain...]} in AlphaLobeMemory snapshot order (restrained groups, then alpha1, then alpha3).
  const byKC = new Map(); let offset = 0;
  const ordered = [...mapping.groups.filter(g => !['PAM11', 'PPL106'].includes(g.danType)),
    ...mapping.groups.filter(g => g.danType === 'PAM11'), ...mapping.groups.filter(g => g.danType === 'PPL106')];
  for (const g of ordered) for (const kc of g.kc) {
    const m = byKC.get(kc) ?? {}; (m[g.mbonType] ??= []).push(gains[offset++]); byKC.set(kc, m);
  }
  if (offset !== gains.length) throw Error('Gain layout mismatch');
  const encoder = createPublicAttackMapEncoderV2(mapping, { ...encoderConfig, seed: reg.replicaSeeds[rep] });
  const rows = { success: [], failure: [] }; const overlap = [];
  const boards = new Map(); for (const p of plan.probeActions) (boards.get(p.panelId) ?? boards.set(p.panelId, []).get(p.panelId)).push(p.actionId);
  for (const [id, actions] of boards) {
    const L = train.get(id), cells = {};
    for (const action of actions) {
      const cue = encoder.encode({ schema: 'public-lesson-frame-v1', fen: L.context.fen, pgn: L.context.pgn, action, task: L.context.task });
      const status = L.candidates.find(c => c.move === action).status;
      cells[status] = new Set(cue.stimulation.map(s => s.index));
      const per = {}; let net = 0;
      for (const mbon of Object.keys(effect)) {
        const depr = cue.stimulation.flatMap(s => (byKC.get(s.index)?.[mbon] ?? []).map(gn => (1 - gn) * s.current));
        per[mbon] = depr.reduce((x, y) => x + y, 0); net += effect[mbon] * per[mbon];
      }
      rows[status].push({ ...per, net });
    }
    const s = cells.success, f = cells.failure;
    overlap.push([...s].filter(i => f.has(i)).length / s.size);
  }
  const summary = status => Object.fromEntries([...Object.keys(effect), 'net'].map(k => [k, +mean(rows[status].map(r => r[k])).toFixed(2)]));
  console.log(rep, JSON.stringify({ boards: boards.size, safeCellsSharedWithUnsafe: +mean(overlap).toFixed(3),
    safe: summary('success'), unsafe: summary('failure'),
    safeNetPositive: rows.success.filter(r => r.net > 0).length, unsafeNetNegative: rows.failure.filter(r => r.net < 0).length }));
}
console.log('Columns: summed current-weighted depression (1 - gain) on the cue cells\' edges to each MBON; net = signed direct-path score effect (+ raises the readout).');

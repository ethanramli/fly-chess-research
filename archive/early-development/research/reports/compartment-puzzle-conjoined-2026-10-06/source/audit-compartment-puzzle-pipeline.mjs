import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../src/lowram/mate-certificate-check.mjs';
const { values: args } = parseArgs({ options: { run: { type: 'string' },
  prefix: { type: 'string' }, origin: { type: 'string' }, out: { type: 'string' } } });
if (!args.run) throw Error('Require --run');
const hash = value => createHash('sha256').update(value).digest('hex');
const reportBytes = readFileSync(join(args.run, 'report.json')), r = JSON.parse(reportBytes), p = r.protocol;
assert.equal(r.complete, true); assert.equal(r.identity.schema, 'compartment-puzzle-pipeline-v1');
const prerequisite = JSON.parse(readFileSync(join(p.prerequisite, 'report.json')));
const prerequisiteAudit = JSON.parse(readFileSync(join(p.prerequisite, 'audit-prefix.json')));
assert.equal(prerequisite.summary.allBehavioralGatesPassed, true);
assert.equal(prerequisiteAudit.passed, true); assert.equal(prerequisiteAudit.prefixExact, true);
assert.equal(hash(readFileSync(join(p.prerequisite, 'report.json'))), r.identity.variant.reportSha256);
for (const [path, sha] of Object.entries({ ...r.identity.inputs, ...r.identity.sources })) assert.equal(hash(readFileSync(path)), sha);
const mapping = JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
const pool = [...new Set(mapping.groups.flatMap(g => g.kc))].sort((a, b) => a - b);
const variant = p.variants.find(v => v.id === r.identity.variant.id);
assert.deepEqual(variant, r.identity.variant); assert.equal(p.prerequisite, variant.prerequisite);
assert.deepEqual(r.sharedPlans, p.commonPlans); assert.equal(hash(readFileSync(p.teacherReport)), p.teacherReportSha256);
const bucket = (token, size) => createHash('sha256').update(`${p.encoder.seed}\0${token}`).digest().readUInt32LE(0) % size;
const readRef = ref => { const bytes = readFileSync(ref.path); assert.equal(hash(bytes), ref.sha256); return JSON.parse(bytes); };
const plans = r.sharedPlans.map(readRef), flags = plans.flatMap(plan => plan.experiences.map(e => e.status === 'success' ? 'PAM02' : 'PPL103'));
const shuffled = [...flags]; let rng = p.seed >>> 0;
for (let i = shuffled.length - 1; i > 0; i--) { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  const j = Math.floor(rng / 2 ** 32 * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
assert.deepEqual(r.shuffle, shuffled); assert.equal(r.results.length, p.conditions.length * r.identity.puzzleCount);
function projectedCue(board, seed, candidate, task) {
  const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === candidate);
  assert.ok(move); assert.equal(board.history().length, 0);
  const [,, castling, ep, halfmove] = board.fen().split(' ');
  const xy = square => [square.charCodeAt(0)-97,Number(square[1])-1];
  const [fx,fy] = xy(move.from), [tx,ty] = xy(move.to), direction = board.turn() === 'w' ? 1 : -1;
  const relativeRights = board.turn() === 'w' ? castling : castling.replace(/[KQkq]/g,c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
  const rights = castling === '-' ? '-' : 'KQkq'.split('').filter(c => relativeRights.includes(c)).join('');
  const inventory = mirror => {
    const action = `${move.piece}:${mirror*(tx-fx)},${direction*(ty-fy)}:${move.promotion??'-'}`;
    const values = [`action:${action}`,`capture:${move.captured??'-'}`,`castle:${rights}`,
      `halfmove:${halfmove}`,'repetition:1',`task:${task.objective}:${task.plies}`];
    for (const [label,sx,sy] of [['origin',fx,fy],['target',tx,ty]]) {
      const x = mirror === 1 ? sx : 7-sx, y = direction === 1 ? sy : 7-sy;
      values.push(`${label}-walls:${x},${7-x},${y},${7-y}`);
    }
    if (ep === '-') values.push('ep:-'); else { const [ex,ey]=xy(ep); values.push(`ep-from-target:${mirror*(ex-tx)},${direction*(ey-ty)}`); }
    for (const piece of board.board().flat().filter(Boolean)) {
      const [px,py]=xy(piece.square), role=piece.color===board.turn()?'self':'opponent';
      values.push(`around-target:${move.piece}:${role}:${piece.type}:${mirror*(px-tx)},${direction*(py-ty)}`);
      values.push(`around-origin:${action}:${role}:${piece.type}:${mirror*(px-fx)},${direction*(py-fy)}`);
    }
    return values.sort();
  };
  let tokens = inventory(1); const reflected = castling === '-' ? inventory(-1) : null;
  if (reflected && JSON.stringify(reflected)<JSON.stringify(tokens)) tokens=reflected;
  if (variant.conjoin) { const action=tokens.find(t=>t.startsWith('action:')); tokens=tokens.map(token=>`joint:${JSON.stringify([action,token])}`).sort(); }
  const bucket = (token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
  const selected=[], assignments=[];
  for (const group of variant.stratify ? ['PAM02','PPL103'] : ['pooled']) {
    const eligible = group === 'pooled' ? pool : [...new Set(mapping.groups.filter(g=>g.danType===group).flatMap(g=>g.kc))].sort((a,b)=>a-b);
    const assigned=tokens.map(token=>({...((variant.conjoin || variant.stratify)?{group}:{}),token,index:eligible[bucket(group==='pooled'?token:`${group}:${token}`,eligible.length)]}));
    assignments.push(...assigned);
    const cells=[...new Set(assigned.map(a=>a.index))];
    cells.sort((a,b)=>bucket(`budget:${a}`,2**32)-bucket(`budget:${b}`,2**32)||a-b);
    selected.push(...cells.filter(cell=>!selected.includes(cell)).slice(0,variant.stratify?7:14));
  }
  selected.sort((a,b)=>a-b); assert.equal(selected.length,14);
  return {tokens,assignments,stimulation:selected.map(index => ({ index, current: Math.min(p.encoder.maxCellCurrent, p.encoder.totalCurrent / selected.length) }))};
}

let certificates = 0, updates = 0;
function proof(row, move, value) {
  if (value.status === 'unknown') { assert.equal(value.reward, null); return; }
  const b = new Chess(row.fen); if (row.pgn !== undefined) b.loadPgn(row.pgn);
  const actor = b.turn(); b.move({ from: move.slice(0, 2), to: move.slice(2, 4),
    ...(move.length === 5 ? { promotion: move[4] } : {}) });
  const check = checkMateCertificate(value.certificate, b, { attacker: actor, plies: row.plies - 1, maxNodes: 100000 });
  assert.equal(check.verified, true, check.reason); assert.equal(check.status, value.status); certificates++;
}
for (let c = 0; c < p.conditions.length; c++) {
  let offset = 0, previousMemory = null;
  for (let i = 0; i < r.identity.puzzleCount; i++) {
    const a = r.results[c * r.identity.puzzleCount + i], plan = plans[i];
    assert.equal(a.condition, p.conditions[c]); assert.deepEqual(a.planRef, r.sharedPlans[i]);
    assert.equal(a.fixedStatePreserved, true); assert.equal(a.receiptRefs.length, plan.experiences.length);
    assert.equal(a.before.memoryFingerprint, hash(JSON.stringify(a.beforeMemory)));
    assert.equal(a.after.memoryFingerprint, hash(JSON.stringify(a.afterMemory)));
    assert.deepEqual(a.repeat, a.after); assert.deepEqual(a.reset, a.before); assert.deepEqual(a.restored, a.after);
    if (previousMemory) assert.deepEqual(a.beforeMemory, previousMemory);
    else assert.ok(a.beforeMemory.events === 0 && a.beforeMemory.gains.every(g => g === 1));
    for (const key of ['before', 'after']) {
      const assessment = a[key], ranked = [...assessment.rows].sort((x, y) => y.score - x.score);
      const legalBoard = new Chess(a.row.fen); if (a.row.pgn !== undefined) legalBoard.loadPgn(a.row.pgn);
      assert.deepEqual(assessment.rows.map(v => v.move).sort(), legalBoard.moves({ verbose: true })
        .map(v => v.from + v.to + (v.promotion ?? '')).sort());
      assert.equal(assessment.choice, ranked[0].move);
      for (const row of assessment.rows) assert.equal(row.score, row.MBON12 - row.MBON01);
      proof(a.row, assessment.choice, a[key + 'ChoiceProof']);
      const search = a[key + 'Search'], move = search.move.from + search.move.to + (search.move.promotion ?? '');
      assert.equal(search.seed, p.seed + i); assert.ok(search.evaluations <= p.search.maxEvaluations);
      assert.ok(search.nodes <= p.search.maxNodes); assert.ok(search.simulations <= p.search.simulations);
      proof(a.row, move, a[key + 'SearchProof']);
    }
    let memory = a.beforeMemory;
    for (let j = 0; j < a.receiptRefs.length; j++) {
      const t = readRef(a.receiptRefs[j]), experience = plan.experiences[j];
      assert.deepEqual(t.before, memory); assert.deepEqual(t.context, experience.context);
      for (const key of ['move', 'actor', 'status', 'learningAllowed', 'experimentalPulse', 'certificateSha256'])
        assert.deepEqual(t.event[key], experience[key]);
      assert.equal(experience.learningAllowed, true); assert.notEqual(experience.status, 'unknown');
      assert.equal(t.event.certificateSha256, experience.certificateSha256);
      assert.equal(hash(JSON.stringify(experience.proof.certificate)), experience.certificateSha256);
      proof(a.row, experience.move, experience.proof);
      let expectedChannel = experience.status === 'success' ? 'PAM02' : 'PPL103';
      if (a.condition === 'absent' || (a.condition === 'punishment-only' && expectedChannel === 'PAM02')) expectedChannel = null;
      if (a.condition === 'shuffled') expectedChannel = shuffled[offset + j];
      assert.equal(t.event.channel, expectedChannel); assert.equal(t.event.delivered, expectedChannel !== null);
      assert.equal(t.appliedToNeurons, true);
      const cells = expectedChannel === null ? [] : mapping.groups.filter(g => g.danType === expectedChannel).flatMap(g => g.dan);
      assert.deepEqual(t.presentation.reinforcementCells, cells);
      assert.deepEqual(t.presentation.stimulation, [...t.cue.stimulation, ...cells.map(c => ({ index: c.index, current: p.current }))]);
      assert.equal(t.presentation.channel, expectedChannel); assert.equal(t.presentation.reinforcementCurrent, p.current);
      assert.equal(t.cue.identity, r.identity.encoderIdentity);
      assert.equal(t.cue.move, experience.move); assert.equal(t.cue.actor, experience.actor);
      const cueBoard = new Chess(); cueBoard.loadPgn(t.context.pgn);
      const expectedCue = projectedCue(cueBoard, p.encoder.seed, experience.move, t.context.task);
      assert.deepEqual(t.cue.tokens, expectedCue.tokens);
      assert.deepEqual(t.cue.assignments, expectedCue.assignments);
      assert.deepEqual(t.cue.stimulation, expectedCue.stimulation);
      assert.equal(t.cue.accounting.totalCurrent, 21);
      const enabled = a.condition !== 'disabled'; assert.equal(t.plasticityEnabled, enabled);
      assert.equal(t.after.identity, t.before.identity); assert.equal(t.update.events, t.after.events);
      if (!enabled) assert.deepEqual(t.before, t.after);
      else {
        assert.equal(t.after.events, t.before.events + 1);
        assert.equal(t.local.factors.length, mapping.groups.length);
        assert.equal(t.local.kc.length, mapping.groups.reduce((n, g) => n + g.edges.length, 0));
        assert.deepEqual(t.local.factors, t.update.factors);
        assert.ok(t.local.kc.every(k => Number.isFinite(k) && k >= 0));
        let k = 0, changed = 0;
        for (let g = 0; g < mapping.groups.length; g++) {
          const rates = t.local.dan[g]; assert.equal(rates.length, mapping.groups[g].dan.length);
          assert.ok(rates.every(v => Number.isFinite(v) && v >= 0));
          const D = t.local.factors[g]; assert.ok(Number.isFinite(D) && D <= 0 && -p.memory.eta * D <= 1);
          assert.ok(D === -rates.reduce((sum, v) => sum + v, 0) / rates.length);
          for (let n = 0; n < mapping.groups[g].edges.length; n++, k++) {
            const before = t.before.gains[k], expected = Math.max(p.memory.minGain, Math.min(p.memory.maxGain,
              before + p.memory.eta * D * (t.local.kc[k] + before - 1)));
            assert.equal(t.after.gains[k], expected); if (expected !== before) changed++;
          }
        }
        assert.equal(t.update.changedEdges, changed); assert.equal(t.learningApplied, changed > 0); updates++;
      }
      memory = t.after;
    }
    assert.deepEqual(a.afterMemory, memory); previousMemory = memory; offset += a.receiptRefs.length;
  }
}
const informative = r.results.filter(v => v.condition === 'informative');
const repaired = informative.filter(v => v.beforeChoiceProof.status === 'failure' && v.afterChoiceProof.status === 'success');
const gates = {
  usefulChoices: informative.length === r.identity.puzzleCount && informative.every(v => v.afterChoiceProof.status === 'success'),
  repairAboveAbsentDisabled: repaired.some(v => ['absent', 'disabled'].every(c =>
    r.results.find(other => other.row.id === v.row.id && other.condition === c).afterChoiceProof.status === 'failure')),
  persistenceAndCausalReset: r.results.every(v => hash(JSON.stringify(v.repeat)) === hash(JSON.stringify(v.after))
    && hash(JSON.stringify(v.reset)) === hash(JSON.stringify(v.before)) && hash(JSON.stringify(v.restored)) === hash(JSON.stringify(v.after))),
  fixedState: r.results.every(v => v.fixedStatePreserved),
};
assert.deepEqual(r.summary.gates, gates); assert.equal(r.summary.allPilotChoiceGatesPassed, Object.values(gates).every(Boolean));
assert.equal(r.totalEvents, r.results.reduce((sum, v) => sum + v.receiptRefs.length, 0));
let prefixExact = null;
if (args.prefix) {
  // Paths and measured elapsed times differ across invocations. All memory,
  // receipts, hashes, cursors and presentation/event counters must agree.
  const strip = value => Array.isArray(value) ? value.map(strip) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !['path', 'elapsedMs', 'checkpoint'].includes(key))
      .map(([key, child]) => [key, strip(child)])) : value;
  const fingerprint = state => hash(JSON.stringify(strip(state)));
  const checkpoints = directory => readdirSync(directory).filter(name => /^checkpoint-\d{5}$/.test(name)).sort();
  const targets = checkpoints(args.prefix).map(name => ({
    hash: fingerprint(JSON.parse(readFileSync(join(args.prefix, name, 'state.json')))), matched: false }));
  assert.ok(targets.length >= 2, 'Resume comparison requires pending and acknowledged checkpoints');
  for (const directory of [args.origin, args.run].filter(Boolean)) {
    for (const name of checkpoints(directory)) {
      const state = JSON.parse(readFileSync(join(directory, name, 'state.json')));
      assert.deepEqual(state.identity, r.identity);
      const sha = fingerprint(state);
      for (const target of targets) target.matched ||= target.hash === sha;
      if (targets.every(target => target.matched)) break;
    }
    if (targets.every(target => target.matched)) break;
  }
  prefixExact = targets.every(target => target.matched);
  assert.equal(prefixExact, true, 'Resumed scientific state differs from original checkpoints');
}
const audit = { passed: true, reportSha256: hash(reportBytes), certificatesChecked: certificates,
  updatesChecked: updates, gates, shuffleDifferent: JSON.stringify(flags) !== JSON.stringify(shuffled),
  prefixExact,
  scope: 'Receipt/recurrence/proof audit; optional exact checkpoint comparison excludes paths, elapsedMs and publication number. Search traces, biological validity and transfer require separate verification' };
writeFileSync(args.out ?? join(args.run, 'audit.json'), JSON.stringify(audit, null, 2), { flag: 'wx' }); console.log(JSON.stringify(audit));

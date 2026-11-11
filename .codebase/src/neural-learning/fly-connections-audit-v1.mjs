// Fly connections memory v1: independent audit arithmetic and run-file readers. Auditor-owned; reads files only, never a graph.
// Producer import allowed by the audit contract: fly-connections-packet-v1 (replay, verify, tape). The bootstrap is written here, not imported.
// Not imported: fly-connections-metrics-v1, fly-connections-judge-v1, fly-connections-job-v1. Their rules are re-implemented here.
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';
import { BOARD_SCHEMA, GROUPS, PACKET_SCHEMA, buildExperienceTape, replayPacketBoard, verifyPacketBoard } from './fly-connections-packet-v1.mjs';

const RESULT_SCHEMA = 'fly-connections-job-result-v1';
const RECEIPT_SCHEMA = 'fly-connections-condition-receipt-v1';
const SUMMARY_SCHEMA = 'fly-connections-memory-v1-summary';
export const AUDIT_SCHEMA = 'fly-connections-memory-v1-audit';
export const CHECK_NAMES = Object.freeze(['pins', 'packet', 'jobs', 'events', 'updates', 'fingerprints', 'rankings', 'gates', 'resources', 'replay']);
// Constants from the gates file (sections 4 and 6). gatesMatch checks that the registration repeats them.
export const GATE = Object.freeze({ success: 0.75, retention: 0.7, epsilon: 1e-6, pressure: 0.01, pressureShare: 0.25,
  bootstrapSeed: 20261109, resamples: 10000, lowerQuantile: 0.025, rssMiB: 2048, freeMiB: 256 });
// Gain rule (Gkanias et al. as implemented by ReversalMemory) and the scheduled PAM07 current.
const RULE = Object.freeze({ eta: 0.5, dt: 1, minGain: 0.2, maxGain: 1.8, activityScale: 1.5, pulseCurrent: 0.75 });
const TIE_ABS = 1e-9;
const TIE_REL = 1e-7;
const LIST_CAP = 8;
const CATEGORIES = Object.freeze(['events', 'updates', 'mask', 'fingerprints', 'rankings']);
// Arm table: pulse rule, APL mode and whether the arm learns. Checked against each job's describe() output.
export const ARM_TABLE = Object.freeze({
  'informative-local': { apl: 'local', pulse: 'experience', learns: true },
  'absent-local': { apl: 'local', pulse: 'absent', learns: true },
  'off-local': { apl: 'local', pulse: 'experience', learns: false },
  'shuffled-local': { apl: 'local', pulse: 'delivered', learns: true },
  'informative-matched': { apl: 'matched', pulse: 'experience', learns: true },
  'informative-global': { apl: 'global', pulse: 'experience', learns: true },
});
// Probe-set table (file formats doc). Each label ranks these groups; boards within a group in boardId order.
export const PROBE_GROUPS = Object.freeze({
  T0: ['A', 'B', 'R', 'testA', 'testB'], 'A-8': ['A'], 'A-16': ['A'], 'A-end': ['A', 'R'], 'R1-end': ['A', 'B', 'R'],
  'B-8': ['A', 'B'], 'B-16': ['A', 'B'], 'B-end': ['A', 'B', 'R', 'testA', 'testB'], 'R2-end': ['A', 'B', 'R', 'testA', 'testB'],
});

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const uciOf = m => m.from + m.to + (m.promotion ?? '');
export const sha256Text = text => createHash('sha256').update(text).digest('hex');
export async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
// Deep equality on JSON-like values, leaves by Object.is (so -0 and 0 differ, NaN equals NaN).
export function sameValue(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && sameValue(a[k], b[k]));
}
const boardKey = fen => fen.split(' ').slice(0, 4).join(' ');

// Legal moves of a board, from its replayed history (own generator call, sorted UCI, every legal move once).
export function legalOf(record) {
  return replayPacketBoard(record).moves({ verbose: true }).map(uciOf).sort(byText);
}
// Outcome map used for a phase: chess records have one map; R records have R1 (target 0) and R2 (target 1) maps.
export function outcomeSetOf(record, phase) {
  if (record.group !== 'R') return record.outcomes;
  if (phase !== 'R1' && phase !== 'R2') throw Error(`R outcomes need phase R1 or R2, got ${phase}`);
  const set = record.outcomes?.[phase];
  if (!set) throw Error(`${record.boardId} has no ${phase} outcomes`);
  return set;
}

// Own s, c, success, margin and tie tolerance from the scores. Tie rule: abs(top - score) <= 1e-9 + 1e-7 * max(abs(scores)).
export function metricsOf(ranked, outcomes) {
  const scores = ranked.map(e => e.score);
  const top = Math.max(...scores);
  const tolerance = TIE_ABS + TIE_REL * Math.max(...scores.map(x => Math.abs(x)));
  const tops = ranked.filter(e => Math.abs(top - e.score) <= tolerance);
  const ok = e => outcomes[e.move] === true;
  const s = tops.filter(ok).length;
  const c = tops.length;
  const okScores = ranked.filter(ok).map(e => e.score);
  const badScores = ranked.filter(e => !ok(e)).map(e => e.score);
  const margin = okScores.length && badScores.length ? Math.max(...okScores) - Math.max(...badScores) : null;
  return { s, c, success: s / c, margin, tolerance, topMoves: tops.map(e => e.move) };
}

// Shape and stored-value problems of one ranking (empty array = clean).
export function rankingProblems(ranking, record, legal, outcomes) {
  if (!ranking || typeof ranking !== 'object') return ['ranking missing'];
  const out = [];
  if (ranking.boardId !== record.boardId || ranking.gameId !== record.gameId) out.push('boardId or gameId differs');
  const ranked = ranking.ranked;
  if (!Array.isArray(ranked)) return [...out, 'ranked is not a list'];
  if (ranked.length !== legal.length) out.push(`${ranked.length} scored moves for ${legal.length} legal moves`);
  else {
    const at = ranked.findIndex((e, i) => e?.move !== legal[i]);
    if (at >= 0) out.push(`entry ${at} is ${ranked[at]?.move}, expected ${legal[at]} (sorted UCI, each legal move once)`);
  }
  if (ranked.some(e => !Number.isFinite(e?.score))) out.push('a score is not finite');
  if (ranked.some(e => !Array.isArray(e?.mbon) || e.mbon.length !== 2 || !e.mbon.every(x => Number.isFinite(x)))) out.push('an mbon pair is not two finite rates');
  if (ranking.passes !== legal.length) out.push(`passes ${ranking.passes}, expected ${legal.length}`);
  if (out.length) return out;
  const mine = metricsOf(ranked, outcomes);
  for (const k of ['s', 'c', 'success', 'margin', 'tolerance']) {
    if (!Object.is(ranking[k], mine[k])) out.push(`${k} stored ${ranking[k]}, recomputed ${mine[k]}`);
  }
  const tops = Array.isArray(ranking.topMoves) ? ranking.topMoves.map(t => t?.move) : null;
  if (!sameValue(tops, mine.topMoves)) out.push('topMoves differ from the recomputed top set');
  let best = ranked[0];
  for (const e of ranked) if (e.score > best.score) best = e;
  if (ranking.choice !== best.move) out.push(`choice ${ranking.choice}, recomputed ${best.move}`);
  return out;
}

// Expected line sequence of one job: T0 probe, then each event followed by the probes due at that cursor (tape order).
export function expectedItems(tape, byGroup) {
  const rank = (label, cursor) => {
    const groups = PROBE_GROUPS[label];
    if (!groups) throw Error(`unknown probe label ${label}`);
    const out = [];
    for (const g of GROUPS) {
      if (!groups.includes(g)) continue;
      const list = [...byGroup[g]].sort((a, b) => byText(a.boardId, b.boardId));
      for (const r of list) out.push({ kind: 'ranking', label, cursor, group: g, boardId: r.boardId, last: false, text: `ranking ${label} ${r.boardId}` });
    }
    if (out.length) out[out.length - 1].last = true;
    return out;
  };
  const items = rank(tape.initialProbe.phase, 0);
  for (const p of tape.probeAfter) {
    if (!Number.isSafeInteger(p.cursor) || p.cursor < 1 || p.cursor > tape.events.length) throw Error(`probe ${p.phase} at cursor ${p.cursor} is outside the tape`);
  }
  for (let i = 0; i < tape.events.length; i++) {
    items.push({ kind: 'event', sequence: i, text: `event ${i}` });
    for (const p of tape.probeAfter) if (p.cursor === i + 1) items.push(...rank(p.phase, p.cursor));
  }
  return items;
}

class Problems {
  constructor() {
    this.counts = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
    this.lists = Object.fromEntries(CATEGORIES.map(c => [c, []]));
  }
  add(category, text) {
    this.counts[category]++;
    if (this.lists[category].length < LIST_CAP) this.lists[category].push(text);
  }
}
const lineText = line => (line?.type === 'event' ? `event line ${line.cursor}` : `${line?.type} ${line?.label} ${line?.boardId} (cursor ${line?.cursor})`);

// One pass over a job's records.jsonl. Recomputes every event, update, fingerprint and ranking; keeps only the digest the gates need.
class JobWalk {
  constructor({ arm, tape, byGroup, boardsById, result, readSnapshot, legalCache, shared }) {
    if (!ARM_TABLE[arm]) throw Error(`unknown arm ${arm}`);
    this.arm = arm; this.rule = ARM_TABLE[arm]; this.tape = tape; this.boardsById = boardsById; this.result = result;
    this.readSnapshot = readSnapshot; this.legalCache = legalCache; this.shared = shared;
    this.groups = result.describe?.groups ?? [];
    this.danTotal = this.groups.reduce((s, g) => s + g.danCount, 0);
    this.items = expectedItems(tape, byGroup);
    this.lastBIndex = tape.events.reduce((last, e, i) => (e.phase === 'B' ? i : last), -1);
    this.P = new Problems();
    this.pos = 0; this.lastFp = null; this.t0Fp = null; this.gains = null; this.n = 0;
    this.learned = 0; this.eventsSeen = 0; this.passes = 0;
    this.labels = new Map(); this.dSum = { pulse: [0, 0], none: [0, 0] };
    this.base = new Map(); this.edgeOf = new Map(); this.offsetOf = new Map();
    this.pressure = { written: new Set(), pressureEdges: new Set(), finalMagnitude: new Map() };
  }

  async run(lines) {
    for await (const line of lines) {
      let consumed = false;
      while (!consumed) {
        if (this.pos >= this.items.length) {
          this.P.add(line?.type === 'event' ? 'events' : 'rankings', `extra line after the last expected line: ${lineText(line)}`);
          break;
        }
        const item = this.items[this.pos];
        if (this.matches(line, item)) { await this.accept(line, item); this.pos++; consumed = true; }
        else {
          this.P.add(item.kind === 'event' ? 'events' : 'rankings', `expected ${item.text}, found ${lineText(line)}`);
          this.pos++;
        }
      }
    }
    while (this.pos < this.items.length) {
      const item = this.items[this.pos++];
      this.P.add(item.kind === 'event' ? 'events' : 'rankings', `missing ${item.text}`);
    }
    if (this.eventsSeen !== this.tape.events.length) this.P.add('events', `${this.eventsSeen} event lines, tape has ${this.tape.events.length}`);
    // Pass accounting belongs to the event lines: a missing line removes its passes as well as its sequence number.
    if (this.passes !== this.result.passes) this.P.add('events', `result passes ${this.result.passes}, recounted from the lines ${this.passes}`);
    return this.digest();
  }

  digest() {
    return { labels: this.labels, dSum: this.dSum, pressure: this.pressure, base: this.base, n: this.n, passes: this.passes,
      counts: this.P.counts, lists: this.P.lists, learned: this.learned, eventsSeen: this.eventsSeen };
  }

  matches(line, item) {
    if (item.kind === 'event') return line.type === 'event' && line.cursor === item.sequence && line.receipt?.sequence === item.sequence;
    if (line.label !== item.label || line.cursor !== item.cursor || line.boardId !== item.boardId || line.group !== item.group) return false;
    if (line.type === 'ranking') return true;
    // Off arm only: an intermediate probe may reuse the T0 ranking while the fingerprint equals T0 (file formats doc).
    return false; // gates section 3 (code review r1): every arm ranks at every checkpoint, so a 'ranking-reused' line is never valid
  }

  async accept(line, item) {
    if (item.kind === 'event') return this.acceptEvent(line, item);
    return this.acceptRanking(line, item);
  }

  legal(record) {
    if (!this.legalCache.has(record.boardId)) this.legalCache.set(record.boardId, legalOf(record));
    return this.legalCache.get(record.boardId);
  }

  setEntry(item, entry) {
    if (!this.labels.has(item.label)) this.labels.set(item.label, new Map());
    this.labels.get(item.label).set(item.boardId, entry);
  }

  // Digest entry for one ranking: metrics on the phase's outcomes, plus the R2 (target 1) metrics for R boards.
  rankingEntry(ranking, record, legal, phase) {
    const outcomes = outcomeSetOf(record, phase);
    const probs = rankingProblems(ranking, record, legal, outcomes);
    for (const p of probs) this.P.add('rankings', `${record.boardId} ${phase}: ${p}`);
    if (!Array.isArray(ranking?.ranked)) return null;
    try {
      const entry = { group: record.group, m0: metricsOf(ranking.ranked, outcomes) };
      if (record.group === 'R') entry.m1 = metricsOf(ranking.ranked, outcomeSetOf(record, 'R2'));
      return entry;
    } catch (e) {
      this.P.add('rankings', `${record.boardId} ${phase}: metrics unavailable (${e.message})`);
      return null;
    }
  }

  async acceptRanking(line, item) {
    const record = this.boardsById.get(item.boardId);
    if (!record) throw Error(`no board ${item.boardId}`);
    if (line.type === 'ranking-reused') {
      if (line.from !== 'T0') this.P.add('rankings', `${item.text}: reused from ${line.from}, expected T0`);
      if (line.fingerprint !== this.t0Fp || line.fingerprint !== this.lastFp) this.P.add('fingerprints', `${item.text}: reused ranking fingerprint is not the T0 state`);
      const entry = this.labels.get('T0')?.get(item.boardId);
      if (!entry) this.P.add('rankings', `${item.text}: no T0 ranking to reuse`);
      else this.setEntry(item, entry);
    } else {
      if (this.t0Fp === null) { this.t0Fp = line.fingerprint; this.lastFp = line.fingerprint; }
      if (line.fingerprint !== this.lastFp) this.P.add('fingerprints', `${item.text}: fingerprint differs from the state`);
      const phase = record.group === 'R' ? 'R1' : 'chess';
      if (line.phase !== phase) this.P.add('rankings', `${item.text}: phase ${line.phase}, expected ${phase}`);
      const entry = this.rankingEntry(line.ranking, record, this.legal(record), phase);
      if (entry) this.setEntry(item, entry);
      if (Number.isFinite(line.ranking?.passes)) this.passes += line.ranking.passes;
    }
    if (item.last) await this.finishLabel(item.label);
  }

  // Label end: the stored fingerprint and the snapshot must equal the recomputed state. T0 fixes the mask size.
  async finishLabel(label) {
    if (this.result.fingerprints?.[label] !== this.lastFp) this.P.add('fingerprints', `${label}: result fingerprint differs from the state`);
    let snap;
    try { snap = await this.readSnapshot(label); }
    catch (e) { this.P.add('updates', `${label}: snapshot unreadable (${e.message})`); return; }
    const gains = snap?.memory?.gains;
    if (!Array.isArray(gains)) { this.P.add('updates', `${label}: snapshot has no gains`); return; }
    if (label === 'T0') { this.n = gains.length; this.gains = new Float64Array(gains.length).fill(1); }
    if (this.gains === null) { this.P.add('updates', `${label}: no T0 mask`); return; }
    if (gains.length !== this.gains.length || gains.some((x, i) => !Object.is(x, this.gains[i]))) {
      this.P.add('updates', `${label}: snapshot gains differ from the recomputed gains`);
    }
    if (snap.memory?.events !== this.learned) this.P.add('updates', `${label}: snapshot counts ${snap.memory?.events} updates, recomputed ${this.learned}`);
  }

  async acceptEvent(line, item) {
    const P = this.P, r = line.receipt, seq = item.sequence, ev = this.tape.events[seq];
    const record = this.boardsById.get(ev.boardId);
    if (!r || typeof r !== 'object' || !record) { P.add('events', `event ${seq}: receipt or record missing`); return; }
    const delivered = this.rule.pulse === 'experience' ? ev.pulse : this.rule.pulse === 'absent' ? false : this.tape.shuffledPulses[seq];
    const outcomes = outcomeSetOf(record, ev.phase);
    const tests = [
      ['schema', r.schema === RECEIPT_SCHEMA], ['arm', r.arm === this.arm], ['sequence', r.sequence === ev.sequence],
      ['eventId', r.eventId === ev.eventId], ['phase', r.phase === ev.phase], ['boardId', r.boardId === ev.boardId],
      ['gameId', r.gameId === record.gameId], ['move', r.move === ev.move], ['proofSha', r.proofSha === ev.proofSha],
      ['criterion', r.criterion === record.criterion], ['pulse', r.pulse === ev.pulse],
      ['outcome', r.outcome === outcomes[ev.move] && r.outcome === ev.pulse], ['deliveredPulse', r.deliveredPulse === delivered],
      ['pulseCurrent', r.pulseCurrent === (delivered ? RULE.pulseCurrent : 0)],
    ];
    for (const [name, ok] of tests) if (ok !== true) P.add('events', `event ${seq}: ${name} differs from the tape or the sealed record`);
    const cells = r.pulseCells;
    if (!Array.isArray(cells) || cells.length !== this.danTotal) P.add('events', `event ${seq}: pulseCells has ${cells?.length} cells, describe has ${this.danTotal} DANs`);
    else if (this.shared.pulseCells === null) this.shared.pulseCells = cells.slice();
    else if (!sameValue(cells, this.shared.pulseCells)) P.add('events', `event ${seq}: pulseCells differ from the first event of the first job`);
    const teach = r.teaching;
    if (!Array.isArray(teach) || teach.length !== this.groups.length) P.add('events', `event ${seq}: teaching has ${teach?.length} groups`);
    else {
      teach.forEach((g, gi) => {
        const want = this.groups[gi];
        if (g?.side !== want.side || !Array.isArray(g.dan) || g.dan.length !== want.danCount || !Array.isArray(g.kc) || g.kc.length !== want.kcCount) {
          P.add('events', `event ${seq}: teaching group ${gi} differs from describe`);
        }
      });
    }
    for (const p of rankingProblems(r.unaided, record, this.legal(record), outcomes)) P.add('rankings', `event ${seq} unaided: ${p}`);
    if (!r.unaided || r.passes !== r.unaided.passes + 1) P.add('events', `event ${seq}: passes is not unaided passes + 1`);
    if (Number.isFinite(r.passes)) this.passes += r.passes;
    if (!Object.is(r.fingerprintBefore, this.lastFp)) P.add('fingerprints', `event ${seq}: fingerprintBefore differs from the previous state`);
    if (this.rule.learns) this.learn(r, ev, seq);
    else this.holdOff(r, seq);
    this.lastFp = r.fingerprintAfter;
    this.eventsSeen++;
  }

  // Off arm: no update may happen and the fingerprint must stay at T0.
  holdOff(r, seq) {
    if (!r.update || r.update.observed !== false || r.update.events !== 0 || !Array.isArray(r.writes) || r.writes.length !== 0) {
      this.P.add('updates', `off arm event ${seq} changed memory`);
    }
    if (!Object.is(r.fingerprintAfter, this.t0Fp)) this.P.add('fingerprints', `off arm event ${seq}: fingerprint differs from T0`);
  }

  // Recomputes the Gkanias-style gain update from the receipt's actual rates, then checks every field and write against it.
  learn(r, ev, seq) {
    const groups = r.teaching;
    if (this.gains === null) { this.P.add('updates', `event ${seq}: no T0 mask`); return; }
    if (!Array.isArray(groups) || groups.length !== 2 || groups[0]?.side !== 'left' || groups[1]?.side !== 'right') {
      this.P.add('updates', `event ${seq}: teaching groups are not left then right`);
      return;
    }
    const changed = [], factors = [];
    let offset = 0;
    for (const g of groups) {
      const { dan, kc, k } = g;
      if (!Array.isArray(dan) || !Array.isArray(kc) || !Array.isArray(k) || dan.length === 0) { this.P.add('updates', `event ${seq} ${g.side}: rates missing`); return; }
      const D = -dan.reduce((sum, v) => sum + Math.max(0, v) / RULE.activityScale, 0) / dan.length;
      factors.push(D);
      if (!Object.is(g.factor, D)) this.P.add('updates', `event ${seq} ${g.side}: factor ${g.factor}, recomputed ${D}`);
      if (RULE.eta * RULE.dt * -D > 1) this.P.add('updates', `event ${seq} ${g.side}: Euler bound exceeded`);
      kc.forEach((rate, i) => {
        const kk = Math.max(0, rate) / RULE.activityScale;
        if (!Object.is(k[i], kk)) this.P.add('updates', `event ${seq} ${g.side} edge ${i}: k ${k[i]}, recomputed ${kk}`);
        const o = offset++;
        if (o >= this.gains.length) return; // the size check below reports it
        const before = this.gains[o];
        const after = Math.max(RULE.minGain, Math.min(RULE.maxGain, before + RULE.eta * RULE.dt * D * (kk + before - 1)));
        if (after !== before) changed.push({ offset: o, before, after });
        this.gains[o] = after;
      });
    }
    if (offset !== this.gains.length) this.P.add('updates', `event ${seq}: ${offset} teaching edges, mask has ${this.gains.length}`);
    this.learned++;
    const u = r.update;
    if (!u || u.observed !== true || u.changedEdges !== changed.length || u.events !== this.learned || !sameValue(u.factors, factors)) {
      this.P.add('updates', `event ${seq}: update fields differ from the recomputed update`);
    }
    const writes = Array.isArray(r.writes) ? r.writes : [];
    if (writes.length !== changed.length) this.P.add('updates', `event ${seq}: ${writes.length} writes, ${changed.length} edges changed by the recomputed update`);
    for (let j = 0; j < Math.min(writes.length, changed.length); j++) this.checkWrite(writes[j], changed[j], ev.phase, seq);
    if (ev.phase === 'A' || ev.phase === 'B') {
      const bucket = r.deliveredPulse === true ? this.dSum.pulse : this.dSum.none;
      bucket[0] += (factors[0] + factors[1]) / 2;
      bucket[1] += 1;
    }
  }

  // One receipt write against the recomputed change. Magnitudes must be base x gain in Float32 (the model stores magnitudes as Float32).
  checkWrite(w, c, phase, seq) {
    if (!w || typeof w !== 'object') { this.P.add('updates', `event ${seq}: write missing`); return; }
    const at = `event ${seq} write of edge ${w.edgeId}`;
    if (w.gainChanged !== true) this.P.add('updates', `${at}: gainChanged is not true`);
    if (!Object.is(w.beforeGain, c.before) || !Object.is(w.afterGain, c.after)) {
      this.P.add('updates', `${at}: gain ${w.beforeGain} -> ${w.afterGain}, recomputed ${c.before} -> ${c.after}`);
    }
    if (!Number.isSafeInteger(w.edgeId)) this.P.add('updates', `${at}: edgeId is not an integer`);
    else {
      const known = this.edgeOf.get(c.offset);
      if (known === undefined) {
        if (this.offsetOf.has(w.edgeId)) this.P.add('updates', `${at}: edge already written at another mask offset`);
        else { this.edgeOf.set(c.offset, w.edgeId); this.offsetOf.set(w.edgeId, c.offset); }
      } else if (known !== w.edgeId) this.P.add('updates', `${at}: mask offset ${c.offset} held edge ${known} earlier`);
    }
    let b = this.base.get(w.edgeId);
    if (b === undefined) {
      if (c.before !== 1) this.P.add('mask', `${at}: first write does not start from gain 1`);
      b = w.beforeMagnitude;
      this.base.set(w.edgeId, b);
    }
    if (!Object.is(w.beforeMagnitude, Math.fround(b * c.before))) this.P.add('mask', `${at}: beforeMagnitude is not base x gain`);
    if (!Object.is(w.afterMagnitude, Math.fround(b * c.after))) this.P.add('mask', `${at}: afterMagnitude is not base x gain`);
    const effective = w.beforeMagnitude !== w.afterMagnitude;
    if (w.effectiveChanged !== effective) this.P.add('mask', `${at}: effectiveChanged differs`);
    const rel = Math.abs(w.afterMagnitude - w.beforeMagnitude) / b;
    if (!Object.is(w.relativeEffectiveChange, rel)) this.P.add('mask', `${at}: relativeEffectiveChange differs`);
    const pressureWrite = effective && rel >= GATE.pressure;
    if (w.pressureWrite !== pressureWrite) this.P.add('mask', `${at}: pressureWrite differs`);
    if (effective && phase === 'A') this.pressure.written.add(w.edgeId);
    if (pressureWrite && phase === 'B') this.pressure.pressureEdges.add(w.edgeId);
    if (seq <= this.lastBIndex) this.pressure.finalMagnitude.set(w.edgeId, w.afterMagnitude);
  }
}

// ---- Gate arithmetic (auditor's own) -------------------------------------------------------------------------

// Gate P2.1 (judgeRetention rule): acquisition, retention ratio against the learned margin, group ratio, and B acquisition.
export function retentionGate({ a0, aAfterA, aAfterB, aFinal, bBefore, bAfter, bFinal, minAcquired,
  retention = GATE.retention, epsilon = GATE.epsilon, success = GATE.success }) {
  const need = (x, what) => { if (!Number.isFinite(x)) throw Error(`${what} is not a finite margin`); return x; };
  const acquired = (t, base) => {
    need(t.margin, 'post margin'); need(base.margin, 'base margin');
    return t.success >= success && t.margin > t.tolerance && t.margin - base.margin > epsilon;
  };
  const a = a0.map((naive, i) => {
    const t = aAfterA[i], m = aAfterB[i], f = aFinal[i];
    const learned = need(t.margin, 'A-end margin') - need(naive.margin, 'T0 margin');
    const acq = acquired(t, naive);
    const dB = need(m.margin, 'B-end margin') - naive.margin;
    const dF = need(f.margin, 'R2-end margin') - naive.margin;
    const rB = learned > epsilon ? dB / learned : null;
    const rF = learned > epsilon ? dF / learned : null;
    const retained = acq && m.success >= success && f.success >= success && rB !== null && rF !== null && rB >= retention && rF >= retention;
    return { id: naive.boardId, acq, retained, learned, dB, dF };
  });
  const learnedSum = a.reduce((s, x) => s + x.learned, 0);
  const groupB = learnedSum > 0 ? a.reduce((s, x) => s + x.dB, 0) / learnedSum : null;
  const groupF = learnedSum > 0 ? a.reduce((s, x) => s + x.dF, 0) / learnedSum : null;
  const groupPass = learnedSum > 0 && groupB >= retention && groupF >= retention;
  const aAcq = a.filter(x => x.acq).length;
  const aLost = a.filter(x => x.acq && !x.retained).map(x => x.id);
  const aPass = aAcq >= minAcquired && aLost.length === 0 && groupPass;

  const b = bBefore.map((before, i) => {
    const t = bAfter[i], f = bFinal[i];
    const acq = acquired(t, before);
    return { id: before.boardId, acq, retained: acq && f.success >= success };
  });
  const bAcq = b.filter(x => x.acq).length;
  const bLost = b.filter(x => x.acq && !x.retained).map(x => x.id);
  const bPass = bAcq >= minAcquired && bLost.length === 0;
  const fmt = x => (x === null ? 'n/a' : x.toFixed(3));
  return { pass: aPass && bPass,
    detail: `A acquired ${aAcq} (min ${minAcquired}), lost [${aLost.join(' ')}], group ratio ${fmt(groupB)} / ${fmt(groupF)}; `
      + `B acquired ${bAcq} (min ${minAcquired}), lost [${bLost.join(' ')}]` };
}

// Gate P2.3 (summarizePressure rule): B pressure on A-written edges, and the mask moved by at least 1% by T_AB. Integer form of the 25% shares.
export function pressureGate({ written, pressureEdges, base, finalMagnitude, maskSize }) {
  if (written.size === 0) return { pass: false, detail: 'no A-written edges: P2 untested' };
  const shared = [...written].filter(e => pressureEdges.has(e)).length;
  let meaningful = 0;
  for (const [e, b] of base) {
    const f = finalMagnitude.get(e) ?? b;
    if (Math.abs(f - b) / b >= GATE.pressure) meaningful++;
  }
  const sharePass = shared * 4 >= written.size;
  const maskPass = meaningful * 4 >= maskSize;
  return { pass: sharePass && maskPass,
    detail: `B pressure on ${shared}/${written.size} A-written edges (need 25%); ${meaningful}/${maskSize} mask edges moved by at least 1% (need 25%)` };
}

// Standard Mulberry32 (32-bit state, output in [0, 1)). Written here: the bootstrap must not share producer code.
export function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Game-clustered paired bootstrap. Boards are grouped by gameId in first-appearance order (G groups). For comparator k, each
// resample draws G groups with replacement from mulberry32(seed ^ k) and sums P - C over their boards. lower is the
// lowerQuantile of the sorted sums; margin is sum(P) - sum(C). Passes when every comparator's lower bound is above 0.
export function pairGate(arms, games, primary, comparators, seed) {
  const P = arms[primary];
  if (!Array.isArray(P) || P.length !== games.length) throw Error(`${primary}: values do not align with ${games.length} games`);
  const clusters = new Map();
  games.forEach((g, i) => { if (!clusters.has(g)) clusters.set(g, []); clusters.get(g).push(i); });
  const groups = [...clusters.values()], G = groups.length;
  if (G === 0) throw Error('no games to resample');
  const lower = {}, margin = {};
  comparators.forEach((name, k) => {
    const C = arms[name];
    if (!Array.isArray(C) || C.length !== P.length) throw Error(`${name}: values do not align with ${P.length} boards`);
    const rng = mulberry32(seed ^ k);
    const sums = new Float64Array(GATE.resamples);
    for (let r = 0; r < GATE.resamples; r++) {
      let sum = 0;
      for (let d = 0; d < G; d++) for (const i of groups[Math.floor(rng() * G)]) sum += P[i] - C[i];
      sums[r] = sum;
    }
    sums.sort();
    lower[name] = sums[Math.floor(GATE.lowerQuantile * GATE.resamples)];
    margin[name] = P.reduce((s, x) => s + x, 0) - C.reduce((s, x) => s + x, 0);
  });
  return { pass: comparators.every(c => lower[c] > 0), lower, margin,
    detail: `${primary} vs ${comparators.map(c => `${c} lower ${lower[c].toFixed(4)} (margin ${margin[c].toFixed(4)})`).join(', ')}` };
}

// Gate P2.2b (gates file 2b, own baseline): A success at T_AB beats A at T0, and B success at T_AB beats B at R1-end,
// each paired by game with a lower bound above 0.
export function ownBaselineGate({ aGames, aEnd, aT0, bGames, bEnd, bR1 }) {
  const a = pairGate({ end: aEnd, t0: aT0 }, aGames, 'end', ['t0'], GATE.bootstrapSeed);
  const b = pairGate({ end: bEnd, r1: bR1 }, bGames, 'end', ['r1'], GATE.bootstrapSeed);
  return { pass: a.pass && b.pass, detail: `A at B-end vs A at T0: lower ${a.lower.t0.toFixed(4)}; B at B-end vs B at R1-end: lower ${b.lower.r1.toFixed(4)}` };
}

// Gate P1.4 (static part only): no import in the scoring path may name an engineered store, episodic memory, ledger or nearest-neighbour module.
export function staticImportCheck(sourceTexts) {
  const forbidden = /kc-episodic|engineered|memory-v\d|memory-assay|episodic|ledger|nearest/i;
  const found = [];
  for (const [name, text] of Object.entries(sourceTexts)) {
    for (const m of text.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) if (forbidden.test(m[1])) found.push(`${name} imports ${m[1]}`);
  }
  const count = Object.keys(sourceTexts).length;
  const pass = count > 0 && found.length === 0;
  return { pass, detail: pass ? `${count} scoring-path sources: no engineered, episodic or ledger import (static import check only; code review still required)`
    : (found.join('; ') || 'no sources supplied') };
}

// Check 10 plan. Each tape phase starts from the state its probe label names: A from a fresh condition (T0), R1 from A-end,
// B from R1-end, R2 from B-end. The prefix is the first n events of the phase, extended to the first event of each pulse kind
// (delivered, no-pulse) that the prefix lacks. A kind with no event in the phase (e.g. no delivered pulse in the absent arm) is listed.
const REPLAY_PHASES = Object.freeze([['A', 'T0'], ['R1', 'A-end'], ['B', 'R1-end'], ['R2', 'B-end']]);
export function replayPlan(tape, arm, n) {
  const rule = ARM_TABLE[arm];
  if (!rule) throw Error(`unknown arm ${arm}`);
  const probes = [tape.initialProbe, ...tape.probeAfter];
  const delivered = i => (rule.pulse === 'experience' ? tape.events[i].pulse : rule.pulse === 'absent' ? false : tape.shuffledPulses[i]);
  return REPLAY_PHASES.map(([phase, start]) => {
    const idx = tape.events.flatMap((ev, i) => (ev.phase === phase ? [i] : []));
    if (idx.length === 0) throw Error(`phase ${phase} has no events`);
    const from = idx[0];
    if (idx[idx.length - 1] - from + 1 !== idx.length) throw Error(`phase ${phase} events are not contiguous`);
    if (!probes.some(p => p.phase === start && p.cursor === from)) throw Error(`phase ${phase} does not start at the ${start} probe`);
    let count = Math.min(n, idx.length);
    const uncovered = [];
    for (const kind of [true, false]) {
      if (idx.slice(0, count).some(i => delivered(i) === kind)) continue;
      const first = idx.findIndex(i => delivered(i) === kind);
      if (first < 0) uncovered.push(kind ? 'delivered' : 'no-pulse');
      else count = Math.max(count, first + 1);
    }
    return { phase, start, from, count, uncovered };
  });
}

// Registration gate constants must equal the gates file; minAcquired is run-specific (24 full, 6 dry).
export function gatesMatch(gates) {
  const want = { success: GATE.success, retention: GATE.retention, epsilon: GATE.epsilon, pressure: GATE.pressure,
    pressureShare: GATE.pressureShare, bootstrapSeed: GATE.bootstrapSeed };
  const bad = Object.entries(want).filter(([k, v]) => gates?.[k] !== v).map(([k]) => k);
  if (!Number.isSafeInteger(gates?.minAcquired) || gates.minAcquired < 1) bad.push('minAcquired');
  return { pass: bad.length === 0, detail: bad.length ? `registration gates differ from the gates file: ${bad.join(', ')}` : 'registration gate constants equal the gates file' };
}

// ---- Per-seed gate verdicts -------------------------------------------------------------------------------

// Section 4 gates for every seed, recomputed from the walked jobs. Judge-shaped output: { perSeed, pass, verdict }.
export function gateVerdicts({ seeds, jobs, boardsById, byGroup, fairBySeed, registration, sourceP14 }) {
  const minAcquired = registration.gates?.minAcquired;
  const sorted = ids => [...ids].sort(byText);
  const idsOf = groups => sorted(groups.flatMap(g => byGroup[g].map(r => r.boardId)));
  const A = idsOf(['A']), B = idsOf(['B']), R = idsOf(['R']), TEST = idsOf(['testA', 'testB']), AB = sorted([...A, ...B]);
  const game = id => boardsById.get(id).gameId;
  const perSeed = seeds.map(seed => {
    const digestOf = arm => {
      const j = jobs.get(`${seed}-${arm}`);
      if (!j?.digest) throw Error(`no walked job ${seed}-${arm}`);
      return j.digest;
    };
    const I = digestOf('informative-local'), Ab = digestOf('absent-local'), O = digestOf('off-local'), S = digestOf('shuffled-local');
    const at = (d, label, id) => {
      const e = d.labels.get(label)?.get(id);
      if (!e) throw Error(`no ${label} ranking for ${id}`);
      return e;
    };
    const rows = (d, label, ids) => ids.map(id => ({ boardId: id, gameId: game(id), ...at(d, label, id).m0 }));
    const gate = (name, fn) => {
      try { return { name, ...fn() }; } catch (e) { return { name, pass: false, detail: `error: ${e.message}` }; }
    };
    const P1 = [
      gate('P1.1', () => ({ pass: I.counts.fingerprints === 0 && I.counts.mask === 0,
        detail: `fingerprint chain ${I.counts.fingerprints} problems; mask ${I.counts.mask} problems (replay adds the fixed-state check)` })),
      gate('P1.2', () => ({ pass: I.counts.updates === 0, detail: `${I.counts.updates} update problems in ${I.learned} learning events` })),
      gate('P1.3', () => {
        const [ps, pn] = I.dSum.pulse, [ns, nn] = I.dSum.none;
        if (!pn || !nn) return { pass: false, detail: 'pulse or no-pulse events missing' };
        const diff = ps / pn - ns / nn;
        return { pass: diff < -1e-6, detail: `mean D on pulse minus no-pulse events = ${diff.toExponential(3)} (need below -1e-6)` };
      }),
      gate('P1.4', () => sourceP14),
    ];
    const P2 = [
      gate('P2.1', () => {
        const r = retentionGate({
          a0: rows(I, 'T0', A), aAfterA: rows(I, 'A-end', A), aAfterB: rows(I, 'B-end', A), aFinal: rows(I, 'R2-end', A),
          bBefore: rows(I, 'R1-end', B), bAfter: rows(I, 'B-end', B), bFinal: rows(I, 'R2-end', B), minAcquired,
        });
        return { pass: r.pass, detail: r.detail };
      }),
      gate('P2.2', () => pairGate({ informative: AB.map(id => at(I, 'B-end', id).m0.success), absent: AB.map(id => at(Ab, 'B-end', id).m0.success),
        off: AB.map(id => at(O, 'B-end', id).m0.success), shuffled: AB.map(id => at(S, 'B-end', id).m0.success) },
      AB.map(game), 'informative', ['absent', 'off', 'shuffled'], GATE.bootstrapSeed)),
      gate('P2.2b', () => ownBaselineGate({ aGames: A.map(game), aEnd: A.map(id => at(I, 'B-end', id).m0.success),
        aT0: A.map(id => at(I, 'T0', id).m0.success), bGames: B.map(game), bEnd: B.map(id => at(I, 'B-end', id).m0.success),
        bR1: B.map(id => at(I, 'R1-end', id).m0.success) })),
      gate('P2.3', () => pressureGate({ written: I.pressure.written, pressureEdges: I.pressure.pressureEdges, base: I.base,
        finalMagnitude: I.pressure.finalMagnitude, maskSize: I.n })),
      gate('P2.4', () => {
        if (R.length === 0) return { pass: false, detail: 'no R boards' };
        const bad = [];
        for (const id of R) {
          const t0 = boardsById.get(id).rTargets[0];
          const a = at(I, 'A-end', id).m0, r1 = at(I, 'R1-end', id).m0, b = at(I, 'B-end', id).m0, r2 = at(I, 'R2-end', id).m1;
          const p1 = Number.isFinite(a.margin) && Number.isFinite(r1.margin) && r1.success >= GATE.success && r1.margin > r1.tolerance && r1.margin - a.margin > GATE.epsilon;
          const p2 = Number.isFinite(b.margin) && b.success >= GATE.success && b.margin > b.tolerance;
          const p3 = Number.isFinite(r2.margin) && r2.success >= GATE.success && r2.margin > 0 && !(r2.topMoves.length === 1 && r2.topMoves[0] === t0);
          if (!(p1 && p2 && p3)) bad.push(`${id} (${p1 ? '' : 'R1 '}${p2 ? '' : 'B-end '}${p3 ? '' : 'R2-end'})`.trim());
        }
        return { pass: bad.length === 0, detail: bad.length ? `${bad.length} of ${R.length} R boards fail: ${bad.slice(0, 3).join('; ')}`
          : `${R.length} R boards keep the phase-1 target and no longer hold the phase-2 target as sole top choice` };
      }),
    ];
    const P3 = [
      gate('P3.1', () => pairGate({ informative: TEST.map(id => at(I, 'R2-end', id).m0.success), off: TEST.map(id => at(O, 'R2-end', id).m0.success),
        shuffled: TEST.map(id => at(S, 'R2-end', id).m0.success) }, TEST.map(game), 'informative', ['off', 'shuffled'], GATE.bootstrapSeed)),
      gate('P3.2', () => pairGate({ final: TEST.map(id => at(I, 'R2-end', id).m0.success), naive: TEST.map(id => at(I, 'T0', id).m0.success) },
        TEST.map(game), 'final', ['naive'], GATE.bootstrapSeed)),
    ];
    const fair = fairBySeed.get(seed) === true;
    const pass = [...P1, ...P2, ...P3].every(g => g.pass) && fair;
    return { seed, pass, P1: { pass: P1.every(g => g.pass), checks: P1 }, P2: { pass: P2.every(g => g.pass), checks: P2 },
      P3: { pass: P3.every(g => g.pass), checks: P3 }, fair: { pass: fair, checks: [] } };
  });
  const pass = perSeed.every(s => s.pass);
  return { perSeed, pass, verdict: pass ? 'passes' : 'does not pass' };
}

// Summary shape the judge writes: compared with the auditor's own verdicts in compareSummary.
export function summaryOf(gates) {
  return { schema: SUMMARY_SCHEMA, perSeed: gates.perSeed, baselines: {}, verdict: gates.verdict, pass: gates.pass };
}

// Per-gate and overall comparison. P1.2 and P1.4 are deferred to the audit by the judge, so their values may be absent there.
const DEFERRED = new Set(['P1.2', 'P1.4']);
export function compareSummary(mine, summary) {
  if (!summary || typeof summary !== 'object') return { match: false, mismatches: ['summary.json missing or unreadable'] };
  const mism = [];
  if (summary.verdict !== mine.verdict) mism.push(`verdict ${summary.verdict} recorded, ${mine.verdict} recomputed`);
  if (summary.pass !== mine.pass) mism.push(`pass ${summary.pass} recorded, ${mine.pass} recomputed`);
  mine.perSeed.forEach((m, i) => {
    const s = summary.perSeed?.[i];
    if (!s || s.seed !== m.seed) { mism.push(`perSeed[${i}] is not seed ${m.seed}`); return; }
    if (s.pass !== m.pass) mism.push(`seed ${m.seed} pass ${s.pass} recorded, ${m.pass} recomputed`);
    for (const P of ['P1', 'P2', 'P3']) {
      for (const c of m[P].checks) {
        const judged = s[P]?.checks?.find(x => x.name.split(' ')[0] === c.name)?.pass; // judge names are 'P2.3 description'
        if (typeof judged !== 'boolean') {
          if (!DEFERRED.has(c.name)) mism.push(`seed ${m.seed} ${c.name} has no recorded pass`);
        } else if (judged !== c.pass) mism.push(`seed ${m.seed} ${c.name} ${judged} recorded, ${c.pass} recomputed`);
      }
    }
    const fairJudged = typeof s.fair === 'boolean' ? s.fair : s.fair?.pass;
    if (typeof fairJudged !== 'boolean') mism.push(`seed ${m.seed} fair has no recorded pass`);
    else if (fairJudged !== m.fair.pass) mism.push(`seed ${m.seed} fair ${fairJudged} recorded, ${m.fair.pass} recomputed`);
  });
  return { match: mism.length === 0, mismatches: mism };
}

// ---- Readers --------------------------------------------------------------------------------------------------

export async function* jsonlLines(path) {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) if (line.trim() !== '') yield JSON.parse(line);
}
export function readJsonOrNull(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

// Packet directory: packet.json, boards.jsonl (file order), tapes/<seed>.json (text hashed as read).
export function loadPacket(dir, seeds) {
  const packet = JSON.parse(readFileSync(join(dir, 'packet.json'), 'utf8'));
  const boardsText = readFileSync(join(dir, 'boards.jsonl'), 'utf8');
  const boards = boardsText.split('\n').filter(line => line.trim() !== '').map(line => JSON.parse(line));
  const tapes = new Map();
  for (const seed of seeds) {
    const text = readFileSync(join(dir, 'tapes', `${seed}.json`), 'utf8');
    tapes.set(seed, { tape: JSON.parse(text), fileSha256: sha256Text(text) });
  }
  const byGroup = Object.fromEntries(GROUPS.map(g => [g, boards.filter(r => r.group === g)]));
  const boardsById = new Map(boards.map(r => [r.boardId, r]));
  return { packet, boardsSha256: sha256Text(boardsText), boards, byGroup, boardsById, tapes };
}

// Packet check (check 2): every board verified, groups disjoint and counted, test boards disjoint from training, tapes rebuilt.
export function checkPacket({ packet, boardsSha256, boards, byGroup, tapes, seeds }) {
  const problems = [];
  if (packet?.schema !== PACKET_SCHEMA) problems.push('packet schema differs');
  if (packet?.boards?.sha256 !== boardsSha256) problems.push('boards.jsonl SHA-256 differs from packet.json');
  const ids = new Set(), games = new Set();
  for (const r of boards) {
    if (r?.schema !== BOARD_SCHEMA || !GROUPS.includes(r.group)) { problems.push(`${r?.boardId} is not an eligible board record in a known group`); continue; }
    if (ids.has(r.boardId)) problems.push(`duplicate board ${r.boardId}`);
    ids.add(r.boardId);
    if (games.has(r.gameId)) problems.push(`game ${r.gameId} is in more than one board`);
    games.add(r.gameId);
    try {
      if (r.group === 'R') { verifyPacketBoard(r, { phase: 'R1' }); verifyPacketBoard(r, { phase: 'R2' }); }
      else verifyPacketBoard(r);
    } catch (e) { problems.push(`${r.boardId}: ${e.message}`); }
  }
  for (const g of GROUPS) {
    const list = byGroup[g];
    const entry = packet?.groups?.[g];
    if (entry?.count !== list.length) problems.push(`group ${g} count ${entry?.count}, boards.jsonl has ${list.length}`);
    if (!sameValue(entry?.boardIds, list.map(r => r.boardId))) problems.push(`group ${g} boardIds differ from boards.jsonl`);
    if (!sameValue(entry?.gameIds, list.map(r => r.gameId))) problems.push(`group ${g} gameIds differ from boards.jsonl`);
  }
  const train = [...byGroup.A, ...byGroup.B, ...byGroup.R];
  const keys = new Set(train.map(r => boardKey(r.fen)));
  const hashes = new Set(train.flatMap(r => Object.values(r.inputHashes)));
  for (const r of [...byGroup.testA, ...byGroup.testB]) {
    if (keys.has(boardKey(r.fen))) problems.push(`test board ${r.boardId} shares a board key with training`);
    if (Object.values(r.inputHashes).some(h => hashes.has(h))) problems.push(`test board ${r.boardId} shares a rendered input with training`);
  }
  for (const seed of seeds) {
    const entry = tapes.get(seed);
    if (!entry) { problems.push(`tape ${seed} missing`); continue; }
    let rebuilt;
    try { rebuilt = buildExperienceTape(byGroup, seed); }
    catch (e) { problems.push(`tape ${seed} cannot be rebuilt: ${e.message}`); continue; }
    if (rebuilt.sha256 !== entry.tape.sha256) problems.push(`tape ${seed} sha256 differs from the rebuilt tape`);
    if (packet?.tapes?.[seed]?.sha256 !== rebuilt.sha256) problems.push(`packet.json tape ${seed} sha256 differs from the rebuilt tape`);
    if (packet?.tapes?.[seed]?.fileSha256 !== entry.fileSha256) problems.push(`packet.json tape ${seed} file SHA-256 differs`);
    if (!sameValue(JSON.parse(JSON.stringify(rebuilt)), entry.tape)) problems.push(`tape ${seed} content differs from the rebuilt tape`);
  }
  return { name: 'packet', pass: problems.length === 0,
    detail: problems.length ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}`
      : `${boards.length} boards verified (R both phases); groups counted and disjoint; test boards share no board key or rendered input with training; ${seeds.length} tapes rebuilt identically` };
}

function jobResultProblems(result, { seed, arm, tape }) {
  const out = [];
  if (result.schema !== RESULT_SCHEMA) out.push('schema differs');
  if (result.seed !== seed || result.arm !== arm) out.push('seed or arm differs from its directory');
  if (result.status !== 'complete') out.push(`status is ${result.status}`);
  if (result.tapeSha256 !== tape.sha256) out.push('tapeSha256 differs from the tape');
  if (result.events !== tape.events.length) out.push(`${result.events} events, tape has ${tape.events.length}`);
  if (!Number.isSafeInteger(result.passes) || result.passes < 0) out.push('passes is not a count');
  const d = result.describe ?? {}, rule = ARM_TABLE[arm];
  if (d.arm !== arm || d.aplMode !== rule?.apl || d.pulseRule !== rule?.pulse || d.learns !== rule?.learns) out.push('describe does not match the arm table');
  const groups = d.groups ?? [];
  if (groups.length !== 2 || groups[0]?.side !== 'left' || groups[1]?.side !== 'right') out.push('describe groups are not left then right');
  if (!Number.isSafeInteger(d.maskEdges) || d.maskEdges < 1) out.push('maskEdges is not a count');
  return out;
}

// Runs checks 2 to 9 (everything except pins and replay). Returns the checks in order, the gate verdicts, the match flag and the packet.
export async function auditStaticChecks({ runDir, packetDir, registration, sourceTexts = {}, summary = null }) {
  const seeds = registration.seeds ?? [], arms = registration.arms ?? [];
  const names = ['packet', 'jobs', 'events', 'updates', 'fingerprints', 'rankings', 'gates', 'resources'];
  let packet;
  try { packet = loadPacket(packetDir, seeds); }
  catch (e) {
    return { checks: names.map(name => ({ name, pass: false, detail: `packet unreadable: ${e.message}` })), gates: null, match: false, packet: null };
  }
  const checks = [checkPacket({ ...packet, seeds })];

  const jobDirs = existsSync(join(runDir, 'jobs'))
    ? readdirSync(join(runDir, 'jobs'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name) : [];
  const expected = seeds.flatMap(seed => arms.map(arm => `${seed}-${arm}`));
  const jobProblems = [];
  for (const n of expected) if (!jobDirs.includes(n)) jobProblems.push(`missing job ${n}`);
  for (const n of jobDirs) if (!expected.includes(n)) jobProblems.push(`extra job ${n}`);

  const legalCache = new Map(), shared = { pulseCells: null };
  const jobs = new Map(), fairBySeed = new Map(), resourceProblems = [], walkErrors = [];
  for (const seed of seeds) {
    const tape = packet.tapes.get(seed).tape;
    let fair = true;
    for (const arm of arms) {
      const name = `${seed}-${arm}`, dir = join(runDir, 'jobs', name);
      if (!jobDirs.includes(name)) { fair = false; continue; }
      let result;
      try { result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8')); }
      catch (e) { jobProblems.push(`${name}: result.json unreadable (${e.message})`); fair = false; continue; }
      const jp = jobResultProblems(result, { seed, arm, tape });
      for (const p of jp) jobProblems.push(`${name}: ${p}`);
      if (result.tapeSha256 !== tape.sha256) fair = false;
      const rp = [];
      if (!(Number.isFinite(result.peakRssMiB) && result.peakRssMiB <= GATE.rssMiB)) rp.push(`peak RSS ${result.peakRssMiB} MiB exceeds ${GATE.rssMiB}`);
      if (!(Number.isFinite(result.minFreeMiB) && result.minFreeMiB >= GATE.freeMiB)) rp.push(`minimum free ${result.minFreeMiB} MiB is below ${GATE.freeMiB}`);
      for (const p of rp) resourceProblems.push(`${name}: ${p}`);
      if (rp.length) fair = false;
      let digest = null;
      try {
        const walk = new JobWalk({ arm, tape, byGroup: packet.byGroup, boardsById: packet.boardsById, result, legalCache, shared,
          readSnapshot: label => JSON.parse(readFileSync(join(dir, 'snapshots', `${label}.json`), 'utf8')) });
        digest = await walk.run(jsonlLines(join(dir, 'records.jsonl')));
        if (digest.n !== result.describe?.maskEdges) jobProblems.push(`${name}: mask ${digest.n} edges, describe says ${result.describe?.maskEdges}`);
      } catch (e) {
        digest = null;
        fair = false;
        walkErrors.push(`${name}: ${e.message}`);
      }
      jobs.set(name, { seed, arm, result, digest });
    }
    fairBySeed.set(seed, fair);
  }

  // Category totals: walk counts for each job, plus one problem per job that could not be walked (its records went unchecked).
  const cats = ['events', 'updates', 'fingerprints', 'rankings'];
  const total = Object.fromEntries(cats.map(c => [c, 0]));
  const lines = Object.fromEntries(cats.map(c => [c, []]));
  for (const [name, j] of jobs) {
    if (!j.digest) continue;
    const { counts, lists } = j.digest;
    total.events += counts.events; total.fingerprints += counts.fingerprints; total.rankings += counts.rankings;
    total.updates += counts.updates + counts.mask;
    lines.events.push(...lists.events.map(t => `${name}: ${t}`));
    lines.fingerprints.push(...lists.fingerprints.map(t => `${name}: ${t}`));
    lines.rankings.push(...lists.rankings.map(t => `${name}: ${t}`));
    lines.updates.push(...lists.updates.map(t => `${name}: ${t}`), ...lists.mask.map(t => `${name}: ${t}`));
  }
  for (const e of walkErrors) for (const c of cats) { total[c]++; lines[c].push(e); }
  const categoryCheck = (name, cat, okText) => {
    const pass = total[cat] === 0;
    return { name, pass, detail: pass ? okText : `${total[cat]} problems; first: ${lines[cat].slice(0, 3).join('; ')}` };
  };
  checks.push({ name: 'jobs', pass: jobProblems.length === 0,
    detail: jobProblems.length ? `${jobProblems.length} problems; first: ${jobProblems.slice(0, 3).join('; ')}`
      : `${expected.length} job directories (${seeds.length} seeds x ${arms.length} arms), each with complete result.json; tape SHA-256 equal; describe matches the arm table; event, pass and mask counts match` });
  checks.push(categoryCheck('events', 'events',
    'event lines are sequence 0..N-1 once in order; receipts equal the tape; deliveredPulse follows the arm rule; pulseCells equal across jobs'));
  checks.push(categoryCheck('updates', 'updates',
    'every gain update recomputed from receipt rates (Euler bound never exceeded); every write and snapshot equal the recomputation; magnitudes are base x gain; off arm never updated'));
  checks.push(categoryCheck('fingerprints', 'fingerprints',
    'each event fingerprintBefore equals the previous state; off-arm fingerprint constant; reused rankings only in the off arm at the T0 fingerprint'));
  checks.push(categoryCheck('rankings', 'rankings',
    'every ranking lists every legal move once in sorted UCI order; s, c, success, margin and tolerance recomputed equal the stored values; probe groups match the table'));

  const constants = gatesMatch(registration.gates);
  let gates = null, comparison = { match: false, mismatches: [] }, gateError = null;
  try {
    gates = gateVerdicts({ seeds, jobs, boardsById: packet.boardsById, byGroup: packet.byGroup, fairBySeed, registration,
      sourceP14: staticImportCheck(sourceTexts) });
    comparison = compareSummary(gates, summary);
  } catch (e) { gateError = e.message; }
  const gatePass = gates !== null && comparison.match && constants.pass && summary !== null;
  const gateDetail = gates === null ? `gates not computed: ${gateError}`
    : `verdict ${gates.verdict}; ${gates.perSeed.map(s => `seed ${s.seed} ${s.pass ? 'passes' : 'fails'}`).join('; ')}; ${constants.detail}; `
      + (summary === null ? 'no summary.json to compare with'
        : comparison.match ? 'summary.json agrees with every recomputed gate and the verdict'
          : `summary.json MISMATCH: ${comparison.mismatches.slice(0, 3).join('; ')}`);
  checks.push({ name: 'gates', pass: gatePass, detail: gateDetail });

  checks.push({ name: 'resources', pass: resourceProblems.length === 0,
    detail: resourceProblems.length ? `${resourceProblems.length} problems; first: ${resourceProblems.slice(0, 3).join('; ')}`
      : `${expected.length} jobs: peak RSS <= ${GATE.rssMiB} MiB and minimum free >= ${GATE.freeMiB} MiB` });
  return { checks, gates, match: comparison.match, packet };
}

// Pin check (check 1): every registration pin hashes to its value now, and the manifest names this registration and status complete.
export async function pinCheck({ registration, manifest, registrationSha256, root, hashFile }) {
  const pins = registration?.pins ?? {};
  const problems = [];
  if (Object.keys(pins).length === 0) problems.push('registration lists no pins');
  for (const [rel, want] of Object.entries(pins)) {
    let got;
    try { got = await hashFile(resolve(root, rel)); }
    catch (e) { problems.push(`${rel}: ${e.message}`); continue; }
    if (got !== want) problems.push(`${rel} is ${got}, pinned ${want}`);
  }
  if (manifest?.registrationSha256 !== registrationSha256) problems.push('manifest registrationSha256 differs from the registration file');
  if (manifest?.status !== 'complete') problems.push(`manifest status is ${manifest?.status ?? 'missing'}`);
  return { name: 'pins', pass: problems.length === 0,
    detail: problems.length ? `${problems.length} problems; first: ${problems.slice(0, 3).join('; ')}`
      : `${Object.keys(pins).length} pins match; manifest registrationSha256 matches; manifest status complete` };
}

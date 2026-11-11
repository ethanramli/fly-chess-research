// Fly connections memory v1: one neural condition (all-legal scoring, pulse-gated replay, local-rate update).
// Computational endpoint model only: raw fixed MBON05 endpoint score, actual local DAN-rate gain rule, no
// biological clock, no receptor kinetics, no transmitter identity, not a calibrated value. The teacher verifies
// and schedules; the fly receives only unchanged eyes stimulation plus the scheduled PAM07 current.
import { createHash } from 'node:crypto';
import { SparseTrainer } from '../supervised-baselines/trainer.mjs';
import { ReversalMemory } from './reversal-memory.mjs';
import { actualTeachingInputs, mappingSchema } from './fly-connections-teaching-v1.mjs';
import { installLocalApl } from './fly-connections-apl-v1.mjs';
import { recordEffectiveWrites, scoreAllLegal } from './fly-connections-metrics-v1.mjs';
import { verifyPacketBoard } from './fly-connections-packet-v1.mjs';

const SCHEMA = 'fly-connections-condition-v1';
const RECEIPT = 'fly-connections-condition-receipt-v1';
const SCOPE = 'Computational endpoint model: raw fixed MBON05 endpoint score; actual local DAN-rate gain rule on mapped gamma KC-to-MBON05 edges; quasi-steady, no biological clock, no receptor kinetics, no transmitter identity, not a calibrated value.';
const PULSE_CURRENT = 0.75; // scheduled experimental current per mapped PAM07 cell
const MEMORY = { eta: 0.5, minGain: 0.2, maxGain: 1.8, activityScale: 1.5 };
const CHESS_GROUPS = new Set(['A', 'B', 'testA', 'testB']);
const TAPE_GROUP = { A: 'A', B: 'B', R1: 'R', R2: 'R' };
const TAPE_PHASE = { A: 'chess', B: 'chess', R1: 'R1', R2: 'R2' };
// Pulse rule: experience = verified tape pulse, absent = never, delivered = scheduler's shuffled boolean.
// learns = false only for the explicit off control, which holds all persistent memory fixed.
const ARMS = {
  'informative-local': { apl: 'local', pulse: 'experience', learns: true },
  'absent-local': { apl: 'local', pulse: 'absent', learns: true },
  'off-local': { apl: 'local', pulse: 'experience', learns: false },
  'shuffled-local': { apl: 'local', pulse: 'delivered', learns: true },
  'informative-matched': { apl: 'matched', pulse: 'experience', learns: true },
  'informative-global': { apl: 'global', pulse: 'experience', learns: true },
};

const hashJson = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
// Same hashing as eyes-v2 inputCollisions: SHA-256 of JSON over [index,current] pairs sorted by index.
const stimulusHash = stimulation => hashJson(stimulation.map(({ index, current }) => [index, current]).sort((a, b) => a[0] - b[0]));
function digestOf(header, arrays) {
  const hash = createHash('sha256').update(header);
  for (const a of arrays) hash.update(bytes(a));
  return hash.digest('hex');
}

// Chess groups verify as 'chess'; R records need an explicit contingency phase.
function verifyPhaseFor(group, phase) {
  if (CHESS_GROUPS.has(group)) {
    if (phase !== 'chess') throw Error(`Group ${group} verifies with phase chess`);
    return phase;
  }
  if (group === 'R') {
    if (phase !== 'R1' && phase !== 'R2') throw Error('R records need phase R1 or R2');
    return phase;
  }
  throw Error(`Unknown record group ${group}`);
}

function checkExperience(x) {
  if (!Number.isSafeInteger(x?.sequence) || x.sequence < 0) throw Error('Invalid experience sequence');
  if (typeof x.eventId !== 'string' || !x.eventId) throw Error('Invalid experience eventId');
  if (!Object.hasOwn(TAPE_GROUP, x.phase)) throw Error('Invalid experience phase');
  if (typeof x.boardId !== 'string' || typeof x.move !== 'string' || typeof x.criterion !== 'string') throw Error('Invalid experience fields');
  if (typeof x.pulse !== 'boolean') throw Error('Experience pulse must be boolean');
  if (!/^[0-9a-f]{64}$/.test(x.proofSha ?? '')) throw Error('Invalid experience proofSha');
}

class FlyCondition {
  constructor({ model, mapping, eyes, aplPackage, arm, guard }) {
    if (!(model instanceof SparseTrainer)) throw Error('model must be a SparseTrainer');
    // One zero input value only: a random input projection would make the input path a score of its own.
    if (model.inputDim !== 1) throw Error('Unsupported inputDim: the condition feeds one zero input value');
    if (model.config.precision !== 'float32') throw Error('Invalid precision: effective-write receipts need float32 storage');
    if (!Object.hasOwn(ARMS, arm)) throw Error('Invalid arm');
    if (typeof guard !== 'function') throw Error('guard must be a function');
    if (typeof eyes?.encode !== 'function' || typeof eyes.identity !== 'string') throw Error('Invalid eyes encoder');
    if (mapping?.schema !== mappingSchema || mapping.readyForCandidateExperiment !== true) throw Error('Incomplete or unknown mapping');
    if (mapping.groups.map(g => g.side).join(',') !== 'left,right') throw Error('Expected exactly left and right mapping groups');
    for (const g of mapping.groups) {
      if (!Number.isSafeInteger(g.mbon?.index) || g.mbon.index < 0 || g.mbon.index >= model.n) throw Error('Invalid MBON05 index');
      if (g.dan.some(c => c.type !== 'PAM07')) throw Error('Invalid DAN identity');
    }
    if (mapping.groups[0].mbon.index === mapping.groups[1].mbon.index) throw Error('MBON05 indices must differ');

    this.model = model; this.mapping = mapping; this.eyes = eyes; this.arm = arm; this.rule = ARMS[arm]; this.guard = guard;
    this.dan = mapping.groups.flatMap(g => g.dan.map(c => c.index));
    // Validates the mapping and creates the gains before any APL patch, so a failure leaves the model untouched.
    this.memory = new ReversalMemory(model, mapping, MEMORY);
    const apl = installLocalApl(model, aplPackage, { mode: this.rule.apl });
    const mask = new Uint8Array(model.graph.col.length);
    for (const e of this.memory.edges) mask[e] = 1;
    const outside = [];
    for (let e = 0; e < mask.length; e++) if (!mask[e]) outside.push(e);
    this.outside = Int32Array.from(outside);
    this.bound = { arm, eyes: eyes.identity, apl: apl.identity, mapping: this.memory.identity, fixed: '' };
    this.bound.fixed = this.fixedDigest();
  }

  // Initial fixed-state identity: topology, signs, non-mask magnitudes, non-magnitude parameters, base efficacies.
  // Plastic gains and the mask's magnitudes are excluded; they are covered by fingerprint() instead.
  fixedDigest() {
    const { graph, params } = this.model;
    const { magnitude, ...rest } = params;
    const header = JSON.stringify({ schema: SCHEMA, arm: this.arm, apl: this.bound.apl, eyes: this.bound.eyes,
      mapping: this.bound.mapping, config: this.model.config, n: this.model.n, pulse: this.rule.pulse });
    return digestOf(header, [graph.row, graph.col, graph.sign, graph.initial, graph.input, graph.output,
      ...Object.values(rest), this.memory.base, Int32Array.from(this.memory.edges),
      Float32Array.from(this.outside, e => magnitude[e])]);
  }

  // Complete persistent state: every parameter, signed magnitude, topology/signs, gains and event count.
  fingerprint() {
    const { graph, params, signedMagnitude } = this.model;
    return digestOf(JSON.stringify(this.bound), [graph.row, graph.col, graph.sign, graph.initial, graph.input, graph.output,
      ...Object.values(params), signedMagnitude, this.memory.gains, Float64Array.of(this.memory.events),
      this.memory.base, Int32Array.from(this.memory.edges)]);
  }

  assertFixed() {
    if (this.fixedDigest() !== this.bound.fixed) throw Error('Fixed state changed outside the plastic mask; nothing restored');
  }

  describe() {
    return Object.freeze({ schema: SCHEMA, arm: this.arm, aplMode: this.rule.apl, pulseRule: this.rule.pulse, learns: this.rule.learns,
      maskEdges: this.memory.edges.length, baseEdges: this.memory.base.length, scope: SCOPE,
      identities: Object.freeze({ ...this.bound }),
      groups: Object.freeze(this.mapping.groups.map(g => Object.freeze({ side: g.side, mbonIndex: g.mbon.index,
        mbonRootId: g.mbon.rootId, danCount: g.dan.length, kcCount: g.kc.length }))) });
  }

  snapshot() {
    return { schema: SCHEMA, version: 1, bound: { ...this.bound }, memory: this.memory.snapshot() };
  }

  restore(s) {
    if (s?.schema !== SCHEMA || s.version !== 1) throw Error('Incompatible condition snapshot');
    const keys = Object.keys(this.bound);
    if (Object.keys(s.bound ?? {}).length !== keys.length || !keys.every(k => s.bound[k] === this.bound[k])) throw Error('Snapshot identity mismatch');
    this.assertFixed();
    this.memory.restore(s.memory); // validates identity and gains before its own mutation
  }

  // Ranks every legal action. Observation only: no gains, event clocks or teaching state change.
  rankBoard(record, { phase = 'chess', checkOrder = false } = {}) {
    return this.#rank(record, this.#verify(record, phase), checkOrder);
  }

  // One teaching event. Returns the receipt and the after-snapshot; the caller publishes both before acknowledging.
  teach(record, experience, { deliveredPulse } = {}) {
    checkExperience(experience);
    const { move, phase } = experience;
    if (TAPE_GROUP[phase] !== record.group || experience.boardId !== record.boardId) throw Error('Experience does not match the record group or board');
    if (experience.criterion !== record.criterion) throw Error('Experience criterion differs from the sealed record');
    // The tape event must match a sealed record entry: R targets are UCI strings, chess experiences carry pulse.
    const bound = record.proofs?.[move]?.certificateSha256 === experience.proofSha
      && (record.group === 'R' ? record.rTargets.includes(move) : record.experiences.some(e => e.move === move && e.pulse === experience.pulse));
    if (!bound) throw Error('Experience is not bound to a sealed proof');
    // verifyPacketBoard throws on any unknown or unchecked certificate, so no pulse or update can follow it.
    const verified = this.#verify(record, TAPE_PHASE[phase]);
    if (!verified.legal.includes(move)) throw Error(`Action ${move} is not legal on this board`);
    const delivered = this.#deliveredPulse(experience.pulse, deliveredPulse);
    const outcome = verified.outcomes[move];
    if (typeof outcome !== 'boolean') throw Error(`No verified outcome for ${move}; no feedback delivered`);
    if (experience.pulse !== outcome) throw Error('Experience pulse contradicts the verified outcome');
    const base = { schema: RECEIPT, arm: this.arm, sequence: experience.sequence, eventId: experience.eventId, phase,
      boardId: record.boardId, gameId: record.gameId, move, criterion: experience.criterion, proofSha: experience.proofSha };

    const fingerprintBefore = this.fingerprint();
    const unaided = this.#rank(record, verified, false); // complete pre-feedback ranking
    const cue = this.#bind(record, move);
    const pulseEntries = delivered ? this.dan.map(index => ({ index, current: PULSE_CURRENT })) : [];
    this.#forward([...cue, ...pulseEntries]);
    const teaching = actualTeachingInputs(this.model, this.mapping, { activityScale: MEMORY.activityScale });

    const gainsBefore = Float64Array.from(this.memory.gains);
    const magnitudesBefore = this.#effectiveMagnitudes();
    let update = { observed: false, events: this.memory.events };
    if (this.rule.learns) {
      const observed = this.memory.observe(new Float32Array(this.model.n), 1); // throws before any mutation if unstable
      update = { observed: true, factors: observed.factors, changedEdges: observed.changedEdges, events: observed.events, scope: observed.scope };
    }
    const writes = recordEffectiveWrites(this.memory.edges, this.memory.base, gainsBefore, Float64Array.from(this.memory.gains),
      magnitudesBefore, this.#effectiveMagnitudes());
    const receipt = { ...base, status: 'taught', outcome, pulse: experience.pulse, deliveredPulse: delivered,
      cueSha: stimulusHash(cue), pulseCurrent: delivered ? PULSE_CURRENT : 0, pulseCells: [...this.dan],
      unaided, teaching: teaching.map(g => ({ side: g.side, kc: Array.from(g.kcRates), dan: Array.from(g.danRates),
        k: Array.from(g.k), factor: g.factor })),
      update, writes, fingerprintBefore, fingerprintAfter: this.fingerprint(), passes: unaided.passes + 1, scope: SCOPE };
    return { receipt, snapshot: this.snapshot() };
  }

  #verify(record, phase) {
    return verifyPacketBoard(record, { phase: verifyPhaseFor(record.group, phase) });
  }

  #deliveredPulse(pulse, explicit) {
    if (this.rule.pulse === 'absent') {
      if (explicit !== undefined && explicit !== false) throw Error('The absent arm receives no external pulse');
      return false;
    }
    if (this.rule.pulse === 'delivered') {
      if (typeof explicit !== 'boolean') throw Error('The shuffled arm needs the scheduled boolean deliveredPulse');
      return explicit;
    }
    if (explicit !== undefined && explicit !== pulse) throw Error('deliveredPulse contradicts the experience pulse');
    return pulse;
  }

  #rank(record, verified, checkOrder) {
    this.assertFixed(); // edits outside the mask are rejected before any forward
    const { board, outcomes, legal } = verified;
    const fen = board.fen(), plies = board.history().length;
    // Every legal action's stimulus is bound to the sealed record before the first forward.
    const stimuli = new Map(legal.map(move => [move, this.#bind(record, move)]));
    let passes = 0;
    // One fingerprint per board, not per forward: a full fingerprint costs about as much as a pass (2.7M edges).
    const before = this.fingerprint();
    const evaluate = move => {
      const result = this.#evaluate(stimuli.get(move));
      if (board.fen() !== fen || board.history().length !== plies) throw Error('Board changed during observation');
      passes++;
      return { move, ...result };
    };
    const ranked = legal.map(evaluate);
    if (checkOrder) {
      for (let i = legal.length - 1; i >= 0; i--) {
        const again = evaluate(legal[i]);
        if (again.score !== ranked[i].score || again.mbon.some((v, k) => v !== ranked[i].mbon[k])) {
          throw Error(`Candidate-order dependence at ${legal[i]}`);
        }
      }
    }
    if (this.fingerprint() !== before) throw Error('Persistent state changed during observation');
    const metrics = scoreAllLegal(board, ranked, outcomes);
    const choice = ranked.reduce((best, e) => (e.score > best.score ? e : best)).move; // ties: earliest UCI
    return { schema: 'fly-connections-ranking-v1', boardId: record.boardId, gameId: record.gameId, ranked, choice, ...metrics, passes };
  }

  #evaluate(stimulation) {
    this.#forward(stimulation);
    const endpoint = this.model.h[this.model.steps], saturation = this.model.saturation;
    const mbon = this.mapping.groups.map(g => {
      const v = endpoint[g.mbon.index];
      if (!(Number.isFinite(v) && v >= 0 && v <= saturation)) throw Error('Invalid MBON05 endpoint rate');
      return v;
    });
    // Ranking keeps only the two MBON05 rates; full KC/DAN rates are recorded for the teaching replay only (bounded records).
    const score = -(mbon.reduce((sum, v) => sum + v, 0) / mbon.length);
    return { score, mbon };
  }

  #bind(record, move) {
    if (this.eyes.identity !== record.eyesIdentity) throw Error('Eyes identity differs from the sealed record');
    const { stimulation } = this.eyes.encode(record.fen, move);
    if (!Array.isArray(stimulation) || record.inputHashes?.[move] !== stimulusHash(stimulation)) {
      throw Error(`Input hash differs from the sealed record for ${move}`);
    }
    return stimulation;
  }

  // Every actual forward goes through here so the caller's guard sees each pass.
  #forward(stimulation) {
    this.guard({ kind: 'forward', when: 'before' });
    this.model.forward(new Float32Array(this.model.inputDim), stimulation, null); // zero transient state
    this.guard({ kind: 'forward', when: 'after' });
  }

  #effectiveMagnitudes() {
    return Float32Array.from(this.memory.edges, e => this.model.params.magnitude[e]);
  }
}

export function createFlyCondition({ model, mapping, eyes, aplPackage, arm, guard = () => {} }) {
  return new FlyCondition({ model, mapping, eyes, aplPackage, arm, guard });
}

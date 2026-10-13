// Separate development stability condition: fixed context-slot budget, no early joint-success stop.
import assert from 'node:assert/strict';
import { experienceBoard } from './puzzle-experience-plan.mjs';
import { reviewCommittedChoice } from '../search-and-feedback/adaptive-choice-review.mjs';
import { shuffledFeedback } from '../neural-learning/association-validation.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';

// Separate multi-context extension: one shared memory per condition, round-robin
// context slots. Slots include already-correct skips; all panels remain available.
// Teacher-side verified experience selection. The caller pins inputs/sources,
// checks the discovered successful alternative, and persists atomic records.
// Publication must be idempotent for identical records and reject divergence.
export async function runMultiContextStability({ brain, rows, successMoves, protocol: p,
  state, save, publish, load, guard = () => {}, maxEvents = 128 }) {
  assert.deepEqual(p.conditions, ['informative', 'absent', 'shuffled', 'disabled']);
  assert.ok(Number.isSafeInteger(p.maxContextSlots) && p.maxContextSlots >= 1 && p.maxContextSlots <= 16);
  assert.ok(Number.isSafeInteger(maxEvents) && maxEvents >= 1 && maxEvents <= 128);
  assert.ok(Array.isArray(rows) && rows.length >= 2 && rows.length <= 4);
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length);
  assert.equal(successMoves.length, rows.length);
  const snapshot = () => brain.memory.snapshot();
  brain.memory.restore(state.memory);
  if (state.presentations !== undefined) {
    assert.ok(Number.isSafeInteger(state.presentations) && state.presentations >= 0);
    brain.presentations = state.presentations;
  }
  const persist = async () => {
    guard(); state.memory = snapshot(); state.presentations = brain.presentations;
    await save(state);
  };
  const assessOne = async row => {
    const task = { objective: row.objective, plies: row.plies };
    guard(); const board = experienceBoard(row), before = digest(snapshot());
    const fen = board.fen(), history = board.pgn(), moves = board.moves({ verbose: true });
    const assessment = await brain.assess(board, moves, task);
    const legal = moves.map(move => move.from + move.to + (move.promotion ?? ''));
    assert.deepEqual(assessment.rows.map(value => value.move).sort(), [...legal].sort());
    assert.ok(legal.includes(assessment.choice));
    assert.equal(board.fen(), fen); assert.equal(board.pgn(), history);
    const review = reviewCommittedChoice(board, assessment.choice, task, p.verification);
    assert.equal(digest(snapshot()), before, 'Assessment must leave lasting memory frozen');
    return { assessment, review, memoryFingerprint: before };
  };
  const assess = async () => { const panels = []; for (const row of rows) panels.push(await assessOne(row)); return panels; };
  if (!state.baselineRef) {
    assert.deepEqual(snapshot(), state.naive);
    state.baselineRef = await publish('baseline.json', await assess());
    await persist();
  }
  let completedEvents = 0;
  while (state.conditionIndex < p.conditions.length && completedEvents < maxEvents) {
    const condition = p.conditions[state.conditionIndex];
    if (!state.active) {
      brain.memory.restore(state.naive);
      state.active = { condition, phase: 'select', eventIndex: 0, pairIndex: 0,
        eventRefs: [], rankingRefs: [], pair: null, stoppedBy: null };
      await persist();
    }
    const a = state.active;
    assert.equal(a.condition, condition);
    if (a.phase === 'select') {
      if (condition === 'informative') {
        if (a.pairIndex >= p.maxContextSlots) { a.phase = 'final'; a.stoppedBy = 'pair-budget'; }
        else {
          // Reuse the full-legal panel just measured at this exact memory.
          // This avoids repeating inference solely to select the next event.
          const panels = await load(a.rankingRefs.at(-1) ?? state.baselineRef);
          assert.ok(panels.every(panel => panel.memoryFingerprint === digest(snapshot())));
          a.rowIndex = a.pairIndex % rows.length;
          const selected = panels[a.rowIndex];
          a.selectionRef = await publish(`selection-${a.pairIndex}.json`, selected);
          if (selected.review.status === 'success') {
            a.pairIndex++; a.phase = 'select';
          } else if (selected.review.status !== 'failure') {
            a.phase = 'final'; a.stoppedBy = selected.review.status === 'success'
              ? 'verified-unaided-success' : 'unknown-current-choice';
          } else {
            // The current all-legal policy commits before the teacher checks
            // the alternative. No fallback negative label for an unknown.
            const row = rows[a.rowIndex], task = { objective: row.objective, plies: row.plies };
            const success = reviewCommittedChoice(experienceBoard(row), successMoves[a.rowIndex], task, p.verification);
            assert.equal(success.status, 'success', 'Discovered alternative must be independently verified');
            a.pair = [selected.review, success]; a.phase = 'update';
          }
        }
      } else if (a.eventIndex >= state.informativeEventRefs.length) {
        a.phase = 'final'; a.stoppedBy = 'matched-experience-budget';
      } else {
        const source = await load(state.informativeEventRefs[a.eventIndex]);
        a.rowIndex = rows.findIndex(row => row.id === source.rowId); assert.ok(a.rowIndex >= 0);
        a.selected = source.experience; a.selectionRef = source.selectionRef; a.phase = 'update';
      }
      await persist();
    }
    if (a.phase === 'update') {
      const experience = condition === 'informative' ? a.pair[a.eventIndex % 2] : a.selected;
      assert.equal(experience.learningAllowed, true);
      assert.ok(['failure', 'success'].includes(experience.status));
      let channel = experience.status === 'success' ? 'PAM02' : 'PPL103';
      if (condition === 'absent') channel = null;
      if (condition === 'shuffled') channel = state.shuffle[a.eventIndex];
      const before = snapshot();
      const receipt = await brain.replay(experience, { channel, plasticityEnabled: condition !== 'disabled' });
      a.pending = { condition, rowId: rows[a.rowIndex].id, index: a.eventIndex, pairIndex: Math.floor(a.eventIndex / 2),
        experience, channel, selectionRef: a.selectionRef, before, after: snapshot(), receipt };
      a.phase = 'receipt';
      // Memory and pending receipt are saved before acknowledging the event.
      await persist();
    }
    if (a.phase === 'receipt') {
      a.eventRefs.push(await publish(`event-${condition}-${a.eventIndex}.json`, a.pending));
      a.pending = null; a.selected = null; a.phase = 'ranking'; await persist();
    }
    if (a.phase === 'ranking') {
      a.rankingRefs.push(await publish(`ranking-${condition}-${a.eventIndex}.json`, await assess()));
      a.eventIndex++; completedEvents++; state.totalEvents++;
      if (condition === 'informative' && a.eventIndex % 2 !== 0) a.phase = 'update';
      else {
        if (condition === 'informative') { a.pairIndex++; a.pair = null; }
        a.phase = 'select';
      }
      await persist();
    }
    if (a.phase === 'final') {
      const learned = snapshot(), after = await assess(), repeat = await assess();
      assert.deepEqual(repeat.map(panel => panel.assessment), after.map(panel => panel.assessment));
      brain.memory.restore(state.naive); const reset = await assess();
      assert.deepEqual(reset.map(panel => panel.assessment), (await load(state.baselineRef)).map(panel => panel.assessment));
      brain.memory.restore(learned); const restored = await assess();
      assert.deepEqual(restored.map(panel => panel.assessment), after.map(panel => panel.assessment));
      const resultRef = await publish(`condition-${condition}.json`, { condition,
        stoppedBy: a.stoppedBy, eventRefs: a.eventRefs, rankingRefs: a.rankingRefs,
        learned, after, repeat, reset, restored });
      state.results.push({ condition, resultRef, eventRefs: a.eventRefs });
      if (condition === 'informative') {
        state.informativeEventRefs = [...a.eventRefs];
        const events = await Promise.all(a.eventRefs.map(load));
        const labels = events.map(e => e.experience.status === 'success' ? 'PAM02' : 'PPL103');
        state.shuffle = labels.length ? shuffledFeedback(labels, p.shuffleSeed) : [];
        state.shuffleIdentifiable = new Set(labels).size === 2
          && state.shuffle.some((label, i) => label !== labels[i]);
      }
      state.active = null; state.conditionIndex++; await persist();
    }
  }
  return { complete: state.conditionIndex === p.conditions.length, completedEvents, state };
}

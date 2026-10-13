import assert from 'node:assert/strict';
import { experienceBoard } from './puzzle-experience-plan.mjs';
import { reviewCommittedChoice } from './adaptive-choice-review.mjs';
import { shuffledFeedback } from './association-validation.mjs';
import { digest } from './mushroom-body.mjs';
import { searchMonteCarlo } from './monte-carlo-puzzle-search.mjs';
import { uci } from './experimental-puzzle-search.mjs';

// Caller pins graph/protocol/source identities and atomically persists state.
// Persisted references must be hash checked by load; storage remains streamed.
export async function runAdaptiveCoverage({ brain, rows, protocol: p, state,
  save, publish, load, guard = () => {}, maxAttempts = 80, shouldStop = () => false }) {
  assert.ok(rows.length > 0 && rows.length <= p.maxPuzzles);
  assert.ok(Number.isSafeInteger(p.attemptsPerPuzzle) && p.attemptsPerPuzzle > 0 && p.attemptsPerPuzzle <= 32);
  assert.ok(Number.isSafeInteger(maxAttempts) && maxAttempts > 0 && maxAttempts <= 320);
  assert.deepEqual(p.conditions, ['adaptive', 'fixed', 'absent', 'shuffled', 'disabled']);
  const naive = state.naive;
  const snapshot = () => brain.memory.snapshot();
  const assess = async row => {
    const board = experienceBoard(row), task = { objective: row.objective, plies: row.plies };
    const assessment = await brain.assess(board, board.moves({ verbose: true }), task);
    const review = reviewCommittedChoice(board, assessment.choice, task, p.verification);
    return { assessment, review };
  };
  const persist = async () => {
    guard(); state.memory = snapshot(); state.presentations = brain.presentations;
    await save(state);
  };
  if (!state.baselineRefs) state.baselineRefs = [];
  while (state.baselineRefs.length < rows.length) {
    assert.equal(digest(snapshot()), digest(naive));
    const i = state.baselineRefs.length;
    state.baselineRefs.push(await publish(`naive-${i}.json`, await assess(rows[i])));
    await persist();
  }
  let attempts = 0;
  while (state.conditionIndex < p.conditions.length && !shouldStop() && attempts < maxAttempts) {
    const condition = p.conditions[state.conditionIndex];
    if (!state.active) {
      brain.memory.restore(naive); brain.presentations = 0;
      state.active = { condition, puzzleIndex: 0, nextAttempt: 0, phase: 'select',
        eventRefs: [], rankingRefs: [], panelRefs: [], nextPanel: 0 };
      await persist();
    }
    const a = state.active; assert.equal(a.condition, condition);
    while (a.puzzleIndex < rows.length && attempts < maxAttempts && !shouldStop()) {
      const row = rows[a.puzzleIndex], board = experienceBoard(row);
      const index = a.puzzleIndex * p.attemptsPerPuzzle + a.nextAttempt;
      if (a.phase === 'select') {
        if (condition === 'adaptive') {
          // Every legal candidate is present; teacher verification occurs after choice.
          const chosen = await assess(row);
          a.selected = chosen.review;
          a.selectionRef = await publish(`selection-${index}.json`, chosen);
        } else if (condition === 'fixed') {
          const experiences = (await load(p.fixedPlans[a.puzzleIndex])).experiences;
          assert.ok(experiences.length > 0);
          a.selected = experiences[a.nextAttempt % experiences.length];
          a.selectionRef = null;
        } else {
          const source = await load(state.adaptiveEventRefs[index]);
          a.selected = source.experience; a.selectionRef = source.selectionRef;
        }
        assert.equal(a.selected.context.fen, board.fen());
        assert.equal(a.selected.context.pgn, board.pgn());
        assert.deepEqual(a.selected.context.task, { objective: row.objective, plies: row.plies });
        a.phase = 'update'; await persist();
      }
      if (a.phase === 'update') {
        const experience = a.selected;
        let channel = experience.status === 'success' ? 'PAM02' : experience.status === 'failure' ? 'PPL103' : null;
        if (condition === 'absent') channel = null;
        if (condition === 'shuffled') channel = state.shuffle[index];
        const before = snapshot();
        const receipt = await brain.replay(experience, { channel, plasticityEnabled: condition !== 'disabled' });
        a.pending = { experience, selectionRef: a.selectionRef, channel,
          before, after: snapshot(), receipt, condition, puzzleIndex: a.puzzleIndex, attempt: a.nextAttempt };
        // Resume this phase without replaying a neural update.
        a.phase = 'receipt'; await persist();
      }
      if (a.phase === 'receipt') {
        a.eventRefs.push(await publish(`event-${condition}-${index}.json`, a.pending));
        a.pending = null; a.selected = null; a.phase = 'ranking'; await persist();
      }
      if (a.phase === 'ranking') {
        a.rankingRefs.push(await publish(`ranking-${condition}-${index}.json`, await assess(row)));
        a.nextAttempt++; attempts++; state.totalAttempts++;
        if (a.nextAttempt === p.attemptsPerPuzzle) { a.nextAttempt = 0; a.puzzleIndex++; }
        a.phase = 'select'; await persist();
      }
    }
    if (a.puzzleIndex < rows.length) break;
    // Final whole-panel assessment uses one frozen learned memory, including
    // effects of subsequent fixtures. No favorable within-fixture snapshot selection.
    while (a.nextPanel < rows.length && !shouldStop()) {
      const i = a.nextPanel, row = rows[i], learned = snapshot();
      const after = await assess(row), repeat = await assess(row);
      assert.deepEqual(after.assessment, repeat.assessment);
      brain.memory.restore(naive); const reset = await assess(row);
      assert.deepEqual(reset.assessment, (await load(state.baselineRefs[i])).assessment);
      brain.memory.restore(learned); const restored = await assess(row);
      assert.deepEqual(restored.assessment, after.assessment);
      const board = experienceBoard(row), frozen = brain.memoryFingerprint();
      const search = await searchMonteCarlo(brain, board, { ...p.search, seed: p.seed + i, guard });
      const searchReview = reviewCommittedChoice(board, uci(search.move), row, p.verification);
      assert.equal(brain.memoryFingerprint(), frozen);
      a.panelRefs.push(await publish(`panel-${condition}-${i}.json`, { row, after, repeat, reset, restored, search, searchReview }));
      a.nextPanel++; await persist();
    }
    if (a.nextPanel < rows.length) break;
    if (condition === 'adaptive') {
      state.adaptiveEventRefs = a.eventRefs;
      const known = [], indices = [];
      for (let i = 0; i < a.eventRefs.length; i++) {
        const e = (await load(a.eventRefs[i])).experience;
        if (e.learningAllowed) { indices.push(i); known.push(e.status === 'success' ? 'PAM02' : 'PPL103'); }
      }
      state.shuffleIdentifiable = new Set(known).size === 2;
      state.shuffle = Array(a.eventRefs.length).fill(null);
      shuffledFeedback(known, p.seed).forEach((channel, i) => { state.shuffle[indices[i]] = channel; });
    }
    state.results.push({ ...a, finalMemory: snapshot(), presentations: brain.presentations });
    state.active = null; state.conditionIndex++; await persist();
  }
  return { complete: state.conditionIndex === p.conditions.length, attemptsThisInvocation: attempts };
}

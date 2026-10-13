# Prompt for the successor model

2026-10-10 superseding direction: the researcher requested review of predecessors' evidence before further training. Completed diagnosis is [plasticity problem.md](../../plasticity%20problem.md), with [review notes](../../research/reports/plasticity-evidence-review-2026-10-10/review-notes.md) and [verification package](../../research/reports/plasticity-evidence-review-2026-10-10/README.md). The 32-pair proposal below remains unregistered and unrun. It is a possible future bounded question, not an automatic next launch. No learner repair, retention/reversal or transfer success is claimed by the diagnostic deliverable.

Verified handoff state: the four-pair run and audit are complete. All 215
software tests, 760 recorded frame replays and 130 final graph score rows pass.
The informative arm still chooses Qg8 incorrectly. Retargeting closes 15.4% of
the strongest-competitor gap versus 10.3% for equal-dose fixed targeting;
directionPass and adaptiveAdvantage pass, usefulChoice and causalChoice fail.
The inherited specificityPass is false because it compares the original Qg8
pair against the fixed-target arm too; read result.md for that distinct metric.
No 32-pair follow-up has been run. The original plasticity/reasoning goal is
unsolved; this handoff does not claim a working chess learner.

Work in `C:\Users\ethan\Documents\fly-chess-research`. Use ponytail. Read
`AGENTS.md`, then only these files initially:

1. `research/reports/adaptive-temporal-loop-2026-10-09/result.md`
2. `research/reports/adaptive-temporal-loop-2026-10-09/evidence.json`
3. `runs/adaptive-temporal-loop-v1-resumed/audit.json`
4. `research/reports/adaptive-temporal-loop-2026-10-09/README.md`

This handoff's plasticity-repair objective is a subgoal of the repository's overarching question: whether a simple organism-derived computational system can develop transferable reasoning, tested here through chess. Useful choices, retention, reversal and disjoint/counterfactual transfer are prerequisites within that question; this narrow handoff does not redefine the project as solving plasticity alone. See [the current research question](../design/research-goals/scientific-contribution.md).

My objective remains endogenous plasticity that produces useful chess choices,
retains learning, reverses verified contingencies and transfers to disjoint and
counterfactual positions. Do not claim success from changing gains or improving
a familiar-puzzle score. Training is authorized only for bounded, registered
hypothesis tests with independently checked consequence feedback. Do not freeze
the active learner's permitted plastic gains, import chess weights, fit an
answer-producing readout, or substitute engine search for learning.

Repairs already implemented and tested:

- `.codebase/src/puzzle-learning/adaptive-temporal-pair.mjs` selects the CURRENT
  unique verified top error, stops on success/ties/unknown, and pairs it with
  a separately verified success. Its regression includes Qg8 being replaced by
  Qd7. The previous gamma2 runner selected once and stopped after two lessons.
- `research/reports/adaptive-temporal-loop-2026-10-09/run.mjs` executes repeated
  pairs with persistent gains/traces. Swapped/absent/disabled arms replay the
  informative action sequence exactly. A fixed-target informative comparator
  has equal dose but deliberately different error exposures.
- The separate `audit.mjs` streams receipts, checks certificates, schedule and
  state continuity, replays local updates, and reconstructs final graph scores.
  Refer to evidence.json for the real prefix-interruption/resume comparison.
- All 215 software tests passed; the terminal log is software-tests.txt in the
  report directory. Do not rerun the suite without a relevant code change.

Discard these invalid inferences/proposals:

- A baseline-relative decoder ranking Qh7 first does not establish solved
  plasticity or prove MBON01 is the sole cause of failed absolute choices.
- Adding PAM02 pulses while retaining the gamma cue pool does not establish
  selective PAM02 plasticity. Static coverage: 120 gamma cue KCs, 84 PAM02
  eligible KCs, zero direct overlap. Recurrent effects remain untested. Six
  PAM02 cells per side also conflict with the proposed one-DAN timing adapter.
  The gamma2 rule has not been biologically justified for PAM02. No extension
  was installed; preserve the existing RateTimingMemory and frozen pins.
- Changing SparseTrainer seed does not replicate the direct-stimulation MBON
  path: its randomized input/head arrays are bypassed on this path.
- The previous empty-PAM graph probe was invalid and lacked resource guards.
  Do not repeat it or present its zeroes as evidence.

Start by checking authoritative processes and terminal result/audit files.
Never restart based on a stale lock or an observation timeout. Do not overwrite
completed run directories. Preserve unrelated worktree changes and all failures.

Use the audit to choose ONE next causal question. Inspect the saved trajectory
in evidence.json: a wrong action returning to first place can result from the
other wrong action being depressed, without erasure of its own learned change.
Do not add a freezing/stabilization mechanism based only on rank reversals.

If useful choice still fails, adaptiveAdvantage and directionPass pass, and the
gainRange is far from its bounds, the next justified question is whether the
remaining decision gap is reachable with a bounded amount of this same local
plasticity. Preregister ONE 32-pair condition from scratch in a NEW protocol
and output directory. Copy v1's model, cue, timing, memory, readout, sources and
five arms exactly; change only maxPairs to 32, schema/scope and the new dated
registration. The existing runner accepts maxPairs through 32 and the auditor
derives frame counts from the actual schedule; no new learner code is needed.
Pin the new registration. Use the same three-frame interruption/resume check
if changing orchestration; otherwise do not repeat that completed check.
Do not call the dose hypothesis proven in advance, alter gates mid-run, fit the
readout or silently extend the budget. If these prerequisites fail, report why
and inspect the specific failing evidence before launching anything.

Run command shape (fill in NEW paths, never overwrite v1):

```powershell
node --max-old-space-size=256 research/reports/adaptive-temporal-loop-2026-10-09/run.mjs --protocol NEW_PROTOCOL --out NEW_RUN --cpu-duty 0.5
node --max-old-space-size=256 research/reports/adaptive-temporal-loop-2026-10-09/audit.mjs NEW_RUN
```

A failed bounded run is a failed hypothesis at that budget; do not begin a
dose sweep. Even a useful-choice pass on this familiar fixture does not solve
the original goal. Retention/reversal and disjoint/counterfactual gates remain
required, with separate new registrations. A mechanism change needs a primary
source registered in source-solution-register.md and a causal control test.

Keep graph work serial and sparse: heap 256 MiB, RSS below 768 MiB, free RAM
above 256 MiB, duty 0.5. Preserve atomic pending-frame recovery and exact hashes.
Do not edit pinned sources while a run is active. Update the journal, decision
log and current status for actual findings and mistakes; current-status.md has
legacy invalid UTF-8 bytes, so preserve its bytes if a native append is needed.

Be economical: do not reread the whole project or create another broad research
plan. Implement and verify the next justified correction, report the outcome
honestly, and stop repeating completed checks. No promise that a working
reasoning model exists yet.

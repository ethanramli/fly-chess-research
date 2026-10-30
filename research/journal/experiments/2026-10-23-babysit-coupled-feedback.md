# Babysit coupled outcome/Stockfish feedback — 23 October 2026

The previous goal turn made implementation progress: registered post-interference
checks passed71/71. Current handoff/raw evidence is consistent; bare `fly status`
still reports `not_registered`, 0/12 accepted. This continuation targets the
feedback execution path, with G0 and stopped source expansion excluded.

## Discovered feedback errors

The isolated value prototype writes an engine-error pulse in its informative
condition but does not also deliver the verified task outcome. Outcome-only and
value-assisted conditions evaluate different numbers of neural candidates, so
their existing exposures are not matched. Terminal/silent child-value cases can
skip the entire informative event despite known task truth.

Call-path inspection also found that every planned failure/alternative/rehearsal
event is rebound to the learner's current top choice. That can teach the same
action twice instead of the planned failure/success pair, and controls can review
different actions and child boards. A tie prevents any event at all. Preserve the
old prototype as a separate comparison; do not reinterpret its receipts as coupled
teaching or alter their recorded actions.

## New prospective execution contract

Use a versioned coupled receiver/session for primary curriculum runs. Bind the
exact planned candidate and certificate, keeping the full fresh own ranking and
actual choice (including ties) separate. Evaluate the same root and planned child
in every arm before learning. Persist three frames: neural preparation, verified
task-valence pulse, and optional bounded Stockfish-error pulse. An unavailable
engine/neural estimate permits a neutral second pulse, never invented task truth.
Every arm receives the same candidate exposure and two cue presentations; absent,
disabled, outcome-shuffled and error-shuffled controls differ only as registered.
Persist each frame before acknowledgment so a crash after the task pulse cannot
duplicate it. Neural adaptation remains the existing local memory mechanism;
the teacher supplies no parameter deltas. This is an engineering hypothesis,
not newly validated biology or a graded-dose receiver qualification.

Old pinned71-check sources were copied after hash verification to
`research/source-archives/babysit-post-interference-software-v2-2026-10-23`;
the unpinned transitive review binder/brain constructors were additionally captured.
Original raw results and isolated prototype remain preserved. Implementation,
interruption and matched-exposure checks are pending. No learner/graph/Stockfish
experiment or G0 action was launched.

The first four focused checks passed matched six-mode exposure and candidate/
choice separation, but failed disk recovery and independent block replay on
metadata `-0` versus JSON's `0`. Failed fixture preserved at
`runs/coupled-feedback-fixture-50ead3e0-a850-44f6-a2d6-5b0dba5bdfcb`.
Canonicalize only JSON feedback metadata (neural assessments, value/error and
pulse diagnostics) before hashing/publication; preserve actual memory arrays
and all neural/plasticity math. Non-finite neural scores are rejected before
serialization. Rerun recovery/replay rather than weakening exact comparisons.

The four original focused checks then passed, including disk recovery and full
block replay. Two added checks exposed fixture mistakes: moving readouts onto
unstimulated cells did not make them silent because the numerical model has
positive baseline drive; and the low-level recovery test omitted its parent
directory, stopping with ENOENT before any update. Use a separately initialized
zero-readout numerical fixture and create the owned test directory. No production
model parameters or neural equations are changed by these fixture repairs.
Also bind the protocol to its fixed model/readouts and verify that identity
before preparation/pulses, reusing the factory's existing fixed-state hash.

The expanded focused suite passed8/8, and registered compatibility action v3
passed79/79 (exit0), raw artifacts
`runs/python-actions/20261023T132459-bd73fef7`. This proves engineering mechanics,
not that the teaching target is scientifically correct. A later semantic review
found an inherited target/cue error: predicting value on child-board action cues
while delivering the resulting error on a different root-action cue does not
train the exact quantity whose error was measured. Constant-cue numerical
fixtures did not detect that semantic mismatch.

Preserve v3 pinned sources, then version the prospective coupled protocol as v2.
Use a genuine public board-state cue (`action:null`) for both the child's neural
value prediction and its value-teaching pulse. Convert the root-actor error into
the child's side-to-move perspective. Keep the verified task pulse on the exact
root action. Every control gets the same root ranking, one child-state estimate
and two cue slots. Terminal boards can have an actual neural state estimate;
never substitute a known terminal label for a neural prediction. Add cue/context
and nonzero-perspective tests, rather than accepting the earlier green checks as
proof that the original method was adequate. No production training occurred.

The complete Stage 2 evaluator must remain read-only: actual interference learning
belongs in an explicit training phase before final audit. The currently exposed
prospective run callback is not yet invoked, but its placement in evaluator
arguments needs correction when stage-phase orchestration is implemented. This
is an unexecuted design correction, not an outcome or an authorization to train.

## Direct state cue correction implemented (v2 feedback contract)

Archived v3 sources existed before edits. The prospective coupled receiver now
predicts from one child-board state cue (action:null), then delivers its engine
error on that same cue with child-side-to-move polarity. The verified task pulse
retains the exact root/action context. The search evaluator now exposes a direct
state value separately from move priors, with explicit neutral fallback only for
silent state activity. Whole-event bounds cover root ranking, one state estimate
and two pulse slots. Protocol/session identities changed; v1 receipts cannot
silently resume into v2.

Focused software checks: 8/8 passed, 6478.7503 ms, including distinct state/action
stimulation hashes, child-side pulse polarity, terminal measured state versus
silent state, both crash boundaries and independent block replay. Numerical
fixture: runs/coupled-feedback-fixture-d7b0c019-c4eb-46a2-878f-e46c941ec234.
These checks do not establish biological dose validity, calibration, learning or
transfer. Broader v4 action is pinned separately; no production training started.

Recovery inspection: v3 completion.json confirms exit0. CIM process listing was
access-denied; Get-Process showed an unrelated node PID12268, distinct from v3
PID13916. No process was killed/restarted and no graph work was launched.
Two rg invocations used unsupported Windows glob paths; corrected to directory
searches. No data or experiment conclusions depend on those failed searches.

### v4 verification completed

Registered action runs/python-actions/20261023T134210-be916566 completed exit0:
79/79 checks, 123284.3376 ms. This covers the corrected cue/perspective path,
control matching, checkpoint selection, memory handoff, post-interference
promotion and independent replay with numeric/mock models. Pinned sources copied
only after every SHA256 matched into
research/source-archives/babysit-state-cue-feedback-software-v4-2026-10-23.
No production graph, Stockfish or G0 run occurred. Complete stage orchestration,
eligible data and campaign registration remain missing. Goal stays active.

The compact handoff had grown to746 lines, contrary to its120-line target.
Preserved the previous file as a linked dated handoff history and replaced the
active file with current evidence, exact remaining work and operational limits.

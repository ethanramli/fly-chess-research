# Curriculum G0 receiver preflight v1

2026-10-11. Continuation of the [first curriculum prerequisite](../../../documentation/design/puzzle-learning/principles-curriculum.md). **Receiver software and static preflight only; G0 remains unpassed. No graph dynamics or learner training ran.**

[Preflight](preflight.json) pins current graph, annotations, mapping and inspected source hashes. [Contingency table](contingencies.json) defines an explicitly synthetic two-action task: eight neutral contexts, four unrelated interference contexts, then reversed target contingencies. Reversal changes toy task truth, never a chess consequence. [Frozen schedule](schedule.json) supplies 32 acquisition, 16 intervening teaching and 32 reversal experiences per condition/replica. Every experience has an independently replayable table certificate; exhausted evidence is unknown and permits no teaching.

[Receiver](../../../.codebase/src/neural-learning/curriculum-g0.mjs) accepts public four-bit cues and A/B action only. Phase, outcome and certificate cannot enter the encoder. Three predetermined input projection seeds change selected released gamma KCs; **distinct evoked neural responses have not been measured**. The prospective readout must remain a fixed reference-relative MBON contrast using the existing declared engineering hypothesis; zero/ties count as incorrect. No fitted decoder or teacher-computed gain delta is introduced.

Informative, absent, matched-shuffled and disabled plans share cue dose, order and frame count. Shuffling preserves success/failure waveform-class counts separately within each phase/action stratum while breaking context contingency; all realized assignments are saved before any graph use. Absent removes external pulses while retaining activity-driven plasticity. Disabled delivers informative pulses while holding gains and every persistent trace fixed. Numerical cue/pulse timing is unchanged from the existing gamma2 candidate and is not biological elapsed time or natural reward.

The explicit neutral receiver subclasses the existing frame transaction session. It independently verifies neutral evidence and binds both unaided actions to current memory and the exact encoder; the chess receiver still requires all legal chess actions. Shared stimulus construction and frame/recovery code avoid duplicate update/persistence implementations. [Five inert-array test groups](../../../.codebase/tests/neural-learning/curriculum-g0.test.mjs) check forged/stale/unknown evidence, matched controls, partial-frame continuation, rollback and disabled state. These tests serialize published state in memory; they do not establish real disk fault recovery or behavioral learning.

Static annotation replay verifies 120 released gamma KCs, both PPL103 identities and 122 mapped edge entries. It reads root IDs only, without instantiating a model. Endpoint/sign and MBON readout-root verification remains required before an experiment. Peak preflight RSS: 63.824 MiB; heap256/RSS768/free256 guards were active. Exact command and hashes are recorded in preflight.json. No runtime speed improvement is claimed.

Reproduce the static check into a fresh directory from the repository root:

```powershell
node --max-old-space-size=256 .codebase/scripts/neural-learning/preflight-curriculum-g0.mjs --out research/data/my-fresh-g0-preflight
```

This command does not train. Next: freeze a sparse serial graph runner and full recurrence/receipt replay auditor, verify endpoints/signs/readout roots, measure effective replicas, fault-test atomic disk recovery and execute acquisition/interference/reversal with all matched controls. Apply the original G0 thresholds in every replica; no C01 advancement on software passes. Existing gamma2 compartment/receptor/normalization/timing approximations remain explicit; earlier failures and sealed curriculum final families are untouched.

The first full regression attempt was blocked by sandbox `spawn EPERM` before test execution; preserve [that log](software-tests.txt) and the separate [approved retry](software-tests-unsandboxed.txt). [Mistake/pivot journal](../../journal/experiments/2026-10-11-curriculum-g0-receiver.md).

[Completion verification](verification.json) confirms inspected source hashes, 229/229 regression and 21 checked new package/navigation links. It records four inherited broken navigation links separately; this is not a whole-repository link audit. The approved test log is UTF-16LE. All failed inspection, documentation and verification attempts are recorded in the journal.

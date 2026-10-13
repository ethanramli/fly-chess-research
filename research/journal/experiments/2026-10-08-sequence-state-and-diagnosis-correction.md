# Sequence state implementation and diagnosis correction

2026-10-08. Researcher requires documentation of every mistake and pivot; the standing rule is now in AGENTS.md.

## Mistake: requiring recovery specifically through omission

The selective-credit prerequisite protocol made gain increase during reward omission a recovery gate. That is an engineering condition, not a requirement derived from the proposed lesson design or established for every fly compartment. The prior answer overstated its significance. Preserve the protocol, result and prior diagnosis unchanged, with this correction linked. The monotonic equation cannot increase gain under any nonnegative local signal; that broader mathematical limitation remains. Its equal-dose reversal tie is established for the stipulated readout/schedule only, not a universal impossibility result.

Primary evidence inspected 2026-10-08: [Berry, Phan and Davis 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6239218/), abstract, introduction and results through the strong-shock restoration section. In the studied gamma2alpha'1 circuit, later DAN activation can restore depressed responses; conditioning another odor can also disrupt earlier memory. Restoration depends on conditioning strength. This supports bidirectional dynamics and warns about interference, rather than supplying an omission-only rule or validating our mapping/equation. Later fetch encountered a browser challenge; do not imply supplementary data or full methods coverage. Handler full-text request was also challenged; no new full-text claim.

## Pivot: implement neural continuity before a replacement plasticity experiment

`SparseTrainer.forward` previously always cleared initial neural state. Consequently repeated encoded boards could not constitute continuous neural experience. It now accepts an optional bounded initial state, preserving reset behavior for all existing callers. A separate `NeuralEpisode` carries one neural state vector between frames, explicitly begins/ends episodes, caps frames at 32 and neurons at 262144, and snapshots/restores transient state under a caller-supplied pinned identity and frame hashes. No new dependencies or parameter updates. No biological time calibration.

Meaningful numerical tests establish exact equality between two continuous two-step frames and one four-step unroll, default-reset compatibility, fixed parameter/sign preservation, frame-budget enforcement, exact next-frame continuation after serialized restore, and fail-closed invalid state/input handling. Full npm test: **170/170 pass**, elapsed 10.752 seconds.

This is an engineering prerequisite, not a complete neural receiver. Caller must validate board/history/frame semantics and bind graph/model/memory/encoder identities. The helper does not validate certificates, model eligibility/receptors, atomically publish memory/pending receipts, guarantee crash recovery or deliver verified feedback. No graph experiment or biological retention/transfer result. Next: integrate certified bounded lesson frames with source-supported local plasticity and freeze an informative controlled experiment. Old gamma4 and reversal-gain implementations and failed experiments remain untouched.

Previous failed branch report: [selective-credit prerequisite](../../reports/selective-credit-prerequisite-v2-2026-10-08/README.md). The goal remains active; 8/10 is unproved.

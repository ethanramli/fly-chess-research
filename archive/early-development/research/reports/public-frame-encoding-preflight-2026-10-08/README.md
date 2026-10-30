# Public frame encoding preflight

2026-10-08. Command: `node --max-old-space-size=256 .codebase/scripts/chess-input/check-public-frame-encoding.mjs --out research/reports/public-frame-encoding-preflight-2026-10-08`.

[Raw result](result.json) binds encoder source, runner and historical mapping-file hashes. This is a symbolic encoding check only: no graph loaded, zero neural graph presentations, no feedback/plasticity, no retention/transfer experiment. No final families opened. The existing historical mapping is a coarse computational mapping, not a newly validated compartment/receptor assignment.

The public frame encoder consumes only schema/FEN/PGN/task/action, validates exact history/FEN and legality, and accepts action-free terminal boards. It hashes public piece occupancy, turn, rights, en passant, clocks, bounded chronological moves and optional action into the existing mapped KC pool; reports collisions and dropped features. It includes no safety, outcome, attack oracle, teacher score, certificate or chosen solution feature. This is engineered symbolic stimulation, not modeled vision.

Two historical training contexts use the same action a1a4 and changed blocker placement. Independently rechecked immediate capture retention is failure/success respectively. Their root stimulation differs. All six frames have zero collisions and zero dropped features in the 693-cell pool. This does not establish non-aliasing generally; crowded positions/long histories can alias or lose features under the 64-cell cap. Endpoint/defense sequences differ and are illustrative; a line alone does not prove exhaustive defensive coverage.

Full project tests **174/174 pass**, 10.1564752 seconds. Tests additionally cover a checkmated action-free endpoint, exact deterministic encoding, forged history, illegal action and teacher-label rejection, bounded current/cell count and distinct projected endpoints in a declared synthetic pool. These are engineering tests, not biological or learning evidence.

Pivot: introduce a separate versioned public-frame encoder instead of forcing terminal boards through a candidate-only encoder. Existing relational/bound-ray encoders and frozen runs remain unchanged. Absolute square geometry preserves occupancy but removes no symmetries; translation/reflection transfer remains an empirical requirement and must not be claimed from these checks.

Mistake: initial preflight passed the entire historical mapping report into the constructor instead of its `.mapping` member. The constructor rejected it before inference or output creation; corrected by inspecting the actual report shape, using its nested mapping in the reproducible runner. No evidence or gates modified to conceal the error.

Next: pin the frame encoder with the sequence receiver and implement measured delayed local eligibility and a compartment-supported reversible mechanism. Pre-feedback unaided ranking and atomic receipt/checkpoint integration remain required before a feedback-enabled graph assay. No 8/10 result claimed.

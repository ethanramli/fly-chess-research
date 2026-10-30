# Stage 2 validation-only checkpoint selection - 23 October 2026

## Implementation

Added a selector for the explicit pre-audit training phase. It loads pinned
training and validation panels only, requires a matching acceptance-data audit,
replays every bound consequence, checks train/validation family identity
separation and requires the four Stage 2 semantic strata. Final rows/families are
hash references only and are never opened by selection.

For each informative published checkpoint (8/16/24/32), measure16 current
validation choices,16 previous-foundation validation choices and4 previous
training sentinels. Reproduce incoming earlier mastery (14/16 and4/4), reject
regression, choose the earliest passing checkpoint and yoke every control to that
block without requiring controls to pass. Freeze an acquisition-bound artifact
atomically, with exact checkpoint, memory and ranking hashes. The Stage 1
read-only helpers are reused; its restore helper now accepts a stage argument
(default1) without changing old Stage 1 behavior.

## Evidence limits and remaining work

The selector is not the final Stage 2 evaluator. It does not run interference,
open final families, accept a stage or establish learning. The registered
acceptance evaluator must re-export/use this selector and independently audit
post-interference retention, final counterfactual choices and controls. All
production data and a complete campaign remain unregistered.

Tests use repeated template boards, fabricated source/family metadata and a mock
policy with actual chess certificates. They cannot establish valid family splits,
biological learning or reasoning. Tests exercise source pins, final sealing,
failed baseline retention, candidate regression and matched control selection.

## Inspection mistakes

An rg search repeated an unsupported Windows wildcard path and a guessed module
name was absent. Corrected with rg --files. An inline node diagnostic lost quotes
through Windows argument transport; a subsequent diagnostic guessed the wrong
node_modules location. The corrected stdin script imported chess.js normally and
confirmed the avoid-mate fixture has11 failing and2 successful legal actions.
Those failed commands changed no experiment or data conclusion.

## Verification

Focused checks currently running under unified-exec session16986. No production
neural, Stockfish or G0 experiment launched. Preserve actual result before claim.


Focused selector checks passed3/3 (43441.698 ms). Then removed unnecessary
control-baseline evaluation when the informative arm has no selectable checkpoint;
controls cannot be selected independently. Registered v6 checks include that
change plus Stage 1 helper compatibility and phase/selection regressions. No
production runtime starts during these tests.


## Review correction pending v6 completion

The initial selector maps every unsuccessful selection to gate-failed, including
missing published checkpoint evidence. That conflates unknown with a measured
shortfall. After v6 finishes and its source is preserved, distinguish unknown
informative selection from measured failure; matched controls skipped because a
measured informative failure has no selected block must not change that measured
failure to unknown. Add a missing-candidate test. No production decision used
this initial status mapping.

V6 completed13/13, exit0, 53324.4846 ms; raw action runs/python-actions/20261023T135800-9632fe8f. Exact pinned sources preserved in the v6 source archive before the status correction.


Status correction implemented after v6 archive: unresolved informative selection
returns unknown; a measured informative shortfall stays gate-failed even when its
unselectable controls are skipped. Added missing-candidate coverage. Registered
v7 run is active at runs/python-actions/20261023T135944-e00408d0 (session67346).

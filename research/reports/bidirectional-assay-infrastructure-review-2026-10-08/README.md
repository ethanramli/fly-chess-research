# Independent review of bidirectional assay infrastructure

2026-10-08. **Verdict: partial completion; the infrastructure is not ready for approval as complete.** The stop gate works and the author accurately identifies missing physiological/anatomical support, certified reversal contexts, resolved model identities and a graph adapter. Those are justified scientific blockers. Additional software defects weaken exact-recovery, control-isolation and behavioral-audit claims even within the preparatory scope.

No graph load, neural forward pass, training or prospective learner simulation occurred in this review. Submitted source, protocols, pins and original results remain unchanged. Additional checks use inert counters and synthetic receipt records.

## Findings and required repairs

1. **P1: pending resume repeats stateful assessment.** The coordinator publishes pending state after assessment and pre-feedback readout. Recovery restores that state, then executes both calls again at the same slot instead of using its durable pending receipt. The interface allows stateful calls. An inert fixture ends at physiological value 3/transient count 2 uninterrupted, versus value 4/count 3 resumed, despite equal recorded exposure. The supplied fixtures leave assessment/readout state unchanged, hiding the defect. Repair: resume at the explicit saved stage using durable assessment/readout/receipt/counters; reverify evidence without replaying completed neural exposure. Require uninterrupted-versus-interrupted equivalence using stateful fixtures.
2. **P1: disabled-state isolation excludes assessment and readout.** Physiology is captured after assessment/pre-readout; its isolation check stops immediately after delivery, before post-readout. Assessment/readout receive no plasticity-disable flag. An inert assessment increments physiology; the disabled arm finishes at value 2 from 0 and the coordinator accepts it. Repair: enforce the disabled condition across all stages and check all registered persistent-state hashes for the entire slot, including probes and unknown paths, while permitting declared transient activity.
3. **P1: behavioral auditor accepts altered margins.** The auditor verifies proof and pre-feedback ranking structure, but margins only need to be finite. It neither derives before/after margins from bound behavioral evidence nor checks `change` or committed per-record hashes. No post-feedback ranking is recorded. Changing informative margins to -100/+100 passes the audit and changes acquisition acceptance with certificates/rankings untouched. The CLI hashes logs as observed, without comparing a prior committed log digest. Repair: record bound pre/post behavioral evidence and metric definitions, derive margins independently, and bind acknowledged receipt bytes to durable publication digests. This shape/control audit does not establish neural update correctness.
4. **P2: per-cue gates merge different boards with the same move.** `evaluateAssayGates` keys cues and control comparisons on action text alone. Two boards sharing `a1a4`, one improving 0 to 0.1 and another regressing 0.2 to 0.1, become one +0.1 acquisition result and pass. Repair: use context/action/task-bound cue identities and explicitly registered links for reversal; evaluate each criterion separately. The current one-board fixture masks this future multi-context defect.
5. **P2: future run branch calls undefined `resolve`.** The runner calls `resolve(args.adapter)` twice without importing it from `node:path`. Once all stop gates pass, the branch throws before adapter import. Syntax checks cannot detect this undefined name. Repair the import in a separately pinned revision and exercise the passing CLI branch with an inert adapter. Current blocked preflight merely prevents reaching the bug.

## Verification and limits

Re-ran the supplied ten fixture groups: all pass. Re-ran static preflight: expected exit 1; all 21 pinned hashes match; mapped identities and known certificates pass; unknown is nonteachable; exact feasibility-report hash matches and gate remains blocked. Protocol errors include unresolved identities/model and missing certified two-direction reversal schedule.

The static audit joins released DAN identity/type/class/side and inspects existing mapped signs; it does not establish physiological bidirectionality, receptor/compartment identity or stabilization timescale. These remain unresolved independently of the software findings. The reviewed protocol remains a narrow one-reply capture-retention development fixture, without certified reversal; it is not the complete planned mechanism assay.

Additional inert fixtures reproduced findings 1–4. Finding 5 is static inspection of the runner import list and run branch. No graph-backed adapter exists; these checks do not show actual learner outcomes or establish that every eventual adapter would trigger every defect. They show that the infrastructure does not enforce its advertised contracts.

Raw review artifacts: [fixture source](inert-review-fixtures.mjs), [initial evidence](inert-review-results.json), [extended evidence including disabled isolation](inert-review-results-v2.json). Initial evidence is preserved; extended source adds the disabled case. Current source refuses overwriting v2 evidence; repeat using a separate copy and fresh output path. Temporary checkpoint trees are retained at the paths recorded in each evidence file.

Commands executed:

```powershell
node .codebase/tests/puzzle-learning/plasticity-mechanism-assay.test.mjs
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bidirectional-plasticity-assay.mjs --preflight --anatomy-report research/reports/plasticity-signal-anatomy-preflight-v2-2026-10-08.json
node --max-old-space-size=256 research/reports/bidirectional-assay-infrastructure-review-2026-10-08/inert-review-fixtures.mjs
```

Next work: repair coordinator/auditor contracts in a new reviewed and pinned revision; demonstrate stateful recovery equivalence and rejection of the failing control/audit cases. Continue physiological/anatomical investigation separately. Training remains prohibited in this review.

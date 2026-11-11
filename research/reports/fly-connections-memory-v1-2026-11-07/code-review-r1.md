Fix the four **BUILD** items below before starting the dry run. The requested tests passed: **125/125**.

### A. Property 1: implementation

**Mostly yes, as a computational approximation.** The condition adds current to its mapped DAN indices, then reads KC and PAM07 rates from the single actual endpoint; the update uses those rates with zero reference and the fixed `ReversalMemory` rule. The off arm skips updates; the absent arm receives no external pulse but still applies endogenous updates. The score is the fixed MBON05 rate from a candidate’s cue; verified outcomes are used afterward for metrics, not to calculate the score. [teaching module](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-teaching-v1.mjs:94), [condition module](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-condition-v1.mjs:164), [ReversalMemory](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/reversal-memory.mjs:78)

The external current is added to the 18 mapped PAM07 indices. The rule follows the published DPR form, with disclosed rate scaling, population averaging, bounds, and endpoint timing; it is not a full Incentive Circuit replication. [condition module](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-condition-v1.mjs:16), [Gkanias et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC8975552/) [**BUILD:** independently authenticate and pin the receiving masks, roots, graph signs, and source mapping before graph use; revision 2 explicitly leaves that check open.](/C:/Users/ethan/Documents/fly-chess-research/research/reports/fly-connections-memory-v1-2026-11-07/design-review-r2.md:34)

### B. Shared experiences and passes

All arms use the same seed tape and event order. Shuffling permutes pulse booleans within each phase while preserving that phase’s count; the dry-run tape records matching counts in A, R1, B, and R2. [tape builder](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-packet-v1.mjs:205), [dry-run packet](/C:/Users/ethan/Documents/fly-chess-research/runs/fly-connections-memory-2026-11-08/packet-dryrun/packet.json)

**But observation-pass counts differ:** the off arm reuses T0 rankings at intermediate checkpoints, while other arms rank again. Revision 2 requires equal observation/replay pass counts. [revision 2](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-revision-2-2026-11-07.md:41), [job loop](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-job-v1.mjs:73)  
**BUILD:** rerank those checkpoints in off, or formally revise the protocol and its pass-budget comparison before data.

### C. Scoring, clues, and separation

Every ranking scores every legal move; the scorer rejects missing or duplicate legal actions. Quiet and king moves remain in the ranking. Group assignment hashes game IDs before neural data; the packet builder rejects cross-group game reuse, board-key collisions, and rendered-input collisions. [condition module](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-condition-v1.mjs:205), [packet builder](/C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/prepare-fly-connections-packet-v1.mjs:101), [config builder](/C:/Users/ethan/Documents/fly-chess-research/runs/fly-connections-memory-2026-11-08/inputs/make_packet_configs.py:15)

The listed clues are candid about guaranteed safe and unsafe captures, teacher-selected practice, and shared boards across seeds. Still, describing these as “new positions, no clues” overstates it: test boards are selected for this capture task, so they do not represent an unrestricted unseen-game distribution. [gates](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-gates-2026-11-08.md:5), [packet selection](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-packet-v1.mjs:137)

### D. Gates and red criteria

The judge implements 0.70 A-margin retention at T_AB and final, B acquisition against T_B0, overwrite pressure, R correction, and Property 3 comparisons against off and shuffled plus the primary’s own T0. A/B test strata are reported separately, but only their combined Property 3 effect is gated, as revision 2 specifies. [metrics](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-metrics-v1.mjs:85), [judge](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-judge-v1.mjs:209), [gates](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-gates-2026-11-08.md:37)

**Property 2's second criterion is incomplete:** it tests A/B success against absent, off, and shuffled at B-end, but not improvement in success from each group’s own prelearning checkpoint. Criterion 1 can pass through improved margins while success stays unchanged; criterion 2 can pass if controls are worse. Thus Property 2 can pass without the revision 2 requirement that A/B success improve from its own baseline. [revision 2](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-revision-2-2026-11-07.md:55), [judge comparison](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-judge-v1.mjs:217)  
**BUILD:** add the own-baseline success comparisons for A and B to both judge and auditor, with corruption tests.

### E. Auditor and corruption tests

The auditor has its own score, update, retention, pressure, and gate arithmetic; it imports no producer metrics, judge, or job module. The requested corruption tests passed, including altered updates, missing events, wrong pulses, dropped legal moves, flipped verdicts, and over-limit RSS.

Two limits remain: bootstrap bounds use the same `numericPairGate` function as the producer, so that arithmetic is not independent; graph replay checks only the first four events and two sorted test boards, using the producer condition implementation. [auditor arithmetic](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-audit-v1.mjs:324), [shared bootstrap import](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-audit-v1.mjs:8), [replay check](/C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/audit-fly-connections-memory-v1.mjs:40)  
**BUILD:** independently recompute the bootstrap gate. Before confirmation, expand replay coverage across learning phases and pulse conditions; current replay is a bounded spot check, not a full replay of actual rates.

### F. Persistence, resources, and pins

Exactly-once resume is implemented by truncating records to the acknowledged byte count, restoring the snapshot, checking its fingerprint, and continuing; the interruption/resume test passed. Writes use partial-file rename, and the runner starts no replacement worker after failure. Per-worker guards check RSS/free memory around forwards; results are checked against the limits. [file contract](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-file-formats-2026-11-08.md:63), [runner](/C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/run-fly-connections-memory-v1.mjs:70), [worker](/C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/fly-connections-memory-v1-worker.mjs:37)

Runtime code and data inputs are extensively pinned, but the independent auditor script/module and the gates document are not pinned in the registration. [pin contract](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-file-formats-2026-11-08.md:24), [registration](/C:/Users/ethan/Documents/fly-chess-research/python%20actions/fly-connections-memory-v1-dryrun-step.json:49), [audit pin check](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/fly-connections-audit-v1.mjs:796)  
**LAUNCH:** pin the audit implementation and frozen gate specification in the full-run registration.

### G. Declared cuts

- **Off-arm ranking reuse:** not acceptable under revision 2’s equal-pass requirement; treat as **BUILD**.
- **No v8-style KC-key store:** not needed for these three properties, but revision 2 explicitly includes it as a comparison. Restore it or document the scope change before confirmation: **LAUNCH**. [revision 2](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-revision-2-2026-11-07.md:73), [journal item 12](/C:/Users/ethan/Documents/fly-chess-research/research/journal/experiments/2026-11-07-fly-connections-memory.md:103)
- **Second-branch geometry:** outside the three property gates; revision 2 includes geometry stress cases. Restore them or explicitly narrow the full-run scope and claims: **LAUNCH**. [revision 2](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/fly-connections-memory-v1-revision-2-2026-11-07.md:35)

**Next:** resolve the BUILD items, then run the dry run and its independent audit.

**LAUNCH OK WITH REQUIRED CHANGES**

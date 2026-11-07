# long-term-memory v1

**Component name assigned by the researcher, 2026-11-01:** `long-term-memory v1`. This names the bounded engineered memory component implemented as `EpisodicConsequenceMemory` in `episodic-consequence-memory.mjs`. It is a component version, not a numbered trained Fly release or a claim that biological long-term memory, live integration or reasoning has been established. Keep the original implementation paths, snapshot schema and experiment identities unchanged so the completed evidence remains reproducible.

2026-11-01. Volume 3 engineering condition. **The bounded exact-cue store passes its prospective recall/revision check on all six preserved development traces.** A separate Python implementation reproduces every prediction, update and published state. This bypasses one storage collision mode; it does not repair the old synaptic mechanism or establish reasoning.

## What changed

The diagnosed neural failure is conflicting writes to shared KC-to-MBON state, not neurons erasing other neurons. The earlier six-synapse state restoration rescues an old association at a reversal cost. Rather than force both associations through those same values, the new [external memory module](../../../.codebase/src/neural-learning/episodic-consequence-memory.mjs) addresses entries by the entire sparse candidate input pattern. Shared neurons can participate in multiple distinct keys.

Only the chosen candidate's independently checked consequence is written. New verified evidence revises the matching key, retaining two bounded versions. Other keys remain unchanged until a declared capacity eviction. Unknown produces no write; exact duplicate retries are idempotent. A previously unseen cue returns unknown rather than guessing. This uses no backpropagation, fitted head, pretrained weights, new graph edges or alteration of old neural checkpoints. It is an external dictionary that directly supplies consequence scores, not a learned physiological memory.

## Prospective experiment and result

[All-condition comparison and per-seed results](results.html).

[Protocol](protocol-v1.md), [registered replay](../../../python%20actions/engineered-episodic-memory-v1-step.json), [source](../../../.codebase/scripts/neural-learning/replay-episodic-consequence-memory.mjs), [raw results](../../../runs/memory-retention-2026-11-01/engineered-episodic-memory-v1/result.json), [streamed receipts](../../../runs/memory-retention-2026-11-01/engineered-episodic-memory-v1/receipts.jsonl). Completed outputs must not be relaunched/overwritten.

The six development seeds use four arbitrary associations, each with two candidate sparse relay patterns. Replay preserves the original chosen actions, known/unknown events and exposure order. Memory predictions are recorded before feedback but do not influence those choices. This is an off-policy replay, **not** six new closed-loop learning runs. FENs are fixture bindings, not memory keys; the consequences teach no chess fact.

At capacity 128, every item in every seed has a correct ranking after final acquisition, source delay and reversal. Item 0 reverses while items 1-3 remain correct, including seed 4102 item 3. Capacity 8 also passes this fixture without evictions; smaller capacities lose older entries. Absent and disabled memories remain empty. Matched-shuffled feedback does not pass the joint criterion in any seed. All per-seed/item outcomes and unknown candidates are preserved, including intermediate acquisition states.

The registered replay completes in 39.47 seconds, with 81.62 MiB peak sampled RSS and zero graph passes. Limits stay at 180 seconds, 2048 MiB RSS, 256 MiB free, duty .5 and node heap 256 MiB. Do not compare its speed with a graph experiment doing a different workload.

## Independent arithmetic reconstruction

[Python auditor](../../../python%20actions/audit_episodic_replay.py), [registration](../../../python%20actions/engineered-episodic-memory-audit-v1-step.json), [audit output](replay-audit-v1.json). It imports no JavaScript memory/producer code, reconstructs raw synthetic feedback bindings, separately implements the shuffle and exact-cue dictionary, and checks 5,040 trial receipts, 3,150 accepted events, 1,008 item evaluations and all 252 saved snapshots. It verifies inputs/publications before and after. The same continuing agent wrote the implementations; separate arithmetic implementations are not independent reviewers or independent error processes. No neural responses are regenerated.

[Three focused software checks](../../../.codebase/tests/neural-learning/episodic-consequence-memory.test.mjs) cover unrelated-key protection during revision, immutable queries, unknown/duplicate/stale handling, bounded eviction, validated restoration and continued-state equality. Full `npm test` completes with 759/765 passing and exactly the same six named historical failures as the earlier regression; no complete-suite pass is claimed. [Verification summary](software-verification-v1.json), [raw UTF-16 test log](software-tests-v1.txt).

## Limits and what follows

- **Known inputs only.** This is already a lookup-only controller. The result demonstrates exact-cue storage/revision, not transfer, concept composition or a connectome advantage. New/noisy cues abstain.
- **Observable identity matters.** Two experiences with exactly the same cue receive the same address. Contradictory evidence for that address changes its newest value. If both contexts must coexist, the input needs an observable distinction; hidden task IDs cannot manufacture one. The software fixture demonstrates that addressing uses full patterns, not cell-wise independent values.
- **Finite capacity.** Forgetting is explicitly visible as eviction, rather than hidden in unrelated synaptic changes. Eight addresses suffice for this small fixture, not for chess in general. Two historical versions per retained address are not an unlimited archive.
- **Stable keys.** Saved relay codes are fixed before the episodes. Future integration must freeze/version the encoder or explicitly handle key drift; indexing only on mutable post-learning activity can reintroduce retrieval failure.
- **Delay scope.** No decay is implemented. Unchanged memory across source noise frames is deterministic persistence, not biological consolidation or real-time retention.
- **Persistence scope.** The runner atomically publishes snapshots plus pending receipts before acknowledgement and verifies round-trips/retries. It does not implement unattended crash recovery into a new run; do not advertise that untested workflow.

Next: introduce this as a clearly labelled memory-backed value component in a new, pinned closed-loop experiment. Declare how exact retrieval and neural scores arbitrate before running it; do not silently replace the graph's scores. Then test unfamiliar combinations/counterfactuals against the same lookup-only controller and no-memory system. The original biological long-term-memory question remains unresolved.

Primary source adaptation: [Blundell et al. 2016, section 2](https://arxiv.org/html/1606.04460), bounded nonparametric memory and the direct-return alternative; this version omits nearest-neighbour extrapolation and replaces best-ever return with revisable observed binary consequences. [Public source evidence and access receipt](source-evidence/access.json), [source register](../../literature/source-solution-register.md). No claim of biological fidelity or original benchmark reproduction.

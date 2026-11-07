# Bounded engineered memory: prospective preserved-experience replay

2026-11-01. Volume 3 engineering condition, authorized by the researcher's explicit acceptance of engineered memory. This is not a biological storage repair, a graph learner run, closed-loop acquisition, held-out generalization or reasoning evaluation.

## Causal target and mechanism

The audited seed-4102 failure involves conflicting changes at six shared KC-to-MBON synapses. Slowing or protecting those shared values preserves a trade-off. Bypass that compression by storing separate records addressed by the **whole observed sparse input pattern**, rather than each active neuron independently. Shared cells do not imply identical whole patterns.

Use `EpisodicConsequenceMemory`: a bounded exact-cue dictionary outside the graph. Sort copied `(neuron_index,current)` pairs, retaining their numerical values, as the address. The frozen graph-index and encoder identities remain bound by the replay manifest. No FEN, association ID, phase, correct move or source truth label enters the address or query. An exact-address match returns the newest verified signed consequence; an unseen address returns unknown/neutral. No similarity generalization is claimed. Distinct input vectors retain independent entries; identical vectors are indistinguishable without additional observable context. This limitation must be tested, not hidden by oracle allocation.

At most 128 addresses, at most 64 features/address, two recent events/address. New evidence for an existing address updates only its two-event bounded version history. If a new address fills capacity, explicitly evict the least recently **updated** address; reads do not change recency. No indefinite archive is retained in resident state. Stream complete evidence receipts to disk. Positive and negative consequences may replace one another; do not retain a best-ever positive return that cannot decrease.

Each accepted event contains a monotonic sequence, signed consequence and evidence hash. Unknown is no write. An exact retry of the last accepted event is idempotent; stale or conflicting sequences are rejected. Snapshot checksums and structural validation precede restoration; invalid restore must leave live state untouched. Publish snapshot plus the pending accepted receipt atomically before acknowledgement. This one-shot replay does not authorize an unattended crash-resumable training runner.

Source: Blundell et al. 2016, [Model-Free Episodic Control](https://arxiv.org/html/1606.04460), section 2 equations 1-2 and section 3, accessed 2026-11-01. The source supplies bounded nonparametric state/action memory and explicitly discusses storing the current return without the maximum. Adaptations here: state-action candidate represented by an existing sparse relay cue, exact-only lookup, latest verified binary feedback rather than discounted return, two versions, least-recently-updated eviction and strict receipt handling. These are engineering choices for deterministic association reversal, not a reproduction of its Atari/hippocampal results or supported fly physiology. No VAE, pretrained representation or backpropagation is used.

## Data and matching

Use only the six already published **development** informative-arm streams, seeds 4101-4106, in `eye-graph-memory-cubic-v1-recovery1`. Require the preserved passed local replay audit, pin all six streams and manifest/summary/records/audit before execution, and verify hashes again at completion. Do not open confirmation or final chess families.

The saved `start.items[].images[]` provides the immutable sparse relay cues. These are external input currents built from a naive eye pass and rank relay, not an independently learned semantic representation or newly recorded full-graph response. Source associations are arbitrary consequences on chess-shaped images; the fixture does not establish chess knowledge.

Replay only the source's chosen candidate and exact sequence of trial events. Before storing each known event, the harness independently verifies the synthetic criterion against the phase assignment, exact board, both moves, chosen move and known/unknown flag. The memory receives only the chosen cue, signed feedback, event sequence and evidence hash. Do not teach the unchosen alternative or infer its label in the memory. Record both candidate memory scores before each feedback event. Source teacher mappings are allowed only in the verifier/evaluator.

On this **same exposure trace**, run informative, absent, within-block matched-shuffled and disabled-memory arms. Shuffle only known signed events inside each 24-trial block with a fixed seeded permutation; preserve unknown locations and positive/negative counts. Absent and disabled arms receive no committed evidence. These are exposure-matched off-policy replays, not new trajectories from each controller. The memory's prediction never changes the source's choices. Report their identical no-write behavior honestly.

Evaluate after every original block (`T0`-`T3`), source noise/delay (`Delay`) and reversal (`Rev`). Test all four items and both candidate cues; truth is used only to score the resulting ranking. Report unknown candidates and every seed/item. Source delay is an event interval, not a biological clock; this external store has no passive decay. Frozen storage through a no-write delay is deterministic persistence, not measured biological retention.

## Predeclared checks and rejection

Primary engineering pass at capacity 128: all four associations rank correctly at `T3`, `Delay` and `Rev` in every seed, including old item 3 in seed 4102; reversal must change item 0 while the other three remain correct. Report failures without tuning. Also require control outcomes, no mutation on reads/unknowns, retry idempotence, exact snapshot round-trip and an independent dictionary replay. A pass establishes bounded exact-cue recall/revision **on already experienced inputs** only.

Capacity sensitivity: repeat the same trace at 2, 4, 8 and 128 addresses for the informative arm. Preserve evictions and all results, rather than claiming unlimited capacity. Include a deliberate identical-cue/conflicting-outcome software fixture and an unseen-cue abstention fixture; failure to distinguish genuinely identical inputs is expected and must remain explicit.

This is already a lookup-only controller, so any memory success is attributed to external lookup. It cannot demonstrate a connectome reasoning advantage. A future reasoning study needs a frozen graph-plus-memory integration, disclosed arbitration, unfamiliar combinations/counterfactuals and matched lookup-only/no-memory controls. Do not patch old graph code or write these predictions into old neural checkpoints.

Limits: node heap 256 MiB, RSS 2048 MiB, free memory at least 256 MiB, duty .5, wall 180 seconds; one stream at a time, bounded metadata, no dense adjacency/workers/dependencies. Fresh output only, atomic publications, preserved errors. Software checks and this replay do not select a numbered trained Fly release.

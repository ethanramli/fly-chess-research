# long-term-memory v1: prospective live integration pilot

2026-11-01. Researcher instruction: integrate, compare and document. This is one bounded development pilot, not a final reasoning test, biological memory validation or a trained Fly release. Preserve all previous experiments and the named memory component.

## Systems and fixed arbitration

Use the existing full sparse graph, signs/roots, eight-step rate dynamics, LocalCubicReservoirMemory and fixed MBON05/MBON07 readout from the prior development runner. No backpropagation or trained head. Load the four saved seed-4102 fixtures and frozen sparse relay codes from the audited development start receipt; independently bind their board, moves and input hashes. This reuses graph-derived descriptors, not an independent perception baseline.

Let `v` be the existing neural readout `0.8*(1 - responseSum/naiveSum)-0.32`. Map it to `n=clip(v/0.32,-1,1)` using a fixed engineering scale, not a fitted calibration. long-term-memory v1 returns the latest observed signed consequence for an exact cue, or unknown.

1. **Fly + memory (`fly-memory`):** known exact recall has precedence; otherwise use `n`.
2. **Memory-only readout (`memory-only`):** known recall has precedence; otherwise score zero.
3. **Fly-only readout (`fly-only`):** always use `n`; external writes are disabled.

All three receive the same frozen graph-derived cue descriptors. All execute the same number of graph forwards and local observation slots; memory-only executes the graph as an unused shadow to match compute. Thus the comparison isolates use of the live neural score, not whether the whole pipeline has ever used the connectome. Realized wall/CPU times and RSS are recorded rather than presumed identical. Episodic operations differ by their declared ablation. Memory retrieval directly ranks actions and must be disclosed as an external controller.

Choose between the two candidate actions with the existing logistic temperature .1. Use the same independently seeded random draw at each trial in every arm. Each arm actually acts on its own current scores and gets feedback about its own choice; do not replay another policy's choices.

## Conditions and feedback

Run one sentinel development seed, 4102, selected prospectively because it contains the diagnosed old-memory loss. Conditions, in order: informative Fly+memory, informative memory-only, informative Fly-only, then Fly+memory absent, matched-shuffled and disabled-learning. Controls apply to the combined system only; this is not a full factorial study. No extrapolation to other seeds or superiority claim from a single pilot.

For the informative systems, independently verify the synthetic assigned-action criterion for the exact displayed board/history fixture, both candidates, chosen candidate and phase. This is an arbitrary association task on chess-shaped inputs, not a chess consequence certificate. The learner gets only the chosen consequence. Every eighth trial is unknown and produces no teacher event or episodic write. Teacher evidence and its delivered small signal remain separate.

The modeled DAN pulse uses the **neural** chosen-value prediction and unchanged predictionScale/V0=1.2, not the external recalled score; lookup must not silently remove neural teaching. Episodic writes receive the verified signed consequence. The absent condition delivers no event; its neural observation dynamics may nevertheless drift under the existing rule and this must be reported. The shuffled condition permutes the informative combined arm's known signals within each block, preserving counts and unknown locations, while retaining actual consequence certificates separately. The disabled-learning condition receives the actual informative pulses but changes neither neural nor external persistent memory.

## Schedule, bounds and outcomes

Four associations, 24 trials per acquisition block, 24 trials reversing association 0. Observe both candidates before feedback and record ranking, random draw, choice, verified consequence, delivered signal, source of each score and memory identities. Each trial executes two candidate forwards, one chosen pre-teacher forward and one teacher forward. Keep original presentation/gap durations 1/4 abstract model units. After each acquisition block test every item read-only. After acquisition run **16** fixed-seed noisy frames of duration 4, test again, then reverse item 0 and test all four. This shorter pilot delay is explicitly different from the old 400-frame assay and does not inherit its retention gate or biological time claim.

Report every item at T0-T3, Delay and Rev, pre-feedback/online accuracy by block, neural and external scores separately, reliance on lookup, final external entries, neural gains and control invariants. Predeclared integration criterion for the combined informative arm: all four margins positive at T3, Delay and Rev, with item 0 revised and items 1-3 retained. Report the other two systems against the same criterion. Identical performance does not establish a neural contribution; a memory-only match is an informative result. Report all controls regardless of outcome; do not tune from this pilot or open sealed confirmation.

Bounds: one serial graph process, six arms, exactly 553 forwards per arm (3318 total), sparse arrays, node heap 256 MiB, RSS <=2048 MiB, free memory >=256 MiB, CPU duty .5, elapsed <=5400 seconds. No workers, dense adjacency, dependencies or final-family access. Do not overlap another graph experiment. Tests may be completed first; recheck authoritative processes immediately before launch.

## Persistence and audit

Write per-frame local-activity/update receipts and per-trial policy/feedback receipts. Atomically publish each completed trial/delay checkpoint with both memory states, loop cursor, test results, randomization identity and pending receipt before acknowledging it. A failure stops; never silently retry. Resume only into a new directory after process reconciliation, using unchanged scientific identities and the last published boundary. If recovery tooling is incomplete, preserve the checkpoint and state that limitation rather than claiming crash-safe recovery.

Audit separately reconstructs local neural memory from recorded activity, episodic entries from delivered evidence, score arbitration, random choices, synthetic certificate bindings, matched control sequences, snapshots, all item results and input/output hashes. It does not independently regenerate full-graph activity; a separate arithmetic implementation is not an independent experimental replicate. Pin the graph, descriptors, model/encoder/readout/learner/policy source identities and registration before execution. Run focused tests, then the registered serial pilot, audit and report all outcomes.

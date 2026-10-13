# Curriculum G0 graph assay v1

2026-10-11. **First full-graph phase in progress; no G0 or chess-learning pass.**

The researcher asks to continue the curriculum. This study tests the unmet neutral receiver prerequisite before C01 capture/recapture: eight target cue pairs, 32 acquisition experiences, 16 unrelated intervening experiences and 32 reversal experiences, with continuous physiological memory and the original curriculum gates. Run each complete phase under informative, absent, phase/action-matched shuffled and disabled conditions, then stop later phases/replicas on any required gate failure. Three predetermined projections must evoke different neural responses. Details: [registered design](../../../documentation/design/neural-learning/curriculum-g0-assay.md), [frozen protocol](../../data/curriculum-g0-assay-v1/protocol.json).

No decoder fitting, supervised gradient update, imported weights or external engine supplies the answer. Each independently checked synthetic contingency event follows an unaided two-action ranking and delivers the declared gamma2 pulse-order code. The teacher selects stimulus timing, not parameter deltas. Gains, KC credit and short/long local states are updated by the existing rate-timing mechanism; graph/signs/nonplastic parameters remain fixed. Scope is computational association with declared compartment/receptor/reference/numerical-time approximations, not natural reward, biological retention, chess transfer or reasoning.

## Launch prerequisites and recovery evidence

Static mapping checks verify 122 positive released KC-to-MBON12 endpoints and six readout MBON identities, with graph/map/annotations pinned. Protocol captures 29 local source/data files, complete relative-import closure, Node version and three runtime dependency file hashes. Heap256/RSS768/free256/duty0.5 apply.

Before graph launch the small-graph V2 process-interruption/resume fixture produces an identical receipt stream to uninterrupted execution and passes full replay of 2,432 feedback frames,128 lessons and2,694 receipts; unfiltered regression passes229/229. [Fixture verification](../../data/curriculum-g0-runner-fixture-v2/verification.json). These are software/process-recovery checks, not G0 association evidence. Preserve V1's Windows overwrite failure and signed-zero audit rejection in the [mistake record](../../journal/experiments/2026-10-11-curriculum-g0-receiver.md).

The main full-graph initial invocation deliberately stops after publishing pending frame receipt2: [interruption metrics](../../../runs/curriculum-g0-assay-v1-interrupted/interruption.json). The saved [completed gzip checkpoint](../../../runs/curriculum-g0-assay-v1-interrupted/checkpoint-000006.json.gz) contains physiological/transient state and next-frame cursor before acknowledgement. Resume continues into a fresh directory at [raw resumed receipts](../../../runs/curriculum-g0-assay-v1-resumed/receipts.jsonl). Immutable compressed checkpoints preserve every publication and partial; complete streamed hash chains bind receipt order. Later full recurrence replay must verify the saved first frame is not applied twice.

Exact invocations:

```powershell
node --max-old-space-size=256 .codebase/scripts/neural-learning/run-curriculum-g0.mjs --protocol research/data/curriculum-g0-assay-v1/protocol.json --out runs/curriculum-g0-assay-v1-interrupted --cpu-duty 0.5 --interrupt-after-pending 2
node --max-old-space-size=256 .codebase/scripts/neural-learning/run-curriculum-g0.mjs --protocol research/data/curriculum-g0-assay-v1/protocol.json --out runs/curriculum-g0-assay-v1-resumed --resume runs/curriculum-g0-assay-v1-interrupted/checkpoint-000006.json.gz --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/neural-learning/audit-curriculum-g0.mjs runs/curriculum-g0-assay-v1-resumed --cpu-duty 0.5
```

Original interruption:76 neural presentations,152.484 MiB peak RSS,18.368 s wall and9.422 s user+system CPU. These are partial-invocation measurements; no whole-study latency or comparative efficiency claim. Acquisition/control outcomes, subsequent phases, final resource records and archived-source neural replay remain pending at this launch note.

## 2026-10-12 acquisition addendum

The initial tool-owned learner became absent before terminal output; cause is unknown. Its last completed checkpoint003206 was resumed into runs/curriculum-g0-assay-v1-resumed2 as hidden processPID11176. Original incomplete artifacts/metrics are preserved; source/protocol and pending exposure are unchanged. Completed first-replica acquisition now passes all frozen runner gates:8/8 informative,2/8 absent,3/8 shuffled,0/8 disabled. Actual intervening teaching is underway. Full retention, reversal, other replicas and archived-source audit remain pending; neither G0 nor C01 is accepted yet. [Separate C01 teacher preparation](../../data/c01-task-domain-preflight-v1/README.md) verifies69 actions but performs no neural teaching. Live source hashes were rechecked unchanged.

2026-10-12 informative retention addendum: all16 intervening teaching experiences completed and the original eight preferences remain8/8, with mean signed margin0.0003331930 and exact causal reset/restoration. Remaining control arms are active; the matched retention phase, reversal, remaining replicas and full replay are still unaccepted/pending. No biological timing/retention or chess transfer follows.

## 2026-10-12 continuation: all-legal C01 input preflight and G0 guard recovery

The C01 shared bound-ray input now exposes an all-legal factory while preserving archived default-capture output and the frozen G0 closure. The static mapped-pool preflight covers69 actions across four software boards and three seeds, logs38 assignment collisions and2782 dropped projected cells, and sends no neural stimulus. See [preflight](../../data/c01-input-domain-preflight-v1/README.md). The quiet-action verifier's first incorrect archived-encoder call is recorded above.

The G0 resumed2 process ended at a combined resource guard without a terminal result. The exact RSS versus free-memory cause remains unknown; checkpoint006347 is the last acknowledged publication. After confirming PID11176 absent and free memory above the guard, resume3 starts from that checkpoint in a fresh directory under unchanged sources/protocol. This is a preserved recovery continuation, not a gate change or additional exposure.

## C01 receiver preflight

The all-legal capture-retention task now has an isolated temporal receiver adapter that inherits the existing frame transaction/recovery session. Captures and quiet moves recheck their own certificate domain; the pre-feedback score table must contain every legal action. The receipt plan includes raw proof, its independent checker scope and digest. Unknown proof creates no teaching event. The adapter, adjacent teacher/input modules and pinned default temporal tests pass15/15 focused fixtures on inert arrays. This closes implementation integration only. C01 fresh train/validation/final families, shortcuts, yoking, neural exposure, D1-D8 and source registration remain uncompleted. G0 must pass all phases, replicas and independent full replay before advancement.

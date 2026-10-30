# Stage 1 retention probes v1-v8: what changed, results, why each failed (summary, 2026-10-27)

This is a summary page. The raw evidence lives in each run directory, in the [fix-goal ledger](../../../documentation/handoffs/fix-goal-ledger-2026-10-24.md) and in the [memory-retention-fix journal](2026-10-24-stage1-memory-retention-fix.md). Nothing here replaces those records.

**Shared protocol.** All probes use training boards only, one replica (r1) and 4 A boards, one per stratum. For v1-v7 the A boards were f0-pin-p0b, f3-blocked-p0a, f5-absent-p0a and f0-pin-p0a; v8 re-derived them and got the same four. A probe teaches board A, then teaches 10 other boards (v6-v8 use the spaced schedule: A, 5 others, A, 5 others, A, 10 others), and then checks whether A's certified move is still the unique top choice. The test runs at 5 learning rates (eta 0.5, 0.2, 0.1, 0.05, 0.02). Predeclared rule: choose the largest eta at which A is kept in at least 3 of 4 probes; if none passes, stop.

| Probe | Registration | One change tested | Kept per eta (0.5/0.2/0.1/0.05/0.02) | Why it failed (diagnosis at the time; hypotheses marked) | Later corrections | Evidence |
|---|---|---|---|---|---|---|
| v1 (2026-10-24) | r6 | baseline: action-relative cue v1, task plus Stockfish teaching, restrained memory | 0/0/0/0/0 | A was learned (3/4 right after its own lesson at eta >= 0.1) but the punished favourite returned within 1-3 other lessons. 21-27 of A's ~29 cue cells were driven by other boards' lessons (cross-talk; correlation only). | - | `runs/stage1-retention-probe-v1`, L008 |
| v2 | r6 | Stockfish phase removed | 1/1/1/0/0 | Removing Stockfish changed one board only, so Stockfish was not the main cause of forgetting. | The one kept board (f0-pin-p0a) was kept through cross-talk, not memory (answer.md Q8). | `runs/stage1-retention-probe-v2-no-stockfish`, L011 |
| v3 | r7 | Stockfish child cue in the move's own token family, mover perspective | 1/0/0/0/0 | Same cross-talk. Stockfish opposed the verified outcome in 207/440 events. The memory path was stopped for a researcher decision. | "f3-blocked-p0a never acquired" holds only before r10. | `runs/stage1-retention-probe-v3-mover-value`, L012 |
| v4 (2026-10-25) | r9 | cue v3: every token conjoined with the move tag (less cross-talk) | 0/0/0/0/0 | Less overlap, but acquisition fell (at most 2/4 right after their own lesson) and scratch ranks worsened (2 to 7, 7, 13). | - | `runs/stage1-retention-probe-v4-tag-cue`, L027 |
| v5 (2026-10-26) | r10 | alpha1 long-term reward store | 0/0/0/0/0 | Partial: at eta 0.5 taught boards ended at rank 4-5 instead of falling back to 10-11, but none were first. | - | `runs/stage1-retention-probe-v5-alpha-one`, L031 |
| v6 | r10 | spaced re-teaching (A three times) | 1/1/1/0/0 | In 6/6 failed probes at eta 0.5 and 0.2, the final choice was a move A's own lessons had punished. Only reward had a long-term store. | - | `runs/stage1-retention-probe-v6-spaced`, L033 |
| v7 | r11 | alpha3 long-term punishment store (spaced) | eta 0.5 lineage only: 3/4; no result | Interrupted after 4/20 lineages. It was launched with `fly start` inside the agent session, which killed it (cause probable, not verified). Unpublished. | The surrogate shows its retention needs A's own lessons (no-own-lesson control 0/4). Step 1 showed the cue cannot transfer at all (perceptron at chance). | `runs/stage1-retention-probe-v7-spaced-alpha-three`, L037-L039 |
| v8 (2026-10-27) | r12 | attack-map cue (researcher option A), outcome-only teaching | 2/3/3/3/3, **passes; eta 0.2 chosen** | The only miss (f0-pin-p0a) is a permanent tie: its certified hxg5 and the failing Qxg5 get identical attack-map tokens (a cue limit for pins). | Predeclared limit: with a transferable cue, A can be kept through lessons on other boards, so this probe does not separate retention from transfer. | `runs/stage1-retention-probe-v8-attack-map`, L040-L044 |

## Common thread

Probes v1-v7 tested memory mechanisms one change at a time: Stockfish on or off, cue conjunctions, a long-term reward store, spacing, a long-term punishment store. Each fix addressed a real weakness, but none passed. The 2026-10-27 analysis found the larger cause (diagnosis, measured without the graph): the move descriptions shared the wrong facts across boards. Lessons on one board rewrote another board's cells, and even a perfect-memory learner could not transfer between families with those descriptions ([step 1 report](../../reports/stage1-representation-ceiling-2026-10-27/README.md)). v8 is the first probe with a description whose facts carry the same meaning across boards ([attack-map report](../../reports/stage1-attack-map-cue-2026-10-27/README.md)).

## Process mistakes along the way (each recorded in the ledger)

- v7 was launched inside the agent session and died with it (L037). v8 was launched outside any job object (L040).
- Early ledger timestamps were corrected by later entries (L003, L010, L031, and L042 still pending).
- The 2026-10-27 surrogate report presented the perceptron's 10/24 without its chance level of 11.3. It was corrected in the step-1 report.

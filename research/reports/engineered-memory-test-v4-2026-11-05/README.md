# Engineered memory test v4: result (2026-11-05)

**Outcome: does not pass** (its frozen gate). **Serves:** Volume 2, chapters To Learn and Evidence for Learning.

Run folder: `runs/engineered-memory-test-2026-11-04/engineered-memory-test-v4/` (`manifest.json` status `complete`, 2026-11-04 15:34-17:35 UTC; SHA-256 prefix `10bc2371`; `summary.json` prefix `49a2dfff`). Design: [v4 proposal rev 3 with the zero-RMS mask addendum](../../../documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md). Launched under the researcher's standing permission, at duty 1 through `fly.cmd`. 21,055 brain passes, 2 h 1 min wall, 7,223 CPU s, peak RSS 1,142 MiB. Brain connections unchanged. Preflight: 0 input collisions; verified safe-capture experiences 77, 63, 59 per seed.

An externally scheduled representation assay: every arm stored the same 1,551 verified experiences per seed (4 random legal moves per practice position). The table shows the expected safe-choice score on the 184 test positions (s / c ties); ties at the top are in brackets.

| Arm | 6101 | 6102 | 6103 |
|---|---|---|---|
| raw eye input | 37.2 (3) | 28.1 (2) | 31.2 (6) |
| random features | 36.4 (34) | 30.4 (39) | 30.3 (55) |
| graph-sparse (KC) | 12.5 (36) | 11.4 (34) | 13.6 (39) |
| graph-centred (KC, diagnostic) | 13.0 (45) | 10.5 (60) | 10.5 (60) |
| graph (KC) | 9.1 (48) | 9.3 (58) | 9.7 (64) |
| graph-mismatched | 7.1 | 8.7 | 4.7 |
| graph-sparse-mismatched | 12.5 | 7.2 | 4.8 |
| none | 7.2 | 7.2 | 7.2 |

Gate: graph vs none, margins +1.9, +2.1, +2.6, all lower bounds below 0. Graph-sparse vs none: +5.3, +4.3, +6.5; vs its shuffled control: 0.0, +4.2, +8.8. Neither candidate meets the 96 bar or the 9-position margins. Both are far below raw and random (bounds −27 to −41).

## What this shows

1. **The episodic memory learns useful experiences when its key carries the information.** With raw eye input as the key, stored verified experiences raise choices from 7.2 (no memory) to 28-37 of 184, every seed. Random sparse features do as well. This is evidence for Volume 2 that the engineered memory supports learning, but with a non-fly key.
2. **With the fly's Kenyon-cell code as the key, the same memory learns very little.** Gains are +2 to +6 over no memory. They are not reliably above the shuffled-outcome control: graph-sparse 6101 ties its shuffled control exactly. The loss lies in the KC representation (consistent with the v2 pathway trace), not in the memory mechanism, and not in sparse expansion as such, because the random sparse features work.
3. After blank subtraction, the KC code keeps nearly the same cells whatever the board: 4,248 of 5,177 cells are never among the top 5% on any calibration board.

## What this does not show

Not brain-only learning, not own-choice learning (fixed schedule), not reasoning or transfer. The 184 test positions were already used by v3. **Independent audit: passes all 8 checks** (`runs/engineered-memory-test-2026-11-04/engineered-memory-test-v4/audit.json`, log `runs/engineered-memory-test-2026-11-04/audit-v4-full.log`, 97 min): replay, schedules, 21,053 certificates (15 king captures scope-unknown), ledgers, permutations, cache, all 8 arms × 3 seeds rebuilt exactly (raw and random included), and every verdict number. The auditor was strengthened after this run's launch; its hash `a7e26f33...9d14` differs from the pinned `7f9edc71...d145` (recorded in the journal).

## Next

[Memory v5](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md): a development-selected KC key (including position-centred KC activity), twice the practice, fresh positions, a learning curve and retention probes, under the [memory goal](../../../documentation/design/research-goals/memory-goal-2026-11-04.md).

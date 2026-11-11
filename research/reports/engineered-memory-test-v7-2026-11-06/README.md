# Engineered memory test v7: result (2026-11-06)

**Outcome: does not pass** (frozen `judgeV7`): seeds 6102 and 6103 pass, seed 6101 fails. **Independent audit: PASS, pinned** (9/9 checks, 2026-11-07 01:42; `engineered-memory-test-v7-r2/audit.json`): all 24 jobs rebuilt exactly; the verdict "does not pass" is confirmed. **Serves:** Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). Goal: [memory goal](../../../documentation/design/research-goals/memory-goal-2026-11-04.md). Design: [v7 proposal rev 2](../../../documentation/design/neural-learning/memory-v7-proposal-2026-11-05.md).

**Question:** among the legal captures with a known certificate (safe or unsafe), does the memory choose the safe one more often than chance, shuffled outcomes and a quarter store? This removes v6's shortcut (capture versus quiet move).

The position-centred Kenyon-cell key is named K3 in the run records.

## How the run was made (disclosure)

- Run folder: `runs/engineered-memory-test-2026-11-05/engineered-memory-test-v7-r2/` (`manifest.json` `complete`; 21:34-23:55 local, 2026-11-06).
- Launch 1 (`engineered-memory-test-v7`, from 13:18) was killed by a Windows shutdown or log-off at 15:00 with 12/24 jobs. Launch 2 (`-r2`) is its **continuation**: it rebuilt the partition, certificates, capture permutations and cache, checked the partition and cache hashes against launch 1, copied the 12 finished outputs byte for byte (`manifest.resumedFrom` lists them with SHA-256) and ran the other 12. No score was read before the resume decision. Codex review: LAUNCH OK ([review](../mistake-diagnosis-2026-11-04/peer-review-v7-resume-r1.md)). The 2.3 h elapsed is recovery time, not the whole experiment's run time. The audit rebuilds all 24 jobs.
- 567 test positions from 300 never-used games (601-900); on average 3.54 known-certificate capture candidates per position. Key K3 and the v5 practice ledgers are unchanged; M = ceil(7 × 567 / 150) = 27. 21,054 brain passes; peak RSS 245 MiB.

## Results (expected safe-capture score over 567 positions; captures only)

| Arm | 6101 | 6102 | 6103 |
|---|---|---|---|
| full (3,000 slots) | 258.1 | 286.9 | 273.6 |
| half | 233.0 | 263.6 | 249.7 |
| quarter | 253.2 | 254.4 | 249.4 |
| eighth (descriptive) | 257.8 | 274.6 | 230.5 |
| shuffled (capture-only shuffle) | 232.4 | 210.3 | 221.1 |
| none (random capture) | 240.9 | 240.9 | 240.9 |
| raw-pc (secondary) | 295.4 | 309.3 | 293.2 |
| random-pc (secondary) | 264.0 | 278.6 | 255.7 |

Descriptive: the piece-value rule (maximise captured value − capturing value) scores 314.9.

| Gate condition: margin (bootstrap lower bound) | 6101 | 6102 | 6103 |
|---|---|---|---|
| full − none ≥ 27, bound > 0 | +17.2 (−1.3) **no** | +46.0 (27.9) yes | +32.7 (14.1) yes |
| full − shuffled ≥ 27, bound > 0 | +25.7 (5.5) **no** | +76.6 (54.0) yes | +52.5 (31.6) yes |
| full − quarter > 0, bound > 0 | +4.9 (−14.2) **no** | +32.4 (14.0) yes | +24.2 (4.5) yes |
| retention lost / recalled ≤ 0.02 | 0 / 749 yes | 0 / 749 yes | 0 / 749 yes |

## What this shows

1. **In 2 of 3 seeds, the memory picks the safe capture more often than chance (+33 to +46) and more often with more experience (full beats quarter, bounds above 0).** In seed 6101 the gain is small and not established.
2. **The relevant experience is scarce.** Of 3,000 practice slots per seed, only 297, 321 and 288 are captures with a known certificate (137, 129 and 122 safe). About 90% of the store is quiet moves, which carry no information for this choice. The learning curve is noisy (6101: eighth 257.8, half 233.0, full 258.1).
3. Memories are kept: 0 of 749 lost.
4. The fly's key (K3) is no better than random features (random-pc 256-279) and worse than raw input (raw-pc 293-309). Every arm is below the piece-value rule (314.9).

## What this does not show

Not safe-capture judgement in every seed; not brain-only learning (engineered nearest-episode memory; connections never change); not own-choice exploration; not reasoning or transfer. A label-conditioned fixture: quiet moves and unknown captures are filtered out before the memory chooses.

## Diagnosis and next step

Hypothesis (to be tested, not established): v7 is limited mainly by the amount of relevant experience (about 300 capture experiences per seed), not by the memory's ability to keep or recall. The next version should store task-relevant experiences: every known-certificate capture of each of the 750 practice positions (2,509: 991 safe, 1,518 unsafe; about 8 times more), with the key, memory and gate unchanged. See the v8 proposal, which goes to strict review before any build.

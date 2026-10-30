# Queen-concession training fixture

Composed development position: `5r1k/6pp/7N/8/2Q5/8/8/K7 w - - 0 1`. All 32 legal root actions were certified: only `c4g8` succeeds within three plies, 31 fail, zero unknowns. No immediate mating move exists. The checked strategy is `Qg8+ Rxg8 Nf7#`; the queen concession precedes the later mate and Black has one legal reply after Qg8+. Separate complete certificate replay and exact legal-set coverage pass 32/32. See [report](report.json), [audit](audit.json), [certificates](certificates.jsonl), and [training row](puzzles.jsonl).

This is a development training fixture composed during investigation, not an externally sourced solution or untouched test family. It fixes the earlier immediate-mate shortcut for this bounded task. No neural inference, feedback or persistent learning ran. It does not establish delayed eligibility or transferable reasoning.

Preparation command: `node --max-old-space-size=256 .codebase/scripts/prepare-smothered-mate-fixture.mjs --out research/reports/smothered-mate-preparation-2026-10-07 --cpu-duty 0.5`. Teacher-only preparation: 15.67 s elapsed, 57.13 MiB peak RSS. These are not neural-training latency measurements.

# FlyBench software implementation record

2026-10-10. Researcher requested 50 adaptive Stockfish games using Chess.com's rating approach. [Usage](../../../documentation/design/evaluation-and-performance/flybench.md). No fly graph match, learned-version strength, human calibration or reasoning result ran here.

## Mistakes and pivots

- Decimal-point accuracy and an illustrative Stockfish 700 setting were initial assumptions, not established capabilities. Source documentation and local handshake require uncertainty reporting and range checks (1320–3190). Implement a provisional estimate with RD/interval; measured reference ratings and weaker opponents remain needed for broader calibration.
- Inspection found the existing complete-game fly policy is untrained; specialized puzzle learners are not general learned-version adapters. Reuse and label that player, provide a frozen adapter contract, and do not silently substitute supervised checkpoints.
- Sandbox denied the initial process query. The approved query showed only two Codex Node processes and no graph experiment. A lookup included nonexistent `.tools`/`tools` folders; the existing executable was located under `.codebase/vendor/stockfish/sf-19`. No graph dynamics were run.
- Initial unit execution failed `spawn EPERM` before any test ran. Approved execution passed the four initial checks. Initial real-engine fixture also failed `spawn EPERM` before state publication; `fixture-run` remains. These were sandbox failures, not learner or rating failures.
- Approved preliminary `fixture-live` completed four synthetic mate games, scores 0,1,0,1. It establishes transport/outcome/rating plumbing, not fly strength. Afterwards, added move JSONL, per-game PGNs, network pins and preserved resume PGNs. Preserve the preliminary source separately; its raw report does not cover later additions. No active pinned source was edited.
- Stockfish RNG cannot be checkpointed: preserve an unfinished attempt and restart its unscored game rather than claiming identical midgame continuation. RD intervals omit paired-opening correlation and systematic reference uncertainty; that limitation is explicit.
- The first combined documentation patch failed on invalid UTF-8 in an existing code-navigation README. No part applied. Create new documents separately and append navigation/status as UTF-8 bytes without rewriting old content. This tooling failure ran no experiment.

## Validation

Initial four software checks passed. Completed implementation passed five focused checks, including real local Stockfish with a synthetic player, valid prefix recovery, PGN preservation, replay audit and rejection of a tampered score. The expected tamper rejection prints an error; the enclosing test passes. The artificial prefix test is simulated checkpoint recovery, not an actual process crash. Preliminary raw evidence is retained under `fixture-live`; its nominal 3190 estimate is a fixture artifact, not a fly rating. Regression results and source archives are recorded below when complete.

## Completed regression checks

All220 regression checks passed, zero skipped/failures, in30.588s (regression-tests.txt). After identifying the imported hashing helper as an omitted source pin, added that pin before the graph evaluation; all5 focused checks passed in18.095s (flybench-tests.txt). The integration test also confirms ply-cap interruptions score no game and identity mutation is rejected before publishing a score. No full graph ran in those tests.

Final artifacts are preserved in final-fixture (original/resumed/capped/mutation/rejected) with a separate passing replay audit. Final pinned source archive contains87 source/input files; source-preliminary reproduces the original fixture runner exactly (verified against its recorded SHA256). Five local links in new deliverables resolve.

Correction, 2026-10-10: An ad hoc PowerShell PGN-extraction command initially used a ternary expression unsupported by the installed Windows PowerShell parser. It failed before reading or changing files; the corrected query emitted both stored PGNs and confirmed their results.


Candidate-research update, 2026-10-10: repository inventory found only the Stockfish19 executable; a third-party review bundle contains a Stockfish WASM build identifier but no substantiated strength calibration. Official Stockfish chart places Skill Level0 near1347, so the prior assumption that it must undercut UCI_Elo1320 was unsupported. Maia guest source documents human-move targets1100?1900 and says model averaging can play above target. Do not call either a400-rated opponent. No files downloaded and no engine comparisons run.

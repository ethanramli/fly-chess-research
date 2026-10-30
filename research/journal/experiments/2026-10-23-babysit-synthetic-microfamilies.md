# 2026-10-23: Stage 1 synthetic microfamily feasibility

## Question

Can the audited v7 train and validation roots supply the four frozen Stage 1 immediate-recapture strata within the six-piece task bound, if each Lichess root contributes provenance and focal capture identity to an explicitly hypothetical FEN-rooted micro-task?

## Method and result

Added `.codebase/scripts/data/probe-stage1-synthetic-microfamilies.mjs` (SHA256 `A2DE6A043E2CD517199E9FEAF45D9BA1A3EB548BB219DDA1CC8310AF4DDA073B`) and ran it against the pinned v7 train/validation batch manifest (`e31bcf389a8780668be231d3278221138048b267437cbfddd21f2c596a2a4434`) and independent source/consequence audit (`0a8b655bff466c4a137693a353651bf3c19b9fe11ca057f904f5483f54aefe85`). `node --check` passed. The bounded static probe examined only the 128 training and 128 validation rows; it never opened final data. It found four-stratum candidates for 9 distinct training puzzle roots/source games and 8 distinct validation roots/source games. It used 350 classifier evaluations, 86.9 MiB peak RSS, and 2.9 seconds. The feasibility report is `research/reports/babysit-stage1-synthetic-microfamily-feasibility-v1-2026-10-23.json` (SHA256 `ABB25DC0A68E3DE4959DBD18394A59916E5699FAA188F7BC5319CB68DD11C13B`). No neural events were delivered; graph launch remains unauthorized.

## Mistakes and interpretation limits

- The first one-off JSONL count command over-escaped its line separator and attempted to parse multiple rows as one JSON document. It failed before changing files. A corrected run counted 10 legal, non-checking four-piece cores in each split.
- The first feasibility implementation held both kings at their source squares and found no pin variants. That tested only the fixed-king layout. The revised synthetic task allows relocation of the opponent king while preserving the focal capture's actor/target coordinates and piece identities; it then found candidate layouts. This changes the task position and is explicitly synthetic, not an authentic Lichess game position.
- The initial probe summary counted distinct capture actions as roots. The final report separately counts captures, puzzle roots and source games; validation has 9 complete capture candidates but only 8 independent puzzle roots/source games.
- A missing parenthesis in the new pin-layout search was caught by `node --check` and corrected before the feasibility run. No malformed code was executed.
- During inspection, one guessed action-config filename was absent and one patch context did not match; neither changed project state.

The report is only a construction-feasibility signal: it relies on the same `classifyCaptureRetentionStratum` helper used by the task path, and records labels/identities rather than the exact candidate FENs and certificates. It does not establish independent classification, family semantics, adequate sample quotas, disjoint evaluation, data eligibility, learner efficacy, Stockfish value, or reasoning. There is no Stage 1 registration, and the full campaign remains absent.

## Next

Persist exact candidate boards as provenance-bound synthetic lesson records; independently verify every source row, mutation, legal action and consequence, and family/split assignment. Keep final sealed. Do not launch neural teaching until the independent audit and all predeclared receiver/stage gates authorize it. Do not work on G0.

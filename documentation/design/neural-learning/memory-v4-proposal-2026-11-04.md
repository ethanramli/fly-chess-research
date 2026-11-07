# Memory v4 proposal: an externally scheduled representation assay (2026-11-04, PROPOSAL rev 3)

Status: proposal rev 3, after peer review round 2 (building allowed once changes 1-4 were in the spec; launch needs changes 5-6 implemented, validation artifacts and a final code review). Nothing built or run. Revision 1 got "approve with required changes" from the strict reviewer (Codex gpt-6.1-sol, same session as the diagnosis); [review 1](../../../research/reports/mistake-diagnosis-2026-11-04/peer-review-v4-round1.md). Every required change is answered below by its number (R1-R12). Supersedes the open points of the [memory v3 review proposal](memory-v3-review-proposal-2026-11-04.md). Answers [diagnosis](../../../research/reports/mistake-diagnosis-2026-11-04/README.md) items A02, A03, A04, A13, A18, A22-A25, A27, A31.

**Serves:** Volume 2, chapters To Learn and Evidence for Learning. Secondary: Volume 4 (a replayable Kenyon-cell cache).

## 1. What this is, and what it is not (R7)

v4 is an **externally scheduled representation assay**. It asks: when every memory arm stores exactly the same verified experiences, does a similarity memory over the fly's Kenyon-cell (KC) activity choose safe captures in new positions better than the same memory over raw eye input, random features, or shuffled outcomes?

It does **not** test, and must not be reported as testing:

1. own-choice learning (the restart plan's feedback-follows-the-fly's-own-move rule, `restart-plan-2026-10-30.md:54`): practice moves come from a fixed random schedule;
2. the fly's pre-feedback ranking, or neural delivery of feedback: nothing is delivered to the brain; brain connections never change;
3. full feedback-quality-gate compliance: certificates are complete and rechecked (R2), but the teaching signal is a stored label in an engineered store;
4. a repaired learner, transfer, reasoning, or a wiring-specific benefit (no rewired-graph control).

v4 needs the researcher's approval **as this separate condition** before launch. Four experiences per position and capacity 2048 are substantive changes from v3 and are part of that condition.

## 2. Fixed inputs (unchanged from v3)

572 positions (`capture-choice-positions-v1`, pinned hash), the same 388 practice / 184 test split by game (99 test games), Eyes v2, the 8-step read-only brain pass (`SparseTrainer`, seed 47), `NearestEpisodeMemory` (3 nearest, 1/distance), seeds 6101, 6102, 6103, v3 r2's typed-array storage of eye inputs. Shared v2/v3 source files are not edited; v4 code goes in new files.

## 3. Integrity preflight (stops the run before any brain pass)

Order matters: steps 1-2 use no verdicts; schedules are committed before any certificate is computed or any outcome is read.

1. **History replay (R2).** For each position, replay `history` from the start position with chess.js; the resulting FEN must equal `fen`. Mismatch stops the run. Legal moves come from the replayed board, as UCI strings sorted ascending.
2. **Schedule commitment (R3).** For each seed and each practice position (practice order as v3: game hash, then ply): `rng = mulberry32((seed ^ parseInt(sha256(positionId).slice(0, 8), 16)) >>> 0)` (`mulberry32` from `memory-assay-fixture.mjs:13`; SHA-256 hex from `node:crypto`). Forward partial Fisher-Yates over the sorted list `a` of length n, with m = min(4, n): for i = 0 to m−1, j = i + floor(rng() × (n − i)), swap a[i] and a[j]; keep a[0..m−1] in draw order. The schedules and their SHA-256 are written to the manifest now. The independent auditor reproduces them exactly.
3. **Certificates (R2).** Only now, for every legal move of every position, on the replayed board (history kept):
   - legal **king captures**: recorded as `scope-unknown`, proof and hash null, no write (v4 adapter; the action interface `capture-retention-action-domain.mjs:29-30` would otherwise forward them to the producer);
   - every other move: `certifyCaptureRetentionAction(board, uci, {objective:'capture-retention', plies:1})`, then the separate `checkCaptureRetentionAction(...)`.
   Save per move: complete proof object, `certificateSha256`, actor, task (criterion, 1-ply horizon), reply bound (`maxReplies` 256), status, verifier source hashes. Category mapping, applied before any value: success → safe; failure + capture → unsafe; failure + non-capture → quiet; unknown or scope-unknown → unknown. The category must equal the positions file's `outcome`; any mismatch stops the run. Only then values: safe → +1; unsafe, quiet → −1; unknown → no write. Tests cover all four categories and history-preserving replay.
4. **Input collisions (R4).** Adapter `items = all (position, move) → {fen, action: uci, answer}` with answer +1, −1 or "unknown", passed to `inputCollisions(eyes, items)` (`eyes-v2.mjs:56`). A returned group **stops the run** only if it holds both a +1 and a −1 member. Groups that mix one known value with unknown members are reported separately; their unknown slots stay as no-write slots. Quiet and unsafe agree (both −1). No position is ever excluded. Tests: known/known contradiction stops; known/unknown is reported, not stopped; quiet/unsafe is not a collision.
5. **Exposure.** Expected verified positives: 61.37 per seed (computed from the data). **If any seed has fewer than 40 verified +1 events, the whole study stops with outcome "insufficient experience"**; no other seed is substituted.
6. **Event ledger (R3).** One ledger per seed: ordered slots `(slot, positionId, uci, category, value, certificateSha256)`. Unknown slots stay in the ledger at the same index for every arm and write nothing.
7. **Permutation (R3, R6).** One permutation of the values over the known-slot mask: `rng = mulberry32((seed ^ 0x5eed) >>> 0)`, forward full Fisher-Yates (as step 2 with m = n). The mismatched arms use exactly this permuted list: same length, same count of +1 and −1, no modulo cycling. Permutation indices are saved.
8. **Precision (R8).** The calculation is marginal (one contrast, normal approximation) and assumption-dependent; it does not describe the full all-seeds, all-comparators gate. At 80% power, one-sided α = .025, MDE = 2.80 × SE for the per-position paired difference d in [−1, 1]: (a) worst case, perfect within-game correlation, SE = sqrt(Σ_g n_g²), MDE about 52.7 positions; (b) independent positions, Var(d) ≤ 0.5, SE = sqrt(0.5 × 184), MDE about 26.9 positions. Both exceed the 9-position margin, so **v4 is labeled exploratory now**. No v3 test result is used.

## 4. Representations (R5)

Let `kc(x)` be the 5,177 KC values after 8 steps for eye input `x` (Float32, as v3). `blank = kc([])`: one extra pass with empty stimulation under the identical model and zero initial state.

| Feature | Definition |
|---|---|
| graph | `kc(x)` (as v3) |
| graph-sparse | `r = max(0, kc(x) − blank)` elementwise; keep the 259 largest values of r (259 = round(0.05 × 5177)), ties broken by lower KC index; values equal to 0 are never kept, so a move may keep fewer than 259; zero all others |
| graph-centred (diagnostic only, not a candidate) | `kc(x) − blank` |
| raw | photoreceptor input vector (as v3) |
| random | v3's fixed random expansion (as v3) |

Scaling for every feature: v3's `rmsScaler` (`kc-episodic-memory-v2.mjs:94`), fitted on the same practice vectors as v3 (first legal move in sorted order of each practice position), applied after the transform. The pinned `rmsScaler` computes `x / (RMS + 1e-6)` (`kc-episodic-memory-v2.mjs:109`) and is kept unchanged: a feature whose practice RMS is 0 but whose test value is 1 becomes 1,000,000. This can happen with graph-sparse; the count of such test coordinates is reported per arm. Transforms and subtraction use Float64 arithmetic on the loaded Float32 KC values. Tests: a training-zero/test-nonzero regression and a bitwise replay. Reported: actual density per move for graph-sparse, count of all-zero vectors per feature.

**Addendum, 2026-11-04 night (post-cutoff change, label-free reason):** the first dry run found 10,807 graph-sparse test coordinates whose practice RMS is 0, which the pinned scaler multiplies by 10^6. v4 therefore applies a **zero-RMS mask to every feature**: a coordinate that is 0 in every scaler-fit vector is set to 0 after scaling. The reason is a label-free count, but the dry run had already scored 24 test positions, so this is declared as a change made after test data were seen. The final reviewer check was not available (Codex usage limit); the researcher gave standing permission to proceed. Masked dry run: independent audit passes all 8 checks.

5% is an engineering choice. It is a stand-in for the global feedback inhibition that keeps olfactory KC codes sparse; it is not a modeled APL neuron, and the sources concern olfaction, not this visual input (R12).

## 5. Arms (R6)

`V4_ARMS`, defined locally in the v4 task file:

| Arm | Feature | Outcomes written | Role |
|---|---|---|---|
| graph | graph | ledger verdicts | candidate |
| graph-sparse | graph-sparse | ledger verdicts | candidate |
| graph-mismatched | graph | permuted verdicts | matched control for graph |
| graph-sparse-mismatched | graph-sparse | permuted verdicts | matched control for graph-sparse |
| raw | raw | ledger verdicts | comparator |
| random | random | ledger verdicts | comparator |
| graph-centred | graph-centred | ledger verdicts | diagnostic, outside the gate |
| none | none | nothing | comparator |

Each store: `NearestEpisodeMemory` with capacity **2048 passed explicitly**. Writes, exact-pattern replacements and evictions are counted separately (expected evictions: 0).

## 6. Test scoring (R1)

On each of the 184 test positions, the store is frozen and every legal move is scored with `frozenScores` (forward then reverse, as v3). With c moves tied at the top score and s of them safe (+1 verdict), the position scores **s / c**. This is the expected success under uniform tie-breaking ([Opitz 2023, Appendix A](https://arxiv.org/html/2307.15002#A1)). The none arm therefore scores safe moves / legal moves per position (about 3.9% overall). Ties are reported per arm.

## 7. Pass rule (fixed now, R1, R8)

A new numeric gate, `numericPairGate`, in a new file `transfer-evaluation-v2.mjs` (v1's Boolean `pairGate` stays for historical callers). It checks every score is finite and in [0, 1], sums expected successes, and bootstraps paired numeric differences by game (10,000 resamples, game clusters, `mulberry32(20261103 ^ k)` per comparator as v1), returning the margin and the **.025 lower quantile**.

The study passes only if **one and the same** candidate arm (graph or graph-sparse) meets, in **every** seed:

1. expected score ≥ 96 of 184 (52.17% expected safe-choice accuracy; a new engineering threshold, not v3's unique-top metric);
2. against each of raw, random, none, and **its own** matched mismatched control: margin ≥ 9 positions and .025 lower quantile > 0.

The family is the two candidate arms at one-sided α = .05 overall: each candidate uses one-sided α = .025 (the .025 lower quantile). Otherwise "does not pass". "Insufficient experience" (§3.4) and "input-validity failure" (§3.3) are separate outcomes.

The 184 test positions were scored by v3 r2. This document's hash and a result-reading cutoff are recorded before the v3 result is read; no v4 setting is chosen from v3 test results. A confirmatory claim needs fresh disjoint games and the selected representation frozen.

## 8. Saved cache and independent audit (R9)

Run folder files, all streamed (no JSON flattening of arrays):

1. `kc-cache.f32`: little-endian Float32, shape [21,054 rows × 5,177], row 0 = blank, then rows in `keys.json` order. `cache-schema.json`: shape, byte order, ordered keys `positionId|uci`, KC graph indices and root IDs, model and input pins, file SHA-256.
2. `scalers.json`: per-feature RMS values. `random-identity.json`: expansion `wiringSha256`.
3. `certificates.jsonl`, `schedule-<seed>.json`, `ledger-<seed>.jsonl`, `permutation-<seed>.json`.
4. `records.jsonl` (per test position, per arm: c, s, expected; the auditor recomputes every move score from the cache and ledger instead of reading stored scores) and `summary.json`. Exact formats: [memory v4 file formats](memory-v4-file-formats.md). (Edit after the result-reading cutoff, 2026-11-04: aligns this line with the formats doc; no setting changed.)

`audit-engineered-memory-test-v4.mjs` (independent; no import from the v4 runner or task file except pinned shared libraries) recomputes from these files: certificate checks, schedule from seeds, ledger, permutation, all memory writes/replacements/fingerprints, every candidate score, and the numeric gate, and must match exactly. Rejection tests: missing, duplicated or reordered cache rows; truncated cache; altered certificate; wrong feature identity; changed permutation. A round trip (write cache, reload, rescore) must reproduce scores bit-for-bit.

## 9. Resources (R10)

1. KC cache: 21,054 × 5,177 × 4 bytes = 415.8 MiB. One full Float64 store: 1,552 × 5,177 × 8 = 61.3 MiB; stores are processed one at a time.
2. Scoring: up to 1.64 × 10¹² coordinate comparisons in total (reviewer's count for 15 arm-seeds; 21 scored arm-seeds here, about 2.3 × 10¹²). Before registration, a synthetic benchmark of the actual scoring code gives the measured time; the guard and pacing run after every test position during scoring. Before launch the benchmark also measures the worst single-query latency and the peak RSS of cache save and reload. If the benchmark projects more than 3 hours at duty 1, the build stops and reports instead of launching.
3. Brain passes: 21,054 + blank; v3 r2 measured about 9 passes per second at duty 1 after warm-up, peak about 820 MiB at 10,000 passes (not a final peak).

## 10. Launch and terminal state (R11)

1. After r2 ends: `curriculum.py:329` accepts duty 0.5, 0.75 or 1; tests show each is accepted and that the pause, heap-flag, and live/unknown-process refusals still hold. Only the v4 registration pins the new `curriculum.py` hash.
2. Manifest: `startedAt`, `endedAt`, `exitStatus`, `volume`, `chapter`, `pid`, process creation time and command line. A status check reconciles three outcomes, never editing the original manifest: (a) the process is verified live (PID, creation time and command all match) → running; (b) verified absence, or a different process instance at that PID → a separate `reconciled.json` with status `interrupted` and its evidence; (c) the observation fails or is incomplete (missing creation time, unavailable command, inventory failure) → `unknown`, and launching stays blocked. Tests: missing creation metadata, unavailable command, inventory failure, PID reuse. Missing fields alone never mean interrupted (as `curriculum.py:396-419` already keeps `unknown`). A partial cache is kept and marked partial.
3. Before launch: synthetic dry run, `npm test`, the action tests, the audit's rejection tests, and this reviewer's final check.

## 11. Sources (R12)

| Claim | Source | Used for |
|---|---|---|
| Expected accuracy under uniform tie-breaking | [Opitz 2023, arXiv:2307.15002, Appendix A](https://arxiv.org/html/2307.15002#A1) | §6 scoring rule only (not the bootstrap or power) |
| Tie policies differ across tools | [MATLAB ClassificationKNN](https://www.mathworks.com/help/stats/classificationknn.html) | why the rule must be stated |
| APL feedback keeps olfactory KC codes sparse, decorrelated; needed for fine discrimination | [Lin et al. 2014, Nat Neurosci 17:559](https://pubmed.ncbi.nlm.nih.gov/24561998/) | motivation of graph-sparse (olfactory, not visual) |
| Olfactory KC responses are sparse | [Turner et al. 2008, J Neurophysiol 99:734](https://www.bazhlab.ucsd.edu/wp-content/uploads/2014/04/JNeurophys2008.pdf); [Honegger et al. 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3180869/) (about 5% imaged share, and about 5% odor-responsive cells: different denominators) | why 5% is a plausible scale; not a measured value for this model |

The Church (1964) yoked-control inference is removed: its full text was not verified. The identical-ledger design stands on its own logic (every arm gets the same experiences). All four sources go in the source-to-solution register before experimental use.

## 12. Build plan (after approval; Haiku agents, at most 4 at once)

1. `transfer-evaluation-v2.mjs` + test: `numericPairGate` (fractional values, alternating winners across seeds, range checks).
2. `engineered-memory-task-v4.mjs` + test: preflight (replay, certificates, collisions), schedule, ledger, permutation, `V4_ARMS`, s / c scoring. Tests: none arm = safe/legal exactly; identical ledgers across matched arms; permutation keeps counts; no modulo; collision stop.
3. `audit-engineered-memory-test-v4.mjs` + rejection tests.
4. `run-engineered-memory-test-v4.mjs` (from the v3 r2 runner: blank pass, transforms, cache writer, manifest fields, scoring guard), the scoring benchmark, and the v4 step file (paused). Then, after r2 ends, the `curriculum.py` duty line and its tests.

The main session reviews every file, runs the tests and the dry run, then returns to this reviewer before launch.

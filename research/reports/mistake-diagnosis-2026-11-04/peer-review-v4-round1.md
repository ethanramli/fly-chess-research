# Peer review of memory v4 proposal, round 1 (2026-11-04)

Strict reviewer: Codex gpt-6.1-sol, effort high, same session as the diagnosis. Prompt: `peer-review-v4-round1-prompt.txt`.

**APPROVE WITH REQUIRED CHANGES — as an exploratory representation-and-memory benchmark.**

It is not ready for implementation as specified. **Items 1–6 and 9 block building; all items block launching.** A pass would not establish own-choice learning, transferable reasoning or a benefit caused specifically by the released wiring.

No files changed; no simulations or tests ran.

1. **Replace the Boolean gate; specify the statistical hypothesis. [BUILD]**  
   **Evidence:** proposal:17,42–47; [pairGate:54](../../../.codebase/src/neural-learning/transfer-evaluation-v1.mjs:54), especially line 65.  
   **Problem:** `pairGate` converts every positive fraction into one success. No-memory therefore becomes **184/184**, making the required nine-position advantage impossible.  
   **Exact fix:** add a versioned numeric gate validating finite scores in `[0,1]`, summing expected successes and bootstrapping paired numeric differences by game. Preserve historical Boolean callers. Require **one graph arm to pass every seed and comparator**, rather than allowing different winners by seed. Define one-sided family α=.05 across the two candidate arms: use lower bootstrap quantile `.025`. Do not confuse this with a two-sided 97.5% interval, whose lower endpoint uses `.0125`. Test fractional values and alternating winners across seeds.

2. **Store and independently check complete certificates. [BUILD]**  
   **Evidence:** proposal:20; [certificate producer:21](../../../.codebase/src/search-and-feedback/capture-retention-certificate.mjs:21); feedback gate:11–19.  
   **Problem:** FEN, hashes and a recomputed verdict still omit the actual consequence proof. Calling the producer again is not an independent checker. The capture-only checker also rejects quiet moves—which dominate this schedule.  
   **Exact fix:** save the complete proof, certificate hash, actor, criterion/horizon, reply bound, resource status and verifier identity. Replay history and require the resulting FEN to match. Use the existing [action-domain interface:28](../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs:28) for captures **and quiet moves**, with its separate checker. Preserve king-capture unknowns unless explicitly revising that scope.

3. **Freeze one event ledger before creating any arm. [BUILD]**  
   **Evidence:** proposal:18–20; [task-v3:85](../../../.codebase/src/neural-learning/engineered-memory-task-v3.mjs:85).  
   **Problem:** “Same schedule” remains underspecified; silently skipping mismatches can change exposure. Reusing modulo indexing can repeat shuffled labels rather than preserve their multiset.  
   **Exact fix:** sort legal UCIs, name the PRNG and sampling algorithm, draw four without replacement, and hash the schedule before consulting outcomes. A certificate/data mismatch must stop integrity preflight. Legitimate unknowns retain identical slots across arms and produce no write. Permute verified labels once over the common known-event mask; require equal lengths and positive/negative totals—**no modulo cycling**. If any seed has fewer than 40 verified positives, stop the whole registered study without selecting another seed.

4. **Do not delete test positions because their labels reveal collisions. [BUILD]**  
   **Evidence:** proposal:22,44–45; [collision helper:56](../../../.codebase/src/chess-input/eyes-v2.mjs:56).  
   **Problem:** exclusions change the evaluated population using target answers while retaining a fixed `96/184` gate. That moves the input defect into dataset selection.  
   **Exact fix:** treat contradictory-input collisions as an input-validity stop; preserve the original population. Any restricted-domain analysis must be separately declared with its own denominator. Specify the helper adapter explicitly: it expects `{fen, action, answer}`, not the position file’s `{moves: [{uci, outcome}]}`. Compare task answers consistently; quiet and unsafe both receive −1.

5. **Define the sparse transform mathematically. [BUILD]**  
   **Evidence:** proposal:21,28; [RMS scaler:94](../../../.codebase/src/neural-learning/kc-episodic-memory-v2.mjs:94).  
   **Problem:** subtraction can produce negative values; rounding, ties, zero responses and scaling order are unspecified. Different builders could implement different experiments.  
   **Exact fix:** freeze an operator such as  
   `max(0, response − blank) → retain up to 259 positive values → practice-fitted RMS`,  
   with equal-value ties resolved by KC index. Define blank input as `[]` under the identical model and zero-transient initialization. Freeze the scaler-fitting vectors, epsilon and zero-RMS policy. Report actual density and all-zero vectors. This is acceptable as a disclosed engineered transform; it is not a measured APL mechanism.

6. **Give the sparse arm its own matched shuffled control and explicit interface. [BUILD]**  
   **Evidence:** proposal:38,59; [shared ARMS:8](../../../.codebase/src/neural-learning/engineered-memory-task-v2.mjs:8); v3 runner:147.  
   **Problem:** sparse-versus-dense-mismatched changes representation and label alignment together. The reused arm enumeration contains only five arms.  
   **Exact fix:** define local `V4_ARMS`, including `graph-sparse-mismatched`, with explicit feature/control mappings. Each graph candidate must beat its **representation-matched** shuffled control. Pass capacity 2048 explicitly; do not inherit v3’s 512 default. Preserve shared v2/v3 files. Test identical event order, unknown masks and transformed inputs within each matched pair. Count exact-pattern replacements separately from evictions.

7. **Register the changed scientific question. [LAUNCH]**  
   **Evidence:** proposal:11,18,33; [restart feedback rule:54](../../../documentation/design/research-goals/restart-plan-2026-10-30.md:54).  
   **Problem:** random scheduled practice removes policy-dependent exposure, but also removes the restart requirement that feedback follows the fly’s own selected move. Four experiences per position and increased capacity are substantive changes.  
   **Exact fix:** register v4 explicitly as an **externally scheduled representation assay**, requiring approval as that separate condition. State which own-choice, pre-feedback-ranking and neural-delivery requirements it does not test. Do not describe improvement over v3 as a repaired learner or claim full feedback-gate compliance merely because certificates were rechecked.

8. **Separate exposure sufficiency, power and confirmation. [LAUNCH]**  
   **Evidence:** proposal:19,32,44–47.  
   **Problem:** 40 positives is not a power calculation. `96/184` now means **52.17% expected safe-choice accuracy**, a different metric from v3’s unique-top success. The 184 positions represent **99 games**, and are reused development data.  
   **Exact fix:** retain 96 only as an explicitly chosen *new engineering threshold*. Provide a prospective game-cluster power/precision analysis for the nine-position advantage, without using v3 test performance to choose settings. Freeze the proposal hash and result-reading cutoff. Any confirmatory transfer claim needs fresh disjoint games and a frozen selected representation. My read-only calculation gives **61.372 expected positives**, not approximately 59; this remains exposure arithmetic, not learning power.

9. **Specify a replayable cache and independent audit contract. [BUILD]**  
   **Evidence:** proposal:26,61; [v3 cache construction:122](../../../.codebase/scripts/neural-learning/run-engineered-memory-test-v3.mjs:122).  
   **Problem:** a Float32 file and SHA-256 do not identify which response belongs to which move or reproduce preprocessing.  
   **Exact fix:** save a binary schema with shape, byte order, ordered position/action keys, KC indices/root identities, baseline, model/input pins, scaler values and random-feature identity. Save the event ledger and permutation indices. Audit independently reconstructs memory writes, replacements, fingerprints, every candidate score and the final numeric gate. Require rejection tests for missing/duplicated/reordered rows, altered certificates, wrong feature identities and truncated caches. Round-trip serialization must reproduce scores exactly.

10. **Replace the runtime claim with a measured resource budget. [LAUNCH]**  
    **Evidence:** proposal:51–53; [distance loops:55](../../../.codebase/src/neural-learning/kc-episodic-memory-v2.mjs:55); [frozenScores:16](../../../.codebase/src/neural-learning/transfer-evaluation-v1.mjs:16).  
    **Problem:** each query scans every stored dimension and sorts distances; `frozenScores` repeats scoring in reverse order. Zero-filled sparse arrays do not reduce those loops.  
    **Exact fix:** benchmark the actual synthetic scoring workload before launch. The current path performs up to **109.4 billion coordinate comparisons per graph arm-seed**; the proposed fifteen scored arm-seeds approach **1.64 trillion**, before the additional sparse control. Add guard/pacing checkpoints during evaluation. Stream cache output without JSON flattening; process stores sequentially. The KC cache alone is **415.77 MiB**, and one maximum Float64 store is **61.30 MiB**. Early v3 RSS samples are not final peak measurements.

11. **Repair launch and terminal-state handling without changing active pins. [LAUNCH]**  
    **Evidence:** proposal:24–25; [curriculum.py:329](<../../../python actions/curriculum.py:329>), and status:439–473.  
    **Problem:** adding duty `1` fixes the command mismatch, but status does **not** already reconcile manifests as claimed: without an action handle it returns `untracked`. PID alone also cannot identify a process reliably.  
    **Exact fix:** test `.5/.75/1` acceptance while retaining pause, heap and live/unknown-process refusals. Specify terminal reconciliation using PID, process creation identity and command, preserving historical evidence. Include start/end times, exit status and partial-cache handling. Defer changes to active pinned dependencies until r2 terminates. Require the synthetic dry run, full applicable regression and independent audit checks before launch.

12. **Correct and narrow the citations. [LAUNCH]**  
    **Evidence:** proposal:17–21.  
    **Exact fix:** cite **Juri Opitz**, not Jiang et al., for arXiv:2307.15002. Its expected-tie discussion supports the scoring rationale, not the proposed bootstrap or power. [Opitz, Appendix A](https://arxiv.org/html/2307.15002#A1). MATLAB documents alternative tie policies only. [Official documentation](https://www.mathworks.com/help/stats/classificationknn.html). Lin and Turner support sparse **olfactory** coding, not this exact visual transform. [Lin et al.](https://pubmed.ncbi.nlm.nih.gov/24561998/), [Turner et al.](https://www.bazhlab.ucsd.edu/wp-content/uploads/2014/04/JNeurophys2008.pdf). Honegger reports both an approximately 5% imaged population share **and** approximately 5% odor-responsive cells; distinguish those denominators. [Honegger et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3180869/). Church’s full-text application was not verified here: supply the supporting passage or remove that inference. Register source coverage and adaptations before experimental use.

Optional suggestions:

1. Add a blank-subtracted **dense** diagnostic to distinguish centering from sparsification; keep it outside winner selection.
2. Report simple brightness and capture-marker references to detect remaining shortcuts.
3. Replace full distance sorting with an exactly equivalent top-three selection only after equivalence tests.

Next: resolve the numeric gate in **item 1** before approving implementation.
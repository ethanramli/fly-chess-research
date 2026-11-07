# Peer review of memory v5 proposal, round 1 (2026-11-05, 00:00)

Same reviewer and session. Prompt: `peer-review-v5-round1-prompt.txt`.

**APPROVE WITH REQUIRED CHANGES. Building should wait until items 1–7 are resolved in the specification.**

The question fits the revised Volume 2 goal. Beating raw/random is appropriately secondary. The main unresolved issues are the learning-curve interpretation, retention measurement and labeled-key controls.

1. **BUILD — Correct and freeze the data-selection claim.**  
   **Evidence:** [proposal:17–23](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:17); [generator:39–54](../../../.codebase/src/puzzle-learning/capture-choice-positions-v1.mjs:39).  
   **Problem:** eligibility explicitly requires safe **and** unsafe captures. The 150 unscored positions also come from previously evaluated games.  
   **Fix:** describe predefined, label-conditioned task eligibility—not label-independent selection. Freeze exact partition identities and check board/input repeats against **all 750 practice positions** and across development folds. These test games are disjoint from practice as specified; do not falsely call that overlap. Describe the evaluation as new positions from reused held-out games. Use untouched games for a stronger independent confirmation.

2. **BUILD — Make development selection a completely specified training-only pipeline.**  
   **Evidence:** [proposal:29,40–45](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:29).  
   **Problem:** “build from fold A” does not explicitly constrain every fitted transformation and shuffled fit.  
   **Fix:** fit scalers, masks, ridge coefficients and permutations using the source fold only; apply them unchanged to the opposite fold. Use the same fitting policy in development and final evaluation. Save both directions’ results and select once using the stated tie rule. Fresh and secondary outcomes must remain inaccessible to selection. A properly isolated development screen does not itself require four-key Bonferroni correction on independent confirmation data.

3. **BUILD — Fix K4’s transformation order.**  
   **Evidence:** [proposal:29–36](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:29); [RMS implementation:101–109](../../../.codebase/src/neural-learning/kc-episodic-memory-v2.mjs:101).  
   **Problem:** coordinatewise RMS after multiplying by `|β|` approximately cancels the intended weighting.  
   **Fix:** freeze `position centring → practice RMS/mask → ridge fit → |β| multiplication`, with **no second coordinatewise normalization**. State that Euclidean distance then weights squared coordinate differences by `β²`. Freeze sorted-UCI averaging order, Float64 arithmetic and rejection of missing candidate rows. K3’s within-position mean is label-free decision-time information, not test-label leakage.

4. **BUILD — Replace “exactly 200 CG iterations” with a valid solver contract.**  
   **Evidence:** [proposal:36](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:36).  
   **Problem:** zero targets after projection, zero features or early convergence can produce zero denominators and `0/0`. Two hundred iterations also do not establish convergence.  
   **Fix:** specify matrix-free `A(v)=Xᵀ(Xv)+v`, **at most** 200 iterations, a fixed residual tolerance, zero-residual termination, finite-value checks and a predefined nonconvergence outcome. Save iterations and independently recomputed residuals. Test zero, collinear and small analytically solvable systems.

5. **BUILD — Separate additional stored experience from a changed reader.**  
   **Evidence:** [proposal:29,36,49–55](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:29).  
   **Problem:** separately fitting each store’s scaler, mask and β changes the representation as well as episode count. The shuffled K4 reader is unspecified.  
   **Fix:** for the primary storage-dose comparison, freeze one per-seed key pipeline fitted on the quarter-budget calibration experiences, then add episodes without changing it. Give full, half, quarter and shuffled stores that same declared key. Permute only stored outcomes for the primary memory-alignment control. Disclose that this control retains the labeled calibration aid; refitting β on shuffled targets would test a different, whole-pipeline intervention. Do not attribute a K4 pass to unaided KC learning.

6. **BUILD — Replace the retention tautology with historical probes.**  
   **Evidence:** [proposal:56](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:56); [store:35–47,65–66](../../../.codebase/src/neural-learning/kc-episodic-memory-v2.mjs:35).  
   **Problem:** identical vectors overwrite earlier values. Checking surviving entries merely exercises the exact-match shortcut and can conceal lost experiences.  
   **Fix:** preserve immutable early-quarter probes and their original verified values; measure recall before and after later writes under the frozen key. Predeclare a retention criterion. Count consistent/conflicting key collisions, replacements, lost early associations and evictions separately. Capacity 4096 prevents capacity eviction—not overwriting.

7. **BUILD — Specify an executable v5 gate and fixed inferential status.**  
   **Evidence:** [proposal:51–58](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:51); [v4 judge:124–149](../../../.codebase/src/neural-learning/engineered-memory-task-v4.mjs:124).  
   **Problem:** `judgeV4` retains different candidates and the 96-position threshold. “Exploratory unless the effect is large” makes status depend on results.  
   **Fix:** define `judgeV5`: selected key fixed; every seed must satisfy seven-position advantages over none/shuffled, a strictly positive full-minus-quarter margin, the specified bootstrap bounds and the retention criterion. Freeze resamples, bootstrap seed and game clustering. Declare exploratory status now. Report cluster-sensitive precision; the independent-position MDE is not power for the complete compound gate.

8. **LAUNCH — Require a genuinely complete, versioned auditor.**  
   **Evidence:** [proposal:66](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:66); current v4 auditor findings below.  
   **Fix:** independently verify dataset/partition provenance, complete certificates, fitted preprocessing, CG results, every arm—including raw/random—historical retention probes and the **entire numerical verdict**, not merely winners. Pin the accepted v4 cache’s model/input identities before reuse. Add corruption tests for comparator scores, split leakage, unknown slots, ridge weights and reported confidence bounds.

9. **LAUNCH — Bound and verify parallel scoring.**  
   **Evidence:** [proposal:62](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:62); `AGENTS.md:79–84,99`.  
   **Problem:** four workers capped individually at 2 GiB permit 8 GiB aggregate; cache duplication and ridge allocations are unspecified.  
   **Fix:** register aggregate memory admission, free-memory supervision, bounded row caching, worker commands and failure recovery. The combined Float32 cache is approximately **738 MiB**; retaining all transformed Float64 keys alongside it exceeds 2 GiB before stores. Require serial-versus-parallel equality of coefficients, fingerprints, scores and verdicts. Keep whole stores within workers, use deterministic output merging and benchmark the actual workload before choosing worker count.

**Running v4 — five-line assessment:**  
No demonstrated runner bug currently proves its numerical choices wrong; the following defects block complete certification.  
`audit-engineered-memory-test-v4.mjs:357–360`: none-arm unknown counts will falsely expect zero instead of the scheduled 1/2/2.  
`:27,412`: raw/random reconstruction is skipped although their saved scores enter the gate.  
`:191,300`: verifier hashes and feature provenance are insufficiently checked.  
`:440–449`: reported margins/confidence bounds are not compared with a complete reconstructed verdict.


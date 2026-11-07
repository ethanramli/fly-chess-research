# Peer review of memory v4 proposal, round 2 (2026-11-04)

Same reviewer and session. Prompt: `peer-review-v4-round2-prompt.txt`.

**APPROVE WITH REQUIRED CHANGES. Building should not start from revision 2 as written: four implementation-contract defects remain.**

“RESOLVED” below means resolved **in the specification**, not implemented or tested. No files changed; no simulations or tests ran.

Line references are to the [revision 2 proposal](../../../documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md).

| Item | Status | Reason |
|---|---|---|
| R1 | **RESOLVED** | Lines 73–80 specify numeric scores, one candidate passing every seed, matched controls and the correct one-sided `.025` tail. |
| R2 | **NOT RESOLVED** | Line 27 assumes king captures become unknown, but the cited producer certifies them; categorical verdict comparison also needs an explicit mapping. |
| R3 | **NOT RESOLVED** | Lines 26–29 check verdicts before the supposedly prior schedule commitment; partial Fisher–Yates ordering remains unspecified. |
| R4 | **NOT RESOLVED** | Line 28 treats known-versus-unknown input equivalence as contradictory answers; unknown is not an opposite consequence. |
| R5 | **NOT RESOLVED** | Line 46 incorrectly states that the pinned scaler maps a training-zero dimension to zero during testing. |
| R6 | **RESOLVED** | Separate dense/sparse shuffled controls, a common ledger/permutation and explicit capacity address the prior mismatch. |
| R7 | **RESOLVED** | Lines 9–18 correctly limit this to an externally scheduled representation assay requiring separate launch approval. |
| R8 | **RESOLVED** | The threshold and assumed-model precision calculation are explicit; their own arithmetic already requires an exploratory label. |
| R9 | **RESOLVED** | Lines 88–93 specify cache identities, reconstruction and rejection tests; replay remains conditional on the recorded KC activity. |
| R10 | **NOT RESOLVED** | The benchmark requirement is appropriate, but checking guards only every 50 positions leaves potentially minutes of unchecked scoring. |
| R11 | **NOT RESOLVED** | Line 104 conflates verified process absence with insufficient information to establish an identity match. |
| R12 | **RESOLVED** | Attribution and biological scope are corrected; source registration remains a launch requirement. |

Required changes:

1. **BUILD — Add an explicit king-capture scope adapter and verdict mapping.**  
   **Evidence:** proposal:27; [action-domain:29–30](../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs:29); [generator:28](../../../.codebase/src/puzzle-learning/capture-choice-positions-v1.mjs:28).  
   **Problem:** the action interface forwards **all captures** to the producer. It does not implement the generator’s king exclusion.  
   **Exact fix:** in new v4 code, legal king captures produce a recorded scope-unknown with null proof/hash and no write. Other moves use the existing producer and checker. Map checked results explicitly: success→safe; failure+capture→unsafe; failure+noncapture→quiet; unknown→unknown. Compare categories before converting them to reinforcement values. Test all four cases and history-preserving replay.

2. **BUILD — Resolve the scaler contradiction and freeze arithmetic precision.**  
   **Evidence:** proposal:36–46,93; [rmsScaler:109](../../../.codebase/src/neural-learning/kc-episodic-memory-v2.mjs:109).  
   **Problem:** the implementation computes `x/(RMS+1e-6)`. Training RMS zero and test value one produce **1,000,000**, not zero. Sparsification makes this case relevant.  
   **Exact fix:** preserve the pinned scaler and accurately specify division by epsilon. If zero masking is intended instead, define it as a separate v4 transformation rather than claiming existing behavior. State that subtraction/transforms use Float64 arithmetic on loaded Float32 values. Add the training-zero/test-nonzero regression and bitwise replay test.

3. **BUILD — Commit schedules before certificate evaluation and define the shuffle exactly.**  
   **Evidence:** proposal:26–31.  
   **Problem:** the numbered preflight contradicts its own information-order requirement.  
   **Exact fix:** replay histories, obtain sorted legal UCIs, build and commit schedules, **then** evaluate certificates/read outcomes. Specify forward partial Fisher–Yates: for `i=0…m−1`, draw `j=i+floor(rng()*(n−i))`, swap, and retain the first `m=min(4,n)` entries in draw order. The independent auditor must reproduce those exact schedules.

4. **BUILD — Distinguish unknown equivalence from contradictory known outcomes.**  
   **Evidence:** proposal:28; [inputCollisions:67–69](../../../.codebase/src/chess-input/eyes-v2.mjs:67).  
   **Problem:** the helper flags any distinct answers, including `+1` versus `"unknown"`. That does not prove incompatible consequences.  
   **Exact fix:** stop for an identical-input group containing **both verified +1 and −1**. Report unknown members separately and preserve their no-write slots. Keep the no-exclusion rule. Test known/known contradiction, known/unknown equivalence and quiet/unsafe agreement.

5. **LAUNCH — Separate missing processes from incomplete observations.**  
   **Evidence:** proposal:104; [matching_process:396–419](<../../../python actions/curriculum.py:396>).  
   **Problem:** failure to match every identity field can mean inaccessible metadata, not termination. Existing code deliberately preserves an `unknown` state.  
   **Exact fix:** reconcile three outcomes: verified live→running; verified absence or different process instance→interrupted receipt; failed/incomplete observation→unknown, with launching blocked. Test missing creation metadata, unavailable command information, inventory failure and PID reuse. Do not infer interruption merely from missing fields.

6. **LAUNCH — Bound scoring observation gaps and qualify the precision claim.**  
   **Evidence:** proposal:32,98–99.  
   **Problem:** at three hours across `21×184` scored positions, 50 positions represent approximately **140 seconds between checks on average**. Separately, the MDE calculation describes a normal-approximation **single contrast**, not the complete all-seeds/all-comparators gate.  
   **Exact fix:** guard/pacing checkpoints at least per position, with worst-query latency and cache save/reload peak RSS measured before launch. Label the precision calculation as marginal and assumption-dependent. Its stated models give MDEs of approximately **26.86 and 52.68 positions**, so mark the study exploratory now.

**Building may start after changes 1–4 are incorporated into the specification.** New v4 files can then be developed while r2 continues; active pinned dependencies remain untouched. Launch still requires changes 5–6, the promised validation artifacts and final code review.
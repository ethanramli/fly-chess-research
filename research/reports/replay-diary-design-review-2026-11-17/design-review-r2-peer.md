**VERDICT: APPROVE WITH REQUIRED CHANGES.** Building is allowed after the remaining required-BUILD specification is settled. Reviewed revision 7, blob `8d1fc4f2c5b8717d9ad325b06c9ba2a6a51bf991`, read-only.

All line references below refer to [the design](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md).

1. **RESOLVED — Invisible metadata.** Delivered-input identity now governs supersession, and the replay-tape invariance check directly addresses the counter example (lines 159–167, 191, 255).
2. **RESOLVED — Teaching boundary and receipts, at design level.** Choice, certification, simultaneous stimulation and receipt publication are separated; every development replay must be reconstructed by the auditor (lines 150–165, 254). Implementation remains to be verified.
3. **RESOLVED — Stage 1 adaptation.** The injected codes, prediction-scaled teaching, complete state, six seeds and revised per-seed gates are explicit. The adapter protocol remains a launch prerequisite (lines 289–301).
4. **STILL OPEN — Control specification; required-BUILD.** Exposure matching is substantially repaired. However, the “exact” random-feature control still leaves the projection distribution, retained feature values, rounding of the mean active-cell count and feature ties unspecified (line 281). Freeze these choices; different compliant implementations could produce different attribution verdicts.
5. **STILL OPEN — Reproducibility; required-LAUNCH.** Unknown handling and denominators are materially improved. Game manifests, eligibility counts and worked boundary examples remain pending (line 382). Also freeze the run seeds, random-number generator and hash-to-stream conversion: naming SHA-256 and stream labels alone does not determine the draws (line 206).

**New findings**

1. **required-LAUNCH — The failure summary contradicts the revised forgetting prerequisite.**  
   **Claim:** one uniquely computable stage verdict. **Evidence:** line 319 requires forgetting in **no old replays**, but line 359 declares the stage uninformative when **no diary** retains the earlier learning. Those arms have different first-block training and can satisfy both statements. **Consequence:** one team could accept the stage while another declares it uninformative. **Smallest fix:** make section 8 reference the stage-specific prerequisites in sections 7.3 and 7.4.

2. **optional — The one-page loop omits replay publication.**  
   **Evidence:** lines 78–81 save the online lesson, then perform a replay without showing its atomic publication; line 202 requires that second publication. **Consequence:** the summary is incomplete as an implementation guide. **Smallest fix:** add the replay publication to the loop. The interface itself provides no direct route into move scoring.

**Strongest defensible sentence after a fully audited pass:** “On these predefined tasks, the fly with a disclosed replay diary retained earlier learning while acquiring later learning and combined three separately taught chess ideas on unfamiliar problems better than the listed case-recall and simple-learner controls, with the diary absent during scoring.”
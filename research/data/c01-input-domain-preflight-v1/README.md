# C01 all-legal input cue preflight v1

2026-10-12. Static preflight only; no graph stimulation, C01 training, or curriculum split generation.

The existing bound-ray cue encoder was capture-only. Its shared implementation now has a named all-legal factory for C01; the default factory retains its old identity and behavior. The new factory keeps the same public board/action geometry and fixed eight-cell, 12-current budget while permitting quiet legal moves. The model still receives engineered symbolic board geometry; this is not natural vision or an independently learned action representation.

`verification.json` encodes all 69 legal actions on each of the four already-known software teacher boards using all three frozen projection seeds (207 presentations) and the actual 693-cell candidate KC mapping. It confirms byte-for-byte complete output equality for all 24 capture actions between the archived pre-change default and current default; the all-legal capture payload, projection and dose also match. The 183 quiet actions encode without a consequence/certificate token, with no board/history mutation. The fixed budget is met. Across presentations, 38 feature assignments collide and 2,782 projected cells are dropped by bounded stimulation; these are recorded allocation losses and do not establish separability or transfer. The four boards remain excluded from every C01 split.

The focused cue tests passed four groups across the new all-legal tests and existing capture-only tests. All 29 active G0 source pins and both archived input-source hashes matched during preflight. A prior verifier attempt incorrectly invoked the archived capture-only encoder on quiet actions; that failed before writing evidence and is recorded in the dated [journal](../../journal/experiments/2026-10-11-curriculum-g0-receiver.md).

This closes only static cue-domain preparation. C01 receiver routing, fresh disjoint data families, neural delivery and all learner gates remain pending. The active G0 experiment resumed separately under its unchanged protocol; this cue preflight supplied no graph run.

The paired success/failure probe cue audit adds a separate non-neural check: across four declared probe pairs and three projections (12 comparisons), none had identical eight-cell stimulation sets. Set Jaccard overlap ranged0.143–0.455 (mean0.262); this only shows distinct engineered inputs on known fixtures, not distinct neural responses, learned invariance or transfer. Full rows are in `stimulation-comparisons.json`.

The C01 temporal receiver adapter is now wired through `CaptureRetentionTemporalFeedbackSession`. It preserves proof/scope in the plan receipt, requires a full all-legal unaided ranking, and reuses the shared frame transaction and restore path. Three inert-array adapter groups pass; see the focused test and dated journal. No C01 graph run or dataset has been created, and the active G0 run still governs advancement.

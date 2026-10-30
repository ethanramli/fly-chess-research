# External curriculum review: checked evidence and third prompt

2026-10-21. The researcher supplied [the second external answer](answer-round-2.md) and requested another strong question in the same root file, then explicitly requested removal of redundant wording. [Round 2 input](question-round-2.md) is preserved; [Round 3 input](question-round-3.md) contains the replacement prompt. These are review correspondence, not accepted protocols or launch authorization.

## Checks and interpretation limits

[checks.json](checks.json) preserves source hashes, the selected saved physiological arrays and summaries, all 16 target cue/action projections, scalar calculation inputs/results, and chess legality results. Its source result is `runs/g0-history-replication-20261012-v1-resume-0003/result.json`, SHA256 `55361a633112bebf3c137e334de02340c33d8e07c00f695a081580351bbfbfa5`. The supplied answer hash is `7e2ff34aa3f26bcd2ebe9889dc1fd40200eeb85f94503cdba15d6a647f2f64d5`.

- The retained informative endpoint has gains 0.78644834–1.02095990; none are below 0.21. This contradicts the review's proposed endpoint compression near 0.2. Endpoint inspection cannot exclude every intervening trajectory or identify the cause of the failed margin gate.
- The map has 120 unique KCs across 122 plastic edges. Selected cue subsets overlap; direct input selection alone does not establish action-specific plasticity.
- Under rectangular normalized local rates, the existing scalar integrator gives final gains 1.01068124 for pulse frame 0, 1.00064624 for frame 1, and 0.97673212 for frame 2. The proposed frame-1 repair therefore does not follow from the rule alone. These are illustrative numerical inputs, not measured graph waveforms, and do not establish the correct teaching schedule.
- chess.js finds the White king already in check in the answer's examples 1A/1B/2A/2B/2C, making the claimed reference move a1b1 illegal. Actual legal-move counts are 5/5/6/6/5. These are legal check positions but invalid instances of the stated comparison.
- Additional requested corrections concern VC-dimension overreach, affine negative-patterning separability, fitted probes as capacity proofs, nonzero unseen hash responses, controls selected after an intervention succeeds, and conflating contrast margins with correct paired choices. The third prompt asks the external reviewer to resolve those in an actionable plan; it does not adopt a replacement mechanism.

## Mistakes and change in review approach

The initial one-off legality check attempted the externally claimed safe move directly; chess.js rejected it and stopped that inspection before the remaining examples were reported. The revised inspection enumerates legality and records the failed claim without executing an illegal move. The repeat completed; no graph was loaded or experiment restarted.

The review approach changed from another broad curriculum critique to a focused question grounded in saved state and checked counterexamples. The replacement is about 2,600 words, versus about 5,400 in the prior prompt. Remaining information requests target actual local waveforms and discriminating interventions rather than inferring causes from aggregate margins.

No scientific gate, resource bound, source pin, accepted learning rule, or active run was changed. No final-test family was inspected. G0 remains unpassed. Next step: obtain the external model's conditional analysis; any prospective mechanism or experiment still requires its own source assessment, registration, controls, and audit.

## Fresh-conversation revision

2026-10-21. The researcher will use a fresh chat with the same external model, without prior context, and asked whether search is necessary. [The standalone prompt](question-fresh-chat.md), also published as the root question.md, restores the research objective, constraints, actual dynamics/plasticity/input/readout, teacher contract, G0 design and evidence, twelve stages, and review decisions. It removes references to earlier reviewer replies and their faulty fixtures. Search is explicitly optional: the reviewer can analyze supplied equations and measurements while marking biological claims and source-dependent recommendations for later verification. Earlier prompts and the supplied answer remain preserved above.

## Lichess curriculum reply

2026-10-21. The researcher supplied [the fresh-chat answer](answer-fresh-chat.md), SHA256 `fc200dabf6543f0b807bcfdf499f11e3841c3055f01af3bb12f6c17f43fe0863`, and restated the objective: a reusable Lichess-puzzle loop targeting chess foundations, followed by an experiment testing unfamiliar composition and reasoning. [The reply](question-lichess-curriculum-reply.txt) replaces both root question.md and question.txt. [The preceding input](question-before-lichess-reply.md) remains preserved.

The reply requests stage-specific theme selection, independent task verification, positive/negative experiences, feedback delivery, cumulative rehearsal, family separation, advancement gates, a bounded automated pilot, and a distinct compositional-transfer experiment. It separates the current 122-edge assay from permissible future source-justified learning mechanisms without authorizing either mechanism changes or experiments. It avoids another general G0-only review.

A one-off chess.js inspection confirmed both proposed FENs have six pieces, no initial check, and legal d1d5/g1f2 alternatives. After d1d5, the blocked position has no immediate recapture; the shifted position has both d8d5 and c6d5. Thus the contrast changes recapturability but does not isolate opening a rook ray: it also adds direct pawn defense. The reply requests controls separating those computations. This supersedes no historical run result.

Primary pages read on 2026-10-21: [Lichess database](https://database.lichess.org/), puzzle notes/schema; [theme browser](https://lichess.org/training/themes), motif and advanced categories; [official theme identifiers](https://github.com/lichess-org/lila/blob/master/translation/source/puzzleTheme.xml); and [Aso and Rubin](https://elifesciences.org/articles/16135), abstract and introductory figure description. These support source metadata, setup-move conventions, available tags, and a narrow correction to the answer's categorical timing claim. They do not certify any chess teaching event, map a new physiological pathway, or validate the current learner. No source archive, game PGN, or Lichess puzzle corpus was downloaded.

All new curriculum and mechanism recommendations remain proposed. Root answer.md is unchanged; no graph process was started, no frozen source/gate modified, and no final family inspected. Next step is the external model's concrete curriculum response, followed by project review of any proposed implementation and protocol.

Publication correction: the first archive/readback command found root question.txt missing despite the preceding copy command reporting success; the cause is unconfirmed. The Markdown reply existed. Explicit byte copies recreated the text deliverable and its archive, followed by equality and hash verification. This is a documentation-publication issue, not an experimental recovery or learner failure.

## Standalone Lichess curriculum request

2026-10-21. After exhausting the external model's credits again, the researcher requested another fresh conversation and had already withdrawn the need for text-file copies. [The new standalone prompt](question-fresh-lichess-curriculum.md) is published only to root question.md. It contains the objective, actual receiver equations and limits, G0 outcomes, Lichess source contract, all twelve candidate stages, and requested curriculum/loop/transfer deliverables in about 2,200 words. References to earlier conversations, review disputes, and redundant background were removed. Search is optional, and an approximately 1,800–2,200-word response is requested to focus review cost. No experiment or research conclusion changed.

## Curriculum design response and focused closure

2026-10-21. [The curriculum response](answer-lichess-curriculum.md), SHA256 `d600cad99b5571edb9c86aedafb8eef908f9cf33a866de63b4b4ca692b5c92df`, proposes exchange and king-consequence training, held-out check-plus-threat composition, conditional line-relation work, Lichess lesson construction, a yoked practice loop, and a pilot. The saved answer ends mid-sentence at "If no: S1 can't"; its representation-failure branch is incomplete.

[The focused follow-up](question-curriculum-closure.md), published as root question.md, asks for exact implementation decisions rather than another broad review. Issues requiring resolution include the proposed equivalence of material loss and allowing mate; recapturability versus net material labels; mandatory/optional verification scope; label-free representation similarity as an unjustified hard gate; a potentially answer-bearing additive baseline; composition contamination; curriculum-order versus direct-composite exposure comparisons; synthetic derivative history; and overly broad reset-factorial or causal conclusions. These are design criticisms, not experimentally identified learner causes. No replacement curriculum or mechanism was accepted or launched.

The official Lichess theme-identifier file was rechecked for `oneMove`, `short`, and `xRayAttack`; these IDs exist. Local review did not obtain a corpus, generate certified families, or access final data. The supplied answer remains unchanged, the existing standalone prompt is archived, and no new text copy was requested or written.

# 2026-11-04: proposal to review useful learning before memory v3

The researcher asked for a proposal after the status discussion identified that memory v3 retains the failed v2 matching method and may supply few positive experiences.

Read: memory v3 design and task code, the current matching-memory code, memory v2 results and pathway diagnosis, and the recorded failed practice-data repair attempts. Existing v3 is built and paused; no new run was started or approved.

A training-data-only count reproduced the current 198-game/388-position practice split: 544 safe, 837 unsafe, 12,849 quiet and 13 unknown moves among 14,243 legal moves. A uniformly random legal choice per position gives an expected 15.343 positive events per pass. This is a reference expectation, not a forecast of the learned policy.

New methodological concern: the current v3 test marks every tied top score wrong. The no-memory comparison always ties and therefore automatically scores zero. That is a unique-answer measure, not a fair random-choice baseline. The new proposal recommends consistent seeded tie choices and separate tie reporting; existing code and registered rules were not edited.

Proposed direction, not adopted: a fixed 128-game practice/64-game development screening study selected wholly within existing practice games, with four scheduled practice passes and explicit exploration. Match comparison memories to the informative fly's exact chosen experiences. Declare a minimum diversity of positive experiences; check choice benefit before scaling. A supervised reader, if needed, is a separate diagnostic and cannot replace the primary experience-based claim. All new numeric thresholds are unapproved engineering choices.

Limits recorded: prior game reuse prevents calling these untouched final data; v3 selection guarantees safe captures exist; quiet moves are negative only for this task; natural brightness shortcuts still need checks; unmatched random features do not isolate specific wiring. The 48-fold activity-distance ratio is not a proof of information destruction.

[Proposal](../../../documentation/design/neural-learning/memory-v3-review-proposal-2026-11-04.md). Next: review the proposed design, prepare code/registration if requested, then obtain specific experiment approval. No simulation, training, production code, pinned protocol, or gate was changed.

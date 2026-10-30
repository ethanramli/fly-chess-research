# Close the remaining gaps in the Lichess curriculum

Your plan now connects Lichess selection, bounded consequence verification, cumulative practice, and an unfamiliar-composition test. Treat it as a provisional design. We want to close the implementation gaps, not restart the broad review.

Your answer was truncated after "If no: S1 can't". Complete that branch briefly. Then resolve the points below, using plain Stage 1, Stage 2, etc., rather than S0/S1/E0 names in the reader-facing curriculum. Aim for about 1,000 words; prioritize exact decisions over repeated background. Search is optional; mark biological assumptions provisional.

## 1. Make the task and outcome ordering consistent

You order material LOSS approximately equal to ALLOWS-MATE. That can accept a move allowing mate when another merely loses material. Specify a lexicographic terminal-outcome/material ordering, including draws and unknowns. Do not disguise a bounded material rubric as global chess value.

For Stage 1, choose between immediate recapturability and bounded net exchange value. They need different labels: a recaptured equal-value capture can be materially neutral. Define acceptable quiet moves, all-legal success, and the public criterion. Explain which target is the cheapest informative first pilot.

Define the verifier precisely: which branches must have quiet leaves, whether the five-ply stability check is mandatory, what happens when it cannot run, and the certificate's exact horizon/scope. Agreement at three and five plies does not prove long-term soundness. Measure certification yield before assuming the proposed six-piece corpus is practical. Static exchange evaluation matching a bounded search can be a curation screen; it does not uniquely prove that no other motif mattered.

## 2. Turn the representation proposal into a testable contract

Whole-tuple hashing offers no explicit reusable geometry, but it does not imply identically zero unseen scores: changed gains and overlapping subsets can affect new inputs. More importantly, plastic gains can affect recurrence, so the model is not established to be only a linear readout.

KC similarity reflecting a relation before training is neither a proven necessary condition for learning it nor sufficient evidence of a useful representation. Keep the proposed similarity/permutation check diagnostic unless you can justify a hard gate. Failure cannot automatically identify the defective pathway or prove chess unlearnable.

Specify one minimal elemental encoder: public tokens, action/actor binding, input-cell selection requiring annotation verification, current normalization, and what spatial structure it supplies. Randomly assigning piece-square tokens to upstream neurons does not automatically preserve board geometry. Explicitly distinguish engineered geometry from the consequence relation the brain must learn. State the missing anatomical evidence without inventing a ready mapping.

## 3. Repair the composition experiment and its comparison

Your additive baseline receives "true Stage 1 features" plus "true Stage 2 features." If a Stage 1 feature already contains exact three-ply worst-case exchange value, it may already answer the checking-fork task. Define the baseline's inputs and fitted/fixed rule so we know what beating it establishes.

Give one schematic 2-by-2 interaction family: the component relations, which combinations appear in training, the combination held out, and a relevant intervention that changes the combined consequence. Separate surface features held constant from consequence values that legitimately change. No unchecked FENs needed.

Ensure component-training puzzles do not incidentally teach the held-out check-plus-second-threat combination. Define the exclusion checks.

Use the same multiset of component experiences for the primary staged-versus-interleaved order comparison. Direct composite training is a separate data-efficiency comparison: it has different target exposure. Equal performance means curriculum advantage was not demonstrated under that design, not that no possible benefit or composition exists.

## 4. Preserve history, controls, and diagnostic scope

Deleting pieces creates a derived position whose original PGN no longer reaches it. Define a separate starting-history convention and task scope for synthetic derivatives; do not silently treat their history as resolved or use them for repetition-sensitive claims.

The proposed factorial over every reset and combination is large for an immediate step. Inspect actual code dependencies first: a logged event counter should not require graph experiments if it never enters the dynamics. Choose the smallest matched partial-reset comparison that answers the relevant question, preserving controls and the frozen experiment. A failed component explanation does not imply a margin/readout-scale cause by elimination.

Yoking controls to the informative-selected public sequence estimates a conditional feedback effect. Explain what additional question a fixed-schedule informative comparison answers before adding it to every pilot. Preserve registered audit/recovery tolerances and resource guards rather than replacing them with generic defaults.

## Return the implementation decision

Provide only:

1. A corrected numbered stage order, distinguishing training stages, diagnostic prerequisites, and the held-out composition experiment. Explain whether line/blocker/pin learning precedes or follows that experiment and why.
2. The precise first-pilot task, representation, certificate/label contract, and minimal matched conditions.
3. Compact lesson-loop pseudocode and advancement/retention/unknown/stop rules, with unresolved thresholds explicitly left for pilot estimation.
4. The corrected composition and curriculum-order comparison, plus the few measurements still blocking registration.

Keep the research endpoint intact: use repeatable Lichess-derived experience to acquire reusable foundations, then test unfamiliar consequence-sensitive composition. Do not promote a diagnostic pass to reasoning, or turn an unimplemented prerequisite into a permanent ban on later stages.

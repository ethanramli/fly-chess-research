# Fixed-readout feasibility diagnostic, 2026-10-31

Declared before running this diagnostic. No gates, fixture levels, candidate equations or old outputs change. This is a mathematical test instrument, never fitted candidate state. Development fixtures only; held-out fixtures stay unopened.

Question: can any gains in the candidates' [0.2,1] range simultaneously meet G4 (reversed A at T3) and G6 (original B still preferred)? Suspected conflict: q=0.5,w=0.5 congruent shares all discriminating focal KCs; graded rates, rather than distinct discriminating cells, are the remaining distinction.

Let x_i = magnitude_P_i - magnitude_R_i. With fixed base weights its generous allowed box is [0.2 P_i-R_i, P_i-0.2 R_i], expanded for Float32 rounding. Let a_i=(A-_i-A+_i)/(1.5*s), b_i=(B+_i-B-_i)/(1.5*s). The reversed A margin is a.x and preserved B needs b.x>0. Relax this to b.x>=0. For every lambda>=0:

`a.x <= (a+lambda*b).x <= sum_i max((a_i+lambda*b_i)*lo_i,(a_i+lambda*b_i)*hi_i)`.

Evaluate zero and all nonnegative coefficient breakpoints -a_i/b_i. Every resulting certificate is an upper bound independently of optimization correctness. A bound below G4's required margin proves incompatibility for that seed under this static readout. Arbitrary per-edge states and unlimited training cannot exceed it while the same readout and gain range apply. It does not prove absence of information in the patterns, incapacity of nonlinear/contextual readouts, or inability of a real fly.

Compute all 108 original cells and 12 development seeds; report all cells. G6 allows one failing seed out of 12. For cell-level inference, replace the smallest floor(0.1*N) bounds with positive infinity before taking their median: this gives an optimistic upper bound allowing those seeds to abandon B. Compare this optimistic median with G4=0.40. This avoids confusing per-seed infeasibility with aggregate gate infeasibility.

Predictions and alternatives: (1) the q=0.5,w=0.5 congruent cell is incompatible even with optimal gains; (2) lower-overlap cells remain representationally possible, so their actual learner failures cannot be blamed on this bound; (3) if no bound rules out a gated cell, the representation hypothesis remains unproven and the next step is a local-rule/exposure diagnostic. No state returned by this diagnostic is installed in any learner.

Checks: independent 2D vertex enumeration, analytically opposing vectors, invalid inputs, fixture/hash determinism; then raw seed certificates and reconstruction of aggregate bounds. Pacing 0.5, heap 256 MiB, RSS 2048 MiB, free memory 256 MiB. Existing six-loop/two-family cap remains. This diagnostic is not another mechanism family or candidate repair.

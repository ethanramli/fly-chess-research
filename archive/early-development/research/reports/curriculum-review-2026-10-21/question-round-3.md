# Round 3: use measured state to choose the next experiment

Your second review made valuable corrections: the rule is bidirectional, teacher replay can support a learned evaluator without proving internal search, and a linear probe alone cannot establish encoder leakage. Please build on those corrections.

We checked several recommendations and extracted the saved state you requested. Some findings contradict your proposed diagnosis and implementation. **What should we actually do next, given this evidence, and what would that study establish?** We need a defensible experimental decision rather than another comprehensive review. Keep explanations focused on decisions that change the research plan; do not repeat background, agreed constraints, or the entire curriculum.

Use the prior conversation for the architecture and research objective. Preserve the possibility of longer-horizon reasoning without assuming it will emerge. You may recommend changing the learner, representation, or curriculum, but distinguish a justified diagnostic from a validated remedy. Do not interpret our challenges as a request to defend the current design.

## 1. New evidence from the actual saved G0 state

We read the independently replayed result for projection seed 20261012, including its saved physiological arrays. No new graph execution, training, or final-family access occurred. The result's SHA256 is `55361a633112bebf3c137e334de02340c33d8e07c00f695a081580351bbfbfa5`.

The prefix snapshot is after acquisition plus interference, immediately before the reversal branches. Gain bounds remain [0.2, 1.8]. These summaries include all 122 plastic edges:

| Snapshot | Minimum gain | Median gain | Maximum gain | Mean gain | Gains below 1 | Gains below 0.21 |
|---|---:|---:|---:|---:|---:|---:|
| Informative prefix | 0.85676349 | 0.99695397 | 1.04067349 | 0.98009410 | 67 | 0 |
| Informative retained reversal endpoint | 0.78644834 | 0.97726248 | 1.02095990 | 0.96701027 | 89 | 0 |
| Informative reset reversal endpoint | 0.82513573 | 1.00001645 | 1.05965603 | 0.98570195 | 58 | 0 |
| Shuffled-20261011 retained reversal endpoint | 0.78377088 | 0.97877689 | 1.04843691 | 0.96710553 | 84 | 0 |

Maximum saved filter/trace values:

| Snapshot | KC credit e | Short S | Long L |
|---|---:|---:|---:|
| Informative prefix | 7.5050571e-4 | 1.1135765e-8 | 9.9896746e-6 |
| Informative retained reversal endpoint | 7.5050568e-4 | 8.2362277e-8 | 3.3208783e-5 |
| Informative reset reversal endpoint | 7.5050568e-4 | 8.2362450e-8 | 3.3208828e-5 |

Retained informative reversal is still 7/8 with mean oriented margin 0.00010604, versus 5/8 and margin 0.00030735 for shuffled-20261011. The failed informative context is `0101`: expected A, chose B, margin -0.0001997288054. Its reset counterpart chooses A with margin +0.0006017216646. All old failed gates remain failed; reset passing is not a G0 pass.

The registered map contains **120 unique KC cells and 122 plastic edges**, not 122 independent input cells. Two cells each participate in two mapped edges. For the 16 target cue/action tuples, the actual encoder selects these eight-cell subsets. Entries are zero-based indices into the sorted 120-cell pool, not anatomical neuron identities:

```text
cue   action  selected KC pool indices
0000  A       3 24 42 51 85 94 107 112
0000  B       4 9 10 28 38 43 52 81
0001  A       46 54 56 68 71 93 103 118
0001  B       11 25 41 54 89 91 96 110
0010  A       1 8 21 37 55 66 106 113
0010  B       17 24 27 48 69 85 93 105
0011  A       25 65 67 74 86 92 109 115
0011  B       26 42 44 49 65 79 106 116
0100  A       35 51 78 80 92 95 101 106
0100  B       9 81 82 92 98 100 108 118
0101  A       5 56 67 101 108 116 118 119
0101  B       17 22 37 48 63 81 84 101
0110  A       26 29 43 50 74 76 113 119
0110  B       6 19 20 26 52 56 69 88
0111  A       4 5 19 34 44 63 92 97
0111  B       0 19 25 53 83 90 91 111
```

These are directly stimulated cells, not the full recurrently evoked activity or eligibility patterns. Interference-cue projections and within-episode local waveforms have not been supplied here. Endpoints do not reveal every intermediate state.

Please reconsider your statements that both choices approach gains of approximately 0.2 and that floor compression explains the observed margin. Which mechanisms remain plausible given these measurements? Could modest history-dependent changes away from the bounds still affect rankings through the readout or recurrence? Explain what the near-equal terminal traces do and do not tell us about earlier carryover. Use the measured overlaps without treating shared cells as proof of causal interference.

## 2. Your proposed pulse shift does not follow from the scalar rule

We evaluated the existing scalar integrator under an explicitly simplified input, without loading or running the graph:

- Initial g=1 and e=S=L=0.
- Normalized k=1 during cue frame 2, and 0 otherwise.
- Normalized r=1 during the selected pulse frame, and 0 otherwise.
- Nineteen zero-indexed frames, eight intervals of 0.075 per frame.
- Your disclosed parameters: eta=0.5; gain bounds 0.2/1.8; tauKC=0.4, tauShort=0.6, tauLong=1.
- The existing integrator handles the within-interval sign change of L-S.

| Pulse frame | Final g | Integrated depression dose | Integrated potentiation dose |
|---:|---:|---:|---:|
| 0: current favorable code | 1.0106812377 | 0 | 0.0134414804 |
| 1: your proposed favorable shift | 1.0006462385 | 0.0053026377 | 0.0060827926 |
| 2: current adverse code | 0.9767321164 | 0.0309642683 | 0.0013642924 |

Thus the frame-1 shift gives **less net potentiation** than frame 0 in this illustration. This does not establish what either schedule does in the recurrent graph; local DAN/KC rates are not rectangular injected-current pulses.

Your time indexing also places cue frame 2 at [0.6, 1.2] in one passage; with zero-indexed frames it is [1.2, 1.8]. For a unit DAN pulse lasting 0.6 from zero filter state, S at offset is 1-exp(-1), L is 1-exp(-0.6). The positive L-S peak occurs about **1.2720 units after pulse offset**, not 0.766. For a frame-0 pulse, that is about t=1.8720, in frame 3. Please independently check this finite-duration calculation.

What, if anything, can be predicted about a useful pulse change without the actual local waveforms? Derive the relevant overlap integral and gain dependence rather than positioning a pulse by an impulse-response peak. If the toy calculation contradicts your intended explanation, correct the explanation. Specify the smallest saved-data or bounded numerical check needed before registering a new schedule.

## 3. Tighten the claims about learning capacity and causation

Several proposed conclusions would determine whether we expand plasticity or abandon a representation. Please make the logic precise:

1. **A neuron count is not a proof of task capacity.** You invoke VC dimension to say 122 gains cannot separate hundreds of relations. A VC bound limits shattering arbitrary labelings; it does not mean a 122-parameter model cannot solve a particular structured task with many examples. Gains also affect nonlinear recurrent activity, so a frozen KC feature matrix is not automatically an exact model of the learner. Which useful capacity bound can actually be established here? What can a fitted linear comparison establish, and what cannot be inferred from its success or failure on validation?
2. **Whole-cue hashing does not imply exactly zero unseen scores.** Unseen tuples can stimulate KCs whose gains have already changed, and the mean learned gain need not be one. Please replace the claim of mathematical impossibility and identically zero output with an explicit statement about what label-blind random mapping can or cannot support across unseen structured inputs. Distinguish an individual deterministic projection, expectations over projection seeds, and systematic transfer.
3. **Negative patterning needs its assumptions stated.** With additive inputs A=(1,0), B=(0,1), AB=(1,1), the affine score 1.5-x1-x2 gives A+, B+, AB-. Biconditional discrimination has a different separability property. Under what precise restrictions on offsets, thresholds, reference subtraction, and compound normalization would a negative-patterning assay identify nonlinear binding in this architecture?
4. **Credit is not confined to directly selected cells.** Your replay argument says unselected actions' KCs necessarily have zero eligibility and no update. The supplied subsets overlap, the graph is recurrent, and traces persist. What intervention would demonstrate context/action selectivity rather than assume it from the input tuple?
5. **A successful intervention does not prove a unique cause.** Whole-memory reset need not rule out an interaction between history, the fixed projection, graph dynamics, and readout. Flushing e/S/L could rescue behavior through several mechanisms; failure of flushing and a timing change cannot by itself prove a collision bottleneck. State which hypotheses a proposed comparison distinguishes and which remain observationally compatible.

We are not demanding a formal theorem for every engineering choice. We are asking you to label heuristic screens as screens, fitted comparisons as comparisons, and causal findings by the scope of their intervention. Avoid declaring causes proven merely because one intervention improves a metric.

## 4. Rebuild the representation and chess examples without supplying the answer

Your representation options add pairwise/ray-aligned hashes, relative offsets, post-move boards, or scans centered on the candidate. Some may be reasonable interfaces; some could perform the relationship the experiment claims the brain learns.

For the **first** chess assay, choose one concrete public-input contract and identify exactly where coordinate binding, pair selection, direction/offset calculation, nonlinear conjunction, and legal-rule computation occur. Explain the supported claim if relative geometry is engineered, versus learned inside the connectome. Do not add pairwise ray features as an automatic response to a failed linear probe.

Then define one task consistently. Your original target was recapturability; your second review often replaces it with net material preference or king evasion. Those targets are different. An equal-value capture that can be recaptured may be materially neutral, and a safe quiet move may be perfectly acceptable. In a legal-only candidate set, choosing a king move to an unattacked square already has much of its safety supplied by move filtering. Which bounded task best tests the intended consequence-sensitive relation, and what is the success set for every legal action?

We checked your FENs using the repository's existing chess.js library:

| Example | White already in check? | Actual White legal moves | Is proposed quiet alternative a1b1 legal? |
|---|---|---:|---|
| 1A | Yes | 5 | No |
| 1B | Yes | 5 | No |
| 2A | Yes | 6 | No |
| 2B | Yes | 6 | No |
| 2C | Yes | 5 | No |

For example, `4k3/8/2p5/b7/8/8/8/R3K3 w - - 0 1` has the black bishop checking Ke1 along a5-b4-c3-d2-e1. Its legal White moves are `a1a5, e1e2, e1f2, e1f1, e1d1`. These FENs can represent legal check positions, but they do not supply the claimed capture-versus-quiet comparisons. Your blocked-pin example also exceeds its stated six-piece limit, and moving that blocker between colors does not reduce piece count.

Please provide **one** corrected legal minimal pair, with both kings, side to move, a focal move and a legal reference move in both positions, exact task-relative consequences, all required replies, and the nuisance variables that still differ. Validate it with tools if available; otherwise label it a proposed fixture and specify the checks needed. Do not describe examples as fully verified without execution evidence. A collection of unchecked FENs is less useful than one sound task definition.

## 5. Specify a discriminating study rather than a presumed repair

Your proposed experiment combines per-episode filter flushing, a reversal-boundary gain reset, and a conditional timing change. It applies controls to the "winning arm" and proposes immediate advancement if a modified condition passes.

Using the new state data, choose the **smallest study that materially changes the next decision**. First decide whether existing checkpoint analysis can answer the relevant question; if so, specify that analysis before a graph run. If a new graph intervention is needed, state:

- The estimand: which behavioral or mechanistic difference is measured?
- The exact intervention boundary and variables changed, with a matched reference. Distinguish changing state at the reversal boundary from flushing it after every lesson.
- Informative and causal-control conditions declared before observing the candidate outcome. Preserve matched exposure, assessment timing, and physiological-state treatment within comparisons; do not select a successful candidate and only then design its controls.
- What each outcome supports, what it cannot identify, and the remaining alternatives.
- How an artificial reset is reported. Uncalibrated model units cannot justify calling instantaneous e/S/L zeroing a biological inter-trial interval. If modeling an interval, specify what dynamics advance and whether gains also evolve.
- The qualification needed before a changed receiver can enter chess. A diagnostic rescue does not retroactively pass frozen G0 or replace a new complete prerequisite assessment.

Do not insist that every step needs a large factorial design. Offer a minimal identifiable comparison, explain its limitations, and give the next branch only if needed.

## 6. Keep behavioral gates and automation scientifically useful

Your paired contrast M(positive)-M(negative) is useful, but a positive contrast alone can coexist with the wrong preference in both positions: margins +0.2 and +0.1 give a positive contrast while both favor capture. What behavioral success measure must accompany it? Preserve raw margins when scoring ties; assigning an entire family's contrast to zero because one comparison ties changes the estimand.

Please also correct your sample-size illustration: its effect/SE is about 2.619. Under a known-variance, one-sided normal approximation with alpha=0.025, power is approximately Phi(2.619-1.960)=0.746, before accounting for uncertain variance components and only three seeds. The numbers were hypothetical, so they do not validate our existing final-set quota. Give a practical pilot-to-confirmation rule, rather than another fixed threshold with no empirical basis.

The existing Python facility runs a registered train-to-audit cycle and supports identity-checked recovery. We want unattended work when the decision rules are fixed. Your campaign proposal should preserve the original frozen experiments' exact resource, replay, stopping, and recovery contracts. The recorded 2.86-hour training and 1.56-hour audit figures are invocation/workload observations, not established per-arm costs or a profile showing 99.9% matrix multiplication. A larger action set does not multiply all lesson costs equally. Avoid unmeasured speedups, new approximate audit tolerances, or `(FEN, move)` caches that omit history, model, encoder, readout, and reference identities.

What can a registered campaign safely execute before returning a compact scientific decision report? What must cause it to stop? Separate predeclared operational recovery from retrying a scientifically failed condition, and avoid automatic promotion on a diagnostic margin alone.

## Deliver the decision

Please answer in this order:

1. **Updated assessment:** Which conclusions change with the actual state, scalar calculation, and legality checks? State what remains promising and the largest unresolved obstacle to a genuine transfer result.
2. **One next study or saved-data analysis:** Give an implementation-ready specification with conditions, measurements, outcome interpretations, and a bounded automation/review boundary. Resolve the causal and statistical issues above where they affect this study.
3. **The route forward:** Give the first chess assay's representation/task contract and explain how its result would distinguish a learning-rule limitation, a representation limitation, and useful relational transfer. Then describe the smallest later comparison that would test whether staged learning improves acquisition or composition over matched direct/interleaved training.
4. **Remaining information:** Ask for only the specific missing measurements that could change those decisions. If another local waveform or checkpoint slice is essential, identify the relevant variables, times, and expected contrast. We can retrieve existing artifacts; do not invent their contents.

Use primary sources for biological claims, with the species and experimental scope stated. You do not need to repeat the previous literature review. Where a calculation is feasible, show assumptions and calculate it. Where evidence is insufficient, give a conditional conclusion. We want the strongest defensible plan, even if it requires rejecting both the original curriculum and parts of your replacement.

# Living-fly learning: primary experimental evidence

2026-10-06 researcher asks whether a fly can learn at all. Yes: the following are primary experiments on living Drosophila, not connectome simulations. They motivate controlled association/retention/reversal prerequisites, not a claim of chess reasoning.

## Acquisition and retention

[Tully and Quinn, 1985, Classical conditioning and retention in normal and mutant Drosophila melanogaster](https://pubmed.ncbi.nlm.nih.gov/3939242/), DOI [10.1007/BF01350033](https://doi.org/10.1007/BF01350033). Accessed 2026-10-06: indexed primary PubMed abstract; direct opening returned limited text. Full article/methods were not inspected in this check.

Two odors were presented, one paired with electric shocks. Typically 95% of trained flies avoided the shock-associated odor in a subsequent choice test. Odor-only, shock-only and explicitly unpaired controls did not produce the associative-learning index. Wild-type memory remained detectable 24 hours later. These controls distinguish cue-outcome learning from a general exposure effect; reported percentages are specific to that experiment.

## Updating learned behavior and causal circuit evidence

[McCurdy et al., Nature Communications 2021](https://www.nature.com/articles/s41467-021-21388-w), DOI 10.1038/s41467-021-21388-w. Accessed 2026-10-06: primary HTML results and Figure 1/2 captions, with cookie redirection; source-data extraction not performed.

Flies avoided a shock-paired odor after acquisition. Reversing the odor/shock contingencies reduced that learned avoidance. Activating reward-encoding PAM-beta-prime-2a neurons enhanced reversal; silencing them impaired it relative to controls. The study combines behavioral measurements and targeted circuit interventions, rather than inferring learning solely from connectivity.

## Implication for FlyChess

Living-fly association learning is established experimental evidence. That does not establish transferable chess reasoning, validate our exact equations/readout/stimulation, or show that released wiring alone reproduces memory. Our unresolved question is whether the implemented experiences, feedback pathways and memory dynamics produce useful persistent choices and unfamiliar transfer. Animal results justify testing supported mechanisms; they are not a replacement for simulation validation.

No new learning mechanism or protocol change is introduced by this evidence note. Weight freezing remains a proposed alternative whose effect on the research question must be explicit. Baseline wiring is already fixed; learned snapshots are frozen during evaluation. See [source register](source-solution-register.md), [weight-freezing boundary](../../documentation/design/research-goals/fixed-weight-proposal.md) and [positive-channel experiment](../../documentation/design/neural-learning/positive-feedback-v1.md).

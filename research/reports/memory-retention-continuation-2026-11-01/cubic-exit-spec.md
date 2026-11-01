# Cubic reservoir exit: prospective development comparison

2026-11-01, before code or data for this variant. Parent script SHA256: `58753488dac336eaf45d7db6cfdb2ed39c7a1174f6617df3822c52a1f7e22654`. The old R1-R5 marks stay unchanged. No sweep or held-out/final puzzle access.

## Failure, hypothesis, and one change

The original graph assay retains median margin ratio 0.522180 during 400 noisy frames (1600 model units). Absent feedback also changes gains, so presentations can induce plasticity without a teacher event. These observations do not establish a biological cause.

Hypothesis: low-amplitude DAN drive repeatedly releases stabilized reservoir mass, rather than new board inputs necessarily erasing the useful representation. Compare the old quadratic exit with one fixed cubic exit:

`base = trace * eta * drive * dt`

`p_buffer = 1 - exp(-base)` (unchanged)

`p_exit = 1 - exp(-base * (drive / 0.25)^2)` (quadratic rule used the first power)

All four probability transfers, gain bounds, eligibility, eta=2, V0=1.2, tonic=0.75, 20 winners, fixed Eyes v1, graph/signs, choices and feedback schedule stay unchanged. No exact zero-noise deadband is added. Weak signals still act. At drive=0.25 both rules agree; below it the new exit is smaller, above it larger. No labels, task IDs, targets or consequences enter the memory update.

Predictions: the unchanged R4 ratio exceeds .70; R1/R2/R3/R5 still pass. A single failure is a joint failure. Acquisition/reversal must be checked because stronger protection can prevent revision. The old six seeds 4101-4106 are development data; a pass cannot become held-out confirmation.

## Source status and limitations

This exponent is an **engineering hypothesis**, not measured fly biochemistry. It tests whether separating weak ongoing drive from stronger teaching is computationally sufficient. No source supplies exponent 3, d0=.25, the four-state store, the tonic current or the modeled time units.

Primary-source recheck, accessed 2026-11-01: [Handler et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC9012144/), Results on compartmentalized cAMP and ER calcium and Discussion on brief independent versus paired stimuli; [Himmelreich et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC6168074/), Results on differential receptor/G-protein dose responses; [Cohn et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4732734/), Figure 7 text/legend and Methods pairing intervals; [Berry et al. 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC4083655/), abstract, DAMB results and discussion. These support distinct signaling and the existence of active forgetting, not this equation. In particular, sensitive DAMB signaling cautions against explaining all biological forgetting by this single protected update. No figures, supplements or complete dose-response fits were inspected.

The hypothesis leaves protein synthesis, receptor kinetics, post-learning consolidation, real visual-KC normalization and long biological retention unresolved. A pass would identify a computational route worth testing, not satisfy the full biological research goal. The Eyes-to-KC rank relay remains a substantial external engineering approximation.

## Measurement and integrity repairs

Keep the original schedule. Add per-phase disk snapshots, streamed local-observation receipts, exact input codes and code hashes, true fresh-model restore (first seed), source/input identities and per-item/per-seed outcomes. Analyze the original marks separately from stricter diagnostics; do not upgrade median-of-median gates into universal success. Receipts independently replay local updates and check synthetic consequence bindings; they cannot alone independently establish the full graph's recorded neural activity.

Resources: one sparse graph process, heap 256 MiB, RSS <=2048 MiB, free system memory >=256 MiB, duty .5, bounded elapsed 10800 s. Pace by short segments, publish progress after each arm and checkpoints before progress acknowledgments. Interruption never silently restarts work; preserve partial receipts and snapshots. New outputs only.

Order: (1) independent old-result audit, (2) small local-math checks, (3) development run with informative/absent/matched-shuffled/disabled arms, (4) independent receipt replay and mark calculation, (5) only if joint success, specify and execute a fresh-seed delay/continued-learning test without changing the rule.

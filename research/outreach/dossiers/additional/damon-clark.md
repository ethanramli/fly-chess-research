# Damon A. Clark — referral research brief

14 October preparation: [one-page project draft](../../planning/damon-clark-one-page-brief-2026-10-14.md) and [internal evidence check](../../planning/damon-clark-brief-evidence-2026-10-14.md). The G0 eight-association result is distinct from chess puzzle or transfer accuracy.

Prepared and sources accessed: 13 October 2026, Asia/Jakarta. Research briefing, not an email or an adopted learning mechanism.

## Referral context

Ethan reports that the meeting with Dr Li Yan McCurdy went very well, that she was impressed, and that she offered a personal referral to Damon Clark. She cannot mentor the project because she no longer conducts this research. Ethan's notes also say “read Damon Clark's paper” and “Matthew Creamer.” He clarified that reading is general preparation for what he could do with Clark; no specific paper needs to be identified. The papers below are our reasoned preparation choices. These are the researcher's meeting notes; delivery of the introduction, Clark's response and any mentoring agreement have not been checked. No message was sent during this research.

## Who he is

Clark is a Yale professor of Molecular, Cellular and Developmental Biology, Physics and Neuroscience. His lab also lists him as Director of the Quantitative Biology Institute and a Wu Tsai Institute member. He trained in physics at Princeton and Harvard and did postdoctoral work at Stanford. [Yale faculty profile](https://medicine.yale.edu/profile/damon-clark/), [current lab](https://clarklab.yale.edu/).

His lab studies neural computation through fly visual behavior, neural measurements, circuit manipulation and mathematical models. It asks how circuits infer useful information from sensory inputs and convert it into behavior. [Lab research statement](https://clarklab.yale.edu/).

Published professional contact: `damon.clark@yale.edu`, on the official lab site. Use McCurdy's introduction as the immediate contact route; do not imply that Clark has already agreed to advise or supervise. The site's general recruitment notice addresses undergraduate/graduate/postdoctoral applicants and does not establish a high-school mentoring offer.

## Why the referral makes sense for FlyChess

This is a reasoned project-fit assessment, not Clark's evaluation of the project. His combination of circuit experiments and models is relevant to questions such as:

- What does anatomical wiring constrain once neural dynamics, sensory input and readout are chosen?
- Which independent measurements or interventions could validate a modeled computation?
- How can successful task behavior arise through different mechanisms, and how would we distinguish them?
- Which test could separate a representation limitation from a memory or readout limitation?

The reviewed program emphasizes vision and sensorimotor computation. It does not establish a specialization in chess, mushroom-body reward-omission learning or the current G0 failure. Ask which part he can help evaluate, rather than assuming he has a plasticity repair ready. FlyChess's symbolic inputs bypass modeled eyes; these visual papers do not supply an implemented sensory system for our learner.

## First reading: recommended preparation for talking with Clark

**Mano, Creamer, Badwan and Clark (2021), “Predicting individual neuron responses with anatomically constrained task optimization.”** [Accessible paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8741219/), [DOI](https://doi.org/10.1016/j.cub.2021.06.090).

Small models based on fly motion-circuit anatomy were optimized to estimate movement of natural scenes. Their units reproduced several measured neuron properties without being trained directly on those properties; noise conditions affected the resemblance. Training used gradient descent with Adam. This was task optimization in small visual models, not a whole-fly demonstration of endogenous reward learning. These distinctions make it a useful methodological comparison for FlyChess. Creamer's coauthorship also connects the two names in Ethan's notes. This is our reading recommendation, not an exact title attributed to McCurdy.

Suggested reading order: summary; Figure2 and task/model description; Figure3's model-to-neuron comparisons; noise results; discussion; methods' training/parameter assumptions. For every figure ask: what was constrained, what was optimized, and what independent observation was predicted?

Author-linked [model code](https://github.com/ClarkLabCode/T4T5TrainingCode) is public. It was inspected through its README only; nothing was downloaded, executed or integrated. Gradient-based training remains a comparison under this project's objective.

## Second reading: why task success does not identify a biological mechanism

**Zhou, Li, Kim, Lafferty and Clark (2022), “Shallow neural networks trained to detect collisions recover features of visual loom-selective neurons.”** [Accessible paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8849349/), [DOI](https://doi.org/10.7554/eLife.72067).

Anatomically inspired collision-detection models produced distinct optimized solutions. One reproduced important properties of fly LPLC2 neurons; another could perform the task despite differing from that biological solution. For FlyChess, the methodological lesson is to test biological/model correspondence separately from task performance. This is a proposed reading inference, not evidence that our own mechanism is faithful.

## Optional reading: evidence against an interpretation

**Tanaka and colleagues, including Clark (2023), “Neural mechanisms to incorporate visual counterevidence in self-movement estimation.”** [Accessible paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC10848174/).

The study examines how stationary visual information can oppose an interpretation of self-motion, using behavior, circuit evidence and computational comparisons. Its connection to the project's interest in counterfactual/refutation tests is conceptual; this sensory computation is not evidence of chess reasoning, learned contingency reversal or a transferable reward pathway.

## Matthew S. Creamer: the connection

The Clark lab lists Creamer as a 2019 neuroscience PhD alumnus. He coauthored the 2021 task-optimization paper. His subsequent Princeton work with Andrew Leifer and Jonathan Pillow concerns neural dynamics and connectome-constrained models. [Clark alumni page](https://clarklab.yale.edu/our-team), [author-owned research page](https://matthewcreamer.com/).

Current-role correction: Clark's alumni page still labels him a Princeton postdoc. The [Pillow lab](https://pillowlab.princeton.edu/people.html) and [Leifer lab](https://leiferlab.princeton.edu/people.php) give the appointment as 2019–2025 and now identify him with Memazing; Pillow specifies co-founder and lead engineer. His author-owned professional LinkedIn also lists that role. Do not reuse the older appointment as confirmed current employment.

**Creamer, Leifer and Pillow, “Bridging the gap between the connectome and whole-brain activity in C. elegans.”** [Preprint version 4](https://www.biorxiv.org/content/10.1101/2024.09.22.614271v4), posted 18 May 2026. The abstract describes a connectome-constrained dynamical model fitted to recorded perturbation responses and compared with shuffled connectivity. It is useful for learning how anatomy-to-function models are tested against causal data. It concerns worms and data-fitted dynamics, not our fly's chess learning. This review checked the version 4 abstract rather than full methods; earlier preprint versions report different performance figures and must not be mixed.

## A useful opening question for Clark

“I am building a from-scratch connectome-constrained model with a local modeled learning mechanism. Some familiar choices improve, but transfer remains unresolved, and the latest simple-association assay failed the reversal control comparison. What experiment would best separate a limitation of the representation, the local memory mechanism and the readout, while testing what the anatomical wiring contributes?”

Have the [plain-English curriculum and status](../../../../documentation/design/puzzle-learning/principles-curriculum-plain-english.md), one failed transfer example and the exact interface assumptions ready. Refresh experiment status before a future conversation. Ask what role is realistic: an initial critique, a relevant paper, a discussion with someone in the lab or periodic guidance.

## Source coverage and limits

Read official Yale profile/lab/team/publication pages and current Princeton lab alumni entries; 2021 paper summary/results/discussion/selected methods; 2022 paper abstract/introduction and results search passages; selected2023 full-text introduction/results; Creamer's author-owned page; version4 preprint abstract; author code README. This is a scoped reading brief, not an exhaustive literature review, replication or assessment of mentoring availability. No metrics from search-generated author biographies or citation counts were used to judge scientific fit.

Retrieval corrections: the eLife URL copied from Clark's publication list ends72076, but the primary collision paper is72067; use the verified PMC/DOI above. The original eLife fetch returned a client challenge, and the primary PMC copy supplied accessible text. The bioRxiv result metadata's January date conflicts with the page's explicit18 May2026 posting date; the versioned page date governs this note. No externally sourced mechanism was adopted or used experimentally.

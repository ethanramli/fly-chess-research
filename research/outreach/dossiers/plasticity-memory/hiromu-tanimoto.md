# Hiromu Tanimoto

**Status:** Draft research dossier; verify immediately before outreach.  
**Last verified:** 2026-09-30

## Snapshot

- **Role/institution:** Professor in the Graduate School of Life Sciences, Tohoku University; leads the Neuroethology laboratory. [S1, S2]
- **Official profile:** [Tohoku faculty profile](https://www.lifesci.tohoku.ac.jp/en/research/teacher/detail.html?id=18222). [S1]
- **Local time:** Sendai, Japan; Japan Standard Time (UTC+9) on 2026-09-30. [S3]
- **Professional contact route:** The official Tohoku faculty listing publishes `hiromu.tanimoto.d3@tohoku.ac.jp` (rendered with a full-width at-sign there); his 2026 paper also lists `hiromut@m.tohoku.ac.jp` for correspondence. Prefer the official university listing. [S1, S4]
- **Verification confidence:** High for role, laboratory and contact; high for the date-specific timezone.

## Why this person is relevant

The Neuroethology lab studies Drosophila learning and memory, including memory formation, consolidation and recall, using behavioral analysis and targeted neural manipulation. Its recent work directly investigates how reward intensity is represented in dopaminergic neurons, relevant to modeling teacher feedback without equating an external score with a biological update. [S2, S4]

## Current and relevant work

- **2026 — “Presynaptic computation of reward intensities through the dual autoreceptor system,” Current Biology.** The paper reports opposing roles for Dop1R1 and Dop2R in gain control of reward signals in Drosophila dopaminergic neurons, including responses to different reward intensities. [S4]
- **2024 — “Synaptic enrichment and dynamic regulation of the two opposing dopamine receptors within the same neurons,” eLife.** This study examines localization and regulation of opposing dopamine receptors within the same neurons, offering a concrete cellular mechanism beyond a scalar reward input. [S5]
- **2022 — “Nutrient responding peptide hormone CCHa2 consolidates appetitive memory,” Frontiers in Behavioral Neuroscience.** The study links nutrient signals to reward dopamine neurons in appetitive long-term memory consolidation. [S1, S6]

## Specific overlap with FlyChess

The project’s gamma4 prototype uses mapped neurons and local efficacy state, but the mapping from chess feedback to natural reward circuitry is unresolved, and the full reversal gate failed in 3 of 6 seeds. Tanimoto’s work could inform how reward intensity and internal state should be represented, what receptor or neuron annotations are needed, and which reversal controls separate acquisition from feedback sensitivity. Any transfer to chess remains an engineering hypothesis, not evidence of biological chess learning. [S2, S4, S5]

## Best bounded question

In a connectome-constrained model with incomplete reward-neuron dynamics, what minimal biological distinction would you preserve to test whether weak reversal reflects reward-intensity coding or memory persistence?

## Reasons they may not be the best first contact

The lab’s experimental system and paradigms are primarily fly sensory/appetitive learning, not computational chess or whole-brain low-memory simulation. A current assistant professor working on action planning and sensorimotor decisions may be better placed to comment on the project’s sensory/action interface. [S2]

## Junior or assistant routes

- **Tzu-Ting Huang — Assistant Professor, Tohoku University, Neuroethology lab.** The university describes her work as molecular and circuit mechanisms of action planning, decision-making and sensorimotor coordination underlying learning. She is a particularly relevant route for the project’s currently unresolved input/action mappings. Her official profile lists a university phone and lab website, but no personal email; contact through the department’s lab route. [S7, S2]
- The current English laboratory faculty listing identifies Professor Tanimoto, Associate Professor Masayuki Koganezawa and Assistant Professor Huang; it does not provide a postdoctoral or graduate-member roster. [S2]

## Personalized draft

**Subject:** A bounded question on reward intensity and reversal in a fly connectome model

Dear Professor Tanimoto,

I’m [name], a [year/grade] student building an independent, connectome-constrained Drosophila simulation that learns from puzzle experience and feedback. The released wiring is preserved. We have a mapped gamma4 association prototype with persistent local efficacy, but it remains an engineered approximation: our full acceptance gate failed because only 3 of 6 seeds chose correctly after reward reversal. Natural sensory, action, and reward mappings for chess remain unresolved, and I do not claim flies understand chess or that learning is validated.

Your 2026 Current Biology paper on presynaptic computation of reward intensities through Dop1R1 and Dop2R, together with the 2025 work on receptor regulation, seems directly relevant to the gap between a teacher’s scalar feedback and a plausible neural teaching signal.

Could you suggest the minimal biological distinction we should preserve to test whether weak reversal reflects reward-intensity coding or memory persistence? If this is better suited to Dr. Tzu-Ting Huang’s work on decision and sensorimotor circuits, I would appreciate a public lab contact route.

I can send a one-page summary and exact acceptance results if useful.

Best,
[name]
[School or independent-research status]
[Jakarta, Indonesia / timezone]
[Stable project link, optional]

## Sources (accessed 2026-09-30)

- [S1] Tohoku faculty profile and contact: https://www.lifesci.tohoku.ac.jp/en/research/teacher/detail.html?id=18222
- [S2] Neuroethology laboratory official page: https://www.lifesci.tohoku.ac.jp/en/research/fields/laboratory.html?id=18215
- [S3] Sendai time zone: https://www.timeanddate.com/time/zone/japan/sendai
- [S4] Saito et al. 2026, *Current Biology*: https://doi.org/10.1016/j.cub.2026.03.077
- [S5] Hiramatsu et al. 2025, *eLife*: https://doi.org/10.7554/eLife.98358
- [S6] Yamagata et al. 2022, *Frontiers in Behavioral Neuroscience*: https://doi.org/10.3389/fnbeh.2022.986064
- [S7] Tohoku official profile for Tzu-Ting Huang: https://www.lifesci.tohoku.ac.jp/research/teacher/detail---id-45598.html
- Project evidence: [association validation results](../../../../documentation/design/neural-learning/gamma4-association-tests.md); [current feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md)

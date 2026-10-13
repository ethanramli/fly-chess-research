# Tzu-Ting Huang

**Status:** Draft research dossier; verify immediately before outreach.  
**Last verified:** 2026-09-30

## Snapshot

- **Role/institution:** Assistant Professor in Tohoku University’s Graduate School of Life Sciences and member of Hiromu Tanimoto’s Neuroethology laboratory. [S1, S2]
- **Official profile:** [Tohoku faculty profile](https://www.lifesci.tohoku.ac.jp/research/teacher/detail---id-45598.html). [S1]
- **Local time:** Sendai, Japan; Japan Standard Time (UTC+9) on 2026-09-30. [S3]
- **Professional contact route:** Her official faculty profile lists the Neuroethology lab website and department phone, but no personal email. The lab’s official faculty page lists Tanimoto’s public email `hiromu.tanimoto.d3@tohoku.ac.jp` (the page displays a full-width at-sign). [S1, S2]
- **Verification confidence:** High for role and research focus; moderate for direct contact (no personal email on her profile).

## Why this person is relevant

Huang’s stated focus is the molecular and circuit basis of action planning, decision-making and sensorimotor coordination underlying learning behavior. This is a particularly close fit for the project’s unresolved mapping from chess position to sensory activity and from selected move to neural/action output. [S1, S2]

## Current and relevant work

- **2023–present — Tohoku/Tanimoto-lab research.** Her official profile says she is applying her prior circuit and behavioral expertise to Drosophila sensory representation and decision-making; the lab profile specifies action planning and sensorimotor coordination underlying learning. [S1, S2]
- **2024 — “Analyses of Genetic Regulation of the Nervous System in the Nematode Caenorhabditis elegans” and “Analyses of Neural Circuits Governing Behavioral Plasticity in the Nematode Caenorhabditis elegans,” Methods in Molecular Biology.** These are methodological chapters from her prior C. elegans research, not evidence of published Drosophila outcomes. [S4]
- **2020 — “Age-dependent changes in response property and morphology of a thermosensory neuron and thermotaxis behavior in C. elegans,” Aging Cell.** This primary paper links sensory-neuron properties and behavior across age. [S5]

## Specific overlap with FlyChess

The project’s task runner can parse chess positions and search moves, but its numerical board representation is not a justified biological sensory pathway, and the action decoder is not a validated motor interface. Huang’s work on sensorimotor coordination, decision-making and learning could help define an experimentally testable interface boundary before feedback learning is connected to chess. It does not by itself imply the fly circuit can represent chess concepts. [S1, S2]

## Best bounded question

What is one minimal behavioral or neural control that would show a board-to-circuit encoding preserves decision-relevant sensory information rather than just correlating with the chosen output?

## Reasons they may not be the best first contact

Her earlier papers primarily concern C. elegans sensory aging and behavior, and she is a newer member of the Tohoku fly laboratory. The project’s reward-plasticity mechanism may be closer to work led by Tanimoto or other reward-memory specialists. [S1, S4, S5]

## Junior or assistant routes

- **Hiromu Tanimoto — Professor and Neuroethology lab leader.** The official faculty listing provides his public email and describes the lab’s associative learning work in Drosophila. [S2, S6]
- The current official laboratory page identifies Huang as assistant professor but does not list graduate students or postdoctoral researchers. [S2]

## Personalized draft

**Subject:** Student question on testing a sensory/action interface for a fly model

Dear Dr. Huang,

I’m [name], a [year/grade] student developing an independent connectome-constrained Drosophila simulation that learns from puzzle experience and feedback. We preserve the released wiring and have built a separate puzzle/search pipeline, but the biological interfaces remain open: our hand-designed board encoding is not yet a justified sensory pathway, and the move decoder is not a validated action pathway. The current gamma4 association prototype is engineering-only and failed full reversal acceptance in 3 of 6 seeds. I do not claim that flies understand chess or that learning is validated.

Your Tohoku profile describes work on action planning, decision-making and sensorimotor coordination in learning behavior, which seems directly relevant to the interface question. I am trying to keep sensory encoding, choice and feedback experimentally separable rather than infer those functions from wiring alone.

What is one minimal behavioral or neural control that would show a board-to-circuit encoding preserves decision-relevant sensory information rather than merely correlating with the output choice?

If this is better routed through the Neuroethology group, I would appreciate the public contact route. I can share a concise architecture diagram and current limitations.

Best,
[name]
[School or independent-research status]
[Jakarta, Indonesia / timezone]
[Stable project link, optional]

## Sources (accessed 2026-09-30)

- [S1] Tohoku official profile for Tzu-Ting Huang: https://www.lifesci.tohoku.ac.jp/research/teacher/detail---id-45598.html
- [S2] Neuroethology laboratory faculty and research profile: https://www.lifesci.tohoku.ac.jp/en/research/fields/laboratory.html?id=18215
- [S3] Sendai time zone: https://www.timeanddate.com/time/zone/japan/sendai
- [S4] Japan Science and Technology Agency Researchmap bibliography: https://researchmap.jp/HTT?lang=en
- [S5] Huang et al. 2020, *Aging Cell*: https://doi.org/10.1111/acel.13146
- [S6] Tohoku official faculty profile and email for Hiromu Tanimoto: https://www.lifesci.tohoku.ac.jp/en/research/teacher/detail.html?id=18222
- Project evidence: [association validation results](../../../../documentation/design/neural-learning/gamma4-association-tests.md); [current feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md)

# Nishant Singh

**Status:** Draft research dossier; verify immediately before outreach.  
**Last verified:** 2026-09-30

## Snapshot

- **Role/institution:** Research Associate in Biology at IISER Pune; the institute profile identifies Dr. Suhita Nadkarni’s group. [S1]
- **Official profile:** [IISER Pune profile](https://www.iiserpune.ac.in/research/department/biology/people/postdoctoral-fellows/post-doctoral-fellows/nishant-singh/521). [S1]
- **Local time:** Pune, India; India Standard Time (UTC+5:30) on 2026-09-30. [S2]
- **Professional contact route:** No personal professional email is listed on his institutional profile. The PI profile publishes `suhita@iiserpune.ac.in`, which is the verifiable lab contact route. [S1, S3]
- **Verification confidence:** High for current role and group; moderate for direct contact (only the group-level route is public).

## Why this person is relevant

Singh has a directly attributable computational study with Nadkarni on presynaptic endoplasmic-reticulum effects on short-term synaptic plasticity. That work is relevant to reasoning about state, calcium dynamics and synaptic history, although the modeled preparation is mammalian hippocampus rather than the fly mushroom body. [S4]

## Current and relevant work

- **2021 — “Presynaptic endoplasmic reticulum regulates short-term plasticity in hippocampal synapses,” Communications Biology.** The study combines modeling and biological results on how presynaptic ER and calcium dynamics affect short-term plasticity. [S4]
- **2025 — “Structural specialization of mossy fiber boutons is necessary for their unique computational functions,” bioRxiv.** Singh and Nadkarni use a spatial model to examine how bouton structure, calcium-domain interactions, and short-term plasticity support conditional transmission. It remains a preprint. [S5]
- **Current role (institutional profile accessed 2026-09-30):** Research Associate in the Nadkarni group. The profile does not describe a specific ongoing project. [S1]

## Specific overlap with FlyChess

Our gamma4 prototype stores local efficacy and passes limited software association/retention checks, but overall acceptance failed because reversal was correct in only 3/6 seeds. The modeled synapse and evidence remain an approximation, not a biologically validated mechanism. Singh’s published work could be a useful technical perspective on how hidden synaptic state and recent activity shape plasticity; it does not directly establish a Drosophila reward rule or chess transfer. [S4]

## Best bounded question

Which omitted state variable or timescale most often makes a synaptic model’s apparent retention or reversal behavior misleading?

## Reasons they may not be the best first contact

The verified paper concerns hippocampal synapses and short-term plasticity, not fly mushroom-body reward learning, and the current IISER profile does not specify his project or publish a personal contact. For biological reward identity in Drosophila, Tanimoto or Waddell may be a closer match. [S1, S4]

## Junior or assistant routes

- **Suhita Nadkarni — Associate Professor and group leader.** IISER Pune lists her research area and public professional email. [S3]

## Personalized draft

**Subject:** Student question about synaptic state and apparent reversal

Dear Dr. Singh,

I’m [name], a [year/grade] student working independently on a connectome-constrained Drosophila simulation of learning from puzzle experience and feedback. Our wiring stays fixed. We have an engineered gamma4 prototype that stores local efficacy at mapped mushroom-body connections, but it has not passed the full acceptance gate: only 3 of 6 seeds made the correct choice after contingency reversal. This is engineering evidence, not biological validation; chess reward, sensory and action mappings remain unresolved.

I read your 2021 work with Dr. Nadkarni on presynaptic endoplasmic reticulum and short-term plasticity in hippocampal synapses. I understand the preparation differs from the fly mushroom body, but the modeling question about hidden synaptic state and activity history is close to a problem we face: persistent efficacy alone may not explain our reversal failures.

Which omitted state variable or timescale most often makes a synaptic model’s apparent retention or reversal behavior misleading? A short pointer to a paper or method would already help.

If direct contact is not listed publicly, I can route the question through the lab’s official address. I can send a brief model summary if useful.

Best,
[name]
[School or independent-research status]
[Jakarta, Indonesia / timezone]
[Stable project link, optional]

## Sources (accessed 2026-09-30)

- [S1] IISER profile for Nishant Singh: https://www.iiserpune.ac.in/research/department/biology/people/postdoctoral-fellows/post-doctoral-fellows/nishant-singh/521
- [S2] Pune time zone: https://www.timeanddate.com/time/zone/india/pune
- [S3] IISER profile for Suhita Nadkarni and lab email: https://www.iiserpune.ac.in/research/department/biology/people/faculty/regular-faculty/suhita-nadkarni/305
- [S4] Singh et al. 2021, *Communications Biology*: https://doi.org/10.1038/s42003-021-01761-7
- [S5] Singh and Nadkarni 2025 bioRxiv preprint: https://doi.org/10.1101/2025.10.20.683513
- Project evidence: [association validation results](../../../../documentation/design/neural-learning/gamma4-association-tests.md); [current feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md)

# Suhita Nadkarni

**Status:** Draft research dossier; verify immediately before outreach.  
**Last verified:** 2026-09-30

## Snapshot

- **Role/institution:** Associate Professor in Biology at the Indian Institute of Science Education and Research (IISER) Pune; her listed area is biophysical models of synaptic plasticity in health and disease. [S1]
- **Official profile:** [IISER Pune faculty profile](https://www.iiserpune.ac.in/research/department/biology/people/faculty/regular-faculty/suhita-nadkarni/305). [S1]
- **Local time:** Pune, India; India Standard Time (UTC+5:30) on 2026-09-30. [S2]
- **Professional contact route:** IISER Pune lists `suhita@iiserpune.ac.in`. [S1]
- **Verification confidence:** High for role, area and public professional email; high for the date-specific timezone.

## Why this person is relevant

Nadkarni’s group builds detailed biophysical/computational models of synaptic processes and plasticity. That expertise can help distinguish a mechanistic, stateful synapse model from a generic parameter update and make explicit which physiological assumptions our engineered local efficacy rule would need to justify. [S1, S3]

## Current and relevant work

- **2025 — “Nanoscale Lattice Organization of Molecular Condensates Drives Compositional Degeneracy in Synaptic Plasticity,” bioRxiv preprint.** The authors combine super-resolution/biophysical work and data-driven modeling to study active-zone organization and plasticity. It is a preprint, not a peer-reviewed publication in the source checked. [S4]
- **2022 — “Amyloid pathology disrupts gliotransmitter release in astrocytes,” PLOS Computational Biology.** This computational study models how altered astrocyte calcium dynamics can affect gliotransmitter release; it illustrates the group’s mechanistic modeling approach, though the biology differs from fly mushroom-body conditioning. [S5]
- **2021 — “Presynaptic endoplasmic reticulum regulates short-term plasticity in hippocampal synapses,” Communications Biology.** This work combines realistic synapse modeling with experimental evidence concerning presynaptic calcium stores and short-term plasticity. [S6]

## Specific overlap with FlyChess

Our engineering prototype changes local KC-to-MBON efficacy and stores it persistently, while keeping graph wiring fixed. Its association/reversal result is not biologically validated; chess reward/sensory/action mappings remain unsettled. Nadkarni’s modeling perspective could help us specify state variables, timescales, and falsifiable contrasts for retention and reversal, and identify which mechanisms cannot be inferred from connectome edges alone. The species and synapse differences make this an approach-level consultation rather than direct evidence for our fly mechanism. [S1, S4-S6]

## Best bounded question

What is the smallest set of synaptic state variables and timescales that should be specified before a local efficacy rule can make a meaningful, testable claim about retention and reversal?

## Reasons they may not be the best first contact

Her listed work centers on computational and biophysical synaptic mechanisms, including mammalian/hippocampal and astrocytic systems, rather than Drosophila reward-circuit identity or behavioral choice. For fly-specific reinforcement anatomy, a Drosophila learning laboratory may be a better first scientific contact. [S1, S5, S6]

## Junior or assistant routes

- **Nishant Singh — Research Associate, IISER Pune Biology; listed research group: Dr. Suhita Nadkarni.** His 2021 primary paper with Nadkarni models presynaptic ER contributions to short-term plasticity. The IISER profile does not list a personal email; use the group’s institutional contact route. [S7, S6]
- The IISER profile also lists **Vasundhara Rathore** as a Research Associate in the group, but does not provide a current project, individually attributable recent work, or a public email. I could not support the requested individual research dossier from the official information available. [S8]

## Personalized draft

**Subject:** Student question on specifying synaptic state for retention and reversal

Dear Professor Nadkarni,

I’m [name], a [year/grade] student developing an independent connectome-constrained simulation of fly learning from puzzle experience and feedback. Our wiring is fixed, while an engineered gamma4 prototype stores local efficacy state at mapped Kenyon-cell-to-MBON connections. It has not passed the full acceptance gate: after contingency reversal, only 3 of 6 seeds chose the newly rewarded cue. This is engineering evidence, not biological validation; natural reward, sensory and action mappings for chess remain unresolved, and I do not claim chess learning.

I read your group’s computational work on synaptic plasticity, including the 2025 preprint on nanoscale active-zone organization and the 2022 PLOS Computational Biology model of astrocytic gliotransmitter release. I’m trying to avoid treating persistent efficacy as a sufficient biological explanation.

What is the smallest set of synaptic state variables and timescales we should define before a local efficacy rule can make a meaningful testable claim about retention and reversal? If a research associate in your group is a more suitable contact, I would be grateful for a public route.

I can send a short methods summary and the failed-seed breakdown.

Best,
[name]
[School or independent-research status]
[Jakarta, Indonesia / timezone]
[Stable project link, optional]

## Sources (accessed 2026-09-30)

- [S1] IISER Pune faculty profile and contact: https://www.iiserpune.ac.in/research/department/biology/people/faculty/regular-faculty/suhita-nadkarni/305
- [S2] Pune time zone: https://www.timeanddate.com/time/zone/india/pune
- [S3] IISER profile of the Computational Neurobiology Lab and research approach: https://www.winstepforward.org/mentor/suhita-nadkarni/
- [S4] Netrakanti et al. 2025, bioRxiv: https://doi.org/10.1101/2025.03.14.641702
- [S5] Pillai & Nadkarni 2022, *PLOS Computational Biology*: https://doi.org/10.1371/journal.pcbi.1010334
- [S6] Singh et al. 2021, *Communications Biology*: https://doi.org/10.1038/s42003-021-01761-7
- [S7] IISER profile for Nishant Singh: https://www.iiserpune.ac.in/research/department/biology/people/postdoctoral-fellows/post-doctoral-fellows/nishant-singh/521
- [S8] IISER profile for Vasundhara Rathore: https://www.iiserpune.ac.in/research/department/biology/people/postdoctoral-fellows/post-doctoral-fellows/vasundhara-rathore/536
- Project evidence: [association validation results](../../../../documentation/design/neural-learning/gamma4-association-tests.md); [current feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md)

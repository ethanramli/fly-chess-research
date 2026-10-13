# Wayan Gauthey — junior researcher dossier

## Snapshot

- **Current role:** Neuroscience graduate student at Princeton; Murthy Lab roster lists him as a graduate student jointly advised with Andrew Leifer. **Confidence: high** for student/lab affiliation.
- **Location/timezone:** Princeton, New Jersey; America/New_York, UTC−4 on 2026-09-30 (inferred from institution and date).
- **Professional contact route:** `wgauthey@princeton.edu`, listed on his Princeton Neuroscience Institute profile. **Confidence: high.**

## Why relevant

Gauthey's recent work combines whole-brain recording with behavior and fast sensory signals. That is a useful perspective for distinguishing a graph-based computational response from an independently measured neural or behavioral outcome.

## Current/recent work

- **2026 — “High-speed whole-brain imaging in Drosophila,” Nature Communications.** The study adapts light-bead microscopy to record adult fly brain activity at high volume rates and resolve fast auditory responses. [DOI](https://doi.org/10.1038/s41467-026-72437-1).
- **2024 — “Light evokes stereotyped global brain dynamics in Caenorhabditis elegans,” Current Biology.** This study tests an imaging-related source of global activity and reports that blue light can evoke stereotyped oscillations in part through a light-sensitive pathway. It is a different animal and question, but illustrates the need to distinguish measured activity from intrinsic network dynamics. [DOI](https://doi.org/10.1016/j.cub.2023.10.043).

## Specific overlap with this project

The FlyChess simulation uses the adult fly connectome but lacks validated sensory/action interfaces and an accepted feedback-learning mechanism. Gauthey's measurement work is relevant to what an independent activity signal could look like and to experimental confounds. It does not directly study chess, mushroom-body conditioning, or the project's gamma4 model.

## What to ask

What single neural measurement would best distinguish a persistent feedback-driven circuit change from a fixed connectome model that merely changes its output readout?

## Reasons they may not be the best contact

His work centers on microscopy and brain-wide activity rather than the project's gamma4 plasticity or chess task. The question may be better directed to Murthy or to a researcher focused on mushroom-body reinforcement learning.

## Junior/assistant routes in the lab or close collaboration

- **Mala Murthy — Principal Investigator and PNI Director.** Her official profile lists the current title and a public professional email; see the senior dossier for the verified route.
- **Andrew Leifer — co-advisor.** The lab roster identifies Gauthey's joint advising arrangement; a separate current role/contact route was not needed for this dossier.

## Personalized email draft

**Subject:** Student question about measuring persistent neural change

Dear Wayan,

I’m [Name], a high-school student in [Country] building an independent simulation constrained by the adult fly connectome. I read about your work on high-speed whole-brain imaging and the study of light-evoked global activity in *C. elegans*. The emphasis on separating measured activity from its cause seems closely related to a limitation in my project.

My current evidence is engineering-only. An engineered gamma4 association prototype changed its response under a fixed simulation rule, but the frozen contingency-reversal test passed in only 3 of 6 seeds. The chess feedback receiver still records feedback without applying learning, and the sensory, reward, and action mappings remain unresolved. I do not claim flies understand chess or that learning is validated.

Could you suggest one neural measurement or control that would most clearly distinguish persistent feedback-driven circuit change from a fixed-connectome model whose output changes for other reasons? A paper or brief pointer is enough; I understand you may not have time to reply.

Thank you,

[Name]  
[School or independent student]  
[Project page, optional]

## Sources (accessed 2026-09-30)

- [PNI — Wayan Gauthey profile](https://pni.princeton.edu/people/wayan-gauthey) — official profile and public email.
- [Murthy Lab — members](https://murthylab.princeton.edu/members) — graduate student role and joint advising.
- [Nature Communications — high-speed whole-brain imaging](https://doi.org/10.1038/s41467-026-72437-1) — primary paper.
- [Current Biology — light-evoked dynamics in C. elegans](https://doi.org/10.1016/j.cub.2023.10.043) — primary paper.
- [Princeton PNI — Mala Murthy profile](https://pni.princeton.edu/people/mala-murthy) — PI contact route.
- [Project feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md) — project objective and unresolved interfaces.
- [Gamma4 mechanism and limitations](../../../../documentation/design/neural-learning/gamma4-plasticity.md) — prototype scope and biological caveats.
- [Association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md) — failed reversal acceptance result.
- [Puzzle feedback round](../../../../documentation/design/puzzle-learning/record-only-round.md) — record-only feedback status.

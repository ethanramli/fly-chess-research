# Nicolò Ceffa

## Snapshot

- **Current role:** Visiting Researcher in the Zlatic Group, Department of Zoology, University of Cambridge. **Confidence: high** from the current institutional profile.
- **Location/timezone:** Cambridge, United Kingdom; Europe/London, UTC+1 on 2026-09-30 (inferred from institutional location and date).
- **Professional contact route:** His profile names the group but does not publish an individual email in the information reviewed. Use the Zlatic Group's institutional route or Professor Zlatic's verified Cambridge contact. No email inferred.

## Why relevant

Ceffa's recent work sits at the intersection of larval circuit structure, learning-guided behavior, and usable connectome annotations. This can inform careful questions about how to trace a model's behavioral output to a real, identified circuit.

## Current/recent work

- **2025 — “Descending neurons integrate learnt information from mushroom body with context to promote escape behaviour,” bioRxiv.** A pathway analysis linking learned information and context to a defined escape action. It remains a preprint. [DOI](https://doi.org/10.1101/2025.09.30.679458).
- **2025 — “The central complex of the larval fruit fly brain,” bioRxiv.** A connectomic characterization of the larval central complex, listed by the Cardona laboratory among current preprints and co-authored by Ceffa. [DOI](https://doi.org/10.1101/2025.09.30.679510).
- **2025 (revised 2026) — “Beyond Agreement: Standardizing Crowdsourced Synapse Annotations through Proofreading in EM Connectomics,” bioRxiv.** A methods project on consistency in EM synapse annotations; Ceffa is a co-author. [Preprint](https://doi.org/10.1101/2025.09.26.678851).

## Specific overlap with this project

The project has an adult FlyWire-based simulation and unresolved sensory/action/reward interfaces; its chess feedback receiver currently records events without applying learning. The pathway work is useful as a model of evidence needed to connect learning signals to actions, while the annotation work is relevant to uncertainty in cell identity and wiring. Neither establishes the project's engineered adult gamma4 rule or chess transfer.

## What to ask

When tracing a simulated learning effect toward a behavior, what is the smallest causal check that would rule out a response change caused only by the readout or task decoder?

## Reasons they may not be the best contact

The relevant pathway result is in larvae and is a preprint, whereas FlyChess uses the adult connectome. A senior researcher or an adult mushroom-body learning specialist may be better placed to assess the project's particular plasticity assumptions.

## Lab and close-collaboration routes

- **Marta Zlatic — Group Leader, MRC LMB; Director of Research, Cambridge Zoology.** Her current institutional profile lists the group and public contact route.
- **Albert Cardona — MRC Investigator/Programme Leader and Professor at Cambridge.** His lab is a close collaborator on the larval connectome and central-complex resource; verified official contact details appear in his institutional profile.

## Personalized email draft

**Subject:** Student question about causal checks for learning-to-action models

Dear Dr Ceffa,

I’m [Name], a high-school student in [Country] working independently on a laptop-scale simulation constrained by the adult Drosophila connectome. I found your recent work on linking mushroom-body learning signals and context to a defined larval escape action, as well as your connectome annotation projects. I’m trying to avoid treating a change in a model readout as evidence that a circuit learned.

My current project evidence is engineering-only. It contains an engineered gamma4 association prototype, but its frozen contingency-reversal acceptance test succeeded in only 3 of 6 seeds. The chess feedback receiver records feedback without applying learning, and biological sensory, reward, and action mappings remain unresolved. I do not claim that flies understand chess or that learning is validated.

Could you suggest the smallest causal check that would distinguish a genuine feedback-dependent circuit change from an effect caused only by the readout or task decoder? A paper pointer would be very helpful if you cannot reply in detail.

Thank you for your time,

[Name]  
[School or independent student]  
[Project page, optional]

## Sources (accessed 2026-09-30)

- [Cambridge Zoology — Nicolò Ceffa profile](https://www.zoo.cam.ac.uk/directory/dr-nicolo-ceffa) — current official profile and group affiliation.
- [bioRxiv — learnt information, context, and escape behavior](https://doi.org/10.1101/2025.09.30.679458) — primary preprint.
- [bioRxiv — larval central complex](https://doi.org/10.1101/2025.09.30.679510) — primary preprint.
- [bioRxiv — proofreading and synapse annotation](https://doi.org/10.1101/2025.09.26.678851) — primary preprint.
- [MRC LMB — Marta Zlatic profile](https://mrclmb.ac.uk/research-leaders/marta-zlatic/) — group context and senior contact route.
- [Cambridge PDN — Albert Cardona profile](https://www.pdn.cam.ac.uk/directory/albert-cardona) — current role and public contact.
- [Project feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md) — project objective and unresolved neural interfaces.
- [Gamma4 mechanism and limitations](../../../../documentation/design/neural-learning/gamma4-plasticity.md) — prototype scope and biological caveats.
- [Association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md) — failed reversal acceptance result.
- [Puzzle feedback round](../../../../documentation/design/puzzle-learning/record-only-round.md) — record-only feedback status.

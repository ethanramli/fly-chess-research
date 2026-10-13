# Gregory Jefferis — outreach dossier

## Snapshot

- **Current role:** Group Leader at the MRC Laboratory of Molecular Biology and Joint Head of its Neurobiology Division; the Cambridge Zoology profile also associates him with the Drosophila Connectomics Group. **Confidence: high** (current institutional pages).
- **Location/timezone:** Cambridge, United Kingdom; Europe/London, UTC+1 on 2026-09-30 (inferred from institutional location and date).
- **Professional contact route:** `gsxej2@cam.ac.uk`, listed on the Cambridge Department of Zoology contact page. **Confidence: high.**

## Why relevant

Jefferis's group works on Drosophila circuits, behavior, olfaction, connectomics, and molecular annotation. It contributed to the adult FlyWire connectome and whole-brain cell typing, and develops evidence linking cell identity and transmitter predictions to circuit structure. This informs the project's use of annotations and fixed wiring, while emphasizing that anatomy and transmitter labels alone do not provide a validated learning dynamic.

## Current/recent work

- **2025 — “Comparative connectomics of Drosophila descending and ascending neurons,” Nature.** Integrates multiple EM datasets to map brain-to-nerve-cord pathways, compare across sexes, and analyze circuits relevant to behavior. [DOI](https://doi.org/10.1038/s41586-025-08925-z).
- **2024 — “Neurotransmitter classification from electron microscopy images at synaptic sites in Drosophila melanogaster,” Cell.** Uses synapse image data and machine learning to predict transmitter identity, addressing a molecular annotation layer rather than directly measuring all synaptic effects. [DOI](https://doi.org/10.1016/j.cell.2024.03.016).
- **2024 — “Whole-brain annotation and multi-connectome cell typing of Drosophila,” Nature.** Provides systematic annotation and cell-type comparisons across connectomes. [DOI](https://doi.org/10.1038/s41586-024-07686-5).

## Specific overlap with this project

The project uses a released, annotated adult graph and explicitly preserves neuron identities and wiring. It has an engineered gamma4 association prototype but failed its frozen reversal gate (3/6 correct choices); its chess receiver still records feedback without learning. Reward, sensory, and action mappings and held-out chess transfer remain unresolved. Jefferis's work is relevant to whether chosen cell identities, signs, and paths are supported; those resources alone do not validate the project's learning rule.

## What to ask

For an adult FlyWire-based model, what is the most important annotation or circuit-level sanity check before interpreting a simulated change as a biologically meaningful effect?

## Reasons he may not be the best contact

His lab's strongest current focus includes olfactory processing and connectome annotation; the project's immediate bottleneck is a validated feedback-learning mechanism and task interface. A researcher working specifically on mushroom-body plasticity may offer more direct mechanistic advice.

## Junior/assistant routes in his lab or close collaboration

- **Tomke Stürner — Postdoctoral researcher in the Jefferis group.** Her official Cambridge profile describes work on how innate and learned pathways converge, and she co-authored recent ascending/descending connectomics. The profile reviewed did not list a direct email; route via the group. [Separate dossier](tomke-stuerner.md).

Only one current junior researcher with directly relevant recent work is included as a dossier subject; close collaborators with independent research appointments are not treated as junior contacts.

## Personalized email draft

**Subject:** Student question on interpreting annotated FlyWire circuits

Dear Professor Jefferis,

I’m [Name], a high-school student in [Country] developing an independent, laptop-scale simulation constrained by the adult Drosophila connectome. Your group’s work on FlyWire annotation, transmitter classification, and pathways linking the brain with the nerve cord is relevant to how I’m trying to keep neuron identity, wiring, and circuit interpretation separate.

My current evidence is engineering-only. The project has an engineered gamma4 association prototype, but the frozen acceptance test failed because correct choices after contingency reversal occurred in only 3 of 6 seeds. The chess round still records feedback without changing neural state, and sensory, reward, and action mappings and chess transfer are unresolved. I do not claim flies understand chess or that learning is validated.

Could you recommend the single most important annotation or circuit sanity check before interpreting a simulated change as biologically meaningful? If a junior colleague working directly on FlyWire annotation is a better person to ask, I would appreciate a pointer.

Thank you for your time,

[Name]  
[School or independent student]  
[Project page, optional]

## Sources (accessed 2026-09-30)

- [MRC LMB — Gregory Jefferis profile](https://mrclmb.ac.uk/research-leaders/gregory-jefferis/) — current group role, research, members, and recent papers.
- [Cambridge Zoology — Drosophila Connectomics Research](https://www.zoo.cam.ac.uk/research/groups/connectomics/research) — connectome projects and group contact details, including Jefferis's email.
- [Nature — comparative descending and ascending connectomics](https://doi.org/10.1038/s41586-025-08925-z) — primary paper.
- [Cell — neurotransmitter classification at synapses](https://doi.org/10.1016/j.cell.2024.03.016) — primary paper.
- [Nature — whole-brain annotation and cell typing](https://doi.org/10.1038/s41586-024-07686-5) — primary paper.
- [Cambridge Neuroscience — Tomke Stürner profile](https://neuroscience.cam.ac.uk/member/tomke/) — current research description.
- [Cambridge Zoology — Philipp Schlegel profile](https://www.zoo.cam.ac.uk/directory/dr-philip-schlegel) — Assistant Research Professor role and public email.
- [Project feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md) — project objective and unresolved interfaces.
- [Gamma4 mechanism and limitations](../../../../documentation/design/neural-learning/gamma4-plasticity.md) — engineered prototype and biological caveats.
- [Association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md) — frozen reversal result and failed acceptance gate.
- [Puzzle feedback round](../../../../documentation/design/puzzle-learning/record-only-round.md) — record-only feedback status.

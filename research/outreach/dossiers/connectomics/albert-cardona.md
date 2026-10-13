# Albert Cardona — outreach dossier

## Snapshot

- **Current role:** MRC Investigator/Programme Leader and senior group leader at the MRC Laboratory of Molecular Biology; Professor at the University of Cambridge and Fellow of Pembroke College. **Confidence: high** (current MRC LMB and Cambridge profiles).
- **Location/timezone:** Cambridge, United Kingdom; Europe/London, UTC+1 on 2026-09-30 (inferred from institutional location and date).
- **Professional contact route:** `ac2040@cam.ac.uk`, listed by the Cambridge Department of Physiology, Development and Neuroscience. **Confidence: high.**

## Why relevant

Cardona leads experimental and comparative connectomics research and develops computational tools for interpreting large connectomes. His work directly overlaps with the project's fixed graph, identity mapping, sparse computation, and need to connect anatomy to function without treating a wiring diagram as a learning rule.

## Current/recent work

- **2025 — “The Connectome Interpreter Toolkit,” bioRxiv preprint.** An open-source toolkit for graph traversal, effective connectivity, subcircuit extraction, receptive fields, and differentiable circuit models. The authors describe methods tailored to large connectomes and consumer hardware; this is not evidence of the project's laptop performance. [Preprint](https://doi.org/10.1101/2025.09.29.679410).
- **2024 — “Invariant synaptic density links neuronal activity stability and wiring optimisation principles across species,” bioRxiv preprint.** A comparative project listed on the lab's official site. [Preprint](https://doi.org/10.1101/2024.07.18.604056).
- **2023 — “The connectome of an insect brain,” Science.** A synaptic-resolution map of the Drosophila larval brain produced with Zlatic and collaborators. [DOI](https://doi.org/10.1126/science.add9330).

## Specific overlap with this project

The project preserves released adult wiring and builds sparse low-memory computation around it. The current gamma4 prototype uses pinned annotations but remains an engineered association experiment; full reversal acceptance failed in 3/6 seeds. Neural reward, sensory, and action mappings and chess transfer remain unresolved. Cardona's work on connectome interpretation and computational models is relevant to anatomy-aware analysis and hypothesis generation, but the project must still justify its neural dynamics and demonstrate independent biological predictions.

## What to ask

What one practical validation would you recommend to show that a connectome-based circuit simulation's behavior is constrained by the wiring rather than by arbitrary input and output mappings?

## Reasons he may not be the best contact

His group focuses on connectome generation, comparative anatomy, and interpretation; a learning mechanism specialist may be better placed to advise on dopamine, synaptic plasticity, and reversal. His senior role may also mean a junior collaborator is more accessible for toolkit-specific questions.

## Junior/assistant routes in his lab or close collaboration

- **Yijie Yin — listed member of Cardona's Experimental and Comparative Connectomics Laboratory; the official team page does not state a specific career rank.** First author of the Connectome Interpreter Toolkit preprint and a co-author of FlyWire cell-type annotation. No direct public institutional email was verified; use the lab's public contact route. [Separate dossier](yijie-yin.md).

Only one current lab member with project-relevant recent work and a verified institutional listing is identified here; the lab roster does not specify career stage, and no direct institutional email was confirmed.

## Personalized email draft

**Subject:** Student question about validating connectome-constrained simulations

Dear Professor Cardona,

I’m [Name], a high-school student in [Country] building an independent, low-memory simulation constrained by the adult Drosophila connectome. Your work on connectome interpretation and the Connectome Interpreter Toolkit is relevant to a problem I face: how to show that a model's behavior is meaningfully constrained by the wiring rather than by its chosen inputs and readouts.

The results I have now are engineering evidence only. An engineered gamma4 association prototype preserved the graph, but its frozen contingency-reversal acceptance test passed in only 3 of 6 seeds. The chess feedback receiver still records feedback without applying learning, and sensory, reward, and action mappings and chess transfer remain unresolved. I do not claim that flies understand chess or that learning is validated.

If you had to recommend one practical validation for this stage, what comparison or ablation would best demonstrate that behavior depends on the connectome rather than arbitrary interface choices? A short reply or pointer to a junior colleague's relevant work would be greatly appreciated.

Thank you for your time,

[Name]  
[School or independent student]  
[Project page, optional]

## Sources (accessed 2026-09-30)

- [MRC LMB — Albert Cardona profile](https://mrclmb.ac.uk/research-leaders/albert-cardona/) — current group-leader role, lab focus, members, and recent projects.
- [Cambridge PDN — Albert Cardona profile](https://www.pdn.cam.ac.uk/directory/albert-cardona) — Professor/MRC Investigator title and public email.
- [Cardona Lab — Experimental and Comparative Connectomics](https://syn.mrc-lmb.cam.ac.uk/) — current team and preprint list.
- [bioRxiv — Connectome Interpreter Toolkit](https://doi.org/10.1101/2025.09.29.679410) — primary preprint.
- [bioRxiv — invariant synaptic density](https://doi.org/10.1101/2024.07.18.604056) — primary preprint.
- [Science — connectome of an insect brain](https://doi.org/10.1126/science.add9330) — primary paper.
- [Nature — whole-brain annotation and cell typing](https://doi.org/10.1038/s41586-024-07686-5) — primary paper.
- [Cambridge Zoology — Nicolò Ceffa profile](https://www.zoo.cam.ac.uk/directory/dr-nicolo-ceffa) — close collaborator's official profile.
- [Project feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md) — project objective and unresolved interfaces.
- [Gamma4 mechanism and limitations](../../../../documentation/design/neural-learning/gamma4-plasticity.md) — engineered prototype and biological caveats.
- [Association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md) — frozen reversal result and failed acceptance gate.
- [Puzzle feedback round](../../../../documentation/design/puzzle-learning/record-only-round.md) — record-only feedback status.

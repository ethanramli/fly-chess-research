# Zhihao Zheng

## Snapshot

As of 2026-09-30, Zheng is listed as a Postdoctoral Research Associate at Princeton Neuroscience Institute and on the Seung Lab roster. His official profile provides a contact link whose address is obfuscated in page markup; I do not reconstruct it. Route through the [Seung Lab contact page](https://seunglab.org/). Princeton, New Jersey was on EDT (UTC−4) on the access date. Confidence: high for role and affiliation; medium for a direct contact route because the listed address is protected. ([PNI profile](https://pni.princeton.edu/people/zhihao-zheng), [Seung Lab](https://seunglab.org/), [timezone](https://www.timeanddate.com/time/zone/@5102922))

## Why relevant

His verified work includes large-scale connectomic reconstruction and interpretation, a close methodological match to the project's effort to preserve a released graph while testing circuit-level function. The verified work concerns mouse hippocampus, not fly reinforcement learning. ([2025 CA3 preprint](https://www.biorxiv.org/content/10.1101/2025.07.09.663979v1))

## Current/recent work

- In a 2025 preprint, Zheng and colleagues reconstructed mouse hippocampal CA3 connectivity, classifying soma-containing neurons and more than 55,000 mossy fibers and reporting spatially graded input and selective feedforward inhibition. ([bioRxiv, 2025](https://www.biorxiv.org/content/10.1101/2025.07.09.663979v1))
- In 2024, Zheng coauthored a Nature Communications paper describing faster millimeter-scale electron microscopy using beam-deflection transmission electron microscopy. ([Nature Communications, 2024](https://www.nature.com/articles/s41467-024-50846-4))

## Specific overlap with this project

The project has a full-graph gamma4 prototype but no validated natural reward interface; reversal succeeded in 3/6 seeds, and the puzzle receiver remains record-only. A connectomics perspective could help identify which structure-function inferences are warranted before adding a learning interpretation. ([project status](../../../../documentation/design/neural-learning/gamma4-association-tests.md), [Seung Lab research context](https://seunglab.org/))

## What to ask

What control would best establish that a response change in a connectome-constrained model depends on the mapped circuit rather than on the engineered readout or stimulation procedure?

## Reasons they may not be the best contact

The primary recent paper concerns mouse hippocampal CA3 wiring, not Drosophila mushroom-body reward learning; a fly learning specialist may be better placed to judge biological mechanisms. ([CA3 preprint](https://www.biorxiv.org/content/10.1101/2025.07.09.663979v1))

## Junior/assistant routes in the lab or close collaboration

Zheng is himself a postdoctoral researcher. For the senior researcher, the Seung Lab lists May Husseini as Connectomics Manager; a single public lab contact route is the most defensible path. ([Seung Lab roster/contact](https://seunglab.org/))

## Personalized email draft

**Subject:** One control for a connectome-constrained fly simulation

Dear Dr. Zheng,

I’m a [grade/year] student working independently on a small connectome-constrained fly simulation. I’m trying to distinguish structural circuit predictions from effects introduced by our engineered model. The current gamma4 association prototype has persistent efficacy state, but its biological reward and sensory/action interfaces remain unresolved. The frozen acceptance test failed because only 3 of 6 seeds chose correctly after reversal; the separate puzzle runner records feedback without applying learning, and chess transfer is untested.

I read about your group’s 2025 CA3 reconstruction, especially the effort to connect large-scale wiring organization with circuit-level interpretation. Would you recommend one practical control or ablation that could test whether a model response shift depends on the mapped circuit rather than on the chosen readout or stimulation setup?

I would be glad to send a one-page summary with the exact experiment and limitations. I understand you may not have time to respond, and I appreciate your work being publicly documented.

Best,
[Name]
[School / location]

## Sources (accessed 2026-09-30)

- [Princeton Neuroscience Institute profile](https://pni.princeton.edu/people/zhihao-zheng)
- [Seung Lab roster, research and contact](https://seunglab.org/)
- [Connectomic reconstruction from hippocampal CA3 (bioRxiv, 2025)](https://www.biorxiv.org/content/10.1101/2025.07.09.663979v1)
- [Fast imaging of millimeter-scale areas with beam deflection transmission electron microscopy (Nature Communications, 2024)](https://www.nature.com/articles/s41467-024-50846-4)
- [Princeton time zone](https://www.timeanddate.com/time/zone/@5102922)
- [Project association-validation report](../../../../documentation/design/neural-learning/gamma4-association-tests.md)

# H. Sebastian Seung

## Snapshot

As of 2026-09-30, Seung is Princeton University's Anthony B. Evnin Professor in Neuroscience and Professor of Computer Science, with appointments in the Princeton Neuroscience Institute (PNI). Princeton's official profile lists `sseung@princeton.edu` and his lab lists `sseung@princeton.edu`; use the lab's published address. Princeton, New Jersey was on Eastern Daylight Time (EDT, UTC−4) on the access date. Confidence: high for title, institution, email and timezone, based on current institutional listings and date-specific timezone data. ([PNI profile](https://pni.princeton.edu/people/h-sebastian-seung), [Seung Lab](https://seunglab.org/), [Princeton timezone](https://www.timeanddate.com/time/zone/@5102922))

## Why relevant

His work directly addresses how to infer circuit function from connectome structure, including the adult fly optic lobe. That makes him unusually well placed to comment on what fixed wiring can and cannot support in a simulation. This is methodological relevance, not evidence that the project's engineered learning mechanism is biologically valid. ([2024 paper](https://pubmed.ncbi.nlm.nih.gov/39358524/))

## Current/recent work

- In October 2024, Seung published “Predicting visual function by interpreting a neuronal wiring diagram,” deriving testable predictions about Drosophila optic-lobe cell types from their synaptic wiring. ([Nature/PubMed record](https://pubmed.ncbi.nlm.nih.gov/39358524/))
- In April 2025, he co-led the MICrONS mouse visual-cortex connectomics project, which paired a cubic-millimeter wiring reconstruction with functional recordings and released a coordinated set of Nature papers. ([Princeton project account](https://www.princeton.edu/news/2025/04/09/first-time-scientists-map-half-billion-connections-allow-mice-see), [flagship Nature paper](https://www.nature.com/articles/s41586-025-08790-w))

## Specific overlap with this project

The project uses a released fly wiring diagram but has not established biological reward, sensory or action mappings. Its gamma4 prototype is engineered and the full acceptance gate failed: only 3/6 seeds selected the reversed target. The puzzle receiver still records feedback without applying neural learning, and chess transfer is untested. The useful overlap is interpreting connectome-constrained function and setting evidential limits—not claiming fly chess cognition. ([project learning direction](../../../../documentation/design/research-goals/feedback-learning.md), [association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md), [Seung 2024 paper](https://pubmed.ncbi.nlm.nih.gov/39358524/))

## What to ask

Given a fixed adult-fly connectome and a small engineered MBON choice readout, what is the single most important independent biological or computational test you would require before treating a feedback-dependent response shift as evidence about circuit function?

## Reasons he may not be the best contact

His 2024 fly work concerns visual-circuit function, while his current lab page says its EM image-analysis effort has shut down and its focus has shifted to brain function, development and plasticity; the page describes fly-connectome reconstruction as an ongoing collaboration with Mala Murthy's group. A fly-learning experimentalist or someone directly studying mushroom-body reinforcement may be better for reward pathways and plasticity. ([Seung Lab](https://seunglab.org/), [PNI profile](https://pni.princeton.edu/people/h-sebastian-seung))

## Junior/assistant routes in the lab or close collaboration

- **Zhihao Zheng — Postdoctoral Research Associate, PNI.** His official PNI profile and the Seung Lab roster support the current role. His connectomics work is a plausible technical route, though the verified CA3 project is not fly learning. See [separate dossier](h-sebastian-seung-zhihao-zheng.md), [PNI profile](https://pni.princeton.edu/people/zhihao-zheng), [Seung Lab roster](https://seunglab.org/), and [2025 CA3 preprint](https://www.biorxiv.org/content/10.1101/2025.07.09.663979v1).
- The lab lists **May Husseini — Connectomics Manager** as an operational route; use the lab contact page rather than infer a personal email. ([Seung Lab contact and roster](https://seunglab.org/))

## Personalized email draft

**Subject:** A bounded question about interpreting a fly connectome learning prototype

Dear Professor Seung,

I’m a [grade/year] student working independently on a connectome-constrained fly simulation. I’m trying to keep the project’s claims narrow: it uses the released wiring, but its gamma4 association mechanism is engineered, biological reward and sensory/action mappings remain unresolved, and only 3 of 6 seeds chose correctly after contingency reversal. The puzzle runner still records feedback without applying neural learning, and chess transfer has not been tested.

Your 2024 analysis predicting visual function from the Drosophila optic-lobe wiring diagram caught my attention because it makes circuit-level predictions that can, in principle, be checked independently. I’m not asking you to evaluate the whole project. Could you suggest one decisive independent test that would distinguish a meaningful circuit-level prediction from a response change built into an engineered model?

I can send a one-page methods and results summary if useful. Thank you for considering a short reply.

Best,
[Name]
[School / location]

## Sources (accessed 2026-09-30)

- [Princeton Neuroscience Institute profile](https://pni.princeton.edu/people/h-sebastian-seung)
- [Seung Lab: focus, roster and contact](https://seunglab.org/)
- [Predicting visual function by interpreting a neuronal wiring diagram (Nature/PubMed)](https://pubmed.ncbi.nlm.nih.gov/39358524/)
- [MICrONS mouse visual-cortex connectomics project (Princeton, 2025)](https://www.princeton.edu/news/2025/04/09/first-time-scientists-map-half-billion-connections-allow-mice-see)
- [Functional connectomics spanning multiple areas of mouse visual cortex (Nature, 2025)](https://www.nature.com/articles/s41586-025-08790-w)
- [Princeton time zone](https://www.timeanddate.com/time/zone/@5102922)
- [Project feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md)
- [Project association-validation report](../../../../documentation/design/neural-learning/gamma4-association-tests.md)

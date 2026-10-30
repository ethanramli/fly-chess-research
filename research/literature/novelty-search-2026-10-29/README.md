# Novelty search: whole-connectome plasticity learning with transfer tests (2026-10-29)

A scoping search, not a systematic review. A Haiku sub-agent ran it with web search on 2026-10-29. Sources were checked against abstracts, model cards and search snippets; **full texts were not opened**, and items marked UNVERIFIED rest on snippets. Re-check the primary sources before any publication claim.

Question: has published or released work combined (1) a whole-brain Drosophila connectome with fixed topology and signs, (2) learning only through a modelled biological plasticity rule (no backprop on connectome weights), (3) consequence (reward/punishment) feedback, (4) transfer tests to held-out families or counterfactuals against matched controls, and (5) chess?

| Work | What it did | Elements |
|---|---|---|
| cesp99/fly-chess (Esposito; https://github.com/cesp99/fly-chess, https://huggingface.co/cesp99/fly-chess) | FlyWire rate model (134,209 neurons, 2.70M connections), fixed signs. Trains synaptic magnitudes, gains and projections on Lichess moves and outcomes, then Stockfish targets, then self-play. Reports top-1/top-3 move accuracy and bot matches | 1, 5; 3 only as supervised targets; no 2 or 4. Optimizer not named: gradient training is inferred, UNVERIFIED |
| Shiu et al. 2024, Nature 634 (doi 10.1038/s41586-024-07763-9) | Whole-brain LIF model on FlyWire; sensorimotor predictions checked with optogenetics | 1 only; no learning. Neuron count differs across sources, UNVERIFIED |
| Lappalainen et al. 2024, Nature 634:1132-1140 (doi 10.1038/s41586-024-07939-3) | Connectome-constrained visual system; parameters fitted by deep learning | 1 (partial); fails 2 |
| Bennett, Philippides & Nowotny 2021, Nat Commun 12:2569 (doi 10.1038/s41467-021-22592-4) | Mushroom-body model; dopamine as reinforcement prediction error | 2, 3; not whole brain, no chess |
| Eschbach et al. 2020, Nat Neurosci 23:544-555 (doi 10.1038/s41593-020-0607-9) | Larval MB connectome feedback motifs; modelling of learning flexibility | Partial 1 (MB circuit) |
| Jiang & Litwin-Kumar 2021, bioRxiv (doi 10.1101/737064) | Heterogeneous dopamine signalling under MB constraints | Partial 2, 3 |
| Turkcan, Zhou & Lazar 2022, bioRxiv (doi 10.1101/2022.09.10.506218) | Programmable connectome-based MB model | Partial 1; journal status UNVERIFIED |
| Jin, Zhu, Zhang & Sui, arXiv 2602.17997 (2026) | Whole-brain connectome graph as a body controller, trained by deep RL | 1, partial 3; no in-connectome plasticity |
| Vaxenburg et al. (bioRxiv 2024; journal version UNVERIFIED) | Whole-body biomechanical fly model, RL-trained network | Not connectome-constrained |
| NeuroMechFly v2 (PubMed 39533006) | Neuromechanical model with a connectome-constrained visual network | Partial 1 |

**Verdict (bounded by search coverage):**
- No work found combines elements 1-4, with or without 5.
- The closest overall is cesp99/fly-chess (1 and 5). It learns by imitation and engine targets, not by modelled plasticity, and has no transfer or matched-control tests.
- The closest on the plasticity side is Bennett et al. 2021 (2 and 3, on a reduced MB model).

**Use in this project:** this supports describing FlyChess as "apparently the first" only with these limits stated. It is not a novelty proof. A full-text review is needed before any publication.

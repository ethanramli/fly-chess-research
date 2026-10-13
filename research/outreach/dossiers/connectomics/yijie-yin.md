# Yijie Yin — junior researcher dossier

## Snapshot

- **Current role:** Listed as a member of the Experimental and Comparative Connectomics Laboratory at MRC LMB. The official lab roster does not publish a specific job rank. **Confidence: high** for current lab membership; **moderate** for seniority.
- **Location/timezone:** Cambridge, United Kingdom; Europe/London, UTC+1 on 2026-09-30 (inferred from lab location and date).
- **Professional contact route:** No direct email was confirmed on the institutional profile reviewed. Use the Cardona laboratory's public contact route. Do not infer an email from software metadata.

## Why relevant

Yin is first author of the Connectome Interpreter Toolkit preprint, a software project focused on interpreting and analyzing large connectomes. This is closely related to the project's graph-constrained computations and to separating what anatomy supports from what model assumptions add.

## Current/recent work

- **2025 — “The Connectome Interpreter Toolkit,” bioRxiv preprint.** A toolkit for efficient graph traversal, effective connectivity analysis, subcircuit extraction, receptive-field analysis, and differentiable circuit modeling. [DOI](https://doi.org/10.1101/2025.09.29.679410).
- **2024 — “Whole-brain annotation and multi-connectome cell typing of Drosophila,” Nature.** A cross-connectome annotation and cell-typing resource that emphasizes variability and reproducible cell identity across datasets. [DOI](https://doi.org/10.1038/s41586-024-07686-5).

## Specific overlap with this project

FlyChess uses the adult FlyWire graph with fixed neuron identities and sparse computation. It has pinned gamma4 cell annotations, but no validated chess input/output map or biological reward path. Its engineered association experiment failed full acceptance because reversal choices were correct in only 3/6 seeds. Yin's work is relevant to interpreting graph structure and validating neuron identity; it does not establish neural learning or chess transfer.

## What to ask

What graph-level control or null model would you use first to test whether a model's apparent circuit effect depends on the actual connectome topology?

## Reasons they may not be the best contact

The documented work is focused on connectome software and structural analysis, not biological plasticity or behavioral learning. A mechanistic learning researcher would be better placed to assess reward signals and reversal.

## Junior/assistant routes in the lab or close collaboration

- **Albert Cardona — Programme Leader and Professor, University of Cambridge.** Principal investigator; his Cambridge profile lists a verified professional email and is the recommended route if the lab contact route is unclear.

For a second-person route, use the laboratory's institutional contact page; no additional junior collaborator with a more relevant verified profile is needed for this question.

## Personalized email draft

**Subject:** Student question about null models for connectome-based circuit claims

Dear Yijie,

I’m [Name], a high-school student in [Country] working on an independent low-memory simulation constrained by the adult fly connectome. I read your work on the Connectome Interpreter Toolkit and FlyWire cell typing. I’m trying to design a useful structural control before making any claim that a model's response comes from its wiring.

My current results are engineering-only. I have an engineered gamma4 association prototype, but the frozen reversal acceptance test passed in only 3 of 6 seeds. The chess feedback receiver currently records feedback without applying learning; biological reward, sensory, and action mappings and chess transfer remain unresolved. I do not claim that flies understand chess or that learning is validated.

What graph-level null model or ablation would you test first to establish that an apparent circuit effect depends on the actual connectome topology? I am considering whether a degree-preserving rewiring comparison is informative, but do not want to treat a convenient graph manipulation as biologically meaningful by default. A brief pointer is plenty.

Thank you,

[Name]  
[School or independent student]  
[Project page, optional]

## Sources (accessed 2026-09-30)

- [Cardona Lab — Experimental and Comparative Connectomics](https://syn.mrc-lmb.cam.ac.uk/) — current team roster and toolkit listing.
- [bioRxiv — Connectome Interpreter Toolkit](https://doi.org/10.1101/2025.09.29.679410) — primary preprint and authorship.
- [Nature — whole-brain annotation and cell typing](https://doi.org/10.1038/s41586-024-07686-5) — primary paper.
- [MRC LMB — Albert Cardona profile](https://mrclmb.ac.uk/research-leaders/albert-cardona/) — lab role and contact context.
- [Cambridge PDN — Albert Cardona profile](https://www.pdn.cam.ac.uk/directory/albert-cardona) — current title and public contact route.
- [Project feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md) — project objective and unresolved interfaces.
- [Gamma4 mechanism and limitations](../../../../documentation/design/neural-learning/gamma4-plasticity.md) — prototype scope and biological caveats.
- [Association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md) — failed reversal acceptance result.
- [Puzzle feedback round](../../../../documentation/design/puzzle-learning/record-only-round.md) — record-only feedback status.

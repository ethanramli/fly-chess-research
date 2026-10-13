# Feedback quality deep review

Access date: 2026-10-08, Asia/Jakarta. Research is ongoing. This package separates primary-source findings, current-code evidence and proposed adaptations. It does not award the learner an 8/10 score or claim transferable reasoning.

The user requested a deep investigation of weak improvement per experience, Xiaomi MiMo coding feedback, Stockfish evaluation/search, Capablanca's economical play, and additional ways to improve learning within laptop limits.

- [Detailed review and intervention order](review.md)
- [Proposed operational feedback contract](../../../documentation/design/puzzle-learning/feedback-quality-improvement.md)
- [Retrospective timing margin audit](../../reports/feedback-quality-review-2026-10-08/timing-margin-audit.json)
- [Source-to-solution register](../source-solution-register.md)
- Raw Exa results and fetched excerpts are in `raw/`. They preserve retrieval output rather than claiming complete article/PDF coverage.

## Coverage

Exa discovery: 19 successful searches requesting 95 result slots across MiMo, engine evaluation, Capablanca, human chess expertise, biological plasticity, correction, process supervision, shaping and replay. Result slots include duplicates and secondary pages; they are not 95 individually read papers. Primary-source sections were then checked with Exa fetching and browser reads. Initial schema error is excluded. Full MiMo-V2.6 PDF access was limited; official release text and the separate Gagar paper are used for detailed quality-grading claims.

| Primary source | Read coverage and supported claim | Adaptation and boundary |
|---|---|---|
| [MiMo-7B report](https://arxiv.org/html/2505.07608), sections 3.2–3.3 | HTML sections: executable verification, difficulty-stratified partial rewards, filtering/resampling, GRPO | Training-data quality and criterion ladder; no imported model, optimizer or weights |
| [MiMo-V2.6 official release](https://mimo.mi.com/docs/en-US/news/latest/v2-6) and [technical report](https://modelscope.cn/models/XiaomiMiMo/MiMo-V2.6-Pro-RL/resolve/master/MiMo_V2_6_technical_report.pdf) | Official release/search extracts and truncated PDF fetch; environment/grader diversity and quality grading | Audit verifier scope and passing trajectories; not a laptop-scale compute recipe |
| [Gagar](https://arxiv.org/html/2609.32577) | Primary HTML and indexed passages: test validity first, relative quality among passing trajectories, advantage redistribution | Correctness before efficiency; no GRPO or sequence-token credit imported |
| [SCoRe](https://arxiv.org/html/2409.12917v1), sections 4–5 | HTML sections on correction collapse, two-turn training, regressions | Measure wrong→right and right→wrong, then delayed unaided transfer; not biological evidence |
| [Let's Verify Step by Step](https://arxiv.org/html/2305.20050) | Indexed primary abstract/findings; process versus outcome supervision | Checked intermediate consequences; no claim that prose supervision is consumed by this learner |
| [Stockfish sf_19 search.cpp](https://raw.githubusercontent.com/official-stockfish/Stockfish/sf_19/src/search.cpp) | Pinned release source; iterative deepening, alpha-beta, qsearch, null-move verification, reductions | Search scheduling hypotheses; no teacher search at unaided test, no native-NNUE speed guarantee for our graph |
| [Stockfish NNUE guide](https://official-stockfish.github.io/docs/nnue-pytorch-wiki/docs/nnue.html) | Evaluation/feature/incremental-update sections | Separate evaluator from search; incremental NNUE is not a drop-in connectome update |
| [Stockfish FAQ](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html), [WDL model](https://github.com/official-stockfish/WDL_model) | Official score/WDL semantics | Engine utility is conditional estimate, not bounded-task consequence or fly win probability |
| [Capablanca, Chess Fundamentals](https://www.gutenberg.org/files/33870/33870-h/33870-h.htm) | Primary book text: chapters II–V and annotated examples, not every variation visually reconstructed | Restraint/activity/plan curriculum and tactical safety; no measured access to his cognition or fixed small candidate count |
| [Chase & Simon, Perception in chess](https://gwern.net/doc/psychology/chess/1973-chase.pdf) | Primary paper indexed abstract/summary, author PDF mirror | Relation/chunk hypothesis; not proof of neural variable binding |
| [Gkanias et al., 2022](https://elifesciences.org/articles/75611) | Primary indexed equation/model passages, existing project adaptation checked | Audit current efficacy dynamics; source-derived approximation is not validated anatomy |
| [Bennett et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8105414/) | Exa abstract and detailed indexed sections; direct full-body browser access failed | RPE/feedback hypothesis, saturation and credit limitations; additional hypothetical wiring cannot be inserted |
| [Handler et al., 2019](https://www.cell.com/cell/fulltext/S0092-8674(19)30611-7) | Primary indexed abstract/sections; raw query evidence preserved | Explicit cue/reinforcement timing; receptor/compartment specifics not mapped here |
| [Hige et al., 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4674068/) | Primary indexed abstract/sections | Input-specific plasticity motivation; exact chess cue specificity not established |
| [Jiang & Litwin-Kumar, 2021](https://journals.plos.org/ploscompbiol/article?id=10.1371%2Fjournal.pcbi.1009205) | Primary indexed abstract/model passages | Heterogeneous teaching pathways; optimized model parameters cannot substitute for scratch learner |
| [Ng, Harada & Russell, 1999](https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf) | Primary paper text/theorem | Shaping can alter the objective; policy-invariance theorem does not establish our circuit's convergence |
| [Schaul et al., Prioritized Experience Replay](https://arxiv.org/abs/1511.05952) | Primary indexed abstract | Bounded replay selection hypothesis; bias correction and plasticity compatibility remain unresolved |

No new external learning equation or chess evaluation function has been adopted. Sources are registered for review/design only before any experimental use.

2026-10-08 subsequent evidence: [complete comparison and recovery](../../reports/bound-ray-feedback-development-completion-2026-10-08/README.md) confirm useful acquisition remains failed despite average margin gains. [Correction and preservation](../../../documentation/design/puzzle-learning/correction-and-preservation-feedback.md) is the next registered teacher-plan hypothesis; software tested, graph untested.

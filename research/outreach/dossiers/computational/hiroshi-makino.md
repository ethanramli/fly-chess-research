# Hiroshi Makino

## Snapshot

As of 2026-09-30, Makino is Professor in the Department of Physiology, Keio University School of Medicine. Keio's Japanese faculty page lists `hmakino@keio.jp`; its English staff record confirms the professorship but leaves its email field blank. Tokyo uses Japan Standard Time (JST, UTC+9). Confidence: high for current role and institution; high for the address because it appears on Keio's official Japanese page; high for timezone. ([Keio English profile](https://www.keio.ac.jp/en/faculty/k_100017261/), [Keio Japanese profile](https://www.keio.ac.jp/ja/faculty/k_100017261/), [Keio researcher record](https://k-ris.keio.ac.jp/html/100017261_en.html), [Tokyo timezone](https://www.timeanddate.com/worldclock/japan/tokyo))

## Why relevant

Makino's research combines experiments, reinforcement-learning models and circuit-level neural measurements to study reward prediction, action values and learning. This is a strong conceptual match for clarifying the teacher/brain boundary and identifying which learning claims need experimental support. ([2025 paper](https://www.science.org/doi/10.1126/sciadv.adi4782), [Keio research overview](https://www.keio.ac.jp/en/med/feature/index-78/))

## Current/recent work

- In January 2025, Makino and Ahmad Suhaimi reported distributed cortical representations of temporally accumulated reward prediction errors, using RL theory and multi-region mouse calcium imaging. ([Science Advances, 2025](https://www.science.org/doi/10.1126/sciadv.adi4782))
- In 2023, Makino reported that pretraining and action-value representations support composition of new behavior, with theoretical predictions tested in mice and cortex-wide imaging. ([Nature Neuroscience, 2023](https://www.nature.com/articles/s41593-022-01211-5))
- Keio's current researcher page also lists a 2026 Nature Communications study on short-term memory vulnerability in an Alzheimer's mouse model. ([Keio researcher record](https://k-ris.keio.ac.jp/html/100017261_en.html))

## Specific overlap with this project

FlyChess needs a biologically justified feedback path and persistent learning mechanism. Its present gamma4 rule is an engineered association model; reward/sensory/action mappings remain open, reversal choices passed in only 3/6 seeds, and chess transfer remains untested. Makino's reward-error and action-value research is relevant to asking how one should operationalize feedback and test adaptation without pretending the current model has solved it. ([project direction](../../../../documentation/design/research-goals/feedback-learning.md), [association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md), [2025 paper](https://www.science.org/doi/10.1126/sciadv.adi4782))

## What to ask

For a small connectome-constrained model with no validated natural reward interface, what is one bounded experiment that would most clearly separate feedback-dependent persistent learning from a response change caused by an engineered stimulation rule?

## Reasons he may not be the best contact

His recent reward-error studies use mice and cortex-wide imaging, while this project uses a released fly connectome and a simplified rate model. He may not work directly on insect mushroom-body reinforcement or chess-like tasks; a fly learning experimentalist may be a closer expert for anatomical mappings. ([2025 paper](https://www.science.org/doi/10.1126/sciadv.adi4782), [Keio overview](https://www.keio.ac.jp/en/med/feature/index-78/))

## Junior/assistant routes in the lab or close collaboration

- **Ahmad Suhaimi — Scientist, A*STAR Infectious Diseases Labs; close coauthor, not presented as a current Keio lab member.** A*STAR lists his role, research area and public email. He coauthored the 2025 reward-prediction-error paper with Makino. See [separate dossier](hiroshi-makino-ahmad-suhaimi.md), [A*STAR profile](https://www.a-star.edu.sg/idlabs/people/scientists), and [2025 paper](https://www.science.org/doi/10.1126/sciadv.adi4782).
- Keio lists no junior lab member on Makino's individual profile. The 2025 coauthor route above is a documented close collaboration, while present membership in the Keio lab is not verified. ([Keio researcher record](https://k-ris.keio.ac.jp/html/100017261_en.html))

## Personalized email draft

**Subject:** A bounded test of feedback-dependent learning in a fly model

Dear Professor Makino,

I’m a [grade/year] student working independently on a connectome-constrained fly simulation. Your work combining reinforcement-learning theory with neural measurements, especially the 2025 study of temporally accumulated reward prediction errors, is closely related to a design problem I’m facing: how to define feedback without having the teacher directly update the simulated brain.

Our current gamma4 prototype uses an engineered local association rule. We have not established natural reward, sensory or action mappings. In the frozen reversal experiment, only 3 of 6 seeds chose the new target, so the full acceptance gate failed. The puzzle runner still records feedback without applying learning, and chess transfer is untested. I am treating these as engineering results, not validated fly learning.

Could you recommend one bounded experiment that would distinguish a persistent feedback-dependent change from an effect built into the stimulation rule? I would be grateful for one design suggestion or a paper to read. A one-page methods summary is available if helpful.

Thank you for your time.

Best regards,
[Name]
[School / location]

## Sources (accessed 2026-09-30)

- [Keio English faculty profile](https://www.keio.ac.jp/en/faculty/k_100017261/)
- [Keio Japanese faculty profile and listed email](https://www.keio.ac.jp/ja/faculty/k_100017261/)
- [Keio researcher record and publications](https://k-ris.keio.ac.jp/html/100017261_en.html)
- [Keio research feature](https://www.keio.ac.jp/en/med/feature/index-78/)
- [Distributed representations of temporally accumulated reward prediction errors (Science Advances, 2025)](https://www.science.org/doi/10.1126/sciadv.adi4782)
- [Arithmetic value representation for hierarchical behavior composition (Nature Neuroscience, 2023)](https://www.nature.com/articles/s41593-022-01211-5)
- [A*STAR Infectious Diseases Labs scientist roster](https://www.a-star.edu.sg/idlabs/people/scientists)
- [Tokyo timezone](https://www.timeanddate.com/worldclock/japan/tokyo)
- [Project feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md)
- [Project association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md)

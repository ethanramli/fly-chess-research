# Ahmad Suhaimi

## Snapshot

As of 2026-09-30, A*STAR Infectious Diseases Labs lists Ahmad Suhaimi as a Scientist working at the intersection of neuroscience, immunology and virology, and publishes `asuhaimi@a-star.edu.sg`. He is a close coauthor of Hiroshi Makino, not verified as a current member of Makino's Keio group. Singapore uses SGT (UTC+8). Confidence: high for current A*STAR role and public email; high for coauthorship; explicit that current Keio lab membership is not established. ([A*STAR scientist profile](https://www.a-star.edu.sg/idlabs/people/scientists), [2025 paper](https://www.science.org/doi/10.1126/sciadv.adi4782), [Singapore time](https://www.timeanddate.com/worldclock/singapore/singapore))

## Why relevant

Suhaimi coauthored two studies with Makino that combine computational learning theory with biological neural data, including the 2025 reward-prediction-error study. This provides a close-collaborator route for a bounded methodological question about feedback and measured neural changes. ([2025 paper](https://www.science.org/doi/10.1126/sciadv.adi4782), [2022 paper](https://www.science.org/doi/10.1126/sciadv.abn0984))

## Current/recent work

- In 2025, Suhaimi and Makino reported mouse cortical representations of accumulated reward prediction errors using RL-based models and multiregional imaging. ([Science Advances, 2025](https://www.science.org/doi/10.1126/sciadv.adi4782))
- In 2022, Suhaimi and colleagues compared representation learning in a deep RL agent and mice performing the same sensorimotor task, analyzing state-value and policy representations. ([Science Advances, 2022](https://www.science.org/doi/10.1126/sciadv.abn0984))
- A*STAR currently lists Suhaimi's work as focused on neuroscience, immunology and virology, including arbovirus interactions with nervous and immune systems. ([A*STAR profile](https://www.a-star.edu.sg/idlabs/people/scientists))

## Specific overlap with this project

FlyChess is trying to model teacher feedback as an experience that changes internal state through an explicit mechanism. Its gamma4 association prototype remains engineered, natural reward/sensory/action mappings are unresolved, only 3/6 seeds made the correct reversal choice, and puzzle feedback is currently recorded but not applied to neurons. The overlap is the design and interpretation of RL-linked neural measurements, not direct equivalence between mouse cortex and fly learning. ([project direction](../../../../documentation/design/research-goals/feedback-learning.md), [project validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md), [2025 paper](https://www.science.org/doi/10.1126/sciadv.adi4782))

## What to ask

What single control would you use to show that a persistent response change depends on informative feedback rather than merely on matched neural stimulation?

## Reasons they may not be the best contact

His current A*STAR profile emphasizes neuroscience in an infectious-disease context, and his coauthored learning studies use mouse cortex and sensorimotor tasks. He may not work on fly reward circuitry, connectome-constrained models or chess. ([A*STAR profile](https://www.a-star.edu.sg/idlabs/people/scientists), [2025 paper](https://www.science.org/doi/10.1126/sciadv.adi4782))

## Junior/assistant routes in their lab or close collaboration

Suhaimi is a Scientist rather than the senior PI. His official A*STAR page publishes a direct contact route. For the senior research question, the documented close collaborator is Makino, whose official Keio page lists `hmakino@keio.jp`. ([A*STAR profile](https://www.a-star.edu.sg/idlabs/people/scientists), [Keio contact](https://www.keio.ac.jp/ja/faculty/k_100017261/))

## Personalized email draft

**Subject:** A control for feedback-dependent neural learning

Dear Dr. Suhaimi,

I’m a [grade/year] student working independently on a connectome-constrained fly simulation. I found your 2025 study with Professor Makino on temporally accumulated reward prediction errors especially relevant because it connects a learning-theory quantity to measured neural activity.

Our project is much more limited. We have an engineered gamma4 association rule, but no validated natural reward, sensory or action interface. The frozen reversal experiment passed in only 3 of 6 seeds, so the full acceptance gate failed. The separate puzzle round records feedback without changing neural state, and no transfer to chess positions has been demonstrated.

I’m trying to design a control that distinguishes informative feedback from the effects of simply delivering neural stimulation. What single control would you prioritize for that distinction? I’m not asking you to review the whole project; even a short pointer to a relevant experimental design would be helpful.

Thank you for considering it. I can send a concise protocol and raw summary if useful.

Best,
[Name]
[School / location]

## Sources (accessed 2026-09-30)

- [A*STAR Infectious Diseases Labs scientist profile](https://www.a-star.edu.sg/idlabs/people/scientists)
- [Distributed reward prediction errors (Science Advances, 2025)](https://www.science.org/doi/10.1126/sciadv.adi4782)
- [Sensorimotor representation learning in artificial and biological networks (Science Advances, 2022)](https://www.science.org/doi/10.1126/sciadv.abn0984)
- [Keio official contact listing for Hiroshi Makino](https://www.keio.ac.jp/ja/faculty/k_100017261/)
- [Singapore timezone](https://www.timeanddate.com/worldclock/singapore/singapore)
- [Project learning direction](../../../../documentation/design/research-goals/feedback-learning.md)
- [Project association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md)

# Tzuhsuan Ma

## Snapshot

As of 2026-09-30, Janelia lists Ma as a Postdoctoral Scientist in the Hermundstad Lab. Janelia's people page is the verified professional contact route; I found no officially published personal email on the cited profile. Ashburn, Virginia was on EDT (UTC−4) on the access date. Confidence: high for current role and lab; medium for an indirect contact route. ([Janelia profile](https://www.janelia.org/people/tzuhsuan-ma), [lab roster](https://www.janelia.org/lab/hermundstad-lab/members), [timezone](https://www.timeanddate.com/time/zone/@4744870))

## Why relevant

Ma develops quantitative approaches to identify compact, generalizable strategies in animal behavior, including reinforcement learning and task design across species. This is relevant to keeping FlyChess evaluations bounded and distinguishing transfer from immediate retry performance. ([Janelia profile](https://www.janelia.org/people/tzuhsuan-ma))

## Current/recent work

- In 2024, Ma and Hermundstad published “A vast space of compact strategies for effective decisions,” enumerating finite-state behavioral programs for a dynamic foraging task and studying how strategy variation changes behavior. ([Science Advances, 2024](https://doi.org/10.1126/sciadv.adj4064))
- In 2025, Ma presented “Probing compositional learning during spontaneous exploration of a reconfigurable 3D environment,” with Hermundstad and Jakob Voigts, at the Computational and Systems Neuroscience meeting. ([CCN 2025 poster](https://2025.ccneuro.org/poster/?id=1zU2byL8g7))
- Janelia's current profile says his research uses enumerated, discriminative tasks to probe behavioral strategies, including a planned progression from fruit flies to humans. ([Janelia profile](https://www.janelia.org/people/tzuhsuan-ma))

## Specific overlap with this project

FlyChess needs bounded tests of choice, reversal and transfer; its current full acceptance failed at 3/6 correct reversal choices, and chess transfer is still untested. Ma's focus on designing discriminative tasks and testing generalizable strategies is relevant to making the next experiment informative without treating the existing engineered association as validated learning. ([project validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md), [project learning direction](../../../../documentation/design/research-goals/feedback-learning.md), [Ma profile](https://www.janelia.org/people/tzuhsuan-ma))

## What to ask

How would you define one small held-out behavioral task that can distinguish a learned strategy from success on the exact task structure used during training?

## Reasons they may not be the best contact

Ma's current profile emphasizes decision strategy and task design, rather than synaptic plasticity or the anatomy of fly reward pathways. For biological mechanism questions, an experimental fly learning researcher may be more appropriate. ([Janelia profile](https://www.janelia.org/people/tzuhsuan-ma), [2024 strategy paper](https://doi.org/10.1126/sciadv.adj4064))

## Junior/assistant routes in their lab or close collaboration

Ma is the postdoctoral researcher route within Hermundstad's lab. The current roster also lists Theory Fellow Michele Nardin and Janelia Graduate Scholar Yirong Xiong; the Janelia lab contact page is the public route. ([Hermundstad Lab roster](https://www.janelia.org/lab/hermundstad-lab/members), [lab page](https://www.janelia.org/lab/hermundstad-lab))

## Personalized email draft

**Subject:** A question about a small held-out test of strategy transfer

Dear Dr. Ma,

I’m a [grade/year] student working independently on a connectome-constrained fly simulation. I read your work with Dr. Hermundstad on enumerating compact decision strategies and was interested in how task design can reveal whether an animal or model is using a reusable strategy rather than exploiting one familiar setup.

Our current project uses an engineered gamma4 association mechanism. Biological reward and sensory/action mappings are unresolved; the full reversal acceptance gate failed because only 3 of 6 seeds chose the new target. A puzzle round records feedback but does not apply neural learning, and chess transfer has not been measured. I’m trying to keep this distinction explicit while deciding what a meaningful next test should be.

How would you define one small held-out behavioral task that could distinguish a learned strategy from success on the exact training structure? I can send a concise protocol and the failed reversal summary if that would help make the question concrete.

Thank you for considering it.

Best,
[Name]
[School / location]

## Sources (accessed 2026-09-30)

- [Janelia profile and current research](https://www.janelia.org/people/tzuhsuan-ma)
- [Hermundstad Lab roster](https://www.janelia.org/lab/hermundstad-lab/members)
- [A vast space of compact strategies for effective decisions (Science Advances, 2024)](https://doi.org/10.1126/sciadv.adj4064)
- [CCN 2025 poster](https://2025.ccneuro.org/poster/?id=1zU2byL8g7)
- [Hermundstad Lab contact route](https://www.janelia.org/lab/hermundstad-lab)
- [Ashburn timezone](https://www.timeanddate.com/time/zone/@4744870)
- [Project association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md)
- [Project learning direction](../../../../documentation/design/research-goals/feedback-learning.md)

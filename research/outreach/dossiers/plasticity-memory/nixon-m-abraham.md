# Nixon M. Abraham

**Status:** Draft research dossier; verify immediately before outreach.  
**Last verified:** 2026-09-30

## Snapshot

- **Role/institution:** Associate Professor in Biology at IISER Pune; institutional profile lists neural circuits and behaviour and olfaction as research areas. [S1]
- **Official profile:** [IISER Pune faculty profile](https://www.iiserpune.ac.in/research/department/biology/people/faculty/regular-faculty/nixon-m-abraham/1). [S1]
- **Local time:** Pune, India; India Standard Time (UTC+5:30) on 2026-09-30. [S2]
- **Professional contact route:** IISER Pune lists `nabraham@iiserpune.ac.in`; the official faculty profile also lists his office phone. [S1]
- **Verification confidence:** High for role, area and contact; high for the date-specific timezone.

## Why this person is relevant

Abraham studies sensory processing, olfactory learning and neural circuits linking stimuli to behavior. The overlap is strongest for the project’s open question of how a numerical board/task representation could enter sensory circuits and how a choice is expressed through action circuits. It is less direct for the current mushroom-body reward-plasticity prototype. [S1, S3]

## Current and relevant work

- **2025 — “Mouse olfactory system acts as anemo-detector and anemo-discriminator,” Science Advances.** The study reports airflow detection/discrimination through the mouse olfactory system and discusses learning-dependent refinement and inhibitory olfactory-bulb circuits. It is a mammalian sensory study, not a fly connectome model. [S4]
- **2023 — “Persistent olfactory learning deficits during and post-COVID-19 infection,” Current Research in Neurobiology.** The authors used an olfactory matching paradigm to quantify learning-related deficits in COVID-19 patients and recovered subjects. [S5]
- **2026 — “Synaptic Inhibition in the Accessory Olfactory Bulb Regulates Pheromone Location Learning and Memory,” FASEB BioAdvances.** The primary article reports that perturbing ionotropic glutamate receptor signaling in inhibitory olfactory-bulb circuitry impaired pheromone-location memory in mice. [S6]

## Specific overlap with FlyChess

Our connectome-based simulation has not justified how chessboard features map into biological sensory pathways or how selected moves map to action outputs. Abraham’s sensory-circuit and behavioral-assay work may help frame those interface questions and the distinction between stimulus representation, learning, and measured behavior. The project’s gamma4 association prototype and failed 3/6 reversal result are engineering evidence only; his mammalian olfaction findings do not validate our fly model. [S1, S4, S5]

## Best bounded question

What minimum validation would you require before calling a hand-designed board encoding a sensory interface rather than merely a convenient input feature map?

## Reasons they may not be the best first contact

The recent work found is primarily mammalian olfaction, whereas our current biological mechanism is Drosophila mushroom-body conditioning. For fly reward circuitry and reversal specifically, Waddell or Tanimoto may be more directly aligned. The lab member list available on the lab website does not establish current roles for named trainees; I found no junior contact route I could verify from current institutional profiles. [S1, S3, S7]

## Junior or assistant routes

No junior or assistant researcher is included as a separate dossier: the lab’s member page contains names and roles, but appears to be a historical/currently unverified roster, and the institute sources checked did not corroborate a present junior role and public professional profile. A May 2026 lab post reports that Sanyukta Pandey defended her PhD, so she is not represented as a current student. The verified route is Abraham’s IISER faculty contact. [S1, S7, S8]

## Personalized draft

**Subject:** Student question on validating a sensory interface in a fly simulation

Dear Professor Abraham,

I’m [name], a [year/grade] student working independently on a connectome-constrained Drosophila simulation that learns from puzzle experience and feedback. The released wiring is preserved. Our current gamma4 association prototype is an engineered mechanism and failed its full acceptance gate: only 3 of 6 seeds chose correctly after reward reversal. The natural reward pathway and chess sensory/action mappings remain unresolved. I do not claim that flies understand chess or that learning has been validated.

Your work on olfactory learning and sensory circuits linking stimulus conditions to behavior prompted a specific question about our next design step. What minimum evidence would you require before calling a hand-designed board encoding a sensory interface rather than a convenient input feature map? We are trying to keep stimulus representation separate from feedback and from the action readout, and to test each mapping rather than assume it from connectome wiring.

I realize your recent work is primarily in mammalian olfaction, so even a brief pointer to a better sensory-circuit contact would be helpful. I can send a one-page architecture and the limits of our current evidence.

Best,
[name]
[School or independent-research status]
[Jakarta, Indonesia / timezone]
[Stable project link, optional]

## Sources (accessed 2026-09-30)

- [S1] IISER Pune faculty profile and contact: https://www.iiserpune.ac.in/research/department/biology/people/faculty/regular-faculty/nixon-m-abraham/1
- [S2] Pune time zone: https://www.timeanddate.com/time/zone/india/pune
- [S3] IISER Pune 2022 lab/fellowship project description: https://www.iiserpune.ac.in/news/post/india-alliance-senior-fellowship-to-dr-nixon-abraham/560
- [S4] Mahajan et al. 2025, *Science Advances*: https://doi.org/10.1126/sciadv.adq8390
- [S5] Bhowmik et al. 2023, *Current Research in Neurobiology*: https://doi.org/10.1016/j.crneur.2023.100081
- [S6] Marathe et al. 2026, *FASEB BioAdvances*: https://pmc.ncbi.nlm.nih.gov/articles/PMC13172612/
- [S7] Lab members page (current status not corroborated): https://abrahamnixon.wixsite.com/iiser/about-me
- [S8] Lab announcement of Sanyukta Pandey’s PhD defense, 2026-05-29: https://www.linkedin.com/posts/nixon-abraham-572a3b5_updates-from-the-lab-sanyukta-has-successfully-activity-7466054009209057280-yjlb
- Project evidence: [association validation results](../../../../documentation/design/neural-learning/gamma4-association-tests.md); [current feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md)

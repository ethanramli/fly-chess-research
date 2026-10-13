# Mala Murthy — outreach dossier

## Snapshot

- **Current role:** Director of the Princeton Neuroscience Institute and Karol and Marnie Marcin ’96 Professor of Neuroscience, Princeton University. **Confidence: high** (current PNI profile).
- **Location/timezone:** Princeton, New Jersey; America/New_York, UTC−4 on 2026-09-30 (timezone inferred from the institutional location and date).
- **Professional contact route:** `mmurthy@princeton.edu`; the PNI profile lists Jayshree Kalwachwala as assistant for administrative routing. The Murthy Lab also publishes a contact route for research inquiries. **Confidence: high.**

## Why relevant

Murthy co-led the FlyWire whole-brain connectome effort and studies fly neural circuits, behavior, and brain-wide activity. That makes her a strong contact for the project's use of the released adult connectome and for advice on keeping circuit interpretation within the evidence. Her lab's public materials also state a crucial boundary: flies do not learn their songs; its song research is about sensory modulation and behavioral patterning, not associative chess-like learning.

## Current/recent work

- **2026 — “Distributed control circuits across a brain-and-cord connectome,” Nature.** A large collaborative analysis spanning the brain and ventral nerve cord; the lab lists publication on 2026-06-08. This is relevant to the project's unresolved sensory-to-action interface, while not supplying a chess mapping. [DOI](https://doi.org/10.1038/s41586-026-10735-w).
- **2026 — “High-speed whole-brain imaging in Drosophila,” Nature Communications.** Brain-wide recordings at 28 volumes per second (60 for central brain) resolve fast auditory responses. [DOI](https://doi.org/10.1038/s41467-026-72437-1).
- **2024 — “Neuronal wiring diagram of an adult brain,” Nature.** The FlyWire Consortium paper reports the adult brain wiring diagram that the project constrains its model to preserve. [DOI](https://doi.org/10.1038/s41586-024-07558-y).

## Specific overlap with this project

The project uses the adult FlyWire graph and currently has an engineered gamma4 association prototype, but its frozen choice/reversal acceptance failed (correct reversed choice in 3/6 seeds). Its chess feedback receiver still records feedback without learning, and reward, sensory, and action mappings and chess transfer remain unresolved. Murthy's connectomics and brain-wide activity work provides context for interpreting structural resources and the kinds of measurements needed to connect circuit activity to behavior. It does not validate this software plasticity rule or establish a fly chess policy.

## What to ask

What one independently measurable neural or behavioral prediction would you require before treating a connectome-constrained, feedback-dependent simulation as more than an engineering demonstration?

## Reasons she may not be the best contact

Her senior leadership and broad lab remit may make a detailed question about gamma4 reward biology better suited to a researcher studying mushroom-body learning or to a junior member directly working on connectome interpretation. Her lab focuses heavily on social communication and adult fly behavior; this project uses chess as a synthetic task and does not yet have justified task-to-neuron interfaces.

## Junior/assistant routes in her lab or close collaboration

- **Wayan Gauthey — Neuroscience graduate student, jointly advised with Andrew Leifer.** Princeton's lab roster and PNI profile establish his current student affiliation; his recent whole-brain imaging project offers a close measurement-oriented perspective. [Separate dossier](wayan-gauthey.md).

Only one current junior researcher with directly relevant recent work is included here; the assistant named above is an administrative contact, not a research dossier subject.

## Personalized email draft

**Subject:** Student question on evidence standards for connectome-constrained learning

Dear Professor Murthy,

I’m [Name], a high-school student in [Country] working independently on a laptop-scale simulation constrained by the adult Drosophila connectome. I’m writing because your group’s work on FlyWire and brain-wide neural activity connects directly to two questions I’m trying to handle carefully: what the wiring diagram supports, and what additional evidence is needed to make a behavioral claim.

My current results are engineering evidence only. I have an engineered gamma4 association prototype, but its frozen acceptance test failed: after contingency reversal, the correct choice occurred in only 3 of 6 seeds. The puzzle-feedback pathway still records feedback without changing neural state; sensory, reward, and action mappings and chess transfer remain unresolved. I do not claim that flies understand chess or that learning is validated.

If you have time for one brief reply, what independently measurable neural or behavioral prediction would you consider the most important next test before this kind of model could support a learning claim? A pointer to a paper or a junior researcher’s work would also be very helpful.

Thank you for considering my question.

Sincerely,
[Name]  
[School or independent student]  
[Project page, optional]

## Sources (accessed 2026-09-30)

- [Princeton Neuroscience Institute — Mala Murthy profile](https://pni.princeton.edu/people/mala-murthy) — current titles, email, assistant, institutional location, and research focus.
- [Murthy Lab — members](https://murthylab.princeton.edu/members) — current roster and Wayan Gauthey's student role.
- [Murthy Lab — contact](https://murthylab.princeton.edu/contact) — official lab inquiry route.
- [Murthy Lab — publications](https://murthylab.princeton.edu/publications) — dated 2026 work and publication list.
- [Nature — distributed brain-and-cord control circuits](https://doi.org/10.1038/s41586-026-10735-w) — primary paper.
- [Nature Communications — high-speed whole-brain imaging](https://doi.org/10.1038/s41467-026-72437-1) — primary paper.
- [Nature — adult brain wiring diagram](https://doi.org/10.1038/s41586-024-07558-y) — primary paper.
- [Princeton Neuroscience Institute — Wayan Gauthey profile](https://pni.princeton.edu/people/wayan-gauthey) — current public profile/contact route.
- [Project feedback-learning direction](../../../../documentation/design/research-goals/feedback-learning.md) — stated objective and unresolved neural interfaces.
- [Gamma4 mechanism and limitations](../../../../documentation/design/neural-learning/gamma4-plasticity.md) — engineered prototype and biological caveats.
- [Association validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md) — frozen reversal result and failed acceptance gate.
- [Puzzle feedback round](../../../../documentation/design/puzzle-learning/record-only-round.md) — record-only feedback status.

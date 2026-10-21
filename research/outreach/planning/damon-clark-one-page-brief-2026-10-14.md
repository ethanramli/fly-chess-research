# FlyChess: learning and transfer in a connectome-constrained model

Ethan Ramli | Grade 11, Jakarta | Draft, 14 October 2026

Dear Professor Clark,

Dr Li Yan McCurdy suggested that I prepare a brief about my project for you. My interest in chess and neuroscience led me to ask: **could a simple organism's neural architecture support reasoning?** I am approaching a computational version of that question: can a model constrained by the released Drosophila connectome learn useful consequences through experience and apply that learning to unfamiliar chess positions?

**What I am building.** The simulation starts without pretrained chess weights and preserves released neuron identities, graph topology and sign conventions. Symbolic board/action information supplies the input; modeled activity-dependent plasticity changes permitted memory state on selected existing connections. A separate teacher checks consequences and supplies feedback, while the modeled learning mechanism determines the local updates. The sensory, teaching and output interfaces are engineered approximations whose biological justification remains incomplete. I lead the research questions and teaching design; AI assists substantially with implementation, and I am learning the underlying methods.

**Approaches that have helped.** One useful design is to reassess the model's current wrong choice, then contrast its independently verified consequence with a successful alternative. In one audited development puzzle, this changed an initially wrong choice to a correct move; matched controls stayed wrong, and removing the learned memory removed the repair. Another study preserved two familiar successful choices together. These are bounded familiar-learning results. My proposed contribution is to combine connectome constraints, consequence-checked teaching and causal memory tests with rigorous unfamiliar-position evaluation; I am not claiming a new biological mechanism or established first-ever result.

**The clearest simple-learning evidence.** Before advancing the chess curriculum, we tested a deliberately simple task: eight artificial signals, each paired with two options, A and B. In the first computational replica, truthful feedback produced 8/8 correct learned preferences, compared with 2/8 without external feedback, 3/8 with mismatched feedback and 0/8 with plasticity disabled. It retained 8/8 after 16 unrelated teaching experiences. When the assignments reversed, it reached 7/8, but mismatched feedback also reached 7/8, so the required reversal comparison failed. A separate software replay reproduced these outcomes. These were signal–option associations, not eight chess puzzles or an unfamiliar-position test.

**What has not worked yet.** Familiar chess improvements have not produced reliable transfer: one four-position sibling assessment scored 0/4 in every condition, and another readout study succeeded on two taught boards but failed its changed-board gate. Additional rehearsal has sometimes damaged earlier choices. We lack evidence for transferable reasoning, calibrated position evaluation or physiological fidelity.

**Next question.** We are investigating whether prior memory interferes with reversal by comparing retained-memory and reset-memory branches under matched feedback. That comparison is unfinished. I would value your advice on distinguishing representation, plasticity and readout limitations, and on what evidence would make the model's relationship to biological computation convincing.

Best regards,

Ethan Ramli

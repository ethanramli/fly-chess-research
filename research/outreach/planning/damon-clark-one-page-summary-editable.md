# FlyChess: Can a Fly-Derived Neural Model Learn to Reason?

**Ethan Ramli | Grade 11 | Jakarta**  
**GitHub:** https://github.com/ethanramli/fly-chess-research

Hello Professor Clark,

I'm Ethan Ramli, a 16-year-old Singaporean student in Jakarta. After speaking with Dr Li Yan McCurdy, she suggested I prepare a short summary for you. My interest in chess and the public fly connectome led me to a question: could a simple organism's neural architecture support reasoning through experience? I am exploring this through a model constrained by the released *Drosophila* connectome.

I chose chess because its complexity makes it a useful benchmark for whether a model can apply what it learns to unfamiliar positions, rather than just memorize puzzle answers. If it succeeds, it would show that this simulation can reason in a limited way. However, it would not prove that real flies can do the same.

This would matter because, if a small model based on a fly connectome could learn to reason in a limited way, it would challenge the idea that reasoning requires a human-sized brain or a massive AI model. It could help scientists understand what kinds of neural structure and experience are enough to support reasoning. The result would apply to this model and the tasks tested; it would not, by itself, show that real flies can reason.

This simulation has not been pretrained to play chess. It uses a fly connectome released as open data to define its neurons and connections. I provide chess positions and possible moves as inputs. A separate teacher verifies move consequences and delivers feedback, while a specified local plasticity rule changes memory on selected existing connections. The model's chess inputs, feedback-based learning, and move selection are still simplified, and I still need to determine how closely it matches a real fly's brain. I define the research questions and teaching design and propose the hypotheses. AI writes much of the code and helps validate these hypotheses, and I am learning the underlying methods.

There are some encouraging results. In one pretraining puzzle, comparing the model's wrong choice with a verified successful alternative changed its preference to the correct move. Matched controls remained wrong, and resetting the learned memory removed the improvement. In a separate prerequisite task with eight artificial signals and two choices per signal, the first computational replica learned **8/8** correct preferences. Controls scored **2/8** without feedback, **3/8** with shuffled feedback, and **0/8** with plasticity disabled. It retained **8/8** after 16 intervening teaching experiences. Software replay reproduced these results.

There are also important failures. When the artificial associations were reversed, the model reached **7/8**, but shuffled feedback also produced **7/8**, so it failed the required control comparison. In a separate test on four related chess positions, every condition scored **0/4**. More rehearsal has sometimes damaged earlier choices. Useful transfer remains unproved, and the association scores above are not chess-puzzle scores.

The familiar-puzzle repair suggests that feedback *can* produce a useful choice through persistent memory in this configuration. The key question is whether that learning can become reliable and transfer to unfamiliar positions (reasoning). I would value your advice on an experiment that could distinguish limitations in the input representation, learning mechanism, and output interpretation while testing what the connectome itself contributes.

Best regards,  
Ethan Ramli

**VERDICT: APPROVE WITH REQUIRED CHANGES — building allowed after the required-BUILD changes below.**

Revision 1’s blob matches the supplied hash. Scope: Volume 3, chapters *Process* and *Evidence*.

**Assigned assumption — changed.** Removing the diary proves that it cannot evaluate the current test position directly. It does **not** establish where the learned ability came from. Retention benefit remains untested; support for reasoning remains open.

1. **required-BUILD — A case classifier could pass while reasoning is wrongly attributed.**  
   **Evidence:** The controls are three-neighbour lookup and a linear reader on raw eyes; nevertheless, beating lookup is said to show that stored cases did not do the work ([design:173](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:173), [design:238](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:238)).  
   **Concrete passing scenario — hypothesis:** replay trains connection strengths into a classifier of recurring visual templates and their teacher verdicts. Connections preserve information from cases already evicted; the final quarter-capacity diary does not. The classifier retains earlier templates, learns new ones and beats shuffled pulses, filler and early replay. Unseen games retain the same template correlations. It scores 54/60 combination pairs, including 18/20 per group, while the specified controls score at most 42. Every software audit can pass. This remains compatible with case-based prediction rather than combining concepts.  
   **Smallest revision/check:** add a matched nonlinear case-classification control using the complete permitted experience history and replay exposure, including random or rewired features. Narrow attribution to superiority over the controls actually tested. Storing the pulse is permitted experience; repeatedly transferring that verdict into weights is still a possible explanation.

2. **required-BUILD — The combination gate need not demonstrate solving a problem.**  
   **Evidence:** A twin pair passes when one move scores higher across two boards ([protocol:12](C:/Users/ethan/Documents/fly-chess-research/documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md:12)). Stage 2 reports all-legal choice without making it a pass requirement; the later combination gates also use twin rankings ([design:215](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:215)).  
   **Consequence:** a learned board-wide score offset can improve twin rankings while leaving the candidate below a bad rival on both boards. Passing the earlier safe-capture choice gate does not settle choice on unfamiliar combinations.  
   **Smallest revision/check:** require useful all-legal choices on the combination tasks under their declared criterion. Include a comparison that cancels board-wide offsets, such as candidate-minus-rival margins. Otherwise call the result retained pair discrimination.

3. **required-BUILD — Failed interleaving does not establish an architectural ceiling.**  
   **Evidence:** Interleaving failure becomes “no joint setting is reachable” and “the memory cannot help” ([design:231](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:231), [design:250](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:250)).  
   **Consequence:** an unsuccessful learning schedule could be mistaken for inadequate representation or capacity. Conversely, replay cannot supply missing representational distinctions merely by repeating lessons. A Kenyon-cell readout could support combination through the circuit’s nonlinear dynamics; neither possibility is settled here.  
   **Smallest revision/check:** change the failure statement to “this schedule did not find a joint solution.” A capacity claim needs a bounded argument about the actual circuit and permitted gains. A successful witness would establish capacity, separately from learnability.

4. **required-BUILD — Assisted retention is being relabelled as Property 2.**  
   **Evidence:** The proposal claims “Property 2 with a disclosed aid” ([design:228](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:228)); the handoff explicitly says engineered memory does not count towards Properties 1 or 2 ([handoff:18](C:/Users/ethan/Documents/fly-chess-research/documentation/design/research-goals/memory-handoff-2026-11-07.md:18)).  
   **Consequence:** another passing gate could be reported as closing an older, stronger requirement—the recorded v8 mistake.  
   **Smallest revision:** name this **assisted retention for Volume 3**. Leave the original properties unresolved unless their definitions are explicitly amended.

5. **optional — Absence at test is a useful restriction, not a necessary boundary for Volume 3.**  
   **Evidence:** Volume 3 permits outsourced memory, working memory and specialized reinforcement learning ([volume scope:26](C:/Users/ethan/Documents/fly-chess-research/research/literature/writings/03-reasoning/README.md:26)).  
   **Consequence:** failure of replay-only consolidation would not reject an assisted system that retrieves experiences during decisions while the circuit evaluates them.  
   **Smallest revision:** identify removal as this candidate’s restriction. Designing it now is reasonable; the proposal appropriately keeps chess testing dependent on acquisition. Success on the older non-chess learner would remain a mechanism result.

**Strongest supportable sentence if execution succeeds as written:** “Replay of previously received teaching events improved retention and later locked twin-pair performance over the specified controls, with the diary absent during evaluation; this does not yet distinguish concept combination from a replay-trained case classifier.”
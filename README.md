# FlyChess

## 1. Why I’m doing this

I’m Ethan Ramli. I like chess, and when I saw that researchers had mapped the connections in a fruit fly’s brain, I wondered what a computer model built from that map could learn on its own. Could it learn from the consequences of its moves, then put several lessons together to solve a position it had never seen?

I want to find out how far that approach can go and where it breaks. My long-term ambition is to play against a FlyChess model that has developed its own style, and eventually see whether it can reach a measured rating of 2000 Elo. The research comes first. Even if the model hits a limit early, I want to be able to show which limit it hit and how we know. [Researcher’s vision](research/project/researcher_vision_2026-10-01.md)

<a id="start-here"></a>

## 2. What FlyChess is

FlyChess is an independent research project that tests learning in a simulation of a fruit fly’s neural wiring. The wiring map, called a **connectome**, tells us which neurons connect to which. The simulation adds rules for how activity spreads and how experience might change the strength of selected connections. Software turns chess positions into input for the model and reads its activity back out as scores for moves.

The main question is whether the model can acquire useful chess concepts from experience. In this project, **reasoning** means combining concepts learned separately to solve an unfamiliar problem. A successful test would tell us something about this model under the tested conditions. What a living fly can learn is a separate question.

## 3. How the research works

1. **Teach one concept.** Show the model a position and let it choose a move. An independent checker verifies the consequence of that move. The teaching procedure uses that consequence as feedback. If the checker cannot establish it, the model gets no teaching signal.
2. **Check what caused the change.** Compare informative feedback with conditions such as no feedback, shuffled feedback, and learning disabled. Compare the fly model with simpler systems that get comparable input and practice.
3. **Test on new positions.** Keep the final positions out of practice and development. Check whether the model can apply the concept when the board changes, then whether it can combine concepts it learned separately. Include simple lookup systems to see how much remembering similar boards can explain.
4. **Keep the evidence.** Record the settings, input versions, and results. Preserve failed tests and make it possible to audit the checker, feedback events, and reported scores.

The [research plan](documentation/design/research-goals/restart-plan-2026-10-30.md) explains the first learning experiment. The [transfer and combination protocol](documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md) explains the later tests and their comparisons. The [five-volume plan](research/literature/writings/README.md) follows the work from methodology and teaching through reasoning, model limits, and chess.

<a id="repository-tree"></a>

### How that maps to the repository

<!-- directory-map -->
- [`documentation/`](documentation/README.md) — What each experiment is designed to test, the current findings, and the decisions still open.
- [`research/`](research/README.md) — [Experiment reports](research/reports/README.md), literature, the research journal, and chapter plans.
- [`.codebase/`](.codebase/README.md) — The simulation, experiment runners, and checks that test the software.
- [`python actions/`](python%20actions/README.md) — Tools for inspecting and managing registered research runs.
- [`archive/`](archive/early-development/README.md) — Earlier approaches and the evidence they produced.
- [`.agents/`](.agents/skills/) — Instructions and skills used by the research and coding assistants.
- [`.github/`](.github/workflows/) — Automated repository checks.
- [`.vscode/`](.vscode/) — Editor settings.
<!-- /directory-map -->

## 4. The science

The fly’s **mushroom body**, a group of brain structures involved in learning, motivates the memory experiments. One approach tests whether a modeled dopamine signal can change selected connection strengths after a move. The question is whether those changes can help the model remember an earlier lesson after learning another, and whether the memory changes which move it picks. The project also checks the sensory input. If the input itself gives away the answer, a correct move tells us less about what the circuit learned. [Learning mechanisms](documentation/design/neural-learning/README.md) · [Board input](documentation/design/chess-input/README.md)

One independently audited test found that an added memory store could choose safe captures from a restricted set of moves. The same store performed better with board features taken directly from the input than with features from simulated neural activity. In a later study of memory in the model’s own connections, the planned capacity test succeeded on one of three boards, below the required two. A broader search found settings for all three boards after that test ended. Whether feedback can produce those settings remains open, and the later search is awaiting independent review. [Memory store result](research/reports/engineered-memory-test-v8-2026-11-07/README.md) · [Connection-memory stop report](research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md) · [Current research status](documentation/current-status.md)

## 5. The computation

The model uses a **sparse graph**. It stores the links that exist and follows those links when updating neural activity. Separate parts of the software translate the board, update the network, read move scores, and verify chess consequences. Keeping these parts separate lets us ask whether a result came from the network, the input, an added memory, or chess software doing the checking.

A search program can explore replies on a separate copy of the board. Tests distinguish how the model scores a move on its own from how it does with a fixed amount of search. This matters because a better answer can come from looking farther ahead even when the model has learned nothing new. [Simulation code](.codebase/src/README.md) · [Search and feedback](documentation/design/search-and-feedback/README.md)

## 6. The mathematics

**Why store only the connections that exist?** The graph loaded by FlyChess has 134,209 neurons and 2,700,513 directed connections. A table with one row for every possible sender and one column for every possible receiver would need about 18 billion entries.

| Step | What it counts |
| --- | --- |
| `134,209 × 134,209 = 18,012,055,681` entries | One slot for each ordered pair of neurons, including pairs with no connection. |
| `18,012,055,681 × 4 = 72,048,222,724` bytes | Give each slot four bytes. The table alone would take about 72 GB. |

That is a storage calculation. The sparse representation still needs memory for its recorded connections, neuron activity, and the rest of the running program. [Memory calculation and measured examples](research/literature/writings/01-methodology/04-memory-estimate-calculation.md)

The project also uses mathematics to test whether a proposed repair can work. In one saved model state, two earlier associations placed incompatible requirements on the same scoring setting. One required the value to be above 0.08425, while the other required it to be below 0.08394. No single value can satisfy both. That rules out changing that one setting as a repair for those saved responses. [Proof and scope](research/reports/interference-limits-2026-11-02/README.md)

## 7. The chess

Start with a capture. On one board, your bishop takes a piece and the opponent cannot take it back. Move a defending rook onto the same file in an otherwise similar position, and that capture might now lose the bishop. The task is to choose based on the reply that is possible on this board.

The first experiments use narrow tasks like this because we can check the answer using the rules of chess. Later tests ask whether the model can bring together several ideas it practiced separately. Full games ask a different question about playing strength. Measuring that will require games against a defined group of opponents under agreed conditions. [Chess volume](research/literature/writings/05-chess/README.md) · [Rating plan](documentation/design/evaluation-and-performance/elo-calibration.md)

## 8. FAQ

**Is there a real fly playing?** The player is software built using a map of fruit fly wiring. The chess experiments run on a computer.

**Does it train on human games?** Game records can supply positions. In the main experiment, the teaching signal comes from the verified consequence of the model’s own move. The repo also keeps separate baselines that use labeled examples for comparison.

**Is Stockfish making the moves?** The browser demo uses the untrained FlyChess model to score legal moves. The project has separate designs and comparisons that use chess engines for teaching or evaluation. Those roles are declared in the relevant experiment.

**Can it reason yet?** The published project records do not show that the model can combine learned concepts to solve unfamiliar positions. The [current status](documentation/current-status.md) explains which earlier steps have evidence.

## 9. Run it yourself

Install Git and **Node.js 22 or newer**. Then open a terminal and run:

```sh
git clone https://github.com/ethanramli/fly-chess-research.git
cd fly-chess-research
npm ci
npm run fetch:graph
npm run play
```

Open the address the program prints, usually `http://127.0.0.1:4173`. You can play against an **untrained** model that evaluates one move ahead. Run `npm test` from the same folder to check the software. Use the [code guide](.codebase/README.md) to find the demo and test commands, and the [research handoff](documentation/next-checkpoint.md) for the status of registered experiments.

[Contributor instructions](AGENTS.md)

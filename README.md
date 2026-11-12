# FlyChess

**Could a model of a fruit fly’s brain learn to play chess?**

FlyChess is an independent research project led by Ethan Ramli. It uses a map of how neurons in a fruit fly’s brain are connected to build a computer model. We test what the model can learn from the consequences of its own moves.

## Why chess?

Imagine taking a piece. On one board, you win it. On another, your opponent can take back. The board shows where the pieces are. The model has to work out what the opponent can do next.

That gives us a test we can score. Show the model a position, let it choose, and check what happens. Then give it an unfamiliar position and see if the lesson carries over. That tests one idea at a time. To show reasoning, the model would have to combine ideas it learned separately to solve a new kind of problem.

## What we’ve found

A memory system added to the model passed a test where it chose among captures. The same memory system performed better when it took its input directly from the board. The project still has to show that the model can learn through its own connections and combine what it learns on unfamiliar boards. [Read the memory experiment and its limits](research/reports/engineered-memory-test-v8-2026-11-07/README.md)

<a id="start-here"></a>

## Explore FlyChess

- [Where the research stands today](documentation/current-status.md)
- [How the experiments are designed](documentation/design/research-goals/restart-plan-2026-10-30.md) and [what the experiments found](research/reports/README.md)
- [Can a Fly Play Chess? The five-volume research plan](research/literature/writings/README.md)
- [Run the browser demo or browse the code](.codebase/README.md)

<a id="repository-tree"></a>

<details>
<summary>Repository map</summary>

<!-- directory-map -->
- [`documentation/`](documentation/README.md) — Research plans, designs, and handoffs.
- [`research/`](research/README.md) — Results, sources, journal, and chapter plans.
- [`.codebase/`](.codebase/README.md) — Simulation code, commands, and tests.
- [`python actions/`](python%20actions/README.md) — Commands for inspecting and managing research runs.
- [`archive/`](archive/early-development/README.md) — Earlier work and its evidence.
- [`.agents/`](.agents/skills/) — Skills for the research and coding assistants.
- [`.github/`](.github/workflows/) — Automated checks.
- [`.vscode/`](.vscode/) — Editor settings.
<!-- /directory-map -->

[Project instructions for contributors](AGENTS.md)

</details>

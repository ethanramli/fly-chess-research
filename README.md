# FlyChess

Could a simple brain learn to reason from experience? FlyChess explores that question with chess. The team builds a computer model based on the wiring of a fruit fly's brain, gives it chess positions and checked feedback, and tests whether what it learns helps it make choices in unfamiliar positions. Transferable chess reasoning remains an open research goal. The experiments measure the computer model.

## Start here

| If you want to… | Go to |
| --- | --- |
| See what the team has found so far | [Current research status](documentation/current-status.md) |
| See where the work stopped and what comes next | [Latest research handoff](documentation/next-checkpoint.md) |
| Find the tests, results, and independent checks behind a finding | [Experiment reports](research/reports/README.md) |
| Understand the question and how the team is testing it | [Research goals and design](documentation/README.md) |
| Explore the five-volume book and its chapter plans | [Can a Fly Play Chess?](research/literature/writings/README.md) |
| Set up the software or find the browser demo | [Software setup and commands](.codebase/README.md) |

## Repository tree

This map lists the top-level folders tracked in Git. Follow a folder link for its more detailed map.

<!-- directory-map -->
- [`documentation/`](documentation/README.md) — Research questions, designs, current status, and handoffs.
- [`research/`](research/README.md) — Experiment reports, sources, journal entries, outreach, and book plans.
- [`.codebase/`](.codebase/README.md) — Simulation code, commands, and software tests.
- [`python actions/`](python%20actions/README.md) — Reusable commands for checking and managing local research jobs.
- [`archive/`](archive/early-development/README.md) — Early work and its preserved evidence.
- [`.agents/`](.agents/skills/) — Skills used by the coding and research assistants.
- [`.github/`](.github/workflows/) — Checks that run on GitHub.
- [`.vscode/`](.vscode/) — Editor settings.
<!-- /directory-map -->

The root [project instructions](AGENTS.md) explain the research and repository rules. The [main command definitions](package.json) and [Windows launcher](fly.cmd) are also at the root. Local experiment outputs go under `runs/`; downloaded graph files and temporary data can live under `.cache/`.

[How to keep this map current](AGENTS.md#keep-readme-navigation-current)

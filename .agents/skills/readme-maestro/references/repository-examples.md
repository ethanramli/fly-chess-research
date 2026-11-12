# Repository examples

Examples inspected on 12 November 2026. These show existing navigation designs. They do not measure reader success or establish a universal ranking.

| Source | What to borrow | What to adapt |
| --- | --- | --- |
| [GitHub's README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) | Open with what the project does, why it matters, and how to start. Link to longer documentation. Use relative links for repository files. | Choose the first links based on actual reader tasks. |
| [mdBook repository navigation](https://github.com/rust-lang/mdBook#repository-navigation) | Pair code, tests, and documentation links with descriptions of what lives in each place. | Keep top-level descriptions short and hand off detail to the relevant folder. |
| [Rust compiler guide contents](https://github.com/rust-lang/rustc-dev-guide/blob/main/src/SUMMARY.md) | Use an ordered, linked hierarchy for deeper material, with separate routes for contributors and readers of the architecture. | Keep a complete table of contents in the guide. Give the root a short list of entry points. |
| [Kubernetes community generator](https://github.com/kubernetes/community/blob/main/generator/README.md) | Declare one source of truth for changing entries and document how to regenerate affected indexes. | Automate path coverage when the project grows quickly. Keep editorial descriptions in maintained Markdown when a full generator would add overhead. |
| [GitHub Docs style and content checks](https://docs.github.com/en/contributing/style-guide-and-content-model/style-guide) and [content linter](https://docs.github.com/en/contributing/collaborating-on-github-docs/using-the-content-linter) | Write descriptive link text and run repeatable checks on documentation changes. | An existing destination does not prove the link says the right thing or that every important page is reachable. Verify both separately. |

## Small acceptance test

From the root, find what the project does, the latest confirmed result, the record behind that result, and where to start contributing. Record which links a newcomer chose and what they understood. Then add an unlisted tracked child under a maintained map. The automated check should fail and name the owning page. Add the map entry and confirm the check passes. Repeat with a renamed path and an ordinary file added inside an already indexed report.

## FlyChess walkthrough

The original root map linked every top-level folder. Its descriptions still left a reader guessing where to find the planned test, the code that ran it, the result, and the history of the failed launch. A folder link and a valid destination are only the beginning of that route. [Earlier root README](https://github.com/ethanramli/fly-chess-research/blob/4aa952f3e53b4a13ba8d3f72ec69efd426f84f1b/README.md#repository-map)

In the updated map, a reader can see that experiment designs give the task, controls, and passing rule. Reports give the measured outcome and available audits. The journal explains the changes between attempts. The root links an actual engineered-memory test through its design, registered run, runner, failed result, and crash notes. The research guide gives separate entry points to versions since the October 30 restart and the frozen archive from before it. These links are a snapshot of the layout at the time of the edit. [Updated root README](https://github.com/ethanramli/fly-chess-research/blob/8d9bc9ed87c4f38bfb5d2ca07a7eb59f4875f746/README.md#repository-map) · [Research guide](https://github.com/ethanramli/fly-chess-research/blob/8d9bc9ed87c4f38bfb5d2ca07a7eb59f4875f746/research/README.md#finding-earlier-versions-and-failures)

For a tooling folder, explain the repeated problem it solves and what a caller gets back. In FlyChess, the Python tooling owns repeated run operations and keeps raw receipts on disk. The caller gets compact progress, errors, and the terminal outcome. That is more informative than labeling it “Python scripts and configs.” Confirm which file defines the command, which one specifies an individual run, and where the raw output lives before writing the guide.

### Reader tasks to try

Give a reader these prompts without naming the folders. Ask for their first link, what they found, and where they would go next.

- Find a failed experiment and explain the difference between why its first launch stopped and why the test ultimately failed.
- Find the latest research status and show which report supports it. Explain how to locate experiments from before the restart.
- Find the command guide for inspecting an existing run and explain where to look when the short status lacks enough detail.

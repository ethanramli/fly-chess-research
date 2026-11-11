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

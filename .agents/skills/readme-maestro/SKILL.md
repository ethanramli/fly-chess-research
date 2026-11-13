---
name: readme-maestro
description: Write or repair READMEs, directory maps, documentation indexes, and newcomer navigation. Use when a README feels generic, the purpose of folders is unclear, readers cannot trace how the project works or find evidence, or a growing repository needs clearer onboarding and maintained maps. Skip arithmetic, copy edits, and code work that leaves reader routes unchanged.
---

# README Maestro

Help a reader understand the project and find the files that answer their question. Use Please No More Slop for naming and plain-language editing when available. Preserve exact paths, necessary technical terms, and the scope of each claim.

## Inspect before editing

1. Read the user's requested structure, project instructions, root README, and section guides. For a full README or map repair, use Git to list the immediate tracked folders under that guide, including files missing from a sparse checkout. Note which ones the map covers. Inspect representative files before describing a folder. For a single-link change, trace that route only.
2. Write down the questions a newcomer and a contributor should be able to answer. Try their routes from the root. Record vague entries, dead links, missing steps, duplicate explanations, and competing copies of current status.
3. Identify the maintained sources for goals, setup, current status, and evidence. Identify frozen records, vendored files, generated files, and machine-local outputs. Preserve the distinction when linking readers to them.

## Explain the project and its directories

- Keep the root's role and depth aligned with the user. A full project introduction can explain motivation, method, implementation, results, and how to run it. Give readers a few early links to the tasks they are likely to arrive with. Keep changing details in their maintained source.
- Give each covered immediate folder one entry with **its purpose, a concrete example of what it holds, and a direct first link**. Link the exact runner and plan separately when readers need to inspect them, even if both paths also appear in a command. Use the literal path as the link label when readers need to recognize it in Git. Add a representative file or child guide when the purpose is hard to infer. A description that could fit several neighboring folders needs more detail.
- Explain how the folders work together. Where the repository has several layers, follow one real task across them. A research example might link the design, run configuration, code, outcome, and correction. Choose an example that teaches the structure and make each link's role explicit.
- Cover the tracked top-level directories and link substantial areas to their own guides. Let each guide explain its immediate children and give readers a way back. Use the root to show important child routes when they answer a common question. Keep long file lists with the owning guide.
- Open each guide with what it helps readers do. Group links by the questions readers ask. Put prerequisites, commands, and expected results together. Label proposals, audited outcomes, failed attempts, and superseded versions. Point to the recorded evidence and say when raw files live on a particular machine.

## Handle moves and keep maps current

- Treat navigation and physical reorganization as separate changes. When the user wants a move, trace inbound links, CLI entry points, imports, configs, scripts that generate paths, and persisted state keyed by a path. Find evidence pins and recorded commands before editing. Preserve exact replay through the recorded paths or a pinned checkout, and verify that the current entry points still work.
- Name the owner, coverage, and exceptions for each maintained map. State in contributor instructions that adding, moving, removing, renaming, or repurposing a covered entry requires updating the map and its affected links in the same change.
- Use an existing Git-based check where available. For a fast-growing map that needs a check, test coverage and link validity independently. A new covered folder should fail until it is mapped. A raw log inside an indexed report should leave the parent map alone. Keep editorial descriptions in source control.
- Check exact path case, relative links, encoded spaces, and supported heading anchors. State verification limits. Avoid downloads, external checks, and experiment runs unless the task requires them.

## Verify that readers can use it

For a map repair, compare the entries against the tracked folder list. Resolve any missing entry, or name its reason for being outside scope. If a link is meant to explain one launch, outcome, or recovery step within a page, link to that heading directly when it exists. Open each first link and confirm its target or anchor. Walk the finished routes to the project explanation, a current result and its evidence, a prior failure or superseded version when relevant, and the setup or contribution entry point. At each stop, check whether the reader can explain why the folder exists and what to open next. A passing link check establishes that destinations exist. Review the wording and the usefulness of the routes separately. If a fresh reader is available, give them a task without telling them which folders to open, then ask them to explain what they found. Report the routes and checks that actually ran.

For worked examples and acceptance tasks, read [repository examples](references/repository-examples.md).

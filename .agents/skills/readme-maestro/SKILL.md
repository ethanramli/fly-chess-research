---
name: readme-maestro
description: Write or repair READMEs, directory maps, documentation indexes, and newcomer navigation in growing repositories. Use for README rewrites, confusing folder structures, missing or stale navigation, onboarding routes, and checks that keep maps current as the project changes.
---

# README Maestro

Help a reader who has never seen the project find the right explanation, evidence, or next action. Use Please No More Slop for naming and plain-language editing when available. Keep literal paths and necessary technical terms exact. Explain each unfamiliar term where the reader first needs it, and preserve what the evidence actually supports.

## Inspect before editing

1. Read the root README, project instructions, and current navigation. Inventory tracked paths with Git. In a sparse checkout, inspect the tracked tree even when files are missing from disk.
2. Identify the audiences and their questions. Walk from the root as a newcomer and as a contributor. Record dead links, missing routes, competing copies of current status, unexplained labels, and pages buried in the wrong index.
3. Identify canonical sources for current status, setup, evidence, and project goals. Identify archive, vendor, generated, and pinned material. Fix the routes to frozen records from maintained pages.

## Write the shortest usable route

- Give the root a one-paragraph project explanation and a handful of task-based links. Use labels that tell readers where the click leads. Give fast-changing information one home and link to it from the root.
- Use a shallow, clickable directory tree with real paths and plain descriptions. Link each substantial area to a maintained folder overview. Keep a full file listing out of the root. Give each deeper page one home and a clear way back.
- Open each index with what the folder is for and which page to read first. Group long lists by the question a reader has. Keep exact commands near their prerequisites and expected result. Put detailed references one level deeper.
- List current, planned, and historical material with labels that tell the reader its status. For research, route to the report or artifact behind a claim. Label machine-local outputs as local and link to a tracked explanation.
- Leave path names stable by default. Before renaming or moving anything, verify inbound links, references in commands and code, public entry points, and evidence pins. Update all affected references in the same change.

## Keep navigation current

- For each maintained map, name its owner, covered directories or files, and explicit exceptions. State in the contributor instructions that adding, moving, removing, renaming, or repurposing a covered entry requires updating the map and affected links in the same change.
- Use a Git-based check for fast-growing maps. Test coverage as well as valid destinations. A new eligible folder that is absent from the map must fail. A new raw log within an already indexed report should leave its parent map unchanged. Keep source-controlled descriptions when regenerating a tree.
- Validate exact path case, relative paths, URL-encoded spaces, and supported heading links. Declare syntax or scope limits. Avoid downloads, external link checks, or experiment runs unless the task needs them.

## Verify the result

Walk from the root to the main explanation, current state, an evidence source, and the contribution or setup route. Ask a fresh reader or reviewer to find the answer and paraphrase what it means when available. Check the changed paths and all maintained maps. Report the paths tested, verification limits, and any unresolved route.

For precedents and a small acceptance test, read [repository examples](references/repository-examples.md).

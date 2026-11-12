# Research documentation

This folder explains why FlyChess runs each test and how to interpret it. The current status summarizes what the evidence supports. The handoff records where to pick up the work.

- [Current research status](current-status.md) explains the latest result and its limits. The [post-restart history](current-status-history-2026-10-31-through-2026-11-09.md) and [earlier status history](current-status-history-through-2026-10-30.md) preserve older updates.
- [Latest research handoff](next-checkpoint.md) gives the last checkpoint, the open decision, and the evidence still needed for each volume.
- [Research question and evidence requirements](design/research-goals/README.md) explains what would count as learning or reasoning. The [October 30 restart plan](design/research-goals/restart-plan-2026-10-30.md) explains why earlier experiments moved to the [early-development archive](../archive/early-development/README.md).

## Documentation folders

<!-- directory-map -->
| Directory | What you’ll find |
| --- | --- |
| [`design/`](design/README.md) | Research questions and test plans. Look here for the model inputs, feedback rules, controls, and what counts as passing each test. Start with [what would count as transferring or combining lessons](design/research-goals/transfer-and-combination-protocol-2026-11-03.md). |
| [`handoffs/`](handoffs/README.md) | Dated notes that explain where an investigation stopped and what the next session needed at the time. The [restart handoff](handoffs/restart-handoff-2026-10-30.md) records the input shortcut that prompted the October 30 restart. |
| [`ideas/`](ideas/README.md) | Working hypotheses and ideas for future tests. The [idea bank](ideas/idea-bank.md) captures open questions and possible ways to investigate them. |
| [`writing/`](writing/README.md) | The [paper outline](writing/manuscript-outline.md), submission checklist, journal plans, and event planning. Use the [five-volume chapter plans](../research/literature/writings/README.md) to find where a piece of evidence fits in the larger project. |
<!-- /directory-map -->

To see how a test turned out, read its [experiment report](../research/reports/README.md). To find the command that ran it, use the [software guide](../.codebase/README.md).

## Where to put a new note

- Put a design or protocol in the corresponding [design topic](design/README.md). Label proposals, approved plans, frozen protocols, and measured results clearly.
- Put source notes in [literature](../research/literature/README.md), dated discussions and corrections in the [journal](../research/journal/README.md), and results in [reports](../research/reports/README.md).
- Update the owning README and any links to moved files in the same change. Use the [path history](relocation-map.md) to find a current location for an old citation. Preserve the original records.

[FlyChess README](../README.md#repository-map)

# Research records

This folder holds the evidence behind FlyChess and the history of how it was produced. Use the reports for measured outcomes and the journal to understand what changed between attempts. The [current status](../documentation/current-status.md) links to the evidence behind the project’s latest conclusions.

## Research folders

<!-- directory-map -->
| Directory | What you’ll find |
| --- | --- |
| [`reports/`](reports/README.md) | Reports grouped by research question. Open one for the measured outcome, passing rule, available evidence files, and any independent audit. The index includes failures and reviews of unrun proposals. |
| [`journal/`](journal/README.md) | The dated record of experiments and discussions. Use [`journal/experiments/`](journal/experiments/README.md) to follow crashes, flawed controls, corrections, and the decisions that led to a new version. |
| [`literature/`](literature/README.md) | Notes on papers and prior implementations. The [source register](literature/source-solution-register.md) records which claims each source supports and how the project used it. The [five-volume workspace](literature/writings/README.md) maps out the chapters and the evidence each one needs. |
| [`project/`](project/README.md) | The researcher’s aims, permissions, and [decision log](project/decision_log.md). Use the log to trace why the scope or method changed. |
| [`outreach/`](outreach/README.md) | Background research on experts, outreach plans, and drafts. Use the [outreach journal](journal/outreach/README.md) for dated records of contact and meetings. |
<!-- /directory-map -->

## Finding earlier versions and failures

- **Since the October 30 restart.** The [reports index](reports/README.md) lists the engineered-memory versions and other experiments by topic. The [version 3 report](reports/engineered-memory-test-v3-2026-11-04/README.md) explains how tied scores and unequal practice affected the comparison. The [version 8 report](reports/engineered-memory-test-v8-2026-11-07/README.md) explains what passed its audit and why it was kept as a lookup comparison. Use the [experiment journal](journal/experiments/README.md) for the sequence of attempts and corrections.
- **Before the restart.** Start at the [early-development archive](../archive/early-development/README.md) for the old method and why the project moved on. It links to the old reports and explains how to browse the historical checkout. The [datasets and frozen protocols](../archive/early-development/research/data/README.md) and [source snapshots](../archive/early-development/research/source-archives/README.md) preserve what those tests used. The [path history](../documentation/relocation-map.md) helps resolve old references.

Reports link to tracked evidence when it is available. When a report names a path under `runs/`, it refers to outputs on the machine that ran the job. A run’s manifest records which command and inputs were used. Its summary and records capture what happened.

## Adding research records

Keep reports, protocols, outputs, and checkpoints at their recorded paths. Add a link to a new record from its owning index in the same change. Use a dated journal entry to correct a past record. Put current conclusions in the status page and link them to their evidence.

[FlyChess README](../README.md#repository-map) · [Research documentation](../documentation/README.md)

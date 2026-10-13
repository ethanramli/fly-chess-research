# Bounded teacher replay software probe

[report.json](report.json) pins the prior explanation report, current sources and four independently replay-checked consequence clips. Original source files are copied under source/. Two composed engineering fixtures, no neural inference or learning. See [design and limitations](../../../documentation/design/search-and-feedback/consequence-clips.md).

Command: `node --max-old-space-size=256 .codebase/scripts/probe-consequence-clips.mjs --out research/reports/consequence-clips-software-2026-10-06`.

The successful fixture yields Rf8+ under a three-ply task and Qxh7# under a one-ply task. Changed support yields two checked failures under their exact contexts. These implementation examples are not held-out transfer evidence or a delayed eligibility mechanism.

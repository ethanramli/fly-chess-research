# Lesson pause operational version v1

Registered 2026-10-20 for the researcher's `fly pause` request. This is an explicit execution-source variant around the existing G0 history replication. The frozen canonical runner, auditor, numerical sources, protocol, gates, receipts and failed results remain preserved.

[registration.json](registration.json) pins canonical and actual execution sources and declares every source insertion. [prepare_pause_controls.py](../../../python%20actions/prepare_pause_controls.py) reproduces the copies and config changes. [previous-step-config.json](previous-step-config.json) preserves the configuration before this change.

The [new runner](../../../.codebase/scripts/neural-learning/run-g0-history-with-pause.mjs) adds a pause request path, operational source archiving, and a stop check after a complete lesson has been acknowledged and saved. Physiological/protocol identity is deliberately retained for existing checkpoint recovery. **Execution source identity is different**, pinned separately and saved in `execution.json`, `pause-registration.json`, and `execution-sources/` for every invocation. The actual code must reproduce the canonical source exactly after the declared pause insertions are removed. It is not represented as byte-identical execution of the original runner.

The [new independent auditor](audit.mjs) retains the frozen receipt, certificate, neural recurrence, branch and wiring replay. It additionally checks operational source identities and parent-publication hashes. Verification can pause after a complete audited lesson; rerunning babysit restarts the read-only verification, while saved training remains intact. No partial verification is a successful audit.

`fly pause` targets only the identity-checked process for the registered current run. It writes a protocol-bound request, waits for a saved pause acknowledgment and confirms process exit before saying it is safe to close. It never kills an unknown process or claims a timeout is a successful pause. `fly babysit` resumes training into a fresh directory; it preserves pause receipts and archives an old audit-pause request before an explicit restart.

This adds operational interruption points, not biological timing, forgetting, consolidation, new exposure, new scientific gates or evidence of reasoning. Earlier frozen runtime/resource ceilings still apply. Power-loss/filesystem durability is not guaranteed.

Software verification and any mistakes are recorded in the [terminal controls journal](../../journal/experiments/2026-10-20-terminal-report-and-pause.md).

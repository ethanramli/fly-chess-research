# Bound-ray development comparison continuation

2026-10-08. Continue the two missing control arms of the unchanged frozen matched protocol; no learner source or gate changes. Authoritative Node process inspection found only Codex processes before launch. Frozen preflight passed. Existing bound-ray no-channel supplemental audit and its COMPLETE/report hashes passed verification. Original signed-zero audit failure remains preserved. The supplemental auditor normalizes only JSON-unrepresentable negative zero; source hash is recorded in each supplemental audit.

Missing arms run serially into this fresh directory: bound-ray shuffled, then disabled. Each follows the already-completed informative arm's exact16 experiences/order/timing with120 neural presentations, heap256/duty0.5/RSS768MiB/free256MiB. Each completed training arm is independently replayed before the next graph operation.

Commands:

node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bound-ray-feedback-development.mjs --out research/reports/bound-ray-feedback-development-completion-2026-10-08/bound-ray-shuffled --encoder bound-ray --condition shuffled --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-bound-ray-feedback-development-json-zero.mjs research/reports/bound-ray-feedback-development-completion-2026-10-08/bound-ray-shuffled
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-bound-ray-feedback-development.mjs --out research/reports/bound-ray-feedback-development-completion-2026-10-08/bound-ray-disabled --encoder bound-ray --condition disabled --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-bound-ray-feedback-development-json-zero.mjs research/reports/bound-ray-feedback-development-completion-2026-10-08/bound-ray-disabled

Read-only synthesis: node .codebase/scripts/diagnostics/summarize-bound-ray-feedback-development.mjs

The synthesis verifies raw report/audit completion hashes and summarizes train/validation margins, repairs/regressions and isolated first-event effects. It reads no final-family data and performs no graph inference. A higher average margin does not waive the original acquisition gate or retention/transfer requirements. Recovery testing remains separate.

Terminal correction: all eight arms independently audit; original acquisition gate fails. Full results and limits: [journal](../../journal/experiments/2026-10-08-feedback-comparison-completion.md), [summary](summary.json), [recovery audit](recovery-audit.json), [training-only curriculum example](curriculum-example.json). Recovery uses a deliberately copied pending prefix, not an actual historical crash. Planner tests4/4 and npm test158/158 pass; no graph run through the new planner.

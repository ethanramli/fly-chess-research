# Certified consequence feedback

2026-10-05. Engineering verification only; record-only receiver.

The full 134,209-neuron sparse graph fixture selected `Qh7#`. Initial preference `Qa2` misses the mate-in-one objective. Four of 26 legal candidates were reviewed after commitment, without their proofs entering search. All six stored consequence certificates (task, committed move, four reviews) pass a separate legal replay checker. The checker and constructor share chess.js rules; neither supplies evidence of neural learning or strategic transfer.

`round-000001/result.json` preserves raw certificates, claims, diagnostics, receipts, sources/input hashes, command and measurements. `round-000001/state.json` is a round-state v3 checkpoint, not trained weights. `audit.json` rechecks certificate/source identity and exact checkpoint/scientific feedback replay against the second run, omitting only elapsed measurements. It does not audit the search trajectory. Sources are archived in `sources/`.

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-round.mjs --out research/reports/certified-consequence-2026-10-05 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/puzzle-round.mjs --out research/reports/certified-consequence-replay-2026-10-05 --cpu-duty 0.5 --resume research/reports/certified-consequence-2026-10-05/initial/state.json
node --max-old-space-size=256 .codebase/scripts/audit-consequences.mjs --result research/reports/certified-consequence-2026-10-05/round-000001/result.json --compare research/reports/certified-consequence-replay-2026-10-05/round-000001/result.json --out research/reports/certified-consequence-2026-10-05/audit.json
npm test
```

Use new output paths when repeating. First run: peak RSS 101.75390625 MiB, elapsed 12.2363314 seconds, CPU 5.422 seconds. Replay: peak RSS 102.3046875 MiB, elapsed 6.7219637 seconds, CPU 4.141 seconds. These are individual observations, not a speedup comparison. All graph/parameter hashes are unchanged; receipt flags remain `appliedToNeurons: false`, `learningApplied: false`. All 40 tests pass, including both actors, rejection of tampered/incomplete certificates, repetition preservation and unknown budget outcomes. These fixtures do not demonstrate reasoning, biological validity or deeper-combination performance.

The teacher now has checkable bounded evidence. The outstanding main work is translating verified consequences into justified neural experiences and delayed credit, demonstrating persistent puzzle learning, and measuring unfamiliar/counterfactual transfer per experience under fixed search budgets. This certificate change does not expand the existing 870-edge candidate into full-model adaptation.

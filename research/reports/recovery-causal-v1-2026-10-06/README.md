# Single-event recovery interventions: no task rescue

2026-10-06. Completed frozen diagnostic of adaptive-review attempts 4–8. Original learner/gates remain unchanged. This is an artificial memory intervention, not new training or reasoning evidence.

| Intervention | Jobs | Original revival prevented | Independently verified mate |
|---|---:|---:|---:|
| Recorded post-event memory | 5 | 0 | 0 |
| Suppress positive gain changes | 5 | 1 | 0 |
| Remove single-event recovery term | 5 | 1 | 0 |

Both interventions change attempt 4's preferred move from Kh6 to Qf6, which is also a previously rejected non-mating move. Attempts 5–8 retain the original incorrect top choice. Thus positive recovery is necessary for the particular Kh6 ranking at attempt 4 under these interventions, but it is not necessary for four other revivals. Recovery alone does not explain or repair the observed choice failure. This does not rule out accumulated recovery across the full training trajectory, recurrent representation interference, input/readout biases or insufficient supported memory capacity. No complete trajectory under an altered rule ran.

Each intervention starts from its own event's saved state/activity, not the preceding intervention. All 26 legal candidates remain available and are measured with the full graph. Recorded replays match all saved scores exactly. Memory is unchanged during probes; wiring/sign/nonplastic hashes hold. No feedback occurs. Bounds and timing remain numerical engineering choices.

- [report.json](report.json): SHA-256 `39a86e81c893d4ba3ddcce11f11a47094002d6871b3534d704b7348e55bbacc8`.
- [audit.json](audit.json), [audit-prefix.json](audit-prefix.json): independent gain-intervention reconstruction, 15 certificates, legal coverage/ranking arithmetic, original reproductions and exact resumed one-job prefix.
- [audit-correction.txt](audit-correction.txt): preserves the first audit-only wrapper/certificate argument error; experimental records never changed.
- `sources/`: SHA-verified driver/modules, frozen protocol and final auditor.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-recovery-causal.mjs --out research/reports/recovery-causal-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-recovery-causal.mjs --run research/reports/recovery-causal-v1-2026-10-06 --out research/reports/recovery-causal-v1-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/probe-recovery-causal.mjs --out research/reports/recovery-causal-prefix-2026-10-06 --cpu-duty 0.5 --max-jobs 1 --resume research/reports/recovery-causal-v1-2026-10-06/intervention-001/state.json
node --max-old-space-size=256 .codebase/scripts/audit-recovery-causal.mjs --run research/reports/recovery-causal-v1-2026-10-06 --compare research/reports/recovery-causal-prefix-2026-10-06 --out research/reports/recovery-causal-v1-2026-10-06/audit-prefix.json
npm test
```

Main: **390 full-graph presentations**, **108.84 MiB peak RSS**, **164.424 seconds elapsed**, **79.750 CPU seconds**, heap 256/duty 0.5. Prefix: 26 presentations, 108.49 MiB, 11.628 elapsed seconds, 6.063 CPU seconds. **52/52 tests pass**. No resource improvement claim.

Graph SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`; annotations SHA-256 `30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6`. Full input/source/model identities and exact commands are in report.json.

The next mechanism investigation must address representation and persistent ranking across multiple actions; these interventions do not justify replacing the biological rule. The original target still requires consequence-specific investigation feedback, supported lasting adaptation and improved unfamiliar/counterfactual decisions under equal search budgets. None is established by this diagnostic.

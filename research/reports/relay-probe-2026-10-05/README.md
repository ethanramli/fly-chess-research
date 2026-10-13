# Fixed circuit response probe

2026-10-05, Asia/Jakarta. Protocol [relay-probe-v1](../../data/relay-probe-v1/protocol.json) was written before the first run. [Raw report](report.json) retains all mapped readouts at every dose. This is a read-only prerequisite experiment for consequence-driven puzzle learning, not learning or biological validation.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-learning-relay.mjs --out research/reports/relay-probe-2026-10-05 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/probe-learning-relay.mjs --out research/reports/relay-probe-prefix-2026-10-05 --cpu-duty 0.5 --max-probes 2
node --max-old-space-size=256 .codebase/scripts/probe-learning-relay.mjs --out research/reports/relay-probe-resumed-2026-10-05 --cpu-duty 0.5 --resume research/reports/relay-probe-prefix-2026-10-05/probe-002/state.json
```

Use new output directories when repeating. Source/graph/annotation/protocol/anatomy hashes, model configuration, schedule and pacing are checkpoint identities. All graph arrays and all parameter arrays are checked after every forward call. Probes restart rate activity from rest using the existing eight-step kernel. They neither deliver neural learning nor update traces/gains.

34 probes: one resting response, then three predefined currents for four individual MBON12 cells, two individual MBON01 cells, two individual PPL103 cells, all PAM02 cells, both MBON05 cells and both GF cells as a direct readout control. Every cell/dose is retained, including decreases. Population stimulation uses the stated current per cell; comparisons across populations are not matched total-current interventions.

Two direct positive-sign edges were independently checked in the pinned anatomy report:

| Stimulated MBON12 root | Direct PAM02 receiver root | PAM02 response change at current 1.5 |
|---|---|---:|
| 720575940623001480 | 720575940636659886 | +0.08384044 |
| 720575940630075703 | 720575940640048768 | +0.03362359 |

Other PAM02 cells have mixed responses, often negative. The whole graph is active, so the increase cannot be attributed exclusively to one edge without a separate intervention. There is no claim that these rates measure dopamine release, natural reward or omission encoding. No selective route was extracted or rewired.

At current 1.5, the maximum absolute GF change over MBON12 presentations is 0.0000057593. Both MBON05 cells stimulated together yield a maximum absolute GF change of 0.0000081407. Direct GF stimulation yields changes of 1.4833562 and 1.4833987, confirming that the readout can respond to its own current injection. These contrasts characterize the kernel; they do not specify a required biological dynamic range, prove a usable action signal, or establish learned cue specificity. Numerical detectability above the declared 1e-7 resolution is not a biological acceptance gate.

Initial full invocation: 108.734375 MiB peak process RSS, 21.410617 elapsed seconds, 10.673 CPU seconds. Prefix: 120.972656 MiB, 2.321599 seconds, 1.485 CPU seconds. Resumed invocation: 108.886719 MiB, 19.657604 seconds, 9.937 CPU seconds. Values run through report preparation. No speedup comparison is claimed. Graph SHA-256: `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`; full report retains remaining hashes and exact arguments.

The final `probe-034/state.json` matches the resumed final checkpoint exactly, including every response and schedule identity. Both reports preserve all parameter/graph hashes. [Independent record check](audit.json) verifies root identities, schedule coverage, rest-relative deltas, direct-edge existence and exact replay. This checks software records, not physiology.

Exact runner/kernel sources are archived under `sources/` with the report's original hashes. The record audit runs with `node --max-old-space-size=256 .codebase/scripts/audit-relay-probe.mjs`; it refuses to overwrite an existing audit. The later stimulus-index coverage check is retained in `audit-expanded.json`, preserving the initial audit.

Next: establish compartment eligibility and a separately evidenced recovery/plasticity approximation. Candidate-cell presence and propagation do not provide receptor dynamics. Reliable reversal, candidate-specific learned GF activity, a justified chess feedback interface, puzzle learning and held-out transfer remain outstanding.

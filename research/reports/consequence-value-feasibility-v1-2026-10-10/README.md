> **Current outcome, 2026-10-10:** full neural replay passes; taught choices are correct on 2/2 boards, but the new-board gate fails. **Feasibility rejected; browser remains untrained.** [Verification](verification.json).
> The original preregistration and dated corrections are preserved below.

# Consequence-value readout feasibility

2026-10-10. Prospective engineering hypothesis, not a calibrated chess evaluator or biological comparator. No graph run yet.

The researcher prioritizes meaningful learned consequence evaluation. The browser still uses random initialized output 0. Prior informative gamma2 timing feedback changed memory but its absolute MBON balance still preferred a wrong action. A fixed reference-relative readout now reports `tanh((current MBON balance - unconditioned balance)/1)`. The coefficient/polarity are unchanged, no teacher label enters the decoder, and no fitting/backpropagation occurs. The output measures memory-dependent valence in arbitrary units, not win probability or centipawns. Unconditioned reference responses contain only the same public symbolic cues, fixed graph and from-scratch initialization.

The hypothesis was recorded before inspecting historical deltas. A retrospective calculation on the existing adaptive training board ranks Qh7 first under informative feedback and Qg8 first under swapped feedback; absent/disabled changes are all zero. This is a training-only feasibility observation. Original raw-readout gates remain failed. It motivates a separately preregistered test; it does not validate the new readout on unfamiliar positions or prove that subtracting an unconditioned model is biological.

Use the existing conjoined public cue, identified gamma-KC-to-MBON12 memory and PPL103 temporal stimulus planner, without changing its dynamics, bounds or equations. Teacher consequences must carry complete independently replayable mate-deadline certificates; failure means no mate within this task horizon, never a full-game loss. Every teachable experience records unaided all-legal ranking and receives informative feedback, alongside matched absent, seeded shuffled and disabled conditions. Persist memory and pending frame before acknowledging updates, archive source bytes/receipts, and preserve RSS/free-memory/heap/duty guards. Baseline summaries are bounded to the preregistered development positions; storing them is an engineering reference, not learned memory.

Predefine acquisition on the first familiar board, coexistence after a second independently verified contrast, and changed-board/support-shift probes. These are development probes within a queen-mate motif family, **not disjoint-family final tests or reasoning gates**. No final-test families are touched. A success requires correct all-legal choices, genuine memory dependence/reset/restoration and specificity versus all controls; a mere score change cannot pass. Support-shift unknown evidence yields no teaching. Biological retention/reversal and broader value calibration remain unmet.

Sources: [Aso et al. 2014](https://elifesciences.org/articles/04580) supports the general MBON ensemble/valence/action-selection motivation; primary abstract/search text accessed 2026-10-10, direct full-text access challenged. It does not support the reference subtraction formula. Existing registered [gamma2 candidate](../plasticity-timing-candidate-2026-10-09/README.md) supplies the declared physiology approximations and released mappings. Register every adaptation before graph use. [Mistake and pivot record](../../journal/experiments/2026-10-10-consequence-value-readout.md).

## Frozen launch

[Protocol](../../data/consequence-value-feasibility-v1/protocol.json), [certificate-only preflight](certificate-preflight.json), [runner](run.mjs), [archived-source full replay auditor](audit.mjs), and [224/224 software regression](full-regression.txt). Realized seed-13 matched label permutation is [3,2,1,0], reversing all four success/failure labels; no broader shuffled-control sampling claim follows. The reference-relative value retains every legal candidate; this stage prioritizes learned evaluation rather than candidate-count latency.

Run serially from the repository root, preserving original outputs and using a new directory for resume:

```powershell
node --max-old-space-size=256 research/reports/consequence-value-feasibility-v1-2026-10-10/run.mjs --protocol research/data/consequence-value-feasibility-v1/protocol.json --cpu-duty 0.5 --out runs/consequence-value-feasibility-v1
node --max-old-space-size=256 research/reports/consequence-value-feasibility-v1-2026-10-10/audit.mjs runs/consequence-value-feasibility-v1 --cpu-duty 0.5
```

No prospective result or calibrated value is claimed at launch. The full replay auditor re-executes neural feedback frames, checks all local rates, rechecks original consequence certificates and recomputes unaided/final rankings and causal reset/restoration from archived source bytes; the integrator is shared, so its biology is not independently validated.

## 2026-10-10 prior-work correction

The [already completed baseline-relative decoder test](../gamma2-relative-readout-2026-10-09/README.md) was missed during initial inspection. This study reuses that engineering readout idea; it does not originate it or provide independent model-seed replication. That report found identical direct-stimulation MBON trajectories across nominal seeds 47/48 and left seed 49 unrun. This study is one deterministic core, extends to two taught contexts and coexistence, and includes fresh within-family development probes plus causal reset/restoration. Preserve the original failed absolute rankings and prior decoder evidence.

## 2026-10-10 terminal result, replay audit pending

The run completed normally: 2,064 neural presentations, 304 feedback frames, 236.293 MiB peak RSS, 1,400.370 s wall time and 669.703 s user plus system CPU. Heap256/duty0.5 and resource guards remained active. Informative feedback uniquely selects certified Qh7 and Qf8 on the two taught boards after four lessons; absent/disabled values are tied at zero, and the realized fully reversed matched-label control prefers failures Qg8 and Qe6. The first preference survives the second contrast; this is short-run computational coexistence, not biological retention. Runner reset and exact restoration checks pass.

The **frozen feasibility gate fails**: the changed queen-origin probe chooses Qd2, a certified failure, and its best successful move ranks seventh. Raw untrained balance happens to choose certified mating Qb8 on that board; preserve this adverse comparison without selecting/blending readouts after seeing the probe. The support-broken probe has no mate-in-one action; the Qh7 value falls slightly but remains its preferred action. The registered support sensitivity gate passes only a scalar difference, not calibrated failure recognition or successful counterfactual choice. Four of five registered gates pass, but feasibilityPassed is false and the browser remains untrained. No disjoint-family transfer, calibrated value, useful general chess policy or reasoning is demonstrated.

Raw [result](../../../runs/consequence-value-feasibility-v1/result.json), [all-candidate certificate analysis](../../../runs/consequence-value-feasibility-v1/analysis.json), [analysis source](analyze.mjs), [training-only static cue coverage](cue-coverage.json), and [selected primary access record](source-access.json). The analysis rechecks all 116 legal actions through hash-verified archived checkers; tied competition rank 1 is not unique success. Full archived-source neural replay is running and must finish before independent computational acceptance.

Coverage is two White-to-move queen-versus-king mate-in-one training boards and two related development boards. No Black learned choices, multi-ply consequence learning, capture-retention behavior, natural vision, playing strength or calibrated position evaluation were tested. Existing untrained HTTP checks for both colours do not extend this learning evidence.

Recovery limitation: the new runner publishes atomic pending-memory/frame checkpoints and source/receipt identities, but this study did not inject an interruption or execute a resumed invocation. Existing storage/session regressions and the completed replay do not establish newly fault-tested recovery for this runner.

| Condition | First taught board | Second taught board | New queen-origin probe |
| --- | --- | --- | --- |
| Informative verified feedback | Qh7, success | Qf8, success | Qd2, failure |
| No feedback | Tied zero values | Tied zero values | Tied zero values |
| Seed-13 matched labels, realized fully reversed | Qg8, failure | Qe6, failure | Kf7, failure |
| Disabled plasticity, informative stimuli | Tied zero values | Tied zero values | Tied zero values |

The untrained absolute balance in the informative arm chooses Qg8/Qc5 (failures) on the taught boards and Qb8 (success) on the changed-origin probe. The table concerns the fixed relative decoder only.

## 2026-10-10 full replay completed

The archived-source replay passes all 304 feedback frames, 16 lessons, 341 receipt hashes, local rates, saved memory updates, source/map pins, unaided/final candidate rankings, certificate rechecks, wiring invariants and exact reset/restoration. It re-executes 1,961 neural presentations, with 232.855 MiB peak RSS, 1,454.579 s elapsed and 718.906 s user plus system CPU under the resource/pacing guards. The registered changed-board failure reproduces: feasibilityPassed remains false.

[Replay audit](../../../runs/consequence-value-feasibility-v1/audit.json), [artifact hashes and software verification](verification.json). This separate replay shares the original integrator/dynamics and is not an external agent sign-off or independent biological validation. Familiar association/coexistence is supported computationally in this deterministic study; general learned evaluation, biological retention/reversal, disjoint transfer and browser adoption remain unmet.

# G0 reversal history diagnostic

2026-10-13. Draft specification; not a frozen executable protocol or launched experiment. Follows the [replay-verified G0 failure](../../../runs/curriculum-g0-assay-v1-resumed5/audit.json). The original protocol, gates and failed result remain preserved.

## Question and intervention

Does persistent memory from acquisition and interference impair subsequent learning of reversed contingencies? The original informative arm reached 7/8 reversed choices but did not outperform the shuffled control. Endpoint gain clipping and a feedback-routing defect have not been demonstrated. Shuffle-label alignment and margin concentration are descriptive observations, not established causes.

Use the failed computational projection seed 20261011 for a bounded diagnostic. Run the original 32 acquisition and 16 interference experiences from scratch. At the pre-reversal boundary, copy each condition's complete physiological state into two branches. The retained branch restores that state; the reset branch restores the original from-scratch gains, KC traces, short/long response states and event counter. Both branches then receive the same 32 independently certified reversed experiences in the original order and timing. Explicit reset is a causal intervention, not a biological forgetting mechanism or a proposed mainline repair. Shared prior exposure is recorded once; both branches have identical prior experience counts.

Keep graph, annotations, mapping, local equations/constants, input projection, fixed readout and unconditioned reference unchanged. No parameter fitting, gain-limit change, added reward channel or increased reversal dose. Reset transient neural episodes consistently at the same boundaries in both branches.

## Conditions and outcomes

Each branch includes informative, absent, disabled and three separately matched shuffled conditions. Freeze shuffle seeds 20261011, 20261014 and 20261015 before execution; apply each seed throughout its own acquisition/interference/reversal history. Never select a shuffle because its resulting neural choices are weaker. Every condition receives identical public inputs, order and frame timing; only the declared feedback/plasticity intervention differs. Independently certify each informative event and record unaided rankings before feedback.

Report all eight context choices and oriented margins before and after reversal, plus the reset-versus-retained paired differences for each condition. Apply the original descriptive branch thresholds: at least 6/8 correct, at least two additional correct contexts over every control, and positive mean margin exceeding every control by epsilon 1e-8. All three shuffled controls count individually; no averaging away a stronger control.

Predeclare interpretation: reset passing while retained fails supports a history-dependent limitation in this configuration; failure in both leaves reversed acquisition/control separation unresolved; success in both calls for examination of reproducibility and the original single-shuffle condition. Improvements shared by controls do not establish informative teaching causality. Eight contexts and one projection do not support broad population or biological claims. Do not infer which memory component is responsible from a whole-memory reset.

Complete all matched diagnostic exposures even if an intermediate threshold fails, because the registered question concerns the branch comparison. This is a new diagnostic stopping contract, not a change to the original study. A resource/certificate/integrity failure stops execution and leaves outcomes incomplete. This diagnostic cannot pass G0 or authorize C01; curriculum advancement still needs an independently audited complete accepted prerequisite assay across all three effective replicas.

## Implementation and release requirements

Reuse the existing receiver, certificate, encoder, assessment, episode and atomic checkpoint helpers. Preserve the old runner; it hard-codes four conditions and three phases. Before launching, freeze a separate protocol with complete source/dependency hashes, schedule hashes, reset/retained state identities and exact branch cursor semantics. Bound to 16,000 neural presentations, sparse serial execution, heap 256 MiB, RSS 768 MiB, free memory 256 MiB and CPU duty 0.5 using consumed CPU time. Record CPU/wall/resource metrics separately; this workload is not a speed comparison.

Fixtures must verify matched exposure, complete-state reset, branch independence, unknown/no-event handling, disabled invariance, pending-receipt recovery without duplicate updates, and uninterrupted-versus-resumed equality. Run the required software checks before graph use. The separate auditor must replay certificates, every neural/local update, branch/reset transitions, fixed wiring and rankings. Do not treat serialized snapshots alone as successful retention or learning.

This is a researcher engineering hypothesis derived from the failed run, not a new externally sourced biological solution. Record the hypothesis and intervention in the source-to-solution register before experimental use. Implementation, frozen registration, fixture validation and graph execution are outstanding.

2026-10-13 implementation update: [schedule builder](../../../.codebase/src/neural-learning/g0-reversal-history-diagnostic.mjs) constructs 24 stages and 672 teaching episodes with explicit stage-entry memory interventions. Seven targeted tests passed, covering certified/matched schedules and branch object isolation plus the existing G0 unknown, binding, pending-frame and disabled-state checks. The schedule does not execute memory resets. Runner, branch recovery, independent auditor, frozen registration and graph execution remain outstanding.

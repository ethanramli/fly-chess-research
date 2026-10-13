# Correction-preservation v2 protocol specification

Status: protocol design only. Do not run the graph until the runner, independent auditor, and recovery validation are frozen and hash-pinned.

## Question and scope

Does a four-event, context-balanced feedback schedule produce more selective choice change than (a) the same verified events with no external channel, (b) a count-balanced channel whose labels are swapped within move identity, and (c) the same informative channel with plasticity disabled? Does score-blind matched sampling perform differently from targeting the most-negative training margin plus its weakest positive preservation sentinel?

This is a narrow, one-seed mechanism screen on two candidate moves and one-ply capture-retention certificates. It does not test strategic chess quality, all-legal choice, delayed biological retention, unfamiliar transfer, or general reasoning. No result from it may be called an 8/10 outcome.

## Frozen inputs and arms

Use the existing correction-preservation-schedules-v2/schedules.json and its manifest without editing them. The selected schedule is tr-06 (target) plus tr-03 (preservation sentinel); the score-blind matched schedule is tr-05 plus tr-02. Both have the same four-event sequence, move frequencies, outcome counts, and number of contexts. Verify each embedded certificate against the pinned training records before freezing.

Run each schedule from the same scratch state under four arms, for eight serial runs total:

- informative: deliver the certificate-matched channel for each event.
- no-channel: deliver no external stimulation; keep the existing activity-driven plasticity active.
- shuffled: retain certificate truth in the receipt but swap delivered success/failure labels within each move identity. This yields two positive and two negative pulses and preserves one of each channel per move.
- disabled: deliver the informative channel while disabling persistent plasticity updates.

Do not describe no-channel as no plasticity. Do not infer the teacher's certificate or explanation is available to the neural learner; record separately the verified evidence and the actual cue/channel delivered.

Use one predeclared encoder only: bound-ray, pinned to the v1 protocol identity. Do not compare encoders in this screen. Keep learner equations, mapped cells, graph, readout, cue implementation, pulse amplitude, order, and event count unchanged. The only between-run factors are schedule identity and declared feedback condition.

## Assessment and metrics

Before the first event, assess all eight training and four validation panels from scratch. Before every teaching event, re-assess the event's panel using the current memory and bind that unaided ranking, tie status, assessed move set, and memory hash into the receipt. Verify the exact board/history, actor, action, task, certificate hash, proof status, and proof resource result. Unknown, stale, mismatched, incomplete, or exhausted proof produces no event and aborts the frozen run rather than silently reducing its denominator.

After the final event, assess the same 8 training and 4 validation panels at that memory. Record each candidate score, success-minus-failure margin, actual choice, tie, and error status. Report tr-06 correction and tr-03 preservation separately, all 12 panel changes, informative-minus-no-channel differences, informative-minus-shuffled differences, and informative-minus-disabled differences. Treat the selected-versus-score-blind schedule contrast as descriptive only: the positions differ and there is one schedule per policy, so it cannot estimate policy superiority. Report each schedule panel separately; do not pool outcomes as if the positions were identical.

Primary descriptive outcomes:
1. Target changes from wrong to right on tr-06.
2. Sentinel remains right on tr-03.
3. No new pairwise regression appears among the other inspected train or validation panels.
4. The target margin improvement exceeds matched control drift; report absolute score changes and common-mode shifts so a larger score is not mistaken for better discrimination.

These are preregistered screen criteria, not a general learning gate. Candidate-pair scores cannot support an all-legal claim. No checkpoint selection, tuning, final-family access, or claim of transferable reasoning is permitted.

## Receipt, persistence, and recovery contract

Every event receipt must include protocol, schedule, condition and event identities; exact board/history/action/task; independently checked certificate and scope; pre-feedback ranking and memory identity; verified consequence truth; actual delivered channel; plasticity-enabled flag; neural cue identity; local update evidence; before/after memory hashes; and presentation counters. Preserve teacher-side evidence and neural delivery as separate fields.

Publish updated memory plus pending receipt atomically before acknowledging the event. Resume only from the latest completed publication, acknowledge an existing pending receipt without presenting it again, and preserve input hashes, seed, schedule and algorithm identities. The independent audit must replay every certificate and local recurrence, match every receipt to its scheduled event and pre-feedback assessment, validate all four control semantics, verify memory continuity and prove no duplicated presentations across recovery.

Prepare a copied pending-receipt interruption fixture from a completed v2 run and independently verify exact resume. This fixture demonstrates software recovery only; it is not a historical crash or learning evidence.

## Resource and execution limits

Run serially, with node --max-old-space-size=256, --cpu-duty 0.5, RSS at or below 768 MiB, and at least 256 MiB free system memory. Check authoritative process state immediately before graph use. Measure full invocation wall/CPU time and peak RSS separately from baseline assessments, event assessments, neural presentations, checkpoint publication, and independent audit. Stop on a guard failure and resume into a new output directory from the latest published checkpoint; never overwrite prior evidence.

## Freeze checklist

Before any graph run, archive and hash the new runner, independent auditor, recovery tools, protocol, schedule bytes and manifest, train/validation data, graph/annotation/mapping, model/readout/encoder/memory implementations, dependency identities, and required prerequisite audit reports. Preflight must prove all identities and certificates, expected 4 events, 2 positive/2 negative informative pulses, 2 positive/2 negative shuffled pulses, identical event order across arms, zero final-family reads, and zero graph inference during preflight.

The source-to-solution register already covers the feedback-quality review and the researcher-directed correction-preservation curriculum. This protocol is an engineering design derived from that registered material; it adds no biological claim or external algorithm.

## Interpretation boundary

An immediate post-run repeat, reset, and restoration can verify state identity and causal dependence on the stored memory. It cannot establish biological retention. A later retention study needs a separately justified and frozen mechanism/time course, fresh disjoint panels, matched controls, and independent counterfactual evaluation. This protocol alone cannot establish multi-ply reasoning or transferable chess choices.


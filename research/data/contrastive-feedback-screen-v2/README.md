# Contrastive feedback screen v2

Separate frozen follow-up to v1. The teacher-search forcing-prior mix is 0.5 instead of 0; graph, learner, inputs, controls, feedback budget and unaided measurements are otherwise preserved. Each variant's informative experiences are replayed exactly into its controls.

The experience sequence can change when search chooses a different action. V1 selected and punished the top failing neural action; v2 selected the successful `c4g8` and paired it with verified failing anchor `h6f7`. Consequently this is a changed teacher policy and experience-selection experiment, not a pure same-exposure comparison of learning outcomes. Success during search cannot establish acquisition when baseline and disabled controls already succeed under that search prior.

Run from the repository root using the versioned train/audit entry points, 256 MiB heap, 50% duty and the declared RSS/free-memory guards. Keep v1's protocol and sources intact.

The terminal result and corrective audit are documented in [the run report](../../reports/contrastive-feedback-screen-v2-2026-10-07/README.md).

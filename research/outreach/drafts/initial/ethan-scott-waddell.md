# Ethan Ramli to Scott Waddell

Status: Sent from Ethan's school Gmail account on 2026-10-01. Gmail message ID: `1a0f72d7cb015e70`. Primary contact.

## Subject

Student mentorship inquiry: dopamine-driven learning in a fly brain model

## Email

Dear Professor Waddell,

I'm Ethan Ramli, a 16-year-old Singaporean high-school student in Jakarta. I love chess, and discovering the public fly connectome prompted a question: could a model constrained by such a small brain learn to make useful chess decisions?

Your group's work on re-evaluating learned information caught my attention, particularly how distinct dopamine circuits participate in extinction and reconsolidation. How feedback changes future choices is the part of this project where I most need scientific guidance.

My aim is to preserve the connectome's wiring and let experience change synaptic efficacy through a biologically supported dopamine mechanism. The current project includes a simplified mushroom-body association prototype. Rewarded preference strengthened across six runs, but only three selected the newly rewarded cue after reversal. The biological mechanism remains unvalidated, and the chess component currently records feedback without applying learning.

I have no research adviser and hope to develop this into a publishable study. Would you be open to occasional ongoing mentorship, focused initially on whether the reinforcement mechanism and reversal experiments are defensible? I want to take responsibility for the implementation and experiments, with guidance on the biological assumptions and controls.

If you would consider it, may I send a one-page methods summary as a starting point?

Thank you for your time,
Ethan Ramli
High-school student | Jakarta, Indonesia

## Personalization and evidence notes — not part of the email

- Ethan supplied the chess origin, age, nationality, location, absence of an adviser, publication ambition, and wish to remain the main contributor. School, grade, programming authorship, and a public repository URL have not been supplied; none is invented.
- The opening states a question about a model, not evidence of a biological fly's chess capacity. A public connectome is a wiring map, not an open-sourced functioning brain.
- [Felsenberg et al., 2017, Re-evaluation of learned information in Drosophila](https://ora.ox.ac.uk/objects/uuid%3A0960ef7d-66b1-4ebe-b818-6e6f58c1e1ec): Oxford's primary manuscript record supports the distinction between extinction and reconsolidation and recruitment of distinct dopaminergic circuits. This is a motivation for consultation, not a prescribed correction to the gamma4 model. The email does not claim Ethan has read the complete paper.
- Current source inspection: [Gamma4Memory](../../../../.codebase/src/lowram/mushroom-body.mjs) updates local gains and applies them to edge magnitudes. Fixed topology does not mean all physiological parameters are fixed. The rule is an unfitted approximation, not established biochemical dopamine signaling.
- [V2 report](../../../../archive/early-development/research/reports/association-validation-v2-2026-09-30/report.json) records six positive acquisition effects, three correct final reversal choices, and a failed overall gate. These are synthetic cue seeds on one graph, not six biological flies. [Puzzle receiver](../../../../.codebase/src/lowram/puzzle-round.mjs) reports learningApplied: false.
- The existing dossier lists scott.waddell@dpag.ox.ac.uk. The [Oxford profile](https://www.dpag.ox.ac.uk/team/scott-waddell) returned HTTP 403 during this refresh, so the address is not newly verified for sending.
- eLife is Ethan's aspirational venue. The email expresses publication ambition without implying the present results meet that journal's requirements or that mentorship guarantees publication.

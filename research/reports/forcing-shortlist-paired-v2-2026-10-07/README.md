# Forcing shortlist paired profile — superseded summary field

This run repeated all-legal and shortlist assessments twice in ABBA order. Its timing and choice rows are preserved, but the successful-move coverage boolean is wrong: the report compared chess move objects to UCI strings. The candidate list includes `c4g8`, but do not rely on the faulty coverage field. The corrected v3 harness converts moves to UCI and asserts coverage before publishing; see the [corrected report](../forcing-shortlist-paired-v3-2026-10-07/README.md).

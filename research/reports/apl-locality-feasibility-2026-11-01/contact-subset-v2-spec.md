# Test the compact-root serialization hypothesis before rejecting source counts

2026-11-01, before v2 extraction. Preserve [v1 specification](contact-subset-spec.md), source/config/raw output and its invalid negative interpretation. V1 discarded rows with missing literal root fields, so it did not test a complete contact table. The bounded first-30-row inspection established repeated blank root fields; it did not establish that their contacts were absent.

V2 tests one global, label-independent decoding hypothesis: an empty root field repeats that column's most recent populated root ID. Both initial identifiers must be present, all expanded values must be integer strings, and no root is converted through floating point. Apply this to **every** CSV row before selecting any anatomical pair. This is an explicit serialization hypothesis inferred from raw structure, not a verified historical export script. No geometric semantics are inferred from it.

Acceptance remains complete independent reconciliation of every one of the 10,343 retained ordered pairs and all 215,419 expected contacts, with the cached source counts unchanged. Any mismatch rejects this decoder's compatibility; no pair-specific fill rules, missing-row repairs, pruning, threshold tuning or selective acceptance are allowed. Publish blank-field frequencies and all mismatches. Preserve exact source-row numbers and original xyz strings.

All v1 data/resource/immutability gates remain. Add self-checks for complete, both-empty and one-empty change markers, plus rejection of an unresolved first identifier. Fresh v2 source/config/output; no new graph, learner update or confirmation access. Count agreement can verify the selected subset operationally, not APL-side coordinate semantics or biological locality.

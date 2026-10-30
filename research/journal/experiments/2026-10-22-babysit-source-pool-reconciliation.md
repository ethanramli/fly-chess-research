# 2026-10-22 - babysit source-pool reconciliation

## Finding

The older registered matched-capture source job is no longer live. Its action status had no owned process, but the published output and independent audit were present. The observer log ends with successful curation: 44 training candidates selected, 0 validation/final candidates. The separate source audit reports `sourceChecksPassed:true` and `finalSplitInspected:false`.

The training PGN batch manifest binds all 44 candidate source games. The lesson preparation manifest and audit report 44/44 Stage 1 domain-eligible lessons and zero unknown actions, all in training. Hashes at reconciliation:

- Candidate manifest: `a639d50c8d58bbfba7746c7cb63af5fe86187e149e62c12abc988df56aea25d7`
- Source audit: `17fb76171a03c73593c01ef49a38cafc8c237e5e17b27e8ffb2b51662c0f9d81`
- PGN batch manifest: `1bff4d0538a8cb8061558851364d94a02e8127df44c86fc107461b6abc26419c`
- Prepared lesson manifest: `c2a37a7985e8d26a7df322e38fdad4c5dd6ab7dc391d86f4182e49b508173cbc`
- Lesson audit: `621b5e40286bf4a8f934c776b8742ab1aefeadd4f3c7a29cfe48a074574e7305`

## Limits and next step

This is stronger training-source material, not an executable learner registration. It has no validation rows, no relation-family disjointness, and both lesson/source audits deny graph launch. The separate v7 batch remains useful for validation candidates but does not yet establish family separation. Final rows were not opened. No graph, Stockfish teaching run, or G0 work occurred.

Next: develop and independently audit relation families across the training and validation pools, expanding validation candidates as needed while keeping final content sealed. Keep the campaign closed until those audits and all other frozen prerequisites pass.

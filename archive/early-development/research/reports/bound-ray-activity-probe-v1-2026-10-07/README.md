# Bound-ray read-only activity screen

This screen tested whether the new bound-ray input reaches activity and the existing MBON choice score before adding learning. It compared the frozen relational v3 cue with bound-ray on the 8 training and 4 validation panels only. It made 48 graph presentations from one common scratch initialization. It did not open final-family files, deliver feedback, update memory, run search, or train.

The frozen protocol is [protocol.json](../../data/bound-ray-activity-probe-v1/protocol.json), SHA-256 `336f2f0759c4014fef053cb700bdb5ac0e533d8d1dfb21dabde89b35b4d4f399`. Its [source archive](../../source-archives/bound-ray-activity-probe-v1/manifest.json) contains 23 hash-checked inputs and sources. The raw [activity/readout report](report.json) has SHA-256 `a37f3ce627d69bd204fda81ce5df36cb89582fd6a5b76749c08cc8a0bfc17ddd`; the [independent replay audit](audit.json) passes all 12 panels and reproduces every graph readout exactly. Publication markers bind both files to the protocol.

| Split | Cue | Correct candidate ranked first | Mean success-minus-failure margin |
|---|---|---:|---:|
| Training | Relational v3 | 4/8 | +0.0010353 |
| Training | Bound-ray | 4/8 | +0.0010898 |
| Validation | Relational v3 | 3/4 | +0.0010361 |
| Validation | Bound-ray | 2/4 | -0.0000731 |

All 246 selected bound-ray relation-token entries showed positive endpoint KC excess activity. Bound-ray also changed every candidate's fixed MBON score, but selected `a1a4` on every training panel. Its small positive training mean does not mean it learned the relation; it was correct on only the first four panels and wrong on the last four. On validation it ranked one fewer pair correctly than v3, and its mean margin was negative.

This localizes the immediate problem more precisely: relation input is present and reaches active mapped KC cells, but the untrained fixed readout does not robustly map it to the consequence-dependent choice. This does not show that learning cannot change the mapping. No plasticity, feedback, acquisition, retention, counterfactual transfer, Monte Carlo reasoning, or improvement per experience was tested. It is one deterministic circuit and a small development screen; the validation rows are now inspected and cannot be final evidence.

Resources for the main probe: 14.28 seconds wall, 6.28 seconds graph-forward CPU, 111.1 MiB peak RSS, and 1.16 GiB free system memory at completion. The independent replay used the same graph sequentially, reproduced exact MBON outputs, and confirms zero plastic updates and unchanged memory. These are workload measurements, not a training speed claim.

Next, keep this cue and the existing rule/readout fixed and test one verified feedback pass against absent, shuffled and disabled-plasticity controls on training examples, using validation only as development evidence. Do not add another input variant or scale repetitions based on this result. Any selection or apparent transfer here requires a new, untouched final family before it can support the minimal learned-transfer milestone. The full puzzle/Monte Carlo reasoning objective remains much broader.

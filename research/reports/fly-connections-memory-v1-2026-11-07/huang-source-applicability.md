# Huang 2024: a source access gap partly resolved

2026-11-07. Volume 2, chapters 3 and 5. Targeted primary-source investigation, assisted by Codex. No manuscript, neural model, parameter fit, experiment or outside-provider writing task was run.

## Limits before findings

The equation supplement remains unread: the publisher PDF request failed. The new source is the **authors' actual model code**, linked by the paper's Code Availability statement, not a reconstruction from its figure caption. This resolves access to an executable specification; it does not verify supplement equation 5.20 against the publication, justify a PAM08 transplant, or demonstrate memory repair. Do not replace the preserved 2026-11-01 no-go with an unqualified pass.

Primary sources: [paper](https://www.nature.com/articles/s41586-024-07819-w), [pinned author repository](https://github.com/schnitzer-lab/Luo_Huang_2024_MB_model/tree/5d7c08a9a88f923169a0c3008aca68af421e9a7f). Actual coverage: paper model/Outlook/code-availability text; complete 7,648-byte core MATLAB model and complete protocol, parameter-unpacking and README files. Fitted `.mat` parameter files, fitting code, all figure scripts, primary raw voltage traces and supplementary PDF are not loaded/read/run. [Raw files and identity receipt](source-evidence/access.json).

## What the code establishes

The model explicitly evolves KC-to-MBON efficacy changes, has a post-training decay-regime switch and includes DAN/MBON feedback in the teaching drive. It is a genuine source path for examining interaction of short- and long-term memories. The source code and paper concern specific PPL1 gamma1/alpha2/alpha3 modules, not the PAM08 gamma4 condition proposed here.

The implementation uses signed changes relative to a reference firing state. Its effective KC-to-MBON connections may become negative, with a comment invoking combined parallel inhibitory/DPM effects. That is a coarse effective connection, not permission to reverse a released excitatory fly synapse. Directly copying this implementation would violate this project's fixed-sign contract. A sign-preserving adaptation would be a new model requiring its own source argument and test; clipping the source model silently would not be replication.

The slow-retention decay regime is selected in relation to the last training session. This is part of the authors' assay-level model and cannot be presented as an autonomous synapse detecting the last lesson or anticipating future practice. It needs an explicit implementation/physiology boundary if considered for continual learning.

No fitted source weights are imported: doing so would conflict with initialization from scratch. The anatomical masks, rate baseline, parameter applicability, timing-to-model conversion, and interaction with the released full graph remain unresolved. Neither source acquisition nor a fit to the authors' odor data proves chess retention, correction, capacity or P3.

## Availability and licensing correction

The repository README explicitly gives GPL-3.0-or-later permission. A secondary search result described the repository as unlicensed; the primary README supersedes that claim. The four retained text files match the Git blob IDs at commit `5d7c08a9a88f923169a0c3008aca68af421e9a7f` and have separately recorded SHA-256 digests. They are preserved for inspection, with the README notice, and are not installed as project code.

Next: assess the exact source rule and circuit mapping if a proposal requires this mechanism. The currently pending APL/Gkanias design review remains a separate decision. This source find prevents declaring the mechanism list exhausted merely because the supplement host was unavailable.

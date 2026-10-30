# C01 open-defender development candidates v1

Exploratory training-development positions only. Outcomes were inspected during construction; these positions must never enter validation or final evaluation. They are not frozen curriculum families or evidence of learning.

The package contains two file-reflected structural families. Each has two six-piece positions with the same material, queen, two pawn targets and probe captures; only the black rook defender's square changes. The open rook line makes one probe fail by immediate recapture and leaves the other successful; the counterfactual position reverses both probe outcomes. Each board also includes independently checked evidence for every legal action.

Run `generate.mjs` once to publish the raw candidate and source-pinned verification. `audit.mjs` replays all legal certificates and the all-legal cue bounds under three frozen projections. These static checks do not run a connectome or establish learning. Do not reuse the inspected positions as validation/final data.
## 2026-10-12 classification correction

The original package verification reports two geometry layouts, not two independent structural families. The d-file layout is the file reflection of the e-file layout, so these four boards form **one** structural family with two counterfactual pairs. A separate correction check confirms that each counterfactual pair changes only the black rook square and that the two layouts are file-reflections. Preserve the original verification/audit records; use `family-structure-correction.json` for the corrected family count. The package remains inspected training-development material only.

# Monte Carlo neural iteration profile — superseded timing

This first diagnostic used the full connectome and correctly bounded search, but its elapsed-time measurement is invalid for comparison: the harness passed 50% pacing both to each neural presentation and again to the whole Monte Carlo evaluation. The actual acquisition runner paces neural presentations and leaves search-level pacing at its no-op default.

The raw report is preserved to document the mistake. Do not use its elapsed or CPU rates as representative. The corrected run is [v2](../monte-carlo-neural-profile-v2-2026-10-07/README.md).

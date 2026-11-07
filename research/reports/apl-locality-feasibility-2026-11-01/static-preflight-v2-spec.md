# Static APL prerequisite, v2 path correction

2026-11-01, before v2. Preserve [v1 specification](static-preflight-spec.md), source/config and its terminal failure. V1 failed before output creation because its Windows relative-path keys used backslashes and the graph pin assertion used forward slashes. No anatomical assertion or learner experiment ran.

V2 changes only manifest path keys to `Path.as_posix()` and adds a self-check for the actual graph relative path. Retain all v1 scientific checks, resource bounds and root/edge definitions. Run the corrected action into fresh `apl-locality-static-v2`. This is static source reconciliation, not biological memory evidence.

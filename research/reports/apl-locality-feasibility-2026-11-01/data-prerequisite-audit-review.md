# Independent data-prerequisite audit

2026-11-01. Same-provider native auditor; no outside AI or learner execution.

## Verdict

**The selected-contact, static-count and finite coordinate-semantics checks pass. Exact APL-side contact geometry remains unavailable.** The independent fresh full-source rescan is incomplete and must not be reported as a pass. Machine-readable results are in [data-prerequisite-audit.json](data-prerequisite-audit.json); the [standalone checker](audit-data-prerequisite.py) imports no parent action modules.

1. Fresh complete-byte SHA-256, MD5 and size checks match the generation-pinned 316,819,225-byte lite source. All producer manifest pins and output hashes checked before and after. Gzip CRC/EOF remains the preserved acquisition receipt's evidence; this successful audit does not independently repeat a full gzip pass.
2. Every retained pair was independently reconstructed from sparse graph arrays and annotation-defined KC/APL membership. All 10,343 pair identities, graph weights, signs and root/index joins match; every pair also matches an independent streamed aggregate-source count. All 215,419 selected CSV rows were streamed, counted per pair, checked for exact ASCII root strings, finite coordinates and strictly increasing valid logical source-row indices. The successful audit does not claim full raw-row-to-subset correspondence.
3. The first 10,000 raw source rows decode identically with scalar and streaming implementations. Explicit checks cover unresolved leading nulls, literal `null`, non-ASCII/decimal root markers and an entirely null batch with carried state. Root IDs never pass through floating point. Independent forward-fill remains an operationally supported serialization hypothesis, rather than a recovered historical export script.
4. All 65,536 saved canonical sample rows were read; all 196 APL-involving rows were considered. All 126 retained-pair records, spanning 125 pairs, independently match only the exact component-wise midpoint under Decimal arithmetic. Canonical IDs, endpoints, scores, matching source-row lists and endpoint separations agree with the saved result. All saved match-definition labels are `midpoint`. This is finite sample correspondence, not proof of every contact's endpoint geometry or of the exact lite-export pipeline.
5. Range-receipt arithmetic agrees with 12 requests and 1,770,575 transferred bytes. Those payloads were not refetched; the canonical whole-file MD5 is provider metadata, not a locally verified checksum. Both saved APL skeletons were independently rehashed and match their recorded identities (`7c425760…` right; `8d782201…` left); their structural summaries were read, not independently reparsed by this checker.

The successful audit took **106.245 s**, with **160.082 MiB peak observed RSS** and **6404.176 MiB minimum observed free memory**. Limits remained 180 s, 2048 MiB RSS and 256 MiB free memory. No network, graph propagation, learner update, external AI call or parallel worker was used. Resource values are sampled observations.

## Interpretation and remaining gate

The producer's complete 34,156,320-row scan and the independent complete selected-data checks support retained-pair count compatibility. V1's literal-empty-root source rejection was invalid; v2's elapsed-guard failure did not certify completeness. Both remain preserved. The unchanged all-pair acceptance criterion, fixed sample selection and lack of pair-specific repair reduce the opportunity for selective acceptance; they do not supply missing canonical coverage.

Neither one per-neuron position nor the sampled contact midpoints identify the required APL-side endpoints. A midpoint can project to the wrong APL branch; a connected mesh-derived skeleton and matching contact counts do not bound that error. No contact-to-arbor residual/ambiguity audit, contact-to-contact path-distance result, locality physiology, biological retention or useful memory benefit follows. A later midpoint-proxy condition must declare its approximation and attachment/branch uncertainty; an exact-endpoint claim requires a complete matched canonical APL contact subset.

Re-run from the repository root with a fresh output name:

```powershell
& 'C:\Users\ethan\.t3\scratch\2026-10-31-review-this-proposal-critically-against-c96c5e5c\.venv\Scripts\python.exe' 'research/reports/apl-locality-feasibility-2026-11-01/audit-data-prerequisite.py' --out 'research/reports/apl-locality-feasibility-2026-11-01/data-prerequisite-audit-repeat.json'
```

## Documentation finding

The access note's opening decision predates the successful v3 extraction and fixed-sample midpoint comparison. Preserve the dated access findings and v1 correction, but make the current summary explicit: complete selected-count compatibility passes; finite sample midpoint semantics passes; complete endpoint geometry and attachment remain unresolved. The initial v1 incompatibility sentence must not be quoted without its withdrawal. Parent-owned navigation/status updates are outside this auditor's changes.

## Auditor implementation correction

The first standalone invocation failed before any input parsing because the existing PyArrow review environment does not contain NumPy (`ModuleNotFoundError: No module named 'numpy'`). The audit had incorrectly assumed both installed packages shared an environment. This failure produces no data-integrity conclusion. Replace the NumPy-only static-array reading with bounded standard-library NPZ/NPY parsing; do not install a dependency or change the source artifacts. The next check is the corrected standalone invocation with the same limits.

The second invocation reached the 10,000-row cross-batch check, then rejected an all-empty marker batch despite an available previous root. Its independent validation incorrectly treated Arrow's `all(empty)` null reduction as false. This was an auditor parser error, not a failure of the preserved v3 decoder. The replacement skips marker-regex reduction only when there are no populated markers and still requires resolved expanded roots. An explicit all-null-with-carry check was added; unresolved leading null and populated literal `null`, decimal and non-ASCII markers must still fail. No full-source audit conclusion follows from this failed invocation. Next run the corrected audit at unchanged limits.

The corrected fresh complete-source audit reached its original elapsed guard at 180.654109 seconds, with 184.371094 MiB RSS and 6151.183594 MiB free. It had not completed the source scan, so its comparisons do not certify full-source row coverage. The exact failed checker is preserved as [audit-data-prerequisite-full-rescan-failed-v1.py](audit-data-prerequisite-full-rescan-failed-v1.py). The audit scope changes to the complete selected CSV, static graph/aggregate weights, byte hashes, first-10,000-row decoding and exact canonical-sample arithmetic. This does not raise resource bounds or repeat the full-source attempt. Full-source row count remains evidence from the preserved v3 producer run.

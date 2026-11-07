# Canonical endpoint-data probe without a whole-brain download

2026-11-01, before this probe. The public, versioned Zenodo record 10676866 lists `flywire_synapses_783.feather`, 9,492,998,242 bytes, provider MD5 `f8f1b97c9d4b0ea9b4c8b287f6b99091`. A bounded HTTP range already verified the Arrow footer magic. The full object's checksum is metadata, not a locally verified full-file hash.

Use the already installed review environment's PyArrow 26.0.0 to read schema/footer and at most the first record batch, projecting only root IDs, point positions, synapse identity and cleft score. Keep public request ranges/headers and per-range SHA-256. Bound network reads to 32 MiB total, 8 MiB per request, 24 requests, 90 seconds, 20-second socket timeout, 2048 MiB RSS / 256 MiB free system memory. Reject a range-ignoring server before reading its whole body. No credential, package installation, graph run or final-family access.

Preserve schema even if the first batch exceeds the cap. This deterministic first-batch sample is a data-semantics probe, not complete APL coverage or a filterable source witness. Do not select a favorable batch after observing content, infer full source hashes from partial reads, or substitute a sample for the full anatomical subset. Any later comparison with the lite export must state its exact finite coverage.

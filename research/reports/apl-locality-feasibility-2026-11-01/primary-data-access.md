# FlyWire v783 APL locality: primary-data access

**Parent continuation addendum, 2026-11-01, after the access-only role finished:** the generation-pinned lite object has since been acquired in full and verified against its provider MD5. After correcting compact blank-root serialization, all215,419retained KC/APL contacts on10,343pairs reconcile. The fixed canonical first batch was acquired with bounded byte ranges, and all126retained-pair records match lite midpoints only. [Current result and preserved parser failures](README.md). The access role's original coverage/decision below remains its dated scope; full canonical APL-side endpoint coverage and attachment/physiology validation are still missing.

Access checked 2026-11-01, approximately 11:18–11:25 UTC. Scope: public primary sources, small metadata/range requests, and the two individual APL skeletons. No graph simulation, learner change, package installation, credential lookup/use, or whole-brain contact-table download was performed.

## Decision

**The two same-specimen, same-release APL skeletons are publicly available and have been acquired. The required contact data also exist publicly, but a complete, provider-matched APL contact subset with documented coordinate-side semantics has not yet been acquired. Exact contact-to-contact path-distance reproduction is therefore not ready.** Amin's hemibrain geometry cannot fill that gap: it is a different specimen and segmentation.

The smallest available no-credential bulk candidate is a 316,819,225-byte Codex root-paired coordinate CSV, far smaller than the 2.7 GB Princeton table. Its historical object date strongly supports original Buhmann provenance, but the checked public sources do not establish its precise export filters or whether its single coordinate is the pre-, post-, or centre location. A full pair-count reconciliation can establish count compatibility with the frozen graph; it cannot establish that missing coordinate semantics. This is a data prerequisite, not evidence that a local-inhibition mechanism repairs learning.

## Acquired APL skeletons

The [official fafbseg implementation](https://github.com/navis-org/fafbseg-py/blob/master/fafbseg/flywire/skeletonize.py) supplies a v783 precomputed-skeleton service, an identity transform, one float32 radius attribute, and sets returned units to 1 nm. It explicitly separates 630 and 783 roots. Each URL below returned HTTP 200 without authentication:

| APL root | Public URL | Complete bytes | SHA-256 |
|---|---|---:|---|
| Right `720575940613583001` | `https://flyem.mrc-lmb.cam.ac.uk/flyconnectome/flywire_skeletons_783/720575940613583001` | 3,402,720 | `7c4257602da0b3cda3c23192ffb26f70623bb5a84dd3919ec44dc10e9fb7bcfc` |
| Left `720575940624547622` | `https://flyem.mrc-lmb.cam.ac.uk/flyconnectome/flywire_skeletons_783/720575940624547622` | 3,284,352 | `8d7822018308ffa96361171d2eab49909f9611142197712d5a23da1925e82399` |

Raw binaries, access receipts and structure summaries are in [source-evidence](source-evidence/). Parsing the published binary layout with Python stdlib found 141,780 vertices/141,779 edges on the right and 136,848/136,847 on the left. Each is one connected, acyclic graph; coordinates are finite and byte lengths match the declared vertices, edges and radii. This validates file structure, not biological reconstruction accuracy or synapse registration.

Right/left radius-zero counts are 7,490/6,902. Zero radii need explicit handling before any radius-weighted electrotonic analysis. They do not prevent ordinary cable-path distances or Amin's separately reported uniform-radius variant. These are mesh-derived skeletons: a connected tree does not establish that every healed branch or omitted twig is anatomically correct.

The [Schlegel author deposit](https://zenodo.org/records/10877326) separately publishes `sk_lod1_783_healed_ds2.parquet` (5.4 GB), describing native nanometre coordinates, v783 roots, LOD1 meshes and 2× downsampling. It was not downloaded. The checked sources do not prove bitwise identity between that downsampled archive and the individual service binaries; preserve their separate identities.

## Contact products and access

The [Codex source loader](https://github.com/murthylab/codex/blob/main/codex/data/local_data_loader.py) identifies the public raw-object base `https://storage.googleapis.com/flywire-data/codex/data/fafb/{version}/`. This run verified the following v783 objects directly, without a cookie or token:

| Product below that base | HEAD result | Content length | Checked coverage |
|---|---:|---:|---|
| `synapse_coordinates.csv.gz` | 200 | 316,819,225 | First 65,536 compressed bytes, GET 206; decoded header/sample only |
| `fafb_v783_princeton_synapse_table.csv.gz` | 200 | 2,695,106,039 | First 65,536 compressed bytes, GET 206; decoded header/sample only |
| `connections_no_threshold.csv.gz` | 200 | 212,093,967 | HEAD only; aggregate connections, not contact geometry |

The lite coordinate CSV has `pre_root_id,post_root_id,x,y,z`. The Princeton CSV has `pre_x,pre_y,pre_z,ctr_x,ctr_y,ctr_z,post_x,post_y,post_z,size,pre_root_id_720575940,post_root_id_720575940,neuropil`; observed root columns contain suffixes and require restoring the fixed `720575940` prefix. Do not read any full root ID as float or JavaScript Number. Prefix hashes in receipts describe only the downloaded prefixes, never the complete large objects.

The lite object's [public GCS metadata](https://storage.googleapis.com/storage/v1/b/flywire-data/o/codex%2Fdata%2Ffafb%2F783%2Fsynapse_coordinates.csv.gz) pins generation `1733428450553759`, created/updated `2024-12-05T19:54:10.593Z`, size above, provider MD5 base64 `nKST4jFMwDqviwPoDxZD6A==`. A generation-pinned acquisition URL is:

`https://storage.googleapis.com/flywire-data/codex/data/fafb/783/synapse_coordinates.csv.gz?generation=1733428450553759`

This URL form is proposed from GCS versioning semantics; the bounded range probe used the unqualified object and recorded its returned generation. A later acquisition should require the pinned generation and verify the complete provider checksum. The object has no explanatory custom metadata beyond a file modification timestamp. No primary documentation of root sorting, region sorting, a root index, or row-range lookup was found in the checked Codex loader/catalog, FAQ, GCS metadata, fafbseg code, or Zenodo records. HTTP byte ranges alone do not make a gzip CSV root-queryable.

### Original provider versus Princeton

[Codex's official credit page](https://codex.flywire.ai/about_flywire) says original pre-July-2025 synapses came from Buhmann/Heinrich, while current predictions use Yu et al. The lite object's 2024 creation time supports a **Buhmann provenance inference**; this is not an observed export pipeline. The author's [OpticLobe code](https://github.com/hsseung/OpticLobe.jl/blob/main/src/weightmatrix.jl) independently treats Buhmann and Princeton as separate data sources, with different total counts. Retaining v783 segmentation alone is insufficient to match providers.

The canonical [FlyWire Consortium v783 deposit](https://zenodo.org/records/10676866) explicitly publishes `flywire_synapses_783.feather` (9,492,998,242 bytes, provider MD5 `f8f1b97c9d4b0ea9b4c8b287f6b99091`) with synapse ID, both root IDs, both endpoint coordinates in nm, scores and neuropil. It names Buhmann detection and Heinrich clefts. Its aggregate `proofread_connections_783.feather` has one row per root pair and neuropil with at least one contact. Neither was downloaded.

[Dorkenwald's primary Methods, “Synaptic connections”](https://www.nature.com/articles/s41586-024-07558-y) specifies exclusion of unassigned endpoints and scores ≤50; duplicate removal uses the same ordered root pair and presynaptic locations within 100 nm. Coordinates were transformed from FAFB14 to FlyWire FAFB14.1. The five-contact neuron-pair display/analysis threshold is a separate decision. Preserve individual pre→post links; these counts do not represent unique T-bars or one aggregate edge. Neither the lite header nor a matched aggregate count proves that all these cleaning conventions were applied identically.

## Credential-gated selective route

[Official fafbseg synapse code](https://github.com/navis-org/fafbseg-py/blob/master/fafbseg/flywire/synapses.py) queries CAVE view `valid_synapses_nt_np_v6` for filtered original synapses, at an explicit materialization. Its defaults can drop autapses, root zero and, when attaching to skeletons, contacts over 10 µm away. Those are extra transformations: preserve the raw contact query and report any exclusions separately. Its root-checking `auto`/`latest` modes must not replace explicit materialization 783.

[CAVEclient's documented selective queries](https://www.caveconnecto.me/CAVEclient/tutorials/materialization/) allow root filters, selected columns and `desired_resolution=[1,1,1]` for nm. The official client [endpoint definitions](https://github.com/CAVEconnectome/CAVEclient/blob/master/caveclient/endpoints.py) provide versioned table queries, while fafbseg maps dataset `public`/`flat_783` to datastack `flywire_fafb_public`. A CAVE/FlyWire token is required for this route; none was sought or used. Resolve the advertised server/table metadata through that client rather than assuming the current table is the pinned historical filtered view.

Codex has a separate account API token. The no-token request to `https://codex.flywire.ai/api/download_resource?data_product=synapse_coordinates&dataset=fafb` returned 401 and explicitly required it. The [current FAQ](https://codex.flywire.ai/faq) directs programmatic users to static files and distinguishes Codex login from CAVE permissions. Raw GCS object access above independently succeeded without either credential. Direct shell FAQ/download-page requests returned 403; web-tool primary-page coverage succeeded. Neither result establishes that the public objects are inaccessible.

## Amin source and geometry boundary

The cached `PMC7541083.xml` was read as XML, specifically Connectome analysis, Statistics and software, and Data availability; no visual PDF review was performed. Its SHA-256 and extracted sections are retained in `source-evidence/amin-xml-selected-sections.json`.

The paper uses hemibrain v1.1 and 8 nm coordinates. Its equation sums KC→APL-input/APL→KC-output pairs weighted by distance **along APL neurites**, with uniform-radius and varying-radius variants. The [author repository](https://github.com/aclinlab/amin-et-al-2020) includes the hemibrain APL skeleton, reciprocal KC contacts and scripts; its retrieval code identifies hemibrain body `425790257`. These are valid replication inputs for that hemibrain analysis, not FlyWire v783 root geometry. Cross-specimen registration, type matches or NBLAST similarity cannot identify the same physical synaptic contacts. Amin-derived λ on FlyWire would be a declared cross-specimen model assumption, not a measured FlyWire constant.

## Smallest concrete next acquisition and acceptance

1. Obtain a generation-pinned, streamed lite-CSV slice for only the two APL roots and retained KC partners, preserving both directions and raw rows. This requires reading the complete 317 MB gzip object unless a provider supplies an indexed/subset export; no such export was established here. Compare counts for every retained ordered pair with the frozen graph before treating it as compatible.
2. Establish the lite file's coordinate-side and filtering semantics through primary provider documentation or a small independently matching canonical Buhmann pre/post subset. If unresolved, use four selective v783 CAVE queries (two APL roots × input/output) or a provider-prepared canonical slice; retain IDs, both endpoint positions, scores, materialization/table identity and unit metadata. KC→APL requires APL-side postsynaptic position; APL→KC requires APL-side presynaptic position.
3. Audit contact-to-skeleton attachment residuals and branch ambiguity before path distances. Record projection/interpolation rather than silently snapping all contacts to a node. Uniform-radius cable distance is the smaller first geometry calculation; a radius-weighted version additionally needs a declared zero-radius/mesh-quality policy.

**No-go:** do not fill missing v783 contacts with Amin's hemibrain contacts, mix Princeton coordinates with Buhmann graph counts without a separately declared condition, infer exact APL-side coordinates from an undocumented single point, or call approximate/skeleton-projected distances exact biological distances. Data access and count agreement do not validate locality physiology or establish a learning benefit.

## Retrieval mistakes and limits recorded

- A guessed Codex-local `sk_lod1_783_healed.zip` URL returned 404. The official individual skeleton service succeeded; the guessed path is not used as evidence of missing skeletons.
- One PowerShell projection displayed null console fields despite valid saved JSON; the receipts were inspected directly and later displays used proper objects. One inline Python command failed Windows quote handling before executing; its corrected single-quoted form completed. Neither failure changed experiment data.
- An upstream public Amin retrieval script embeds a credential literal. It was neither used nor tested; the retained source redacts it and its receipt distinguishes downloaded-original and retained-redacted hashes. Do not execute the upstream script unreviewed.
- Provider, full-table row coverage, lite coordinate semantics and per-pair contact reconciliation remain explicitly unresolved by this bounded access check. No claim of a biological solution follows from these results.

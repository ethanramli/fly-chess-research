# First Lichess source-to-consequence development fixture

21 October 2026. **Teacher preparation and software evidence only.** No graph loaded or neural event delivered by these tools; no chess learning, transfer, G0 qualification or curriculum pass.

## Result

One public daily API response, puzzle `kRapK` / game `xtCHfJwL`, was retrieved as JSON. The source prefix replays47 plies, with setup move `f7e5`. Actual PGN counters/repetition history are retained; the API's reported FEN has reset counters and is checked for the same board/turn/castling/en-passant position.

The prepared capture-retention task covers all7 legal moves. A separate audit recomputed3 immediate-retention successes and4 failures, with0 unknown. This does not establish global move quality or that the source line is uniquely best. The position has22 pieces, exceeding the frozen six-piece Stage 1 limit, so `stage1DomainEligible=false`. No smaller synthetic board was substituted.

| Evidence | Scope |
|---|---|
| [Raw response](daily-response.json), [HTTP headers](daily-response-headers.txt) | One public development fixture; not a source archive or untouched final sample. |
| [Original preparation manifest](prepared/manifest.json), [original audit](audit.json) | Initial one-row integration before the bounded-output repair; original source copies are in [initial-source](initial-source/). |
| [Current preparation manifest](prepared-v2/manifest.json), [current audit](audit-v2.json) | Same source and exact same lesson bytes; adds explicit output ceilings and fatal publication-error handling. |
| [Repaired software checks](software-checks-repaired.txt) | Five cases cover API/CSV history, full counters versus API reset counters, future-line exclusion, malformed/inconsistent inputs, all-legal task coverage, unknown suppression and changed-prefix rejection. |
| [Expanded integration checks](software-integration-checks.txt) | 12/12 pass: eight new history/CLI cases plus four existing certificate cases, including independent API audit, injected append failure and malformed-source quarantine. No graph load. |
| [Python action checks](../../../runs/python-actions/20261021T110510-f778cda3/stdout.txt) | 13/13 pass, adding the source curator's post-setup piece limit. The initial illegal synthetic fixture and failed check are preserved in the dated journal. |
| [Initial software failure](software-checks-unsandboxed.txt), [sandbox failure](software-checks.txt) | Preserve the default PGN `Site "?"` bug and denied Node child-process launch. |

Current lesson SHA256: `aaee8b0eb2d2a81d1d615e3a9918d60419e6df246dd1017e3ad768e29e42ff6d`. Input SHA256: `02cdd63d0c0d69f72da3ae24e27f107c619328638b1c7faf23312ddba7004551`. Current manifest SHA256: `713fa87e99de99a94af19bc1383ab2e941da966f3ab2d9df269d185cebc27858`. Measured peak RSS:56.33 MiB preparation,55.32 MiB independent audit.

## Reproduce into fresh paths

```powershell
node --max-old-space-size=256 .codebase/scripts/data/prepare-lichess-lessons.mjs --api-json research/reports/lichess-foundations-pilot-2026-10-21/daily-response.json --out NEW_DIRECTORY
node --max-old-space-size=256 .codebase/scripts/data/audit-lichess-api-lessons.mjs --prepared NEW_DIRECTORY --out NEW_AUDIT_JSON
```

The preparation command also accepts existing curator JSONL via `--rows FILE --games PGN_DIRECTORY --split development|train|validation`. This CSV path has bounded fixture coverage, not a real archive integration audit. API samples are restricted to development. Final-family preparation is deliberately unsupported here; the registered final campaign needs its own sealed-input path and independent audit.

Limits: input64 MiB/4096 rows, source PGN64 KiB/512 plies, API payload256 KiB, each output row2 MiB and total output64 MiB. Invalid histories are reported as rejections with nonzero exit. Publication/storage errors are fatal; no completed manifest is published for a partial run. These limits bound source preparation, not graph training.

## Preserved mistakes and remaining work

### Archive acquired; source sampling in progress

The official archive is now complete:307,234,795 bytes, SHA256 `76335bfa7d7c4a7f93c1366d81549e53951ebb79dd43d34904cab8f22d962f8d`. [Verification receipt](archive-verification.json) checks transfer completion, matching ETag/range and the unchanged29,671,071-byte resumed prefix. The first timeout remains preserved. [Initial registration](archive-download-registration.json), [continuation registration](archive-resume-registration.json) and [response headers](archive-resume-response-headers.txt) reconstruct both invocations.

The archive begins with a valid Zstandard skippable frame. A strict ordinary-magic check wrongly rejected it, and installed Node22.23.2 subsequently emitted no CSV when used directly on metadata-first compressed input. The tiny ordinary/metadata reproduction and failed real scan are recorded in the journal; do not strip one prefix and assume later frames were read. Python3.14's standard-library `ZstdFile` decoded all frames. [Extraction receipt](extraction.json) binds the1,139,783,132-byte CSV, SHA256 `ec2dd1a8f9cbd139ebb4aee228f72e77f8e2a581a24d25f61f71e6cf306b10f8`, to the original compressed hash. Extraction took45.97s wall/22.67s CPU under0.5 pacing,1 MiB reads,128 MiB maximum decoder window and a4 GiB output limit. This is source preparation, not a learning/resource-improvement claim.

[Eight publication/extraction checks](../../../runs/python-actions/20261021T113434-1444ce6f/stderr.txt) pass, including concatenated frames, truncation, output limits, prefix/header mismatch and rename failure. [Nineteen source/certificate/rehearsal checks](../../../runs/python-actions/20261021T113439-399f9bf0/stdout.txt) pass separately. The first compressed scan failed before dataset creation; the replacement scan uses verified CSV and source-manifest version2. At this update tool session8469/PID17016 is live, with raw records at [actual invocation](../../../runs/python-actions/20261021T113618-b7686084/intent.json). No completed candidate corpus or teaching event is asserted yet.

Launch-order limitation: the active scan captured the previous9-pin config while an11-pin preflight was still completing. Its command and all9 common pins match; the two added pins are the CSV and extraction-receipt hashes above. Preserve the actual snapshot and independently recheck both inputs before use; do not relaunch merely to replace that receipt. See [full mistake/pivot record](../../journal/experiments/2026-10-21-curriculum-execution.md).

The Python configurations are [preparation/check actions](../../../python%20actions/lichess-preparation-step.json) and [the completed download continuation](../../../python%20actions/lichess-preparation-resume-step.json). They leave the default curriculum config and the separate live G0 config unchanged. The curator's `--max-pieces 6` selects post-setup candidate positions only; real source-game history, consequence and family audits are still required. Source reserves are not validated relational-family splits; do not open reserved final rows for implementation selection.

The earlier direct game export returned signup HTML after redirect, despite curl success. It is preserved as [failed response](yyznGmXs-export-response.html), never accepted as PGN. A bounded read-only probe now succeeds through Lichess's official [batch export endpoint](https://github.com/lichess-org/api/blob/master/doc/specs/tags/games/api-games-export-_ids.yaml): `POST /api/games/export/_ids`, comma-separated IDs, up to300 per request, with `Accept: application/x-chess-pgn`. The one-game probe for `xtCHfJwL` returned HTTP200 and standard PGN; the raw file is [api-export-probe.pgn](api-export-probe.pgn) (761 bytes, SHA256 `d3e04d4271935df4559d1d0ff2062e5cf23dae14433418e6656d401b11400ec6`) with [response headers](api-export-probe-headers.txt). The complete 64-ply source replay was reduced to the first47 plies through the setup move; the existing history binder then verified the puzzle ID, setup move and source prefix, producing solver FEN `5r2/pp1k2p1/2np4/1Nq1N3/2B1P1b1/3P4/PPP3P1/R1B2R1K b - - 0 24`, consistent with the API board/turn despite reset counters. This validates one public game ID and the route, not bulk retrieval, candidate-corpus history coverage, Stage1 eligibility, relation-family splits or teaching. No batch downloader/config is registered yet. The missing `Site` marker was initially treated as a URL; shared history validation now handles it. Broader-path review added the output ceilings and moved append failures outside source-validation catch. See [dated journal](../../journal/experiments/2026-10-21-curriculum-execution.md).

Still required: corpus acquisition with source histories, genuinely disjoint relation families/counterfactuals, Stage 1-compatible data, receiver qualification, fresh pre-feedback neural rankings, registered local delivery and persistent learning, Stockfish teaching/value adapter, curriculum-wide progression and independently audited unfamiliar composition. See [loop design](../../../documentation/design/puzzle-learning/lichess-foundations-loop.md).


## 21 October: block publication and replay milestone

[Registered block checks](../../../python%20actions/curriculum-block-checks.json) pass **21/21**, with [raw test output](../../../runs/python-actions/20261021T121643-84121c43/stdout.txt) and [completion receipt](../../../runs/python-actions/20261021T121643-84121c43/completion.json). The block session binds fresh rankings to each event, commits exposure counts only after four events, and retains receipt/memory chains. The disk runner saves pending updates before acknowledging them, requires new recovery directories and refuses partial/conflicting logs. A separate replay recomputes rankings and neural frames while reconstructing block bookkeeping without runner/coordinator transition calls. Its result always has `stageAccepted=false`.

Software scope: four rate-array cells, synthetic reset-history chess boards,12 interruption/resume comparisons (six positions before acknowledgement and six after log append), longer schedules, later-block history, all controls and rehashed false-record/ranking rejection. No full-graph run or physical power-loss test. Checkpoint sizes and temporal record counts are bounded, not measured graph-scale capacity. Original failed tests, generic-message assertion repair, first hard-coded schedule ceiling and pre-ranking-log source are preserved under [initial-source](initial-source/) and in the dated journal. Fresh stage-family provenance, biological receiver qualification and scientific acceptance are still required.

### Corrected live/recovery state

The earlier source/PID observations above are historical. The graph, source curator and one software check all disappeared with missing tool handles; the cause is unknown. G0 resumed from complete checkpoint009361 into `runs/g0-history-replication-20261013-v1-resume-0001` through its unchanged registered supervisor. Last verified12:17 UTC: PID10388, checkpoint009956/4977 receipts, pendingReceipt=false,170.4 MiB working set/8711.5 MiB free, zero stderr, no result/audit. Source curation had published no dataset; one explicitly recorded bounded recovery now uses all11 pins, tool18100/PID5580, [actual invocation](../../../runs/python-actions/20261021T121022-d220d9ba/handle.json). Its output manifest is not yet claimed. Preserve original logs and do not restart either job on observation timeout.

Corpus archive acquisition/extraction are complete; the older remaining-acquisition wording means source histories/family preparation, which are incomplete. G0, trained chess choices, Stockfish neural teaching, full curriculum progression and unfamiliar compositional reasoning remain unpassed.


## 21 October: independent candidate provenance audit ready

The [candidate-source auditor](../../../.codebase/scripts/data/audit-lichess-source-candidates.mjs) is implemented without importing the curator producer. It proves selected training/validation rows occur in the pinned CSV, independently replays setup and source solution, checks source-game split/piece/count limits and verifies CSV plus extraction/archive identities. It never opens `final.jsonl`. A successful source audit explicitly does not establish full source history, consequences, relational-family disjointness, graph-launch authorization or teaching eligibility.

[21 source/history/planner/certificate checks](../../../runs/python-actions/20261021T123338-28961258/stdout.txt) pass (21.49s), including escaped CSV quoting/whitespace, missing synthetic final file, compressed-source receipt, changed archive bytes and rehashed fabricated metadata/consequence/position rejection. The first pass and pre-candidate-pacing implementation are preserved in the journal/initial-source. The real curator is still live under tool18100; no actual dataset audit or source-family pass is claimed. Once it completes, `fly.cmd --config "python actions/curriculum-block-checks.json" run audit-source` is the registered next action. It requires the completed manifest and refuses an existing audit output.


### Curator progress visibility

Code inspection during the live scan confirms that the curator does not emit progress: it finishes the full CSV loop before creating its output directory, then prints one final JSON summary. Therefore a quiet action/no output directory while the same handle is live is expected, not a terminal signal. Its3600-second bound has no resumable cursor; preserve the current invocation and classify raw logs if it exits before publication. No active source or pacing pin was changed.




## 21 October: source scan timeout and registered PGN fetch action

The curator invocation runs/python-actions/20261021T121022-d220d9ba ended with exitCode1 after the Source preparation elapsed bound assertion at3600 seconds. The output directory research/data/lichess-stage1-candidates-v1 does not exist; no manifest or candidate corpus was published. The original script snapshot curate-lichess-puzzles-v1-source.mjs is hash-identical to the old pin. Recovery registration curation-recovery-v2-registration.json preserves all data-selection, CPU-duty and memory settings; only the maximum wall bound rises to4200 seconds (the updated script supports at most7200). New output is research/data/lichess-stage1-candidates-v2. At this report update the recovery has not started; its registered action is python actions/lichess-curation-recovery-step.json.

The registered Python PGN fetcher completed a one-ID development request for xtCHfJwL: output manifest at research/data/lichess-source-pgn-probe-v1/manifest.json, per-game PGN at research/data/lichess-source-pgn-probe-v1/xtCHfJwL.pgn, and action stdout at runs/python-actions/20261021T130811-3049a857/stdout.txt. It requested one ID, received one matching ID, and its PGN first47 plies passed the existing history binder against puzzle kRapK; the complete source game contains64 plies. The initial action config omitted required paths.run, so the Python wrapper reported KeyError run after launching the child and wrote no completion.json; child stdout and the atomic output manifest prove fetch completion. The config now includes run; preserve the original invocation as a wrapper error and do not repeat the existing probe. This is not bulk training/validation retrieval, family separation, a consequence certificate, or a neural event.

At13:18 UTC the registered recovery plan passed all11 pins and the same-selection 4200-second scan started as `runs/python-actions/20261021T131707-015ad3c6/` (PID5524), targeting `research/data/lichess-stage1-candidates-v2`. Direct inspection also found the existing G0 process PID10388 live. The scan had no stdout, stderr or manifest after its first minute; the curator publishes only after the full scan. The registered status action's CIM inspection returned Access Denied, so this update records only direct process evidence. No corpus or source audit result is available yet.

At13:20 UTC the planned existing `audit-source` action was found stale: it pins the original curator source hash and v1 output, so its registered plan correctly refused the active v2 output. The old config remains intact. A separate `python actions/lichess-source-audit-v2.json` now pins the v2 registration and current curator/auditor/pacer hashes. Its plan passes all pins and reports only the expected missing v2 manifest. Run it only after the exact active scan completes and its published manifest is reviewed. This is an action-configuration correction, not an audit pass.

At14:27 UTC the registered v2 recovery ended with exitCode1 at4200 seconds on the `Source preparation elapsed bound` assertion; no v2 corpus manifest was published. Its old code is preserved as `curate-lichess-puzzles-v2-source.mjs` (SHA256 `306987...`). The second timeout confirms the current full-source scan needs an implementation improvement, not another identical retry.

V3 preserves the quoted-field parser and uses native comma splitting only on lines containing no quote, with the same source selection, reservoir sampling, seed, splits and resource settings. It adds one-million-line progress records and uses the registered7200-second maximum with a fresh output. The [v3 registration](curation-recovery-v3-registration.json) and [action](../../../python%20actions/lichess-curation-recovery-v3-step.json) are pinned; plan passed all six pins. Invocation `runs/python-actions/20261021T143122-cc11d054/` (PID17324) is live; no manifest/result yet. Its matching [source-audit action](../../../python%20actions/lichess-source-audit-v3.json) is prepared for after complete publication. The v2 failure and v3 pivot are logged; no Stage1 teaching eligibility is established.

## 22 October: same-selection v4 source replay

The v3 process/session is missing, with no completion receipt or manifest; exact exit cause is unknown. Its source is preserved as curate-lichess-puzzles-v3-source.mjs. The new curation-recovery-v4-registration.json preserves source/filter/split/seed/exposure/resource settings and pins direct chess.js move validation with explicit promotion-suffix checks. This avoids generating every legal SAN alternative for each recorded source ply. No matched whole-run speed claim is made.

All22 source/history/rehearsal checks pass in runs/python-actions/20261022T023750-def1494d/. Config python actions/lichess-curation-recovery-v4-step.json planned ready with10/10 pins, then launched curate-stage1-v4 as PID2612/session51779/invocation runs/python-actions/20261022T023955-3de25aa8/. Latest observed stdout reached2,000,000 lines,63,898 legal lines and zero rejected; output manifest was absent. Continue that same handle. On completion inspect output and exit, then run its audit-source-v4 job. Corpus publication/source audit, PGN binding, family disjointness and neural eligibility remain distinct requirements; no final rows were inspected.

## V4 completion, audit and source histories

The source scan completed exit0 over6,157,341 rows in1041.2059s, peak125.0234 MiB. It published128 train/128 validation/127 reserved-final rows. Manifest SHA25679f7c8d803dc8d1a23f34c49db0369a403c0c5d2056b2d3ba1fbf6998240473c. The registered source audit passed in runs/python-actions/20261022T025825-63d28668/, verifying all256 train/validation rows against the full pinned source/archive and leaving final.jsonl unopened. Source-candidates-audit-v4.json explicitly leaves histories, certificates, relational disjointness and neural eligibility unproved.

Fresh pgn-batch-v4-registration.json and python actions/lichess-source-pgn-v4-step.json bind those exact manifests/audit/row files and the updated fetcher. Train export completed in runs/python-actions/20261022T030251-86e8ad3c/ and validation in runs/python-actions/20261022T030306-be07868a/. Each publishes128 identified standard-start PGNs under research/data/lichess-stage1-source-pgn-v4/. Request/response coverage and every game-file hash were checked. This verifies transport/provenance, not source-prefix or consequence correctness.

The original lesson producer is archived as prepare-lichess-lessons-before-batch-guards.mjs. Its new resource guards/duty pacing were checked with22 existing source/history tests in runs/python-actions/20261022T030103-110df65f/. Lesson-preparation-v4-registration.json and python actions/lichess-lesson-preparation-v4-step.json pin272 source/game/artifact inputs. The first train invocation failed ENOENT before publication because its batch parent was absent; logs preserved in runs/python-actions/20261022T030437-2b955012/. After explicitly creating the parent and checking no train output existed, prepare-train is running under session82243/invocation runs/python-actions/20261022T030504-9c40fabf/. No complete lesson manifest at last sample. Inspect that same handle before further action; the existing API-development auditor does not audit a CSV lesson batch. No neural event or Stage1 eligibility is established.

## 22 October — bounded chunks and independent lesson audit

The v4 whole-training preparation hit its300s soft elapsed bound after114 unpublished partial rows; no manifest or lesson acceptance. Preserve [interruption observation](lesson-preparation-v4-interruption.json) and [exact failed source](prepare-lichess-lessons-timed-out-v4-source.mjs). Counts17 narrow-domain-eligible/zero unknown are partial descriptive counts only.

[Registered v5](lesson-batches-v5-registration.json) preserves the same256 source rows in eight serial32-row publications and caches completed chunks across explicitly new-directory recovery. The helper's3 offline checks and23 shared action checks pass. Source/history checks remain22/22. Current owners are in [the handoff](../../../documentation/handoffs/curriculum-reasoning-state.md).

[Independent CSV audit registration](lesson-audit-v5-registration.json) binds the new auditor and original preparation config. Four offline checks pass in runs/python-actions/20261022T043707-d9a48c46/: valid synthetic package accepted; rehashed wrong history, label and displayed-FEN packages rejected. The source-membership assertion is synthetic in these checks. Production audit awaits the complete package, and family separation/receiver gates remain unmet. Preparation does not deliver neural feedback.

## 22 October — v5 stopped, explicit Stage1-only v6

V5 stopped at third32-row chunk (elapsed bound), leaving64 completed rows and a preserved failed partial. [Interruption and before-source hashes](lesson-batches-v5-interruption.json) record this negative outcome. V5's completed chunks remain intact but the changed producer makes its original audit registration historical.

[V6 registration](lesson-batches-v6-registration.json) preserves all256 source rows and per-chunk bounds, using explicit --stage1-only to avoid certifying boards that exceed the frozen six-piece domain. Excluded rows retain source/history and explicit no-certificate scope; they are never eligible for teaching. In-domain proof generation is unchanged.23 source/history checks and6 CSV audit checks pass; production preparation is running and no speedup/result is claimed. [Independent audit registration](lesson-audit-v6-registration.json) requires the complete package and checks replayed piece exclusions, histories and in-domain certificates. Relational-family, receiver and neural-learning gates remain unmet.

## Correction and current v7 preparation

The v6 optimization hypothesis was wrong for this data: the source curator already enforces maxPieces6 (all256 solver positions are4–6 pieces). First32 v5/v6 lesson bytes were identical, with no exclusions. V6 was deliberately stopped with its outputs preserved; [operator-stop record](lesson-batches-v6-operator-stop.json). Every changed implementation is archived as *-abandoned-stage1-filter; the irrelevant branch has been removed from live code.

Actual [before profile](lesson-profile-row80.json) and [after batch profile](lesson-profile-row80-batch.json) identify repeated full-prefix pgn/history rendering on one training row. The new all-legal batch path validates the root once, retains full history, preserves individual proof/check results and checks exact coverage.25 source/equivalence checks and4 independent CSV audit checks pass. This is not a whole-corpus speedup claim.

[Registered v7](lesson-batches-v7-registration.json) is the current preparation attempt: same256 rows/eight32-row chunks/300s limits, no source filtering. Training128 rows have published at last observation; validation remains live. [Independent full-package audit and equivalence registration](lesson-audit-v7-registration.json) must complete before source/history/certificate acceptance. Family registration, receiver qualification and learning/transfer gates remain unmet.

### Data suitability limitation found from training rows

[Training-only contrast counts](training-consequence-contrast.json) show20/128 roots with a successful capture,13/128 with a failed capture and zero with both. Thus the20 training rows marked producer-domain-eligible contrast successful captures only with noncaptures; an always-capture shortcut remains viable. Certificate integrity does not make this a sufficient defended-capture learning curriculum. No validation/final lesson content guided this finding. Before graph teaching, register matched causal/counterfactual families and a task-appropriate verified comparator; preserve current quiet-action task-failure semantics and source data. The current data audit must not be interpreted as clearing that gap.

### V7 completion and independent evidence

All256 rows/eight chunks published, manifest SHA256 e31bcf389a8780668be231d3278221138048b267437cbfddd21f2c596a2a4434. [Independent lesson audit](lesson-batches-audit-v7.json) passed128 training/128 validation source histories and all-legal certificate replay, with zero unknown actions and20 narrow-domain-eligible rows per split; final rows unopened. It denies family separation, graph launch and neural teaching eligibility. [Exact overlap check](lesson-batches-equivalence-v7.json) passed all64 previously completed v5 training rows byte-for-byte. Invocations20261022T045316-c168359d/20261022T045545-2bc29ec5/20261022T045546-a76ebfac are preserved under runs/python-actions. No rerun/overwrite is needed. The training shortcut limitation above remains unresolved.

## 22 October — meaningful capture comparisons

Two bounded legal-continuation attempts produced zero strict pairs: [king-only v1 registration](legal-branch-contrast-v1-registration.json) recorded512 branches/39 roots; [quiet-piece v2](legal-branch-contrast-v2-registration.json) recorded277 branches/103 roots before300s. Preserve both empty outputs/manifests and source snapshots; no real family passed the independent checker. Three synthetic construction checks and one independent-checker test with six forged variants pass; their scope is software only.

The next [training-only source registration](matched-capture-train-v1-registration.json) enriches real puzzle candidates for a unique retained capture plus a recapturable alternative by the same mover and same target type. The FEN-only selection does not supply a history or consequence certificate.27 source/history/filter/audit tests pass (20261022T052013-85d95c1a), including independent rejection of a forged mixed outcome and exclusion of reserved-split semantics. [Design and limits](../../../documentation/design/puzzle-learning/lichess-capture-comparisons.md).

Current full-source scan: config python actions/lichess-matched-capture-train-v1-step.json, supervisor93108/PID11060, invocation runs/python-actions/20261022T052256-8324fdd0/.64 training candidates maximum, seed20261021,7200s/heap256/duty0.5/RSS2048/minfree256; output research/data/lichess-matched-capture-train-v1. Independent audit-source is registered but must wait for the complete manifest. No graph launch, final-file access or family/learning qualification. Original curator/auditor versions are archived before the new optional flags; old completed artifacts retain their historical identities.

### Automatic source-audit handoff is waiting

The v2 [handoff registration](source-completion-handoff-v2-registration.json) and config python actions/lichess-source-completion-v2-step.json now own the next source audit, under supervisor85558. They observe existing source PID11060 through the verified read-only observer and wait for original clean completion plus manifest before invoking only the pre-registered independent source audit. No source restart or neural launch. **Do not manually duplicate audit-source.** Real waiting state is source-completion-watch-v2/state.json; last sparse milestone3,000,000 lines/123 preliminary legal matches, not a completed sample. Five mocked handoff checks pass (20261022T054603-c7c2f6e8); actual audit execution/completion remains pending. V1 failed before observing because launch and attach receipt shapes differ; failure/source snapshots are preserved and corrected fixtures now use command-string attach receipts.

## Matched-capture corpus:44 certified training roots

[Source audit](matched-capture-train-source-audit-v1.json), [actual-PGN registration](matched-capture-pgn-v1-registration.json), [lesson preparation registration](matched-capture-lessons-v1-registration.json) and [independent lesson audit](matched-capture-lessons-audit-v1.json) are complete.44/44 training histories, exact all-legal consequences and declared mixed-capture comparisons pass; zero unknown. No validation/final inspection, relational-family separation, graph authorization or learning efficacy.

[Fixed-rule continuation registration](legal-branch-matched-capture-v1-registration.json) changes only the input corpus relative to the preserved negative studies. Bounded teacher-data construction remains distinct from the Fly's own learning and inference.

## Validation-family continuation - 22 October 2026

[Prepared validation families](../../data/lichess-validation-branch-families-v1/manifest.json) contains one candidate from the bounded v7 validation search. [Independent replay audit](validation-branch-family-audit-v1.json) verifies its source/history and legal branch contrast but explicitly does not establish cross-split family disjointness or authorize graph training. The final split was not inspected. The action configuration and compact receipts are in `python actions/lichess-validation-branch-families-v1-step.json` and `runs/python-actions/`.
## Validation candidate expansion - 22 October 2026

[Candidate manifest](../../data/lichess-validation-candidates-v1/manifest.json) records 1,022 validation rows selected from the larger verified source pool. The [independent source audit](validation-candidate-source-audit-v1.json) passed source membership and split checks. It explicitly leaves full-history, consequence, family-disjointness and teaching gates false; final row content remained sealed. See [sampler](../../../.codebase/scripts/data/curate-lichess-validation-puzzles-v1.mjs), [auditor](../../../.codebase/scripts/data/audit-lichess-validation-puzzles-v1.mjs), and [Python registration](../../../python%20actions/lichess-validation-candidates-v1-step.json).
## Validation source/history audit v2 - 22 October 2026

The validation-only prescreen produced 192 candidates; the source-history fetch retrieved all 192 Lichess games. The versioned preparation and separate independent auditor verified 192/192 standard-start histories, puzzle positions and all-legal one-reply capture certificates: 220 successes, 1,689 failures and zero unknowns across 25,184 source plies. The lesson set is still validation data only. `finalSplitInspected:false`, `eligibleForNeuralTeaching:false`, `relationFamilyDisjointnessEstablished:false`, and `graphLaunchAuthorized:false` remain authoritative.

Artifacts: [candidate rows](../../data/lichess-validation-stage1-prefilter-v2/validation.jsonl), [source PGN manifest](../../data/lichess-validation-source-pgn-v3/manifest.json), [prepared lessons](../../data/lichess-validation-prepared-v2/manifest.json), [independent lesson audit](validation-lessons-audit-v2.json), [registered source/history actions](../../../python%20actions/lichess-validation-source-history-v3-step.json), [preparation](../../../python%20actions/lichess-validation-lesson-preparation-v2-step.json), and [audit](../../../python%20actions/lichess-validation-lessons-audit-v2-step.json). The subsequent validation-family search is a separate active job; check the current action handle before observing or resuming it.
The family search is still live under [its action receipt](../../../runs/python-actions/20261022T155554-62e2b271/handle.json), with registration in [the v2 action config](../../../python%20actions/lichess-validation-branch-families-v2-step.json). Its last observed partial family output was empty; no result is claimed.
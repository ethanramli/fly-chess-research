# Memory estimate calculation

Volume 1: Methodology. Chapter 4: Experimental Process.
Evidence checked: 2026-11-04. This is a calculation note, not a new experiment.

**Result:** The original **64 GB Monte Carlo requirement is not reproducible from the evidence found**. One dense matrix for the actual graph would need **72.048 GB, or 67.100 GiB**, with four bytes per value. A smaller, approximate neuron count gives exactly 64 GiB. That is a possible calculation, not the recovered historical calculation.

The basic sparse graph needs **23.691 MiB** of array data. Neuron state adds to this size. Whole-process RSS is larger. Several runs have recorded RSS values, but the run behind the chapter's **about 250 MB** claim is not identified.

## What one simulated fly costs

Added 2026-11-13 for Volume 1, Chapter 4.

A dense connection table is like a spreadsheet with one row per sending neuron and one column per receiving neuron. A cell holds the connection strength, with zero for an absent connection. A single table covers the wiring of the entire model. With **134,209 neurons**, it has **18,012,055,681 cells**. At **4 bytes per cell** (float32), one table alone would occupy **72,048,222,724 bytes, or 72.05 GB (67.10 GiB)**. That estimate covers the wiring before any neuron activity, training state, or runtime overhead. See [the dense calculation](#4-calculate-a-dense-matrix).

FlyChess stores only the **2,700,513 directed connections present in the model**. Its core sparse graph arrays occupy **24,841,457 bytes, or 24.84 MB (23.69 MiB)**. That is about **1/2,900 as much storage for the wiring** under these assumptions. See [the sparse calculation](#5-calculate-sparse-storage-and-neuron-state).

In the **November 8 Fly Connections Memory dry run**, each of six concurrent workers ran a separate model and made **8,922 full-network passes**. Recorded peak resident memory was **274–281 MiB per worker**, including the wiring, model state, and process overhead. The range describes individual workers' peaks. If six workers each held a private dense table, those tables alone would total **432.29 GB**. This is a hypothetical allocation, while the reported worker peaks come from the actual sparse dry run. [Dry-run journal](../../../journal/experiments/2026-11-07-fly-connections-memory.md#16-2026-11-08-2341-dry-run-complete-does-not-pass-mechanism-level-failure-found)

The researcher recalls estimating about **64 GB** during early Monte Carlo planning and considering a command-line tool for Google Colab because local hardware was limited. The original estimate's assumptions remain unknown. The 72.05 GB calculation gives a reproducible figure for a specified dense design. Sequential Monte Carlo rollouts can reuse one model's wiring, so the rollout count alone gives no RAM requirement. See [the Monte Carlo assumptions](#6-state-the-monte-carlo-copy-assumptions) and [the archived sparse-graph search profile](../../../../archive/early-development/research/reports/monte-carlo-neural-profile-v2-2026-10-07/README.md).

## 1. Read the labels and units

1. **ESTIMATE** means bytes calculated from stated assumptions. It is not a process measurement.
2. **MEASURED** means a value read from the named file. Header counts describe stored arrays. Recorded RSS describes a process. These are different measurements.
3. **MISSING** means the required evidence was not found. A nearby number does not fill that gap.
4. Use these units in every calculation:

   ```text
   1 MB  = 1,000,000 bytes
   1 GB  = 1,000,000,000 bytes
   1 MiB = 1,048,576 bytes
   1 GiB = 1,073,741,824 bytes
   ```

## 2. Trace the claim to its sources

1. Search the working tree with `rg` (the grep tool). Include hidden source folders and ignored archive files. Search `archive/early-development/`, `documentation/`, `research/`, and `.codebase/` for `64 GB`, `64 GiB`, `250 MB`, `250 MiB`, `Monte Carlo`, `dense adjacency`, and `memory estimate`.

   The main search forms were:

   ```powershell
   rg -n --hidden --no-ignore -i '64\s*(GB|GiB)|250\s*(MB|MiB)|monte.?carlo|dense adjacency|memory estimat' archive/early-development documentation research .codebase -g '*.md' -g '*.mjs' -g '*.py' -g '*.json' --max-columns 450 --max-columns-preview
   git log --reverse --format='%h %aI %s' -S "64 GB" -- archive/early-development documentation research .codebase
   git log --all --reverse --format='%h %aI %s' -S "64 GB" -- research/literature/writings/01-methodology/04-experimental-process.md
   git log --all --reverse --format='%h %aI %s' -S "64 GB" -- documentation/next-checkpoint.md
   ```

   Also inspect the earlier file names with `git log` and `git show`. Ordinary branch history and saved checkpoint refs are different sources. The chapter files are not in the current branch's committed tree. Saved checkpoint refs do contain them.

2. Separate a document date from a Git date. The earliest relevant sources found are below. A first Git record does not prove the date when the idea was first proposed.

   | Subject | Exact source | Date and evidence |
   |---|---|---|
   | Earlier memory estimate and sparse method | [low-memory-training.md](../../../../documentation/design/supervised-baselines/low-memory-training.md), formerly `documentation/design/low_memory_training.md` | Document date: **2026-09-29**. First branch commit for the old path: `c9f12e1`, **2026-10-04T22:13:44+07:00**. It gives batch/state estimates and excludes dense adjacency. It does not give a 64 GB formula. |
   | Earlier measured memory | [lowram-feasibility.json](../../../../archive/early-development/research/reports/lowram-feasibility.json), formerly `research/reports/lowram-feasibility.json` | Timestamp: **2026-09-29T07:28:42.551Z**. `peakResidentMiB = 130.01171875`. This is a single-position, artificial-target training test. It is not Monte Carlo or chess-skill evidence. |
   | Monte Carlo method | [monte-carlo-traces.md](../../../../documentation/design/search-and-feedback/monte-carlo-traces.md) and [software report](../../../../archive/early-development/research/reports/monte-carlo-review-software-2026-10-06/report.json) | The design records a **2026-10-06** software probe. First branch commit for the current design path: `b2edff3`, **2026-10-13T19:36:46+07:00**. The probe uses a synthetic policy. It loads no graph. |
   | Literal 64 GB and 250 MB claim | [04-experimental-process.md](04-experimental-process.md) | Confirmed chapter date: **2026-11-04**. Earliest matching saved checkpoint found: `b7003b0b4fc8c9d60142b52e39aa6042fedb3fb4`, **2026-11-04T13:53:43+07:00**. Lines 9 and 13 contain the claim and its evidence boundary. No calculation is attached. |
   | Later acknowledgement of the gap | [confirmed chapter notes](../../../journal/discussions/2026-11-04-confirmed-chapter-names.md) and [next-checkpoint.md](../../../../documentation/next-checkpoint.md) | The discussion is present in the same `b7003b0` checkpoint. The checkpoint file first matches at `dc61a0b`, **2026-11-04T15:34:27+07:00**. These sources repeat the need for a calculation and a command/RSS pair. They supply neither. |

3. Apply the search limits. The archived `research/data/lichess-source-pgn-probe-v1/` directory was inaccessible. Some `runs/python-actions/` test directories were also inaccessible. Broad whole-tree Git searches were stopped after lengthy archive traversal. Targeted history searches completed. No original 64 GB worksheet was found in the sources examined. This is the earliest located record, not proof that no earlier discussion exists.

## 3. Read the actual graph size

1. Read the ZIP directory and NPY headers in [`.cache/full.npz`](../../../../.cache/full.npz). Read its small `meta.npy` member separately. Do not load the graph arrays or construct a brain. The file SHA-256, checked with a streamed read, is:

   ```text
   4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2
   ```

   **MEASURED, file metadata:** the file size is **39,910,529 bytes**. Its internal build date is **2026-09-13T17:09:57+0200**. Neither value is a process RSS measurement.

2. Read these header values. The code in [graph.mjs](../../../../.codebase/src/runtime/graph.mjs) uses `N = csr_indptr.length - 1` and `E = csr_indices.length`.

   | MEASURED from the file | Type | Count | Bytes per value |
   |---|---|---:|---:|
   | `csr_indptr` | int32 | 134,210 | 4 |
   | `csr_indices` | int32 | 2,700,513 | 4 |
   | `syn_count` | float32 | 2,700,513 | 4 |
   | `sign` | int8 | 2,700,513 | 1 |
   | `input_idx`; `output_idx` | int32 | 2,048; 1,415 | 4 |

   ```text
   N = 134,210 - 1 = 134,209 neurons
   E = 2,700,513 stored directed neuron-pair connections
   ```

3. Keep edges separate from individual synapses. **MEASURED, metadata only:** `meta.npy` reports `total_syn_count = 34,153,566`. It also lists 139,255 neurons for the wider source connectome. The loaded graph has 134,209 neurons. Its filter includes `min_syn = 5`. Use 134,209 and 2,700,513 for these array calculations. Do not use 34,153,566 as the number of CSR entries.

## 4. Calculate a dense matrix

1. Assume one directed `N x N` matrix. Store every possible connection, including absent connections. Do not halve the matrix. Directed connections need not be symmetric. Hold **one matrix**, for **one model**, at once. Exclude neuron state, gradients, search records, and runtime overhead.

   **ESTIMATE, float32:**

   ```text
   Values = N x N
          = 134,209 x 134,209
          = 18,012,055,681

   Bytes = values x 4
         = 18,012,055,681 x 4
         = 72,048,222,724

   GB  = 72,048,222,724 / 1,000,000,000 = 72.048223
   GiB = 72,048,222,724 / 1,073,741,824 = 67.100136
   ```

2. Change only the number type. **ESTIMATE, float64:**

   ```text
   Bytes = 134,209 x 134,209 x 8 = 144,096,445,448
   GB    = 144,096,445,448 / 1,000,000,000 = 144.096445
   GiB   = 144,096,445,448 / 1,073,741,824 = 134.200273
   ```

3. Show one assumption set that gives exactly 64 GiB. Replace the real neuron count with the approximate count `131,072 = 2^17`. Keep one dense float32 matrix.

   **ESTIMATE, hypothetical rounded graph:**

   ```text
   Bytes = 131,072 x 131,072 x 4 = 68,719,476,736
   GiB   = 68,719,476,736 / 1,073,741,824 = 64
   GB    = 68,719,476,736 / 1,000,000,000 = 68.719477
   ```

   This gives **64 GiB**, not 64 decimal GB. The actual graph gives 67.100 GiB. No source found says the original author used this approximation. It cannot recover the historical estimate.

## 5. Calculate sparse storage and neuron state

1. Use compressed sparse row storage, or CSR. Each row lists only the connections that exist. The row pointer gives the start of each receiving neuron's list. Use one int32 sender index and one float32 weight per edge.

   **ESTIMATE, basic CSR array data:**

   ```text
   Sender indices = E x 4 = 2,700,513 x 4 = 10,802,052 bytes
   Weights        = E x 4 = 2,700,513 x 4 = 10,802,052 bytes
   Row pointers   = (N + 1) x 4 = 134,210 x 4 = 536,840 bytes
   Total          = 10,802,052 + 10,802,052 + 536,840
                  = 22,140,944 bytes
   MiB            = 22,140,944 / 1,048,576 = 21.115250
   ```

2. Add the separate fixed sign array. The graph loader retains `syn_count` as its initial magnitude data and retains `sign` separately. Do not count that same initial magnitude twice.

   **ESTIMATE, graph.mjs graph arrays, before input/output indices:**

   ```text
   Signs = E x 1 = 2,700,513 x 1 = 2,700,513 bytes
   Graph = 22,140,944 + 2,700,513 = 24,841,457 bytes
   MiB   = 24,841,457 / 1,048,576 = 23.690660
   ```

3. State how much neuron state is retained. One float32 state value per neuron needs four bytes. A simple current/next pair needs two such vectors. The trainer also has a larger state history.

   **ESTIMATE:**

   ```text
   One state vector = 134,209 x 4 = 536,836 bytes
   Two vectors      = 2 x 134,209 x 4 = 1,073,672 bytes
   Graph + pair     = 24,841,457 + 1,073,672 = 25,915,129 bytes
   MiB              = 25,915,129 / 1,048,576 = 24.714593

   At T = 8 recurrent steps:
   Saved vectors    = (T + 1) states + T activations = 9 + 8 = 17
   State history    = 17 x 134,209 x 4 = 9,126,212 bytes
   Graph + history  = 24,841,457 + 9,126,212 = 33,967,669 bytes
   MiB              = 33,967,669 / 1,048,576 = 32.394094

   Input/output indices = (2,048 + 1,415) x 4 = 13,852 bytes
   Graph + history + these indices = 33,967,669 + 13,852
                                  = 33,981,521 bytes
   ```

   The 17-vector history follows [trainer.mjs](../../../../.codebase/src/supervised-baselines/trainer.mjs). It is a partial array budget. It is not the full trainer size or RSS.

4. Account for excluded memory. The trainer allocates separate model parameters, gradients, a signed-weight cache, and working vectors. [sparse-accumulator.mjs](../../../../.codebase/src/runtime/sparse-accumulator.mjs) allocates another CSR working area in WebAssembly memory. Graph loading uses temporary ZIP/NPY buffers. Other code can load annotations, input mappings, and search records. The runtime uses memory too. **MISSING for the 250 MB claim:** the exact allocation set and command. Do not compare the 23.691 MiB graph array budget directly with whole-process RSS as if they measured the same thing.

## 6. State the Monte Carlo copy assumptions

1. Separate total simulations from simultaneous simulations. Let `S` be the total simulations. Let `C` be the simulations with resident neural state at the same time. Monte Carlo does not require `C = S`.

   [monte-carlo-puzzle-search.mjs](../../../../.codebase/src/search-and-feedback/monte-carlo-puzzle-search.mjs) defaults to `S = 32` and `maxNodes = 4,096`. It awaits each simulation in a loop. It reuses the supplied brain. It retains a bounded search tree and streams each path to an awaited consumer. It does not allocate 32 complete brain copies. In this path, **C = 1 neural evaluation at a time**. The search tree is extra memory; its byte size is not calculated here.

2. Calculate the effect of copying a dense graph. **ESTIMATE:**

   ```text
   One shared dense matrix = 1 x 72,048,222,724 = 72,048,222,724 bytes
   32 copied matrices      = 32 x 72,048,222,724 = 2,305,543,127,168 bytes
   GB                      = 2,305,543,127,168 / 1,000,000,000 = 2,305.543127
   ```

   Thus, 32 dense copies do not explain 64 GB. A shared graph with serial rollouts does not multiply its graph storage by 32.

3. Calculate a different hypothetical copy model. Copy the sparse graph and the 17-vector history for each of **2,048 simultaneous simulations**. Exclude all other arrays and overhead.

   **ESTIMATE, hypothetical independent copies:**

   ```text
   Bytes = 2,048 x 33,967,669 = 69,565,786,112
   GB    = 69,565,786,112 / 1,000,000,000 = 69.565786
   GiB   = 69,565,786,112 / 1,073,741,824 = 64.788187
   ```

   This also gives roughly 64 GiB. **MISSING:** evidence for 2,048 simultaneous copies in the original estimate. This number is a sensitivity example chosen here. It is not a recovered Monte Carlo configuration.

4. Keep a training batch separate from Monte Carlo copies. The 2026-09-29 design discusses `B = 256` positions and `T = 8` recurrent steps. Its state-only estimate is:

   **ESTIMATE:**

   ```text
   Saved states = N x B x T x 4
                = 134,209 x 256 x 8 x 4
                = 1,099,440,128 bytes
   GiB          = 1,099,440,128 / 1,073,741,824 = 1.023933

   One full edge-by-batch buffer = E x B x 4
                                = 2,700,513 x 256 x 4
                                = 2,765,325,312 bytes
   GiB = 2,765,325,312 / 1,073,741,824 = 2.575410
   ```

   Neither figure gives 64 GB. More retained buffers or copies would need explicit counts. No such counts were found for the claim. The sparse serial implementation avoids full edge-by-batch buffers.

## 7. Compare with recorded process memory

1. Read the existing results. Run no simulation. The values below are **MEASURED, as recorded by the named artifact**. They are examples from different workloads. They are not a matched before/after experiment.

   | Recorded RSS | Exact evidence file and field | Workload and limit |
   |---:|---|---|
   | **118.375 MiB** | [Monte Carlo report](../../../../archive/early-development/research/reports/monte-carlo-neural-profile-v2-2026-10-07/report.json), `resources.peakRssMiB` | Timestamp **2026-10-07T02:39:08.557Z**. Two board evaluations, 48 candidate presentations, one completed simulation. Uses `process.resourceUsage().maxRSS / 1024`. No learning or transfer. |
   | **244.09765625 MiB** | [64-step response summary](../../../../runs/memory-retention-2026-10-31/eye-kc-response-v1-steps64/summary.json), `resources.maxRssMiB` | Directory date **2026-10-31**. Read-only response test with 64 steps and 18 samples. This directory has `rows.jsonl` and `summary.json`. Its manifest and exact invocation are **MISSING**. |
   | **250.8203125 MiB** | [native latency report](../../../../archive/early-development/research/reports/training-latency-2026-10-19/wasm-reuse-latency-v2/round0-nativeOriginal/report.json), `peakRssMiB` | Directory date **2026-10-19**. Native checkpoint/dependency latency comparison. This is another nearby value, with a different workload. No source links it to the chapter claim. |
   | **275.23046875 MiB** | [pathway summary](../../../../runs/engineered-memory-test-2026-11-03/pathway-trace-v1/summary.json), `peakRssMiB`; [manifest](../../../../runs/engineered-memory-test-2026-11-03/pathway-trace-v1/manifest.json) | Registered **2026-11-03**; manifest says `complete`. Read-only pathway trace; 273 passes. The runner records the largest RSS sampled at resource checks. It can miss a peak between checks. |
   | **330.46875 MiB** | [memory v2 summary](../../../../runs/engineered-memory-test-2026-11-03/engineered-memory-test-v2/summary.json), `peakRssMiB`; [manifest](../../../../runs/engineered-memory-test-2026-11-03/engineered-memory-test-v2/manifest.json) | Registered **2026-11-03**; manifest says `complete`. Engineered-memory comparison; 273 passes. This is also the largest RSS sampled at resource checks. It is not a 250 MB measurement. |

2. Keep the exact commands that are available. These are historical workload references. They were not executed for this note.

   The Monte Carlo report's [README](../../../../archive/early-development/research/reports/monte-carlo-neural-profile-v2-2026-10-07/README.md) gives:

   ```powershell
   node --max-old-space-size=256 .codebase/scripts/evaluation-and-performance/profile-monte-carlo-iteration.mjs --out research/reports/monte-carlo-neural-profile-v2-2026-10-07
   ```

   The pathway and memory v2 manifests record the executable and script argv. The executable is `C:\Users\ethan\AppData\Local\hermes\node\node.EXE`. Their registrations include the heap flag below. `process.argv` in those manifests does not itself preserve that Node flag.

   ```powershell
   node --max-old-space-size=256 .codebase/scripts/neural-learning/run-pathway-trace-v1.mjs --config "python actions/pathway-trace-v1-step.json" --cpu-duty 0.5
   node --max-old-space-size=256 .codebase/scripts/neural-learning/run-engineered-memory-test-v2.mjs --config "python actions/engineered-memory-test-v2-step.json" --cpu-duty 0.5
   ```

   Registrations: [pathway step](../../../../python%20actions/pathway-trace-v1-step.json) and [memory v2 step](../../../../python%20actions/engineered-memory-test-v2-step.json). Their current files are paused. The manifests preserve the run's registration hash and input/source pins. Current files alone are not proof of unchanged historical command bytes.

3. Convert the nearby values before using the word MB. **ESTIMATE, unit conversion of recorded values:**

   ```text
   244.09765625 MiB x 1,048,576 / 1,000,000 = 255.954944 MB
   250 MB / 1,048,576 x 1,000,000 = 238.418579 MiB
   250 MiB x 1,048,576 / 1,000,000 = 262.144 MB
   ```

   A 244.098 MiB result can be described as about 256 MB for that response test. It cannot identify which run the chapter means. A 256 MiB Node heap setting is also not measured RSS. Typed arrays and other process memory can sit outside that heap.

## 8. Record the evidence correction

1. **Dated correction, 2026-11-04:** the chapter plan joins a memory estimate and an approximate process-memory claim. The checked evidence does not establish a measured compression from 64 GB to 250 MB. The calculation above replaces that unsupported inference with separate estimates and recorded measurements. The original planning sentence is preserved.
2. Use this bounded statement in future drafting: "For 134,209 neurons, one dense float32 connection matrix would contain 72.048 GB of values. The graph loader instead uses about 23.691 MiB for its basic sparse graph arrays, before state and other process memory. Recorded whole-process memory depends on the workload. The original 64 GB estimate and the run behind the approximate 250 MB figure still need provenance."
3. This is a storage comparison. It is not evidence of equal simulation results, faster Monte Carlo, biological validity, learned chess skill, or transfer. No brain simulation, training, or graph experiment ran for this calculation.

## Still missing

1. **MISSING: the original 64 GB calculation.** Recover the dated note or message. It must state the neuron count, bytes per value, dense or sparse layout, retained buffers, and simultaneous rollout count. Otherwise label 64 GB as an unverified historical estimate.
2. **MISSING: the exact command for the about 250 MB claim.** Identify the intended run first. Recover the full executable, Node flags, script arguments, working directory, input/source hashes, and workload bounds. The nearby 244.098 MiB response test has no saved command in its run directory. Do not invent one from its folder name.
3. **MISSING: a peak RSS tied to that exact command.** Recover a whole-process high-water RSS record that includes graph loading and the full stated workload. Report bytes and MiB, with the measurement method. A sampled maximum must be labelled as sampled. If this evidence does not exist, a separately approved measurement is needed after the active graph experiment ends. This note does not authorize that run.

## Addendum, 2026-11-04: one measured full-graph run (not the 250 MB run)

**MEASURED.** The memory v4 dry run loaded the full 134,209-neuron graph and made 1,705 read-only brain passes of 8 steps. Peak RSS: **279.2 MiB** (292.8 MB), sampled by the runner's resource guard at every pass and combined with `process.resourceUsage().maxRSS`. Wall time 8 min 40 s.

Exact command (repository root, Node v22.23.2):

```
node --max-old-space-size=256 .codebase/scripts/neural-learning/run-engineered-memory-test-v4.mjs --config "python actions/engineered-memory-test-v4-dryrun-step.json" --limit-positions 24 --cpu-duty 1
```

Run folder: `runs/engineered-memory-test-2026-11-04/v4-dry-run-limit24/` (`manifest.json` has the argv, pins, start and end times; `summary.json` has `peakRssMiB`). This is a different workload from the one behind "about 250 MB" (it also holds a 33 MiB Kenyon-cell cache and the memory stores). It shows that a full-graph simulation runs in about 280 MiB on this laptop. Items 2 and 3 above stay open for the original claim. The full v3 run, with all 21,054 passes cached in memory, peaked at 1,058 MiB (`runs/engineered-memory-test-2026-11-03/engineered-memory-test-v3-r2/summary.json`).

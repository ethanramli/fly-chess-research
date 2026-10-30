# Exact frame reuse candidate v1

Prepared2026-10-19; untested and unadopted. No measured speedup.

This isolated candidate reuses a row's complete activity and next-state values
only when its drive, alpha, saturation, own previous value and every incoming
previous value are exactly equal to a private reference. All other rows use the
original CSR order, f64 multiply/add, typed assignment and `Math.tanh`.

The caller explicitly labels corresponding episode frames with `reuseSlot`;
assessment calls use the original full computation. References update after a
successful forward and are disposable engineering state. They do not enter
memory checkpoints or biological claims. Full histories remain available for
local learning and derivatives.

Topology and signed weights remain mutable: topology changes clear references;
each forward compares every signed weight against a shared canonical vector.
Rows whose current or reference weights differ from that vector are always
recomputed. Current drive/alpha account for changed stimulation, input,
bias/leak parameters. Readout is always recomputed. History dtype changes clear
references. No thresholds, graph pruning or approximate delta summation.

The cache has a256MiB bound, counts its typed storage in `allocatedBytes()`, and
falls back to the complete original computation when a slot/storage is
unavailable. At134209 neurons/2700513 edges, one19-frame reference set and its
shared canonical/topology/work arrays would use about219million bytes, before
the model's ordinary allocations; actual RSS remains a required measurement.

## Verification order

Wait for the current full-graph observer to finish; never duplicate it.
Then use [the pinned check configuration](../../../../python%20actions/exact-frame-reuse-checks-v1.json):

```powershell
.\fly.cmd --config 'python actions/exact-frame-reuse-checks-v1.json' run exact-check
.\fly.cmd --config 'python actions/exact-frame-reuse-checks-v1.json' run math-regression
.\fly.cmd --config 'python actions/exact-frame-reuse-checks-v1.json' run candidate-fixtures
.\fly.cmd --config 'python actions/exact-frame-reuse-checks-v1.json' run candidate-lessons
.\fly.cmd --config 'python actions/exact-frame-reuse-checks-v1.json' run candidate-recovery
```

Direct checks compare the original trainer and candidate in Float32/Float64 at
1/8/40 steps, with full histories, gradients, updates and mutations. A separate
test-only loader labels actual episode frames and propagates into fresh resume
children; original source files remain unchanged. The existing paired lesson
fixture exercises actual informative feedback and controls against archived
receipts and native/legacy publications. Software durations are not graph speed
results. Failures must be preserved and recorded before a replacement version.

After software/recovery gates, register a matched full-graph pipeline comparison
with both warm/cold costs, per-phase attribution and original resource/pacing
guards. Counts from the causal observer are feasibility evidence only. Final
acceptance still needs a complete defined curriculum before/after and adoption;
selected lessons alone cannot establish that result.

[Journal and pivots](../../../journal/experiments/2026-10-19-training-latency.md)
· [Current handoff](../../../../documentation/handoffs/training-latency-state.md)
· [Source-backed motivation and limits](../../../literature/training-latency-techniques-2026-10-19.md)


## 2026-10-19 15:28 software verification addendum

Direct equivalence3/3; npm test255/255; candidate trainer/temporal fixtures8/8; actual paired feedback/publication fixture1/1 (seven lesson pairs/294 presentations); propagated fresh-process pending/ack recovery2/2. Timing arithmetic4/4 and runner syntax pass. Raw log identities and scope are in the dated journal. A separately registered same-Node26/native ABBA ablation is ready; no graph speed result or adoption yet. This supersedes the pre-execution untested status above.

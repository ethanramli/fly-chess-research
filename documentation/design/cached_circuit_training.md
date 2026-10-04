# Candidate for reducing CPU training cost

2026-09-29. Boundary-corrected prototype now implemented and checked; whole-model time-to-quality improvement remains unproven.

## First measured result

`src/lowram/circuit.mjs` implements a local surrogate with cached outside activity and outside adjoint forces. Ten tests now pass, including exact anchor-gradient agreement on directed loops that leave and re-enter the circuit, finite differences away from the anchor, and rollback after a nonfinite update. These checks validate the local mathematics and implementation, not chess reasoning.

On two training positions, the same 4,096-neuron block contains 289,037 trainable connections (10.7% of the released graph). Twelve local updates, including block setup, the full-gradient anchor and a full-model verification, took 2.92–3.19 seconds. Twelve exact updates of the **same block parameters** took 6.41–6.53 seconds. The observed ratio was 2.05–2.19x, with similar small training-loss reductions and process peak RSS at most 221.2 MiB. Anchor relative gradient error was approximately 1.5e-7. See [the full measurement](../reports/circuit-feasibility.json).

This is a same-block microbenchmark. It does not compare against unrestricted full-parameter training, establish a benefit across circuit rotations, measure held-out generalization or justify a 2x whole-project claim. Both examples come from one training game family. Reproduce with `npm ci`, `npm run fetch:graph`, `npm test`, and `node scripts/benchmark-circuit.mjs`.

## Recommendation

### First complete rotation result

The 72-pair `cached-hybrid` pilot visited all 33 blocks, completed 864 local steps plus 72 exact all-parameter updates, and reached a process peak of 264.52 MiB. Its final validation loss was 0.074580, compared with 0.074886 after 72 exact updates alone. Hybrid training plus final validation took 287.94 seconds; the two exact segments together took 83.58 seconds, including their final validations and excluding their initial validations. These are unequal-cost endpoint comparisons, not time-to-quality measurements. The modest endpoint improvement does not justify a speedup claim. The simple rotation remains experimental, and exact sparse training remains the baseline. See [run summaries](../reports/rotating-circuit-epoch1.json).

Investigate **local circuit training with cached forward and backward messages, corrected by periodic full-connectome passes**. Start all learned weights from scratch. Use position-criterion and changed-position losses. Keep the released topology and all its signs; rotate training across circuits rather than permanently discarding most of the brain.

This addresses the remaining cost of full-brain computation. The already measured sparse kernel is the reference implementation and fallback for accurate gradients. Its 130 MiB engineering measurement does not establish the cache method's cost or chess learning ability.

## Closest research, and what it actually supports

The search requested 23 results across three angles: historical-message reuse, online recurrent learning, and block/subgraph optimization. A follow-up query sought the nearest predecessor. These are retrieved results, not 23 independent validated studies; duplicate versions and less relevant results were excluded from the recommendation.

| Primary source | Relevant result | Transfer limitation |
|---|---|---|
| [Local Message Compensation (LMC)](https://arxiv.org/html/2302.00924) | Compensates omitted forward and backward messages during subgraph training; analyzes convergence in its GNN setting. | The inspected formulation assumes an undirected graph and node-level predictions. Our graph is directed, has per-edge parameters tied across recurrent time, and receives a different board on each example. Its guarantee does not automatically apply. |
| [GNNAutoScale](https://proceedings.mlr.press/v139/fey21a.html) | Uses historical embeddings to reduce repeated message computation while analyzing approximation error. | A hidden state from board A is not a hidden state for board B. Caches must be keyed by position, timestep and parameter version. |
| [REST: Haste Makes Waste](https://proceedings.mlr.press/v267/xue25e.html) | Analyzes stale historical features and improves refresh scheduling for graph training. | Fast local updates can still be a bad bargain if stale context slows convergence. Refresh cost must be counted. |
| [e-prop](https://www.nature.com/articles/s41467-020-17236-y) | Online local eligibility traces approximate recurrent credit assignment. | The paper explicitly describes slower learning than BPTT. Lower storage is not proof of lower CPU time to equal accuracy. |
| [SparseProp](https://arxiv.org/html/2312.17216v1) | Event-based sparse spiking simulation avoids scanning all neurons at every spike in the models studied. | Its large speedups compare spiking simulators, not this eight-step rate model. Changing neuron dynamics and measuring the spike budget would be required. |

No source reviewed demonstrates from-scratch strategic chess learning on a full fly connectome under 3 GB. Do not quote GNN or spiking benchmark speedups as measured FlyChess improvements.

## Concrete proposed algorithm

### Implemented paired extension

`src/lowram/paired-circuit.mjs` owns separate circuit caches for both positions in a pair. It uses the same absolute-position plus position-difference objective as `PairedTrainer`. For each position, its anchor stores outside adjoint forces computed with that position's derivative of the joint pair loss. Each local iteration recomputes both circuit trajectories and the joint readout loss, then adds both cached boundary corrections. The summed local gradients update the shared block once. A full evaluation of both positions accepts the burst only when the actual pair loss has not increased; otherwise all block parameters are restored.

For a block B and pair members p, the local surrogate is:

`L_pair(pred_A_local, pred_B_local) + sum_{p,t,i in B} force[p,t,i] * (h_local[p,t,i] - h_anchor[p,t,i])`.

The forces sum each outgoing boundary weight times the outside receiving neuron's anchor preactivation adjoint at the next timestep. This restores the omitted first-order outside contribution at the anchor. It does not make the frozen outside trajectories exact after an update. Acceptance on one training pair does not establish improvement on other positions.

Run `node --max-old-space-size=256 scripts/benchmark-paired-circuit.mjs` for the bounded same-block comparison. This extension still fixes the readout and outside parameters during each burst.

The `cached-hybrid` mode in `scripts/train-pilot.mjs` now performs an exact all-parameter update before each cached burst, so the readout and every internal parameter remain trainable. It rotates over a deterministic partition of all 134,209 neurons into 33 blocks of at most 4,096 neurons. Incoming-neighbor packing favors nearby nodes but does not guarantee connected blocks or minimize the boundary. Isolated and remaining nodes are included. The completed pair count determines the next block and is checkpointed. Each pair gets fresh caches; outside parameters are unchanged during the local burst. Larger working sets and a measured whole-training time-to-quality advantage remain unproven.

1. Partition neurons into graph-connected blocks, minimizing cross-block edges. Do not assume biological cell classes are computationally independent. Count all incoming/outgoing boundary edges in a block's cost.
2. Select a small working set, initially 16 positions (eight comparison pairs). Run exact full forward and backward passes. Store each position's time-indexed activity, boundary messages and error information.
3. Hold the current external messages approximately fixed while updating one selected circuit for a few steps. Recompute that circuit's dynamics and local derivatives; compensate incoming error contributions using historical backward messages, following LMC's motivation. Bound parameter changes. This is an approximate update, not exact backpropagation.
4. Rotate the active circuit. Reserve coverage for every block instead of repeatedly choosing only the easiest output-adjacent blocks. Evaluate whether gradient-informed block selection beats a fixed rotation at equal time.
5. Recompute the full brain after a bounded number of local steps, initially five. Measure true training loss, prediction drift and sampled gradient alignment. Reject a harmful candidate cycle, restore its weights, shorten the local burst and refresh the cache. Compare against exact updates on the same training examples.
6. Expire caches when examples leave the working set. Admit new pairs and spaced rehearsal examples without caching the whole corpus. Freeze validation families separately; final test examples must never populate the training cache or guide acceptance.

A frozen outside weight is not a frozen outside activation: a circuit's changed output can return through recurrent loops. The implemented surrogate adds cached outside adjoint forces to the local loss. Its gradient agrees with the full gradient at the anchor, including directed loops that leave and re-enter the block. Away from that anchor it is approximate, so bounded bursts and full-loss checks remain necessary. This does not establish equivalence to LMC or inherit its convergence guarantees. One-pair supervision and rotation are implemented; larger working sets remain to be implemented.

The cache's cost is bounded by the number of active examples, not all training data. For 16 positions, 134,209 neurons and eight recurrent steps, caching nine states, eight activations and nine adjoint arrays in float32 costs approximately 213 MiB. Add the existing model, graph, reusable gradients, block indices, rollback buffers and runtime overhead. A 512 MiB planning allowance is plausible but **not a measured peak or a hard guarantee**. Begin with fewer positions if free RAM is low.

## Where a speedup could come from

Let f be the actual measured local-step cost divided by a full update, K the number of local steps in a cycle, and A the cost of full refresh/verification expressed in full-update equivalents. An idealized computation ratio is:

`cost saving factor = K / (A + K*f)`

For illustration only, f=0.05, K=20 and A=2 give 6.7x less computation per cycle than 20 full updates. This is not a prediction of 6.7x faster learning. Boundary work, dense input projections, rejected cycles and cache maintenance can make f or A much larger. More local iterations may be required to reach the same accuracy.

The win criterion is **wall-clock time to the same held-out evaluation quality**, including refreshes, failures, labels and validation, under a peak-memory cap. Counting updates or showing a faster inner loop is insufficient.

## Novelty and falsification

Caching graph states, compensating messages and block training are existing methods. A potential contribution is a directed, recurrent connectome adaptation with criterion-specific learning signals, bounded cache drift and position-pair supervision. Novelty is unestablished; successful transfer and measured savings are unestablished.

Before a long experiment:

- Compare approximate and exact gradients on small directed recurrent graphs, including cycles that leave and re-enter a block.
- Measure boundary size and actual local/full cost on the released connectome. If most blocks touch most of the graph, reject this partition-based acceleration.
- Run matched from-scratch exact and cache-based training on development data, with equal initialization and the same information available to each.
- Require an observed time-to-quality improvement across seeds; retain exact sparse training if the approximate method does not win.

This is the most promising candidate from this search for keeping the present rate-model formulation while reducing whole-brain passes. It is a research-backed route to test, not a discovered guaranteed breakthrough.

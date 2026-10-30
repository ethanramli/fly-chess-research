# Supervised baseline: sparse training within laptop memory limits

Date: 2026-09-29. Status: **training-kernel feasibility measured; chess learning and transfer not demonstrated.**

## Decision

Train a position evaluator from scratch through the released connectome, with explicit criterion targets and related-position comparisons. Use serial gradient accumulation and a fused sparse backward pass. Budget *position passes and elapsed time*, not just epochs. Do not import a trained chess checkpoint.

The researcher explicitly rejected pretrained weights on 2026-09-29. The reason for studying transfer is that familiar-position performance may not survive unfamiliar play; memorization by the reference model has not been established by a controlled test here.

The RAM problem has a concrete solution. Whether the resulting evaluator can learn useful strategic reasoning with a small CPU budget remains an experimental question. Smaller RAM use cannot guarantee sample efficiency or playing strength.

For the subsequent request for an algorithmic breakthrough in CPU cost, see [the cached-circuit proposal and prior-work review](cached-circuit-training.md). It is an unverified acceleration candidate; its speed and convergence claims are separate from the measured exact kernel.

## What was actually measured

Run `npm run fetch:graph`, `npm test`, then `npm run benchmark` with Node 22 or newer. No packages, GPU, Python environment, or paid services are needed for these commands. The download is approximately 40 MB, cached locally and checked against a pinned SHA-256.

The [machine-readable measurement](../../../archive/early-development/research/reports/lowram-feasibility.json) records a real run on this laptop, an i5-10210U with about 7.6 GiB installed RAM:

| Quantity | Observed |
|---|---:|
| Neurons in the released graph | 134,209 |
| Directed neuron-pair connections | 2,700,513 |
| Recurrent steps per position | 8 |
| Trainable parameters | 5,603,747 |
| Criterion outputs | 8 |
| Persistent numeric arrays, including graph and gradients | 77.72 MiB |
| Peak resident memory of benchmark process, including graph loading | 130.01 MiB |
| Median forward + backward + update | 0.648 seconds |
| Connections with changed magnitudes after 20 updates | 1,331,951 |
| Artificial-target loss, before / after | 0.03037 / 0.001984 |

This used the actual released graph, a starting-board input, and **one arbitrary target vector**. Fitting it is an engineering test, not evidence of chess skill, generalization, or a validated eight-criterion rubric. Peak memory is process RAM, not total system RAM. Only roughly 1.2–1.6 GiB was free during inspection/measurement. The soft memory guard checks between updates; Node's heap flag does not cap typed-array memory or provide an operating-system hard limit.

The graph already embodies the upstream release's connection threshold and selected neurons. This implementation removes no further neurons or edges. It is not an unthresholded reconstruction of every biological synapse.

## Why the usual recipe is expensive

The audited upstream default uses batch size 256, two data workers, AdamW, and a GPU. Its sparse implementation already avoids dense adjacency gradients; merely proposing sparse storage would not be a new solution. Its gather fallback can still create large edge-chunk-by-batch intermediates. See the pinned [configuration](https://github.com/cesp99/fly-chess/blob/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/configs/default.yaml) and [sparse backward implementation](https://github.com/cesp99/fly-chess/blob/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/flychess/model/spmm.py).

For N=134,209, T=8 and B=256, just one float32 N-by-B state at each step is about 1.02 GiB. Saving both states and nonlinear activations doubles that before gradients, optimizer state, temporary gathers, or data loading. By contrast, with one position, all T+1 states plus T activations cost about 8.7 MiB.

Reducing the number of trainable parameters alone does not eliminate the cost of propagating activity through the graph. Low-rank adapters, local learning, or gradient-free perturbations need a measured compute case; they are not automatic fixes.

## The memory algorithm

`src/lowram/trainer.mjs` is a working reference kernel, not yet a dataset trainer or a replacement for all versions of the upstream simulator.

Store the graph as CSR with rows = receiving neurons, one int32 sending-neuron index per connection, and fixed signs. All model arrays and gradients use float32 in the actual benchmark. For one position:

1. Encode the board and compute the trainable sensory projection once.
2. Run T recurrent steps, keeping neuron states and activated rates only.
3. Predict criterion values from the designated output neurons.
4. Traverse recurrence backwards, calculating each connection's gradient and scattering the preceding-state derivative in the same edge loop.
5. Accumulate into one reusable parameter-gradient buffer. Repeat for the effective batch, then average, clip, and update once.

No graph transpose, edge-by-batch tensor, dense adjacency, concurrent training worker, or full-dataset tensor is required. Parameters stay fixed throughout the accumulated batch, so its gradient is the batch-mean gradient, apart from float32 accumulation order. Increasing the effective batch increases elapsed time, not saved activation memory. The gradient is not truncated at each recurrent step.

For receiving neuron j and sending neuron i, with connection e=(i,j):

```
z[t,j] = bias[j] + sensory(x)[j] + sum_e sign[e] * magnitude[e] * h[t-1,i]
r[t,j] = S * tanh(max(0, z[t,j]) / S)
h[t,j] = (1-a[j]) * h[t-1,j] + a[j] * r[t,j]
a[j] = sigmoid(leak[j])

dMagnitude[e] += dz[t,j] * sign[e] * h[t-1,i]
dh[t-1,i]     += dz[t,j] * sign[e] * magnitude[e]
```

The backward pass skips an edge row only when its upstream derivative is **exactly zero**, not below an arbitrary cutoff. Projected SGD keeps magnitudes positive, preserving fixed signs and topology. Biases, leak logits, sensory projection and criterion head are also trained. The kernel uses row-normalized log synapse counts as anatomical initialization, and fresh seeded random input/output weights. This is from-scratch learning with an anatomical prior, not random topology or a pretrained policy.

These choices define a rate model with saturating activation and a linear criterion head. They do **not** reproduce a Brian2 spiking simulator or claim numerical parity with the newer upstream retina/neuromodulation models. The head predicts assessments rather than thousands of move classes because position evaluation is the specified learning task.

With P trainable values and E connections, resident numeric storage is approximately `8P + 9E + 4N(2T+7)` bytes, plus row pointers, IO indices, small outputs and runtime overhead. Here 9E includes indices, signs and the original synapse-count array; weights and gradients are already in P. Optimizer momentum would add 4P bytes; Adam's two moments add 8P. The new exact Adam path adds approximately 42.7 MiB for the two-output model and stores both moments in resumable v2 checkpoints. At T=8, activation checkpointing adds computation to save only a few MiB and is unnecessary for the measured serial implementation.

Five tests cover numerical derivatives for every parameter family on a small independently finite-differenced model, gradient accumulation, core learning/sign preservation, allocation reuse, and a frozen-core control. A full-graph test separately checks memory, nonzero core updates and fixture-loss reduction. These tests do not validate the scientific hypothesis.

## The learning algorithm: spend passes on distinctions

The proposed research contribution is **criterion-supervised learning from controlled position changes under a fixed compute budget**. It is a hypothesis about sample efficiency and transfer, not a claim to have invented sparse backpropagation, curriculum learning, or counterfactual examples.

For example, compare positions with the same material where a defender can versus cannot move because of a pin. Include matched examples where the apparent pin is irrelevant or another defender remains. A useful evaluator must distinguish those cases, including unfamiliar piece locations. Legal moves from related parent positions are preferable to arbitrary edits that can create illegal boards. All descendants and interventions from one source family must share a split.

Use three kinds of supervision, with explicitly frozen definitions:

- **Absolute assessments:** normalized, separately labeled criteria such as material, loose pieces, king exposure, mobility and pawn structure. Each needs an operational definition, perspective, scale and reliability check before becoming a target. They are candidate criteria, not an approved rubric.
- **Changed-position assessments:** predict which criteria changed, their direction, and which stayed stable. Example loss: `Huber((f(x')-f(x)) - deltaTarget)`, with masks for unavailable labels. Do not assume only one criterion changed merely because one piece moved.
- **Tactical outcome checks:** forced short sequences with verified outcomes. Predict consequences and distinguish tempting material gains from losing tactics. This supplies evidence about decision-relevant evaluation beyond reproducing easy static formulas.

Add an absolute loss to difference losses; otherwise a constant offset is unidentified. Differences use one fixed color perspective or explicitly convert side-to-move outputs before subtraction. A pair costs at least two position passes. Keeping two activation tapes would add roughly 9 MiB for this model and avoid replaying forwards; the current prototype implements ordinary criterion MSE only, **not** the pair objective yet.

Do not call a vector of predicted criteria "reasoning" solely because it is interpretable. Operational evidence requires correct responses to changed premises, held-out tactical consequences and unfamiliar combinations. Search, if later used to compare moves, is additional reasoning computation and must be reported separately. A chess rules library supplies legal moves; it must not secretly choose moves using a teacher engine.

## A CPU budget that can be tested

Count every presentation, repetition and member of a pair. At the measured short-run median:

| Position passes | Optimistic projected training time |
|---|---:|
| 5,000 | 0.9 hours |
| 10,000 | 1.8 hours |
| 50,000 | 9.0 hours |
| 58 million | 435 days |

These are extrapolations, not measured job durations. Diverse boards, thermal throttling, the chosen objective, validation, checkpointing, preprocessing and teacher labeling add cost. Training for ten epochs on 5,000 pairs means 100,000 position passes, not 5,000.

Proposed first study schedule:

1. Freeze a small pilot rubric and group-disjoint development splits. Keep the final transfer families untouched. Validate generated positions and labels independently.
2. Start with a **5,000-pass pilot**, including balanced simple and difficult examples. Measure actual throughput and validation improvement per 1,000 passes. Run core-frozen and ordinary sampling controls from the same initialization; extra conditions cost extra passes.
3. For adaptive sampling, test an initial 40% current errors, 30% new examples and 30% spaced rehearsal mixture against uniform sampling at equal pass budgets. These percentages are a preregisterable starting hypothesis. Prioritize errors only inside the training split; use bounded scores/IDs on disk, not a resident replay tensor.
4. Advance only if held-out-family performance improves beyond constant-target and frozen-core controls. If training loss improves while transfer stalls, revise examples, labels or representation before adding more epochs. Rule-generated labels alone need not require a connectome; include a small ordinary evaluator as another baseline.
5. If the pilot justifies it, reserve **50,000 total position passes per condition/seed**. Three conditions and three seeds at that budget imply about 81 optimistic CPU hours before evaluation, not one evening. Run resumable sessions and maintain a cumulative budget.

Precompute labels and legal transitions on disk. Do not regenerate them every epoch. Cache raw encodings and immutable labels; do **not** reuse hidden states or predictions across weight updates as if they were still valid. If an engine supplies a subset of targets, pin its version and bound its threads/hash/node count, generate labels in a separate phase, and count that CPU budget. Model weights still start from scratch, but the supervision is then engine-derived and must be identified as such.

Avoid large self-play/MCTS generation until the evaluator passes the pilot. Search multipliers can dominate training cost: 100 neural evaluations per move are 100 forward passes, not one sample. No playing-strength promise follows from the RAM benchmark.

## What remains before a real learning claim

### Optimizer comparison after one development epoch

### Coverage-pilot result

The expanded dataset contains 169 training pairs, 56 validation pairs and 55 untouched test pairs across disjoint game families. Its integrity audit checked legal parent/child relationships, cross-split family and position separation, target shapes, file checksums and material labels. One paced Adam epoch processed all 169 pairs in 486.33 seconds with 174.53 MiB peak RSS. Validation MSE was 0.068923 for material and 0.083037 for capture, compared with training-mean constant MSE of 0.074113 and 0.102572. Pair-difference MSE was 0.055689 and 0.090555, compared with constant pair-difference MSE of 0.058524 and 0.096560.

At family level, material pair-difference MSE beat the constant baseline in all 8 validation families; capture did so in 5 of 8. Against a side-to-move-only baseline, material beat it in all 8 families and capture in 7 of 8. These are descriptive counts on related random-game positions, not statistical significance or strategic transfer. The capture-label audit remains incomplete, and the final test split has not been used for model selection. See [dataset audit](../../../archive/early-development/research/reports/coverage-pilot-v2-audit.json) and [family summary](../../../archive/early-development/research/reports/coverage-family-summary.json).

After freezing the checkpoint, a separate one-pass evaluation read all 55 reserved test pairs from 8 unseen game families. The resulting raw MSE was 0.032032 for material and 0.040906 for capture; pair-difference MSE was 0.022159 and 0.109845. No test score was fed back into training or selection. Because the report lacks an independently calculated test baseline and the capture-label audit is incomplete, this is a reproducible held-out measurement rather than a successful transfer claim. See [test report](../../../archive/early-development/research/reports/coverage-test-evaluation.json).

The capture-label audit is now complete at the implementation level: an independently written material calculation and capture/recapture traversal matched all 560 generated target values across train, validation and test. It retained chess.js for legal move generation, so it does not independently validate chess.js itself or the scientific value of the bounded target. See [capture audit](../../../archive/early-development/research/reports/coverage-capture-label-audit.json).

The inverse-variance follow-up used weights 1.464577 for material and 0.535423 for captures, derived only from training labels. With otherwise matched shuffled Adam settings, final validation loss was 0.072733. Material pair-difference MSE improved to 0.027415, while capture pair-difference MSE rose to 0.076676, slightly worse than its constant baseline. This option also trades one criterion against another and is not promoted as a general improvement. Peak RSS was 172.62 MiB. See [criterion-balance comparison](../../../archive/early-development/research/reports/criterion-balance-epoch1.json).

A saved-checkpoint evaluation of the initial chess position ran successfully but predicted about -0.11794 for material/16 and +0.69904 for signed capture gain/9; both rule-defined targets are zero. This is direct evidence that the small pilot does not yet provide reliable position evaluation. Do not confuse the working training/inference path with a trained chess engine. See [raw evaluator output](../../../archive/early-development/research/reports/checkpoint-start-position.json).

The bounded-shuffle follow-up used the same initialization, Adam learning rate and 72-pair count with buffer size 24. Peak RSS was 172.82 MiB; measured process CPU time between start and finish events was 89.02 seconds over 182.08 elapsed seconds with duty 0.5. Aggregate validation loss improved to 0.068740, but material MSE worsened from 0.027458 to 0.062765 while capture MSE improved from 0.168919 to 0.109518. Pair-difference MSE was 0.028991 for material (worse than the constant baseline) and 0.073686 for captures. This is an uneven tradeoff, not an across-criterion improvement or a time-to-quality win. Preserve per-criterion gates and inspect target balance before promoting this option. See [shuffle comparison](../../../archive/early-development/research/reports/shuffle-comparison-epoch1.json).

The 169-pair coverage pilot provides a larger resource check. One resumed second epoch completed 338 total updates in 773.4 seconds with bounded shuffle and `--cpu-duty 0.5`; peak process RSS was 175.4 MiB. Validation loss changed from 0.074551 after epoch 1 to 0.073817 after epoch 2, but the frozen test split moved from material/capture MSE 0.032032/0.040906 to 0.039981/0.034796. Because the criteria trade off, the first epoch remains the selected checkpoint under the rule “improve validation without sacrificing a criterion”; epoch 2 is retained as an audit artifact, not promoted. This demonstrates that the serial sparse Adam path fits comfortably under the laptop memory budget, while useful chess generalization remains unresolved. See [epoch 2 test evaluation](../../../archive/early-development/research/reports/coverage-test-epoch2.json).

The exact Adam run (`runs/adam-paced-001`, seed 47, learning rate 0.001, CPU duty 0.5) completed 72 pairs at 172.92 MiB peak RSS. Training plus final validation took 158.84 seconds including pacing. Validation loss was 0.074709, versus 0.074886 for exact SGD and 0.074580 for the more expensive rotating-cache hybrid. These are endpoints at different elapsed times and optimizer settings, not matched time-to-quality results.

Adam's criterion pair-difference MSE values were 0.027948 and 0.074510, compared with training-mean constant predictions at 0.028646 and 0.076646. The approximately 2.4% and 2.8% reductions are modest development evidence. They do not establish strategic evaluation, seed robustness, internal-circuit necessity or final-test transfer. The final checkpoint contains all seven parameter arrays, fourteen Adam moment arrays and optimizer step 72. Resuming from step 24 reproduced the uninterrupted step-72 endpoint: actual file sizes and SHA-256 checks matched across all 21 arrays, optimizer/config/cursor metadata matched, and validation metrics matched exactly. This checks this fixed-order run on the current backend; shuffled-order resume remains unverified. See [comparison report](../../../archive/early-development/research/reports/optimizer-comparison-epoch1.json) and [resume evidence](../../../archive/early-development/research/reports/adam-resume-equivalence.json).

- Finalize the criteria, comparison labels and held-out intervention families.
- Streamed input, paired losses, resumable SGD/Adam checkpoints and bounded validation are implemented. Masked labels and the complete rubric remain outstanding.
- Run the diverse-position pilot; report throughput distributions, memory and transfer for all controls/seeds.
- Establish whether gains come from internal adaptation rather than the head, easy target formulas, teacher answers, source-family leakage or search.

The current result resolves whether full released-graph gradient updates inherently require several GB: they do not. It does not yet resolve how much strategic evaluation this architecture can learn in the available hours.

## Sources and novelty boundary

- [Kingma and Ba, Adam](https://arxiv.org/abs/1412.6980): the adaptive optimizer is established prior work. Its inclusion is a stronger optimization baseline, not a proposed contribution.

- Audited source revision: `cesp99/fly-chess@3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf`; [rate model](https://github.com/cesp99/fly-chess/blob/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/flychess/model/flybrain.py). All code in this workspace's prototype was independently written. No pretrained weights were loaded.
- Graph artifact: [pinned Hugging Face revision](https://huggingface.co/cesp99/fly-chess/blob/cad733198a14d76a35149ecbe5f68bc6efa97732/graph/full.npz), SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`. Derived graph terms are identified upstream as CC BY-NC 4.0. The cache is ignored by Git. Cite FlyWire's [Dorkenwald et al.](https://doi.org/10.1038/s41586-024-07558-y) and [Schlegel et al.](https://doi.org/10.1038/s41586-024-07686-5) in research using it.
- [Chen et al., Training Deep Nets with Sublinear Memory Cost](https://arxiv.org/abs/1604.06174): recomputation/checkpointing is established prior work.
- [Malladi et al., Fine-Tuning Language Models with Just Forward Passes](https://arxiv.org/abs/2305.17333): memory-efficient zeroth-order optimization exists; this is not evidence it would be more sample-efficient for a randomly initialized fly evaluator.
- [McGrath et al., Acquisition of Chess Knowledge in AlphaZero](https://pmc.ncbi.nlm.nih.gov/articles/PMC9704706/): concepts and behavioral analysis are relevant precedents; reproducing a concept label is not by itself proof of reasoning.

The searches here are targeted feasibility research, not a systematic novelty review. The proposed combination and its equal-compute transfer test may be a useful study; publication novelty has not been established.

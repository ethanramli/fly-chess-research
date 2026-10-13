# FlyChess project instructions

Consolidated 2026-10-06. Keep this file focused on stable instructions. Use [current status](documentation/current-status.md) for experiment outcomes and [documentation navigation](documentation/README.md) to locate designs. Historical instructions are preserved in [the journal archive](research/journal/archive/README.md).

## Ponytail default

This repository operates under ponytail mode by default: use the laziest solution that actually works, prefer the existing codebase over added abstractions, and remove speculative complexity before adding new code. The default intensity is full; do not add dependencies, wrappers, or scaffolding that the task does not require.

- Read the actual call path before patching; fix it at the shared root cause, not in each caller.
- Prefer existing helpers, stdlib functions, and native patterns before custom implementations.
- Delete speculative code and unnecessary abstraction before adding anything new.
- The smallest correct patch wins, but not at the cost of a wrong root-cause fix.
- If a change is not needed for the active experiment or bug, do not add it.

## Objective and boundaries

Build a from-scratch connectome-constrained simulation that learns chess through experience and independently verified feedback on a laptop with about 8 GB total RAM and sometimes only 3 GB available. Preserve released neuron identities, graph topology and fixed sign conventions. The teacher supplies experiences and consequences; lasting adaptation must arise through an explicitly modeled, biologically justified mechanism inside the simulation. Do not substitute pretrained chess fine-tuning, supervised criterion fitting or external search for this objective.

The user-confirmed overarching question (2026-10-10) is: **Could a simple organism achieve reasoning?** This project uses a Drosophila-connectome-constrained computational model and chess to test whether experience-dependent plasticity supports consequence-sensitive evaluation and transfer across unfamiliar chess positions and counterfactuals. Chess is a testbed for transferable reasoning; success within chess does not alone prove reasoning across domains or cognition in a living fly. The user's longer-term playing-strength target is 2000 Elo with an evaluation and style shaped by the model's own learning. That is a distinct aspiration, not a current capability or prerequisite for the first causal transfer result.

Read [feedback-learning direction](documentation/design/research-goals/feedback-learning.md) and [scientific contribution](documentation/design/research-goals/scientific-contribution.md). Puzzles are the initial learning stage, not the whole research question. Human comparison may assess a later performance claim but does not replace the causal transfer question. Both symbolic chess encoders bypass modeled eyes; natural visual perception is unimplemented.

The researcher's engineering sequence remains **working puzzle-and-feedback learning round -> latency optimization -> scaling**. The first round tests a prerequisite for the overarching reasoning/transfer question; it does not redefine it as puzzle solving. Useful chess-learning and transfer gates remain unmet. Future snapshot tracking, Stockfish-calibrated Elo evaluation and pondering are accepted designs. A calibrated 2000-Elo result is a long-term playing-strength target; Elo alone does not establish reasoning. Repeated moves, changed gains, event counts and successful external search do not establish reasoning. Neither short-run failures nor more training automatically establish universal incapacity or a cure.

When an independently audited evaluation first demonstrates transferable reasoning under the project's predefined disjoint and counterfactual gates, celebrate by saying **"EUREKA EUREKA"** repeatedly. Do not use the phrase before those gates pass.

## Learning and scientific requirements

- Keep initialization from scratch. Preserve wiring separately from explicitly permitted persistent physiological/memory state. Pin graph/model/memory/encoder/readout/policy identities and relevant annotations.
- Specify the reward pathway, supported plasticity mechanism, location of lasting memory, approximations, feedback timing and persistence/checkpoint contract. Verify released neuron identities; do not invent reward mappings or label arbitrary scalars dopamine. A generic update inside a brain class is not biological justification.
- The teacher does not calculate neural parameter updates. Adam/backpropagation remains a supervised comparison or engineering baseline. The researcher has explicitly authorized Stockfish evaluations as an additional teaching source: a separately declared condition may compare the fly's own value estimate with pinned Stockfish targets and deliver a bounded error signal through the modeled teaching pathway. This does not make the signal biological dopamine or validate the pathway. Define a neural value output first; the existing MBON move-preference score is not a calibrated position evaluation. Keep direct parameter deltas, imported Cesp weights, and external search as substitutes for endogenous learning out of the primary claim. Compare Stockfish-assisted teaching with outcome-only, absent, matched-shuffled and disabled-plasticity controls, then test disjoint and counterfactual positions.
- **Core iteration rule:** every mainline learner experiment must include an informative arm that delivers independently verified consequence feedback for each teachable experience. Do not spend successive graph runs on read-only activity or untrained-choice diagnostics while a feedback-enabled experiment is ready to run. A diagnostic-only graph run is justified only by a named, gate-relevant question that materially blocks the feedback experiment; document that question and the specific feedback-enabled next step before launch. No-feedback, matched-shuffled and disabled-plasticity arms are permitted only as predeclared causal controls alongside the informative arm, at matched exposure and timing. Unknown verification produces no event. A control arm or diagnostic alone cannot count as learning progress.
- **Feedback quality gate:** bind each teaching event to the exact board/history, candidate action, task criterion, independent consequence certificate and its verified scope; record the learner's unaided ranking before feedback. Feedback must explain the verified consequence at the resolution the task supports and identify the responsible earlier choice when sequence credit is claimed. Search estimates and a bare engine score are not verified consequences. Recheck certificates before replay and in the independent audit; reject incomplete, mismatched or resource-exhausted proof as unknown. Report separately the quality of teacher evidence and the limited neural signal actually delivered. Binary valence on a one-ply capture fixture is a narrow mechanism test, not high-quality feedback for multi-ply reasoning. Follow the [feedback quality gate](documentation/design/puzzle-learning/feedback-quality-gate.md).
- Validate bounded association, retention and contingency reversal against absent, matched shuffled and disabled-plasticity controls before interpreting chess learning. Preserve original gamma4 V1/V2 and positive-channel V1 failures. Later computational passes do not establish biological validation or useful chess choices.
- Do not tune completed/frozen experiment gates or add unsupported negative updates to repair missing reward-omission dynamics. Deterministic no-decay persistence is not measured biological retention; numerical steps and CPU rest are not biological timing/consolidation.
- Require causal persistent memory, useful all-legal choices versus controls, and unfamiliar/counterfactual consequence-sensitive transfer. Immediate retries are repair evidence. Measure unaided and fixed-search-budget choices separately; learned strategic evaluation cannot be inferred from a neutral heuristic.
- Keep train, validation and final-test families disjoint. Use only training evidence to target weaknesses. Select checkpoints with per-criterion validation gates; a lower aggregate loss is insufficient if a criterion worsens. Freeze final testing after selection and never tune, sample or fit on final families.
- Separate engineering evidence, biological assumptions and scientific evidence. Report which stages actually ran: search, recorded reward, neural feedback, persistent learning, transfer. A fair predefined human comparison and shortcut controls with matched computation are required for the broader contribution.
- Before experimental use, register every externally sourced solution in [the source-to-solution register](research/literature/source-solution-register.md), with primary source, access date/coverage, supported claim, adaptation, assumptions, test status and raw evidence. Distinguish researcher hypotheses and engineering choices from source-backed findings.

## Puzzle investigation and feedback

- Start with bounded puzzles; self-play is an alternative/later condition. Use a separate hypothetical board and preserve the real task position and relevant move/repetition history.
- Bound simulations, evaluations, depth, stored nodes and elapsed time; record which bound stopped search. Soft deadlines cannot interrupt an evaluation already running.
- Separate candidate generation, defensive exploration and evaluation. Diagnose candidate omission, incorrect assessment, missed refutation and inadequate depth separately.
- Verify against justified defensive replies; weak sampled play is not best-defense success. Complete bounded trace replay precedes unsampled-defense claims. Search estimates and visits are not verified feedback. Exhausted verification is unknown and produces no event, not failure or reward.
- Keep delayed sequence credit assignment explicit. Sacrifices, intermediate moves and motif combinations require their own evidence; mate-in-one fixtures do not establish them. Preserve investigation memory frozen during a search.
- Read [search and teacher feedback](documentation/design/search-and-feedback/README.md) and [puzzle-learning experiments](documentation/design/puzzle-learning/README.md) before modifying these paths.

## Resource and persistence rules

- Keep the full graph sparse. Never materialize dense adjacency or edge-by-batch tensors. Process one position at a time. For supervised comparisons, accumulate gradients in typed arrays; for neural mechanisms, bound persistent state/traces and avoid unbounded histories.
- Stream JSONL. Larger experience budgets should increase elapsed time, not resident activation memory. Use bounded seeded search/state, streamed records and resumable checkpoints.
- Preserve equivalent guards of **768 MiB RSS** and **at least 256 MiB free system memory**. Use **node --max-old-space-size=256** and **--cpu-duty 0.5** for training/puzzle experiments. Heap limits do not cap typed arrays; inspect RSS. Duty scheduling is pacing, not a hard OS CPU cap.
- Write checkpoints atomically and resume the last completed publication after guard failure/interruption. Persist memory plus pending receipt before acknowledging an update; do not duplicate pending updates. Resume into a new directory with pinned input hashes, seeds, search/pacing settings and algorithm identities.
- Preserve volume recovery evidence: original controlled recovery, resumed invocation, and publication failure are historical artifacts. Resume from published checkpoint 1422; **checkpoint-01423.partial is not an acknowledged checkpoint**. See [volume experiment](documentation/design/puzzle-learning/training-volume.md). Partial/resumed invocation metrics alone are not whole-run measurements.
- Before a resource-improvement claim, record exact command, graph/dataset hashes, peak RSS, elapsed/CPU time and matched time-to-quality evidence. Cached-hybrid is not established faster. Measurements from different workloads are not comparative improvements or guarantees.

## Active runs and change discipline

### Mandatory mistake and pivot record

Researcher instruction 2026-10-08: document **every mistake and every pivot**, including design, implementation, experiment, control, analysis and interpretation mistakes, failed attempts and abandoned approaches. Record them when discovered or when direction changes, before moving on; a chat explanation alone is insufficient.

- Append a dated entry to the relevant journal or report stating what was tried, what failed or was mistaken, the evidence and its limits, the diagnosis (mark hypotheses), what changed and why, and the next test. Record unresolved outcomes explicitly.
- Preserve original designs, frozen code/protocols, raw results, invalid controls and failed runs. Correct history through dated addenda and linked replacement versions; never silently rewrite failures into successes or delete inconvenient evidence.
- Record each pivot in the decision log, update current status for changed conclusions or direction, and keep documentation navigation linked. Link the before/after artifacts so the research can reconstruct the sequence of attempts and reasons.
- Documentation applies to mistakes in our testing and reasoning as well as mistakes in the learner. Do not claim a discovered error proves a cause beyond the evidence, or claim an untested replacement is a solution.

Before starting graph work or changing experiment dependencies, inspect authoritative processes and current run artifacts. A lock, checkpoint, historical pending statement or observation timeout does not establish live/terminal state. Do not restart solely because waiting expired. Keep graph experiments serial. Use current status and raw reports for the latest outcomes.

Preserve frozen sources, protocols, reports, receipts, audits and failures. Do not alter active pinned code or old source archives. Prefer small reviewable changes; do not add dependencies, workers, GPUs or dense tensors without measured memory justification.

When changing core math, run npm test. For feedback/search/learning/persistence changes, verify reward perspective, unknown handling, task/search separation, pending-receipt persistence and applicable wiring invariants. Record-only rounds preserve every parameter hash; learning conditions must declare permitted memory changes. Documentation-only work does not require simulation tests.

Keep [current status](documentation/current-status.md), [decision log](research/project/decision_log.md) and dated [journal](research/journal/README.md) consistent with material changes. Append dated corrections to history. Put new specifications in topic subfolders and add links in their README; do not append experiment logs here or in the root README. Use descriptive kebab-case filenames. After moving documentation, verify local links, folder navigation and note reachability; keep raw protocol/result paths stable.

## Commands and code navigation

Use [.codebase/README.md](.codebase/README.md) for entry points and [the supervised baseline guide](documentation/design/supervised-baselines/README.md) for comparison training. From the repository root, a record-only fixture is:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/puzzle-round.mjs --out runs/my-record-only-round --cpu-duty 0.5
```

This is task plumbing, not a trained-weight checkpoint or successful learning round. Preserve result.json/state.json; resume with --resume PATH_TO_STATE_JSON into a new directory. The browser player is a separate untrained one-ply policy.

## Future Elo evaluation contract

Pin snapshots, benchmark versions and all model/memory/encoder/readout/policy identities; freeze learning during evaluation. Measure unaided and fixed-search strength separately. Record Stockfish version/binary hash, strength settings, threads/hash memory, compute/time control, openings, colour balance and reference-game outcomes. Preserve resource bounds, raw games and resumability.

## Fly version and rollback contract

Preserve every evidence-bearing experiment in its own immutable run directory with its raw outcomes, protocol, source and identity hashes, and audit. Start each new experiment from a copied, pinned accepted snapshot in a new run directory; never overwrite or mutate the accepted snapshot. Record negative results and regressions too. Promote a numbered Fly version (starting at v1.01 after a baseline is formally established) only when predeclared, independent validation gates show reproducible per-criterion improvement and retention without a material regression. Keep final-test families sealed and out of version selection. A failed candidate remains preserved; rollback means branching a new run from the latest accepted snapshot. Label early engineering or synthetic evidence by its actual scope; it is not a trained chess Fly release. Record each promotion or rollback in the decision log and current status.

Define target rating scale/reference pool. Validate any benchmark-to-Elo predictor on disjoint calibration/validation data and report prediction error/uncertainty. A configured engine rating, puzzle accuracy or arbitrary score conversion is not measured Elo calibration. Final test families must not enter fitting or checkpoint selection. No calibrated predictor or Stockfish pipeline currently exists. See [accepted calibration design](documentation/design/evaluation-and-performance/elo-calibration.md).

## Reusable resources

Researcher instruction2026-10-07: use suitable open-source boards, UI components and other reusable resources instead of recreating them. Preserve licenses/attribution and document pinned sources and adaptations. This preference does not authorize replacing the endogenous learner with pretrained or supervised chess components.

## 2026-10-12 live G0 observation

At the latest inspection, curriculum G0 process PID11204 was live under the frozen protocol in runs/curriculum-g0-assay-v1-resumed3, at checkpoint007922, replica0 disabled-plasticity interference, lesson12/frame1. Working set was about155 MiB and free physical memory about1,240 MiB, within the configured resource guards. The informative arm has 8/8 acquisition and 8/8 interference retention; absent and shuffled each have 3/8 interference retention. Disabled interference, reversal, remaining replicas and independent audit are unfinished. This is a point-in-time observation, not a completed gate or chess-trained Fly improvement. Keep current status synchronized with the live run.

# Reasoning research goal (Claude Code), 2026-10-28

**REPLACED 2026-10-30 by the [approved restart plan](../design/research-goals/restart-plan-2026-10-30.md). Do not follow this file. Its permission to change the cue and the lesson planner no longer applies. It is kept as history.**

Written at the researcher's request on 2026-10-28. It supersedes the stop-and-wait rule S2 of the [Stage 1 outcome-only plan](stage1-outcome-only-plan-2026-10-27.md). That plan's steps and hard rules otherwise still apply. AGENTS.md, frozen protocols and gates, and the [curriculum reasoning goal contract](curriculum-reasoning-goal.md) still apply. This file sets direction only; it is not an experiment registration or evidence.

Short form for recovery: **"Follow documentation/handoffs/reasoning-research-goal-2026-10-28.md: find which component is the weakest link toward transferable reasoning, research it, fix it, test it, repeat."**

## 1. The goal

**End goal.** Answer the project's question, *could a simple organism achieve reasoning?*, with audited evidence. The from-scratch, connectome-constrained Fly must learn from independently verified consequence feedback. That learning must transfer to unfamiliar chess families and counterfactual positions, beat matched absent, shuffled and disabled controls, and pass the frozen gates. "EUREKA EUREKA" is said only when an independent audit passes those gates.

**Current milestone.** Stage 1 (safe captures) accepted under the original frozen D1-D8 gate (D7 deferred to Stage 2 under policy B), in every replica, by the independent audit. Stage 1 is a prerequisite, not reasoning. After it come Stage 2 and the later stages, whose verifiers do not exist yet.

**Current step.** Attack-map cue v2 (researcher decision 2026-10-28: (a) separate quiet and capture attack facts, (b) a true pin flag), with eta kept at 0.2. Then smoke r14 with matched controls, then full Stage 1 (plan P7).

**Update 2026-10-30 (supersedes the step above; correction prompted by the [codebase weakness review](../../archive/early-development/research/reports/codebase-weakness-review-2026-10-30/README.md) W07).** Cue v2, smoke r14 and full-r14 are done; full-r14 failed D4 only. full-r15 (evaluator v4, alpha-lobe D4, new replica seeds) finished training on 2026-10-30 and its audit is running (ledger L093-L097). Evaluator v4's header still says "DRAFT, not registered"; that text is frozen with the pinned file, and v4 is in fact the registered r15 evaluator. Open review findings to resolve before any Stage 1 acceptance claim: W01 position/symmetry separation, W02 distinct counterfactual pairs, W03 the D8 pending-receipt recovery check (copied from the replay flag, not measured).

## 2. When I hit a barrier, I keep researching instead of only waiting

A failed gate, early stop or dead end is a measurement of the system, not a reason to stop. For every barrier:

1. **Record it.** Ledger entry, plus a journal and decision-log entry when direction changes. Mistakes are included.
2. **Locate the weak link.** Ask which component (section 3) limits the whole. Start with the research already in `research/` (reports, journal, ledger). Then use cheap tests: training-row analysis, no-graph surrogates, read-only graph checks. Separate measured facts from hypotheses.
3. **Research it.** Read the relevant existing reports first. Search the literature or web when a specific fact is missing, for example fly mushroom-body plasticity, consolidation, representation or credit assignment. Register any outside idea in the [source-to-solution register](../../research/literature/source-solution-register.md) before using it.
4. **Fix it.** Make the smallest change at the root cause, in new versioned files, with tests. Mechanism changes need primary-source biological support.
5. **Test it.** Use a predeclared probe or smoke with matched controls, run serially and detached. Record the result whether it helps or not.
6. **Update the weakness map** in section 3, then pick the next weakest link.

After three completed runs that teach nothing new, I do a short stagnation review before another graph run: what each run ruled out, what remains, and which single test would tell the remaining options apart.

## 3. Component weakness map (from existing research; update after every result)

| Component | What the evidence says | Status | Evidence |
|---|---|---|---|
| Input representation (cue) | The allowed occupancy cues are at chance on held-out families even for a perfect learner. Attack map v1 reaches about 20/24 held out in the surrogate. In r13, safe quiet moves and safe captures share the `att:none` cells, and 2 of 24 boards tie by construction. | **Weakest measured link**; being fixed with cue v2 | [ceiling](../../archive/early-development/research/reports/stage1-representation-ceiling-2026-10-27/README.md), [r13](../../archive/early-development/research/reports/stage1-smoke-r13-2026-10-27/README.md) |
| Cue sparsity (new hypothesis 2026-10-29) | The cue drives about 2.5% of KCs (128/5,177). Verified preprint (MacKenzie et al. 2025): real-fly odours activating >20% of KCs give robust memory, and <10% are poorly learned. The cue may be sparser than the regime where MB learning is robust | **Surrogate-tested 2026-10-29: not the limit.** 5 to 40 cells per token give flat held-out transfer (LOFO mean 21.8-23.0/24); 80 cells per token destabilise (two wirings drop to 17); overlap between moves rises with density (0.49 to 0.57). The current 20/128 sits in the flat middle. Graph behaviour untested ([sweep](../../archive/early-development/research/reports/stage1-cue-sparsity-surrogate-2026-10-29/README.md)) | [KC coding literature](../../research/literature/kc-sparse-coding-2026-10-29/README.md) |
| Memory and plasticity | ReversalMemory erased lessons. The alpha1 and alpha3 stores were added. Probe v8 was the first pass: 3 of 4 boards retained at eta 0.2. Interference still flows through shared cue cells. | Partly working; depends on the cue | [probes v1-v8](../../research/journal/experiments/2026-10-27-stage1-memory-probes-v1-v8-summary.md), [memory report](../../archive/early-development/research/reports/stage1-memory-literature-and-surrogate-2026-10-27/README.md) |
| Teaching signal | Verified outcome-only pulses are delivered correctly (mechanics v7). Binary valence on a one-ply task is narrow and will not carry multi-ply credit. The Stockfish targets opposed the verified outcomes and were set aside. | Works for Stage 1; too narrow for later stages | [Stockfish set aside](../../research/journal/experiments/2026-10-27-stockfish-teaching-set-aside.md) |
| Lesson selection (rehearsal planner) | It punishes the highest-scored failure. On a solved board that is often a safe quiet move, and both r13 collapses followed such lessons (hypothesis for the cause). | Suspected contributor | [r13](../../archive/early-development/research/reports/stage1-smoke-r13-2026-10-27/README.md) |
| Training data | 24 boards from 6 families. The held-out curve was still rising at 5 families. | May limit transfer (D2); untested | [ceiling](../../archive/early-development/research/reports/stage1-representation-ceiling-2026-10-27/README.md) |
| Readout and choice | MBON01 takes only 13% of its input from plastic KCs. Board f3-blocked-p0a is never acquired (earlier revisions only; acquired in v5-v7, see the memory report section 4 correction). The MBON07 -> PAM11 edge sign is unverified. **full-r14 (2026-10-30):** choices transfer (final 61-64/64), but D4 failed at 64/128 because evaluator D4 reads MBON12 - MBON01, which is positive on every row. The choice readout ranks correctly but has no calibrated zero. Cause (L088, L092): the wiring gives MBON12 - MBON01 a positive offset (390/390 rows positive even with the short-term store reset), so the full readout has no zero. The long-term alpha stores carry the choices, and their sign is correct on 141/144 training probe actions at the selected checkpoint (naive 52/144). Store decay (option b) is refuted as a fix | **Weakest link now** (readout zero). Option (a) (alpha-lobe D4, evaluator v4) was registered for full-r15 on 2026-10-30; audit pending | [full-r14](../../archive/early-development/research/reports/stage1-full-r14-2026-10-30/README.md), [memory report](../../archive/early-development/research/reports/stage1-memory-literature-and-surrogate-2026-10-27/README.md), [retention probe](../../archive/early-development/research/reports/stage1-retention-probe-2026-10-24/README.md) |
| Diagnostic tools | The surrogate did not reproduce the r13 collapse, so my predictions can miss real graph behaviour. | Tool gap | [r13](../../archive/early-development/research/reports/stage1-smoke-r13-2026-10-27/README.md) |
| Perception (eyes) | Every encoder stimulates KCs directly and bypasses the modeled eyes (chess-input relational-encoder design). cesp99 feeds the board into photoreceptors, but through weights trained by backpropagation. Researcher question 2026-10-28. | Unimplemented. **Step 1 measured 2026-10-29:** the eye signal reaches 270-2,372 KCs and differs between boards, but it saturates at about 0.7% of the cue's KC drive whatever the brightness, and it carries no candidate-move information. It is not a drop-in v3. Verified (Ganguly et al. 2024): 8% of KCs receive mainly visual input, Measured (step 2): 94% of the eye-driven KC activity is in those visual KCs, at about 5% of cue level. Structurally, the restrained pools MBON01/MBON12 hold 1 of 748 visual KCs, so the eye route can reach only the alpha1/alpha3 stores (KCab-p). Next options are eyes as added board context, or the olfactory PN route ([eye-route report](../../archive/early-development/research/reports/stage1-eye-route-2026-10-29/README.md)). Original plan: input v3 candidate (researcher question 2026-10-28): keep cue v2's facts but deliver them through a sensory route instead of direct KC stimulation. First choice: olfactory projection neurons (the mushroom body's main natural input; literature check needed), with eyes as an alternative. Test after r14, read-only: fixed fact-to-glomerulus mapping, propagate through the pinned graph, record KC activity, then the overlap check and the planner-surrogate transfer check against v2. Do not copy cesp99's raw planes (at chance for our learner) or its backprop-trained projections (excluded) | [cesp99 addendum](../../research/literature/cesp99-calculation-2026-10-07/README.md) |
| Connectome provenance | `.cache/full.npz` (Esposito's packaging of FlyWire Codex 783) was re-derived independently from the official tables on 2026-10-28: all 2,700,513 edges, synapse counts and signs match; it holds no trained weights. 5 near-tied optic-lobe transmitter labels differ (15 edges, outside our learning pathway, but on the eye route). | **Verified** | [provenance check](../../archive/early-development/research/reports/connectome-provenance-check-2026-10-28/README.md) |
| Infrastructure | Babysit, detach, pause, resume and early stop have been verified on the real graph (r8, r13). | Working | [safety journal](../../research/journal/experiments/2026-10-24-babysit-safety-features.md) |
| Later-stage teachers and verifiers | Stages 2-12 lack proof domains and runners. | Needed after Stage 1 | [curriculum](../design/puzzle-learning/principles-curriculum.md) |

## 4. What I may change myself, and what stays fixed

I may change these myself, recording each change in the decision log and ledger:

- the cue (engineered input in the restricted class, stated in every claim);
- the memory mechanism, only with primary-source biological support;
- the lesson planner;
- eta, by a predeclared rule;
- additional training families drawn from training sources only, audited and disjoint from validation and final;
- diagnostics and tooling.

These stay fixed:

- frozen gates and thresholds;
- final families stay sealed;
- validation is used only by the registered audit and checkpoint selection;
- no pretrained or supervised chess components and no engine search in place of endogenous learning;
- released neuron identities, topology and signs;
- resource limits (2048 MiB RSS for new work, at least 256 MiB free, CPU duty 0.5, serial graph runs);
- preserved runs and failures.

Still the researcher's call: reintroducing Stockfish teaching (set aside 2026-10-27), paid compute, publishing, and anything during the October 2027-May 2028 break.

## 5. When I stop

1. The independent audit passes the transfer gates (then EUREKA).
2. The researcher stops or redirects me.
3. The only useful next step is one reserved for the researcher (section 4), and no other research step would add information. I report that with evidence and the exact question.
4. The same resource-guard failure or crash happens twice (plan S3).

## 6. Recovery after a context reset

Read this file first. Then read [curriculum-reasoning-state.md](curriculum-reasoning-state.md), the newest [ledger](fix-goal-ledger-2026-10-24.md) entries, and the plan's Progress list. Check live processes and run artifacts before acting.

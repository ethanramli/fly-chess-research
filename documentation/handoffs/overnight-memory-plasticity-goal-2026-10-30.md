# Overnight memory plasticity goal — Claude Opus 5.5

Prepared at the researcher's request, 2026-10-30. Intended for a new Claude Opus 5.5 chat in `C:/Users/ethan/Documents/fly-chess-research`. This is a bounded development goal. It does not promise that scientific memory or reasoning will be solved overnight.

Updated 2026-10-31: the run may start during the day. Its deadline is eight hours after starting; the historical filename and report names remain stable.

Updated 2026-10-31 after a scope review: added assay validity checks, a narrower READY meaning, the order pivot record, a smaller combination and persistence scope, the Haiku coding rule and a researcher-review record.

## Pasteable goal

```text
/goal Follow documentation/handoffs/overnight-memory-plasticity-goal-2026-10-30.md
```

## 1. Objective and what tonight must accomplish

The researcher's desired system must learn a concept, keep it while learning other concepts, and retrieve/combine concepts on an unfamiliar problem. A persistent, selective and revisable memory mechanism is one known bottleneck. Whether the eyes carry the safe/unsafe answer is still unmeasured, so route-dependent results stay provisional until the eye test runs.

**Order pivot; record it first.** The approved plan chooses the memory rule after the eye test; this goal prepares candidates before it. Reason: the eye test's usable-strength check needs the gains a learner can actually reach (review finding F04). Your first action is a dated pivot entry in the decision log stating this. Candidate selection and training still wait for the eye test and the researcher's memory-rule approval.

The overnight milestone is a **tested candidate and assay package ready for a bounded scientific decision**, together with a precise plan for validating its visual pathway and subsequent concept combination.

Keep three levels separate in every conclusion: software correctness; biological mechanism support; demonstrated learning/transfer in the actual model. A toy association is not a learned chess concept. A combination design or a synthetic conjunction is not general reasoning. Preserve the approved Phase A/B/C progression.

The researcher wants autonomous progress while asleep. Scope, routine implementation choices, source searching and the development loop are authorized by this goal. Do not repeat a review-format, scope or paper-configuration interview. Apply existing approvals accurately; record genuine boundaries and continue other in-scope work when one branch is blocked.

## 2. Time and persistence contract

At start, read the clock and record local start time and an absolute deadline: **start + 8 hours**, using Asia/Jakarta for displayed times. Start finalization 45 minutes before that deadline. This is a maximum work window, not a requirement to keep working after the bounded deliverables are complete. Do not extend the deadline yourself.

Use one output directory `research/reports/overnight-memory-plasticity-<start-local-date>/`; keep that identity after midnight and across compaction. If it already contains another invocation, use a new descriptive suffix and preserve it. Record the starting `git rev-parse HEAD` and `git status --short` in `session-state.json`, so your changes can be told apart from other sessions' work. Maintain `session-state.json` with scope, deadline, owned paths, candidate identity, current loop, completed checks, exact next action, and source/run/checkpoint identities. Re-read it on continuation rather than restarting work.

Do useful work; no idle overnight polling, unbounded sweeps or repeated failed launches. At the deadline, stop at a safe checkpoint, publish the report and leave unfinished requirements explicit. Mark the goal complete only if its required deliverables/checks are actually complete. Budget expiry is not success; a failed candidate remains a failed candidate.

## 3. Read first and apply skills

Read `AGENTS.md`, current status, the approved restart plan and newest handoff/ledger entries. Then read:

1. `research/reports/research-weakness-review-2026-10-30/README.md`, especially F02–F04, F06–F11 and the dependency sequence.
2. `research/literature/memory-interference-2026-10-30/recommendation-and-test-plan.md`, `primary-source-notes.md`, and relevant source-register entries.
3. The actual current neural-memory, teaching, readout and checkpoint call paths via `.codebase/README.md`; relevant `python actions/README.md` workflows before repeated CLI work.

Load `deep-research` first for research work. Load the repository's `ponytail` skill before any code change, and `diagnosing-bugs` for failures. Use `academic-paper-reviewer` in methodology mode and `academic-pipeline` integrity/failure-mode references for the review phase; apply them within this development goal, not a manuscript pipeline. Load `writing-for-agents` only if editing agent instructions is genuinely necessary; AGENTS.md changes are outside tonight's scope. Use available skill locations and disclose missing skills/tools rather than silently claiming they ran. Follow existing ADHD instructions in user-facing output.

One lead agent owns the work and writes the core update equations, their function and their math checks. Haiku sub-agents (model `haiku`, never Sonnet or Opus) write the other code: fixtures, adapters and tests. Give each a precise spec and its own new files, with no git, no graph runs and no edits to existing files. Read and run everything they return. Delegated work follows the lead's spec, so all of these passes are internal checks, not independent replication. Provider changes and outside-provider manuscript processing stay out of scope.

## 4. Hard scope and permissions

**Authorized:** read-only research and static anatomy/provenance inspection; new isolated candidate modules, adapters, relevant unit/adversarial tests and small synthetic microcircuit assays; bounded CLI actions needed for these; candidate specifications; report artifacts; dated factual journal/decision/source-register addenda.

Place new code/tests in the existing neural-learning component structure after inspecting its conventions. Keep the original implementations available as pinned comparisons. Avoid speculative frameworks, new dependencies, workers, GPU work or broad refactoring. Re-read shared files immediately before edits and leave unrelated changes alone.

**Outside tonight's authorization:** full-connectome learning, graph simulations/eye runs, chess training, automatic curriculum progression, new final-test generation/opening, changing approved experimental gates, changing the renderer/teacher/chess task, external engine search as the learner, pretrained/fitted chess weights, latent answer tables, neuron allocation by correct answer, UI, Elo, performance optimization, eLife submission or ISEF submission writing. No commits, pushes, publication or network uploads of private artifacts. Do not create CLAUDE.md.

The approved restart still requires separate memory-rule approval before actual training. This goal permits preparing and testing components on software fixtures; it does not remove that condition. Preserve old archives, frozen sources, receipts and failed runs. Inspect authoritative processes before touching experiment dependencies; do not stop/restart/adopt someone else's process.

Use sparse bounded state and one experience at a time. Maintain 2048 MiB RSS maximum, at least 256 MiB free memory, Node heap 256 MiB and duty 0.5 where pacing applies. Existing frozen experiments keep their own limits. Use the known interpreter/`fly.cmd`, not an assumed working bare Python. Recurring execution/checking belongs in `python actions/`; keep exact commands and raw logs on disk.

## 5. Six components that must receive explicit dispositions

For each, document inputs/outputs, mutable state, source-backed assumptions, checks and unresolved limits. “Spotless” means passing the applicable declared checks with no concealed gaps, not a claim that software has no possible bugs.

| Component | Required contract/checks |
|---|---|
| Visual pathway and mapping | Trace the actual visual KC→MBON→DAN candidates from existing evidence; pin identities and distinguish verified anatomy, receptor evidence and missing physiology. Transmitter signs do not specify muscarinic receptor kinetics. |
| Eligibility and timing | Local activity determines credit; inactive versus shared/recurrently active KCs are distinguished. Delay affects the intended quantity. Explicit modeled time, boundary timing and stale traces checked. |
| Modulatory signal | Identify source-supported compartment, receptor/timing trigger and direction. Teacher supplies verified consequences, not neural deltas. Preserve released fast edge signs; a muscarinic modulatory pathway is not a negative fast-edge substitution. |
| Persistent plasticity | Check gain bounds, finite values, reachable states, selective changes, acquisition, retention under interference, reversibility and saturation. Add slow state only after a named residual failure justifies it. |
| Readout and behavioral assay | Fixed declared readout, unaided choices before feedback, score/margin and competitor changes measured. Distinguish retrieval, erasure, input ambiguity and acquisition failure. No answer-fitted readout. |
| Persistence and audit | Implement for the candidate: snapshot of all learning/trace/slow/time state, restore that reproduces results exactly, identity checks, disabled-condition inertness and state isolation. Write as a contract only, for implementation once a candidate survives the real-graph test: pending-receipt ordering, interruption before/after append and exactly-once update. |

Where source support or available data cannot establish a contract, mark it unresolved and specify the exact missing fact. A software fixture may validate an interface without validating its biology.

## 6. Development → analysis → research → repair loop

First write `acceptance-plan.md`, **before candidate results**: candidate identity, each falsifiable hypothesis, baseline/controls, initial fixture seeds/patterns, metrics, numerical tolerances, exposure/runtime caps and what each result would mean. Include training/development versus held-out fixture separation. Frozen source/protocol gates remain untouched.

**The assay must prove itself first.** The same agent writes the assay, its pass marks and the candidate, so a candidate pass means nothing until the assay has shown it can tell good from bad:

1. In `acceptance-plan.md`, predict how each old rule fails. `ReversalMemory` should lose A through inactive recovery; `AlphaLobeMemory` should saturate at its floor. Derive these from their equations.
2. Pin the exact pattern overlap levels, including shared-KC cases. The memo predicts local eligibility cannot protect shared KCs, so report every result by overlap level, and let no overlap level be dropped after results.
3. Record the SHA-256 of `acceptance-plan.md` and the fixture files in `session-state.json` before any candidate code runs. Any later change gets a dated, versioned addendum, and results from before the change stay reported.
4. Run the validity check before any candidate: both old rules must fail as predicted, and a positive control with separate stored values per association must pass. This control is a test instrument, not a candidate.

If the validity check fails, the assay is invalid, candidate results do not count, and repairing the assay uses one repair loop.

For each loop:

1. **Develop:** implement the smallest justified change for one named failure. Begin with one local-plasticity candidate against the preserved baseline; do not install local protection, slow storage and new inhibition together.
2. **Verify and analyze:** run the relevant tests/controlled assay; save full outputs. Review connected call paths, math, teaching perspective, unknown handling, state locality and controls. State what failed, the evidence, alternative explanations, and whether it is a software defect, mechanism limitation, measurement issue or missing biological support.
3. **Research the specific problem:** inspect primary text/equations for that failure. Local mAChR-B protection, dopamine timing, compartment interactions and slow-state theory are leads, not ready-made universal rules. Record actual read scope, conflicting findings, adaptations and access limits in the source register. Do not repeat broad literature summaries without a decision they can change.
4. **Repair and recheck:** version the candidate and record why; change one causal factor; repeat failed checks plus affected regression checks. Preserve every rejected version/result. Apply a measured improvement to the candidate branch only; do not replace an accepted biological result with a software pass.

Cap work at **two distinct mechanism families and six substantive repair loops total**, within the deadline. The first family is local selective plasticity. A minimal fast/slow variant is the second only if selective plasticity acquires but fails the declared retention criterion. Multiple numerical rates do not excuse an undeclared parameter sweep. After three failed attempts on one assumption, stop coding that assumption, state a falsifiable alternative, and use one targeted source/diagnostic check. Do not cycle back to a refuted idea under a new name.

For new core math, follow the repository's required tests, including npm test where applicable. Archive-related or pre-existing failures must be documented; do not silently repair unrelated historical paths or report the whole suite green. Bound all tests; do not launch tests that secretly invoke the full graph.

## 7. Required controlled assay and concept-combination design

Use small synthetic rate/microcircuit fixtures with declared assumptions and no imported trained state. The fixture schedule/teacher may verify task consequences but cannot compute parameter updates or encode the solution in stimulus/task labels.

The essential sequence is **acquire A → acquire B/C → retest A → reverse A**. Include distinct patterns with low/high actual activity overlap, congruent/conflicting consequences and both feedback valences. Record initial acquisition so failure to learn A cannot pass retention. Test fixed exposure; if using acquisition-matched comparisons, cap them and report their different question. Require informative, absent, matched nondegenerate shuffled and disabled-plasticity controls with explicit presentation/feedback accounting. Unknown produces no teaching event.

In the informative condition, bind each teaching event to the exact fixture state/history, the learner's own selected action and an independently checkable consequence. Log the unaided choice first; supply no answer or feedback for an unchosen action. Shuffled controls alter only the declared control signal, while retaining the true consequence record and matched exposure contract. A teacher-authored neural update or a control presented as truthful feedback fails the assay contract.

Measure behavior/margins and persistent state, not only parameter movement. A candidate retaining A but failing B or reversal fails. Snapshot/restore must preserve the actual results, and unrelated inactive changes need a declared physiological reason. Identical full input/state with opposite required answers is an information-conflict control, not proof of memory failure.

Also write a **specific later combination test**, one page and written only: name two separately learned relations, the unfamiliar condition that requires both, what information is withheld, the fixed interface/readout and the counterfactual probes. Include full-memory, A-only, B-only, naive and shuffled-feedback comparisons, with matched practice and no oracle concept selector. Define predictions separating combined use from the best single concept, memorized examples and a same-input simple learner. A two-concept test is a minimum mechanism probe, not “many unrelated concepts.”

End the specification by naming what is missing before it could run, such as the learned concepts, the visual route and the task stage. Phase C still needs Phases A and B and its own approved addendum.

Prepare `pre-data-corrections.md` for F03/F04: explain the impossible en passant-recapture family and the linear-decoder/unreachable-gain issues, with a precise proposed correction and checks. Keep this a reviewable addendum; do not rewrite the approved restart or existing test gates. Complete only the corrections needed for the proposed memory validation path.

## 8. Morning deliverables and truthful stopping

At finalization, create `MORNING-REPORT.md` with no more than five headline items:

1. What works, failed, or remains blocked; label software, biological support and model learning separately.
2. A six-component status table with exact evidence links.
3. Candidate/baseline/control outcomes, all failed attempts and unresolved alternative explanations.
4. Changed files, source/protocol/state identities, commands, resource/time observations and remaining risks.
5. One recommended next decision and its smallest decisive test. Explain any remaining permission boundary without reopening routine scope questions.

Keep detailed `acceptance-plan.md`, `candidate-spec.md`, `loop-log.md`, `researcher-review.md`, source records, test outputs, combination specification, F03/F04 correction draft and final `session-state.json` alongside it.

`researcher-review.md` supports the researcher's ownership of the work (review finding F05). It lists every research decision the AI made, with its reason and the alternative rejected, and every equation the researcher must be able to explain, in plain words with its source or "engineering choice". Everything in this run is AI-assisted advice for the researcher to accept or reject, not student-authored conclusions. Link new material from existing topic navigation and append dated factual journal/decision entries as required. Preserve existing history.

Report **READY FOR THE REAL-GRAPH MEMORY TEST** only when the assay passed its validity check, the selected candidate meets all applicable declared software/assay gates, every component has a justified disposition, and remaining biological/graph uncertainties are explicit. READY means a small fixture passed. It is not memory on the connectome: an earlier surrogate failed to reproduce the real graph's r13 collapse, and restart plan section 5 requires the memory test on the real graph. The report names that next test, its inputs and its gates, and it runs only after the researcher's approval. Otherwise report **FAILED AT [named gate]** or **BLOCKED BY [specific missing fact]** with evidence and a saved next step. “All components reviewed” is not “all components validated.”

A complete morning report is required even after a negative result. Never promise zero bugs, limitless memory, eLife acceptance, ISEF 100/100, or reasoning from these fixtures. Never use the reserved celebration phrase without the project's actual audited reasoning gates. Stop cleanly when this bounded goal is satisfied or the deadline is reached; do not continue into chess training or a new goal.

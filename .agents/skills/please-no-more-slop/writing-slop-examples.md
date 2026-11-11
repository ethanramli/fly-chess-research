# Writing slop examples

Use these anchors to calibrate the [rubric](SKILL.md). The scores are editorial judgments for the stated reader and task. The five numbers follow the rubric order: main point, words, concrete detail, flow and filler, accuracy and scope.

Scores 1 through 8 use exact excerpts from FlyChess Git history. Scores 9 and 10 use deliberately flawed rewrites of verified FlyChess results to show how bad writing and materially misleading claims can compound. The links for those rewrites point to the evidence that exposes the error.

## 1/10

### Example 1 · A new teammate checking the research goal

> 2. **Reasoning, as the researcher defines it:** "being able to apply many unrelated concepts to solve an unfamiliar problem". No result so far meets this.

**Points (0, 0, 0, 0, 0).** Defines the term and immediately gives the evidence status. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/82af13ff69e3d5b707711ede9b3fbf02093f34cb/documentation/current-status.md#L8)

### Example 2 · A teammate checking run progress

> v6 (frozen replication on 573 positions from 300 new games) was stopped at 6 of 24 jobs for a shutdown; relaunch is the next step.

**Points (0, 1, 0, 0, 0).** Gives size, stop point, reason and next step. “Frozen replication” is a minor bump. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/c1ce57bc0fea3ab52c5c66e4d1ed12ae1eb3d75a/documentation/current-status.md#L5)

### Example 3 · A new teammate asking what the project is trying to finish

> Complete the five-volume series **Can a Fly Play Chess?** Every piece of work supplies evidence for a named chapter.

**Points (0, 0, 0, 0, 0).** Names the deliverable and explains what each piece of work contributes. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/next-checkpoint.md#L22)

## 2/10

### Example 1 · A new teammate taking over the run

> the researcher must choose whether to request independent review of the post-gate evidence or close these as bounded development results. Do not launch another run before that decision.

**Points (0, 1, 1, 0, 0).** The decision and pause are clear. “Post-gate” takes a lookup and the passage gives no pointer to the evidence to review. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/next-checkpoint.md#L11)

### Example 2 · A chess researcher checking the result

> On all three tested boards, the best safe capture and best other move stayed the same across the baseline and six teaching passes; the safe-capture margin remained negative.

**Points (0, 1, 1, 0, 0).** The outcome and denominator are visible. “Teaching passes” is unexplained and the margin’s comparison is left implicit. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L48)

### Example 3 · A researcher asking why memory failed

> At eta 0.5 an untouched synapse keeps about 0.02% of a lesson after 10 other lessons, and below eta 0.1 one lesson no longer changes the choice;

**Points (0, 1, 1, 0, 0).** Quantifies two useful effects. “Eta” needs a definition and the choice being measured needs context. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-through-2026-10-30.md#L33)

## 3/10

### Example 1 · A technical reader checking the negative result

> Even gains chosen by an oracle at the rule's bounds (0.2 or 1.8), set to favour the safe capture over its top rival, never made a safe capture the top choice on 3 development boards; a second rival always overtook. Greedy construction: strong evidence, not a proof.

**Points (0, 1, 1, 1, 0).** Gives the three-board scope. “Oracle” needs explaining, the selection method is only named, and the long opening delays the outcome. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L11)

### Example 2 · A chess researcher reading a development update

> a separate bounded pin-targeted search over 43 training roots found zero open-to-pinned recapture pairs, both with kings held fixed and when one-piece king relocation was allowed. The expanded pass checked 8,642 legal mutations and 5,665 same-capture comparisons in 92.6s/75.7 MiB.

**Points (0, 2, 1, 0, 0).** Reports a negative search and its coverage. “Training roots” and “one-piece king relocation” need context, and the search goal is only implicit. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-through-2026-10-30.md#L57)

### Example 3 · A new teammate checking the control result

> a missing control found: a random-capture rule scores 250.1 on the v6 test, above the interrupted full arm (130.9); see [journal](../research/journal/experiments/2026-11-05-memory-v4-v5.md). Report it beside the v6 result; do not change the v6 gate.

**Points (0, 1, 2, 0, 0).** The comparison is prominent. “Full arm” needs a definition, and the two scores have no scale or unit. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/next-checkpoint.md#L14)

## 4/10

### Example 1 · A professor checking what the first memory test found

> All 12 arms, including learning switched off, gave identical results. The fly's built-in preference already matched the rewarded board, and the reversal failed everywhere. MBON05 move score stays switched off. Next, per the researcher: build, but do not run, the disclosed engineered-memory condition.

**Points (0, 2, 1, 1, 0).** The result is explicit. “MBON05” and “arms” need context, the reversal task is unspecified, and the scoring switch interrupts the move to next steps. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-2026-10-31-through-2026-11-09.md#L15)

### Example 2 · A maintainer deciding what can still be reproduced

> Researcher-approved G0 checkpoint pruning completed: 164,280 intermediate checkpoints (96.12 GiB) deleted after SHA-256 manifesting; all G0 results, audits, receipts, protocols, sources and 62 resume/final checkpoints kept. Free disk 7.0 -> 103.4 GiB. No new G0 full replay is possible.

**Points (1, 1, 1, 1, 0).** The replay consequence comes last. “G0” is local shorthand, the retained checkpoints’ role is implicit, and the receipt inventory separates the decision from its consequence. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-through-2026-10-30.md#L45)

### Example 3 · A related-field researcher asking whether practice changed the move ranking

> With zero drive, the code becomes sparse (14% of gamma KCs active, which sources describe as sparse), but KC rates fall to about 0.0005-0.0009, roughly 1,000 times below saturation. The rule's change is proportional to KC rate, so 16 events moved the practised move's score by 1.7e-7, and its rank did not change.

**Points (0, 2, 1, 1, 0).** The unchanged rank is recoverable. “Drive” and “gamma KCs” need explanations, the rate numbers lack a usable scale, and two long sentences mix setup with outcome. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L9)

## 5/10

### Example 1 · A new reader opening the historical README

> Can a connectome-constrained model acquire task-relevant strategic evaluation from explicit position-assessment supervision and use it to generalize to previously unseen chess positions?

**Points (0, 2, 2, 1, 0).** The question is easy to find. Its terminology and clause structure are dense, and the reader cannot tell what the model is actually shown. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/f830ada349805b807d4628c3f9c7646d7329683e/README.md#L7)

### Example 2 · A collaborator asking what the proposal would change

> Engineered memory needs no biological-memory repair prerequisite; exact recall alone supplies no cross-key transfer. All amendments and numerical choices remain proposals; no gates, experiments or accepted direction changed.

**Points (1, 2, 1, 1, 0).** The proposal status arrives late in the excerpt. “Cross-key transfer” and “gates” are local terms, the proposed change lacks an example, and the last sentence stacks several kinds of status. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-2026-10-31-through-2026-11-09.md#L26)

### Example 3 · A professor reading the stop report

> The published gamma4 rule (Gkanias et al. 2022) never changed a choice in this model. In the dry run, 0/8 A and 0/8 B boards were acquired, and test success equalled learning-off (1/20). Development data only.

**Points (1, 2, 2, 0, 0).** The negative finding is there, but the result depends on unexplained labels. “0/8 A and 0/8 B” gives denominators without describing the groups or what counted as acquiring a board. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L7)

## 6/10

### Example 1 · A new collaborator trying to understand the failed memory test

> Graph 1-8 of 184, raw 11-24, random 15-22; ties and unequal practice exposure decided most scores. [Result](../research/reports/engineered-memory-test-v3-2026-11-04/README.md). Codex [diagnosis](../research/reports/mistake-diagnosis-2026-11-04/README.md) of 32 mistakes. **Memory v4** (exploratory representation assay) is reviewed, built, dry-run and audited, and registered paused; launch needs researcher approval.

**Points (1, 2, 2, 1, 0).** The failed result is implicit in the numbers. The three labels and scores have no plain explanation, and the paragraph changes from the failed test to its successor. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-2026-10-31-through-2026-11-09.md#L7)

### Example 2 · A chess researcher checking whether the run passed

> Full Stage 1 run r14 audited: **gate-failed, on D4 only**. All three replicas pass D1 (24/24), D2 (15/16), D3 (final 61, 64 and 63 of 64 on unfamiliar families), D5 (pairs 29, 32 and 31 of 32), D6 (21-64 boards better than each matched control, bootstrap lower95 > 0) and D8. D4 is exactly 64/128 in every replica.

**Points (1, 2, 1, 2, 0).** The verdict is present but encoded as “gate-failed, on D4 only.” The unexplained requirement labels and compressed score inventory hide what actually failed. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-through-2026-10-30.md#L9)

### Example 3 · A new teammate deciding whether a memory rule is ready

> All five continuation condition/control datasets pass separate replay, but none meets the unchanged joint gates in the targeted development cell. Reservoir retention passes while reversal fails; its fixed faster setting fails retention and first reversal.

**Points (1, 2, 2, 1, 0).** The reader must infer the decision from unexplained test labels. There is no pass rule or explanation of what “reversal” changed, and the clauses jump between overall results and one setting. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/82af13ff69e3d5b707711ede9b3fbf02093f34cb/documentation/current-status.md#L11)

## 7/10

### Example 1 · A professor reading the status update

> The revision-4 predeclared single-shot capacity gate on the widened 6,046-gain mask found one exact win out of three and failed. A later sequential exact search found settings on all three boards, but it followed gate failure and has not had independent review. The earlier 2,096-gain result is a negative bound for a linear surrogate, not an exact-network impossibility proof.

**Points (1, 2, 2, 2, 0).** The opening buries the result under a test label. The pass rule and what counted as a win are missing, and three different analyses are compressed into one paragraph. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status.md#L7)

### Example 2 · A new collaborator deciding whether to use the new memory rule

> a prediction-scaled teaching pulse on the reservoir store, `prediction-reservoir-v1`, passes G1-G6 in the one targeted development cell with separate replay (R .720, first reversal .429). On the 28 gated cells of development seeds it passes 19, against 11 for the fixed pulse. It fails 9 cells, 2 of them proven impossible for this readout, so it is not selected and held-out seeds stay closed.

**Points (1, 2, 2, 2, 0).** The decision comes last. “G1-G6,” “R,” and “gated cells” have no definitions or usable thresholds. The passage packs one case, a larger comparison and the decision together. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/82af13ff69e3d5b707711ede9b3fbf02093f34cb/documentation/current-status.md#L14)

### Example 3 · A collaborator asking what the review found and what changed

> identifies an input/label collision, evaluation-coverage audit defect, check-role launch-preflight bypass and sequential candidate-memory scoring, plus existing eye/family and transfer/reasoning registration gaps. Preserve historical pilot scope and artifacts. Reasoning-first remains the target; biological repair is not a hybrid prerequisite. No fixes, training or gate changes.

**Points (1, 2, 2, 2, 0).** Stacks defect names without an example of any defect or its consequence. The operational status is at the end, after several unrelated issues. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-2026-10-31-through-2026-11-09.md#L23)

## 8/10

### Example 1 · A professor asking what a single successful test could establish

> A successful controlled study could establish an existence result for transferable evaluation under the specified graph, local learning mechanism, engineered interfaces and checkpoint policy. Reset/restoration, disabled/absent/shuffled teaching and matched search-only controls must locate the cause. A separate architecture comparison, with suitable degree-preserving rewired controls and matched learning/resources/interfaces, would be necessary to claim that biological topology itself provides an advantage. Mechanism interventions could locate useful credit assignment, interference and limitations without establishing physiological fidelity. A reproducible consequence-certified benchmark with untouched family/counterfactual evaluation could independently provide a methodological contribution. Failure is informative only at the tested mechanism, representation and budget scope, not a universal incapacity result.

**Points (2, 2, 2, 2, 0).** The passage offers several possible contributions without a direct answer. Technical noun clusters, unnamed success criteria and shifts among causal, topology and benchmark claims force the reader to assemble it. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/design/research-goals/scientific-contribution.md#L21)

### Example 2 · A new teammate asking what to do next and why

> saved APL attachment analysis completed; separate brute-force sample arithmetic confirms branch-sensitive midpoint projections. The researcher permits computational bypasses. Continue an explicitly approximate, source-constrained APL condition with attachment-uncertainty controls; exact endpoints are required for exact anatomy claims, not every engineering test. [Evidence and scope](../research/reports/apl-locality-feasibility-2026-11-01/attachment-result-and-next-gate.md). No learner is live in this continuation's process check.

**Points (2, 2, 2, 2, 0).** The instruction is buried after unexplained analysis and permission. Nothing describes the check or how to proceed, and the paragraph jumps from geometry to authorization to process status. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-2026-10-31-through-2026-11-09.md#L34)

### Example 3 · A project newcomer asking whether the interrupted memory run supports retention

> A no-graph linear surrogate of r11 (validated on the recorded v7 pulses: taught-board correctness agrees 91/92) indicates (engineering diagnostic, not evidence): A boards are not retained without their own lessons (0/4), so v7 retention is not cross-talk in the surrogate;

**Points (2, 2, 2, 2, 0).** An embedded diagnostic displaces the answer about the run. Local labels and ratio notation omit what was compared, and nested qualifications make the logic hard to reconstruct. [Historical source](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-through-2026-10-30.md#L29)

## 9/10

### Example 1 · Constructed research update for a professor

> The revised evaluation program first contextualized feasibility through a predeclared exact-capacity workflow, followed by multidimensional optimization across development states. The resulting witnesses confirm that the model learned to select safe captures.

**Points (1, 2, 2, 2, 2).** The claim follows procedural padding. No test threshold or score appears, and a search for settings becomes a claim of learning. [Source result](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L52)

### Example 2 · Constructed research update for a professor

> The memory effort produced encouraging progress. After the shutdown and the work to bring the run back online, the expanded rollout, taken together with the improvements around it, demonstrates that the memory system works on new positions.

**Points (2, 1, 2, 2, 2).** The outcome of the run disappears, “expanded rollout” is vague, and no usable count or comparison appears. An interrupted run becomes a validated result. [Source result](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/next-checkpoint.md#L28)

### Example 3 · Constructed research update for a professor

> The visual-representation substrate enabled robust object-level invariance across the evaluation space. In short, the system robustly sees and identifies chess pieces.

**Points (2, 2, 2, 1, 2).** No answer appears about the particular piece pair and square tested. Abstract terms and repeated praise replace the result. A narrow discrimination task becomes general vision. [Source result](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status-history-2026-10-31-through-2026-11-09.md#L17)

## 10/10

### Example 1 · Constructed research update for a professor

> With respect to the underlying feasibility picture, the end-to-end adjudication substrate brings the capacity workflow and its successive execution layers into alignment. These convergent improvements establish that no setting can rank safe captures first in the full simulation.

**Points (2, 2, 2, 2, 2).** The paragraph buries a false conclusion beneath empty process language. The reader gets no count, threshold or model distinction. The mathematical bound applied only to the simpler model. [Source result](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L60)

### Example 2 · Constructed research update for a professor

> Given the convergence of the execution and validation layers and the harmonization of the registered criteria, the operational envelope has now been effectively resolved across the relevant strata. This confirms the full learning run passed on the sealed games.

**Points (2, 2, 2, 2, 2).** The first sentence supplies filler and undefined labels. The outcome has no measurements, and the final sentence invents both a full run and use of sealed games. [Source result](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/documentation/current-status.md#L9)

### Example 3 · Constructed research update for a professor

> The pathway-level representation story is now aligned through a series of orthogonal diagnostics, which in concert yield a robust and generalizable capability signal. Accordingly, the experimental work proves a living fly cannot learn chess.

**Points (2, 2, 2, 2, 2).** The setup gives the reader no observable action or result. It takes two sentences to reach a universal claim that three development positions in a model cannot support. [Source result](https://github.com/ethanramli/fly-chess-research/blob/6275c9ce87c3e4a04450b1b293234077c1ac4737/research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md#L12)

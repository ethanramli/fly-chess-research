# Official criteria and current evidence

**Use this as a coverage checklist, not a predicted score.** Access date: **2026-10-30, Asia/Jakarta**. Current repository state includes uncommitted files; [manifest](source-evidence/local-artifact-manifest.json) binds key inspected bytes. The [ranked report](README.md) defines F01–F16.

## Authorities, versions and read scope

| ID | Official authority | Version/read scope and limitation |
|---|---|---|
| O1 | [ISEF Grand Award Judging Criteria](https://www.societyforscience.org/isef/grand-award/criteria/) | Full extracted science and engineering rubric, introductory judging guidance and all bullets. The page calls section scores suggested. No date/version printed beyond current site; accessed today. [Saved extraction](source-evidence/official-initial.md). |
| O2 | [International Rules landing page](https://www.societyforscience.org/isef/international-rules/) and [Rules for All Projects](https://www.societyforscience.org/isef/international-rules/rules-for-all-projects/) | Current landing page links **2027** rules/forms. Read Ethics, Eligibility/Limitations, General, Continuation, Team Projects, Documentation/Approval and signatures in the full HTML extraction. [Saved extraction](source-evidence/official-second.md). No claim that 2027 governs an entry in 2028+. |
| O3 | [Official generative-AI use table](https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2026/Rules/Generative-AI-Use-Table.pdf) | Two-page text, dated **October 2025**, presently linked from O2 despite its 2026 URL path. All task/condition rows read. Table is preliminary; affiliates may be stricter. [Saved text](source-evidence/bounded-final-0.md). |
| O4 | [2027 forms](https://www.societyforscience.org/isef/forms/) and [Student Support Disclosure Form 2A](https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2027/Forms/2A-Student-Support-Disclosure-Form.pdf) | Forms index and full one-page 2A text: role/support disclosure, generative-AI attachment, prompt/response log or summary and student attestation. Form 2A says it may be completed before or after experimentation; this specific instruction qualifies the index's generic before-research statement. No forms were submitted. |
| O5 | [eLife peer review and publishing](https://elifesciences.org/about/peer-review) | Full main process text: editorial selection precedes review; every reviewed article is published as a Reviewed Preprint, with public assessment/reviews; revisions and Version of Record are author choices. [Saved extraction](source-evidence/official-initial.md). |
| O6 | [How and why eLife selects papers for peer review](https://elifesciences.org/articles/100571) | Full editorial, **23 July 2024**, currently linked from O5. Focus: substantial scientific interest, ability to recruit expert reviewers and value of the reviews to the community. [Saved extraction](source-evidence/official-second.md). These are editorial judgments, not a numerical scoring rule. |
| O7 | [eLife Assessments](https://elifesciences.org/about/elife-assessments) | Full main definitions retrieved via web after an extraction challenge. Two separate axes, significance and evidence. No universal mandatory tier or guarantee is inferred. |
| O8 | [eLife transparent reporting form](https://cdn.elifesciences.org/xpub/guides/transparent_reporting.pdf) | Full extracted form: sample-size rationale, replicates, analysis/precision/effect sizes, allocation/masking and source data/model/code. It is official reporting guidance, not a computational-model-specific checklist or a substitute for the current author guide. [Saved text](source-evidence/final-science-sources.md). |
| O9 | [eLife Ethics Committee update](https://elifesciences.org/inside-elife/77b5c1f3/for-authors-updates-from-elife-s-ethics-committee) | Main text, **15 December 2022**, data availability and integrity sections. Supports the requirement to make data, methods and code available for Version of Record. Full current author-guide/policies access failed; not all present submission-policy details are certified. |
| O10 | [CBIO](https://www.societyforscience.org/isef/categories-and-subcategories/computational-biology-bioinformatics/) and [ROBO](https://www.societyforscience.org/isef/categories-and-subcategories/robotics-intelligent-machines/) | Full category/subcategory definitions, including Computational Neuroscience and Machine Learning. Category is not assigned by this review. [Saved text](source-evidence/category-sources.md). |

### eLife model and assessment language

Selection for review and evidence strength are separate. O5/O6 retain editorial selection; they do not support saying that a favorable critique guarantees selection, or that an already reviewed article must clear a conventional post-review acceptance vote. Reviewed Preprint publication can coexist with critical public assessment.

O7's significance terms are **Landmark, Fundamental, Important, Valuable, Useful**. Its evidence terms are **Exceptional, Compelling, Convincing, Solid, Incomplete, Inadequate**. They describe different dimensions. This report assigns no official eLife Assessment to an unfinished research package and predicts no editorial outcome.

### Main ISEF rubric and category interpretation

The approved question asks whether a defined biological-derived model can learn and transfer under controlled conditions. That is primarily a **science** study, so the science rubric is the main mapping below. It plausibly falls under **CBIO / Computational Neuroscience** if the contribution concerns neural computation. A machine-learning contribution may instead fit ROBO; the eventual fair decides placement. Computer code does not automatically make a study engineering.

An engineering framing would require an independently motivated practical need, explicit solution requirements and a tested prototype. It cannot be chosen merely because software infrastructure is more mature than the scientific evidence. The complete engineering alternative follows the science table.

Statuses: **partial** = relevant positive evidence exists but the criterion is not fully established; **open** = a prospective scientific gap; **unassessed** = missing material/observation; **conditional** = applicability depends on future choices. No point score is assigned. Official points belong to blocks; the official source gives no separate weights to individual bullets.

## eLife selection, evidence and reporting matrix

| ID | Bound criterion and authority | Current evidence / disposition | Stronger evidence or closure |
|---|---|---|---|
| E01 | Substantial interest and journal scope, O5/O6 | **Open.** A computational neural-learning question is relevant; no current visual-learning/transfer finding and no demonstrated novelty. F01/F12. | One precise result that changes a biological/computational inference relative to nearest work; explain who would use it. |
| E02 | Expert-review feasibility, O6 | **Unassessed.** Expertise spans visual connectomics, plasticity, chess verification and statistics. No evidence that suitable editors/reviewers have agreed. | Transparent, interpretable mechanism and validation sufficient for domain experts to assess; editorial recruitment remains eLife's decision. No reviewer contact authorized here. |
| E03 | Value of public reviews to the community, O6 | **Open.** Preserved failures and auditable protocols are useful ingredients; generalizable inference/resource not established. F12/F13. | A reusable, licensed benchmark/mechanistic boundary or positive causal finding, with enough detail for informative scrutiny. |
| E04 | Significance of findings, O7 | **Open.** Broad reasoning goal; Phase A narrow, Phase C unspecified. F01/F12. | Define a bounded claim and demonstrate its importance without substituting Elo, graph size or a venue ambition for significance. |
| E05 | Evidence strength: appropriate validated methods and support, O7 | **Open.** Synthetic/static checks and historical repairs exist. Current new-route acquisition, retention, transfer and controls have no results. F02–F04/F06–F11/F14. | Registered, causally informative comparisons, uncertainty, valid held-out items, mechanism-level predictions and robust state/recovery checks. |
| E06 | Claims justified by data and explicit weaknesses, O5 Public Reviews/O7 | **Partial.** Current status/plan honestly say no reasoning result and distinguish model/organism. F01/F08/F10/F11/F16. | Actual manuscript maintains those boundaries for every figure/result; no supervised probe or certificate proof is attributed to the learner. |
| E07 | Transparent quantitative reporting and available methods/data/code, O8/O9 | **Partial/open.** Extensive local provenance; no new-path clean release verified. F07/F11/F13/F14. | Independent-unit/selection/statistical specification; complete raw records, source data and runnable figure commands, licensing/access statements and bounded reproducibility verification. |
| E08 | Integrity, provenance and author accountability, O8/O9; full current guide unavailable | **Partial/unassessed.** AI history is disclosed in several notes; consolidated current human contributions, author approvals and submission disclosures unknown. F05/F13/F16. | Accurate human contribution/AI statements and author responsibility; current policies verified at submission. No allegation of fabricated data or misconduct. |

## ISEF science — all official rubric items

The official six scored components sum to 100: **Research Question 10**, **Design and Methodology 15**, **Execution: Data Collection, Analysis and Interpretation 20**, **Creativity & Potential Impact 20**, and **Presentation 35**, split into **Poster 10** and **Interview 25**. Exact official block names are retained; bullet tests below are paraphrased, not newly weighted subcriteria.

### I. Research Question — 10 points

| ID | Official bullet, paraphrased | Evidence and assessability | Needed evidence / linked findings |
|---|---|---|---|
| S01 | Focus and clarity of purpose | **Partial.** Restart §1–2 specifies safe capture and distinguishes one concept from later combination. | Freeze the outcome/claim for each stage; operationalize later composition. F01/F11. |
| S02 | Contribution to the relevant field | **Open.** Novelty explicitly unresolved; primary nearest work already covers fly topology, chess and memory. | Specific incremental contribution and capable comparators. F02/F06/F10/F12. |
| S03 | Scientific testability | **Partial/open.** A/B/C structure and falsifiable Phase A gates exist; impossible family and diagnostic ambiguity remain. | Legally instantiable families, separate probe/learning hypotheses, source-supported mechanism. F01–F04/F09/F11. |

### II. Design and Methodology — 15 points

| ID | Official bullet, paraphrased | Evidence and assessability | Needed evidence / linked findings |
|---|---|---|---|
| S04 | Quality of plan and collection methods | **Partial.** Fixed schedule, planned game splits, independent certificates and sealing; no new-path registration or numerical memory assay. | Specify acquisition/interference/reversal/time, independent units, source/state pins and resource-feasible collection. F03/F04/F07/F08/F13/F14. |
| S05 | Appropriate, defined and complete variables/controls | **Partial/open.** Seven named training arms; local/slow/inhibition alternatives distinguished. | Exact learner/nulls/estimands, own-choice exposure accounting, matched initialization/feedback, mechanistic ablations and shortcut controls. F02/F06/F08–F11. |

### III. Execution: Data Collection, Analysis and Interpretation — 20 points

| ID | Official bullet, paraphrased | Evidence and assessability | Needed evidence / linked findings |
|---|---|---|---|
| S06 | Systematic collection and analysis | **Partial engineering; new study unexecuted.** Decoder output/log and wiring script/output preserved; historical receipts exist. | Full new-route raw records faithful to prospective protocol, including failed/unknown cases and deviations. F03/F07/F11/F13. |
| S07 | Reproducible results | **Partial engineering.** Versioned code/recovery evidence; new-path reproduction unassessed. | Exact full dependency/runtime/state/data identities and clean reproducibility of actual new findings. F13/F14. |
| S08 | Appropriate mathematics and statistics | **Partial/open.** Correct bounded update inspection and grouped decoder scaling; inferential calibration/precision and biological equations unresolved. | Reachable-state diagnostic; joint precision/error plan at correct units; declared physiological assumptions and sensitivity. F02/F04/F07–F09/F14. |
| S09 | Evidence sufficient for interpretation/conclusions | **Open.** Current status explicitly says no new eye-learning/transfer result. Historical token evidence is excluded from the new claim. | Current acquisition/retention/reversal and controlled transfer; each claim limited to its teacher, interface and population. F01–F04/F06–F11/F14. |

### IV. Creativity & Potential Impact — 20 points

| ID | Official bullet, paraphrased | Evidence and assessability | Needed evidence / linked findings |
|---|---|---|---|
| S10 | Creativity in the question, design or execution | **Partial/unscored.** Ambitious combination of endogenous feedback, connectome and protected transfer; imagination is visible, demonstrated novelty unclear. | A distinctive, useful inference or method versus nearest real work, supported by outcomes and analysis. F01/F06/F10/F12. |
| S11 | Actual or potential disciplinary/technological/societal impact | **Potential only.** Finite revisable memory and transparent computational benchmarks could be useful. | Identify beneficiaries and testable utility. No evidence for general intelligence, living-fly cognition, environmental benefit or 2000 Elo. F12/F14. |

### V.a. Presentation — Poster, 10 points

| ID | Official bullet, paraphrased | Evidence and assessability | Needed evidence / linked findings |
|---|---|---|---|
| S12 | Logical organization | **Unassessed.** No completed restart poster located. | Student-owned poster with traceable question→method→result→limitation structure. F16. |
| S13 | Understandable figures and legends | **Unassessed.** Synthetic output is not a submitted figure set. | Figure-level raw source links; axes/units, N/replicate definition, uncertainty, controls and scope clear. F07/F16. |
| S14 | Displayed supporting documentation | **Unassessed.** Extensive records exist; exhibit/material selection unavailable. | Relevant current-year notebook, protocol, contribution/support/continuation documents and accessible evidence displayed under actual fair rules. F05/F13/F15/F16. |

### V.b. Presentation — Interview, 25 points

| ID | Official bullet, paraphrased | Evidence and assessability | Needed evidence / linked findings |
|---|---|---|---|
| S15 | Clear and thoughtful answers | **Unassessed.** No current interview observed. | Student answers method/alternative-explanation questions directly, in their own words. F16. |
| S16 | Understanding the relevant basic science | **Unassessed currently.** Dated October 1 self-report indicates a learning need; no inference of present inability. | Explain anatomy vs dynamics, plasticity equation, local modulation, readout and own-choice causal design unaided. F02/F05/F09/F16. |
| S17 | Understanding interpretation and limitations | **Partial records; personal understanding unassessed.** Plan/memo recognize many limits. | Student distinguishes association, probe fitting, persistent memory, teacher proof, transfer, search and reasoning in a concrete example. F01/F04/F08/F10/F11/F16. |
| S18 | Independence in conducting the work | **Supported risk/unassessed current competence.** AI writes much code in the historical account; no consolidated current allocation audit. | Accurate decision/code/analysis authorship log, source engagement and a demonstration of independent interpretation; rule compliance separately resolved. F05/F15/F16. |
| S19 | Awareness of potential wider impact | **Unassessed interview; bounded potential documented.** | Explain plausible use, limitations and lack of evidence for broader capabilities without inflating the model. F05/F12/F16. |
| S20 | Quality of future research ideas | **Partial records; interview unassessed.** Staged memory plan is falsifiable and warns against simultaneous changes. | Student explains which next contrast resolves which uncertainty; rejects acquisition failure/freezing as retention success. F02/F08/F16. |
| S21 | Each team member's contribution and understanding | **Conditional/unassessed.** No actual submitted team roster confirmed. | If team: every member's substantial contribution and understanding documented; otherwise mark N/A. Do not infer a team from AI tools or mentors. F05/F15/F16. |

All 21 science bullets have a disposition. Presentation's 35 points are not awarded, deducted or estimated.

## Engineering alternative — complete coverage without changing the preferred framing

Only applicable if the eventual project is an engineering solution to a practical need. The first three blocks are replaced as follows; **Creativity & Potential Impact** and **Presentation** use the same 12 bullets S10–S21 above, at the same block weights.

| ID | Exact official block / points | Official bullet, paraphrased | Current disposition and stronger evidence |
|---|---|---|---|
| G01 | I. Research Problem / 10 | Explain a practical need | **Open.** The motivating biological question is clear; an engineering customer's need is not selected. Define the actual problem without relabeling the reasoning ambition. F01/F12. |
| G02 | I. Research Problem / 10 | Define solution criteria | **Partial/open.** Scientific gates exist; engineering performance/utility requirements are not a registered product specification. Bound task quality, retention, acquisition, reversal and resources. F04/F08/F14. |
| G03 | I. Research Problem / 10 | State constraints | **Partial positive.** Fixed topology/signs, no pretrained weights and laptop guards explicit. Add measured feasibility for the actual new design. F02/F14. |
| G04 | II. Design and Methodology / 15 | Explore alternatives | **Partial positive.** Local eligibility, fast/slow state, inhibition and conventional comparisons considered. Test them sequentially against named residual failures. F02/F06/F08. |
| G05 | II. Design and Methodology / 15 | Identify a solution | **Open.** Memory rule intentionally undecided. No biological-primary solution selected or validated. F02/F09. |
| G06 | II. Design and Methodology / 15 | Develop a prototype/model | **Partial engineering.** Legacy sparse simulator/checker exist; clean eye-driven learner with chosen memory is unimplemented. F02/F10/F13. |
| G07 | III. Execution: Construction and Testing / 20 | Prototype performs its intended design | **Unassessed for new design.** Synthetic decoder/static wiring cannot establish endogenous visual learning. F04/F09/F13. |
| G08 | III. Execution: Construction and Testing / 20 | Test under multiple conditions/trials | **Open.** New-route matched controls, varied associations and sensitivity have not run. F06–F08/F14. |
| G09 | III. Execution: Construction and Testing / 20 | Demonstrate engineering skill/completeness | **Partial.** Sparse execution, receipts, recovery history and source archives are substantial; actual clean-path/release incomplete. F13/F14. |

The engineering rubric therefore covers G01–G09 **plus S10–S21**, exactly 21 bullet items. Block weights remain 10+15+20+20+10+25=100. Common presentation items remain unassessed, not implicitly passed.

## Eligibility, support, continuity and ethics — separate from judging points

These rows are administrative applicability checks. They are not extra points and are not equivalent to scientific quality.

| ID | Official requirement/context | Current facts and disposition | Smallest authoritative closure |
|---|---|---|---|
| A01 | Eligible student and affiliated-fair selection, O2 Eligibility 1–6 | **Unassessed for eventual year.** Self-reported 2028 graduation and school location recorded; nomination route and exact event not confirmed. | Confirm year, enrollment/age and an eligible affiliate route under that year's rules. No organizer contacted. F15. |
| A02 | One project; research-period bounds, O2 Eligibility 4 | **Conditional.** Current 2027 rules use a 12-month continuous window and no pre-January-2026 research; those dates are not extrapolated to 2028+. | Define the permitted window for actual entry; separate background archive from judged work. F15. |
| A03 | Student independent work, own words and AI restrictions, O2 Ethics/Eligibility 8; O3 | **Supported risk.** Extensive disclosed AI assistance; no submission inspected. Current guidance is broader than “disclose AI.” | Preserve provenance, student-owned source engagement/documents/interpretation; obtain SRC determination on actual history and year. F05. |
| A04 | Team limits/composition, O2 Team Projects | **Conditional.** Actual team status unknown. Mentors/AI do not constitute student team members. | Confirm individual/team entry; if team, eligible members and individual approval records. F15/F16. |
| A05 | Student/mentor allocation and support, O2 Documentation 3/5; O4 | **Open/unassessed.** Dated contribution narrative exists; current support/paid-support/AI log not consolidated. | Accurate allocation, prompt/response log or permitted summary and Form 2A when required. 2A permits completion before or after experimentation; do not backdate. F05. |
| A06 | Prior plan/approvals and addenda, O2 Documentation 1–7 | **Unassessed.** Repository approval-reference table blank; actual signed records may be elsewhere. A researcher's approval is not institutional/fair approval. | Sponsor/SRC identifies applicable forms/timing and documents actual approvals before activities requiring them. F05/F15. |
| A07 | Institutional/industrial setting and professional contributions, O2 Documentation 10 | **Conditional/unassessed.** No current setting/mentor contribution verified. | Apply current **Form 2C**, including qualifying virtual mentorship, if triggered. O1's older introductory “Form 1C” terminology must not override the 2027 form list. F05/F15. |
| A08 | Current-year continuation and substantive expansion, O2 Continuation; Form 7 | **Conditional/open.** Long development archive and restart preserved. Restart alone does not eliminate continuation status. | Selected-year substantive new research, correctly labeled prior work and current-year forms. F15. |
| A09 | Complete documentation, fair/display rules and post-affiliate changes, O2 General/Documentation | **Unassessed.** No actual exhibit/entry packet or local rules inspected. | Current-year English abstract/board, required signatures/exhibit/support docs; check local restrictions and changes after affiliation selection. No score/eligibility certification. F13/F15/F16. |
| A10 | Human/animal/PHBA and other risk-specific review, O2 Ethics/Documentation 4 | **Not triggered by this review's read-only computational work; future applicability unresolved.** No living flies or human participants studied here. Human chess comparison is a later design. | Resolve the real protocol/jurisdiction with the relevant review authority before recruitment or regulated data collection. Do not demand animal approvals solely because the model is fly-derived. F15. |

## Completion and boundaries

This matrix covers every science bullet, the full engineering alternative, eight eLife selection/evidence/reporting dimensions and ten administrative applicability checks. It does not certify complete review of all future submission rules. Source accessibility, missing future materials and sealed-data restrictions remain visible rather than converted to imagined evidence.

No point estimates, score prediction, presumed rejection/acceptance, biological validation or student-understanding result is reported. The matrix is an AI-authored advisory review; it must not be presented as the student's independently authored competition submission.


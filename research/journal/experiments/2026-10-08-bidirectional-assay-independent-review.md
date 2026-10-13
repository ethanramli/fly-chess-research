# 2026-10-08 independent bidirectional assay infrastructure review

Researcher requested an actual-work review of the infrastructure completion claim. Verdict: useful groundwork and a correct stop gate; incomplete infrastructure correctness. Findings and evidence: [independent review](../../reports/bidirectional-assay-infrastructure-review-2026-10-08/README.md).

## Mistakes and pivot

Original ten fixture groups pass, but their side-effect-free assessment/readout do not establish exact recovery for a stateful receiver. Additional inert fixtures reproduce repeated assessment on pending recovery (uninterrupted physiology/transient values 3/2 versus resumed 4/3 with equal reported exposure), unchecked disabled-arm assessment changes (0 to 2), acceptance of altered behavioral margins, and same-action different-board gate collapse hiding regression. Static review finds an unimported `resolve` in the future run path. These are infrastructure/control/analysis mistakes, not learner outcomes.

Pivot: qualify previous completion claims; preserve submitted source/protocols/tests/results. New counter and receipt fixtures live separately. Next test: a new reviewed/pinned revision must establish exact stateful recovery, whole-slot disabled isolation, independent behavioral evidence and distinct context gates. Physiological/anatomical support, certified reversal and reviewed adapter remain separate prerequisites. No learner fix or training was performed.

Review tooling mistakes: a broad initial filename search included archives and returned excessive truncated output; scope was narrowed. A literal wildcard path passed to rg failed on Windows; the exact journal path was used next. A combined documentation patch failed because current-status.md contains existing invalid UTF-8 bytes; it applied no changes. New files were subsequently added separately, and navigation/status addenda are appended without rewriting the existing file bytes. None of these tooling failures affected submitted sources or conclusions.

Verification: submitted fixture groups 10/10; preflight expected exit 1 with 21/21 matching pins, map/evidence pass and blocked physiology/reversal/identity gate; additional inert fixtures reproduce four defects. Preserved initial and extended evidence. No graph load, neural forward pass, prospective learner simulation or training.

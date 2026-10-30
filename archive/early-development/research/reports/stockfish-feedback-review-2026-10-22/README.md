# Stockfish feedback quality review

22 October 2026. User-requested review while the curriculum goal is paused. This authorizes source inspection and bounded synthetic checks only. No graph experiment, training, resume, gate change or accepted model promotion is authorized by this review.

## Initial findings, before probes

The previous conversational statement that the direction only needs implementation was incomplete. Feedback quality and causal efficacy still need explicit scrutiny. The current adapter is an experimental engineering interface, not validated high-quality teaching.

- The matched-task design promises checked outcome feedback plus a separate Stockfish signal. `replayValue` emits one channel/update per call and uses the task outcome only for eligibility in informative mode. This is an implementation/design discrepancy, not evidence of two delivered signals.
- Value correction and move-quality regret are distinct. A poor move can receive a positive prediction residual if its resulting position was underestimated. That is legitimate value-target arithmetic but does not demonstrate useful policy correction.
- The prediction is an uncalibrated max-over-child-action MBON proxy. The update stimulates the root board/chosen-action cue. No test establishes that the local update reduces the same predicted error, repairs a chosen move, preserves earlier learning or transfers.
- Existing tests check bounded arithmetic, signs, history binding, fixed wiring and control exposure on eight numerical cells with a constant encoder. They cannot establish spatially selective learning or biological validity.

Next: run existing focused checks and adversarial interface probes, preserve raw logs and hashes, then record the exact remaining acceptance requirements. Keep all historical sources and results intact.

## Sources checked

Official [Stockfish WDL model](https://github.com/official-stockfish/WDL_model), accessed 2026-10-22, rendered README sections on fitting to fishtest engine games and expected game score. It supports WDL-derived expected points, not a calibrated Fly win probability or a neural learning rule.

Official [Stockfish UCI commands](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html), accessed 2026-10-22, rendered option/command documentation. It supports pinning options, MultiPV and search transactions; it does not validate our current/error mapping. An initially guessed `UCI-%26-Commands.html` returned 404; the documented full path above succeeded.

[Lichess accuracy](https://lichess.org/page/accuracy), accessed 2026-10-22, rendered formulas and complexity/interpretation caveats. It describes a reporting metric, not a validated training reward or our expected-score rubric. No direct quotations or imported implementation.

These are checks of existing adaptations, not new externally sourced solutions or permission to run an experiment.

## Check execution issue

The initial registered `focused-tests` invocation (`runs/python-actions/20261021T231559-ae32b989/`) exited 1: all three file workers failed with `spawn EPERM` before their test bodies ran. This is unavailable worker spawning, not three established feedback failures. A one-process Node test run is the next check; preserve the failed invocation. A read mistakenly requested `.codebase/package.json`; dependencies are registered in the root `package.json`, and no file was changed.

## Results and handoff for external review

The registered `focused-tests-in-process` action used Node's native `--experimental-test-isolation=none` option and passed **17/17** existing tests, exit 0. Raw invocation: `runs/python-actions/20261021T231619-93b2ebc3/`. The check-only configuration is [stockfish-feedback-review.json](../../../python%20actions/stockfish-feedback-review.json), explicitly paused for research; this invocation does not resume training. There was no full graph, real engine call, causal efficacy test or transfer test.

Additional static findings: terminal children skip even the outcome-only path; reviewed legal actions are not required to match fresh unaided choice; shuffle table membership/magnitude and authentic UCI provenance require caller integration. The parser does not select MultiPV=1 explicitly. These observations are not claims that a real training campaign used forged records. The eight-cell adversarial [probe](probe.mjs) was prepared but **not run** after the researcher redirected the task to an external-review prompt. No probe-results file or demonstrated probe outcome exists.

The researcher requested a standalone account of the actual feedback structure and concrete questions for a fresh stronger-model chat. The root [question.md](../../../question.md) now supplies objective/constraints, equations, actual delivery pseudocode, local rule used by existing fixture tests, evidence limits, unresolved design choices and six targeted review questions. [Previous question](previous-question.md) is preserved unchanged. `answer.md` was not modified.

Mistake/pivot record: earlier conversation implied the remaining work was mostly implementation without first auditing feedback quality; this review finds unresolved scientific and integration decisions. The rough conversational completion percentage was not a measured requirements audit. The next decision should be based on this method review, not that estimate. A combined delete/add patch to replace `question.md` was rejected before mutation because both operations targeted the same file; replacement succeeded with separate operations after archiving the original. A guessed `temporal-feedback-plan.md` documentation path did not exist; no claim relies on it.

The curriculum goal remains paused. Next: obtain the review, assess its claims against code/evidence, and choose a separately documented correction and decisive test. No proposed fix is validated or launched here.

## Astra prompt strengthening, 22 October

The researcher cleared the previous goal and set a separate goal to assess and strengthen `question.md` for Astra. This is document work, not research resumption. The prior prompt had useful context but risked anchoring the reviewer to our diagnoses and compressing six broad requests into a short answer. Its pseudocode also omitted residual-dependent skip behavior.

Re-reading the adapter confirms that informative/disabled/shuffled calls can omit the update presentation on zero/unavailable error while no-channel may still present the cue and observe memory. This is a static control-matching concern, not an executed campaign failure. The strengthened prompt supplies that behavior, exact endpoint activity definitions, the inactive-gain recovery term, the constant-encoder test limitation and the temporal-receiver distinction. It asks the reviewer to challenge our interpretations, derive learning-direction requirements, work through three numerical counterexamples and separate shuffled targets, residuals and sign inversion. It clarifies which design elements are replaceable hypotheses and distinguishes teacher-side continuation experiences from unaided inference.

The six requested output sections now demand a prioritized argument, one coherent implementable contract, falsifiable validation, explicit causal comparisons and conditional decisions for missing facts. [Pre-strengthening prompt](question-before-astra-strengthening.md) is preserved. No learner source, test, frozen protocol or `answer.md` changed; no test or training process was launched for this document edit.

## Astra response received

The researcher's new `answer.md` has been read in full, archived unchanged and assessed against the repository. [Answer assessment](astra-answer-review.md) supports keeping bounded root-action consequence learning as the first condition while deferring unvalidated child-value-error integration. It corrects the production-versus-test encoder distinction, overlap with existing G0 work, endpoint-versus-trajectory receivers and the guarded scalar-stability claim. This is a conditional research/implementation direction, not an adopted new protocol, a learner fix or permission to resume training.

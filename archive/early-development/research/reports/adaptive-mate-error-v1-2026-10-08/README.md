# Adaptive current-error experiment

2026-10-08. Training live in session44359; outcomes and independent audit pending. [Predeclared protocol and mistake record](../../journal/experiments/2026-10-08-adaptive-error-targeting-protocol.md), [frozen machine protocol](../../data/adaptive-mate-error-v1/protocol.json). Protocol SHA256bd4d3c527dc8912f5bf6a3def5a141c544f110d590d1571043a7c52e05c1dd1d.

Command: `node --max-old-space-size=256 .codebase/scripts/puzzle-learning/run-adaptive-mate-error.mjs --out research/reports/adaptive-mate-error-v1-2026-10-08 --cpu-duty 0.5`.

Five serial arms: adaptive informative, no-channel, matched shuffled, disabled, and matched-dose fixed-initial-error informative. Every main informative failure reviews the unique current attempted move; independently verified alternative follows. Maximum four blocks/eight lessons,512 presentation bound per arm. Existing graph, seed, neural memory rule, encoder, readout and timing unchanged; all old failures/source archives preserved. No useful-choice, biological-retention, reversal or transfer conclusion before measurements; no8/10 claim.

Fresh independent replay command after terminal training: `node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-adaptive-mate-error.mjs --run research/reports/adaptive-mate-error-v1-2026-10-08 --out research/reports/adaptive-mate-error-v1-2026-10-08/audit.json --cpu-duty 0.5`.

During-run addendum2026-10-08: informative eight-lesson arm complete,388 presentations, wrong Qd7 chosen; margin -0.00014415383338928223. Controls/comparator and independent graph audit pending. [Static prior-tag recovery evidence](prior-tag-recovery.json) shows18 Qe6-tagged edges inactive in later Kh6 lesson, all18 gaining efficacy during that update. This is recorded recovery beyond current tag, not a causal ablation or sole explanation of failed mate choice. See journal for shared-edge counts and limits.

Live comparison update: adaptive informative wrong Qd7/margin -0.000144154; shuffled wrong Qe6/margin -0.000512911 after equal eight events. No arm solves mate. No-channel/disabled and independent audit remain pending; current pattern is one screen, not evidence shuffled is better.

Adaptive no-channel arm terminal: eight experiences, Qe6 wrong, margin equals initial -0.001160566. Shuffled and informative moved margins; this suggests the schedule/exposure alone did not move this score in no-channel condition. Disabled/fixed-target/audit pending.

Training terminal addendum: 5 arms,40 receipts,1940 presentations,1316.632s/124.828MiB. Every final top choice is wrong. Informative adaptive Qd7 margin -0.000144154; matched-dose fixed-target Kh6 -0.000337170; shuffled Qe6 -0.000512911; no-channel and disabled Qe6 baseline -0.001160566. Adaptive margin beats fixed arm, but no repair. Audit session23158 live. Treat preference margin as a continuous diagnostic, never as pass/success. This is one screen and does not prove retention/reversal/transfer.

Independent audit terminal2026-10-08: passed fresh-graph replay40 receipts and10 rankings exactly. Five arms all remain wrong. Informative margin improves87.58%, fixed target70.95%, shuffled55.81%; no-channel/disabled unchanged. Shuffled permutation kept 4/8 labels aligned, so it is weakly discriminating and cannot support exact-feedback superiority. Next pivot: preregister a zero-alignment count-preserving shuffle where possible and audit its cue/outcome contingency before graph work. See journal for detailed results, hashes and limitations. No retention/reversal/transfer acceptance.

Correction2026-10-08: no-channel margin worsened slightly to -0.001166054 (baseline -0.001160566); disabled-plasticity alone is exactly unchanged. Earlier statements that no-channel equaled baseline are superseded. No-channel still permits endogenous DAN updates.

Static mask diagnosis2026-10-08: all four unique adaptive move tokens (Qe6, Qh7, Kh6, Qd7) project to PPL-only mapped groups; zero project to PAM. The correct mate move Qh7 receives PAM02 feedback, so action token alone cannot directly specify success-mask activation. Other frame/recurrent features may; this is a mismatch hypothesis, not causal proof. Hash-bound evidence action-mask-coverage.json. Next experiment needs a justified public relational cue and explicit verified alternative/refutation, with measured full-feature coverage before launch.

Correction: the lesson schedule had three unique action tokens (Qe6, Qh7, Kh6); Qd7 was the final unaided wrong choice, not a taught move. All three taught tokens map PPL-only. Qd7 is excluded from the coverage inference. Prior four-action wording superseded.

Audit-cost note: one invocation took11241.379s wall (~3h7m) and679s CPU, compared with training1316.632s wall/638s CPU. The 8.54x wall difference is not matched and not predictive; audit full re-executes the workload, but scheduler/idle conditions may explain part. Preserve as observed laptop wait cost and research a separately validated efficient independent audit before scaling.

Full cue-overlap diagnosis: action frames realized10 inputs from max64; Qe6 vs Qh7 share9/10 (Jaccard0.818). Endpoints each11 inputs and share9/11. PAM pool receives some selected cells (root2, endpoint Qh7 2/Qe6 1), so it is inaccurate to say success feedback has no PAM cue. The clearer issue is severe hash collision/overlap; no graph activities were measured. Root dose15, endpoint16.5 due1.5 cap. Static artifact cue-overlap.json. This motivates testing candidate-relative conjunction/pool projection before any physiological mechanism change.

Artifacts: [independent replay audit](audit.json), [adaptive result and rankings](result.json), [audited move-score deltas](action-score-deltas.json), [action-token mask coverage](action-mask-coverage.json), [full-frame KC stimulus overlap](cue-overlap.json), and [per-frame eligible-mask preflight](frame-mask-preflight.json). All cue analyses are static stimulation projections; none measures neural firing.

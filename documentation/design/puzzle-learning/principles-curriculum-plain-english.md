# FlyChess curriculum and current status — plain English

Prepared 13 October 2026, Asia/Jakarta, for explaining the project to Dr Li Yan McCurdy. This explains the existing [full curriculum](principles-curriculum.md); it does not change its protocol, teaching dose, pass requirements or learning mechanism. The [machine-readable curriculum](../../../research/data/principles-curriculum-v1/curriculum.json) specifies the exact requirements.

## The idea

Teach the model small, checkable relationships first, then see whether it can retain, revise and combine them in unfamiliar positions. The motivating question is whether a simple neural architecture can support reasoning. Our experiment uses a computational model constrained by the fruit-fly connectome; it cannot establish reasoning in living flies.

We are not putting chess principles into the model as rules telling it which move to choose. We supply symbolic board information, let it rank legal actions, and then deliver feedback about independently checked consequences. The modeled learning mechanism changes permitted memory state inside the simulation. The chess board representation and output interface remain engineered assumptions.

## First: can the learning system learn, remember and revise? — G0

Before teaching chess, test eight simple cue pairs with independently checked synthetic consequences. Think of this as a controlled laboratory task for the simulation.

1. **Learn:** can it acquire the appropriate preference from truthful feedback?
2. **Remember:** after learning other associations, does it preserve the original preferences?
3. **Revise:** if we reverse the synthetic consequences, can it update its preference?

Reversal changes a toy task's contingencies. It does not change chess legality or call a real checkmate a failure.

Compare truthful feedback with three controls: no external teaching signal, the same teaching signals mismatched to their contexts, and truthful signals with lasting plasticity disabled. Use three genuinely different computational input projections. Complete and audit every required phase before advancing.

## Then: the twelve chess stages

All twelve are specified targets. **No stage below has passed the full current curriculum.** Some teacher, input and receiver software for the first stage exists; that is preparation rather than a learned chess principle.

| Stage | What we want it to learn | Example of the relationship being tested |
|---|---|---|
| C01: Capture and recapture | Whether a capture leaves the capturing piece available for immediate recapture. | The same capture survives with a blocked defender, but can be recaptured when the line opens. A safe capture is not automatically the best chess move. |
| C02: King safety, check and mate | Distinguish check from mate, and respond to genuine threats. | A checking move becomes mate only when every legal escape is removed. |
| C03: Forcing moves and replies | Judge checks, captures and threats against the opponent's defensive resources. | A tempting check works in one position but fails when the opponent gains a quiet defense. |
| C04: Double threats and overloaded defenders | Recognise when the opponent cannot meet multiple threats together. | An apparent fork is useful only if a reply cannot neutralise both consequences. |
| C05: Lines, blockers and defenders | Use changes to a line or defender because of what they enable. | Removing a defender helps when it unlocks a verified payoff; a replacement defender can defeat the plan. |
| C06: Move order and sacrifices | Learn when preparation or a temporary concession enables a later result. | A sacrifice works with the necessary support, but fails when that support is removed or the move order changes. |
| C07: Piece effectiveness | Improve a piece's useful role while preserving important duties. | Freeing a blocked piece enables a later gain; increasing mobility while abandoning defense does not. |
| C08: Coordination | Use pieces together through support and complementary duties. | A supporting move makes an attack work; removing the support makes it fail. |
| C09: Weaknesses and pawn structure | Evaluate whether a weakness can actually be exploited or compensated for. | An isolated pawn may be vulnerable in one position and compensated by activity in another. |
| C10: Prevention and the opponent's plan | Recognise when preventing an opponent's plan is more useful than improving our own position. | A quiet move stops a real threat; if the threat disappears, that preventative move may be unnecessary. |
| C11: Pawn breaks, exchanges and endings | Assess irreversible changes through their consequences. | An exchange helps with an active king and supported pawn, but the same-looking exchange can fail with different support. |
| C12: Combine principles into plans | Combine learned relationships, examine refutations and revise plans in unfamiliar positions. | A plan using several earlier ideas must be abandoned when a crucial prerequisite changes. |

The later stages need additional consequence-checking, sequence-credit and position-value capabilities. Their descriptions are not claims that these capabilities are implemented or working. The curriculum begins with small positions and bounded consequences; full-game strength and 2000 Elo are separate future evaluations.

## What a teaching round looks like

1. Present a training position and record the model's own ranking before feedback.
2. Independently verify the consequence of its action, including the required opponent replies.
3. Present a checked failed-choice/successful-alternative contrast through the declared neural teaching pathway.
4. Rehearse earlier successes and counterexamples, so new lessons are tested against interference with older ones.
5. Compare with matched controls and test unfamiliar families and changes that reverse the consequence.

An unverified or resource-exhausted consequence is **unknown** and produces no teaching event. A written explanation belongs to the teacher's evidence; the actual signal delivered to the network is much narrower. We must test what the network learns from that signal.

## What counts as passing a chess stage

The model must choose useful moves among **all legal actions**, outperform controls, predict the declared consequences, react correctly when a changed relationship reverses the outcome, and preserve earlier learning. Test positions must come from families excluded from training and checkpoint selection. Independent replay checks the consequences, memory updates and recovery from interruption.

The full specification includes training, validation and sealed final tests, with separate minimum performance in every family and criterion. We stop advancement when a required gate fails. A higher average score or one repaired puzzle is insufficient. Unaided choices and choices aided by a fixed search budget are measured separately.

## Current status — 13 October 2026

The first G0 computational replica completed all three phases. Its separate full replay audit passed. The **learning prerequisite itself failed**, because reversal did not satisfy the required advantage over controls.

| Phase | Truthful feedback | No external feedback | Mismatched feedback | Plasticity disabled | Phase gate |
|---|---:|---:|---:|---:|---|
| Acquisition: learn eight associations | 8/8 | 2/8 | 3/8 | 0/8 | Passed in this replica |
| Interference retention: retain them after 16 unrelated teaching experiences | 8/8 | 3/8 | 3/8 | 0/8 | Passed in this replica |
| Reversal: learn the changed consequences | 7/8 | 5/8 | 7/8 | 0/8 | Failed |

The reversal accuracy met its minimum, but truthful feedback tied mismatched feedback; the direction/specificity comparison also failed. Therefore we cannot attribute successful reversal to the intended truthful-feedback relationship under the predefined standard. The remaining two replicas were not run after that required failure. **G0 is unpassed and C01 remains gated.** This is computational association, not demonstrated biological retention or chess reasoning.

Evidence: [original raw result](../../../runs/curriculum-g0-assay-v1-resumed5/result.json), [passed replay audit of the failed experiment](../../../runs/curriculum-g0-assay-v1-resumed5/audit.json), [current research status](../../current-status.md).

### What we are investigating next

The [reversal-history diagnostic](../neural-learning/g0-reversal-history-diagnostic.md) asks whether learning history interferes with acquiring the reversed contingency. After identical prior exposure, compare two branches: one retains its learned memory; the other resets all permitted physiological memory to its original state. Both receive the same reversed experiences, with matched controls and three fixed mismatched-feedback histories.

If reset helps specifically where retained memory fails, that supports a history-dependent limitation in this configuration. If both fail, the cause remains unresolved. Reset is a diagnostic intervention, not a biological forgetting mechanism or an accepted learner repair. This one-projection diagnostic cannot pass the full G0 requirement.

The follow-up was launched on 13 October. At the approximately **19:02 Jakarta** preparation check, its recorded launch PID7348 was absent and no terminal result or audit was present. The latest inspected publication was checkpoint009875, with receipt4936 in disabled-plasticity interference, lesson10/frame3. Its exit cause is unconfirmed and its branch comparison remains unfinished. Do not describe it as currently running or as having fixed reversal. No process was restarted or stopped during this documentation task. [Frozen diagnostic package](../../../research/data/g0-reversal-history-diagnostic-v1/README.md).

Older experiments also show the larger unresolved gap: some familiar chess choices improved, but new-board and counterfactual tests failed. Completing G0 would establish a necessary learning prerequisite; it would not itself establish chess transfer.

## A short explanation to say aloud

“The curriculum starts by checking whether the model can learn, remember and revise simple associations. Then it moves through twelve chess stages, from capture and recapture to tactics, piece activity, coordination and combining plans in unfamiliar positions. Each stage needs verified consequences, matched controls, retention and new-position tests before we advance. Right now the first prerequisite experiment learned and retained all eight associations, but reversal failed the control comparison: truthful and mismatched feedback both scored seven out of eight. Replay confirmed that result. A follow-up is testing whether earlier memories interfere with reversal, but its comparison is unfinished. We have not yet advanced to the first chess stage.”

## The question to bring to the meeting

“What would best distinguish interference from earlier learning, inadequate representation, and an output or teaching mechanism that does not express reliable contingency updating?”

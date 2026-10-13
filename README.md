# FlyChess

A from-scratch, connectome-constrained simulation investigating whether experience and verified feedback can produce transferable chess reasoning within an 8 GB laptop budget.

**Current boundary:** controlled association prerequisites have passed in some conditions, but useful puzzle learning and unfamiliar/counterfactual reasoning remain unproved. A successful search, recorded reward or changed memory is not proof of reasoning.

## Start here

- [Documentation guide](documentation/README.md): research goals, mechanisms, experiments and future plans.
- [Current research status](documentation/current-status.md): latest verified outcomes and next unresolved gate.
- [Research records](research/README.md): literature, dated discussions, decisions, protocols and raw results.
- [Code guide](.codebase/README.md): entry points and commands.
- [Project instructions](AGENTS.md): stable scientific, resource and change rules.

## Research aim

The researcher's overarching question is: **Could a simple organism achieve reasoning?** The project studies a Drosophila-connectome-constrained computational model and uses chess to test whether experience-dependent plasticity produces consequence-sensitive evaluation that transfers across unfamiliar chess positions and counterfactuals.

The model must learn through its own experiences and verified consequences; it is not trained to imitate human-game move labels. Puzzles are the first bounded learning stage. The research aim is transferable reasoning, not merely a puzzle score or a chess-playing demonstration. Chess transfer is evidence about reasoning in chess, not by itself about other domains or a living fly.

The researcher's longer-term performance aspiration is for the model to develop its own evaluation and playing style and reach 2000 Elo. That requires a defined rating scale and separate calibrated playing-strength evidence; it is not yet achieved and rating alone cannot establish reasoning. A fair comparison with humans may support a later comparative claim. Current symbolic encoders stimulate mapped Kenyon cells directly; natural visual perception is unimplemented.

Read [the scientific contribution and evidence gates](documentation/design/research-goals/scientific-contribution.md) and [the teacher/brain boundary](documentation/design/research-goals/feedback-learning.md). Earlier supervised training remains a comparison baseline.

## Run the software

Node 22 or newer is required. From the repository root:

```powershell
npm install
npm run fetch:graph
npm test
```

The record-only engineering fixture can be run in a new output directory:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/puzzle-round.mjs --out runs/my-record-only-round --cpu-duty 0.5
```

This records independently checked feedback without neural learning. [Commands and limits](documentation/design/puzzle-learning/record-only-round.md). Check for active graph experiments before launching another. Training commands and the separate untrained browser player are explained in the [code guide](.codebase/README.md).

## Accepted future work

After the useful-learning milestone, the researcher wants latency optimization and scaling, bounded opponent-turn [pondering](documentation/design/evaluation-and-performance/pondering.md), and snapshot tracking with a [Stockfish-calibrated Elo evaluator](documentation/design/evaluation-and-performance/elo-calibration.md). These are future designs; no calibrated predictor or Stockfish pipeline currently exists. They do not extend the present learning completion gate. The [implementation roadmap](documentation/design/evaluation-and-performance/implementation-roadmap.md) records the proposed build order.

## Folder map

| Folder | What belongs here |
|---|---|
| [documentation](documentation/README.md) | Readable specifications, hypotheses, writing plans and current status |
| [research](research/README.md) | Literature, dated history, decisions, outreach, datasets and evidence |
| [.codebase](.codebase/README.md) | Simulation code, runners, tests and vendored assets |
| [runs](runs/README.md) | Local engineering-run outputs |
| .cache | Downloaded graph and temporary local artifacts; excluded from Git |

Historical root README/instruction text is preserved in the [journal archive](research/journal/archive/README.md). Use the current status page for today's conclusions rather than historical pending statements.

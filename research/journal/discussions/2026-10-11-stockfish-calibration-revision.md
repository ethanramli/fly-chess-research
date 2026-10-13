# 2026-10-11: Stockfish-only calibration revision

Researcher request: produce a better calibration proposal; the original 13 games do not count. Retain Stockfish as the engine and respect the slow full-graph player's budget. This entry records mistakes before further work; all old raw evidence remains historical.

## Mistakes, evidence and correction

- The original run's 13 losses did not bracket the Fly. Its 760.3 estimate was prior-dependent on nominal opponent settings. Projected 50/100/1000-loss ratings described an update algorithm, not measured playing strength. Multiplying 50 observed outcomes cannot provide 150 independent observations.
- The follow-up launched with `--initial-rating 760.3 --seed 48`, fixed initial RD 350, and no measured references. This reset uncertainty while inheriting an estimate from the old run. Excluding those 13 games also requires excluding this inherited estimate.
- Source inspection revealed `createUntrainedFly(loadGraph(graphPath), seed)` in the runner. Seed 48 changes the player, not just openings: original parameter hash `d1060a9efb35cd95c7eebd3de4f6c8f4aef360504c7bc5a9822b3d1245065a06`, follow-up hash `786185f27d0033cd879efe746836b5fd7925ec6cc9942a07bd4b6033fee4e3fa`. Calling it a continuation of the same Fly was wrong. These hashes establish an identity change, not its effect on strength.
- Process inspection confirmed our follow-up Node PID 8204 and its Stockfish child PID 6156 live. At inspection, 3 completed losses were saved, with 2 included in the live Glicko update. This run will be stopped with its last saved game/move state preserved, rather than modified into the new protocol. Its games and inherited rating are excluded from the proposed calibration.
- Native Skill Level 0 was previously suggested as a lower rung. Official documentation's approximately 1347 chart does not establish a rung below the current 1320 UCI floor. Likewise, inter-setting matches alone cannot establish a human-scale absolute anchor.
- Source lookup for a ties model initially used the wrong journal URL. The corrected Davidson publisher result identified the 1970 JASA paper; direct full-text access was blocked. Only publisher abstract/search coverage supports the source note. No full-text review or software verification is claimed.

## Pivot and next work

Replace prior-driven loss accumulation with a measured local reference pool, a frozen Fly identity and fresh held-out games. The [proposal](../../../documentation/design/evaluation-and-performance/stockfish-only-calibration-proposal.md) specifies native-settings limits, an explicitly custom Stockfish/random-move mixture, reference calibration, 10 placement plus 40 scored Fly games, joint fitting and uncertainty/bounds. The mixture is an engineering proposal, not an upstream strength control or a known human rating.

A proposal request authorizes documentation, not implementation or a replacement experiment. Next implementation would need frozen manifests, a reviewed opponent adapter, reference-only games and a finite connected calibration fit before any new Fly batch. Useful chess learning and reasoning remain separate unpassed goals.

## Verified terminal disposition

The command line was rechecked before stopping only PID8204 and its verified Stockfish child. Follow-up process inspection showed both absent. The final saved result contains 3 losses and game4 remains unfinished/unscored. Added a separate run-disposition.json; original state/result/protocol/PGNs remain unchanged. Cached lock ownership is retained with the stopped run after checking the owner is terminal. Documentation changes require no neural/simulation tests. The proposal is complete as a specification; experimental implementations and measurements remain pending.

## Proposal completion review

Read the replacement specification against the request and existing call path. It explicitly excludes both batches and inherited estimates; retains a native-only bound option; discloses the custom Stockfish/error-policy ladder; defines 220 engine-only reference games and exactly 50 fresh Fly games (10 placement, 40 scoring); separates model and schedule seeds; freezes learning; propagates reference/pair uncertainty; defines failure, interruption and scale limits; and lists source coverage plus unimplemented work. Four local links in the proposal resolve. Navigation, status, decision and source records link the proposal or journal. Original 13-game result and follow-up 3-game result remain readable and unchanged. Process inspection restricted to executable names confirms no FlyBench or Stockfish process remains from this task. An initial broad command-line filter also matched the inspecting PowerShell command itself; this was a filter false positive, corrected by executable-name restriction. These are documentation/runtime-disposition checks, not evidence that the proposed calibration has been implemented or validated.

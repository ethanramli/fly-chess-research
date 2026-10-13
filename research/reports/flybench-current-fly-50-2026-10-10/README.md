# Current complete-game fly versus Stockfish: 50 games

Registered 2026-10-10 before launch, following the researcher request to play the current fly against Stockfish and deliver all 50 PGNs. This is a requested strength evaluation, not a mainline learner experiment or learning-progress claim. The current complete-game version is the untrained seed-47 sparse fly policy; the learned puzzle experiments have no general complete-game adapter. No pretrained or supervised weights are substituted.

## Frozen conditions

- Default FlyBench v1, 50 games, 25 seeded six-ply legal opening pairs, colours swapped; seed47, initial rating1000/RD350, no learning or pondering.
- Stockfish19 local universal executable, Threads1/Hash32MiB, limited strength, 100ms/move. Nominal ladder1320–3190, selected adaptively after completed pairs. These settings do not establish Chess.com/FIDE or measured local reference ratings.
- Fly selects among all legal moves using the existing untrained one-ply White-perspective readout. It receives no Stockfish evaluations or parameter updates. Every graph/model/encoder/readout/policy/source identity and actual opening sequence is pinned in the published protocol. Default25 openings are an engineering distribution, not a validated human opening sample.
- Node heap256MiB, duty0.5, 768MiB combined sampled RSS and 256MiB free-memory guards, max400 played plies after opening. Automatic repetition/fifty-move claims; only completed legal outcomes are scored. Exhausted bounds, unknowns and interruptions receive no score; resume into a new directory using published state, preserving failed attempts.
- Deliver raw individual PGNs and one combined file with exactly50 completed games, then run the replay auditor. Report unaided nominal strength, uncertainty, limits and resources; never interpret this as learned reasoning or decimal-accurate Elo.

Command:

```powershell
node --max-old-space-size=256 .codebase/scripts/evaluation-and-performance/flybench.mjs --stockfish .codebase/vendor/stockfish/sf-19/extracted/stockfish/stockfish-windows-x86-64-universal.exe --out runs/flybench-current-fly-50-2026-10-10 --games 50 --seed 47 --initial-rating 1000 --move-ms 100 --max-plies 400 --cpu-duty 0.5
```

Prelaunch authoritative process inspection showed only Codex Node processes and no active graph learner. Software suite passed220 checks; final source-pin addition passed all5 focused checks. Raw software checks are in [the implementation report](../flybench-software-2026-10-10/README.md). Source and input identities are frozen in the invocation protocol; source archives are maintained separately. No outcome is claimed before records complete.

The feedback-enabled learning next step remains a separately registered informative consequence-feedback experiment with matched controls; this requested benchmark does not replace that sequence. No learner gate or failed experiment is changed.

## Early timing observation

At189.97s invocation time, the first game had20 played plies and no scored outcome. The researcher asked whether this would take a while and plans to go out. Assistant estimated a few hours with explicit early-estimate qualification and advised keeping the laptop awake/plugged in and the session open. Actual duration remains unknown and should be reported from the final records. No CPU/duty/strength setting was changed.

## 2026-10-10: Researcher proposes a weaker reference

After observing repeated losses to the local minimum UCI_Elo 1320 setting, the researcher proposes a reliably low-rated opponent. Preliminary direction: separately test Stockfish Skill Level 0 with strength limiting disabled, then calibrate its local outcomes against the pinned 1320 reference. The setting has no promised 400 Elo value. The current 50 games and frozen source/protocol remain unchanged. Do not interpret current losses as locating the fly at 400. This follow-up is proposed only; no new engine setting is active. Full rationale: [FlyBench follow-up note](../../../documentation/design/evaluation-and-performance/flybench.md).

Correction, 2026-10-10: An earlier chat reply incorrectly said game2 was a fly win. The stored result and PGN both show 0-1 for game2 from Black fly perspective: Stockfish won by checkmate. Games1 and2 were both fly losses. This was a result-interpretation mistake; inspect both player colour and PGN winner. No run files were changed.


## Terminal correction, 2026-10-10

At the researcher's request, stopped after13 complete games; Stockfish resource-monitor interruption caught by FlyBench and both processes are confirmed absent. The checkpoint showed game14 with5 moves; preserved as interrupted-game.json and excluded from scores. No interruption becomes a draw/loss. Thirteen complete results: 0 wins, 0 draws, 13 losses. Colour-swapped Glicko periods contain12 games (six pairs); game13 is an unpaired loss and correctly does not update the rating. Provisional estimate760.2500569011308, RD172.15269693152268, approximate interval422.83?1097.67, on nominal uncalibrated Stockfish-setting scale. Thirteen individual PGNs and [combined 13-game PGN](../../../runs/flybench-current-fly-50-2026-10-10/flybench-current-fly-games-001-013.pgn) are retained. [Read-only replay audit](../../../runs/flybench-current-fly-50-2026-10-10/audit.json) passes all13 complete legal games and rating reconstruction. The planned50-game run is stopped early at researcher direction; no score for interrupted game14.

Mistake/correction record: (1) earlier chat incorrectly described game2 as a fly win; its saved score and PGN show Stockfish checkmate, and both games1?2 were fly losses. This interpretation mistake changed no outcome record. (2) Commentary initially said the current game would finish before stopping without checking the fresh checkpoint; at that moment13 was already complete and14 had begun. Checked PID, saved move count and game results before terminating Stockfish, then preserved the fresh five-ply position without scoring it. (3) The runner's periodic child RSS probe emitted a PowerShell process-not-found error after the deliberately stopped engine exited. The exception path atomically preserved state and released the lock. It is operational evidence, not an unknown chess result; graceful user cancellation remains a potential future improvement. (4) User asked to stop after13 because repeated losses to the1320 opponent floor no longer gauged strength. Do not expand this run, fit on game14 or report decimal accuracy. Follow the separately proposed Skill Level0 reference condition; estimate not calibrated to humans.



Follow-up correction, 2026-10-10: The first stop note proposed Stockfish Skill Level0 as weaker than1320. The official Stockfish FAQ chart maps Skill Level0 to roughly1347 in the engine calibration, close to the local UCI_Elo floor1320; its setting is stochastic. This does not establish a weaker opponent in FlyBench. Maia1100 is an additional published human-move model, but Maia authors say its play can exceed its training target. Neither option is assumed to be below the fly. No binaries or weights were downloaded or evaluated. Candidate selection now precedes a separately calibrated, matched opening ladder; no 400 Elo claim.

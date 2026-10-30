# FlyBench v1

2026-10-10. Implemented resumable Stockfish matches and a Glicko-1 rating estimator. No fly strength has been measured. Decimal display does not establish decimal-point accuracy. Evaluation remains separate from feedback learning and reasoning/transfer gates.

## Run

From the repository root, check authoritative processes for active graph experiments, then:

```powershell
npm run flybench -- --stockfish .codebase/vendor/stockfish/sf-19/extracted/stockfish/stockfish-windows-x86-64-universal.exe --out runs/flybench-untrained-v1
```

Defaults: 50 games, initial rating 1000/RD 350, seed 47, Stockfish 100ms/move, one thread, 32 MiB hash, pondering disabled, duty 0.5, 400 played plies after each opening. The default player is the existing **untrained all-legal one-ply fly**, with no learned memory. Full-graph matches may be slow; no runtime or fly-strength result is available. Use a new output directory each invocation.

## Rating and opponent selection

After each colour-swapped opening pair, apply Glicko-1 to both results as one rating period and select the nearest opponent for the next pair. No inactivity inflation applies to a frozen snapshot. A pending half-pair enters the rating only when both games finish. Reference settings stay fixed. This implements Glickman's published formulas, not Chess.com's private production parameters.

The default ladder uses supported Stockfish settings from 1320 to 3190. The actual UCI handshake supplies the range; unsupported values are rejected. The default rating scale is explicitly **nominal Stockfish-setting strength**, not measured local, Chess.com or FIDE Elo. Stockfish documents calibration at 120s+1s anchored to CCRL 40/4; our default conditions differ. A fly below the weakest opponent may only lose. Such results are unbracketed; v1 does not support weaker non-Stockfish opponents.

`result.json` reports a decimal estimate, unrounded RD, an approximate interval `rating ± 1.96 RD`, outcome counts and completion. This interval excludes opening-pair correlation and systematic reference calibration error. Fifty games are a pilot budget, not a precision guarantee. All-win/all-loss estimates are flagged as unbracketed and prior-dependent.

Use `--references PATH_TO_JSON` to supply declared measured references:

```json
{
  "scale": "FlyBench local reference pool v1",
  "evidenceFiles": ["research/my-reference-games.pgn", "research/my-reference-fit.json"],
  "ladder": [{"elo": 1320, "rating": 1000, "rd": 40}, {"elo": 1700, "rating": 1380, "rd": 45}]
}
```

These numbers are illustrative. Evidence files are hashed; **v1 does not fit or validate reference calibration**. Measure a connected reference-versus-reference pool with an anchor under matched conditions, following the [accepted calibration design](elo-calibration.md). No benchmark-to-Elo predictor or external-scale conversion exists.

## Openings, rules and limits

Defaults generate and pin 25 seeded legal six-ply openings with colours swapped. Random legal openings are an engineering default, not a validated representative distribution. `--openings PATH_TO_JSON` accepts an array of UCI move arrays, one per pair. Use a prespecified opening set for formal evaluation; never select from frozen final research families or tune on scored outcomes.

Chess.js 1.4.0 handles legal actions and complete history. Threefold repetition and fifty-move draws are claimed automatically. Checkmate, stalemate and insufficient material are scored. Engine scores do not adjudicate games. Resource guards, ply caps, illegal actions and UCI timeouts interrupt unfinished games without scores. UCI timeout kills the child; synchronous fly evaluations cannot be preempted by a soft deadline. This fixed-per-move-budget protocol has no fly chess-clock forfeits.

## Frozen versions

Use `--adapter PATH_TO_MODULE` for a different frozen version. The trusted local module exports:

```javascript
export async function createPlayer({ seed, pace, guard }) {
  return {
    name: 'My frozen fly version',
    files: [/* snapshot and every external adapter dependency */],
    identity: () => ({ graph: '...', model: '...', memory: '...', encoder: '...', readout: '...', policy: '...' }),
    reset: async () => { /* reset transient state, preserve memory */ },
    choose: async game => { /* return {from,to,promotion?}; use pace/guard */ },
  };
}
```

`identity()` must derive a synchronous object from actual parameters and lasting memory, including biological annotations/configurations, and detect mutations. A constant claimed identity is not evidence of freezing. Declare all snapshot and external dependency files. `choose()` receives a separate replayed board with full history, must not learn or consult Stockfish, and must preserve sparse serial execution and guard/duty settings. The runner checks identity before/after each move/reset and validates actions. The built-in adapter hashes actual parameter arrays, graph identity and configuration. No learned experimental snapshot adapter is silently substituted.

`protocol.json` pins source, graph/snapshot, engine, openings, seed, readout/policy and settings. Executable hashing covers embedded networks; local `.nnue` files beside the executable and in the working directory are also hashed. No active or archived learning code is changed.

## Records and recovery

Outputs: `protocol.json`, atomic `state.json`/`result.json`, streamed `uci.jsonl`/`moves.jsonl`, and complete `game-NNN.pgn` files. Moves are checkpointed. Scores and pair-rating updates share one atomic publication; `.partial` files are unacknowledged. Resources include the invocation command, CPU/wall time, Node peak RSS and sampled combined runner/engine RSS. Child RSS sampling at least two seconds apart is not a hard limit or guaranteed peak; Stockfish CPU time is not measured. The 768 MiB combined and 256 MiB free-memory guards operate at observation points.

Resume into a new directory with original options:

```powershell
npm run flybench -- --stockfish .codebase/vendor/stockfish/sf-19/extracted/stockfish/stockfish-windows-x86-64-universal.exe --out runs/flybench-untrained-v1-resumed --resume runs/flybench-untrained-v1/state.json
node .codebase/scripts/evaluation-and-performance/audit-flybench.mjs --state runs/flybench-untrained-v1-resumed/state.json --out runs/flybench-untrained-v1-resumed/audit.json
```

Resume rejects changed protocols/sources/snapshots, replays scored games and recomputes ratings. `resume-input.json` preserves the original state; `interrupted-game.json` preserves an unfinished attempt. That unscored game restarts after clearing engine hash/resetting fly transient state. Stockfish randomness is not serialized: this is game-boundary recovery, not identical midgame continuation. Completed games do not receive duplicate scores. Preserve the source output directory.

An exclusive `.cache/flybench.lock` serializes FlyBench instances, but does not detect other graph experiments. Hard kills may leave a lock; verify its PID against authoritative processes before removing it. A stale file or observation timeout alone does not justify removal.

The read-only auditor checks pins, complete legal replay, histories, colours/opponents, terminal results, frozen identity receipts and reconstructed ratings. It shares chess.js and Glicko arithmetic, so it is not independent biological or reference-calibration validation.

## Checks and sources

`npm run test:flybench` checks the published Glicko example, uncertainty/relative adjustments, draw/repetition/perspective and UCI failure handling. Windows with the existing pinned Stockfish binary also exercises four synthetic games, prefix recovery, PGNs, replay audit and tampered-result rejection. That executable-specific check is skipped on other platforms. No graph-learning or strength claim follows.

Primary sources accessed 2026-10-10: [Glickman's specification](https://www.glicko.net/glicko/glicko.pdf), [Chess.com explanation](https://support.chess.com/en/articles/8566476-how-do-ratings-work-on-chess-com), [Stockfish UCI options](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html), [rating context](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html#the-elo-rating-of-stockfish). See the [source register](../../../research/literature/source-solution-register.md) and [implementation record](../../../archive/early-development/research/reports/flybench-software-2026-10-10/README.md).

## 2026-10-10: Weaker-opponent follow-up proposed

The researcher observed consecutive losses to the minimum advertised `UCI_Elo` setting and suggested a weaker model for reliably low-rated play. These results are evidence that this frozen snapshot currently loses to the tested 1320 setting; they do not identify a 400 Elo rating. The interval is broad and conditional on nominal, uncalibrated reference values.

Keep the active 50-game run and its frozen protocol unchanged. After it completes, register a separate condition that tests Stockfish `Skill Level 0` with `UCI_LimitStrength` disabled and no `UCI_Elo`, since setting `UCI_Elo` takes precedence. Skill Level 0 changes randomized move selection and low-level search; Stockfish does not promise that it equals 400, or any fixed human rating. Measure its actual outcomes against the existing 1320 reference under identical pinned conditions, then connect reference ratings with a declared paired pool before quoting a lower FlyBench reference-pool rating. Colour-balance openings, report uncertainty, and establish a range where the fly's results bracket its strength. A fixture or single setting switch alone does not calibrate an Elo scale.

This is a documented follow-up direction, not an active engine change, an accepted exact schedule, a run, or a rating claim. Current Stockfish integration only supports `UCI_Elo`; add a separate explicit strength mode after preserving and auditing the active protocol. See the [decision record](../../../research/project/decision_log.md) and dated [run record](../../../archive/early-development/research/reports/flybench-current-fly-50-2026-10-10/README.md).


## 2026-10-10: Lower-opponent candidate correction

The initial weaker-opponent note proposed Stockfish Skill Level0. Further inspection of the official FAQ chart shows about1347 Elo at Skill0, while the official UCI_Elo minimum is1320. These figures belong to Stockfish calibration, not FlyBench, and do not show that Skill0 will beat the existing floor. Skill0 also selects candidate moves stochastically. Keep it as an untested candidate, not a presumed lower ladder rung.

The Lichess-hosted Maia team introduction reports models trained to predict human play from1100 to1900 and says Maia often plays above its trained rating because model averaging removes idiosyncratic human mistakes. Maia1100 is a human-style benchmark candidate; it is neither a verified400 opponent nor guaranteed weaker than SF19 Skill0. Old Stockfish full-strength versions likewise carry no automatic human Elo scale, and no older standalone binary is vendored here (the review WASM package identifies its build as `1.0.0-1946a675.smolnet`, without establishing an Elo calibration).

Next work should first shortlist candidates with source-supported behavior, record licenses/weights/runtime and hash them, then measure a bounded calibration ladder against the stopped snapshot and a trusted anchor using matched openings and both colors. Do not assume a candidate is weaker or use a displayed rating until results bracket it in the declared pool. This corrects the preceding Skill Level0-first suggestion; no engine was downloaded, tuned or run.

## 2026-10-10: Phalanx lower-strength candidate

Phalanx XXV is a better sourced candidate than an old full-strength Stockfish: upstream documents `-e 1...99` (0 is best, 99 easiest), with increasing human-like blunders and move randomness; a community UCI port exists. The port makes it technically compatible in principle, but the current FlyBench runner is Stockfish-specific and would need a separately pinned engine adapter. The easy-level number is not an Elo rating. A 2023 community post reports a sharp strength drop from level0 to level1 but supplies no robust calibration. Do not infer 400 Elo or start a match without wiring and source/behavior audit; first candidate is Phalanx XXV UCI at easy level, then calibrate in paired games. Sources: [Phalanx upstream and GPL-2.0](https://github.com/lubert/phalanx), [UCI port](https://github.com/jimablett/Phalanx-XXV-UCI), [reported level behavior](https://talkchess.com/viewtopic.php?p=951048&sid=c22583a90dc64c2ecab25442bbbbc4b0).
## 2026-10-10: Nova lower-rating calibration candidate

Nova Chess advertises 500-2500 Chess.com blitz presets, making it the closest sourced candidate to a low human-rating reference found so far. Important distinction from its model card: the public weights alone are not strength-calibrated; the website adds a non-released per-tier temperature and Stockfish-based quality filter. The claimed calibration is provider-reported and described partly as matching human centipawn-loss profiles, not an independently audited head-to-head rating study in the material reviewed. The model card says its data are concentrated at 1100-2300 and below800 has less support. Thus hosted Nova 500 is worth a small exploratory comparison, but not an established accurate 500 Elo opponent for FlyBench; downloadable weights alone do not reproduce the advertised setting. It has a custom non-commercial license permitting research/benchmark use with attribution, subject to restrictions. No download or game run. Sources: [Nova site](https://novachess.ai/), [model card and limits](https://huggingface.co/novachess/novachess-engine), [license](https://huggingface.co/novachess/novachess-engine/blob/main/LICENSE). Maia remains useful for human-move prediction but is not a directly rating-calibrated low-strength opponent. The defensible calibration path remains matches against a declared human reference pool.
## 2026-10-10: Nova raw-policy integration

The runner now accepts either `--stockfish PATH` (v1) or `--nova ONNX_PATH` (v2); they are separate frozen opponent conditions. This supports comparing opponent policies, but their ratings do not share a scale automatically. The stopped Stockfish-setting estimate (760.3, RD172.2 after 12 paired games) cannot be transferred to Nova. A Nova FlyBench result uses a separate input scale: Nova's raw-policy conditioning number. It is not a measured human, Chess.com, FIDE, or hosted Nova rating, and decimal formatting does not make it calibrated.

Fetch the research checkpoint with `npm run fetch:nova`. The fetcher pins Hugging Face revision `018627575b71c9c17e9e5cc207c1b87db057dfbc` and checks both ONNX files against source hashes. A future exploratory run can first bracket raw Nova conditioning settings, but it is not an Elo calibration. A human-scale rating run must supply a connected, measured opponent reference pool through `--references`; the runner rejects Nova without it before loading the fly graph. Example command (requires that calibration file):

```powershell
npm run flybench -- --nova .cache/nova-v3b/nova_v3b.onnx --out runs/flybench-nova-bracket --references PATH_TO_MEASURED_REFERENCE_POOL
```

The model card describes released raw move-policy logits conditioned on 800 to 2700; its hosted strength layer adds a temperature schedule and probabilistic Stockfish filter, which are not in these weights. The integrated adapter samples legal moves from the raw policy at temperature 1.0 with neutral style inputs. Thus 800 is the lowest supported conditioning input, not evidence of an 800-rated opponent. The runner refuses Nova without a `--references` JSON file containing a declared scale, evidence-file list and measured ladder; the raw conditioning number is logged separately and never substituted for the ladder rating. The calibration file can declare an explicit `conditioningInput` per pool opponent; otherwise an in-range pool `elo` value is used as a starting hypothesis, not an equivalence. Pool `elo` values identify Nova conditioning only; the reference `rating` field is used by Glicko. An out-of-range ladder row must provide an explicit input. Calibration ladders below or above that conditioning range must provide explicit per-opponent inputs or are rejected. A future result is valid only within the supplied reference pool and conditions. The provider advertises a hosted 500 preset, but that is not reproduced locally. See the [Nova model card](https://huggingface.co/novachess/novachess-engine), [official repository](https://github.com/novachessai/novachess-engine), and [custom research/benchmark license](https://huggingface.co/novachess/novachess-engine/blob/main/LICENSE). The license permits research/benchmark use with attribution and restricts commercial use.

The model files total about 399 MB. The adapter uses one-thread WASM inference through `onnxruntime-web`; the existing 768 MiB process and 256 MiB free-memory guards apply. Nova initialization refuses to start unless at least 420 MiB process-RSS headroom and 256 MiB free system memory remain. This is a conservative preflight, not a measured peak or guarantee. A Windows native `onnxruntime-node` binding failed to load, so integration pivoted to WASM. Static API review set the external-data path to the pinned same-directory sidecar; live load is still unverified. No Nova inference or Fly game has run; model/runtime compatibility, memory use and legal-move indexing remain unverified. The original Fly-vs-Stockfish run remains stopped after 13 games.

## 2026-10-11: Proposal and invalid continuation correction

The [replacement proposal](stockfish-only-calibration-proposal.md) excludes the original 13 games and the seed-48 follow-up from calibration. The latter changed player parameters while inheriting the earlier nominal estimate and resetting RD; it is now stopped with 3 completed losses preserved. Do not treat it as the same frozen snapshot or feed its estimate into a new fit. No proposed mixture adapter, reference-game runner, joint fitter or replacement evaluation has been implemented.

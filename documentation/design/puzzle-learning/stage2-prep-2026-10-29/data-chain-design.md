# Stage 2 data chain design (king safety, check and mate)

Status: design proposal only (2026-10-29). Nothing here is generated, registered or run. Final rows were not opened. Citations are file:line. "Inference" marks my reasoning, not verified fact.

## 1. Sources

- **Lichess mate and theme rows.** The curator filters by theme and piece count: `--themes` (curate-lichess-puzzles.mjs:28, 57, 206-207), `--max-pieces` (line 22, 210, 214). Set `--max-pieces 6` and test the solver position, since `--max-pieces` applies to the post-setup position (corpus doc line 21). Selection is outcome-blind (curate:59). Mate-in-one puzzles may have several mating moves (corpus doc line 7), so every mating move must be certified, not just the supplied one.
- **Theme labels.** Inference: `mateIn1` and `mateIn2` cover actual mate. Escapable-check, mandatory-defense and misleading-improving rows probably have no clean theme. Verify the current Lichess theme list before using any label. Treat theme labels as sampling aids only (corpus doc line 7).
- **Synthetic constructions.** Stage 1 built families from one source root with fixed templates (prepare-lichess-stage1-synthetic-families-v1.mjs:19-22 COMPOSITION; 136-177 template builders). Stage 2 needs new templates for: escapable check (one legal king escape), mandatory defense (only one move avoids mate or loss), and misleading improving move (a tempting capture or quiet move that permits mate within 2 plies, with a correct defense). Inference: these are new code, not an extension of Stage 1 templates.

## 2. Family definition and disjointness

- Split by source game with the stable hash (curate:159-161: 80% train, 10% validation, 10% final). Exact duplicate solver positions are dropped across splits (curate:238-243).
- Family IDs must be disjoint across splits. The Stage 1 audit checks both family IDs and game IDs (audit-lichess-stage1-synthetic-families-v1.mjs:109-110). Keep both checks.
- Stage 1 family IDs use `s1syn-{split}-f{index}-{template}` (prepare:288). Use `s2syn-...`.

## 3. Target counts

Stage 1 quotas (prepare:16-17): train 24 boards, 6 families, 12 pairs; validation 16 boards, 4 families, 8 pairs, 4 per stratum; final 64 boards, 8 families, 32 pairs, 16 per stratum, 8 boards per family. The Stage 1 audit JSON reports the same counts (research/reports/lichess-stage1-synthetic-data-audit-v2.json:69-96).

Proposed Stage 2 (mirrors Stage 1; four strata from principles-curriculum.md:102):

| Split | Boards | Families | Pairs | Per stratum |
|---|---|---|---|---|
| train | 24 | 6 | 12 | 6 boards |
| validation | 16 | 4 | 8 | 4 boards |
| final | 64 | 8 | 32 | 16 boards (two 8-board families) |

Gate: D1-D8 plus at least 12/16 in each final stratum (principles-curriculum.md:102). The overall threshold is not stated for Stage 2 in the curriculum I read. Inference: mirror Stage 1 D3 (52/64 overall, principles-curriculum.md:59), but this needs a researcher decision.

## 4. Counterfactual pairs

Each pair has two boards with the same surface move or check and different outcomes:

- **Escape square:** change one king escape square so the check is escapable on one board and mate on the other.
- **Supporting piece:** remove or add one defender or attacker so the same defense works or fails.
- **Interposition route:** block or open one interposition square.

Each board must be checked independently (principles-curriculum.md:99). Stage 1 used the same pattern: board 1 retains only the focal action and board 2 only the alternative (prepare:83-84). Inference: a pair must also show that the focal action fails on the other board.

## 5. Certificate per row

Each row should carry:

- root FEN and bound game history (bind script, as in Stage 1);
- the actor, legal action, and task (`forced-mate` or `avoid-loss`);
- a bounded AND/OR mate certificate with a wrapper hash, binding actor and exact opponent colour (stage2-avoid-mate-domain.md:11-17);
- the declared horizon (at most 3 plies) and verifier scope;
- stratum label.

A missing, exhausted or limit-hit certificate is **unknown** and produces no event (stage2-avoid-mate-domain.md:15). The current verifier covers only the two-ply avoid-mate case (stage2-avoid-mate-domain.md:21). Escapable-check, mandatory-defense and misleading-improving rows need a verifier that does not exist yet. This is the largest gap.

## 6. Audit gates (mirror Stage 1)

Stage 1 gates:

- `eligibleForNeuralTeaching = replayed && disjoint` (audit:111);
- `familySplitsDisjoint` (audit:109-110, 124);
- `sourceCertificatesReplayed` (audit:111, 124);
- `finalSetInspected: false` (audit:129).

Add for Stage 2:

- `stratumQuotaMet` (prepare:74 checks stratum counts only for splits with a `perStratum` quota; this already works for validation and final);
- `certificateScopeMatched`: each row's certificate horizon and actor match the declared task;
- `allMatingMovesCertified` for mate-in-one rows.

## 7. Step list (python action)

Mirror `python actions/stage1_synthetic_data.py` (STEPS, lines 35-50). Each step refuses to overwrite its output (main, lines 55-58).

1. `curate-stage2-sources`: theme and piece filter per split (curate-lichess-puzzles.mjs, `--max-pieces 6`).
2. `fetch-pgn-{train,validation,final}`: game PGNs (the Stage 1 action only fetches final, line 36; train and validation sources are assumed to exist already - inference).
3. `bind-sources-{split}`: bind rows to game history (bind-lichess-stage1-synthetic-sources-v1.mjs).
4. `produce-{split}`: build families and pairs with `--max-attempts 3000`.
5. `certify-{split}`: new step. Run the mate verifier on every row and pair. Store unknown results; do not drop them silently.
6. `audit`: run the audit with the gates in section 6.

Final contents are never printed (stage1_synthetic_data.py:5-6). The `produce-final` summary is suppressed (line 62).

## 8. Discrepancies and gaps

- The Stage 1 action writes its data audit to `...-audit-v1.json` (stage1_synthetic_data.py:48), but the registration cites `...-audit-v2.json` (stage1-full-r14-registration.json:234). Reconcile before copying the pattern.
- No README exists in `research/data/lichess-stage1-synthetic-v1/` (glob only).
- Stage 2 has no stratum classifier. The Stage 1 classifier (`capture-retention-stratum.mjs`) covers capture strata only.
- The cue is an open decision (readiness doc lines 26-40). Data generation does not depend on it.

## Reviewer check (Claude, 2026-10-29)

A Haiku sub-agent drafted this file; the main session spot-checked it. The substance holds, but these citations are corrected:
- `curate-lichess-puzzles.mjs`: `--themes` is at lines 26 and 53, `--max-pieces` at lines 22 and 46, and the game-hash split (`splitForGame`) at lines 149-150. Lines 28, 159-161, 210 and 214, as cited above, do not contain that logic.
- The "audit-v1 vs audit-v2 discrepancy" is not an error. Both `research/reports/lichess-stage1-synthetic-data-audit-v1.json` and `-v2.json` exist; the registrations pin v2, a later re-audit. The python action is the original v1 chain.
- Still open, and the researcher's call: the overall Stage 2 threshold besides 12/16 per stratum, and the Lichess theme labels for non-mate strata (inference; check against the current theme list).

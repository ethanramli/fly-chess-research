# Assay code spec (for the coding agents)

Implements [acceptance-plan.md](acceptance-plan.md). Node 22 ESM, no new dependencies, style like `.codebase/src/neural-learning/reversal-memory.mjs` (compact, few comments, comment only why). Use `node:crypto` for SHA-256. All sources are small synthetic fixtures. No file may touch the full graph, `.cache`, chess or the network.

Rules for every coding agent: create only the files assigned to you. Do not edit any existing file. No git commands. Run only your own tests, with `node --max-old-space-size=256 --test <file>`. Never write output outside a temp dir in tests.

All paths are under `.codebase/`.

## 1. `src/neural-learning/memory-assay-fixture.mjs`

```js
export function mulberry32(seed)            // returns () => float in [0,1); same seed same stream
export const GRID = { q:[0,0.1,0.25,0.5,0.75,0.9], relation:['congruent','conflicting'], w:[0,0.5,0.9], bg:[0,0.1,0.3] };
export const SEEDS = { dev:[1001..1012], h1:[9001..9024], h2:[9101..9112] };  // write them out or build them
export function gridCells()                 // all 108 {q,relation,w,bg}, order: q, relation, w, bg
export function isGatedCell({q,relation,w,bg})  // w in {0,0.5} and bg in {0,0.1} and (q in {0,0.1,0.25} or (q===0.5 and relation==='congruent'))
export function buildFixture({seed,nKC=200,s=20,q,relation,w,bg})
export function buildSchedule({seed})
export function buildConflictSchedule({seed})
```

`buildFixture` returns:

```js
{ id, seed, nKC, s, q, relation, w, bg,
  baseP: Float64Array(nKC), baseR: Float64Array(nKC),   // uniform in [0.5,1.5]
  images: { 'A+':IMG,'A-':IMG,'B+':IMG,'B-':IMG,'C+':IMG,'C-':IMG, 'E+':IMG,'E-':IMG },
  flip: boolean,   // seed % 2 === 1: presentation order within an item is [X-, X+] instead of [X+, X-]
  actual: { qFocal: number, wFocal: {A,B,C}, cosineSrcPlus: number, cosineSrcMinus: number, bcFocalOverlap: number, acFocalOverlap: number } }
// IMG = { id:'A+', focal:Int32Array sorted ascending, h:Float64Array(nKC) }
```

`id` is the SHA-256 hex of a canonical JSON of seed, sizes, cell values, baseP, baseR and every image's focal list and h values.

Exact generation (one PRNG `mulberry32(seed)`, used in this order):

1. `baseP[i]`, then `baseR[i]`, each `0.5 + rng()`.
2. Shuffle `0..nKC-1` with Fisher-Yates using `rng`. This is the `unused` pool; take KCs from its front.
3. Round counts: `W = Math.round(w*s)`, `d = s - W`, `Q = Math.round(q*s)`.
4. A: take `W` KCs as `WA`, then `d` as `DA+`, then `d` as `DA-`. `A+ = WA ∪ DA+`, `A- = WA ∪ DA-`.
5. B: `srcPlus`/`srcMinus` are the distinct parts B+ / B- draw from. Congruent: `DB+` draws from `DA+`, `DB-` from `DA-`. Conflicting: `DB+` draws from `DA-`, `DB-` from `DA+`. Let `n1 = Math.min(Q, d)`. `DB+` takes the first `n1` of its source, `DB-` the first `n1` of its source. Let `n2 = Q - n1`; `WB` takes the first `n2` of `WA` (at most `W`). Fill `WB` to size `W` from `unused`. Fill `DB+` and `DB-` to size `d` from `unused`. `B+ = WB ∪ DB+`, `B- = WB ∪ DB-`.
6. C and E: same `W`/`d` pattern, all from `unused` only. E is used only by the conflict control.
7. Activity: for each image in order A+,A-,B+,B-,C+,C-,E+,E-, for each focal KC in ascending order, `h = 0.9 + 0.6*rng()`. Every non-focal KC has `h = 1.5*bg`. A KC in two images gets separate draws per image (graded activity differs).

If `unused` runs out, throw. `actual.qFocal` = `|B+ ∩ srcOfB+| / s` where `srcOfB+` is A+ (congruent) or A- (conflicting). `cosineSrc*` = cosine of h vectors between B+ and its source image, and between B- and its source image.

`buildSchedule({seed})` returns `{ hash, phases:[{name,trials:[{item,global,unknown}],test}] }`:

| name | trials | test after |
|---|---|---|
| ACQ_A | 24 A | T1 |
| ACQ_BC | 24 B and 24 C shuffled together by Fisher-Yates with `mulberry32(seed ^ 0x5bd1e995)` | T2 |
| REV1 | 24 A | T3 |
| REV2 | 24 A | T4 |
| REV3 | 24 A | T5 |

`global` counts trials from 0 across phases. `unknown = (global+1) % 8 === 0`. `hash` = SHA-256 of canonical JSON of phases.

`buildConflictSchedule({seed})` returns the same shape with one phase `CONFLICT`, 48 trials, item `E`, each trial also has `situation` `E1` or `E2`, 24 of each, shuffled by Fisher-Yates with `mulberry32(seed ^ 0x2545f491)`, `test: null`, `unknown:false`.

## 2. `src/neural-learning/memory-assay-truth.mjs` and `src/neural-learning/memory-assay-checker.mjs`

Truth (used by the teacher):

```js
export function goodImage(item, phase, situation)   // A: 'A+' in ACQ_A, ACQ_BC, REV2; 'A-' in REV1, REV3. B: 'B+'. C: 'C+'. E: 'E+' in E1, 'E-' in E2.
export function buildCertificate({fixtureId,scheduleHash,phase,global,item,situation=null,prevHash,chosen,scores,unknown})
// returns {schema:'memory-assay-certificate-v1',fixtureId,scheduleHash,phase,global,item,situation,prevHash,chosen,scores,consequence,hash}
// consequence: 'unknown' if unknown, else chosen === goodImage(...) ? 'good' : 'bad'. hash: SHA-256 of canonical JSON of everything else.
```

Checker (imports only `node:crypto`; must NOT import truth or fixture; holds its own table written differently: A's good image is decided by counting how many of REV1, REV2, REV3 have started):

```js
export function checkCertificate(cert,{fixtureId,scheduleHash,prevHash,unknown})
// returns {ok:true} or {ok:false,reason}. Rejects: wrong schema, fixture, schedule or prevHash; hash mismatch; chosen not one of the item's two images; consequence not equal to the checker's own recomputation; scores missing or nonfinite.
```

`unknown` is the schedule's flag: when true the only valid consequence is `'unknown'`.

## 3. `src/neural-learning/memory-assay-adapters.mjs`

Adapters put a rule into the fixture's small circuit. Neuron layout for `n = nKC`: KCs `0..n-1`; DAN P index `n`; DAN R index `n+1`; approach MBON `n+2`; avoid MBON `n+3`; dummy KC `n+4`, dummy DAN `n+5`, dummy MBON `n+6`. Total `n+7`. Edges: `e = i` is KC i to approach MBON (P compartment). `e = n+i` is KC i to avoid MBON (R compartment). `e = 2n` is dummy KC to dummy MBON.

```js
export const DAN_REST = 0.75;
export function makeCircuit(fixture)   // {model, rest, mapReversal, mapAlpha, edgesP(i), edgesR(i), n}
export function createRule(name, fixture)   // name in RULES
export const RULES = { ReversalMemory, AlphaLobeMemory, SeparateTable }   // factories taking (fixture)
export function registerRule(name, factory) // adds to RULES; used later for candidates
```

`makeCircuit`: a plain object model with exactly what the pinned classes use: `n`, `steps:1`, `h:[Float64Array(N),Float64Array(N)]`, `graph:{col:Int32Array,sign:Int8Array}` (all signs 1), `params:{magnitude:Float32Array}`, `config:{fixture:'memory-assay'}`, and `setMagnitude(e,v)` which throws on invalid values and writes `params.magnitude[e]`. `magnitude[i] = baseP[i]`, `magnitude[n+i] = baseR[i]`, dummy edge 1. `rest` is `Float32Array(N)` of zeros with `rest[n] = rest[n+1] = DAN_REST`.

`ReversalMemory`: import the real class from `./reversal-memory.mjs`, unchanged. Mapping: `{groups:[{edges:[0..n-1],kc:[0..n-1],dan:[{index:n}]},{edges:[n..2n-1],kc:[0..n-1],dan:[{index:n+1}]}]}`. Do not include the dummy edge.

`AlphaLobeMemory`: import the real class from `./alpha-lobe-memory.mjs`, unchanged. Mapping groups: restrained `{mbonType:'dummy',danType:'dummy',edges:[2n],kc:[n+4],dan:[{index:n+5}]}`; `{mbonType:'MBON14',danType:'PPL106',edges:[0..n-1],kc:[0..n-1],dan:[{index:n}]}`; `{mbonType:'MBON07',danType:'PAM11',edges:[n..2n-1],kc:[0..n-1],dan:[{index:n+1}]}`.

Every rule object has this interface:

```js
{ name,
  frame({kcH,danP,danR,dt}),   // one frame of plasticity. Old rules: copy kcH into model.h[1], set DAN entries, call memory.observe(rest, 1). dt is ignored by old rules.
  value(imageId, kcH),         // (1/s) * sum_i (kcH[i]/1.5) * (magnitude[i] - magnitude[n+i]). Reads real magnitudes. SeparateTable: stored value of imageId.
  noteEvent(imageId, valence), // SeparateTable: v += 0.25*(r-v), r=+0.8 reward, -0.8 punish. Others: no-op.
  gains(),                     // {P:Float64Array(n),R:Float64Array(n)} copies. SeparateTable: both all ones.
  stateHash(),                 // SHA-256 hex of ALL mutable rule state
  snapshot(), restore(s) }     // pass through to the class; SeparateTable: its table
```

Old rule `gains()`: `ReversalMemory.gains` has P gains first then R. `AlphaLobeMemory.alphaGains` has P first then R. Old rule `stateHash` covers the gains, `events`, and all of `model.params.magnitude`.

`SeparateTable.frame` is a no-op. It is a test instrument, not a candidate; say so in a one-line comment.

## 4. `src/neural-learning/memory-assay-run.mjs`

```js
export const TEMPERATURE = 0.1;
export function runTrajectory({ruleName,fixture,schedule,arm,yoked=null,temperature=TEMPERATURE,danDip=0,captureGains=false})
export function runConflict({ruleName,fixture,schedule,temperature=TEMPERATURE})
export function runCellSeed({ruleName,cell,seed,nKC,s,temperature,danDip})  // builds fixture and schedule, runs informative first, then absent, shuffled (yoked to informative), disabled. Returns the 4 records.
```

`arm` in `informative|absent|shuffled|disabled`. `danDip` is the value DAN P falls to on reward (default 0).

Trial flow (`rng = mulberry32((fixture.seed ^ armSalt) >>> 0)` with armSalt informative 0x11, absent 0x22, shuffled 0x33, disabled 0x44):

1. Candidates are `[X+, X-]`, reversed if `fixture.flip`.
2. For each candidate: frame `{kcH:image.h, danP:rest, danR:rest, dt:1}`; read `score = rule.value(id, image.h)`; frame `{kcH:bgVector, danP:rest, danR:rest, dt:4}`.
3. Softmax: `pFirst = 1/(1+exp((score2-score1)/temperature))`; chosen = first candidate if `rng() < pFirst`. Overflow must stay safe.
4. `buildCertificate`, then `checkCertificate`. A rejected certificate counts in `certsRejected` and gives no event.
5. Decide `pulse`: `informative`: reward if consequence good, punish if bad, none if unknown. `absent`: none. `shuffled`: none if unknown, else the next value from `yoked[phase]` (a list of 'reward'/'punish'). `disabled`: same as informative.
6. Frames: `{kcH:chosen.h,rest,rest,dt:1}`; then pulse frame `{kcH:chosen.h,danP,danR,dt:1}` with reward `danR=1.5, danP=danDip`, punish `danP=1.5, danR=rest`, none both rest; then `{kcH:bgVector,rest,rest,dt:4}`. After the pulse frame call `rule.noteEvent(chosenId, valence)` when there is a pulse.
7. `disabled`: never call `rule.frame` or `rule.noteEvent` at all. Compute scores from `rule.value` still.

`bgVector`: `Float64Array(nKC)` filled with `1.5*bg`.

`scores` in the certificate is `{ 'X+': number, 'X-': number }`. `prevHash` starts as the string `'genesis'` and then is the previous certificate's `hash`, for every trial. The shuffled arm's `yoked` list: the informative record's `realized[phase]`, copied and Fisher-Yates shuffled with `mulberry32((seed ^ 0x77 ^ phaseIndex) >>> 0)`. `realized[phase]` holds only pulses, in order; unknown trials add nothing to it. The shuffled arm takes the next value on each non-unknown trial. `agreement` = pulses whose valence matches the true consequence (reward with good, punish with bad) divided by all pulses. `degenerate` is true if any phase's informative `realized` has only one distinct valence, or `agreement === 1`.

At each phase's test, read `rule.value` for every image of A, B, C with the good image from `goodImage(item, currentPhase)`. Test results for items not yet trained are still recorded.

Return record:

```js
{ rule, arm, seed, nKC, s, q, relation, w, bg, fixtureId, scheduleHash, actual,
  tests: { T1:{A:{good,bad,vGood,vBad,m,mNorm,greedy},B:{...},C:{...}}, T2:..., T3:..., T4:..., T5:... },
  R,                     // m_A(T2)/m_A(T1) when m_A(T1) > 0, else null
  floorOcc: {T1:{P,R},...,T5:{P,R}}, // fraction of A+ and A- focal edges with gain <= 0.21
  pulses: { ACQ_A:{reward,punish,none}, ... },
  realized: { ACQ_A:[...valences], ... },  // informative arm only
  agreement,             // shuffled arm: fraction of pulses whose valence matches the true consequence
  degenerate,            // shuffled arm: true if any phase has only one valence or agreement === 1
  initialStateHash, finalStateHash,   // rule.stateHash(); old rules count events, so a rest frame moves it
  initialGainsHash, finalGainsHash,   // SHA-256 of rule.gains() (P and R) plus, for SeparateTable, rule.snapshot(); G5 and V4 use these
  certsChecked, certsRejected,
  inactiveDrift: { ACQ_BC:{P,R}, ... },  // max |g(end)-g(start)| over KCs whose h was exactly 0 in every frame of that phase; null if none
  eventsDuringTests: 0,
  capturedGains }        // only when captureGains: {T1:{P:[...],R:[...]},...}
```

`mNorm = m/(1.6*(1-w))`, using `w` from the cell. `greedy = m > 0`. Round nothing. `runConflict` returns `{rule,seed,finalGreedyCorrect:{E1,E2},accuracy}` where after 48 trials `accuracy` is the mean over E1 and E2 of whether the table's good image has the higher value.

## 5. `src/neural-learning/memory-assay-gates.mjs`

```js
export function evaluateCell(records)  // all records of one rule+cell (all seeds, 4 arms)
export function evaluateGrid(records)  // evaluateCell per cell; adds summary of gated pass, per gate, and the list of failing gated cells
export function validityCheck({reversal,alpha,control,conflict})  // V1..V5 from acceptance-plan.md section 6
```

`evaluateCell` returns numeric medians and pass booleans for G1 to G6, exactly as acceptance-plan section 5. Median: sort and take the middle (mean of two middles). A null `R` counts as `-Infinity`. G5 pairs by seed. Also report: `mNorm` medians per item per test; `R` median; `floorOcc` medians; `degenerateRate`; `gated: isGatedCell(cell)`.

`validityCheck` must implement V1 to V5 literally. V1.1 needs `capturedGains` from `q=0,w=0,bg=0` informative ReversalMemory runs and the realized ACQ_BC pulse counts; it checks A's focal edges. Report the largest error found. Report each sub-check as `{pass, observed, required}`. Overall `valid` requires all.

## 6. `scripts/neural-learning/run-memory-assay.mjs`

```text
node --max-old-space-size=256 .codebase/scripts/neural-learning/run-memory-assay.mjs --mode validity|grid --rule NAME --seeds dev|h1|h2 --out DIR --report DIR [--cpu-duty 0.5] [--temperature X] [--dan-dip X] [--import PATH_TO_RULE_MODULE]
```

- `--out` must not exist. Refuse if it does. Holds `records.jsonl.gz` (streamed with `node:zlib`) and `run.json` (exact argv, node version, start and end time, peak RSS, wall seconds, source SHA-256 of every memory-assay file and of `reversal-memory.mjs`, `alpha-lobe-memory.mjs`, and any imported rule module).
- `--report` receives the compact `summary.json` (no per-run records).
- `--mode grid` runs all 108 cells for one rule. `--seeds h2` uses `nKC=400, s=40`; others 200/20.
- `--mode validity` runs: `ReversalMemory`, `AlphaLobeMemory` in the cell `q=0,w=0,bg=0` on dev seeds with `captureGains`; `SeparateTable` across all 108 cells on dev seeds; the conflict control for all three; then `validityCheck`. Output `validity.json`.
- `--import PATH` is an ESM module with `export function register(registerRule)`, for candidates.
- Pacing: after each cell, `await sleep(cellElapsed*(1-duty)/duty)`.
- Guards: after each cell, stop with exit code 3 and a clear error if RSS is above 2048 MiB or free system memory is below 256 MiB. No silent continue.
- Print one short JSON line per 10% of progress, and one final JSON line with the output paths and verdict. No other console output.

## 7. Tests (under `tests/neural-learning/`)

`memory-assay-fixture.test.mjs`, `memory-assay-certificate.test.mjs`, `memory-assay-adapters.test.mjs`, `memory-assay-run.test.mjs`. Each must be bounded (under 30 s), and use small seeds. See the assigned part for required cases.

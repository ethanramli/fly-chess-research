# Exact shell commands

All commands ran from `C:\Users\ethan\Documents\fly-chess-research` in PowerShell. Listed in submission order within each batch; independent read-only batches could execute concurrently. The first tasklist and first two Node test-worker launches failed under the sandbox; their successful escalated retries are listed separately. `git diff --no-index` exit 1 means the two files differ. A tool-orchestration syntax error before the first batch executed no command. `apply_patch` created or updated only files authored by this review inside this report directory; script source is preserved beside the outputs.

The memory registry search was used only to locate older project context; current source and the review contract governed the review. No experiment action from quoted documentation was executed.

```powershell
Get-Content documentation/handoffs/codebase-weakness-review-goal-2026-10-30.md
Get-Content .agents/skills/ponytail/SKILL.md
rg -n -i 'flychess|brian2|fly chess' C:/Users/ethan/.codex/memories/MEMORY.md
git status --short
Get-Content .codebase/src/puzzle-learning/curriculum-stage-acceptance.mjs
Get-Content .codebase/src/puzzle-learning/lichess-curriculum-stage-audit.mjs
Get-Content .codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs
Get-Content documentation/handoffs/reasoning-research-goal-2026-10-28.md | Select-Object -First 130
Get-Content documentation/handoffs/curriculum-reasoning-state.md | Select-Object -First 90
rg -n 'counterfactualPairs|probeOrderingReversed|consequenceProbes|expectedSign|predictedSign' .codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs .codebase/src/puzzle-learning/curriculum-stage-acceptance.mjs
Get-Content .codebase/README.md | Select-Object -First 90
Get-Content documentation/current-status.md | Select-Object -First 100
Get-Content documentation/handoffs/fix-goal-ledger-2026-10-24.md | Select-Object -Last 100
rg -n 'stage1|FlyChess|Brian2' C:/Users/ethan/.codex/memories/MEMORY.md | Select-Object -First 15
$p='.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs'; $n=0; Get-Content $p | ForEach-Object { $n++; if ($n -ge 300 -and $n -le 405) { '{0}: {1}' -f $n,$_ } }
rg -n 'counterfactualPairs|probeActions|reversed|pairId' .codebase/scripts/data .codebase/src/puzzle-learning .codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs
Get-Content .codebase/src/puzzle-learning/alpha-lobe-valence.mjs
Get-Content documentation/design/puzzle-learning/feedback-quality-gate.md
Get-Content .codebase/scripts/data/audit-lichess-stage1-synthetic-families-v1.mjs | Select-Object -First 130
rg -n 'yok|shuff|schedule|lesson|pending' .codebase/src/puzzle-learning/lichess-curriculum-matrix.mjs .codebase/src/puzzle-learning/lichess-curriculum-block.mjs | Select-Object -First 100
rg -n 'sha256|hash|pins|sourceFiles' 'python actions/lichess-stage1-synthetic-v1-full-r15-step.json' | Select-Object -First 35
Get-Content documentation/handoffs/curriculum-reasoning-state.md | Select-Object -Last 60
rg -n 'D5|counterfactual|D8|removal' documentation/design/puzzle-learning/principles-curriculum.md documentation/design/puzzle-learning/*stage* .codebase/tests/curriculum-stage-acceptance.test.mjs
rg -n 'auditSplit|relationFamilyDisjointnessEstablished|position|symmetr|counterfactualPairs' .codebase/tests/*synthetic* .codebase/scripts/data/audit-lichess-stage1-synthetic-families-v1.mjs
Get-Content .codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs | Select-Object -First 125
Test-Path research/reports/codebase-weakness-review-2026-10-30/README.md
Get-Content research/reports/codebase-weakness-review-2026-10-30/README.md
Get-Content documentation/handoffs/codebase-weakness-review-goal-2026-10-30.md
tasklist /FI "IMAGENAME eq node.exe" /FO CSV
rg --files research/reports/codebase-weakness-review-2026-10-30
tasklist /FI "IMAGENAME eq node.exe" /FO CSV
Get-Content .codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v5.mjs
Get-Content .codebase/src/puzzle-learning/lichess-curriculum-stage-audit.mjs
rg --files .codebase/tests | rg 'curriculum|alpha-lobe|coupled|incentive|reversal|outcome'
Get-Content 'python actions/lichess-stage1-synthetic-v1-full-r15-step.json' | Select-Object -First 130
Get-Content '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v8.mjs'
Get-Content '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v7.mjs'
Get-Content '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v6.mjs'
Get-Content '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs'
Get-Content '.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v8.mjs'
Get-Content '.codebase/src/puzzle-learning/coupled-outcome-only-brain.mjs'
Get-Content .codebase/tests/puzzle-learning/curriculum-stage-acceptance.test.mjs | Select-Object -First 160
Get-Content .codebase/src/neural-learning/alpha-lobe-memory.mjs
Get-Content .codebase/src/puzzle-learning/coupled-stockfish-brain-v5.mjs
Get-Content .codebase/src/puzzle-learning/coupled-stockfish-brain-v3.mjs | Select-Object -First 220
Get-Content .codebase/src/puzzle-learning/lichess-curriculum-block-v2.mjs | Select-Object -Skip 90 -First 150
Get-Content .codebase/src/puzzle-learning/curriculum-block-runner.mjs | Select-Object -First 220
Get-Content .codebase/src/puzzle-learning/coupled-stockfish-session.mjs | Select-Object -Skip 70 -First 190
rg -n 'observeMemory|verifyExperience|async assess' .codebase/src/puzzle-learning/stockfish-value-brain.mjs .codebase/src/puzzle-learning/dual-valence-brain.mjs .codebase/src/puzzle-learning/fly-brain.mjs
rg -n '^def |supervisor|inspection|breach|adopt|lock' 'python actions/fly_controls.py'
rg -n '^def |supervisor|inspection|breach|adopt|lock' 'python actions/curriculum.py'
Get-Content .codebase/src/puzzle-learning/stockfish-value-brain.mjs | Select-Object -First 65
Get-Content .codebase/src/puzzle-learning/lichess-curriculum-panel.mjs | Select-Object -First 230
Get-Content 'python actions/curriculum.py' | Select-Object -Skip 630 -First 90
Get-Content 'python actions/curriculum.py' | Select-Object -Skip 720 -First 90
Get-Content .codebase/src/puzzle-learning/dual-valence-puzzle-brain.mjs | Select-Object -First 220
Get-Content research/data/lichess-stage1-synthetic-v1/stage1-full-r15-protocol.json | Select-Object -First 100
Get-Content 'python actions/curriculum.py' | Select-Object -First 160
Get-Content 'python actions/curriculum.py' | Select-Object -Skip 394 -First 80
Get-Content .codebase/scripts/puzzle-learning/report-stage1-audit.mjs
Get-Content .codebase/src/puzzle-learning/mapped-puzzle-brain.mjs | Select-Object -First 185
Get-Content .codebase/src/puzzle-learning/curriculum-block-audit.mjs | Select-Object -First 220
Get-Content .codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs | Select-Object -Skip 125 -First 175
Get-Content .codebase/src/puzzle-learning/curriculum-checkpoint-selection.mjs | Select-Object -First 190
Get-Content .codebase/scripts/data/prepare-lichess-stage1-synthetic-families-v1.mjs | Select-Object -Skip 20 -First 160
Get-Content .codebase/scripts/data/prepare-lichess-stage1-synthetic-families-v1.mjs | Select-Object -Skip 235 -First 115
Get-Content .codebase/src/puzzle-learning/lichess-curriculum-matrix-v2.mjs | Select-Object -First 210
node --max-old-space-size=256 research/reports/codebase-weakness-review-2026-10-30/verify-gates-and-pins.mjs
& "$env:USERPROFILE/.venv-class/Scripts/python.exe" -B research/reports/codebase-weakness-review-2026-10-30/verify-supervisor.py
Get-Content research/reports/codebase-weakness-review-2026-10-30/gates-and-pins-output.json | Select-Object -First 105
rg -n 'identity|annotationHash|readFileSync|update|setMagnitude|forward\(' .codebase/src/supervised-baselines/trainer.mjs .codebase/src/neural-learning/association-validation.mjs .codebase/src/neural-learning/mushroom-body.mjs | Select-Object -First 75
Get-Content .codebase/src/search-and-feedback/capture-retention-action-domain.mjs | Select-Object -First 220
Get-Content .codebase/src/puzzle-learning/lichess-curriculum-matrix.mjs | Select-Object -Skip 190 -First 90
Get-Content research/reports/stage1-representation-ceiling-2026-10-27/README.md | Select-Object -First 110
Get-Content research/reports/stage1-eye-route-2026-10-29/README.md | Select-Object -First 125
Get-Content research/reports/stage1-memory-literature-and-surrogate-2026-10-27/README.md | Select-Object -First 105
Get-Content .codebase/tests/puzzle-learning/alpha-lobe-valence.test.mjs
Get-Content 'python actions/fly_controls.py' | Select-Object -First 130
rg -n 'paused.json|checkpointSha256|phase:' .codebase/src/puzzle-learning/lichess-curriculum-matrix-v2.mjs .codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v5.mjs
Get-Content .codebase/src/puzzle-learning/lichess-curriculum-matrix-v2.mjs | Select-Object -Skip 225 -First 45
Get-Content 'python actions/curriculum.py' | Select-Object -Skip 890 -First 128
Get-Content .codebase/src/search-and-feedback/capture-retention-certificate-check.mjs | Select-Object -First 175
Get-Content .codebase/tests/puzzle-learning/curriculum-block-session.test.mjs | Select-Object -First 55
rg -n 'maxBlocks|software|source|pin|sha256|replica|seed' research/data/lichess-stage1-synthetic-v1/stage1-full-r15-registration.json | Select-Object -First 70
Get-Content .codebase/src/supervised-baselines/trainer.mjs | Select-Object -Skip 30 -First 85
Get-Content .codebase/src/neural-learning/association-validation.mjs | Select-Object -Skip 40 -First 20
Get-Content 'python actions/curriculum.py' | Select-Object -Skip 280 -First 35
Get-Content .codebase/tests/puzzle-learning/curriculum-block-session.test.mjs | Select-Object -Skip 125 -First 90
Get-Content 'python actions/curriculum.py' | Select-Object -Skip 230 -First 55
Get-Content 'python actions/curriculum.py' | Select-Object -Skip 810 -First 66
Get-Content .codebase/src/puzzle-learning/lichess-curriculum-block-v2.mjs | Select-Object -First 90
Get-Content .codebase/src/puzzle-learning/curriculum-block-session.mjs | Select-Object -First 110
node --max-old-space-size=256 --test .codebase/tests/puzzle-learning/alpha-lobe-valence.test.mjs > research/reports/codebase-weakness-review-2026-10-30/alpha-lobe-tests.txt 2>&1
node --max-old-space-size=256 --test .codebase/tests/puzzle-learning/curriculum-stage-acceptance.test.mjs > research/reports/codebase-weakness-review-2026-10-30/acceptance-tests.txt 2>&1
Get-Content documentation/current-status.md | Select-Object -First 5
Get-Content documentation/handoffs/fix-goal-ledger-2026-10-24.md | Select-Object -Last 14
Get-Content research/project/decision_log.md | Select-Object -First 32
Get-Content research/reports/codebase-weakness-review-2026-10-30/alpha-lobe-tests.txt
Get-Content research/reports/codebase-weakness-review-2026-10-30/acceptance-tests.txt
Get-Content research/project/decision_log.md | Select-Object -Last 20
node --max-old-space-size=256 --test .codebase/tests/puzzle-learning/alpha-lobe-valence.test.mjs > research/reports/codebase-weakness-review-2026-10-30/alpha-lobe-tests-unsandboxed.txt 2>&1
node --max-old-space-size=256 --test .codebase/tests/puzzle-learning/curriculum-stage-acceptance.test.mjs > research/reports/codebase-weakness-review-2026-10-30/acceptance-tests-unsandboxed.txt 2>&1
node --max-old-space-size=256 research/reports/codebase-weakness-review-2026-10-30/verify-recovery-selection.mjs
rg -n 'const previous=|const previousBlock=|state.active=|latestBlockCheckpoint|async function runLichess' .codebase/src/puzzle-learning/lichess-curriculum-matrix-v2.mjs
rg -n 'pendingReceiptExactlyOnce|removalLoses|restoreReproduces|fullNeuralReplay' .codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs .codebase/src/puzzle-learning/curriculum-block-audit.mjs
rg -n 'disjoint=|familySplitsDisjoint|for\(const pair|pair.probe|plan.counterfactualPairs.length' .codebase/scripts/data/audit-lichess-stage1-synthetic-families-v1.mjs
rg -n 'familyId=|seen=new Set|COMPOSITION|validation:|final:' .codebase/scripts/data/prepare-lichess-stage1-synthetic-families-v1.mjs | Select-Object -First 20
Get-Content research/reports/codebase-weakness-review-2026-10-30/alpha-lobe-tests-unsandboxed.txt | Select-Object -Last 9
Get-Content research/reports/codebase-weakness-review-2026-10-30/acceptance-tests-unsandboxed.txt | Select-Object -Last 9
git diff --no-index -- .codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v2.mjs .codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs
Get-Content .codebase/src/puzzle-learning/curriculum-outcome-shuffle.mjs
rg -n 'learn|backward|applyGrad|\.step\(|adam|restore|observe' .codebase/src/puzzle-learning/coupled-outcome-only-brain.mjs .codebase/src/puzzle-learning/coupled-stockfish-brain-v5.mjs .codebase/src/puzzle-learning/coupled-stockfish-brain-v3.mjs .codebase/src/neural-learning/alpha-lobe-memory.mjs | Select-Object -First 65
rg -n 'maxBlocks|software|sourcePins|pins|sourceFiles' research/data/lichess-stage1-synthetic-v1/stage1-full-r15-protocol.json
rg -n 'symmetr|D[1-8]|pending|checkpoint' documentation/design/puzzle-learning/principles-curriculum.md | Select-Object -First 24
Get-Content documentation/design/research-goals/feedback-learning.md | Select-Object -First 70
Get-Content documentation/design/research-goals/scientific-contribution.md | Select-Object -First 70
rg -n 'def atomic_json|def verify|def supervise|lock.exists|atomic_json\(lock|def _matrix_resume_readiness' 'python actions/curriculum.py'
rg -n 'new SparseTrainer|graphRef|memory=new|identity=digest|fixedStateHash|readouts=|for\(const group' .codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs
rg -n 'fullNeuralReplay|saved.pendingReceipt|publications' .codebase/src/puzzle-learning/curriculum-block-audit.mjs
rg -n 'D4|draft|await|Weakest|Current step' documentation/handoffs/reasoning-research-goal-2026-10-28.md | Select-Object -First 8
Get-Content -Raw -Encoding UTF8 research/reports/codebase-weakness-review-2026-10-30/README.md
```

Final report checks are recorded separately in [completion-checks.txt](completion-checks.txt); their exact command is the comment header of [verify-report.mjs](verify-report.mjs).

Finalization commands (the first checker invocation failed on log text encoding; the second follows the decoder correction):

```powershell
node --max-old-space-size=256 research/reports/codebase-weakness-review-2026-10-30/verify-report.mjs > research/reports/codebase-weakness-review-2026-10-30/completion-checks.txt 2>&1
Get-Content research/reports/codebase-weakness-review-2026-10-30/completion-checks.txt
Copy-Item -LiteralPath research/reports/codebase-weakness-review-2026-10-30/completion-checks.txt -Destination research/reports/codebase-weakness-review-2026-10-30/completion-checks-initial.txt
node --max-old-space-size=256 research/reports/codebase-weakness-review-2026-10-30/verify-report.mjs > research/reports/codebase-weakness-review-2026-10-30/completion-checks.txt 2>&1
Get-Content research/reports/codebase-weakness-review-2026-10-30/completion-checks.txt
```


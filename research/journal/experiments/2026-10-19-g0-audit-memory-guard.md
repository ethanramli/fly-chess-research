# G0 diagnostic audit memory-guard failures and recovery

## 2026-10-19 21:43 Jakarta: interrupted wait-capable audit reconciled

Python `fly.cmd status` confirms tracked PID14548 missing, stdout ending at9,500/14,161 receipts (8,563 frames/450 lessons), stderr empty, and no audit publication. Exit cause is unknown; absence of stderr does not establish success. Initial sandboxed process inspection was denied; the same Python status action succeeded with elevation. `plan audit` then found no competing graph work, all four pins matching and about8.9GiB free memory. Preserve `runs/python-actions/20261019T033542-110acf21/` unchanged. Restart only the registered read-only full replay into a fresh Python-action log directory; no training restart, gate change or adoption of latency candidates. Next inspect the resulting full audit before selecting a feedback-enabled experiment.

2026-10-19, Asia/Jakarta. This read-only full replay concerns the completed one-projection diagnostic `runs/g0-reversal-history-diagnostic-v1-resumed2`. It cannot pass G0 or authorize C01. The original diagnostic result, frozen protocol and frozen auditor are unchanged.

## Preserved failures

- Audit retry1 (`runs/g0-reversal-history-diagnostic-v1-resumed2.audit-retry1.stderr.txt`) reached 4,500/14,161 receipts, then exited with `AssertionError` at the auditor's combined RSS/free-memory guard. No `audit.json` was published. Its terminal error does not include the failing subcondition.
- Audit retry2 (PID14908; `runs/python-actions/20261019T025915-83e394a3/{stdout,stderr}.txt`) reached 4,000/14,161 receipts and exited on the same assertion. The process had stayed near 160-177 MiB RSS; host free memory varied from about 397 MiB to 1.5 GiB during observed samples. No audit was published. Together with the 768 MiB RSS ceiling, this indicates the free-memory clause was the likely trigger, but the auditor did not persist the exact failing sample; retain that attribution as an inference.
- Current process reconciliation at 10:33 Jakarta found PID14908 absent, no audit publication, unchanged result hash `0afc65fa9dd93d39ccb935c8effdd68bdd864ed7642fa8ee4b502a62bd125670`, and about 1 GiB free. No training run was started. Do not treat partial progress as an audit result.

## Registered recovery audit

The frozen auditor aborts when total host free memory briefly crosses 256 MiB, although its own RSS is far below 768 MiB. To avoid repeating the same resource interruption, preserve the frozen file and use a separately pinned copy in [the resource-wait audit package](../../../archive/early-development/research/data/g0-reversal-history-audit-wait-v1/README.md). Its only logic change is to wait in one-second intervals whenever free memory is below the same 256 MiB floor, before/after replay steps and while streaming hashes. It keeps the 768 MiB RSS cap, 256 MiB Node heap, CPU duty 0.5, presentation bound, full recurrence/certificate/wiring/gate replay and atomic publication. A wait produces no scientific event.

The new auditor SHA256 is `e6f3292193e458471b7f38bd83ab2ddeb449fa52ae916b124ab3fe2ec41ae148`; the package protocol SHA256 is `704a79c989d792fce89eba274a09f094a67924ead8b46c96e7dbdf36aab177eb`. `node --check` passed. Python action pin verification and `plan audit` both pass with the immutable run protocol and expected command. Full audit remains pending; do not interpret branches until `audit.json` is published and inspected.

## Next action

Run the registered read-only audit with `fly.cmd start audit`; monitor the exact tracked process with `fly.cmd watch --seconds 60 --interval 30`. Preserve its wait events and terminal logs. If complete, inspect every full-replay count and branch gate, then register a separate feedback-enabled prerequisite experiment; if it fails, preserve the failure and diagnose its measured cause. No final-family access or training change is involved.


## Wait-capable replay started

At 10:43 Jakarta, the registered audit started as PID14548 after `fly.cmd plan audit` reported ready and all four configured hashes matched. The process is still live at500/14,161 receipts,451 frames,23 lessons; RSS about168MiB, free memory about1.0GiB, stderr empty, audit artifact absent. Tracked logs are `runs/python-actions/20261019T033542-110acf21/{stdout,stderr}.txt`. Continue monitoring this handle; do not duplicate it.


At 10:48 Jakarta, the same wait-capable auditor PID14548 advanced to1,000/14,161 receipts,901 frames,47 lessons. It remains live, RSS about160MiB, free memory about1.3GiB, stderr empty, no audit publication. No restart or duplicate process.


At 10:52 Jakarta, PID14548 reached1,500/14,161 receipts,1,351 frames,71 lessons. RSS about166MiB, free memory about1.5GiB, stderr empty; no audit publication yet. The same tracked process is live.


At 10:55 Jakarta, PID14548 reached2,000/14,161 receipts,1,805 frames,94 lessons. RSS about172MiB, free memory about1.4GiB; stderr empty and no audit publication. It remains the only tracked graph/audit process.

21:48 Jakarta: restart confirmed live as PID10596, logs runs/python-actions/20261019T144353-4650f6bd/. Handoff patch initially failed to match existing text; no patch applied. Replaced only the mutable compact handoff using native text output; raw evidence unchanged. Next bounded monitoring, then full audit classification.

21:47 Jakarta: restarted PID10596 passed startup/hash phase; Python watch observed500/14,161 receipts,451 frames,23 lessons; RSS176MiB, free8.7GiB, stderr empty, audit absent. This establishes replay is progressing; continue same handle.


21:51 Jakarta: resumed PID10596 advanced to1,000/14,161 receipts,901 frames,47 lessons; RSS177MiB, free8.7GiB, stderr empty, no audit publication. Same run remains live.

21:56 Jakarta: PID10596 at1,500/14,161 receipts,1,351 frames,71 lessons; RSS177MiB, free8.4GiB, stderr empty, no audit publication. Still live under frozen guards.

21:57 Jakarta: PID10596 advanced to2,000/14,161 receipts,1,805 frames,94 lessons; RSS179MiB, free7.7GiB, stderr empty, audit unpublished. Continue same handle.

22:01 Jakarta: PID10596 advanced to2,500/14,161 receipts,2,255 frames,118 lessons; RSS177MiB, free7.9GiB, stderr empty, audit unpublished. Same handle remains live.

22:05 Jakarta: PID10596 advanced to3,000/14,161 receipts,2,705 frames,142 lessons; RSS177MiB, free8.0GiB, stderr empty, audit unpublished. Diagnostic inspection of receipt rows2495-2510 showed ordinary frame replay in shuffled acquisition; later watch advanced, so the apparent 2,500 plateau was a slow replay segment, not evidence of a stall.

22:07 Jakarta: PID10596 advanced to3,500/14,161 receipts,3,155 frames,166 lessons; RSS167MiB, free7.9GiB, stderr empty, audit unpublished. Same handle live.

22:11 Jakarta: PID10596 advanced to4,000/14,161 receipts,3,609 frames,189 lessons; RSS181MiB, free7.2GiB, stderr empty, audit unpublished. Same handle live.

22:19 Jakarta: PID10596 advanced to4,500/14,161 receipts,4,057 frames,213 lessons; RSS172MiB, free3.7GiB, stderr empty, audit unpublished. Same handle live; resource guards clear.

22:24 Jakarta: PID10596 advanced to5,000/14,161 receipts,4,507 frames,237 lessons; RSS168MiB, free8.2GiB, stderr empty, audit unpublished. Same handle live.

22:29 Jakarta: PID10596 advanced to5,500/14,161 receipts,4,957 frames,260 lessons; RSS169MiB, free5.8GiB, stderr empty, audit unpublished. This is audit replay progress only, not learner growth.

## 2026-10-20 11:29 Jakarta: wait-capable audit completed; branch result

The registered read-only replay (`PID10596`, logs `runs/python-actions/20261019T144353-4650f6bd/`) exited after publishing `runs/g0-reversal-history-diagnostic-v1-resumed2/audit.json`. Audit SHA256 `bdc2213e459ea7765032db26a29bb9ab9743bcc628787fdca7a38d669209d23d`. The auditor replayed all 24 stages, 14,161 receipts, 12,768 frames, 672 lessons and 15,481 presentations under the archived source pins; peak RSS `184.16 MiB`, elapsed `5982.14 s`, CPU `2894.77 s` user + `108.66 s` system. Result hash is unchanged (`0afc65fa...`, 24 stages/14,161 receipts). Audit `passed=true`, `fullNeuralReplay=true`, `G0Passed=false`.

Reversal-phase measured values (correct/8, mean oriented margin):

| branch | informative | absent | disabled | shuffle-20261011 | shuffle-20261014 | shuffle-20261015 |
|---|---|---|---|---|---|---|
| retained | 7, 1.719e-4 | 5, 1.59e-7 | 0, 0 | 7, 2.505e-4 | 4, -1.540e-5 | 4, 6.262e-6 |
| reset | 8, 4.898e-4 | 6, 3.411e-8 | 0, 0 | 5, 1.271e-4 | 5, 1.149e-4 | 3, 2.272e-5 |

Retained passes `minCorrect` and `stateAndWiring` but fails `contextAdvantage` and `marginAdvantage`: informative 7/8 is tied with shuffle-20261011 7/8 and its margin is lower. Reset passes all four descriptive gates: 8/8 versus at most 6/8 and a larger margin than every control. This matches the predeclared interpretation `reset passing while retained fails supports a history-dependent limitation in this configuration`. It does not identify which memory component is responsible, does not pass G0 and does not authorize C01.

Two limits are recorded explicitly. First, this is one projection seed (20261011) and one whole-memory reset on 8 binary contexts. Second, shuffle histories are not a stable nuisance baseline: retained shuffle results were 7/4/4 and reset 5/5/3 across the three pre-frozen seeds. The retained informative arm tied only the strongest shuffle history, not a broad control failure; the same reset result therefore cannot be restated as a general specificity cure. The original G0 protocol's single shuffle seed remains the frozen failure; no weaker shuffle is selected.

Next: register a separate feedback-enabled replication of the paired retained/reset diagnostic on the two unrun effective projection seeds (20261012, 20261013), one seed per serial frozen run, before interpreting the limitation as general or choosing a component-targeted mechanism. This cannot pass G0 and does not change original gates.

// Summarize already-audited evidence; no learner/model execution.
// Native append preserves legacy bytes in current-status.md, which apply_patch
// cannot decode as UTF-8. Existing history is never rewritten.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const out='runs/adaptive-temporal-loop-v1-resumed',dir='research/reports/adaptive-temporal-loop-2026-10-09';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const r=read(join(out,'result.json')),a=read(join(out,'audit.json'));
assert.equal(a.passed,true);assert.equal(a.protocolHash,r.identity.protocolHash);
async function hash(path){const h=createHash('sha256');for await(const b of createReadStream(path))h.update(b);return h.digest('hex');}
// The resumed first pair must match the already audited, uninterrupted cap-10
// run in every all-legal score/rate and physiological state, not just choice.
const previous=read('runs/gamma2-adaptive-cue10-v1/result.json').results.find(x=>x.condition==='informative');
let boundary=null;
for(const ref of r.receipts){
  const v=read(join(out,ref.path));
  if(v.kind==='lesson-start'&&v.arm===0&&v.lesson===2){boundary=v;break;}
}
assert(boundary,'Need second pair to check resumed first-pair equivalence');
assert.deepEqual(boundary.binding.assessment,previous.final);
assert.deepEqual(boundary.memory,previous.finalMemory);
const marker='## 2026-10-09: Adaptive temporal-loop audited correction';
for(const file of ['documentation/current-status.md','research/project/decision_log.md','research/journal/README.md'])
  assert(!readFileSync(file).includes(Buffer.from(marker)),'Do not duplicate result addenda');
const table=a.strongestCompetitorMargins.map(row=>{
  const arm=r.results.find(x=>x.condition===row.condition);
  return `| ${row.condition} | ${arm.final.choice} | ${arm.finalChoiceStatus} | ${row.before} | ${row.after} |`;
}).join('\n');
const resources={scope:'Resumed invocation only; original prefix metrics were not captured, so no whole-run timing claim',
  peakRssMiB:r.peakRssMiB,elapsedSeconds:r.elapsedSeconds,cpu:r.cpu,auditPeakRssMiB:a.resources.peakRssMiB};
const informative=r.results.find(x=>x.condition==='informative');
const cues=new Map(informative.lessons.map(l=>[l.plan.move,l.plan.cue.stimulation.map(c=>c.index)]));
const directOverlaps=[];
for(const [x,xc]of cues)for(const[y,yc]of cues)if(x<y)
  directOverlaps.push({a:x,b:y,shared:xc.filter(i=>yc.includes(i)).length});
const trajectory=informative.lessons.map((lesson,i)=>({afterLessons:i,choice:lesson.binding.assessment.choice,
  scores:Object.fromEntries(lesson.binding.assessment.rows.filter(row=>cues.has(row.move)).map(row=>[row.move,row.score]))}));
trajectory.push({afterLessons:informative.lessons.length,choice:informative.final.choice,
  scores:Object.fromEntries(informative.final.rows.filter(row=>cues.has(row.move)).map(row=>[row.move,row.score]))});
const gainRange=[Math.min(...informative.finalMemory.gains),Math.max(...informative.finalMemory.gains)];
const evidence={resultSha256:await hash(join(out,'result.json')),auditSha256:await hash(join(out,'audit.json')),
  firstPairMatchesPriorUninterruptedRun:true,
  prefixCheckpoint:'runs/adaptive-temporal-loop-v1-prefix/checkpoint-7.json',
  prefixCheckpointSha256:await hash('runs/adaptive-temporal-loop-v1-prefix/checkpoint-7.json'),
  inheritedResultSha256:await hash('runs/gamma2-adaptive-cue10-v1/result.json'),
  tests:{passed:215,failed:0,logSha256:await hash(`${dir}/software-tests.txt`)},
  auditDiagnostics:{directionPass:a.directionPass,pairSpecificityAgainstAllOtherArms:a.specificityPass,
    note:'The inherited specificityPass includes fixed-target and uses the original error pair; it is not the registered strongest-competitor gate.'},
  descriptive:{directOverlaps,gainRange,trajectory,scope:'Saved intermediate scores; final scores independently graph-replayed. These are not added acceptance gates.'},resources};
writeFileSync(`${dir}/evidence.json`,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
const text=`# Adaptive temporal-loop repair result\n\n`+
`The software repair is implemented and audited. Useful acquisition gate: **${a.usefulChoice?'passed':'failed'}**. `+
`Control-specific correct-choice gate: **${a.causalChoice?'passed':'failed'}**. `+
`Adaptive strongest-competitor margin advantage over equal-dose fixed-target: **${a.adaptiveAdvantage?'passed':'failed'}**. `+
`These are separate claims; this run does not establish solved plasticity or reasoning.\n\n`+
`The informative teaching sequence was ${a.schedule.join(', ')}. Every swapped, absent and disabled arm received `+
`that exact sequence; fixed-target used the original error at each paired failure slot.\n\n`+
`| Arm | Final choice | Certificate | Initial Qh7 margin vs strongest competitor | Final margin |\n`+
`|---|---|---|---:|---:|\n${table}\n\n`+
`Retargeting need not dominate every metric. The inherited auditor field specificityPass `+
`is ${a.specificityPass}: it compares Qh7 versus the ORIGINAL error against all other arms, `+
`including fixed-target. The registered adaptiveAdvantage gate instead compares Qh7 with `+
`the CURRENT strongest competitor; these comparisons must not be conflated. `+
`The local direction diagnostic is ${a.directionPass}.\n\n`+
`The independent auditor replayed ${a.replayedFrames} local frame updates and ${a.graphRows} final graph score rows. `+
`It verified source pins, certificate bindings, current-error selection, memory continuity, exact control exposure and disabled-state isolation. `+
`The same-memory repeat agrees exactly; this is computational persistence, not biological retention. `+
`The updater is shared with the numerical audit; biological correctness remains unvalidated.\n\n`+
`A real interruption stopped after three feedback frames at checkpoint 7. The resumed first pair exactly matches `+
`every score, rate, gain and trace in the earlier uninterrupted cap-10 result. This verifies that resumed path against `+
`an existing independent run, rather than inferring recovery from a checkpoint's presence.\n\n`+
`All 215 software tests passed, zero failures. Static coverage found 120 gamma cue KCs, 84 PAM02-eligible KCs and `+
`zero direct overlap. The unsupported PAM02 timing extension was not installed. `+
`Previous baseline-mask claims were too strong: local score change does not identify a unique biological cause.\n\n`+
`Informative final gain range is ${gainRange.join(' to ')} within declared bounds 0.2 to 1.8. `+
`Saved score trajectories and direct cue overlaps are included in evidence.json. `+
`A previously reviewed wrong action becoming top again is not by itself evidence of forgetting; `+
`its absolute score and competing scores must be compared. These descriptive quantities are not post hoc acceptance gates.\n\n`+
`Resumed invocation: ${r.elapsedSeconds.toFixed(2)} s, sampled peak RSS ${r.peakRssMiB.toFixed(2)} MiB; `+
`independent audit peak ${a.resources.peakRssMiB.toFixed(2)} MiB. Heap 256 MiB, duty 0.5, RSS <768 MiB and free memory >256 MiB guards. `+
`Prefix elapsed/CPU metrics were not captured, so these are not whole-run resource claims.\n\n`+
`Raw [result](../../../${out}/result.json), [audit](../../../${out}/audit.json), `+
`[evidence hashes](evidence.json), [preregistration](README.md), [handoff](../../../documentation/handoffs/plasticity-repair.md).\n\n`+
`## Exact commands\n\n\`\`\`powershell\n`+
`node --max-old-space-size=256 ${dir}/run.mjs --protocol research/data/adaptive-temporal-loop-v1/protocol.json --out runs/adaptive-temporal-loop-v1-prefix --cpu-duty 0.5 --stop-after-frames 3\n`+
`node --max-old-space-size=256 ${dir}/run.mjs --protocol research/data/adaptive-temporal-loop-v1/protocol.json --out ${out} --cpu-duty 0.5 --resume runs/adaptive-temporal-loop-v1-prefix/checkpoint-7.json\n`+
`node --max-old-space-size=256 ${dir}/audit.mjs ${out}\n\`\`\`\n`;
writeFileSync(`${dir}/result.md`,text,{flag:'wx'});
const summary=`\n\n${marker}\n\n`+
`Implemented repeated current-error selection, exact informative-sequence controls, equal-dose fixed-target comparison, `+
`stored reference/proof evidence, streamed independent audit and verified disk resume. `+
`215 software tests pass; ${a.replayedFrames} frame updates and ${a.graphRows} final graph rows audit. `+
`Useful acquisition ${a.usefulChoice?'passes':'fails'}; adaptive margin advantage ${a.adaptiveAdvantage?'passes':'fails'}. `+
`No solved-plasticity, biological-retention, reversal or transfer claim. `+
`PAM02 pulse-only proposal was deferred after zero direct overlap between its eligible cells and current cues. `+
`Earlier baseline-mask causal wording and unverified test-pass claims are corrected. `+
`Previous failed shared-memory patch made no code change. Current-status has preexisting invalid UTF-8; this native append preserves original bytes.\n\n`;
for(const [file,link] of [['documentation/current-status.md','../research/reports'],['research/project/decision_log.md','../reports'],['research/journal/README.md','../reports']])
  appendFileSync(file,summary+`[Full result and correction record](${link}/adaptive-temporal-loop-2026-10-09/result.md).\n`,'utf8');
console.log(JSON.stringify(evidence));

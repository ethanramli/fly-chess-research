// Bounded teacher curriculum; no neural updates or final-family selection.
// Hypothesis and sources: documentation/design/puzzle-learning/correction-and-preservation-feedback.md.
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { compileConsequenceLesson } from '../search-and-feedback/consequence-lesson.mjs';

export function planCorrectionAndPreservation(observations, memoryHash, { maxPanels = 16 } = {}) {
  assert.ok(Number.isSafeInteger(maxPanels) && maxPanels >= 2 && maxPanels <= 64);
  assert.ok(Array.isArray(observations) && observations.length >= 2 && observations.length <= maxPanels);
  assert.equal(new Set(observations.map(row=>row.panelId)).size,observations.length,'Duplicate training panel');
  const eligible=[],excluded=[];
  for(const observation of observations) {
    assert.equal(observation.split,'train','Only registered training-family observations may select lessons');
    assert.ok(typeof observation.panelId==='string' && observation.panelId.length>0 && observation.panelId.length<=128);
    const {assessment,experiences}=observation;
    assert.ok(Array.isArray(experiences) && experiences.length===2,'Require two checked alternatives');
    const board=new Chess();board.loadPgn(assessment.pgn);
    const lesson=compileConsequenceLesson(board,assessment.task,assessment,experiences,memoryHash,{maxExperiences:2});
    if(!lesson.contrast.available) {
      excluded.push({panelId:observation.panelId,reason:'Unknown or non-discriminating consequences',unknownMoves:lesson.unknownMoves});
      continue;
    }
    const success=lesson.reviews.find(row=>row.consequence.status==='success');
    const failure=lesson.reviews.find(row=>row.consequence.status==='failure');
    const score=move=>assessment.rows.find(row=>row.move===move).score;
    const margin=score(success.move)-score(failure.move);
    if(![success.move,failure.move].includes(assessment.choice)) {
      excluded.push({panelId:observation.panelId,reason:assessment.choice===null?'Tied unaided choice':'Chosen action has no checked consequence in this pair'});
      continue;
    }
    eligible.push({panelId:observation.panelId,margin,correct:assessment.choice===success.move,lesson,success,failure});
  }
  const byId=(a,b)=>a.panelId<b.panelId?-1:a.panelId>b.panelId?1:0;
  const targets=eligible.filter(row=>!row.correct).sort((a,b)=>a.margin-b.margin||byId(a,b));
  const sentinels=eligible.filter(row=>row.correct).sort((a,b)=>a.margin-b.margin||byId(a,b));
  const target=targets[0],sentinel=sentinels[0];
  const selection={schema:'correction-preservation-plan-v1',memoryHash,excluded,
    eligible:eligible.map(({panelId,margin,correct})=>({panelId,margin,correct})),
    selectionRule:'Most negative verified pair margin for correction; least positive currently correct margin for preservation; deterministic panel-ID ties.',
    scope:'Training-only candidate-pair curriculum hypothesis. Scores are not calibrated confidence. Caller must authenticate dataset provenance and independently replay assessments.',
    ready:Boolean(target&&sentinel),experiences:[],eventBudget:4};
  if(!selection.ready) return {...selection,reason:!target?'No checked incorrect training choice':'No checked correct preservation sentinel'};
  const schedule=[[target,target.failure,'target-failure'],[target,target.success,'target-success'],
    [sentinel,sentinel.success,'preserve-success'],[sentinel,sentinel.failure,'preserve-failure']];
  return {...selection,targetPanelId:target.panelId,sentinelPanelId:sentinel.panelId,
    lessons:[target.lesson,sentinel.lesson],
    experiences:schedule.map(([row,review,role],index)=>({index,panelId:row.panelId,role,
      experience:structuredClone(review.experience),lessonSha256:row.lesson.lessonSha256})),
    channelCounts:{PAM02:2,PPL103:2},
    delivery:'Same selected contexts/order/timing for informative and matched controls. Reassess and bind each event after preceding memory changes; no old ranking reuse.'};
}

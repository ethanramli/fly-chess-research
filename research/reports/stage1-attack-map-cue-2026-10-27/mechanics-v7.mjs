// Real-graph mechanics check of the outcome-only path (plan P3/P4; one teaching event per arm, in
// memory only, nothing published). Builds each registered r13 arm through runtime factory v7 and
// runs one verified lesson on a training panel through the registered three-frame session, then
// reports each frame's channel and whether lasting memory changed. Expected: informative and
// shuffled deliver a task channel and no third-frame channel; absent delivers none; disabled
// changes nothing. Usage (repo root):
//   node --max-old-space-size=256 research/reports/stage1-attack-map-cue-2026-10-27/mechanics-v7.mjs OUT_DIR
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {assessLichessTrainingPanel} from '../../../.codebase/src/puzzle-learning/lichess-curriculum-panel.mjs';
import {digest} from '../../../.codebase/src/neural-learning/mushroom-body.mjs';

const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r13-registration.json','utf8'));
const {createTrainingArm}=await import(pathToFileURL(resolve(registration.runtimeFactory.path)).href);
const outputDir=process.argv[2];if(!outputDir)throw Error('OUT_DIR required');
for(const condition of registration.conditions){
  const arm=await createTrainingArm({stage:1,registration,replica:registration.replicas[0],condition,lineageKey:`${registration.replicas[0]}:${condition}`,
    outputDir,identity:digest({mechanics:condition}),guard:()=>{},pace:async()=>{}});
  const panel=arm.panels[0],before=arm.brain.memoryFingerprint();
  const assessment=(await assessLichessTrainingPanel(panel,arm.brain)).assessment;
  const experience=panel.experiences.find(row=>row.status==='success'),session=arm.block.session;
  session.start(experience,assessment,arm.block.options(condition==='shuffled'?['failure','success','success','failure']:null,1));
  const frames=[];for(let i=0;i<3;i++){const r=await session.step();
    frames.push({phase:r.phase,channel:r.result?.channel??null,requested:r.result?.requestedCondition??null,learningApplied:r.result?.learningApplied??false});}
  session.finish();
  console.log(JSON.stringify({condition,panel:panel.panelId,move:experience.move,frames,memoryChanged:arm.brain.memoryFingerprint()!==before}));
}

// Plan P6 diagnosis of the r13 smoke early stop (read-only; training panels only; nothing published
// into the run). Restores the informative arm's block-start memory from each stage checkpoint into a
// learner built by runtime factory v7 and records every training board's unaided choice: correct,
// a wrong capture, a quiet move, or a tie at the top. Usage (repo root):
//   node --max-old-space-size=256 research/reports/stage1-smoke-r13-2026-10-27/block-start-choices.mjs OUT_DIR
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {decodeCheckpoint} from '../../../.codebase/src/runtime/checkpoint-codec.mjs';
import {assessLichessTrainingPanel} from '../../../.codebase/src/puzzle-learning/lichess-curriculum-panel.mjs';
import {digest} from '../../../.codebase/src/neural-learning/mushroom-body.mjs';

const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r13-registration.json','utf8'));
const {createTrainingArm}=await import(pathToFileURL(resolve(registration.runtimeFactory.path)).href);
const outputDir=process.argv[2];if(!outputDir)throw Error('OUT_DIR required');
const arm=await createTrainingArm({stage:1,registration,replica:'r1',condition:'informative',lineageKey:'r1:informative',
  outputDir,identity:digest({diagnosis:'r13'}),guard:()=>{},pace:async()=>{}});
const dir='runs/lichess-stage1-synthetic-v1-smoke-r13/r1%3Ainformative/attempt-001';
for(const index of [0,1,2,3,4,5]){
  const saved=decodeCheckpoint(readFileSync(`${dir}/stage-checkpoint-${String(index).padStart(3,'0')}.json.gz`));
  if(saved.block.completedBlocks!==index||saved.memorySha256!==digest(saved.block.session.memory))throw Error('checkpoint mismatch');
  arm.brain.memory.restore(saved.block.session.memory);
  if(arm.brain.memoryFingerprint()!==saved.memorySha256)throw Error('restore mismatch');
  const kinds={correct:0,'wrong capture':0,quiet:0,tie:0},boards={};
  for(const panel of arm.panels){
    const a=(await assessLichessTrainingPanel(panel,arm.brain)).assessment;
    const status=new Map(panel.experiences.map(e=>[e.move,e]));
    const kind=a.choice===null?'tie':status.get(a.choice).status==='success'?'correct'
      :status.get(a.choice).proof?.certificate?.consequence==='does-not-perform-capture-task'?'quiet':'wrong capture';
    kinds[kind]++;boards[panel.panelId.replace('s1syn-train-','')]=kind==='correct'?'ok':`${kind}${a.choice?':'+a.choice:''}`;
  }
  console.log(JSON.stringify({blockStart:index,target:saved.history.at(-1)?.targetPanelId?.replace('s1syn-train-','')??null,kinds,wrong:Object.fromEntries(Object.entries(boards).filter(([,v])=>v!=='ok'))}));
}

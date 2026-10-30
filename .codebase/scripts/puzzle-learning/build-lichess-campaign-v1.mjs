// Write the Stage 1 Python step config and the twelve-stage campaign
// registration that bare `fly babysit` runs. Unimplemented stages carry an
// explicit readiness reason so the campaign stops with a diagnosis.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {closeSync,existsSync,fsyncSync,openSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createLichessStage1Brain} from '../../src/puzzle-learning/lichess-stage1-brain-factory.mjs';
import {createLichessStage1BrainV2} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v2.mjs';
import {createLichessStage1BrainV3} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v3.mjs';
import {createLichessStage1BrainV4} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v4.mjs';
import {createLichessStage1BrainV5} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs';
import {createLichessStage1BrainV6} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v6.mjs';
import {createLichessStage1BrainV7} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v7.mjs';
import {createLichessStage1BrainV8} from '../../src/puzzle-learning/lichess-stage1-brain-factory-v8.mjs';

const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileSha=path=>sha256(readFileSync(resolve(root,path)));
const DATA='research/data/lichess-stage1-synthetic-v1';
const CONDITIONS=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];
const SOURCES=['.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix.mjs',
  '.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory.mjs',
  '.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator.mjs',
  '.codebase/src/puzzle-learning/lichess-curriculum-matrix.mjs','.codebase/src/puzzle-learning/lichess-curriculum-block.mjs',
  '.codebase/src/puzzle-learning/lichess-curriculum-stage-audit.mjs','.codebase/src/puzzle-learning/lichess-curriculum-panel.mjs',
  '.codebase/src/puzzle-learning/lichess-stage1-brain-factory.mjs','.codebase/src/puzzle-learning/coupled-stockfish-brain.mjs',
  '.codebase/src/puzzle-learning/coupled-stockfish-session.mjs','.codebase/src/puzzle-learning/curriculum-block-session.mjs',
  '.codebase/src/puzzle-learning/curriculum-rehearsal-plan.mjs','.codebase/src/puzzle-learning/curriculum-stage-acceptance.mjs',
  '.codebase/src/puzzle-learning/curriculum-stage1-acceptance-v2.mjs','.codebase/src/puzzle-learning/curriculum-checkpoint-selection.mjs',
  '.codebase/src/puzzle-learning/stockfish-review-collector.mjs','.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/chess-input/public-lesson-frame-cue.mjs','.codebase/src/chess-input/public-action-relative-cue.mjs','package-lock.json'];
// Revision 7+ registrations (encoder v2) additionally run these files.
const SOURCES_V2=['.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v2.mjs',
  '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v2.mjs','.codebase/src/puzzle-learning/coupled-stockfish-brain-v3.mjs',
  '.codebase/src/chess-input/public-action-relative-cue-v2.mjs'];
// Revision 9+ registrations (action-relative cue v3) use runtime/brain factory v3.
const SOURCES_V3=['.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v3.mjs',
  '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v3.mjs','.codebase/src/puzzle-learning/coupled-stockfish-brain-v3.mjs',
  '.codebase/src/chess-input/public-action-relative-cue-v3.mjs'];
// Revision 10+ registrations (alpha1 reward store) use runtime/brain factory v4.
const SOURCES_V4=['.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v4.mjs',
  '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v4.mjs','.codebase/src/puzzle-learning/coupled-stockfish-brain-v4.mjs',
  '.codebase/src/puzzle-learning/coupled-stockfish-brain-v3.mjs','.codebase/src/neural-learning/alpha-one-memory.mjs',
  '.codebase/src/chess-input/public-action-relative-cue-v4.mjs','research/reports/alpha-one-mapping-2026-10-25/mapping.json'];
// Revision 11+ registrations (alpha1 plus alpha3 stores; cue v4) use runtime/brain factory v5.
const SOURCES_V5=['.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v5.mjs',
  '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs','.codebase/src/puzzle-learning/coupled-stockfish-brain-v5.mjs',
  '.codebase/src/puzzle-learning/coupled-stockfish-brain-v3.mjs','.codebase/src/neural-learning/alpha-lobe-memory.mjs',
  '.codebase/src/chess-input/public-action-relative-cue-v4.mjs','research/reports/alpha-one-mapping-2026-10-25/mapping.json',
  'research/reports/alpha-three-mapping-2026-10-26/mapping.json'];
// Revision 12+ registrations (attack-map cue v1; stores and brain v5) use runtime/brain factory v6.
const SOURCES_V6=['.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v6.mjs',
  '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v6.mjs','.codebase/src/chess-input/public-attack-map-cue-v1.mjs',
  ...SOURCES_V5.filter(path=>path!=='.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v5.mjs')];
// Revision 13+ outcome-only registrations (feedbackProtocol verified-outcome-only-v1; Stockfish
// teaching set aside 2026-10-27) use runner v3, runtime/brain factory v7 and evaluator v2.
const RUNNER_V3='.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v3.mjs';
// Runner v4 differs only in allowing CPU duty 0.75 (researcher instruction 2026-10-29).
const RUNNER_V4='.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v4.mjs';
const SOURCES_V7=['.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v7.mjs',
  '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v7.mjs','.codebase/src/puzzle-learning/coupled-outcome-only-brain.mjs',
  '.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v2.mjs',
  ...SOURCES_V6.filter(path=>path!=='.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v6.mjs')];
const EVALUATOR_V2='.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v2.mjs';
const EVALUATOR_V4='.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs';
// Revision 14+ outcome-only registrations with attack-map cue v2 use runtime/brain factory v8.
const SOURCES_V8=['.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v8.mjs',
  '.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v8.mjs','.codebase/src/chess-input/public-attack-map-cue-v2.mjs',
  ...SOURCES_V7.filter(path=>path!=='.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v7.mjs')];
// Revision 8+ registrations (registered safety controls) run the v2 runner and modules.
const RUNNER_V2='.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v2.mjs';
const SOURCES_SAFETY=['.codebase/src/puzzle-learning/lichess-curriculum-matrix-v2.mjs',
  '.codebase/src/puzzle-learning/lichess-curriculum-block-v2.mjs','.codebase/src/puzzle-learning/curriculum-rehearsal-plan-v2.mjs'];
export const BLOCKED={
  2:'Stage 2 (king safety, check and mate): runtime factory and validation selector exist, but no audited mate-family train/validation/final data, final evaluator or registration exists.',
  3:'Stage 3 (sound forcing moves): needs a bounded material certificate and all-legal stage runner; neither is implemented.',
  4:'Stage 4 (double threats): needs a complete bounded payoff proof over every reply; not implemented.',
  5:'Stage 5 (lines and removal of defenders): needs preparatory-sequence credit assignment with certificates; not implemented.',
  6:'Stage 6 (move order and sacrifices): needs an explicit delayed-credit mechanism and multi-ply certificates; not implemented.',
  7:'Stage 7 (piece effectiveness): no bounded consequence verifier exists; research target only.',
  8:'Stage 8 (coordination): longer-horizon coordination verifier and interference tests are not implemented.',
  9:'Stage 9 (weaknesses and pawn structure): no exact positional verifier exists; research target only.',
  10:'Stage 10 (prophylaxis): needs independent horizon/working-memory evidence; not implemented.',
  11:'Stage 11 (transitions and endgames): restricted exact tasks or oracle comparisons are not implemented.',
  12:'Stage 12 (composition): unfamiliar compositional evaluation over accepted stages is not implemented.'};

function atomicWrite(path,text){
  assert(!existsSync(path),`Preserve existing ${path}`);
  const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

export function main(){
  const {values:args}=parseArgs({options:{mode:{type:'string'},revision:{type:'string',default:'1'}}});
  assert(['full','smoke'].includes(args.mode),'Usage: --mode full|smoke [--revision N]');
  const revision=Number(args.revision);assert(Number.isSafeInteger(revision)&&revision>=1);
  const id=revision===1?args.mode:`${args.mode}-r${revision}`;
  const registrationPath=`${DATA}/stage1-${id}-registration.json`,protocolPath=`${DATA}/stage1-${id}-protocol.json`;
  const registration=JSON.parse(readFileSync(resolve(root,registrationPath),'utf8'));
  const run=`runs/lichess-stage1-synthetic-v1-${id}`;
  const safety=Boolean(registration.earlyStop||registration.rehearsalPlanner);
  const v7=registration.feedbackProtocol==='verified-outcome-only-v1';
  assert(!v7||safety,'Outcome-only registrations run the safety-control runner v3');
  const duty=String(registration.cpuDuty??0.5);assert(['0.5','0.75'].includes(duty),'CPU duty must be 0.5 or 0.75');assert(duty==='0.5'||v7,'CPU duty 0.75 needs runner v4 (outcome-only)');
  const runner=v7?(duty==='0.75'?RUNNER_V4:RUNNER_V3):safety?RUNNER_V2:'.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix.mjs';
  const base=['node','--max-old-space-size=256','{runner}','--registration','{registration}'];
  const cue=registration.learner.encoder?.schema,v2=cue==='public-action-relative-cue-v2',v3=cue==='public-action-relative-cue-v3',v4=cue==='public-action-relative-cue-v4',v5=v4&&Boolean(registration.learner.alphaThreeMapping),v6=cue==='public-attack-map-cue-v1',v8=cue==='public-attack-map-cue-v2';
  assert(!v7||v6||v8,'Outcome-only registrations use the attack-map cue (factory v7 or v8)');assert(!v8||v7,'Cue v2 is outcome-only (factory v8)');
  const baseSources=[...SOURCES,...(v2?SOURCES_V2:v3?SOURCES_V3:v8?SOURCES_V8:v7?SOURCES_V7:v6?SOURCES_V6:v5?SOURCES_V5:v4?SOURCES_V4:[]),...(safety?SOURCES_SAFETY:[])],
    buildBrain=v8?createLichessStage1BrainV8:v7?createLichessStage1BrainV7:v6?createLichessStage1BrainV6:v5?createLichessStage1BrainV5:v4?createLichessStage1BrainV4:v3?createLichessStage1BrainV3:v2?createLichessStage1BrainV2:createLichessStage1Brain;
  // Revision 15+ (2026-10-30, ledger L093): evaluator v4 (D4 from the alpha-lobe valence) replaces v2 in the pins.
  const sources=registration.stageAcceptanceEvaluator?.path===EVALUATOR_V4
    ?[...baseSources.filter(path=>path!==EVALUATOR_V2),EVALUATOR_V4,'.codebase/src/puzzle-learning/alpha-lobe-valence.mjs']:baseSources;
  const step={schema:1,name:`lichess-stage1-synthetic-v1-${id}`,paused:false,
    paths:{protocol:protocolPath,registration:registrationPath,runner,run,checkpoint:`${run}/matrix-state.json`},
    pins:{'{protocol}':fileSha(protocolPath),'{registration}':fileSha(registrationPath),
      ...Object.fromEntries(sources.filter(path=>path!==runner).map(path=>[path,fileSha(path)])),'{runner}':fileSha(runner)},
    recovery:{kind:'lichess-stage-matrix-v1',stateFile:'matrix-state.json'},resourceLimits:{rssMiB:2048,freeMiB:256},
    ...(safety?{pause_control:{supported_executables:[runner]}}:{}),
    state_file:`runs/python-actions/lichess-stage1-synthetic-v1-${id}-state.json`,
    jobs:{train:{role:'train',argv:[...base,'--mode','train','--out','{run}','--protocol','{protocol}','--cpu-duty',duty],
        requires:['{registration}','{protocol}','{runner}'],fresh_output:'{run}'},
      resume:{role:'resume',argv:[...base,'--mode','train','--out','{run}','--protocol','{protocol}',
        '--resume-state','{resume_state}','--cpu-duty',duty],requires:['{registration}','{protocol}','{runner}'],fresh_output:'{run}'},
      audit:{role:'audit',argv:[...base,'--mode','audit','--out','{run}','--result','{run}/result.json','--protocol','{protocol}','--cpu-duty',duty],
        requires:['{registration}','{protocol}','{run}/result.json']}},
    artifacts:{result:'{run}/result.json',audit:'{run}/audit.json'},
    report_fields:['status','stage','stageAccepted','fullNeuralReplay','memoryContinuityVerified','diagnosis','reason','scope']};
  const stepPath=`python actions/lichess-stage1-synthetic-v1-${id}-step.json`;
  const stepText=JSON.stringify(step,null,2)+'\n';
  atomicWrite(resolve(root,stepPath),stepText);
  const initialMemoryHashes={};
  for(const replica of registration.replicas){
    const built=buildBrain({registration,replica,repositoryRoot:root});
    const fingerprint=built.brain.memoryFingerprint();
    for(const condition of v7?registration.conditions:CONDITIONS)initialMemoryHashes[`${replica}:${condition}`]=fingerprint;
  }
  const audits=[[registration.dataAudit.path,
      ['eligibleForNeuralTeaching','relationFamilyDisjointnessEstablished','graphLaunchAuthorized']],
    [registration.acceptanceData.audit.path,
      ['eligibleForNeuralTeaching','familySplitsDisjoint','sourceCertificatesReplayed']]];
  const campaign={schema:1,paused:false,name:`lichess-foundations-campaign-v1-${id}`,
    stages:[{stage:1,config:stepPath,configSha256:sha256(Buffer.from(stepText)),trainJob:'train',auditJob:'audit',
      requiredAuditTrue:['audit.fullNeuralReplay','audit.memoryContinuityVerified','audit.stageAccepted'],
      initialMemoryHashes,prerequisites:audits.map(([path,requiredTrue])=>({path,sha256:fileSha(path),requiredTrue}))},
      ...Object.entries(BLOCKED).map(([stage,reason])=>({stage:Number(stage),readinessBlockedReason:reason}))]};
  const campaignPath=args.mode==='full'?'python actions/curriculum-campaign.json':`python actions/curriculum-campaign-${id}.json`;
  atomicWrite(resolve(root,campaignPath),JSON.stringify(campaign,null,2)+'\n');
  process.stdout.write(JSON.stringify({step:stepPath,campaign:campaignPath,replicas:registration.replicas.length})+'\n');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();

// Build the pinned Stage 1 matrix registration and protocol from the audited
// synthetic-family package. Deterministic: every input is pinned by SHA-256 and
// the control schedules are fixed by seed before any informative execution.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {closeSync,existsSync,fsyncSync,openSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';

const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const pin=path=>({path,sha256:sha256(readFileSync(resolve(root,path)))});
const DATA='research/data/lichess-stage1-synthetic-v1';
export const STOCKFISH='.codebase/vendor/stockfish/sf-19/extracted/stockfish/stockfish-windows-x86-64-universal.exe';
export const SHUFFLE_SEED=20261024;
export const REPLICA_SEEDS={r1:20261101,r2:20261102,r3:20261103};

// Fisher-Yates per block over the informative block's fixed 2/2 outcome order.
export function outcomeShuffle(blocks=32,seed=SHUFFLE_SEED){
  let x=seed>>>0;const random=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/0x1_0000_0000;};
  const body={schema:'matched-task-outcome-shuffle-v1',algorithm:'xorshift32 Fisher-Yates over [failure,success,success,failure]',
    seed,blocks:Array.from({length:blocks},()=>{const row=['failure','success','success','failure'];
      for(let i=row.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[row[i],row[j]]=[row[j],row[i]];}return row;})};
  return {...body,sha256:digest(body)};
}

// Revision 6+ (2026-10-24): policy-B audits (no G0 dependency; Stage 1 D7 deferred to
// Stage 2) and the action-centred input cue. Revision 7+ (fix goal reviewer finding 2):
// action-relative cue v2 + coupled brain v3 via runtime factory v2, so Stockfish value
// pulses act on the move's own cue cells; the complete smoke-r6 Stockfish review cache
// (same engine and panels, hash-verified on load) is reused read-only.
// Revision 8+ (fix goal task 2): registered babysit safety controls, fixed before
// the run: informative-arm early stop (no new best block-start training-board count
// within windowBlocks blocks; 3 for the 8-block smoke, 8 for the 32-block run) and
// rehearsal planner v2 (no panel is the target in more than 2 consecutive blocks).
// Revision 9+ (fix goal task 1, researcher decision 1a, 2026-10-25): action-relative
// cue v3 (every action token conjoined with the moving/captured piece) via runtime
// factory v3, to reduce cross-board cue sharing that rewrote taught boards.
// Revision 10+ (2026-10-25, build weakness audit): alpha1 reward long-term store
// (alpha-one-memory.mjs) beside the unchanged restrained ReversalMemory, cue v4 and
// brain v4 via runtime factory v4; literature in the source-solution register.
// Earlier revisions rebuild unchanged.
const R6_STOCKFISH_CACHE='runs/lichess-stage1-synthetic-v1-smoke-r6-stockfish-cache';
export function buildRegistration({mode,id=mode,revision=1}){
  const smoke=mode==='smoke',replicas=smoke?['r1']:['r1','r2','r3'],policyB=revision>=6,moverValue=revision>=7,tagCue=revision>=9,alphaOne=revision>=10,alphaThree=revision>=11;
  const audit=policyB?'v2':'v1';
  const plan=split=>JSON.parse(readFileSync(resolve(root,`${DATA}/${split}-plan.json`),'utf8'));
  const [train,validation,final]=['train','validation','final'].map(plan);
  const families=JSON.parse(readFileSync(resolve(root,`${DATA}/validation-families.json`),'utf8')).assignments;
  const sentinels=['open-defender','blocked-defender','absent-defender','pinned-apparent-defender']
    .map(stratum=>families.find(row=>row.stratum===stratum).panelId);
  const stockfishShuffleBody={schema:'matched-stockfish-error-shuffle-v1',rule:'reverse the sign of every delivered Stockfish value error; magnitude, timing and event order stay yoked'};
  return {schema:1,paused:false,name:`lichess-stage1-synthetic-v1-${id}`,stage:1,allowedModes:['train','audit'],
    replicas,conditions:['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'],
    scheduleCondition:'informative',maxBlocks:smoke?8:32,feedbackProtocol:'verified-outcome-plus-stockfish-v2',
    outcomeShuffle:outcomeShuffle(),stockfishShuffle:{...stockfishShuffleBody,sha256:digest(stockfishShuffleBody)},
    runtimeFactory:{schema:'pinned-curriculum-runtime-v1',...pin(`.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory${alphaThree?'-v5':alphaOne?'-v4':tagCue?'-v3':moverValue?'-v2':''}.mjs`)},
    stageAcceptanceEvaluator:pin('.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator.mjs'),
    dataAudit:{...pin(`research/reports/lichess-stage1-synthetic-data-audit-${audit}.json`),schema:'lichess-stage1-synthetic-data-audit-v1'},
    trainingRows:{files:[pin(`${DATA}/train.jsonl`)]},trainingFamilies:pin(`${DATA}/train-families.json`),
    acceptanceData:{schema:'lichess-stage1-acceptance-data-v1',audit:pin(`research/reports/lichess-stage1-synthetic-acceptance-audit-${audit}.json`),
      validationRows:{files:[pin(`${DATA}/validation.jsonl`)]},validationFamilies:pin(`${DATA}/validation-families.json`),
      finalRows:{files:[pin(`${DATA}/final.jsonl`)]},finalFamilies:pin(`${DATA}/final-families.json`),
      panelIds:{training:train.panelIds,validation:validation.panelIds,final:final.panelIds},
      probeActions:final.probeActions,counterfactualPairs:final.counterfactualPairs,
      retention:{sentinelPanelIds:sentinels,earlierPrinciples:[]}},
    stockfishCollection:{schema:'registered-stockfish-collection-v1',executable:resolve(root,STOCKFISH),
      binarySha256:sha256(readFileSync(resolve(root,STOCKFISH))),search:'depth',budgets:[10,14],args:[],
      cacheDir:moverValue?R6_STOCKFISH_CACHE:`runs/lichess-stage1-synthetic-v1-${id}-stockfish-cache`,timeoutMs:120000,maxElapsedMs:900000,hashMiB:32},
    learner:{schema:'lichess-stage1-brain-v1',graph:pin('.cache/full.npz'),
      mapping:pin('research/reports/reversal-candidate-2026-10-05/mapping.json'),
      modelSource:pin(`${DATA}/model-source.json`),
      ...(alphaOne?{alphaOneMapping:pin('research/reports/alpha-one-mapping-2026-10-25/mapping.json')}:{}),
      ...(alphaThree?{alphaThreeMapping:pin('research/reports/alpha-three-mapping-2026-10-26/mapping.json')}:{}),
      model:{steps:8,inputDim:1,outputs:1,precision:'float32',saturation:10,recurrentScale:0.9,normalization:'row'},
      memory:{eta:0.5,minGain:0.2,maxGain:1.8,activityScale:1.5},
      encoder:policyB?{schema:`public-action-relative-cue-v${alphaOne?4:tagCue?3:moverValue?2:1}`,taskFamily:'capture-retention'}:{},
      replicaSeeds:Object.fromEntries(replicas.map(replica=>[replica,REPLICA_SEEDS[replica]])),
      maxPresentations:60000,maxLegalMoves:64,priorScale:4,current:1.5},
    ...(revision>=8?{rehearsalPlanner:{schema:'curriculum-rehearsal-plan-v2',maxConsecutiveTargets:2},
      earlyStop:{schema:'informative-training-progress-v1',windowBlocks:smoke?3:8}}:{}),
    resourceLimits:{rssMiB:2048,freeMiB:256},cpuDuty:0.5};
}

export function buildProtocol({registrationPath,registrationSha256,mode,revision=1}){
  const policyB=revision>=6,moverValue=revision>=7;
  return {schema:'lichess-stage1-synthetic-protocol-v1',mode,registration:{path:registrationPath,sha256:registrationSha256},
    question:'Does verified capture-retention feedback, with separately tested Stockfish value-error teaching, produce lasting, consequence-sensitive Stage 1 choices that transfer to unfamiliar counterfactual families, beyond matched controls?',
    learner:'From-scratch full FlyWire graph; ReversalMemory gains on mapped KC-to-MBON edges are the only lasting memory; wiring, root IDs and signs stay fixed.',
    teaching:'Each event binds the Fly\'s own all-legal ranking before feedback to an independently replayed one-reply certificate; Stockfish errors use pre-collected pinned reviews. No teacher computes neural parameter updates.',
    controls:['outcome-only','absent','disabled','shuffled','stockfish-shuffled','scratch (block 0)'],
    data:'Explicitly synthetic <=6-piece FEN-rooted tasks bound to verified Lichess source puzzles (first-solution capture identity); train/validation/final families are source-game disjoint and final rows stay unevaluated until checkpoint selection is frozen.',
    gates:policyB?'Frozen Stage 1 D1-D6, D8 thresholds plus the separate Stockfish-assistance gate D9; every replica must pass. Policy B (researcher, 2026-10-24): receiver causality is shown by this gate\'s own matched controls (D6/D8/D9), not G0; Stage 1 D7 is deferred to the Stage 2 cumulative retention gate.'
      :'Frozen Stage 1 D1-D8 thresholds plus the separate Stockfish-assistance gate D9; every replica must pass. Receiver acceptance (G0) and Stage 1 D7 retention are required for acceptance and are currently unavailable, so this run can reveal learning but cannot promote Stage 1.',
    deviations:['Stratum labels are the classifier stratum of each board\'s predeclared focal capture; pin families pair a pinned board with its open counterpart, resolving an inconsistency between the 16-per-stratum quota and reversing pairs (journal 2026-10-23-babysit-stage1-end-to-end).',
      'Receiver acceptance gates promotion, not feedback-enabled training.',
      'Stockfish reviews use depth budgets 10 and 14: node-limited searches usually end mid-iteration with only a bound, which the exact-score rule rejects (r1 smoke failure).',
      ...(policyB?['Policy B: no G0 dependency; Stage 1 D7 deferred to Stage 2 (researcher decision 2026-10-24).',
        'Input cue public-action-relative-cue-v1: the v1 absolute board cue gave two moves on one board 86% shared cells, so opposite lessons cancelled (receipts of full-r5).']:[]),
      ...(moverValue?['Revision 7+: public-action-relative-cue-v2 and CoupledStockfishBrainV3 (runtime factory v2): the Stockfish child-position cue uses the token family of the move cue, seen from the side that moved (the v1 state cue shared about 2.6 of 15 cells with the move cue), and its value and error stay in the perspective of the mover (reviewer finding 2, fix goal 2026-10-24).',
        'Revision 7+: reuses the complete smoke-r6 Stockfish review cache read-only (identical engine settings and panels; per-file hashes verified on load).']:[]),
      ...(revision>=8?['Revision 8+: registered babysit safety controls (fix goal task 2): runner v2 with a cooperative block-boundary pause; rehearsal planner v2 (no panel targeted in more than 2 consecutive blocks); informative-arm early stop with gate-failed when the best block-start training-board count does not improve within 3 (smoke) or 8 (full) blocks. ReversalMemory eta stays 0.5: the retention probe chose no eta (fix goal task 1 failed).']:[]),
      ...(revision>=9?['Revision 9+: public-action-relative-cue-v3 (runtime factory v3): every action token is conjoined with the action tag (moving piece, captured piece, promotion), because generic v2 tokens recurred across boards and lessons on other boards rewrote taught boards (researcher decision 1a, 2026-10-25; retention probe v4).']:[]),
      ...(revision>=10?['Revision 10+: alpha1 reward long-term store (alpha-one-memory.mjs, cue v4, brain v4, runtime factory v4): alpha/beta KC -> MBON-alpha1 edges depressed by PAM-alpha1 without DAN-alone recovery (Aso and Rubin 2016; Ichinose et al. 2015), PAM-alpha1 co-stimulated only with verified task-success pulses, readout minus mean(MBON07). Reason: restrained compartments erase a one-lesson trace within about 10 lessons at any acquiring eta (build weakness audit 2026-10-25); the Gkanias charging-to-LTM branch is not mappable on the >=5-synapse graph.']:[]),
      ...(revision>=11?['Revision 11+: aversive alpha3 long-term store (alpha-lobe-memory.mjs, brain v5, runtime factory v5; cue v4 unchanged): alpha/beta KC -> MBON-alpha3 edges depressed by PPL1-alpha3 without DAN-alone recovery (Aso and Rubin 2016; Wu et al. 2017), PPL1-alpha3 co-stimulated only with verified task-failure pulses, readout plus mean(MBON14). Reason: spaced probe v6 retained 1/4, and in every failed probe the final choice was a move punished by the board\'s own lessons (only the reward side had a long-term store). Approximations: no slow alpha3 acquisition or consolidation timing.']:[])],
    scope:mode==='smoke'?'Engineering smoke test of the complete babysit path (1 replica, 8 blocks); not scientific evidence.':'Registered Stage 1 experiment.'};
}

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
  const registrationPath=`${DATA}/stage1-${id}-registration.json`;
  const text=JSON.stringify(buildRegistration({mode:args.mode,id,revision}),null,1)+'\n';
  atomicWrite(resolve(root,registrationPath),text);
  const protocolPath=`${DATA}/stage1-${id}-protocol.json`;
  atomicWrite(resolve(root,protocolPath),JSON.stringify(buildProtocol({registrationPath,
    registrationSha256:sha256(Buffer.from(text)),mode:args.mode,revision}),null,1)+'\n');
  process.stdout.write(JSON.stringify({registration:registrationPath,registrationSha256:sha256(Buffer.from(text)),
    protocol:protocolPath,protocolSha256:sha256(readFileSync(resolve(root,protocolPath)))})+'\n');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();

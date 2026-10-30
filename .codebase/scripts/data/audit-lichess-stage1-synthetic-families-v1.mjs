// Independent audit of Stage 1 synthetic families. Re-derives every claim from
// pinned source rows through the production panel binder and the stratum
// classifier; final rows are checked but only aggregate results are reported.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {closeSync,existsSync,fsyncSync,openSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess} from 'chess.js';
import {bindLichessTrainingPanel,bindLichessEvaluationPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {classifyCaptureRetentionStratum} from '../../src/puzzle-learning/capture-retention-stratum.mjs';

const STRATA=['open-defender','blocked-defender','absent-defender','pinned-apparent-defender'];
const QUOTA={train:{boards:24,families:6,pairs:12},validation:{boards:16,families:4,pairs:8,perStratum:4},
  final:{boards:64,families:8,pairs:32,perStratum:16,familySize:8}};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const gameSplit=gameId=>{const value=createHash('sha256').update(`lichess-game-split-v1:${gameId}`).digest().readUInt32BE(0)/0x100000000;
  return value<0.8?'train':value<0.9?'validation':'final';};

function readLines(path){return readFileSync(path,'utf8').split(/\r?\n/).filter(Boolean);}

export function auditSplit({split,rowLines,familyDoc,familyBytes,plan,sourceLines}){
  const quota=QUOTA[split],failures=[];
  const fail=reason=>{failures.push(reason);};
  const sources=new Map(sourceLines.map(line=>[sha256(Buffer.from(line)),JSON.parse(line)]));
  const rows=rowLines.map(line=>JSON.parse(line));
  const byLesson=new Map(rows.map(row=>[row.lesson?.lessonId,row]));
  if(byLesson.size!==rows.length)fail('duplicate lesson identity');
  const registrationSha256=sha256(familyBytes);
  const panels=new Map(),games=new Set(),familyGames=new Map();
  for(const family of familyDoc.assignments){
    const row=byLesson.get(family.lessonId);
    if(!row){fail(`assignment outside rows: ${family.lessonId}`);continue;}
    const source=sources.get(row.sourceRecordSha256);
    if(!source){fail(`source record not in pinned ${split} sources`);continue;}
    try{assert.deepEqual(source.history,row.history);}catch{fail('row history differs from its pinned source record');continue;}
    if(gameSplit(row.history.gameId)!==split)fail('source game hashes to another split');
    let panel;
    try{panel=split==='train'?bindLichessTrainingPanel(row,{...family,registrationSha256})
      :bindLichessEvaluationPanel(row,{...family,registrationSha256});}
    catch(error){fail(`panel replay failed: ${String(error.message).slice(0,160)}`);continue;}
    const board=new Chess();board.loadPgn(panel.context.pgn);
    const successes=panel.experiences.filter(row=>row.status==='success').map(row=>row.move);
    if(successes.length!==1)fail('board does not have exactly one certified successful action');
    const label=classifyCaptureRetentionStratum(board,family.focalAction);
    if(label.status!=='classified'||label.stratum!==family.stratum)fail('focal action stratum does not match its label');
    panels.set(family.panelId,{panel,successes,familyId:family.familyId});
    games.add(row.history.gameId);
    const seen=familyGames.get(family.familyId)??new Set();seen.add(row.history.gameId);familyGames.set(family.familyId,seen);
  }
  for(const [familyId,seen] of familyGames)if(seen.size!==1)fail(`family ${familyId} mixes source games`);
  if(new Set([...familyGames.values()].map(set=>[...set][0])).size!==familyGames.size)fail('two families share a source game');
  const status=(panelId,move)=>panels.get(panelId)?.panel.experiences.find(row=>row.move===move)?.status;
  for(const pair of plan.counterfactualPairs){
    const one=panels.get(pair.firstPanelId),two=panels.get(pair.secondPanelId);
    if(!one||!two||one.familyId!==pair.familyId||two.familyId!==pair.familyId){fail('pair outside its family');continue;}
    const [a,b]=pair.actionIds;
    if(!(status(pair.firstPanelId,a)==='success'&&status(pair.firstPanelId,b)==='failure'
      &&status(pair.secondPanelId,a)==='failure'&&status(pair.secondPanelId,b)==='success'))fail('pair probes do not reverse');
    if(one.successes.some(move=>two.successes.includes(move)))fail('pair shares an always-safe action');
  }
  const probeCount=new Map();
  for(const probe of plan.probeActions){
    probeCount.set(probe.panelId,(probeCount.get(probe.panelId)??0)+1);
    if(!['success','failure'].includes(status(probe.panelId,probe.actionId)))fail('probe action lacks a certified outcome');
  }
  if(probeCount.size!==panels.size||[...probeCount.values()].some(n=>n!==2))fail('each board needs exactly two probes');
  const assignments=familyDoc.assignments,strata=Object.fromEntries(STRATA.map(s=>[s,assignments.filter(a=>a.stratum===s).length]));
  if(panels.size!==quota.boards||rows.length!==quota.boards)fail(`expected ${quota.boards} boards`);
  if(familyGames.size!==quota.families)fail(`expected ${quota.families} families`);
  if(plan.counterfactualPairs.length!==quota.pairs)fail(`expected ${quota.pairs} pairs`);
  if(quota.perStratum&&STRATA.some(s=>strata[s]!==quota.perStratum))fail('stratum quota not met');
  if(quota.familySize&&[...familyGames.keys()].some(id=>assignments.filter(a=>a.familyId===id).length!==quota.familySize))fail('family size quota not met');
  try{assert.deepEqual(plan.panelIds,assignments.map(a=>a.panelId));}catch{fail('plan panel IDs differ from family assignments');}
  return {split,passed:failures.length===0,failures:split==='final'?failures.length:failures,
    boards:panels.size,families:familyGames.size,pairs:plan.counterfactualPairs.length,strata,
    familyIds:[...familyGames.keys()],games:[...games]};
}

function atomicWrite(path,text){
  assert(!existsSync(path),'Preserve existing audit output');
  const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

export async function main(){
  const options={'data-audit':{type:'string'},'acceptance-audit':{type:'string'},dir:{type:'string'},
    'receiver-policy':{type:'string',default:'g0'}};
  for(const split of ['train','validation','final'])options[`${split}-sources`]={type:'string',multiple:true};
  const {values:args}=parseArgs({options});
  assert(args.dir&&args['data-audit']&&args['acceptance-audit'],'Usage: --dir DIR --train-sources F... --validation-sources F... --final-sources F... --data-audit OUT --acceptance-audit OUT');
  assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with --max-old-space-size=256');
  const started=performance.now();let peak=0;
  const guard=()=>{peak=Math.max(peak,process.memoryUsage().rss);assert(peak<=2048*2**20&&os.freemem()>=256*2**20,'Resource guard');};
  const dir=resolve(args.dir),results={},inputs={},sourceHashes={};
  for(const split of ['train','validation','final']){
    guard();
    const rowsBytes=readFileSync(`${dir}/${split}.jsonl`),familyBytes=readFileSync(`${dir}/${split}-families.json`);
    const plan=JSON.parse(readFileSync(`${dir}/${split}-plan.json`,'utf8'));
    const sourceFiles=args[`${split}-sources`]??[];assert(sourceFiles.length,`Missing ${split} sources`);
    sourceHashes[split]=sourceFiles.map(path=>({path:path.replaceAll('\\','/'),sha256:sha256(readFileSync(path))}));
    results[split]=auditSplit({split,rowLines:rowsBytes.toString('utf8').split(/\r?\n/).filter(Boolean),
      familyDoc:JSON.parse(familyBytes),familyBytes,plan,sourceLines:sourceFiles.flatMap(readLines)});
    inputs[split]={rows:sha256(rowsBytes),families:sha256(familyBytes),plan:sha256(readFileSync(`${dir}/${split}-plan.json`))};
  }
  const splits=Object.values(results),disjoint=['train','validation','final'].every((a,i,all)=>all.slice(i+1).every(b=>
    !results[a].familyIds.some(id=>results[b].familyIds.includes(id))&&!results[a].games.some(id=>results[b].games.includes(id))));
  const replayed=splits.every(row=>row.passed),eligible=replayed&&disjoint;
  const counts=Object.fromEntries(splits.map(row=>[row.split,{boards:row.boards,families:row.families,pairs:row.pairs,strata:row.strata}]));
  const checks=Object.fromEntries(splits.map(row=>[row.split,{passed:row.passed,failures:row.failures}]));
  const dataAudit={schema:'lichess-stage1-synthetic-data-audit-v1',eligibleForNeuralTeaching:eligible,
    relationFamilyDisjointnessEstablished:disjoint,graphLaunchAuthorized:eligible,finalSplitInspected:false,
    familyRegistrationSha256:inputs.train.families,inputs,sources:sourceHashes,counts,checks,
    scope:'Explicitly synthetic FEN-rooted Stage 1 tasks bound to verified Lichess source puzzles. Final rows were replayed by this program only; their contents and labels were not reported or used for any design or selection decision.',
    elapsedMs:Math.round(performance.now()-started),peakRssMiB:+(peak/2**20).toFixed(1)};
  // Policy B (researcher decision 2026-10-24): chess stages establish receiver
  // causality with their own matched controls; acceptance still needs D6/D8/D9.
  assert(['g0','stage-matched-controls-v1'].includes(args['receiver-policy']),'Unknown receiver policy');
  const policyB=args['receiver-policy']==='stage-matched-controls-v1';
  const acceptanceAudit={schema:'lichess-stage1-acceptance-data-audit-v1',eligibleForNeuralTeaching:eligible,
    familySplitsDisjoint:disjoint,sourceCertificatesReplayed:replayed,receiverAccepted:policyB,
    receiverPolicy:args['receiver-policy'],
    receiverEvidence:policyB
      ?'Researcher policy B (2026-10-24): no G0 dependency; the same Stage 1 gate must show informative over scratch/absent/shuffled/disabled (D6), Stockfish assistance (D9) and causal state removal/restoration (D8)'
      :'G0 receiver acceptance has not passed; Stage 1 cannot be accepted until a pinned G0 pass exists',
    finalSetInspected:false,
    inputs:{trainingRows:[inputs.train.rows],trainingFamiliesSha256:inputs.train.families,
      validationRows:[inputs.validation.rows],validationFamiliesSha256:inputs.validation.families,
      finalRows:[inputs.final.rows],finalFamiliesSha256:inputs.final.families}};
  atomicWrite(resolve(args['data-audit']),JSON.stringify(dataAudit,null,1)+'\n');
  atomicWrite(resolve(args['acceptance-audit']),JSON.stringify(acceptanceAudit,null,1)+'\n');
  process.stdout.write(JSON.stringify({eligibleForNeuralTeaching:eligible,familySplitsDisjoint:disjoint,
    sourceCertificatesReplayed:replayed,counts,elapsedMs:dataAudit.elapsedMs,peakRssMiB:dataAudit.peakRssMiB})+'\n');
  return eligible?0:1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().then(code=>{process.exitCode=code;},error=>{process.stderr.write(String(error?.stack??error).slice(0,2000)+'\n');process.exitCode=2;});

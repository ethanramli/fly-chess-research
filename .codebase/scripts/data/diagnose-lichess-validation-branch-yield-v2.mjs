// Explain why the already audited validation branch search yielded no pairs.
// This reads no new puzzles and makes no training or launch decision.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,statSync,writeFileSync,renameSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess,DEFAULT_POSITION} from 'chess.js';
import {certifyCaptureRetentionActions,checkCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {makeCpuDutyPacer} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{prepared:{type:'string'},audit:{type:'string'},previous:{type:'string'},
  'previous-families':{type:'string'},'previous-audit':{type:'string'},out:{type:'string'}}});
assert(a.prepared&&a.audit&&a.previous&&a['previous-families']&&a['previous-audit']&&a.out&&!existsSync(a.out));
assert(process.execArgv.includes('--max-old-space-size=256'));
const sha=b=>createHash('sha256').update(b).digest('hex');
function read(path,max){assert(statSync(path).size<=max,`Input exceeds ${max} bytes`);return readFileSync(path);}
const preparedManifestBytes=read(join(a.prepared,'manifest.json'),2**20),prepared=JSON.parse(preparedManifestBytes);
const lessonAuditBytes=read(a.audit,2**20),lessonAudit=JSON.parse(lessonAuditBytes);
const previousManifestBytes=read(join(a.previous,'manifest.json'),2**20),previous=JSON.parse(previousManifestBytes);
const previousFamiliesBytes=read(join(a.previous,'families.jsonl'),32*2**20);
const previousAuditBytes=read(a['previous-audit'],2**20);
const previousAudit=JSON.parse(previousAuditBytes);
assert.equal(prepared.schema,'lichess-prepared-lessons-v1');assert.equal(prepared.split,'validation');
assert.equal(lessonAudit.schema,'lichess-validation-lessons-audit-v3');assert.equal(lessonAudit.passed,true);
assert.equal(lessonAudit.preparedManifestSha256,sha(preparedManifestBytes));assert.equal(lessonAudit.finalSplitInspected,false);
assert.equal(previous.schema,'lichess-branch-contrast-preparation-v1');assert.equal(previous.split,'validation');
assert.equal(previousAudit.schema,'lichess-validation-branch-family-audit-v3');
assert.equal(sha(previousFamiliesBytes),previous.outputSha256);assert.equal(previousAudit.familyManifestSha256,sha(previousManifestBytes));
assert.equal(previousAudit.familyOutputSha256,sha(previousFamiliesBytes));
assert.equal(previousAudit.families,0);assert.equal(previousAudit.validationRows,prepared.counts.prepared);
const lessonBytes=read(join(a.prepared,'lessons.jsonl'),64*2**20);
assert.equal(sha(lessonBytes),prepared.outputSha256);
const records=lessonBytes.toString('utf8').split('\n').filter(Boolean).map(line=>({line,record:JSON.parse(line)}));
assert.equal(records.length,prepared.counts.prepared);
const bounds={maxRows:1022,maxBranches:4096,maxSeconds:2700,maxRssMiB:2048,minFreeMiB:256,cpuDuty:0.5};
const stats={rows:0,eligibleRows:0,branches:0,unknown:0,pairs:0,rootTerminal:0,tooFewTargets:0,noCommonQuiet:0,
  commonMoves:0,commonWithoutTwoTargets:0,commonWithTwoTargets:0,noResponseQuiet:0,terminalReplies:0,
  repliesWithFewerThanTwoCaptures:0,unknownReplies:0,zeroSuccessfulActions:0,multipleSuccessfulActions:0,
  uniqueSuccessReplies:0,uniqueSuccessWithoutPartner:0,partnerChecks:0,pairedVariants:0};
const started=performance.now(),cpuStart=process.cpuUsage();let lastCpu=process.cpuUsage(),peakRss=0;
class BoundStop extends Error{}
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);if(peakRss>bounds.maxRssMiB*2**20||os.freemem()<bounds.minFreeMiB*2**20)throw new BoundStop('memory-bound');if(performance.now()-started>bounds.maxSeconds*1000)throw new BoundStop('elapsed-bound');}
const paceCpu=makeCpuDutyPacer(bounds.cpuDuty,guard);
async function pace(){guard();const used=process.cpuUsage(lastCpu);lastCpu=process.cpuUsage();await paceCpu((used.user+used.system)/1000);guard();}
const uci=m=>m.from+m.to+(m.promotion??'');
const ordered=moves=>moves.sort((x,y)=>uci(x).localeCompare(uci(y)));
const quiet=m=>['n','b'].includes(m.flags);
const task={objective:'capture-retention',plies:1};
const result={schema:'lichess-validation-branch-yield-diagnostic-v2',passed:false,inputs:{preparedManifestSha256:sha(preparedManifestBytes),
  lessonAuditSha256:sha(lessonAuditBytes),previousFamilyManifestSha256:sha(previousManifestBytes),
  previousFamiliesSha256:sha(previousFamiliesBytes),previousFamilyAuditSha256:sha(previousAuditBytes),
  lessonsSha256:sha(lessonBytes)},bounds,stats,finalSplitInspected:false,neuralEventsDelivered:0,graphLaunchAuthorized:false};
try{
  outer:for(const {line,record} of records){
    guard();if(stats.rows>=bounds.maxRows)break;stats.rows++;assert.equal(record.split,'validation');
    if(record.lesson?.stage1DomainEligible!==true)continue;stats.eligibleRows++;
    const context=record.lesson.context,board=new Chess();board.loadPgn(context.pgn);
    assert.equal(board.fen(),context.fen);assert.equal(record.history.prefixPgnSha256,sha(Buffer.from(context.pgn)));
    assert.equal(record.history.historyStatus,'verified-standard-start-prefix');
    const history=board.history({verbose:true});assert(history.length>0&&history.length<=510);assert.equal(history[0].before,DEFAULT_POSITION);
    if(board.isGameOver()){stats.rootTerminal++;continue;}
    const actor=board.turn();if(board.board().flat().filter(p=>p&&p.color!==actor&&p.type!=='k').length<2){stats.tooFewTargets++;continue;}
    const commons=ordered(board.moves({verbose:true}).filter(quiet));stats.commonMoves+=commons.length;
    if(!commons.length)stats.noCommonQuiet++;
    let rootUniqueReplies=0,rootPartner=false;
    commonLoop:for(const common of commons){
      board.move(common);try{
        const targets=board.board().flat().filter(p=>p&&p.color!==actor&&p.type!=='k');
        if(targets.filter(p=>board.isAttacked(p.square,actor)).length<2){stats.commonWithoutTwoTargets++;continue;}
        stats.commonWithTwoTargets++;
        const responses=ordered(board.moves({verbose:true}).filter(quiet));if(!responses.length)stats.noResponseQuiet++;
        const seen=[];
        for(const defender of responses){
          if(stats.branches>=bounds.maxBranches)break outer;
          board.move(defender);try{
            stats.branches++;await pace();
            if(board.isGameOver()){stats.terminalReplies++;continue;}
            if(board.moves({verbose:true}).filter(m=>m.captured).length<2){stats.repliesWithFewerThanTwoCaptures++;continue;}
            const proofs=certifyCaptureRetentionActions(board,task),checked=checkCaptureRetentionActions(board,task,proofs);
            if(checked.some(row=>row.status==='unknown')){stats.unknown++;stats.unknownReplies++;continue;}
            const winners=proofs.filter((_,i)=>checked[i].status==='success');
            if(winners.length===0){stats.zeroSuccessfulActions++;continue;}
            if(winners.length!==1){stats.multipleSuccessfulActions++;continue;}
            stats.uniqueSuccessReplies++;rootUniqueReplies++;
            const context2={fen:board.fen(),pgn:board.pgn(),task:{...task}},candidateMoves=proofs.map(p=>p.move);
            const variant={branch:[uci(common),uci(defender)],responsePiece:defender.piece,responseFlags:defender.flags,
              context:context2,winner:winners[0].move,candidates:proofs.map((p,i)=>({...p,context:context2,actor,
                status:checked[i].status,learningAllowed:checked[i].learningAllowed,certificateSha256:checked[i].certificateSha256}))};
            let paired=false;
            for(const prior of seen){
              stats.partnerChecks++;
              if(prior.winner===variant.winner||prior.branch[1].slice(0,2)!==variant.branch[1].slice(0,2)
                ||prior.responsePiece!==variant.responsePiece||prior.responseFlags!==variant.responseFlags
                ||JSON.stringify(prior.candidates.map(p=>p.move))!==JSON.stringify(candidateMoves))continue;
              assert.equal(prior.context.fen.split(' ').slice(1).join(' '),context2.fen.split(' ').slice(1).join(' '));
              stats.pairedVariants++;stats.pairs++;rootPartner=true;paired=true;break;
            }
            if(!paired)seen.push(variant);
            if(paired)break commonLoop;
          }finally{board.undo();}
        }
      }finally{board.undo();}
    }
    if(!rootPartner&&rootUniqueReplies>0)stats.uniqueSuccessWithoutPartner++;
  }
}catch(error){if(!(error instanceof BoundStop))throw error;result.stoppingBound=error.message;}
guard();assert.equal(stats.rows,prepared.counts.prepared);assert.equal(stats.eligibleRows,prepared.counts.stage1DomainEligible);
assert.equal(stats.branches,previous.counts.branches,'Diagnostic traversal differs from the audited family search branch count');
assert.equal(stats.pairs,previousAudit.families,'Diagnostic traversal differs from the independent family audit');
result.passed=true;result.stats={...stats};result.stoppingBound=result.stoppingBound??'validation-roots-exhausted';
result.resources={elapsedSeconds:(performance.now()-started)/1000,peakRssMiB:peakRss/2**20,cpu:process.cpuUsage(cpuStart)};
result.scope='Bounded diagnostic replay of the exact audited validation roots and branch bound; counters explain construction yield only and do not authorize learning.';
mkdirSync(dirname(resolve(a.out)),{recursive:true});const partial=resolve(a.out)+'.partial';writeFileSync(partial,JSON.stringify(result,null,2)+'\n',{flag:'wx'});renameSync(partial,resolve(a.out));
console.log(JSON.stringify({passed:true,rows:stats.rows,eligibleRows:stats.eligibleRows,branches:stats.branches,pairs:stats.pairs,
  uniqueSuccessReplies:stats.uniqueSuccessReplies,multipleSuccessReplies:stats.multipleSuccessfulActions,
  fewerThanTwoCaptures:stats.repliesWithFewerThanTwoCaptures,elapsedSeconds:result.resources.elapsedSeconds,
  peakRssMiB:result.resources.peakRssMiB,finalSplitInspected:false,graphLaunchAuthorized:false}));

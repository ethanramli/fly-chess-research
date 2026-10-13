import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path,'utf8'));
const protocolPath='research/data/stockfish-target-feasibility-v1/protocol.json';
const p=read(protocolPath), reportPath=join(p.out,'report.json'), r=read(reportPath);
assert.equal(r.complete,true);assert.equal(r.identity.protocolSha256,hash(readFileSync(protocolPath)));
for(const [path,sha] of Object.entries(p.pins)) assert.equal(hash(readFileSync(path)),sha,path);
assert.deepEqual(r.identity.pins,p.pins);
assert.equal(r.stages.neuralFeedback,false);assert.equal(r.stages.persistentLearning,false);
const neural=read(p.neuralReport), records=r.records.map(ref=>{assert.equal(hash(readFileSync(ref.path)),ref.sha256);return read(ref.path);});
let certificates=0, available=0;
const panels=[];
for(let i=0;i<p.positions.length;i++) {
  const ref=p.positions[i], row=readFileSync(ref.path,'utf8').trim().split(/\r?\n/).map(JSON.parse).find(v=>v.id===ref.id);
  const board=new Chess(row.fen),legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
  const baseRef=neural.state.baselineRefs[i];assert.equal(hash(readFileSync(baseRef.path)),baseRef.sha256);
  const base=read(baseRef.path).assessment;
  for(const budget of p.nodeBudgets) {
    const set=records.filter(v=>v.rowId===row.id&&v.nodeBudget===budget);
    assert.deepEqual(set.map(v=>v.move).sort(),legal.slice().sort());
    for(const rec of set) {
      assert.deepEqual(rec.identity,r.identity);assert.equal(rec.rootFen,board.fen());
      const child=new Chess(rec.rootFen);child.move({from:rec.move.slice(0,2),to:rec.move.slice(2,4),...(rec.move.length===5?{promotion:rec.move[4]}:{})});
      assert.equal(child.fen(),rec.childFen);assert.notEqual(board.turn(),child.turn());
      assert.equal(checkMateCertificate(rec.proof.certificate,child,{attacker:board.turn(),plies:row.plies-1,maxNodes:100000,milliseconds:2000}).status,rec.proof.status);
      assert.ok(['success','failure'].includes(rec.proof.status));certificates++;
      assert.ok(rec.raw.at(-1).startsWith('bestmove '));
      const latest=rec.raw.filter(v=>/^info depth .*\bscore (cp|mate) /.test(v)).at(-1);
      const score=latest?.match(/\bscore (cp|mate) (-?\d+)\b/),wdl=latest?.match(/\bwdl (\d+) (\d+) (\d+)\b/);
      const usable=Boolean(score&&wdl&&/\bnodes \d+\b/.test(latest)&&/\bpv \S/.test(latest)&&!/\b(lowerbound|upperbound)\b/.test(latest));
      assert.equal(rec.target.available,usable);
      if(usable){assert.equal(wdl.slice(1).map(Number).reduce((a,b)=>a+b,0),1000);
        assert.equal(rec.target.utility,(Number(wdl[3])-Number(wdl[1]))/1000);
        assert.equal(rec.target.actorScore,-Number(score[2]));available++;}
      const activity={baseline:base.rows.find(v=>v.move===rec.move)};
      for(const result of neural.results) activity[result.condition]=result.after[i].assessment.rows.find(v=>v.move===rec.move);
      for(const [condition,a] of Object.entries(activity)) {
        assert.equal(a.score,a.MBON12-a.MBON01);
        const expected=a.MBON12===0&&a.MBON01===0?null:Math.tanh(a.score/p.valueScale);
        assert.equal(rec.predictions[condition],expected);
      }
    }
    const known=set.filter(v=>v.target.available),good=known.filter(v=>v.proof.status==='success'),bad=known.filter(v=>v.proof.status==='failure');
    const maximum=Math.max(...known.map(v=>v.target.utility));
    const top=known.filter(v=>v.target.utility===maximum);
    const mse={};
    for(const condition of ['baseline',...neural.results.map(v=>v.condition)]) {
      const values=known.filter(v=>v.predictions[condition]!==null);
      mse[condition]=values.reduce((sum,v)=>sum+(v.predictions[condition]-v.target.utility)**2,0)/values.length;
      const raw=condition==='baseline'?base.rows:neural.results.find(v=>v.condition===condition).after[i].assessment.rows;
      assert.equal([...raw].sort((a,b)=>b.score-a.score)[0].move,[...set].sort((a,b)=>b.predictions[condition]-a.predictions[condition])[0].move);
    }
    panels.push({rowId:row.id,nodeBudget:budget,legal:set.length,available:known.length,
      distinctUtilityTargets:new Set(known.map(v=>v.target.utility)).size,
      success:good.map(v=>({move:v.move,utility:v.target.utility,kind:v.target.info.kind,actorScore:v.target.actorScore})),
      topUtility:maximum,topMoves:top.map(v=>v.move),failedMovesTiedAtTop:top.filter(v=>v.proof.status==='failure').length,
      failuresAtLeastAsHighAsSuccess:bad.filter(v=>good.some(g=>v.target.utility>=g.target.utility)).length,
      failurePositiveErrorAtBaseline:bad.filter(v=>v.target.utility>v.predictions.baseline).length,mse,
      interpretation:'MSE uses an arbitrary fixed, unfitted scale; retrospective outcome-feedback comparison, not Stockfish-training efficacy'});
  }
}
assert.equal(records.length,panels.reduce((sum,v)=>sum+v.legal,0));
const sensitivity=p.positions.map(ref=>{
  const a=records.filter(v=>v.rowId===ref.id&&v.nodeBudget===p.nodeBudgets[0]);
  const b=records.filter(v=>v.rowId===ref.id&&v.nodeBudget===p.nodeBudgets[1]);
  return {rowId:ref.id,maximumUtilityChange:Math.max(...a.filter(v=>v.target.available).map(v=>Math.abs(v.target.utility-b.find(x=>x.move===v.move).target.utility)))};
});
const result={passed:true,reportSha256:hash(readFileSync(reportPath)),protocolSha256:r.identity.protocolSha256,
  certificates,available,panels,sensitivity,
  gates:{allLegalCoverage:true,perspective:true,certificates:true,monotonicReadout:true,
    utilitySeparatesMateDeadline:panels.every(v=>v.available===v.legal&&v.failuresAtLeastAsHighAsSuccess===0),
    stockfishTeachingImprovesLearning:null,transfer:null}};
const atomic=(path,v)=>{writeFileSync(path+'.partial',JSON.stringify(v,null,2)+'\n');renameSync(path+'.partial',path);};
atomic(join(p.out,'audit.json'),result);
atomic(join(p.out,'COMPLETE.json'),{reportSha256:result.reportSha256,auditSha256:hash(readFileSync(join(p.out,'audit.json')))});
console.log(JSON.stringify(result,null,2));

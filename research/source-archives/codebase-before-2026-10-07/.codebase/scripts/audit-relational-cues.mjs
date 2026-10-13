// Read-only projection/ranking/invariance audit; no neural model imports.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkMateCertificate} from '../src/lowram/mate-certificate-check.mjs';
const{values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'},compare:{type:'string'}}});
if(!args.run||!args.out||existsSync(args.out))throw Error('Require completed run and new audit');
const read=p=>JSON.parse(readFileSync(p)),hash=v=>createHash('sha256').update(v).digest('hex'),digest=v=>hash(JSON.stringify(v));
const r=read(join(args.run,'report.json'));assert.equal(r.complete,true);assert.equal(r.learningApplied,false);
for(const[p,h]of Object.entries({...r.identity.inputs,...r.identity.sources}))assert.equal(hash(readFileSync(p)),h);
const p=r.protocol,mapping=read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping,pool=[...new Set(mapping.groups.flatMap(g=>g.kc))].sort((a,b)=>a-b),config=p.encoder;
const bucket=(token,n)=>createHash('sha256').update(`${config.seed}\0${token}`).digest().readUInt32LE(0)%n,uci=m=>m.from+m.to+(m.promotion??'');
const jobs=p.positions.flatMap(position=>p.encoders.flatMap(encoder=>{const moves=new Chess(position.fen).moves({verbose:true}).map(uci);return[...moves.map(move=>({position:position.id,encoder,move,repeat:false})),{position:position.id,encoder,move:moves[0],repeat:true}];}));
assert.deepEqual(r.identity.jobs,jobs);assert.equal(r.results.length,jobs.length);
for(let i=0;i<jobs.length;i++){
  const row=r.results[i],cue=row.cue;assert.deepEqual(row.job,jobs[i]);assert.equal(row.fixedStatePreserved,true);assert.equal(cue.identity,r.identity.encoderIdentities[row.job.encoder]);
  assert.equal(cue.fen,p.positions.find(v=>v.id===row.job.position).fen);assert.equal(cue.move,row.job.move);assert.equal(new Set(cue.tokens).size,cue.tokens.length);assert.ok(cue.tokens.length<=128);
  assert.deepEqual(cue.assignments,cue.tokens.map(token=>({token,index:pool[bucket(token,pool.length)]})));
  const cells=[...new Set(cue.assignments.map(v=>v.index))];cells.sort((a,b)=>bucket(`budget:${a}`,0x100000000)-bucket(`budget:${b}`,0x100000000)||a-b);
  const selected=cells.slice(0,config.maxCells).sort((a,b)=>a-b),current=Math.min(config.maxCellCurrent,config.totalCurrent/selected.length);
  assert.deepEqual(cue.stimulation,selected.map(index=>({index,current})));assert.equal(cue.accounting.collisions,cue.tokens.length-cells.length);assert.equal(cue.accounting.droppedCells,cells.length-selected.length);assert.equal(cue.accounting.totalCurrent,current*selected.length);
  assert.ok([row.response.MBON12,row.response.MBON01,row.response.score].every(Number.isFinite));assert.equal(row.response.score,row.response.MBON12-row.response.MBON01);
  if(row.job.repeat){const first=r.results.find(v=>!v.job.repeat&&v.job.position===row.job.position&&v.job.encoder===row.job.encoder&&v.job.move===row.job.move);assert.deepEqual(first.cue,cue);assert.deepEqual(first.response,row.response);}
}
const transform=(move,id)=>{const sq=s=>id==='file-reflected'?String.fromCharCode(104-(s.charCodeAt(0)-97))+s[1]:s[0]+String(9-Number(s[1]));return sq(move.slice(0,2))+sq(move.slice(2,4))+move.slice(4);};
let invariantPairs=0;
for(const row of r.results.filter(v=>v.job.encoder==='relational'&&v.job.position==='original'&&!v.job.repeat))for(const position of ['file-reflected','colour-rank-exchanged']){
  const other=r.results.find(v=>v.job.encoder==='relational'&&v.job.position===position&&!v.job.repeat&&v.job.move===transform(row.job.move,position));assert.ok(other);assert.deepEqual(other.cue.tokens,row.cue.tokens);assert.deepEqual(other.cue.stimulation,row.cue.stimulation);assert.deepEqual(other.response,row.response);invariantPairs++;
}
assert.equal(r.proofs.length,p.positions.length);
for(const entry of r.proofs){const position=p.positions.find(v=>v.id===entry.position),board=new Chess(position.fen),after=new Chess();after.loadPgn(board.pgn());after.move({from:entry.move.slice(0,2),to:entry.move.slice(2,4)});
  const checked=checkMateCertificate(entry.proof.certificate,after,{attacker:board.turn(),plies:0,maxNodes:4096});assert.equal(checked.verified,true,checked.reason);assert.equal(checked.status,entry.position==='king-support-counterfactual'?'failure':'success');assert.equal(entry.proof.status,checked.status);
}
const a=r.results.find(v=>v.job.encoder==='relational'&&v.job.position==='original'&&v.job.move==='f7g7'),b=r.results.find(v=>v.job.encoder==='relational'&&v.job.position==='king-support-counterfactual'&&v.job.move==='f7g7');assert.notDeepEqual(a.cue.tokens,b.cue.tokens);assert.notDeepEqual(a.cue.stimulation,b.cue.stimulation);
for(const summary of r.summary){const rows=r.results.filter(v=>v.job.position===summary.position&&v.job.encoder===summary.encoder&&!v.job.repeat),overlaps=[];
  for(let i=0;i<rows.length;i++)for(let j=0;j<i;j++){const a=new Set(rows[i].cue.stimulation.map(v=>v.index)),b=new Set(rows[j].cue.stimulation.map(v=>v.index)),shared=[...a].filter(v=>b.has(v)).length;overlaps.push(shared/(a.size+b.size-shared));}
  assert.equal(summary.candidates,rows.length);assert.equal(summary.distinctCues,new Set(rows.map(v=>digest(v.cue.stimulation))).size);assert.equal(summary.distinctScores,new Set(rows.map(v=>v.response.score)).size);assert.equal(summary.choice,[...rows].sort((a,b)=>b.response.score-a.response.score)[0].job.move);assert.equal(summary.meanPairwiseCellJaccard,overlaps.reduce((a,b)=>a+b,0)/overlaps.length);
}
let prefixExact=null;if(args.compare){const other=read(join(args.compare,'report.json'));assert.deepEqual(other.identity,r.identity);assert.ok(other.results.length>0);for(const row of other.results)assert.deepEqual(row,r.results.find(v=>digest(v.job)===digest(row.job)));prefixExact=true;}
const audit={passed:true,candidates:r.results.length,invariantPairs,certificates:r.proofs.length,prefixExact,reportSha256:hash(readFileSync(join(args.run,'report.json'))),auditSha256:hash(readFileSync('.codebase/scripts/audit-relational-cues.mjs')),peakRssMiB:process.resourceUsage().maxRSS/1024,
  scope:'Source identity, input projection arithmetic, complete legal coverage, repeated responses, engineered symmetry invariance and independently checked counterfactual. No independent neural integration, learning or reasoning claim.'};
writeFileSync(args.out,JSON.stringify(audit,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,candidates:r.results.length,invariantPairs,prefixExact}));

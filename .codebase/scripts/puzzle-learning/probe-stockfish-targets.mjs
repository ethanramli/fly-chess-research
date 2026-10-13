import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import os from 'node:os';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { stockfishTarget, provisionalMBONValue } from '../../src/search-and-feedback/stockfish-target.mjs';

const protocolPath = 'research/data/stockfish-target-feasibility-v1/protocol.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path,'utf8'));
const p = read(protocolPath), out = p.out;
assert.equal(process.version,p.nodeVersion);
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
assert.ok(Number.isFinite(p.cpuDuty) && p.cpuDuty > 0 && p.cpuDuty <= 1);
for (const [path,sha] of Object.entries(p.pins)) assert.equal(hash(readFileSync(path)),sha,path);
mkdirSync(out,{recursive:true});
const atomic = (path,value) => { writeFileSync(path+'.partial',JSON.stringify(value,null,2)+'\n'); renameSync(path+'.partial',path); };
const identity = { protocolSha256:hash(readFileSync(protocolPath)), pins:p.pins };
let child, peakCombinedRssMiB = 0;
function guard() {
  let childBytes = 0;
  if (child && child.exitCode === null) {
    childBytes = Number(execFileSync('powershell.exe',['-NoProfile','-Command',`(Get-Process -Id ${child.pid} -ErrorAction Stop).WorkingSet64`],{windowsHide:true,timeout:10000,encoding:'utf8'}).trim());
    assert.ok(Number.isFinite(childBytes));
  }
  const total = process.memoryUsage().rss + childBytes;
  peakCombinedRssMiB = Math.max(peakCombinedRssMiB,total/2**20);
  assert.ok(total <= 768*2**20 && os.freemem() >= 256*2**20,'Combined resource guard');
}
guard();
child = spawn(p.engine,[],{windowsHide:true,stdio:['pipe','pipe','pipe']});
let pending = null, transcript = [], lineBytes = 0, fatal = null;
const reader = createInterface({input:child.stdout});
reader.on('line',line => {
  lineBytes += Buffer.byteLength(line);
  if (lineBytes > p.maxTranscriptBytes) { fatal = Error('Transcript bound'); child.kill(); return; }
  transcript.push(line);
  if (pending && pending.match(line)) { const done=pending; pending=null; clearTimeout(done.timer); done.resolve(transcript.slice()); }
});
child.stderr.on('data',chunk=>{ fatal=Error('Engine stderr: '+chunk.toString().slice(0,512)); child.kill(); });
child.on('error',error=>{fatal=error;if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}});
child.on('exit',(code)=>{ if(pending){clearTimeout(pending.timer);pending.reject(fatal??Error('Engine exited '+code));pending=null;} });
function send(commands,match) {
  assert.equal(pending,null); if(fatal) throw fatal;
  transcript=[];lineBytes=0;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{fatal=Error('Engine deadline; no teaching event');child.kill();},p.timeoutMs);
    pending={resolve,reject,match,timer}; child.stdin.write(commands.join('\n')+'\n');
  });
}
const started=performance.now();
try {
  const handshake = await send(['uci'],line=>line==='uciok'); guard();
  assert.ok(handshake.some(line=>line.includes('Stockfish 19')),'Engine version');
  const settings = await send(['setoption name Threads value 1','setoption name Hash value 16','setoption name MultiPV value 1',
    'setoption name UCI_ShowWDL value true','setoption name UCI_LimitStrength value false','isready'],line=>line==='readyok'); guard();
  atomic(join(out,'handshake.json'),{identity,handshake,settings});
  const neural = read(p.neuralReport), audit = read(p.neuralAudit);
  assert.equal(neural.complete,true);assert.equal(audit.passed,true);assert.equal(audit.reportSha256,hash(readFileSync(p.neuralReport)));
  const records=[];
  for(let i=0;i<p.positions.length;i++) {
    const ref=p.positions[i], row=readFileSync(ref.path,'utf8').trim().split(/\r?\n/).map(JSON.parse).find(v=>v.id===ref.id);
    assert.equal(row.split,'train');
    const root=new Chess(row.fen), rootFen=root.fen();
    const baselineRef=neural.state.baselineRefs[i];assert.equal(hash(readFileSync(baselineRef.path)),baselineRef.sha256);
    const base=read(baselineRef.path).assessment;
    const legal=root.moves({verbose:true});
    assert.deepEqual(base.rows.map(v=>v.move).sort(),legal.map(m=>m.from+m.to+(m.promotion??'')).sort());
    for(const nodes of p.nodeBudgets) for(const move of legal) {
      const uci=move.from+move.to+(move.promotion??''), name=`${i}-${nodes}-${uci}.json`, path=join(out,name);
      if(existsSync(path)) { const old=read(path);assert.deepEqual(old.identity,identity);records.push({path,sha256:hash(readFileSync(path))});continue; }
      guard();const childBoard=new Chess(rootFen);childBoard.move(move);
      const proof=certifyMate(childBoard,root.turn(),{plies:row.plies-1,maxNodes:4096,milliseconds:2000});
      await send(['ucinewgame','setoption name Clear Hash','isready'],line=>line==='readyok');guard();
      const t=performance.now();
      const raw=await send([`position fen ${rootFen} moves ${uci}`,`go nodes ${nodes}`],line=>line.startsWith('bestmove '));
      const elapsedMs=performance.now()-t;guard();
      const target=stockfishTarget(raw,{actor:root.turn(),sideToMove:childBoard.turn(),completed:true});
      const predictions={baseline:provisionalMBONValue(base.rows.find(v=>v.move===uci),p.valueScale)};
      for(const result of neural.results) predictions[result.condition]=provisionalMBONValue(result.after[i].assessment.rows.find(v=>v.move===uci),p.valueScale);
      const record={identity,rowId:row.id,rootFen,childFen:childBoard.fen(),move:uci,nodeBudget:nodes,raw,target,proof,predictions,elapsedMs,
        stages:{engineSearch:true,recordedTargets:true,neuralFeedback:false,persistentLearning:false,transfer:false}};
      assert.equal(root.fen(),rootFen);atomic(path,record);records.push({path,sha256:hash(readFileSync(path))});
      await new Promise(resolve=>setTimeout(resolve,elapsedMs*(1/p.cpuDuty-1)));guard();
    }
  }
  const report={schema:p.schema,complete:true,identity,records,resources:{elapsedSeconds:(performance.now()-started)/1000,peakCombinedRssMiB,
    rssMeasurement:'Parent + engine WorkingSet64 samples before/after search and setup; not continuous peak',cpuDuty:p.cpuDuty},
    stages:{engineSearch:true,recordedTargets:true,neuralFeedback:false,persistentLearning:false,transfer:false}};
  atomic(join(out,'report.json'),report);
  atomic(join(out,'RECORDED.json'),{reportSha256:hash(readFileSync(join(out,'report.json'))),independentAuditPending:true});
  console.log(JSON.stringify({records:records.length,resources:report.resources}));
} finally { if(child.exitCode===null){child.stdin.write('quit\n');child.stdin.end();}reader.close(); }

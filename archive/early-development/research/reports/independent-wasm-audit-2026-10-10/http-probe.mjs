import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
const out=new URL('.',import.meta.url),port=4187,base=`http://127.0.0.1:${port}`;
const paths=['.codebase/scripts/browser/play-server.mjs','.codebase/src/supervised-baselines/trainer.mjs','.codebase/src/runtime/sparse-accumulator.mjs'];
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),before=Object.fromEntries(paths.map(p=>[p,hash(p)]));
const samples=readFileSync('runs/move-latency-wasm-v1/samples.jsonl','utf8').trim().split('\n').map(JSON.parse),checks=[];
writeFileSync(new URL('http-server-console.txt',out),'',{flag:'wx'});writeFileSync(new URL('http-server-stderr.txt',out),'',{flag:'wx'});
const child=spawn(process.execPath,['--max-old-space-size=256','.codebase/scripts/browser/play-server.mjs'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
const stopped=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
async function post(route,body){const begin=performance.now(),response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:response.status,data:await response.json(),elapsedMs:performance.now()-begin};}
try{
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Server readiness timeout; owned process must be inspected/stopped')),15000);let ready=false;
    child.once('error',reject);child.once('exit',()=>{if(!ready)reject(Error('Owned server exited before ready'));});
    child.stdout.on('data',data=>{appendFileSync(new URL('http-server-console.txt',out),data);if(String(data).includes('FlyChess ready:')){ready=true;clearTimeout(timer);resolve();}});
    child.stderr.on('data',data=>appendFileSync(new URL('http-server-stderr.txt',out),data));
  });
  for(const humanColor of ['w','b']){
    let game=await post('/api/new',{humanColor});assert.equal(game.status,200);const board=new Chess();
    if(humanColor==='w'){
      assert.equal((await post('/api/fly-move',{id:game.data.id})).status,400);
      assert.equal((await post('/api/human-move',{id:game.data.id,from:'e2',to:'e5'})).status,400);
      game=await post('/api/human-move',{id:game.data.id,from:'e2',to:'e4'});assert.equal(game.status,200);board.move('e4');
    }
    assert.equal(game.data.fen,board.fen());
    const fixture=humanColor==='w'?'black-after-e4':'white-start',expected=samples.find(s=>s.fixture===fixture&&s.name==='candidate').chosen;
    const pending=post('/api/fly-move',{id:game.data.id});
    // HTTP concurrency request while inference paces; no extra graph process.
    await new Promise(r=>setTimeout(r,100));
    assert.equal((await post('/api/new',{humanColor})).status,409);
    const result=await pending;assert.equal(result.status,200);
    board.move({from:expected.from,to:expected.to,promotion:expected.promotion});
    assert.equal(result.data.fen,board.fen());assert.equal(result.data.flyScore,expected.score);
    assert.deepEqual(result.data.history.map(m=>m.san),board.history());
    const replay=new Chess();replay.loadPgn(result.data.pgn);assert.equal(replay.fen(),board.fen());
    assert.equal((await post('/api/fly-move',{id:game.data.id})).status,400);
    assert.ok(result.data.peakResidentMiB<=768);
    checks.push({fixture,expected,...result,concurrentNewRejected:true,pgnReplay:true,wrongTurnRejected:true});
  }
  const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/FlyChess/);
  for(const p of paths)assert.equal(hash(p),before[p]);
}finally{
  if(child.exitCode===null&&child.signalCode===null)child.kill();
  const terminal=await stopped;
  writeFileSync(new URL('http-owned-process.json',out),JSON.stringify({pid:child.pid,command:[process.execPath,'--max-old-space-size=256','.codebase/scripts/browser/play-server.mjs'],port,terminal},null,2),{flag:'wx'});
}
writeFileSync(new URL('http-probe.json',out),JSON.stringify({timestamp:new Date().toISOString(),passed:true,sourceHashes:before,checks,scope:'Loader-free production HTTP, both colours, history/PGN/score, invalid action, turn rejection, concurrent request rejection, page text; no visual coverage or matched cold timing'},null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,checks:checks.map(c=>({fixture:c.fixture,elapsedMs:c.elapsedMs}))}));

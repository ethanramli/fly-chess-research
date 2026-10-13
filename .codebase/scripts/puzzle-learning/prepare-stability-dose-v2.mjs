import fs from 'node:fs';
import assert from 'node:assert/strict';
for(const name of ['train','audit']){
 const old=`.codebase/scripts/puzzle-learning/${name}-stability-feedback-dose.mjs`,dest=`.codebase/scripts/puzzle-learning/${name}-stability-feedback-dose-v2.mjs`;assert.ok(!fs.existsSync(dest));
 let s=fs.readFileSync(old,'utf8').replaceAll('research/data/stability-feedback-dose-v1/','research/data/stability-feedback-dose-v2/');
 if(name==='train'){
  s="import { measureDosePersistence } from '../../src/puzzle-learning/dose-persistence-measurements.mjs';\n"+s;
  s=s.replace('memory.restore(snapshot.memory);const panels=[];\n      for(const row of rows)panels.push(await panel(row));',"const measurements=await measureDosePersistence({memory,learned:snapshot.memory,initial:naive,assess:async()=>{const values=[];for(const row of rows)values.push(await panel(row));return values;}});");
  s=s.replace('memory:snapshot.memory,panels}', 'memory:snapshot.memory,...measurements}');
 }else{
  s=s.replace("function verify(e){const c=e.proof.certificate,b=new Chess();b.loadPgn(c.rootPgn);", "function verify(e){const c=e.proof.certificate,b=new Chess();b.loadPgn(e.context.pgn);const m=b.moves({verbose:true}).find(x=>x.from+x.to+(x.promotion??'')===e.move);assert.ok(m);b.move(m);assert.equal(c.plies,e.context.task.plies-1);");
  s=s.replace('for(const panel of ev.panels){',"assert.deepEqual(ev.repeat.map(x=>x.assessment),ev.panels.map(x=>x.assessment));assert.deepEqual(ev.restored.map(x=>x.assessment),ev.panels.map(x=>x.assessment));for(const panel of [...ev.panels,...ev.repeat,...ev.reset,...ev.restored]){");
  s=s.replaceAll('digest(d.memory)','digest(ev.reset.includes(panel)?read(p.initialMemoryPath).memory:d.memory)');
  s=s.replace("assert.equal(ev.panels.length,p.positions.length);", "assert.equal(ev.panels.length,p.positions.length);for(const key of ['repeat','reset','restored'])assert.equal(ev[key].length,p.positions.length);");
 }
 fs.writeFileSync(dest,s);
}

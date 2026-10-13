import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const file='research/reports/multi-context-stability-v1-2026-10-07/ranking-informative-2.json';
const panels=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(panels.length,2);
assert.equal(panels[0].memoryFingerprint,panels[1].memoryFingerprint);
let candidates=0;
for(const p of panels){
 const review=p.review,board=new Chess();board.loadPgn(review.context.pgn);
 assert.equal(board.fen(),review.context.fen);
 const legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).sort();
 assert.deepEqual(p.assessment.rows.map(r=>r.move).sort(),legal);candidates+=legal.length;
 assert.equal(p.assessment.choice,review.move);assert.equal(review.status,'success');
 board.move({from:review.move.slice(0,2),to:review.move.slice(2,4),...(review.move.length===5?{promotion:review.move[4]}:{})});
 const checked=checkMateCertificate(review.proof.certificate,board,{attacker:review.actor,plies:review.context.task.plies-1,maxNodes:100000,milliseconds:60000});
 assert.ok(checked.verified&&checked.status==='success');
}
const out='research/reports/stability-joint-prefix-v1-2026-10-07';assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
const result={passed:true,panelSha256:await sha256(file),auditorSha256:await sha256(import.meta.filename),panels:2,candidates,memoryFingerprint:panels[0].memoryFingerprint,choices:panels.map(p=>p.review.move),scope:'Intermediate all-legal coverage and independent chosen-consequence proof check at a common recorded memory. No terminal control comparison, neural replay, retention or unfamiliar reasoning claim.'};
fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

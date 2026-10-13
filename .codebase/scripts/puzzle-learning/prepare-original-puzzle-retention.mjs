// Read-only teacher certificate preparation; never delivers neural feedback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { Chess } from 'chess.js';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const out='research/reports/original-puzzle-retention-certificates-v1-2026-10-07';
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
assert.ok(!fs.existsSync(out));
const guard=()=>assert.ok(process.memoryUsage().rss<=768*2**20 && os.freemem()>=256*2**20);
guard();fs.mkdirSync(out);
const row={id:'smothered-queen-c4-rook-f8',fen:'5r1k/6pp/7N/8/2Q5/8/8/K7 w - - 0 1',objective:'forced-mate',plies:3,finalTestEligible:false};
const board=new Chess(row.fen), moves=board.moves({verbose:true}), counts={success:0,failure:0,unknown:0};
const inputs={};
for(const p of ['.codebase/scripts/puzzle-learning/prepare-original-puzzle-retention.mjs','.codebase/src/search-and-feedback/adaptive-choice-review.mjs','.codebase/src/search-and-feedback/mate-certificate-check.mjs','package-lock.json','node_modules/chess.js/dist/cjs/chess.js']) inputs[p]=await sha256(p);
fs.writeFileSync(`${out}/plan.json`,JSON.stringify({row,inputs,scope:'Original trained position certificate coverage only; no learning or transfer.',command:process.argv},null,2));
for(const move of moves){
 guard();const start=performance.now(), key=move.from+move.to+(move.promotion??'');
 const review=reviewCommittedChoice(board,key,{objective:row.objective,plies:row.plies},{maxNodes:4096,milliseconds:2000});
 assert.notEqual(review.status,'unknown','Incomplete certificate coverage');
 board.move(move);const checked=checkMateCertificate(review.proof.certificate,board,{attacker:review.actor,plies:2,maxNodes:100000,milliseconds:60000});board.undo();
 assert.ok(checked.verified && checked.status===review.status);counts[review.status]++;
 fs.appendFileSync(`${out}/certificates.jsonl`,JSON.stringify({id:row.id,review})+'\n');
 await new Promise(r=>setTimeout(r,performance.now()-start));guard();
}
const report={complete:true,row,counts,legalMoves:moves.length,certificatesSha256:await sha256(`${out}/certificates.jsonl`),inputs,feedbackEvents:0};
fs.writeFileSync(`${out}/report.json.partial`,JSON.stringify(report,null,2)+'\n');fs.renameSync(`${out}/report.json.partial`,`${out}/report.json`);
console.log(JSON.stringify(report));

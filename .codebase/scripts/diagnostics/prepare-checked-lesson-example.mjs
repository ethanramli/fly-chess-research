// Retrospective teacher metadata example only; no neural presentation or update.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { compileConsequenceLesson } from '../../src/search-and-feedback/consequence-lesson.mjs';
const panel=JSON.parse(readFileSync('research/data/capture-retention-transfer-v2/train.jsonl','utf8').trim().split(/\r?\n/)[0]);
const timing=JSON.parse(readFileSync('research/reports/one-feedback-round-timing-v2-2026-10-08/report.json','utf8'));
const original=timing.results.find(row=>row.condition==='informative').before;
const board=new Chess();board.loadPgn(panel.pgn);
const task=panel.task;
const assessment={fen:board.fen(),pgn:board.pgn(),task,memoryHash:original.memoryHash,
  rows:original.rows.map(({move,score})=>({move,score})),choice:original.choice};
const experiences=panel.candidates.map(candidate=>({...verifiedExperience(board,candidate.move,task,candidate.proof),
  proof:candidate.proof,context:{fen:board.fen(),pgn:board.pgn(),task}}));
const lesson=compileConsequenceLesson(board,task,assessment,experiences,original.memoryHash,{maxExperiences:2});
const path='research/reports/feedback-quality-review-2026-10-08/example-lesson.json';
writeFileSync(path,JSON.stringify({scope:'Retrospective metadata example; ranking comes from the saved timing run. No teaching event executed.',lesson},null,2)+'\n');
console.log(JSON.stringify({path,contrast:lesson.contrast,eventBudget:lesson.eventBudget,neuralDelivery:lesson.delivery}));

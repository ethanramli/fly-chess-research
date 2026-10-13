// Training-only retrospective example; authenticates frozen inputs and saved scores.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { planCorrectionAndPreservation } from '../../src/puzzle-learning/correction-preservation-plan.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const protocolPath='research/data/bound-ray-feedback-development-v1/protocol.json',p=read(protocolPath);
assert.equal(sha(p.data.trainPath),p.inputHashes[p.data.trainPath]);
const origin='research/reports/bound-ray-feedback-development-v1-2026-10-08/bound-ray-informative';
const reportPath=`${origin}/report.json`,r=read(reportPath),audit=read(`${origin}/audit.json`);
assert.equal(sha(reportPath),audit.reportSha256);assert.equal(audit.exactFreshNeuralReplays,true);
assert.equal(r.identity.protocolSha256,sha(protocolPath));
const panels=readFileSync(p.data.trainPath,'utf8').trim().split(/\r?\n/).map(JSON.parse);
const observations=panels.map((panel,i)=>{
  const board=new Chess();board.loadPgn(panel.pgn);const measured=r.baseline.train[i];
  assert.equal(measured.panelId,panel.id);assert.equal(measured.memoryHash,r.initialMemoryHash);
  return {panelId:panel.id,split:'train',assessment:{fen:board.fen(),pgn:board.pgn(),task:p.task,
    memoryHash:measured.memoryHash,rows:measured.rows.map(({move,score})=>({move,score})),choice:measured.choice},
    experiences:panel.candidates.map(candidate=>({...verifiedExperience(board,candidate.move,p.task,candidate.proof),
      proof:candidate.proof,context:{fen:board.fen(),pgn:board.pgn(),task:p.task}}))};
});
const plan=planCorrectionAndPreservation(observations,r.initialMemoryHash);
const artifact={schema:'correction-preservation-example-v1',reportPath,reportSha256:sha(reportPath),
  trainingPath:p.data.trainPath,trainingSha256:sha(p.data.trainPath),plan,
  scope:'Retrospective plan from independently audited scratch training rankings. No graph inference, learning, validation/final selection or frozen experimental protocol.'};
writeFileSync('research/reports/bound-ray-feedback-development-completion-2026-10-08/curriculum-example.json',JSON.stringify(artifact,null,2)+'\n');
console.log(JSON.stringify({ready:plan.ready,target:plan.targetPanelId,sentinel:plan.sentinelPanelId,events:plan.experiences.length,counts:plan.channelCounts}));

// Encoder preflight only. Does not load or stimulate the released graph.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { createPublicLessonFrameEncoder } from '../../src/chess-input/public-lesson-frame-cue.mjs';
import { verifiedLessonFrames } from '../../src/puzzle-learning/verified-lesson-frames.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
const out = process.argv[process.argv.indexOf('--out') + 1];
if (!process.argv.includes('--out') || !out) throw Error('Required --out NEW_DIRECTORY');
const sha = b => createHash('sha256').update(b).digest('hex');
const mappingBytes = await readFile('research/reports/reversal-candidate-2026-10-05/mapping.json');
const mapping = JSON.parse(mappingBytes).mapping, encoder = createPublicLessonFrameEncoder(mapping);
const task = { objective: 'capture-retention', plies: 1 };
const rows = ['6k1/8/8/8/p6r/1P6/8/RK6 w - - 0 1', '6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1'].map(fen => {
  const board = new Chess(fen), proof = certifyCaptureRetention(board,'a1a4');
  const lesson = verifiedLessonFrames(board,'a1a4',task,proof);
  return { fen, status: lesson.status, proof, frames: lesson.frames.map(frame => ({ frame, cue: encoder.encode(frame) })) };
});
const result = { scope: 'Training-context encoding preflight only; zero graph presentations',
  mappingSha256: sha(mappingBytes), encoderIdentity: encoder.identity,
  encoderSourceSha256: sha(await readFile(new URL('../../src/chess-input/public-lesson-frame-cue.mjs',import.meta.url))),
  runnerSha256: sha(await readFile(new URL(import.meta.url))),
  rootCuesAlias: JSON.stringify(rows[0].frames[0].cue.stimulation) === JSON.stringify(rows[1].frames[0].cue.stimulation), rows };
await mkdir(out); await writeFile(`${out}/result.json`, JSON.stringify(result,null,2));
console.log(JSON.stringify({ rootCuesAlias: result.rootCuesAlias, statuses: rows.map(r=>r.status),
  accounting: rows.map(r=>r.frames.map(f=>f.cue.accounting)) }));

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { verifiedConsequenceClips } from '../src/lowram/verified-consequence-clips.mjs';
import { checkMateCertificate } from '../src/lowram/mate-certificate-check.mjs';
import { sha256 } from './fetch-graph.mjs';
const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out || existsSync(args.out)) throw Error('Require fresh output');
const sourceReport = 'research/reports/verified-line-explanation-2026-10-06/report.json';
const original = JSON.parse(readFileSync(sourceReport));
for (const [path, hash] of Object.entries(original.sources)) assert.equal(await sha256(path), hash);
const sources = {};
for (const path of ['.codebase/scripts/probe-consequence-clips.mjs', '.codebase/src/lowram/verified-consequence-clips.mjs',
  ...Object.keys(original.sources).filter(p => p.startsWith('.codebase/src/'))]) sources[path] = await sha256(path);
let independentClipsChecked = 0;
const results = original.results.map(row => {
  const board = new Chess(row.fixture.fen), lesson = verifiedConsequenceClips(board, row.candidate,
    { objective: 'forced-mate', plies: 3 }, row.proof);
  for (const clip of lesson.clips) {
    const context = new Chess(); context.loadPgn(clip.context.pgn); assert.equal(context.fen(), clip.context.fen);
    context.move({ from: clip.move.slice(0, 2), to: clip.move.slice(2, 4) });
    const checked = checkMateCertificate(clip.proof.certificate, context, {
      attacker: clip.actor, plies: clip.context.task.plies - 1, maxNodes: 4096, milliseconds: 2000 });
    assert.equal(checked.verified, true, checked.reason); assert.equal(checked.status, clip.status); independentClipsChecked++;
  }
  return { fixture: row.fixture, lesson };
});
mkdirSync(args.out, { recursive: true });
const report = { sourceReport, sourceReportSha256: await sha256(sourceReport), sources,
  independentClipsChecked, results, scope: 'Teacher-only bounded replay-context verification on known composed engineering fixtures; no graph inference, neural teaching, delayed eligibility or unfamiliar transfer.' };
writeFileSync(join(args.out, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ independentClipsChecked, results: results.map(r => ({ id: r.fixture.id,
  status: r.lesson.status, clips: r.lesson.clips.map(c => ({ move: c.move, plies: c.context.task.plies, status: c.status })) })) }));

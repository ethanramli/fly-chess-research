import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';

// Read-only symbolic-input viability check. No graph, learning or outcome selection.
const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out || existsSync(args.out)) throw Error('Require fresh --out');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path));
const teacherPath = 'research/reports/positive-puzzle-pipeline-v1-2026-10-06/report.json';
const teacher = read(teacherPath), teacherAudit = read(join('research/reports/positive-puzzle-pipeline-v1-2026-10-06', 'audit-prefix.json'));
assert.equal(teacher.complete, true); assert.equal(teacherAudit.passed, true); assert.equal(teacherAudit.prefixExact, true);
assert.equal(hash(readFileSync(teacherPath)), '01a7ab038b03474283580e0dd5f8cb821512dbac4f6833eb45192925dbe5445b');
assert.equal(teacherAudit.reportSha256, hash(readFileSync(teacherPath)));
const protocolPath = 'research/data/compartment-input-association-v1/protocol.json';
const protocol = read(protocolPath);
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const mapping = read(mappingPath).mapping;
const inputs = Object.fromEntries([teacherPath, protocolPath, mappingPath,
  'research/reports/positive-puzzle-pipeline-v1-2026-10-06/audit-prefix.json'].map(path => [path, hash(readFileSync(path))]));
const boards = new Map();
function remember(board, task, origin) {
  if (board.isGameOver()) return;
  const key = JSON.stringify([board.pgn(), task]);
  if (!boards.has(key)) boards.set(key, { pgn: board.pgn(), fen: board.fen(), task, origin });
  assert.ok(boards.size <= 128, 'State bound exceeded');
}
for (const ref of teacher.sharedPlans) {
  assert.equal(hash(readFileSync(ref.path)), ref.sha256); inputs[ref.path] = ref.sha256;
  const plan = read(ref.path), root = new Chess(); root.loadPgn(plan.task.pgn);
  const task = { objective: plan.task.objective, plies: plan.task.plies };
  // Plan task carries the public objective in context; check the root explicitly.
  const experienceTask = plan.experiences[0]?.context.task;
  assert.ok(experienceTask); task.objective = experienceTask.objective; task.plies = experienceTask.plies;
  remember(root, task, 'root');
  for (const trace of plan.traces) {
    const board = new Chess(); board.loadPgn(plan.task.pgn);
    for (const key of trace.moves) {
      if (board.isGameOver()) break;
      board.move({ from: key.slice(0, 2), to: key.slice(2, 4), ...(key.length === 5 ? { promotion: key[4] } : {}) });
      remember(board, task, 'saved-hypothetical-trace');
    }
  }
}
mkdirSync(args.out, { recursive: true });
const recordsPath = join(args.out, 'cues.jsonl'); writeFileSync(recordsPath, '');
const summaries = []; let records = 0;
for (const variant of protocol.variants) {
  const directory = 'research/reports/compartment-input-' + variant.id + '-2026-10-06';
  const association = read(join(directory, 'report.json')), audit = read(join(directory, 'audit-prefix.json'));
  assert.equal(association.complete, true); assert.equal(association.summary.allBehavioralGatesPassed, true);
  assert.equal(audit.passed, true); assert.equal(audit.prefixExact, true);
  assert.equal(hash(readFileSync(join(directory, 'report.json'))), audit.reportSha256);
  for (const file of ['report.json', 'audit-prefix.json']) inputs[join(directory, file)] = hash(readFileSync(join(directory, file)));
  const encoder = createCompartmentChessCueEncoder(mapping, { ...teacher.protocol.encoder,
    conjoin: variant.conjoin, stratify: variant.stratify });
  let legal = 0, errors = 0, offDose = 0; const examples = [];
  for (const context of boards.values()) {
    const board = new Chess(); board.loadPgn(context.pgn);
    assert.equal(board.fen(), context.fen); const initial = board.pgn();
    const moves = board.moves({ verbose: true }); assert.ok(moves.length <= 256);
    for (const move of moves) {
      const action = move.from + move.to + (move.promotion ?? ''); legal++; records++;
      let cue = null, error = null;
      try { cue = encoder.encode(board, action, context.task); }
      catch (e) { error = String(e.message); errors++; }
      const fixedDose = cue !== null && cue.stimulation.length === 14
        && cue.stimulation.every(cell => cell.current === 1.5) && cue.accounting.totalCurrent === 21;
      if (cue && !fixedDose) offDose++;
      if ((error || !fixedDose) && examples.length < 8) examples.push({ fen: context.fen, move: action, origin: context.origin,
        error, cells: cue?.stimulation.length ?? null, current: cue?.accounting.totalCurrent ?? null });
      appendFileSync(recordsPath, JSON.stringify({ variant: variant.id, context, move: action, fixedDose, error, cue }) + '\n');
      assert.equal(board.pgn(), initial); assert.equal(board.fen(), context.fen);
    }
  }
  summaries.push({ variant: variant.id, encoderIdentity: encoder.identity, legal, errors, offDose,
    passed: errors === 0 && offDose === 0, examples });
}
const sources = Object.fromEntries(['.codebase/scripts/puzzle-learning/preflight-compartment-puzzles.mjs',
  '.codebase/src/chess-input/compartment-chess-cue.mjs', '.codebase/src/chess-input/relational-chess-cue-v2.mjs']
  .map(path => [path, hash(readFileSync(path))]));
const report = { passed: summaries.every(s => s.passed), inputs, sources, encoder: teacher.protocol.encoder,
  boards: boards.size, records, recordsSha256: hash(readFileSync(recordsPath)), summaries,
  scope: 'Input construction and declared physical-dose viability on saved training investigation states only. No full graph, neural adaptation, transfer or guarantee for unseen future search states.' };
writeFileSync(join(args.out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));

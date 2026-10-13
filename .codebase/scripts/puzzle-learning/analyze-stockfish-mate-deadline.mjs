import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const input = 'research/reports/stockfish-target-feasibility-v1-2026-10-07';
const out = 'research/reports/stockfish-mate-deadline-diagnostic-v1-2026-10-07';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(resolve(root, path));
const reportBytes = read(`${input}/report.json`);
const auditBytes = read(`${input}/audit.json`);
const complete = JSON.parse(read(`${input}/COMPLETE.json`));
const report = JSON.parse(reportBytes);
const audit = JSON.parse(auditBytes);

if (!report.complete || audit.passed !== true) throw Error('Stockfish source report is not complete and audited');
if (hash(reportBytes) !== complete.reportSha256 || hash(auditBytes) !== complete.auditSha256) throw Error('Source completion hashes do not match');
if (audit.reportSha256 !== complete.reportSha256 || audit.certificates !== 124) throw Error('Unexpected source audit identity/count');

const rows = [];
for (const record of report.records) {
  const recordBytes = read(record.path.replaceAll('\\', '/'));
  if (hash(recordBytes) !== record.sha256) throw Error(`Raw record hash mismatch: ${record.path}`);
  const row = JSON.parse(recordBytes);
  if (row.proof?.status !== 'success' && row.proof?.status !== 'failure') throw Error(`Unresolved proof in ${record.path}`);
  rows.push({
    board: row.rowId,
    budget: row.nodeBudget,
    move: row.move,
    outcome: row.proof.status,
    targetAvailable: row.target.available,
    kind: row.target.available ? row.target.info.kind : null,
    actorScore: row.target.available ? row.target.actorScore : null,
    utility: row.target.available ? row.target.utility : null,
    criterion: row.proof.criterion,
    path: record.path,
  });
}
if (rows.length !== 124) throw Error(`Expected 124 audited records; got ${rows.length}`);

const panels = [...new Set(rows.map(r => `${r.board}|${r.budget}`))].map(key => {
  const [board, budgetText] = key.split('|');
  const panel = rows.filter(r => r.board === board && r.budget === Number(budgetText));
  const successes = panel.filter(r => r.outcome === 'success');
  const failures = panel.filter(r => r.outcome === 'failure');
  const exactMateSuccesses = successes.filter(r => r.targetAvailable && r.kind === 'mate');
  const exactMateFailures = failures.filter(r => r.targetAvailable && r.kind === 'mate');
  return {
    board, nodeBudget: Number(budgetText), legalCandidates: panel.length,
    targetAvailable: panel.filter(r => r.targetAvailable).length,
    verifiedSuccesses: successes.length,
    successMateTargets: exactMateSuccesses.map(({ move, actorScore }) => ({ move, actorScore })),
    failureMateTargets: exactMateFailures.map(({ move, actorScore }) => ({ move, actorScore })),
    failureCentipawnTargets: failures.filter(r => r.targetAvailable && r.kind === 'cp').length,
    unavailable: panel.filter(r => !r.targetAvailable).length,
  };
});

const successTargets = rows.filter(r => r.outcome === 'success' && r.targetAvailable && r.kind === 'mate');
const failureMateTargets = rows.filter(r => r.outcome === 'failure' && r.targetAvailable && r.kind === 'mate');
if (successTargets.length !== 4 || successTargets.some(r => r.actorScore !== 1)) throw Error('Expected four exact success mate-in-one targets');
if (failureMateTargets.length !== 4 || failureMateTargets.some(r => r.actorScore !== 3)) throw Error('Expected four exact failure mate-in-three targets');

const result = {
  schema: 'stockfish-mate-deadline-diagnostic-v1',
  complete: true,
  question: 'Do exact mate-distance outputs add a task-deadline cue beyond full-game WDL on the saved panels?',
  scope: 'Retrospective analysis only; two inspected development boards, four board/budget panels; no teaching or neural update.',
  source: {
    reportSha256: hash(reportBytes), auditSha256: hash(auditBytes),
    completeSha256: hash(read(`${input}/COMPLETE.json`)),
    records: report.records.length,
  },
  counts: {
    candidates: rows.length,
    exactTargets: rows.filter(r => r.targetAvailable).length,
    unavailable: rows.filter(r => !r.targetAvailable).length,
    exactMateSuccessTargets: successTargets.length,
    exactMateFailureTargets: failureMateTargets.length,
    exactCentipawnFailures: rows.filter(r => r.outcome === 'failure' && r.targetAvailable && r.kind === 'cp').length,
  },
  panels,
  interpretation: {
    result: 'In all four panels, the sole certified success has exact actor-relative mate score +1; the one exact mate-scored failure has +3. This adds a narrow deadline-relevant distinction where WDL tied them.',
    limit: 'Most failure candidates have centipawn targets rather than forced-mate scores; this does not establish a calibrated total ranking across all legal moves, a valid fly value output, neural feedback, faster learning, or transfer.',
    nextGate: 'Freeze a task-aware Stockfish target transform and existing-pathway teaching rule, then compare Stockfish feedback against verified-consequence, absent, shuffled, and disabled-plasticity conditions on training-only puzzles before disjoint transfer.',
  },
};
const scriptPath = '.codebase/scripts/puzzle-learning/analyze-stockfish-mate-deadline.mjs';
result.analysisScriptSha256 = hash(read(scriptPath));
mkdirSync(resolve(root, out), { recursive: true });
const destination = resolve(root, `${out}/analysis.json`);
const temporary = `${destination}.partial`;
writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
renameSync(temporary, destination);
console.log(JSON.stringify({ output: `${out}/analysis.json`, ...result.counts, panels: panels.map(p => ({ board: p.board, nodeBudget: p.nodeBudget, successMateTargets: p.successMateTargets, failureMateTargets: p.failureMateTargets })) }, null, 2));

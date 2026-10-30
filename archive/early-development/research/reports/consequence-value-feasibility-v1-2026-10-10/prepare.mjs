// Freeze the prospective study before any model is instantiated.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { certifyMate } from '../../../.codebase/src/search-and-feedback/mate-certificate.mjs';
import { verifiedExperience } from '../../../.codebase/src/search-and-feedback/verified-feedback.mjs';
import { shuffledFeedback } from '../../../.codebase/src/neural-learning/association-validation.mjs';

const previous = JSON.parse(readFileSync('research/data/gamma2-adaptive-target-v1/protocol.json'));
const study = 'research/reports/consequence-value-feasibility-v1-2026-10-10';
const p = { schema: 'consequence-value-feasibility-v1',
  scope: 'Prospective reference-relative neural consequence preference on two trained queen-mate contexts and two within-family development probes. No calibrated position value, disjoint-family transfer, biological retention/reversal or reasoning claim.',
  graphPath: previous.graphPath, annotationPath: previous.annotationPath, mappingPath: previous.mappingPath,
  model: previous.model, memory: previous.memory, timing: previous.timing, encoder: previous.encoder,
  readout: { cells: previous.readout.cells, scale: 1, algorithm: 'tanh((fixed MBON12-minus-MBON01 balance - identical unconditioned cue response)/1); larger preferred, null choice on tied maximum; no label fitting' },
  conditions: ['informative', 'absent', 'shuffled', 'disabled'], shuffleSeed: 13,
  positions: [
    { id: 'supported-queen-near', role: 'training', fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', task: { objective: 'forced-mate', plies: 1 } },
    { id: 'supported-queen-far', role: 'training', fen: '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1', task: { objective: 'forced-mate', plies: 1 } },
    { id: 'missing-king-support', role: 'development-counterfactual', fen: '7k/5Q2/8/6K1/8/8/8/8 w - - 0 1', task: { objective: 'forced-mate', plies: 1 } },
    { id: 'new-queen-origin', role: 'development-changed-board', fen: '7k/8/6K1/8/5Q2/8/8/8 w - - 0 1', task: { objective: 'forced-mate', plies: 1 } },
  ],
  schedule: [
    { position: 'supported-queen-near', move: 'f7g8', status: 'failure' },
    { position: 'supported-queen-near', move: 'f7h7', status: 'success' },
    { position: 'supported-queen-far', move: 'f5e6', status: 'failure' },
    { position: 'supported-queen-far', move: 'f5f8', status: 'success' },
  ],
  counterfactual: { intact: 'supported-queen-near', changed: 'missing-king-support', move: 'f7h7' },
  changedBoardProbe: 'new-queen-origin', verification: { maxNodes: 4096, milliseconds: 2000 },
  maxPresentations: 4096, marginFloor: 1e-12, cpuDuty: .5, maxRssMiB: 768, minFreeMiB: 256,
  baselineContract: 'Only bounded MBON summaries on declared development positions, measured before teaching. No labels or final families enter the reference. All untrained relative values must be exactly zero.',
  checkpointContract: 'Atomic published memory+pending episode/cursor/receipt prefix after each frame before acknowledgment; last completed publication only; resume into new output with all identity pins unchanged.',
  gates: ['Correct unique all-legal choice after first contrast and on both trained contexts after intervening teaching',
    'No control passes both trained all-legal choices', 'Intact learned value exceeds independently certified support-shift failure by 1e-12',
    'Correct unique all-legal choice on changed-board development probe', 'Zero values after memory reset and exact restored scores/choices'],
  limitations: 'One initialized core and two contrasts. Same motif family, no final-test families. Stimulus timing and gain physiology remain engineering approximations. Learned valence units uncalibrated. Any failed gate rejects feasibility without tuning protocol or browser adoption.',
};
p.shufflePermutation = shuffledFeedback([0, 1, 2, 3], p.shuffleSeed);
assert.notDeepEqual(p.shufflePermutation.map(i => p.schedule[i].status), p.schedule.map(s => s.status), 'Uninformative shuffle');
const certificates = p.schedule.map(slot => {
  const f = p.positions.find(f => f.id === slot.position), board = new Chess(f.fen), next = new Chess(); next.loadPgn(board.pgn());
  next.move({ from: slot.move.slice(0, 2), to: slot.move.slice(2, 4) });
  const proof = certifyMate(next, board.turn(), { plies: 0, ...p.verification });
  const verified = verifiedExperience(board, slot.move, f.task, proof); assert.equal(verified.status, slot.status);
  return { ...slot, context: { fen: board.fen(), pgn: board.pgn(), task: f.task }, proof, verified };
});
const f = p.positions.find(f => f.id === p.counterfactual.changed), b = new Chess(f.fen), n = new Chess(); n.loadPgn(b.pgn()); n.move({ from: 'f7', to: 'h7' });
const counterfactual = certifyMate(n, 'w', { plies: 0, ...p.verification }); assert.equal(counterfactual.status, 'failure');
const files = new Set();
function dependencies(file) {
  const path = relative(process.cwd(), resolve(file)).replaceAll('\\', '/'); if (files.has(path)) return;
  assert(!path.startsWith('..')); files.add(path);
  if (!path.endsWith('.mjs')) return;
  for (const m of readFileSync(path, 'utf8').matchAll(/\b(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) dependencies(join(dirname(path), m[1]));
}
for (const file of [`${study}/run.mjs`, `${study}/audit.mjs`, `${study}/prepare.mjs`, p.mappingPath, 'package.json', 'package-lock.json']) dependencies(file);
p.sources = Object.fromEntries([...files].sort().map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
mkdirSync('research/data/consequence-value-feasibility-v1', { recursive: true });
writeFileSync('research/data/consequence-value-feasibility-v1/protocol.json', JSON.stringify(p, null, 2), { flag: 'wx' });
writeFileSync(`${study}/certificate-preflight.json`, JSON.stringify({ timestamp: new Date().toISOString(), certificates, counterfactual,
  scope: 'Independent chess-rule certificate checks only; no model, graph or learning' }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ registered: true, sourceFiles: files.size, shufflePermutation: p.shufflePermutation, statuses: p.shufflePermutation.map(i => p.schedule[i].status), certificates: certificates.map(c => c.status) }));

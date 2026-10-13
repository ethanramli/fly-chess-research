import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v3.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/capture-retention-transfer-assay-v3/protocol.json';
const runPath = 'research/reports/capture-retention-assay-v3-2026-10-07/seed-47-informative';
const activityPath = 'research/reports/capture-retention-assay-v3-2026-10-07/counterfactual-activity-probe-v3.json';
const outPath = 'research/reports/capture-retention-assay-v3-2026-10-07/feature-alias-audit.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const p = read(protocolPath), report = read(`${runPath}/report.json`), activity = read(activityPath);
for (const [path, hash] of Object.entries({ ...p.inputHashes, ...p.sourceHashes }))
  assert.equal(await sha256(path), hash, `Frozen identity differs: ${path}`);
const mapping = read(p.mappingPath).mapping;
assert.equal(digest(mapping), p.mappingHash);
const encoder = createRelationalChessCueEncoder(mapping, p.cue.config);
const families = readFileSync(p.families.train, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const trainRows = families.flatMap(panel => panel.candidates.map(candidate => ({ panel, candidate })));
const selected = (cue, index) => cue.stimulation.some(cell => cell.index === index);
const kcEdges = new Map(); let offset = 0;
for (const group of mapping.groups) for (let j = 0; j < group.kc.length; j++, offset++)
  kcEdges.set(group.kc[j], [...(kcEdges.get(group.kc[j]) ?? []), offset]);
const perRunEvent = report.receipts.map(ref => read(ref.path));
assert.equal(perRunEvent.length, trainRows.length);
const trainingUsage = new Map();
for (let e = 0; e < trainRows.length; e++) {
  const event = perRunEvent[e], cue = event.receipt.cue;
  assert.equal(cue.identity, encoder.identity);
  for (const assignment of cue.assignments) {
    if (!selected(cue, assignment.index)) continue;
    const indices = kcEdges.get(assignment.index) ?? [];
    const activeEntries = indices.filter(i => event.receipt.local.kc[i] > 0).length;
    trainingUsage.set(assignment.index, [...(trainingUsage.get(assignment.index) ?? []), {
      eventIndex: e, panelId: event.panelId, move: event.move, status: event.status,
      channel: event.channel, token: assignment.token, activeEntries
    }]);
  }
}
const finals = readFileSync(p.families.final, 'utf8').trim().split(/\r?\n/).map(JSON.parse)
  .filter(panel => ['te-01', 'te-05'].includes(panel.id));
const trainingVsFinal = [];
for (const panel of finals) {
  const board = new Chess(); board.loadPgn(panel.pgn);
  for (const candidate of panel.candidates) {
    const cue = encoder.encode(board, candidate.move, p.task);
    const measured = activity.results.find(row => row.state === 'informative-trained' && row.panelId === panel.id)
      ?.candidates.find(row => row.move === candidate.move);
    assert.ok(measured);
    for (const assignment of cue.assignments) {
      if (!selected(cue, assignment.index)) continue;
      const prior = trainingUsage.get(assignment.index) ?? [];
      const aliases = prior.filter(use => use.token !== assignment.token);
      if (aliases.length) trainingVsFinal.push({ panelId: panel.id, move: candidate.move,
        outcome: candidate.proof.status, testToken: assignment.token, kcIndex: assignment.index,
        testExcessRate: measured.tokenRows.find(row => row.token === assignment.token)?.excessRate,
        selectedInTraining: aliases.length, distinctTrainingTokens: [...new Set(aliases.map(row => row.token))],
        trainingEvents: aliases });
    }
  }
}
const criticalToken = 'around-origin:r:0,4:-:self:p:-1,5';
const criticalAlias = trainingVsFinal.find(row => row.panelId === 'te-05' && row.move === 'e2e6' && row.testToken === criticalToken);
assert.ok(criticalAlias, 'Expected predeclared moved-pawn blocker token alias');
assert.equal(criticalAlias.kcIndex, 124);
assert.ok(criticalAlias.trainingEvents.some(row => row.token === 'around-target:r:self:p:2,-3'
  && row.panelId === 'tr-07' && row.move === 'e1e5' && row.status === 'success' && row.activeEntries > 0));
const ownSource = fileURLToPath(import.meta.url).replaceAll('\\', '/');
const output = { schema: 'capture-retention-feature-alias-audit-v1',
  scope: 'Read-only cross-family audit of selected hash-projected KC identities for the trained counterfactual pair; aliases are evidence of shared coding, not by themselves proof of causal interference.',
  protocolSha256: sha(protocolPath), runReportSha256: sha(`${runPath}/report.json`),
  activityReportSha256: sha(activityPath), scriptPath: ownSource, scriptSha256: sha(ownSource),
  cueIdentity: encoder.identity, trainExperiences: trainRows.length,
  finalCounterfactualAliases: trainingVsFinal,
  criticalMovedBlockerAlias: criticalAlias,
  interpretation: 'The te-05 e2e6 blocker feature is selected and active at KC124. The same KC was selected and active during tr-07/e1e5 for the distinct token around-target:r:self:p:2,-3; that training event carried success/PAM02 feedback. This gives a concrete input-feature collision on the path to the blocker-related MBON12-right edge. It is a plausible interference route; the assay does not isolate the alias as the cause of the unchanged action ranking.' };
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, criticalKc: criticalAlias.kcIndex,
  criticalTrainingAliasCount: criticalAlias.trainingEvents.length, reportPath: outPath }));

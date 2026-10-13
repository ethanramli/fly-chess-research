// Post-run analysis only. Never supplies labels to neural inference or training.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Chess } from 'chess.js';

const directory = process.argv[2];
assert(directory, 'Require completed run directory');
const resultBytes = readFileSync(`${directory}/result.json`);
const result = JSON.parse(resultBytes), protocol = JSON.parse(readFileSync(`${directory}/protocol.json`));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [path, expected] of Object.entries(protocol.sources))
  assert.equal(sha(readFileSync(`${directory}/sources/${path}`)), expected, path);
const load = file => import(pathToFileURL(resolve(directory, 'sources/.codebase/src/search-and-feedback', file)).href);
const { certifyMate } = await load('mate-certificate.mjs');
const { verifiedExperience } = await load('verified-feedback.mjs');
const certificates = {};
for (const fixture of protocol.positions) {
  const board = new Chess(fixture.fen);
  certificates[fixture.id] = Object.fromEntries(board.moves({ verbose: true }).map(move => {
    const action = move.from + move.to + (move.promotion ?? '');
    const next = new Chess(); next.loadPgn(board.pgn()); next.move(move);
    const proof = certifyMate(next, board.turn(), { plies: 0, ...protocol.verification });
    const checked = verifiedExperience(board, action, fixture.task, proof);
    assert.notEqual(checked.status, 'unknown');
    return [action, { status: checked.status, proof }];
  }));
}
const arms = result.results.map(arm => ({ condition: arm.condition,
  fixtures: Object.fromEntries(protocol.positions.map(fixture => {
    const assessment = arm.final[fixture.id], rows = [...assessment.rows].sort((a, b) => b.value - a.value);
    assert.deepEqual(rows.map(row => row.move).sort(), Object.keys(certificates[fixture.id]).sort());
    const successful = rows.filter(row => certificates[fixture.id][row.move].status === 'success');
    const failed = rows.filter(row => certificates[fixture.id][row.move].status === 'failure');
    const successValue = Math.max(...successful.map(row => row.value));
    return [fixture.id, { role: fixture.role, choice: assessment.choice,
      choiceStatus: arm.outcomes[fixture.id].status, rawChoice: assessment.rawChoice,
      rawChoiceStatus: certificates[fixture.id][assessment.rawChoice].status,
      legalActions: rows.length, successfulActions: successful.map(row => row.move),
      bestSuccessCompetitionRank: successful.length ? 1 + rows.filter(row => row.value > successValue).length : null,
      bestSuccessMinusBestFailure: successful.length && failed.length ? successValue - Math.max(...failed.map(row => row.value)) : null,
      uniqueTopMargin: rows[0].value - rows[1].value }];
  })) }));
const analysis = { resultSha256: sha(resultBytes), analysisSourceSha256: sha(readFileSync(new URL(import.meta.url))),
  protocolSha256: result.identity.protocolHash, registeredGates: result.gates,
  feasibilityPassed: result.feasibilityPassed, certificates, arms,
  warning: 'Competition rank 1 under tied zero scores is not a unique choice. A lower counterfactual value alone is not correct counterfactual action selection. Same-family development only; no final families, calibrated values, biological retention or reasoning.' };
writeFileSync(`${directory}/analysis.json`, JSON.stringify(analysis, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ registeredGates: analysis.registeredGates, arms }, null, 2));

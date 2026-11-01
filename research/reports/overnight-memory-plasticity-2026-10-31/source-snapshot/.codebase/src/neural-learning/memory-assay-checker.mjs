// Independent certificate checker. Its own consequence rule; it does not read the teacher's table.
import { createHash } from 'node:crypto';

const SCHEMA = 'memory-assay-certificate-v1';
const ORDER = ['ACQ_A', 'ACQ_BC', 'REV1', 'REV2', 'REV3'];
const canon = v => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const digest = v => createHash('sha256').update(canon(v)).digest('hex');

// A's good image flips once per REV phase that has started, so counting them gives the answer.
function expectedGood(item, phase, situation) {
  if (item === 'A') {
    const i = ORDER.indexOf(phase);
    if (i < 0) return null;
    const revsStarted = ORDER.slice(0, i + 1).filter(p => p.startsWith('REV')).length;
    return revsStarted % 2 === 1 ? 'A-' : 'A+';
  }
  if (item === 'B') return 'B+';
  if (item === 'C') return 'C+';
  if (item === 'E') return situation === 'E1' ? 'E+' : situation === 'E2' ? 'E-' : null;
  return null;
}

export function checkCertificate(cert, { fixtureId, scheduleHash, prevHash, unknown }) {
  const fail = reason => ({ ok: false, reason });
  if (cert?.schema !== SCHEMA) return fail('schema');
  if (cert.fixtureId !== fixtureId) return fail('fixture');
  if (cert.scheduleHash !== scheduleHash) return fail('schedule');
  if (cert.prevHash !== prevHash) return fail('prevHash');
  const { hash, ...body } = cert;
  if (digest(body) !== hash) return fail('hash');
  const pair = [`${cert.item}+`, `${cert.item}-`];
  if (!['A', 'B', 'C', 'E'].includes(cert.item) || !pair.includes(cert.chosen)) return fail('chosen');
  if (!cert.scores || !pair.every(id => Number.isFinite(cert.scores[id]))) return fail('scores');
  const good = expectedGood(cert.item, cert.phase, cert.situation);
  if (good === null) return fail('phase or situation');
  const expected = unknown ? 'unknown' : cert.chosen === good ? 'good' : 'bad';
  return cert.consequence === expected ? { ok: true } : fail('consequence');
}

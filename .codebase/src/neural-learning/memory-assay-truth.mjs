// Teacher-side consequence table. The checker keeps its own copy, written differently.
import { createHash } from 'node:crypto';

const SCHEMA = 'memory-assay-certificate-v1';
const A_GOOD = { ACQ_A: 'A+', ACQ_BC: 'A+', REV1: 'A-', REV2: 'A+', REV3: 'A-' };
const canon = v => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const sha256 = v => createHash('sha256').update(canon(v)).digest('hex');

export function goodImage(item, phase, situation = null) {
  if (item === 'A') { if (!Object.hasOwn(A_GOOD, phase)) throw Error(`No A consequence in ${phase}`); return A_GOOD[phase]; }
  if (item === 'B') return 'B+';
  if (item === 'C') return 'C+';
  if (item === 'E' && situation === 'E1') return 'E+';
  if (item === 'E' && situation === 'E2') return 'E-';
  throw Error(`No consequence for ${item} in ${phase} (${situation})`);
}

export function buildCertificate({ fixtureId, scheduleHash, phase, global, item, situation = null, prevHash, chosen, scores, unknown }) {
  const body = { schema: SCHEMA, fixtureId, scheduleHash, phase, global, item, situation, prevHash, chosen, scores,
    consequence: unknown ? 'unknown' : chosen === goodImage(item, phase, situation) ? 'good' : 'bad' };
  return { ...body, hash: sha256(body) };
}

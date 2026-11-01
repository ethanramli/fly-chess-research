// Versioned evidence repair. Original checker/certificates remain unchanged for historical runs.
import { createHash } from 'node:crypto';
import { checkCertificate as checkOriginal } from './memory-assay-checker.mjs';

export const hashRecord = value => createHash('sha256').update(JSON.stringify(value, (_, x) =>
  x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x)).digest('hex');

export function checkCertificate(cert, context) {
  const { expectedTrial: t, scores, chosen } = context;
  const fail = reason => ({ ok: false, reason });
  if (!t || !Number.isSafeInteger(t.global) || t.global < 0 || typeof t.unknown !== 'boolean'
    || context.unknown !== t.unknown || typeof t.phase !== 'string' || !['A', 'B', 'C', 'E'].includes(t.item)) return fail('expected trial');
  if (!cert || ['phase', 'global', 'item'].some(k => cert[k] !== t[k])
    || cert.situation !== (t.situation ?? null)) return fail('scheduled trial');
  const pair = [`${t.item}+`, `${t.item}-`];
  if (!pair.includes(chosen) || cert.chosen !== chosen) return fail('observed choice');
  if (!scores || !cert.scores || Object.keys(scores).length !== 2 || Object.keys(cert.scores).length !== 2
    || !pair.every(id => Number.isFinite(scores[id]) && cert.scores[id] === scores[id])) return fail('observed scores');
  return checkOriginal(cert, context);
}

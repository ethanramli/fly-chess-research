import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAIRS, GROUPS, BOARD_CONTROLS, runAudit, boardFeatures, samePieces, legalStart, enPassantGap }
  from '../../src/search-and-feedback/combination-shortcut-audit.mjs';

const audit = runAudit();
const score = (control, group) => audit.table[control][group];
const all = (control, group) => score(control, group).correct === score(control, group).total;
const none = (control, group) => score(control, group).correct === 0;
const AS_WRITTEN = ['pin, as written', 'recapture, as written', 'value'];
const SAME_PIECES = ['pin, matched pieces', 'pin, moves reversed', 'recapture, matched pieces', 'recapture, king defence'];

test('every pair is legal, flips in the checker and shows its group facts', () => {
  assert.equal(audit.pairs.length, PAIRS.length);
  for (const pair of PAIRS) assert.ok(GROUPS[pair.group], pair.id);
  for (const group of Object.keys(GROUPS)) assert.ok(audit.groups.includes(group), group);
});

test('a pair that does not flip is rejected', () => {
  const [pair] = PAIRS;
  assert.throws(() => runAudit([{ ...pair, bad: pair.good }]), /does not flip/);
  const recapture = PAIRS.find(p => p.group === 'recapture, as written');
  assert.throws(() => runAudit([{ ...recapture, group: 'pin, as written' }]), /does not show the facts/);
});

test('a start where the side not to move is in check is rejected', () => {
  assert.throws(() => legalStart('4k3/8/8/8/8/8/8/4RK2 w - - 0 1'), /not to move is in check/);
});

test('board-only controls get no checker answer fields', () => {
  const keys = Object.keys(boardFeatures(PAIRS[0].good, PAIRS[0].move));
  for (const field of ['recaptures', 'pinnedAttackers', 'replies', 'certificate']) assert.ok(!keys.includes(field), field);
  for (const control of Object.values(BOARD_CONTROLS)) assert.equal(control.score.length, 1);
});

test('piece count plus value passes the protocol groups as written and fails with the same pieces', () => {
  for (const group of AS_WRITTEN) assert.ok(all('piece count plus value', group), group);
  for (const group of SAME_PIECES) assert.ok(none('piece count plus value', group), group);
  for (const p of audit.pairs) {
    if (p.group === 'pin, as written' || p.group === 'recapture, as written') assert.equal(p.samePieces, false, p.id);
    if (SAME_PIECES.includes(p.group)) assert.equal(p.samePieces, true, p.id);
  }
});

test('counting enemy moves reads the pin until the move count is reversed', () => {
  for (const control of ['enemy mobility', 'attackers, moves and value']) {
    assert.ok(all(control, 'pin, matched pieces'), control);
    assert.ok(none(control, 'pin, moves reversed'), control);
  }
  assert.ok(all('recapture only, legal', 'pin, moves reversed'));
});

test('recapture pairs fall to attacker counting without legal moves', () => {
  for (const group of ['recapture, as written', 'recapture, matched pieces']) assert.ok(all('attacker count', group), group);
  assert.ok(none('attacker count', 'recapture, king defence'));
  assert.ok(all('attackers minus defenders', 'recapture, king defence'));
  for (const group of ['pin, as written', 'pin, matched pieces', 'pin, moves reversed']) assert.ok(none('attacker count', group), group);
});

test('single-idea rules pass only their own groups', () => {
  for (const group of ['value', 'idea 3 training']) assert.ok(all('piece value', group), group);
  for (const group of [...AS_WRITTEN.slice(0, 2), ...SAME_PIECES]) assert.ok(none('piece value', group), group);
  assert.ok(none('recapture only, legal', 'value'));
  for (const group of ['pin, as written', 'recapture, as written', 'value']) assert.ok(none('recapture only, attacked', group), group);
});

test('fixed sums pass every twin pair; only a graded sum fails the override comparison', () => {
  for (const control of ['fixed sum of concept scores', 'fixed sum, graded value', 'oracle: fixed sum', 'oracle: combined answer'])
    for (const group of audit.groups) assert.ok(all(control, group), `${control} on ${group}`);
  assert.equal(audit.override.correct['fixed sum, graded value'], false);
  assert.equal(audit.override.correct['fixed sum of concept scores'], true);
  assert.equal(audit.override.correct['oracle: combined answer'], true);
});

test('the checker calls a pawn safe when it can be taken en passant', () => {
  const gap = enPassantGap();
  assert.equal(gap.checkerStatus, 'success');
  assert.deepEqual(gap.recaptures, []);
  assert.deepEqual(gap.enPassantCaptures, ['d4e3']);
});

test('samePieces compares both colours', () => {
  const pin = PAIRS.find(p => p.id === 'pin-diagonal');
  assert.equal(samePieces(pin), false);
  assert.equal(samePieces({ ...pin, good: pin.bad }), true);
});

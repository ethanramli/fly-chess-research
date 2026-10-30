import test from 'node:test';
import assert from 'node:assert/strict';
import { checkValueChannel } from '../../scripts/puzzle-learning/check-d4-value-channel.mjs';
import { provisionalMBONValue } from '../../src/search-and-feedback/stockfish-target.mjs';

// Synthetic rows only: MBON12 - MBON01 is always positive while score (MBON12 - MBON01 - MBON07 + MBON14) varies in sign.
const boards = [
  [
    { move: 'a', MBON12: 5, MBON01: 1, MBON07: 0, MBON14: 0, score: 4 },
    { move: 'b', MBON12: 3, MBON01: 1, MBON07: 6, MBON14: 0, score: -4 },
    { move: 'c', MBON12: 2, MBON01: 1, MBON07: 0, MBON14: 0, score: 1 },
  ],
  [
    { move: 'd', MBON12: 4, MBON01: 2, MBON07: 0, MBON14: 0, score: 2 },
    { move: 'e', MBON12: 1, MBON01: 0, MBON07: 3, MBON14: 0, score: -2 },
  ],
];

const scoreFn = row => row.score;

test('provisional channel is constant-sign and fails', () => {
  const r = checkValueChannel(boards, provisionalMBONValue);
  assert.equal(r.constantSign, true);
  assert.equal(r.pass, false);
});

test('score channel with mixed signs and perfect ordering passes', () => {
  const r = checkValueChannel(boards, scoreFn);
  assert.equal(r.constantSign, false);
  assert.equal(r.boardsWithMixedSign, 2);
  assert.equal(r.orderAgreement, 1);
  assert.equal(r.pass, true);
});

test('value function reversing score order fails', () => {
  const r = checkValueChannel(boards, row => -row.score);
  assert.equal(r.constantSign, false);
  assert.equal(r.orderAgreement, 0);
  assert.equal(r.pass, false);
});

test('all-null values are constant-sign and fail', () => {
  const r = checkValueChannel(boards, () => null);
  assert.equal(r.constantSign, true);
  assert.equal(r.zeroOrNull, 5);
  assert.equal(r.pass, false);
});

test('equal scores only give no usable pair and fail', () => {
  const equal = [[
    { move: 'x', MBON12: 1, MBON01: 0, MBON07: 0, MBON14: 0, score: 1 },
    { move: 'y', MBON12: 0, MBON01: 1, MBON07: 0, MBON14: 0, score: 1 },
  ]];
  const r = checkValueChannel(equal, scoreFn);
  assert.equal(r.orderAgreement, null);
  assert.equal(r.pass, false);
});

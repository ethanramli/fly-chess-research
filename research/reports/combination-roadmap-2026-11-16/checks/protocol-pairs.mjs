// Design check 1: can a fixed sum, or a rule with no chess idea, pass the protocol's twin pairs as written? Report: ../README.md
import { Chess, legalStart, truth, pieceCount, material, successor } from './lib.mjs';

// One hand-built legal pair per protocol group, built the way the generator builds them: one square edited.
const PAIRS = [
  { group: 'pin pair (as written)', move: 'd2c4',
    good: '4k3/8/8/4n3/2p5/8/3N4/4R1K1 w - - 0 1', bad: '4k3/8/8/4n3/2p5/4P3/3N4/4R1K1 w - - 0 1',
    note: 'Knight takes pawn. Good: the only attacker (knight e5) is pinned by the rook on e1. Bad: a white pawn on e3 blocks the pin line.' },
  { group: 'recapture pair (as written)', move: 'd2c4',
    good: '4k3/8/8/4n3/2p5/8/3N4/4R1K1 w - - 0 1', bad: '4k3/8/8/1p2n3/2p5/8/3N4/4R1K1 w - - 0 1',
    note: 'Pinned knight on both. Bad: an extra black pawn on b5 also attacks c4.' },
  { group: 'value pair (as written)', move: 'd2c4',
    good: '4k3/8/8/1p2n3/2n5/8/3N4/4R1K1 w - - 0 1', bad: '4k3/8/8/1p2n3/2p5/8/3N4/4R1K1 w - - 0 1',
    note: 'Pinned and unpinned attacker on both. Good: knight takes knight. Bad: knight takes pawn.' },
];

const features = (fen, move) => {
  legalStart(fen);
  const t = truth(fen, move), board = new Chess(fen), after = successor(fen, move).board;
  return {
    answer: t.answer,
    noLegalRecapture: t.recaptures.length === 0 ? 1 : 0, // idea 1 as the checker scores it
    attackers: t.attackers.length, pinned: t.pinnedAttackers.length, // counts a pseudo-legal rule can read
    valueOk: t.capturedValue >= t.moverValue ? 1 : 0, // idea 3
    valueGap: t.capturedValue - t.moverValue,
    pieces: pieceCount(board), ownMaterial: material(board, 'w'), enemyMaterial: material(board, 'b'),
    legalReplies: after.moves().length,
  };
};

const RULES = {
  'fixed sum, checker-style outputs: 1*[no legal recapture] + 1*[value ok]': f => f.noLegalRecapture + f.valueOk,
  'fixed sum, counts: -1*attackers + 1*pinned + 1*[value ok]': f => -f.attackers + f.pinned + f.valueOk,
  'no chess idea: -10*pieces on board + value gap': f => -10 * f.pieces + f.valueGap,
  'idea 1 only: [no legal recapture]': f => f.noLegalRecapture,
  'idea 3 only: [value ok]': f => f.valueOk,
};

for (const p of PAIRS) {
  const g = features(p.good, p.move), b = features(p.bad, p.move);
  if (g.answer !== 'good' || b.answer !== 'bad') throw Error(`${p.group}: checker says ${g.answer}/${b.answer}`);
  console.log(`\n${p.group}: ${p.move}\n  good ${p.good}\n  bad  ${p.bad}`);
  console.log('  good', JSON.stringify(g));
  console.log('  bad ', JSON.stringify(b));
  for (const [name, rule] of Object.entries(RULES)) console.log(`  ${rule(g) > rule(b) ? 'RIGHT' : rule(g) === rule(b) ? 'tie  ' : 'WRONG'}  ${name}: ${rule(g)} vs ${rule(b)}`);
}

// Feasible weights for score = w1*[no legal recapture] + w3*[value ok]: every pair needs score(good) - score(bad) > 0.
console.log('\nConstraint rows (difference good minus bad) for weights (w1 no-legal-recapture, w3 value-ok):');
for (const p of PAIRS) {
  const g = features(p.good, p.move), b = features(p.bad, p.move);
  console.log(`  ${p.group}: ${g.noLegalRecapture - b.noLegalRecapture}*w1 + ${g.valueOk - b.valueOk}*w3 > 0`);
}

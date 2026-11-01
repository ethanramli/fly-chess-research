// Checks that no en passant reply follows a capture, and that the en passant recapture family certifies as specified.
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../../../.codebase/src/search-and-feedback/capture-retention-certificate.mjs';
import { checkCaptureRetentionCertificate } from '../../../../.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs';

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };
const enPassant = moves => moves.filter(move => move.flags.includes('e')).length;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Part (a): seeded random playouts from the initial position, up to 120 plies each.
const rng = mulberry32(20261031);
const partA = { positionsChecked: 0, capturesChecked: 0, enPassantRepliesAfterCapture: 0, doublePushPositions: 0, enPassantRepliesAfterDoublePush: 0 };
for (let game = 0; game < 200; game++) {
  const board = new Chess();
  let previous = null;
  for (let ply = 0; ply <= 120; ply++) {
    const moves = board.moves({ verbose: true });
    partA.positionsChecked++;
    // Detector: only a non-capture double pawn push can enable an en passant reply.
    if (previous?.flags.includes('b') && !previous.captured) {
      partA.doublePushPositions++;
      partA.enPassantRepliesAfterDoublePush += enPassant(moves);
    }
    for (const capture of moves.filter(move => move.captured)) {
      partA.capturesChecked++;
      board.move(capture);
      partA.enPassantRepliesAfterCapture += enPassant(board.moves({ verbose: true }));
      board.undo();
    }
    if (ply === 120 || moves.length === 0) break;
    previous = moves[Math.floor(rng() * moves.length)];
    board.move(previous);
  }
}

// Detector positive on a fixed position: black d7d5 must allow white e5d6 en passant.
const pushBoard = new Chess('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
const push = pushBoard.moves({ verbose: true }).find(move => move.from + move.to === 'd7d5');
pushBoard.move(push);
partA.fixedDoublePush = { move: 'd7d5', flags: push.flags, enPassantReplies: enPassant(pushBoard.moves({ verbose: true })) };

expect(partA.enPassantRepliesAfterCapture === 0, `en passant reply after a capture: ${partA.enPassantRepliesAfterCapture}`);
expect(push.flags.includes('b') && partA.fixedDoublePush.enPassantReplies > 0, 'detector found no en passant reply after a double push');
expect(partA.enPassantRepliesAfterDoublePush + partA.fixedDoublePush.enPassantReplies > 0, 'detector found no en passant reply after any double push');

// Part (b): en passant capture e5d6 with and without an ordinary recapture; part (c) target is read from the certificate.
const FAMILIES = {
  recapturable: { fen: '4k3/2p5/8/3pP3/8/8/8/4K3 w - d6 0 2', status: 'failure', recaptures: ['c7d6'] },
  unrecapturable: { fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', status: 'success', recaptures: [] },
};
const partB = {};
for (const [name, family] of Object.entries(FAMILIES)) {
  const row = partB[name] = {};
  try {
    const board = new Chess(family.fen), before = board.fen();
    const action = board.moves({ verbose: true }).find(move => move.from + move.to === 'e5d6');
    expect(action.flags.includes('e') && action.captured === 'p', `${name}: e5d6 is not an en passant capture`);
    const proof = certifyCaptureRetention(board, 'e5d6');
    const check = checkCaptureRetentionCertificate(board, 'e5d6', proof);
    Object.assign(row, { flags: action.flags, status: proof.status, recaptures: proof.certificate?.recaptures ?? null,
      target: proof.certificate?.target ?? null, verified: check.verified, fenUnchanged: board.fen() === before });
    expect(row.status === family.status, `${name}: status ${row.status}, expected ${family.status}`);
    expect(JSON.stringify(row.recaptures) === JSON.stringify(family.recaptures), `${name}: recaptures ${JSON.stringify(row.recaptures)}`);
    expect(row.verified === true, `${name}: certificate not verified`);
    expect(row.target === 'd6', `${name}: target ${row.target}, expected d6`);
    expect(row.fenUnchanged, `${name}: board FEN changed`);
  } catch (error) {
    row.error = error.message;
    failures.push(`${name}: ${error.message}`);
  }
}

const result = { partA, partB, failures, pass: failures.length === 0 };
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;

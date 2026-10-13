import { Chess } from 'chess.js';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { random } from '../../src/supervised-baselines/trainer.mjs';
import { labelFen, positionKey, encoding, criteria } from '../../src/supervised-baselines/positions.mjs';

// Expand input coverage without an engine or recorded human games. This is a
// development dataset, not a claim that two simple labels teach strategy.
const out = 'research/data/coverage-pilot-v2', schedule = [0, 4, 8, 12, 20, 32, 48, 64];
if (existsSync(out)) throw Error('Dataset directory exists; refusing to overwrite');
mkdirSync(out, { recursive: true });
const rows = { train: [], validation: [], test: [] }, seen = new Set();
const coverage = Object.fromEntries(Object.keys(rows).map(k => [k, { early: 0, quietParent: 0, captureParent: 0, families: 0 }]));
for (let family = 0; family < 40; family++) {
  const rng = random(82391 + family * 104729), game = new Chess();
  const split = family < 24 ? 'train' : family < 32 ? 'validation' : 'test';
  let recorded = 0;
  for (let ply = 0; ply <= 64 && !game.isGameOver(); ply++) {
    const begin = performance.now(), moves = game.moves({ verbose: true });
    if (schedule.includes(ply)) {
      const parent = game.fen(), captures = moves.filter(m => m.isCapture() || m.isEnPassant());
      const quiet = moves.filter(m => !m.isCapture() && !m.isEnPassant());
      let a, b, kind;
      if (captures.length && quiet.length && ply >= 12) {
        game.move(captures[Math.floor(rng() * captures.length)]); a = game.fen(); game.undo();
        game.move(quiet[Math.floor(rng() * quiet.length)]); b = game.fen(); game.undo();
        kind = 'capture-versus-quiet-siblings';
      } else {
        a = parent;
        game.move(moves[Math.floor(rng() * moves.length)]); b = game.fen(); game.undo();
        kind = 'parent-versus-child';
      }
      const keys = [...new Set([parent, a, b].map(positionKey))];
      if (keys.every(k => !seen.has(k)) && positionKey(a) !== positionKey(b)) {
        if (rng() < 0.5) [a, b] = [b, a];
        rows[split].push({ schema: 'fly-pair-v1', id: `coverage-${family}-${ply}`,
          group: `coverage-game-${family}`, split, fenA: a, fenB: b,
          targetA: labelFen(a), targetB: labelFen(b), parentFen: parent, parentPly: ply, kind });
        keys.forEach(k => seen.add(k)); recorded++;
        if (ply < 12) coverage[split].early++;
        coverage[split][captures.length ? 'captureParent' : 'quietParent']++;
      }
    }
    game.move(moves[Math.floor(rng() * moves.length)]);
    // Approximately half-duty generation, including label calculation.
    await new Promise(resolve => setTimeout(resolve, performance.now() - begin));
  }
  if (recorded) coverage[split].families++;
  if (family % 8 === 7) console.log(JSON.stringify({ familiesComplete: family + 1, pairs: Object.fromEntries(Object.entries(rows).map(([k, list]) => [k, list.length])) }));
}
const files = {};
for (const [split, list] of Object.entries(rows)) {
  if (list.length < 20 || !coverage[split].early || !coverage[split].quietParent || !coverage[split].captureParent) throw Error(`Insufficient coverage in ${split}`);
  const content = list.map(r => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(`${out}/${split}.jsonl`, content, { flag: 'wx' });
  files[split] = { pairs: list.length, positions: 2 * list.length, sha256: createHash('sha256').update(content).digest('hex') };
}
const manifest = { schema: 'fly-coverage-pilot-v2', encoding, criteria, files, coverage,
  source: 'Seeded random legal games generated with chess.js 1.4.0; no pretrained weights, human games or engine',
  schedule, seedFormula: '82391 + family * 104729',
  familySplit: 'Whole games 0-23 train, 24-31 validation, 32-39 test; parent and child position keys deduplicated across all splits',
  targetDefinitions: { white_material_balance_div16: 'White minus black material with P=1 N=B=3 R=5 Q=9 K=0, divided by 16',
    side_to_move_best_capture_after_recapture_white_signed_div9: 'Best nonnegative immediate capture material gain after worst legal immediate recapture onto the destination square, signed to white perspective and divided by 9' },
  limitations: ['Random-play distribution, not representative skilled chess', 'Two rule-generated criteria only',
    'No mate search or full tactical evaluation', 'Within-pair positions are related and must not be treated as independent observations',
    'The starting position occurs only in training after global deduplication', 'New split results are not directly comparable with pilot-v1 losses'],
  generatedAt: new Date().toISOString() };
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(manifest, null, 2));

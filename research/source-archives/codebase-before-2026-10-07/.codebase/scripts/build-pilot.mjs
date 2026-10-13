import { Chess } from 'chess.js';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { random } from '../src/lowram/trainer.mjs';
import { labelFen, positionKey, encoding, criteria } from '../src/lowram/positions.mjs';

const out = 'research/data/pilot-v1';
if (existsSync(`${out}/manifest.json`)) throw Error('Frozen pilot already exists. Use a new dataset version to regenerate.');
mkdirSync(out, { recursive: true });
const rows = { train: [], validation: [], test: [] }, seen = new Set();
for (let family = 0; family < 40; family++) {
  const rng = random(41731 + family * 7919), game = new Chess();
  const split = family < 24 ? 'train' : family < 32 ? 'validation' : 'test';
  let recorded = 0;
  for (let ply = 0; ply < 100 && !game.isGameOver() && recorded < 3; ply++) {
    const moves = game.moves({ verbose: true });
    if (ply >= 24 && ply % 3 === 0) {
      const captures = moves.filter(m => m.isCapture() || m.isEnPassant());
      const quiet = moves.filter(m => !m.isCapture() && !m.isEnPassant());
      if (captures.length && quiet.length) {
        const chosen = [captures[Math.floor(rng() * captures.length)], quiet[Math.floor(rng() * quiet.length)]];
        const parent = game.fen(), children = [];
        for (const move of chosen) { game.move(move); children.push(game.fen()); game.undo(); }
        const keys = [parent, ...children].map(positionKey);
        if (keys.every(k => !seen.has(k))) {
          const [a, b] = rng() < 0.5 ? children : children.reverse();
          const row = { schema: 'fly-pair-v1', id: `game-${family}-pair-${recorded}`, group: `game-${family}`, split,
            fenA: a, fenB: b, targetA: labelFen(a), targetB: labelFen(b), parentFen: parent };
          rows[split].push(row); keys.forEach(k => seen.add(k)); recorded++;
        }
      }
    }
    game.move(moves[Math.floor(rng() * moves.length)]);
  }
}
const files = {};
for (const [split, list] of Object.entries(rows)) {
  if (list.length < 10) throw Error(`Too few ${split} examples`);
  const content = list.map(r => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(`${out}/${split}.jsonl`, content, { flag: 'wx' });
  files[split] = { pairs: list.length, positions: 2 * list.length, sha256: createHash('sha256').update(content).digest('hex') };
}
const manifest = { schema: 'fly-pilot-manifest-v1', encoding, criteria, files,
  source: 'Locally generated seeded random legal games using chess.js 1.4.0; no human games, pretrained weights or engine.',
  familySplit: '40 whole-game families: 0-23 training, 24-31 validation, 32-39 final test; duplicate parent/child position keys rejected across all splits.',
  purpose: 'Small engineering/development pilot for position assessment and changed-position supervision. Not representative strategic chess evaluation.',
  generatorSeedFormula: '41731 + family * 7919', generatedAt: new Date().toISOString(),
  limitations: ['Random-play distribution', 'Two simple rule-generated labels', 'Only recaptures onto the destination square considered', 'No final test evaluation authorized by the pilot script', 'One source game per group is necessary but does not rule out shared motifs'] };
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(manifest, null, 2));

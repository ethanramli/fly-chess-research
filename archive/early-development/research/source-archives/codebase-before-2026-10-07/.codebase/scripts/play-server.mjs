import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph } from '../src/lowram/graph.mjs';
import { createUntrainedFly, chooseFlyMove } from '../src/lowram/fly-policy.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';

const graphPath = fileURLToPath(new URL('../../.cache/full.npz', import.meta.url));
const publicRoot = fileURLToPath(new URL('../src/browser/', import.meta.url));
function guard() {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Memory guard stopped this move. Free memory and retry.');
}
guard();
if (await sha256(graphPath) !== graphHash) throw Error('Cached connectome checksum mismatch');
const fly = createUntrainedFly(loadGraph(graphPath), 47);
const games = new Map();
let thinking = false;
const port = Number(process.env.PORT ?? 4173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.txt': 'text/plain' };
function reply(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}
function snapshot(session) {
  const game = session.game;
  const reason = game.isCheckmate() ? `Checkmate. ${game.turn() === 'w' ? 'Black' : 'White'} wins.`
    : game.isStalemate() ? 'Draw by stalemate.'
    : game.isThreefoldRepetition() ? 'Draw by repetition.'
    : game.isInsufficientMaterial() ? 'Draw by insufficient material.'
    : game.isDraw() ? 'Draw by the fifty-move rule.' : null;
  return { id: session.id, humanColor: session.humanColor, fen: game.fen(), turn: game.turn(),
    history: game.history({ verbose: true }).map(m => ({ san: m.san, from: m.from, to: m.to, after: m.after })),
    legal: game.isGameOver() ? [] : game.moves({ verbose: true }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion })),
    gameOver: game.isGameOver(), reason, check: game.isCheck(), pgn: game.pgn(),
    flyScore: session.flyScore, peakResidentMiB: process.resourceUsage().maxRSS / 1024 };
}
const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET') {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const path = resolve(publicRoot, pathname === '/' ? 'play.html' : `.${pathname}`);
      if (!path.startsWith(publicRoot.endsWith(sep) ? publicRoot : publicRoot + sep) || !types[extname(path)]) return reply(res, 404, { error: 'Not found' });
      try {
        const content = await readFile(path);
        res.writeHead(200, { 'content-type': types[extname(path)], 'cache-control': 'no-store' });
        return res.end(content);
      } catch { return reply(res, 404, { error: 'Not found' }); }
    }
    if (req.method !== 'POST' || req.headers['content-type'] !== 'application/json') return reply(res, 400, { error: 'JSON POST required' });
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (raw.length > 16384) throw Error('Request too large'); }
    const data = JSON.parse(raw);
    if (req.url === '/api/new') {
      if (!['w', 'b'].includes(data.humanColor)) throw Error('Choose White or Black');
      if (thinking) return reply(res, 409, { error: 'Wait for the current fly move' });
      if (games.size >= 8) games.delete(games.keys().next().value);
      const session = { id: randomUUID(), humanColor: data.humanColor, game: new Chess() };
      session.game.header('White', data.humanColor === 'w' ? 'You' : 'Untrained fly', 'Black', data.humanColor === 'b' ? 'You' : 'Untrained fly');
      games.set(session.id, session);
      return reply(res, 200, snapshot(session));
    }
    const session = games.get(data.id);
    if (!session) return reply(res, 404, { error: 'Game expired. Start a new game.' });
    if (thinking) return reply(res, 409, { error: 'The fly is still thinking' });
    const game = session.game;
    if (game.isGameOver()) return reply(res, 409, { error: 'The game is over' });
    if (req.url === '/api/human-move') {
      if (game.turn() !== session.humanColor) throw Error('It is the fly\'s turn');
      game.move({ from: data.from, to: data.to, promotion: data.promotion ?? 'q' });
      return reply(res, 200, snapshot(session));
    }
    if (req.url === '/api/fly-move') {
      if (game.turn() === session.humanColor) throw Error('It is your turn');
      thinking = true;
      try {
        const chosen = await chooseFlyMove(fly, game, async ms => {
          guard();
          await new Promise(resolve => setTimeout(resolve, Math.max(1, ms)));
        });
        game.move({ from: chosen.from, to: chosen.to, promotion: chosen.promotion });
        session.flyScore = chosen.score;
        return reply(res, 200, snapshot(session));
      } finally { thinking = false; }
    }
    return reply(res, 404, { error: 'Not found' });
  } catch (error) { reply(res, 400, { error: error.message }); }
});
server.listen(port, '127.0.0.1', () => console.log(`FlyChess ready: http://127.0.0.1:${port} (untrained, seed 47, full graph)`));

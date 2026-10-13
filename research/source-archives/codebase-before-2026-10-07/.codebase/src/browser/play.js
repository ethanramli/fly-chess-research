// Board/coordinate display adapted from vietan0/chess-game-review (MIT).
// See UPSTREAM-LICENSE.txt and REUSE.md for source revision and modifications.
const $ = id => document.getElementById(id);
const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
let game, busy = false, flipped = false, selected = null, view = 0;
let theme = 'green', pieces = 'classic';
try { ({ theme = 'green', pieces = 'classic' } = JSON.parse(localStorage.getItem('fly-appearance') || '{}')); } catch {}
if (!['green','brown','ice'].includes(theme)) theme = 'green';
if (!['classic','neo','ocean'].includes(pieces)) pieces = 'classic';
$('theme').value = theme; $('pieces').value = pieces;

// Port of upstream utils/translatePiece.ts, retaining its percentage coordinates.
function translatePiece(square, isFlipped) {
  let x = (square.charCodeAt(0) - 97) * 100, y = (8 - Number(square[1])) * 100;
  if (isFlipped) { x = 700 - x; y = 700 - y; }
  return [x, y];
}
function position(fen) {
  const result = {};
  fen.split(' ')[0].split('/').forEach((row, r) => {
    let c = 0;
    for (const p of row) { if (/\d/.test(p)) c += Number(p); else result[`${'abcdefgh'[c++]}${8-r}`] = p; }
  });
  return result;
}
function draw() {
  const history = game?.history ?? [], live = view === history.length;
  const fen = view ? history[view-1].after : startFen, board = position(fen);
  const last = history[view-1];
  const targets = new Set((game?.legal ?? []).filter(m => m.from === selected).map(m => m.to));
  $('board').style.backgroundImage = `url('/assets/boards/${theme}.png')`;
  $('board').replaceChildren();
  for (let rank = 8; rank >= 1; rank--) for (const file of 'abcdefgh') {
    const square = file + rank, p = board[square], [x,y] = translatePiece(square, flipped);
    const cell = document.createElement('button');
    cell.className = `square${selected === square ? ' selected' : ''}${targets.has(square) ? ' legal' : ''}${last && [last.from,last.to].includes(square) ? ' last-move' : ''}`;
    cell.style.transform = `translate(${x}%,${y}%)`;
    cell.dataset.square = square;
    cell.setAttribute('aria-label', `${square}${p ? ` ${p === p.toUpperCase() ? 'White' : 'Black'} ${names[p.toLowerCase()]}` : ''}`);
    cell.disabled = busy || !game || game.gameOver || !live || game.turn !== game.humanColor;
    if (p) {
      const img = document.createElement('img'); img.alt = ''; img.draggable = false;
      img.src = `/assets/pieces/${pieces}/${p === p.toUpperCase() ? 'w' : 'b'}${p.toLowerCase()}.png`; cell.append(img);
    }
    // Port of Coors.tsx: rank on first column, file on bottom row.
    if (x === 0) { const label = document.createElement('span'); label.className = 'coord rank'; label.textContent = rank; cell.append(label); }
    if (y === 700) { const label = document.createElement('span'); label.className = 'coord file'; label.textContent = file; cell.append(label); }
    cell.onclick = () => clickSquare(square, p); $('board').append(cell);
  }
  const player = color => `${game?.humanColor === color ? 'You' : 'Untrained fly'} <span>${color === 'w' ? 'White' : 'Black'}</span>`;
  $('top-player').innerHTML = player(flipped ? 'w' : 'b'); $('bottom-player').innerHTML = player(flipped ? 'b' : 'w');
  $('moves').replaceChildren();
  history.forEach((move, i) => {
    if (i % 2 === 0) { const num = document.createElement('span'); num.textContent = `${i/2+1}.`; $('moves').append(num); }
    const b = document.createElement('button'); b.textContent = move.san; b.className = view === i+1 ? 'current' : '';
    b.disabled = busy; b.onclick = () => navigate(i+1); $('moves').append(b);
  });
  $('first').disabled = $('prev').disabled = busy || view === 0;
  $('next').disabled = $('last').disabled = busy || live;
  $('new').disabled = $('side').disabled = busy;
  $('export').disabled = !history.length;
}
function navigate(n) { selected = null; view = Math.max(0, Math.min(n, game?.history.length ?? 0)); draw(); status(); }
function status() {
  if (!game) return;
  $('status').textContent = view !== game.history.length ? 'Viewing an earlier position. Press →| to return to play.'
    : game.reason ?? (game.turn === game.humanColor ? `Your turn.${game.check ? ' You are in check.' : ''}` : 'The fly is thinking…');
}
async function post(path, data) {
  const res = await fetch(path, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
  const value = await res.json(); if (!res.ok) throw Error(value.error); return value;
}
function accept(value) { game = value; view = game.history.length; selected = null; draw(); $('moves').scrollTop = $('moves').scrollHeight; }
async function flyTurn() {
  if (game.gameOver || game.turn === game.humanColor) return;
  $('status').textContent = 'The fly is thinking…';
  accept(await post('/api/fly-move', {id:game.id}));
}
function fail(error) {
  $('status').textContent = error.message;
  $('retry').hidden = !game || game.gameOver || game.turn === game.humanColor;
}
async function clickSquare(square, p) {
  const own = p && (p === p.toUpperCase() ? 'w' : 'b') === game.humanColor;
  if (own) { selected = selected === square ? null : square; draw(); return; }
  const moves = game.legal.filter(m => m.from === selected && m.to === square);
  if (!moves.length) return;
  const from = selected; let promotion;
  busy = true; draw();
  try {
    if (moves.some(m => m.promotion)) {
      promotion = await new Promise(resolve => {
        const dialog = $('promotion'); dialog.returnValue = 'cancel';
        dialog.addEventListener('close', () => resolve(dialog.returnValue), {once:true}); dialog.showModal();
      });
      if (!['q','r','b','n'].includes(promotion)) return;
    }
    accept(await post('/api/human-move', {id:game.id, from, to:square, promotion}));
    await flyTurn(); status();
  } catch(error) { fail(error); }
  finally { busy = false; draw(); }
}
async function newGame() {
  busy = true; $('retry').hidden = true; selected = null; draw();
  try {
    accept(await post('/api/new', {humanColor:$('side').value})); flipped = game.humanColor === 'b'; draw();
    await flyTurn(); status();
  } catch(error) { fail(error); }
  finally { busy = false; draw(); }
}
$('new').onclick = newGame;
$('retry').onclick = async () => { busy=true; $('retry').hidden=true; draw(); try {await flyTurn(); status();} catch(e){fail(e);} finally {busy=false;draw();} };
$('first').onclick = () => navigate(0); $('prev').onclick = () => navigate(view-1);
$('next').onclick = () => navigate(view+1); $('last').onclick = () => navigate(game.history.length);
$('flip').onclick = () => {flipped=!flipped;draw();};
for (const id of ['theme','pieces']) $(id).onchange = () => {
  theme=$('theme').value; pieces=$('pieces').value;
  try {localStorage.setItem('fly-appearance',JSON.stringify({theme,pieces}));} catch {}
  draw();
};
document.addEventListener('keydown', e => {
  if (busy || $('promotion').open || ['SELECT','INPUT','TEXTAREA','BUTTON'].includes(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') navigate(view-1); if (e.key === 'ArrowRight') navigate(view+1);
});
$('export').onclick = () => {
  const url=URL.createObjectURL(new Blob([game.pgn],{type:'application/x-chess-pgn'}));
  const a=document.createElement('a'); a.href=url;a.download='flychess.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
newGame();

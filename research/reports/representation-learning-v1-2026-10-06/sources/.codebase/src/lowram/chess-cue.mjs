// Fixed experimental chess-to-KC interface. No proof, score, dataset ID or
// trainable translator is accepted. Stimulation is not natural sensory coding.
import { createHash } from 'node:crypto';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function bucket(seed, token, size) {
  return createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
}
const positionKey = fen => fen.split(' ').slice(0,4).join(' ');
const moveKey = m => m.from + m.to + (m.promotion ?? '');

export function createChessCueEncoder(mapping, {
  seed = 9613, maxCells = 64, totalCurrent = 24, maxCellCurrent = 1.5, maxHistoryPlies = 512,
} = {}) {
  if (!mapping?.readyForCandidateExperiment || !Array.isArray(mapping.groups) ||
    !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isSafeInteger(maxCells) || maxCells < 1 || maxCells > 128 ||
    !Number.isSafeInteger(maxHistoryPlies) || maxHistoryPlies < 1 || maxHistoryPlies > 512 ||
    !Number.isFinite(totalCurrent) || totalCurrent <= 0 || totalCurrent > 192 || !Number.isFinite(maxCellCurrent) || maxCellCurrent <= 0 || maxCellCurrent > 1.5) throw Error('Invalid bounded cue configuration');
  const pool = [...new Set(mapping.groups.flatMap(g => g.kc))].sort((a,b)=>a-b);
  if (!pool.length || pool.some(i=>!Number.isSafeInteger(i)||i<0)) throw Error('Invalid mapped KC pool');
  const config = Object.freeze({ seed, maxCells, totalCurrent, maxCellCurrent, maxHistoryPlies });
  const identity = digest({ schema:'chess-cue-v1', mapping, config, pool });
  function encode(board, candidate, task = { objective:'forced-mate', plies:1 }) {
    if (!task || Object.keys(task).some(k=>!['objective','plies'].includes(k)) || task.objective !== 'forced-mate' ||
      ![1,3,5,7].includes(task.plies)) throw Error('Only declared bounded task context is accepted; no teacher labels');
    const before = board.fen(), pgn = board.pgn();
    if (pgn.length > 65536) throw Error('Task history exceeds bounded cue interface');
    const history = board.history({verbose:true});
    if (history.length > maxHistoryPlies) throw Error('Task history exceeds bounded cue interface');
    if (board.isGameOver()) throw Error('Cannot encode an action in a finished task');
    const legal = board.moves({verbose:true});
    const key = typeof candidate === 'string' ? candidate : candidate && moveKey(candidate);
    const move = legal.find(m=>moveKey(m)===key);
    if (!move) throw Error('Cue requires a legal action');
    const [,,castling,ep,halfmove] = before.split(' ');
    const currentKey=positionKey(before), initial=history[0]?.before ?? before;
    const repetitions=(positionKey(initial)===currentKey?1:0)+history.filter(m=>positionKey(m.after)===currentKey).length;
    const tokens = [`turn:${board.turn()}`, `castling:${castling}`, `ep:${ep}`, `halfmove:${halfmove}`,
      `repetition:${repetitions}`, `task:${task.objective}:${task.plies}`,
      `action:${key}`, `origin:${move.from}`, `destination:${move.to}`,
      `moving:${move.color}:${move.piece}`, `promotion:${move.promotion??'-'}`];
    for (const row of board.board()) for (const p of row) if (p) {
      const token=`piece:${p.color}:${p.type}:${p.square}`;
      tokens.push(token,`${token}|action:${key}`);
    }
    tokens.sort();
    if (tokens.length>128 || new Set(tokens).size!==tokens.length) throw Error('Invalid bounded feature inventory');
    const assignments=tokens.map(token=>({token,index:pool[bucket(seed,token,pool.length)]}));
    const unique=[...new Set(assignments.map(a=>a.index))];
    // Stable, label-free budget selection. Preserve collision/drop accounting.
    unique.sort((a,b)=>bucket(seed,`budget:${a}`,0x100000000)-bucket(seed,`budget:${b}`,0x100000000)||a-b);
    const selected=unique.slice(0,maxCells).sort((a,b)=>a-b), current=Math.min(maxCellCurrent,totalCurrent/selected.length);
    const selectedSet=new Set(selected), stimulation=selected.map(index=>({index,current}));
    if (board.fen()!==before || board.pgn()!==pgn) throw Error('Cue encoder changed real task history');
    return {schema:'chess-cue-v1',identity,move:key,actor:board.turn(),fen:before,historyPlies:history.length,repetitions,
      tokens,assignments,stimulation,
      accounting:{featureCount:tokens.length,uniqueProjectedCells:unique.length,collisions:tokens.length-unique.length,
        stimulatedCells:selected.length,droppedCells:unique.length-selected.length,
        droppedFeatures:assignments.filter(a=>!selectedSet.has(a.index)).length,totalCurrent:current*selected.length,
        currentPerCell:current,poolCells:pool.length},
      interface:'Engineered sparse feature-hash stimulation of identified eligible KCs; no natural sensory/reward claim'};
  }
  return Object.freeze({schema:'chess-cue-v1',identity,config,pool:Object.freeze(pool),encode});
}

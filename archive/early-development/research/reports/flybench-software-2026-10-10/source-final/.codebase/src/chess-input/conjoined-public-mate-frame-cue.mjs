import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { createPublicMateFrameEncoder } from './public-lesson-frame-cue.mjs';

// Engineering input factor: public action-context binding in the existing pool.
// No consequence labels, compartment targeting or fitted translator.
export function createConjoinedPublicMateFrameEncoder(mapping, config = {}) {
  const base = createPublicMateFrameEncoder(mapping, config);
  const pool = [...new Set(mapping.groups.flatMap(g => g.kc))].sort((a,b)=>a-b);
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const bucket = token => createHash('sha256').update(`${base.config.seed}\0${token}`).digest().readUInt32LE(0);
  const identity = hash({schema:'conjoined-public-mate-frame-cue-v1',base:base.identity});
  function encode(frame) {
    const checked = base.encode(frame); // Shared legality/history/label validation.
    const board = new Chess(); board.loadPgn(frame.pgn);
    const last = board.history({verbose:true}).at(-1);
    const action = frame.action ?? (last ? last.from+last.to+(last.promotion??'') : 'none');
    const tokens = checked.tokens.map(token=>`joint:${JSON.stringify([action,token])}`).sort();
    const assignments = tokens.map(token=>({token,index:pool[bucket(token)%pool.length]}));
    const unique = [...new Set(assignments.map(x=>x.index))];
    unique.sort((a,b)=>bucket(`budget:${a}`)-bucket(`budget:${b}`)||a-b);
    const selected = unique.slice(0,base.config.maxCells).sort((a,b)=>a-b), chosen=new Set(selected);
    const current=Math.min(base.config.maxCellCurrent,base.config.totalCurrent/selected.length);
    return {...checked,schema:'conjoined-public-mate-frame-cue-v1',identity,tokens,assignments,
      stimulation:selected.map(index=>({index,current})),
      accounting:{collisions:tokens.length-unique.length,droppedCells:unique.length-selected.length,
        droppedFeatures:assignments.filter(x=>!chosen.has(x.index)).length,poolCells:pool.length},
      scope:'Public action-context conjunction; endpoint binds public last move; no natural sensing or transfer claim'};
  }
  return Object.freeze({identity,config:base.config,encode});
}

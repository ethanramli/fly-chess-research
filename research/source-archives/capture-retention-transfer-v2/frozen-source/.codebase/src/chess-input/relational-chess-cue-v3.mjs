// Experimental public geometry -> existing KC stimulation. No chess evaluation,
// future-board query, teacher label or learned translator. Not natural sensing.
import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const bucket=(seed,token,n)=>createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0)%n;
const xy=s=>[s.charCodeAt(0)-97,Number(s[1])-1];
const key=m=>m.from+m.to+(m.promotion??'');
const position=fen=>fen.split(' ').slice(0,4).join(' ');

export function createRelationalChessCueEncoder(mapping,{seed=14009,maxCells=64,totalCurrent=24,maxCellCurrent=1.5,maxHistoryPlies=512}={}){
  if(!mapping?.readyForCandidateExperiment||!Array.isArray(mapping.groups)||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||!Number.isSafeInteger(maxCells)||maxCells<1||maxCells>128||!Number.isSafeInteger(maxHistoryPlies)||maxHistoryPlies<1||maxHistoryPlies>512||!Number.isFinite(totalCurrent)||totalCurrent<=0||totalCurrent>192||!Number.isFinite(maxCellCurrent)||maxCellCurrent<=0||maxCellCurrent>1.5)throw Error('Invalid relational configuration');
  const pool=[...new Set(mapping.groups.flatMap(g=>g.kc))].sort((a,b)=>a-b);
  if(!pool.length||pool.some(i=>!Number.isSafeInteger(i)||i<0))throw Error('Invalid mapped KC pool');
  const config=Object.freeze({seed,maxCells,totalCurrent,maxCellCurrent,maxHistoryPlies}),identity=hash({schema:'relational-chess-cue-v3',mapping,config,pool});
  function encode(board,candidate,task={objective:'forced-mate',plies:1}){
    const allowed=task&&Object.keys(task).every(k=>['objective','plies'].includes(k))
      &&((task.objective==='forced-mate'&&[1,3,5,7].includes(task.plies))
        ||(task.objective==='capture-retention'&&task.plies===1));
    if(!allowed)throw Error('Only declared public task context; no teacher labels');
    const fen=board.fen(),pgn=board.pgn(),history=board.history({verbose:true});
    if(pgn.length>65536||history.length>maxHistoryPlies)throw Error('Task history exceeds relational interface');
    if(board.isGameOver())throw Error('Finished task');
    const move=board.moves({verbose:true}).find(m=>key(m)===(typeof candidate==='string'?candidate:candidate&&key(candidate)));
    if(!move)throw Error('Cue requires a legal action');
    const actor=board.turn(),direction=actor==='w'?1:-1,[fx,fy]=xy(move.from),[tx,ty]=xy(move.to),[,,rights,ep,halfmove]=fen.split(' ');
    const initial=history[0]?.before??fen,current=position(fen),repetitions=(position(initial)===current?1:0)+history.filter(m=>position(m.after)===current).length;
    const relativeRights=actor==='w'?rights:rights.replace(/[KQkq]/g,c=>c===c.toUpperCase()?c.toLowerCase():c.toUpperCase());
    const actorRights=rights==='-'?'-':'KQkq'.split('').filter(c=>relativeRights.includes(c)).join('');
    function inventory(mirror){
      const x=dx=>mirror*dx,y=dy=>direction*dy,vector=`${x(tx-fx)},${y(ty-fy)}`,action=`${move.piece}:${vector}:${move.promotion??'-'}`;
      const tokens=[`action:${action}`,`capture:${move.captured??'-'}`,`castle:${actorRights}`,`halfmove:${halfmove}`,`repetition:${repetitions}`,`task:${task.objective}:${task.plies}`];
      // Edge distance is retained: a translated mating net may fail away from a wall.
      const orientedX=s=>mirror===1?s:7-s,orientedY=s=>direction===1?s:7-s;
      for(const [label,sx,sy]of [['origin',fx,fy],['target',tx,ty]])tokens.push(`${label}-walls:${orientedX(sx)},${7-orientedX(sx)},${orientedY(sy)},${7-orientedY(sy)}`);
      if(ep==='-')tokens.push('ep:-');else{const[ex,ey]=xy(ep);tokens.push(`ep-from-target:${x(ex-tx)},${y(ey-ty)}`);}
      for(const row of board.board())for(const p of row)if(p){const[px,py]=xy(p.square),role=p.color===actor?'self':'opponent';
        tokens.push(`around-target:${move.piece}:${role}:${p.type}:${x(px-tx)},${y(py-ty)}`);
        tokens.push(`around-origin:${action}:${role}:${p.type}:${x(px-fx)},${y(py-fy)}`);
      }
      return tokens.sort();
    }
    // File reflection is not a legal castling symmetry. Disable its quotient
    // whenever either side retains rights; actor/rank normalization still holds.
    const forward=inventory(1),reflected=rights==='-'?inventory(-1):null;
    const tokens=reflected&&JSON.stringify(reflected)<JSON.stringify(forward)?reflected:forward;
    if(tokens.length>128||new Set(tokens).size!==tokens.length)throw Error('Invalid relational feature inventory');
    const assignments=tokens.map(token=>({token,index:pool[bucket(seed,token,pool.length)]})),unique=[...new Set(assignments.map(v=>v.index))];
    unique.sort((a,b)=>bucket(seed,`budget:${a}`,0x100000000)-bucket(seed,`budget:${b}`,0x100000000)||a-b);
    const selected=unique.slice(0,maxCells).sort((a,b)=>a-b),selectedSet=new Set(selected),currentAmplitude=Math.min(maxCellCurrent,totalCurrent/selected.length);
    if(board.fen()!==fen||board.pgn()!==pgn)throw Error('Encoder changed task');
    return {schema:'relational-chess-cue-v3',identity,move:key(move),actor,fen,historyPlies:history.length,repetitions,tokens,assignments,
      stimulation:selected.map(index=>({index,current:currentAmplitude})),
      accounting:{featureCount:tokens.length,uniqueProjectedCells:unique.length,collisions:tokens.length-unique.length,stimulatedCells:selected.length,droppedCells:unique.length-selected.length,droppedFeatures:assignments.filter(v=>!selectedSet.has(v.index)).length,totalCurrent:currentAmplitude*selected.length,currentPerCell:currentAmplitude,poolCells:pool.length},
      interface:'Engineered candidate-relative geometry with actor normalization and conditional file reflection; not learned transfer or natural sensing'};
  }
  return Object.freeze({schema:'relational-chess-cue-v3',identity,config,pool:Object.freeze(pool),encode});
}

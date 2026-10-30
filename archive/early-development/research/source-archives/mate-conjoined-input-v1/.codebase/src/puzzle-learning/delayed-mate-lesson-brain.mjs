import { DelayedLessonBrain } from './delayed-lesson-brain.mjs';
import { copyBoard, uci } from '../search-and-feedback/puzzle-search.mjs';
import { verifiedExperience } from '../search-and-feedback/verified-feedback.mjs';

export function verifiedMateLessonFrames(board, move, task, proof) {
  if(task?.objective!=='forced-mate'||![1,3,5,7].includes(task.plies))throw Error('Require bounded mate task');
  const checked=verifiedExperience(board,move,task,proof);
  if(!checked.learningAllowed)return{status:'unknown',frames:[],evidence:null};
  const hypothetical=copyBoard(board),original=board.pgn(),frames=[],continuation=[];
  const frame=action=>({schema:'public-lesson-frame-v1',fen:hypothetical.fen(),pgn:hypothetical.pgn(),task:structuredClone(task),action});
  const apply=action=>{
    const legal=hypothetical.moves({verbose:true}).find(m=>uci(m)===action);
    if(!legal)throw Error('Illegal certified continuation');
    frames.push(frame(action));continuation.push(action);hypothetical.move(legal);
  };
  apply(move);let node=proof.certificate.tree;
  while(node.children.length){
    if(continuation.length>=task.plies)throw Error('Certificate continuation exceeds horizon');
    const branch=[...node.children].sort((a,b)=>a.move.localeCompare(b.move))[0];
    apply(branch.move);node=branch.node;
  }
  frames.push(frame(null));
  if(board.pgn()!==original)throw Error('Real task history changed');
  return{status:checked.status,frames,evidence:{...checked,context:{fen:board.fen(),pgn:original,task:structuredClone(task)},move,continuation,
    scope:'One replayed illustrative proof branch; complete bounded defense/attacker coverage is independently verified in the certificate. Horizon failure is not full-game loss.'}};
}

export class DelayedMateLessonBrain extends DelayedLessonBrain {
  constructor(options){super({...options,lessonFrameBudget:10});}
  buildLesson(board,move,task,proof){return verifiedMateLessonFrames(board,move,task,proof);}
}

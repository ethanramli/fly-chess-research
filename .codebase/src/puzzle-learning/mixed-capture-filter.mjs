// Candidate selection on a FEN, not a history-aware teaching certificate.
export function hasMatchedCaptureOutcomes(board){
  const captures=board.moves({verbose:true}).filter(m=>m.captured);
  if(captures.length<2||captures.some(m=>m.promotion))return false;
  const retained=[],recaptured=[];
  for(const move of captures){
    board.move(move);
    try{
      const defended=board.moves({verbose:true}).some(reply=>reply.to===move.to&&reply.captured);
      (defended?recaptured:retained).push(move);
    }finally{board.undo();}
  }
  return retained.length===1&&recaptured.some(m=>m.from===retained[0].from&&m.captured===retained[0].captured);
}

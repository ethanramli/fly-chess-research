import { DualValencePuzzleBrain } from './dual-valence-puzzle-brain.mjs';
import { NeuralEpisode } from '../neural-learning/neural-episode.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';
import { verifiedLessonFrames } from './verified-lesson-frames.mjs';
import { feedbackChannel } from './feedback-quality.mjs';

// Separate engineering condition: certified sequence plus local delayed credit.
// Publication, frozen shuffle schedule and independent audit belong to runner.
export class DelayedLessonBrain extends DualValencePuzzleBrain {
  constructor({ frameEncoder, episodeIdentity, ...options }) {
    const encoder = { identity: frameEncoder.identity, encode: (board,action,task) => frameEncoder.encode({
      schema:'public-lesson-frame-v1',fen:board.fen(),pgn:board.pgn(),task,action }) };
    super({ ...options, encoder });
    if (typeof this.memory.tagAction !== 'function' || typeof this.memory.advance !== 'function')
      throw Error('Require declared delayed memory');
    this.frameEncoder = frameEncoder;
    this.episode = new NeuralEpisode(this.model,{ identity:episodeIdentity,maxFrames:4 });
  }
  async replay() { throw Error('Delayed receiver requires teach with bound board/task/proof; legacy replay is unsupported'); }
  async teach(board, move, task, proof, { condition='informative', shuffledChannel=null } = {}) {
    if (this.memory.active || this.episode.active) throw Error('Cannot overwrite pending lesson');
    const lesson = verifiedLessonFrames(board,move,task,proof);
    if (lesson.status==='unknown') return { skipped:true,learningApplied:false,reason:'Unverified consequence' };
    const channel = feedbackChannel(condition,lesson.status,shuffledChannel);
    const legal = board.moves({verbose:true});
    if (legal.length>this.maxLegalMoves || this.presentations+legal.length+lesson.frames.length+1>this.maxPresentations)
      throw Error('Complete lesson exceeds presentation bound');
    const cues = lesson.frames.map(f=>this.frameEncoder.encode(f));
    const endpoint = cues.at(-1), presentation = this.reinforcement.present(endpoint.stimulation,channel);
    // Complete unaided legal ranking precedes all continuation and consequence exposure.
    const before=this.memory.snapshot(), assessment=await this.assess(board,legal,task);
    const best=Math.max(...assessment.rows.map(r=>r.score)), tied=assessment.rows.filter(r=>r.score===best);
    assessment.choice=tied.length===1?tied[0].move:null;
    const prediction={ schema:'ordinal-consequence-prediction-v1',fen:board.fen(),pgn:board.pgn(),task,
      memoryHash:this.memoryFingerprint(),source:'fixed-MBON-balance',threshold:0,
      rows:assessment.rows.map(r=>({move:r.move,score:r.score,predictedStatus:r.score>0?'success':r.score<0?'failure':'unknown'})),
      scope:'Uncalibrated engineering ordinal hypothesis, not probability or position value' };
    const frames=[];
    this.episode.begin();
    try {
      for(let i=0;i<lesson.frames.length;i++) {
        if(i>0)this.memory.advance(1);
        const response=await this.evoke(cues[i].stimulation,this.episode,digest(lesson.frames[i]));
        if(i===0)this.memory.tagAction(this.rest);
        frames.push({frame:lesson.frames[i],cue:cues[i],response});
      }
      this.memory.advance(1);
      const response=await this.evoke(presentation.stimulation,this.episode,digest(lesson.frames.at(-1)));
      const eligibility=[...this.memory.eligibility];
      const update=condition==='disabled'?{events:this.memory.events,changedEdges:0,recoveredEdges:0,rates:[]}
        :this.memory.observe(this.rest);
      this.memory.endEpisode();
      return {skipped:false,assessment,prediction,evidence:lesson.evidence,frames,presentation,response,eligibility,update,
        before,after:this.memory.snapshot(),learningApplied:update.changedEdges>0,
        scope:'Certified sequence and delayed local computational update; no useful choice, retention or transfer claim'};
    } finally {
      // Ordinary exceptions clear transient state; a runner must persist mid-frame
      // receipts before acknowledging any update. This adapter alone is not recovery.
      this.memory.endEpisode();this.episode.end();
    }
  }
}

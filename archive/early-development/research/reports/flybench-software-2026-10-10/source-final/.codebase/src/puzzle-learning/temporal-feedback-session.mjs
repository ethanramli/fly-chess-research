// Frame transaction and resumable local state; disk publication is the runner's job.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {NeuralEpisode} from '../neural-learning/neural-episode.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {temporalFeedbackPlan} from './temporal-feedback-plan.mjs';
import {bindFeedbackToAssessment} from './feedback-quality.mjs';

export class TemporalFeedbackSession {
  constructor({model,memory,mapping,encoder,timing,identity}){
    assert(/^[a-f0-9]{64}$/.test(identity),'Require pinned session identity');
    assert(memory.model===model&&memory.mapping===mapping,'Mismatched memory/model');
    assert(typeof memory.observeTrajectory==='function','Require full-frame rate receiver');
    Object.assign(this,{model,memory,mapping,encoder,timing:structuredClone(timing),identity});
    this.episode=new NeuralEpisode(model,{identity,maxFrames:32});this.pending=null;
  }
  verify(experience,options){return temporalFeedbackPlan(experience,this.encoder,this.mapping,this.timing,options);}
  start(experience,assessment,options={}){
    assert(this.pending===null&&!this.episode.active,'Pending lesson must finish first');
    const plan=this.verify(experience,options);if(plan.skipped)return plan;
    const board=new Chess();board.loadPgn(experience.context.pgn);
    const before=digest(this.memory.snapshot());
    const binding=bindFeedbackToAssessment(board,experience.context.task,assessment,experience,before);
    assert.equal(binding.coverage,'all-legal','Require unaided all-legal assessment');
    this.episode.begin();
    this.pending={experience:structuredClone(experience),options:structuredClone(options),plan,binding,cursor:0,
      beforeMemoryHash:before,startEvents:this.memory.events,chainHash:digest({plan:plan.identity,binding,before})};
    return {skipped:false,planIdentity:plan.identity,frameCount:plan.frames.length};
  }
  step(){
    const pending=this.pending;assert(pending&&pending.cursor<pending.plan.frames.length,'No pending frame');
    assert.deepEqual(this.verify(pending.experience,pending.options),pending.plan,'Changed certificate, cue or plan');
    const frame=pending.plan.frames[pending.cursor],beforeMemory=this.memory.snapshot(),beforeEpisode=this.episode.snapshot();
    const beforeHash=digest(beforeMemory),frameIdentity=digest({plan:pending.plan.identity,frame});
    let update;
    try{
      this.episode.present([0],frame.stimulation,frameIdentity);
      update=this.memory.observeTrajectory({plasticityEnabled:pending.plan.plasticityEnabled});
    }catch(error){
      // Cancel only a failed frame transaction, not an unfavorable learning result.
      this.memory.restore(beforeMemory);this.episode.restore(beforeEpisode);throw error;
    }
    const receipt={schema:'temporal-frame-receipt-v1',planIdentity:pending.plan.identity,index:pending.cursor,
      frameIdentity,stimulation:structuredClone(frame.stimulation),beforeMemoryHash:beforeHash,
      afterMemoryHash:digest(this.memory.snapshot()),update,neuralStateHash:digest([...this.episode.state]),
      previousChainHash:pending.chainHash};
    pending.chainHash=digest(receipt);pending.cursor++;
    return {...receipt,chainHash:pending.chainHash};
  }
  finish(){
    assert(this.pending&&this.pending.cursor===this.pending.plan.frames.length,'Incomplete temporal lesson');
    assert.deepEqual(this.verify(this.pending.experience,this.pending.options),this.pending.plan);
    const receipt={schema:'temporal-lesson-receipt-v1',plan:this.pending.plan,binding:this.pending.binding,
      beforeMemoryHash:this.pending.beforeMemoryHash,afterMemoryHash:digest(this.memory.snapshot()),
      frameCount:this.pending.cursor,chainHash:this.pending.chainHash};
    this.episode.end();this.pending=null;return receipt;
  }
  snapshot(){return {schema:'temporal-feedback-session-v1',identity:this.identity,
    memory:this.memory.snapshot(),episode:this.episode.snapshot(),pending:structuredClone(this.pending)};}
  restore(s){
    assert.equal(s.schema,'temporal-feedback-session-v1');assert.equal(s.identity,this.identity);
    assert(s.pending===null||(typeof s.pending==='object'&&s.pending!==null),'Missing pending lesson state');
    if(s.pending){
      const p=s.pending;assert.deepEqual(this.verify(p.experience,p.options),p.plan);
      assert(Number.isSafeInteger(p.cursor)&&p.cursor>=0&&p.cursor<=p.plan.frames.length);
      assert.equal(s.episode.active,true);assert.equal(s.episode.frames,p.cursor);
      assert(/^[a-f0-9]{64}$/.test(p.chainHash)&&/^[a-f0-9]{64}$/.test(p.beforeMemoryHash));
      const board=new Chess();board.loadPgn(p.experience.context.pgn);
      assert.deepEqual(bindFeedbackToAssessment(board,p.experience.context.task,p.binding.assessment,p.experience,p.beforeMemoryHash),p.binding);
      assert.equal(p.binding.coverage,'all-legal');assert(Number.isSafeInteger(p.startEvents)&&p.startEvents>=0);
      assert.equal(s.memory.events,p.startEvents+(p.plan.plasticityEnabled?p.cursor:0));
      if(p.cursor===0)assert.equal(digest(s.memory),p.beforeMemoryHash);
      if(p.cursor>0)assert.equal(s.episode.frameIdentity,digest({plan:p.plan.identity,frame:p.plan.frames[p.cursor-1]}));
    }else assert.equal(s.episode.active,false);
    const oldMemory=this.memory.snapshot(),oldEpisode=this.episode.snapshot();
    try{this.memory.restore(s.memory);this.episode.restore(s.episode);}
    catch(error){this.memory.restore(oldMemory);this.episode.restore(oldEpisode);throw error;}
    this.pending=structuredClone(s.pending);
  }
}

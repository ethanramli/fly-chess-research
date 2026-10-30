// Prospective curriculum receiver: separate verified-outcome and engine-error
// pulses. Local plasticity is inherited unchanged from the isolated prototype.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {StockfishValueBrain} from './stockfish-value-brain.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {fixedStateHash} from '../neural-learning/association-validation.mjs';
import {createDualValenceInterface} from '../neural-learning/dual-valence-interface.mjs';
import {gradeStockfishChoice,conservativeValueError} from '../search-and-feedback/stockfish-feedback-rubric.mjs';
import {provisionalMBONValue} from '../search-and-feedback/stockfish-target.mjs';

const sorted=rows=>[...rows].sort((a,b)=>a.move.localeCompare(b.move));
const jsonRecord=value=>JSON.parse(JSON.stringify(value));
const modes=['informative','outcome-only','outcome-shuffled','no-channel','shuffled','disabled'];
function frozenError(grade,childAssessment,actor,childTurn,valueScale){
  const childValue=provisionalMBONValue(childAssessment.response,valueScale);
  const prediction=childValue===null?null:childTurn===actor?childValue:-childValue;
  const error=prediction===null?{available:false,error:0,reason:'Silent neural state value'}:
    conservativeValueError(grade,prediction);
  return jsonRecord({childValue,prediction,error});
}

export class CoupledStockfishBrain extends StockfishValueBrain{
  constructor(options,valueOptions){
    super(options,valueOptions);
    this.fixedModelIdentity=options.fixedModelIdentity??fixedStateHash(this.model,this.memory.edges);
    this.coupledIdentity=digest({schema:'verified-outcome-plus-stockfish-v2',valueIdentity:this.valueIdentity,
      stateValueIdentity:digest({schema:'direct-state-mbon-value-v1',valueIdentity:this.valueIdentity,action:null,perspective:'side-to-move'}),
      encoderIdentity:this.encoder.identity??null,memoryIdentity:this.memory.identity,readouts:this.readouts,
      fixedModelIdentity:this.fixedModelIdentity,maxPresentations:this.maxPresentations,maxLegalMoves:this.maxLegalMoves});
  }
  async estimatePositionValue(board,task){
    const memoryFingerprint=this.memoryFingerprint(),context={fen:board.fen(),pgn:board.pgn(),task,action:null};
    const cue=this.encoder.encode(board,null,task),response=await this.evoke(cue.stimulation);
    assert.equal(this.memoryFingerprint(),memoryFingerprint,'State assessment changed lasting memory');
    assert.equal(board.fen(),context.fen);assert.equal(board.pgn(),context.pgn);
    return jsonRecord({context,sideToMove:board.turn(),memoryFingerprint,response,
      value:provisionalMBONValue(response,this.valueConfig.valueScale),cueSha256:digest(cue.stimulation)});
  }
  async evaluate(board,moves,task){
    const assessment=moves.length?await this.assess(board,moves,task):{rows:[]};
    const highest=Math.max(...assessment.rows.map(row=>row.score));
    const weights=assessment.rows.map(row=>Math.exp(this.priorScale*(row.score-highest)));
    const total=weights.reduce((a,b)=>a+b,0),state=await this.estimatePositionValue(board,task);
    return {priors:weights.map(weight=>weight/total),value:state.value??0,valueAvailable:state.value!==null,
      valueIdentity:this.coupledIdentity,scope:'Uncalibrated direct state cue value; silent response uses explicit neutral search fallback'};
  }
  async prepareCoupledFeedback(review){
    this.guard();assert.equal(fixedStateHash(this.model,this.memory.edges),this.fixedModelIdentity,'Fixed model changed before feedback');
    const board=new Chess();board.loadPgn(review.context.pgn);assert.equal(board.fen(),review.context.fen);
    assert.equal(review.actor,board.turn());
    const checked=this.verifyExperience(board,review.chosen,review.context.task,review.taskProof);
    assert.equal(checked.learningAllowed,true,'Unknown task consequence cannot prepare coupled feedback');
    const memorySha256=this.memoryFingerprint(),decision=review.decision;
    assert.equal(decision?.schema,'planned-candidate-review-decision-v1');
    assert.equal(decision.reviewedAction,review.chosen);assert.equal(decision.memoryHash,memorySha256);
    assert.equal(decision.taskProofSha256,checked.certificateSha256);
    const rootMoves=board.moves({verbose:true}),child=new Chess();child.loadPgn(board.pgn());
    const action=rootMoves.find(move=>move.from+move.to+(move.promotion??'')===review.chosen);assert(action);
    child.move(action);
    const requiredPresentations=rootMoves.length+3;
    assert(rootMoves.length<=this.maxLegalMoves);
    assert(this.presentations+requiredPresentations<=this.maxPresentations,
      'Coupled feedback exceeds the registered whole-event neural presentation budget');
    const beforeCount=this.presentations,rootRaw=await this.assess(board,rootMoves,review.context.task);
    assert(rootRaw.rows.every(row=>Number.isFinite(row.score)),'Non-finite root neural score');
    const rootAssessment=jsonRecord(rootRaw);
    assert.equal(rootAssessment.memoryFingerprint,memorySha256);
    assert.deepEqual(sorted(rootAssessment.rows),jsonRecord(sorted(decision.rows)),'Unaided ranking changed before feedback');
    assert.equal(rootAssessment.choice,decision.choice,'Recorded own choice changed before feedback');
    const childAssessment=await this.estimatePositionValue(child,review.context.task);
    assert.equal(childAssessment.memoryFingerprint,memorySha256);
    assert.equal(this.memoryFingerprint(),memorySha256);
    const grade=jsonRecord(gradeStockfishChoice(review));
    const estimate=frozenError(grade,childAssessment,review.actor,child.turn(),this.valueConfig.valueScale);
    const body={schema:'coupled-neural-feedback-preparation-v2',protocolIdentity:this.coupledIdentity,
      reviewIdentity:review.identity,context:structuredClone(review.context),actor:review.actor,
      reviewedAction:review.chosen,ownChoice:decision.choice,taskStatus:checked.status,
      certificateSha256:checked.certificateSha256,memorySha256,rootAssessment,childAssessment,
      childFen:child.fen(),childTurn:child.turn(),...estimate,grade,requiredPresentations,
      preparationPresentations:this.presentations-beforeCount};
    assert.equal(body.preparationPresentations,requiredPresentations-2);
    return {...body,identity:digest(body)};
  }
  validateCoupledPreparation(review,prepared){
    const {identity,...body}=prepared;assert.equal(identity,digest(body));
    assert.equal(prepared.schema,'coupled-neural-feedback-preparation-v2');
    assert.equal(prepared.protocolIdentity,this.coupledIdentity);assert.equal(prepared.reviewIdentity,review.identity);
    assert.deepEqual(prepared.context,review.context);assert.equal(prepared.reviewedAction,review.chosen);
    assert.equal(prepared.actor,review.actor);
    const board=new Chess();board.loadPgn(review.context.pgn);assert.equal(board.fen(),review.context.fen);
    const checked=this.verifyExperience(board,review.chosen,review.context.task,review.taskProof);
    assert.equal(checked.learningAllowed,true);assert.equal(checked.status,prepared.taskStatus);
    assert.equal(checked.certificateSha256,prepared.certificateSha256);
    assert.equal(prepared.memorySha256,review.decision.memoryHash);
    assert.equal(prepared.rootAssessment.memoryFingerprint,prepared.memorySha256);
    assert.deepEqual(sorted(prepared.rootAssessment.rows),jsonRecord(sorted(review.decision.rows)));
    assert.equal(prepared.ownChoice,review.decision.choice);
    assert.equal(prepared.rootAssessment.choice,prepared.ownChoice);
    const child=new Chess();child.loadPgn(board.pgn());
    child.move({from:review.chosen.slice(0,2),to:review.chosen.slice(2,4),...(review.chosen.length===5?{promotion:review.chosen[4]}:{})});
    assert.equal(prepared.childFen,child.fen());assert.equal(prepared.childTurn,child.turn());
    assert.equal(prepared.childAssessment.memoryFingerprint,prepared.memorySha256);
    assert.deepEqual(prepared.childAssessment.context,{fen:child.fen(),pgn:child.pgn(),task:review.context.task,action:null});
    assert.equal(prepared.childAssessment.sideToMove,child.turn());
    assert.equal(prepared.childAssessment.cueSha256,digest(this.encoder.encode(child,null,review.context.task).stimulation));
    assert.equal(prepared.childAssessment.value,provisionalMBONValue(prepared.childAssessment.response,this.valueConfig.valueScale));
    assert.deepEqual(prepared.grade,jsonRecord(review.grade??gradeStockfishChoice(review)));
    const estimate=frozenError(prepared.grade,prepared.childAssessment,prepared.actor,prepared.childTurn,this.valueConfig.valueScale);
    assert.deepEqual(estimate.error,prepared.error);assert.equal(estimate.prediction,prepared.prediction);
    assert.equal(estimate.childValue,prepared.childValue);
    assert.equal(prepared.requiredPresentations,prepared.rootAssessment.rows.length+3);
    assert.equal(prepared.preparationPresentations,prepared.requiredPresentations-2);
    return {board,child,checked};
  }
  async replayCoupledFrame(review,prepared,{phase,condition,expectedMemorySha256,
    shuffledStatus=null,stockfishShuffle=null}){
    assert(['task','stockfish'].includes(phase)&&modes.includes(condition));
    const {board,child,checked}=this.validateCoupledPreparation(review,prepared);
    assert.equal(this.memoryFingerprint(),expectedMemorySha256,'Coupled pulse memory prefix changed');
    if(phase==='task')assert.equal(expectedMemorySha256,prepared.memorySha256);
    let channel=null,current=0,deliveredError=0,rootError=0,deliveredTaskStatus=null;
    if(phase==='task'&&condition!=='no-channel'){
      deliveredTaskStatus=condition==='outcome-shuffled'?shuffledStatus:checked.status;
      assert(['success','failure'].includes(deliveredTaskStatus));
      channel=deliveredTaskStatus==='success'?'PAM02':'PPL103';current=this.valueConfig.maxReinforcementCurrent;
    }
    if(phase==='stockfish'&&['informative','shuffled','disabled'].includes(condition)&&prepared.error.available){
      deliveredError=prepared.error.error;
      if(condition==='shuffled'){
        assert.equal(stockfishShuffle?.schema,'matched-stockfish-error-shuffle-v1');
        assert.match(stockfishShuffle.scheduleSha256,/^[a-f0-9]{64}$/);assert.equal(stockfishShuffle.errorSign,-1);
        assert(Number.isSafeInteger(stockfishShuffle.eventIndex)&&stockfishShuffle.eventIndex>=0);
        deliveredError=-deliveredError;
      }
      assert(Number.isFinite(deliveredError)&&Math.abs(deliveredError)<=2);
      rootError=deliveredError;
      deliveredError=child.turn()===review.actor?rootError:-rootError;
      channel=deliveredError>0?'PAM02':deliveredError<0?'PPL103':null;
      current=this.valueConfig.maxReinforcementCurrent*Math.abs(deliveredError)/2;
    }
    const plasticityEnabled=condition!=='disabled';
    const cueBoard=phase==='task'?board:child,cueAction=phase==='task'?review.chosen:null;
    const cue=this.encoder.encode(cueBoard,cueAction,review.context.task);
    if(phase==='stockfish')assert.equal(digest(cue.stimulation),prepared.childAssessment.cueSha256);
    if(plasticityEnabled&&channel)this.assertMemoryChannels([channel]);
    const presentation=createDualValenceInterface(this.mapping,current||this.valueConfig.maxReinforcementCurrent)
      .present(cue.stimulation,channel);
    if(!channel)presentation.reinforcementCurrent=0;
    const before=this.memory.snapshot(),fixedBefore=fixedStateHash(this.model,this.memory.edges);
    assert.equal(fixedBefore,this.fixedModelIdentity,'Fixed model changed before the coupled pulse');
    const response=await this.evoke(presentation.stimulation);
    const update=plasticityEnabled?this.observeMemory(channel?[channel]:[]):
      {events:this.memory.events,changedEdges:0,factors:[]};
    const fixedAfter=fixedStateHash(this.model,this.memory.edges);
    assert.equal(fixedAfter,fixedBefore,'Coupled feedback changed fixed wiring/parameters');
    return {schema:'coupled-neural-feedback-pulse-v2',phase,condition,protocolIdentity:this.coupledIdentity,
      preparationIdentity:prepared.identity,reviewedAction:review.chosen,certificateSha256:checked.certificateSha256,
      verifiedTaskStatus:checked.status,deliveredTaskStatus,deliveredError,rootError,channel,current,
      cueContext:{fen:cueBoard.fen(),pgn:cueBoard.pgn(),task:review.context.task,action:cueAction},
      pulsePerspective:cueBoard.turn(),cueSha256:digest(cue.stimulation),
      presentation,response,update,before,after:this.memory.snapshot(),fixedBefore,fixedAfter,
      plasticityEnabled,learningApplied:update.changedEdges>0,
      teachingSignal:phase==='task'?'verified-task-valence':'separate-stockfish-value-error',
      scope:'Two separate experimental teaching pulses through unchanged local plasticity; bounded task truth and engine estimates are distinct, biological dose validity unproven'};
  }
}

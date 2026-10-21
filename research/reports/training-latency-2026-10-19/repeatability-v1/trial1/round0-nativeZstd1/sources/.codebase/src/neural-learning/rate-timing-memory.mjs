// Offline-per-frame integration adapter for the gamma2 engineering candidate.
// Physiological assumptions and waveform timing must be declared by its caller.
import { ReversalMemory } from './reversal-memory.mjs';
import { digest } from './mushroom-body.mjs';
import { stepRateTimingPlasticity } from './rate-timing-plasticity-candidate.mjs';

export class RateTimingMemory extends ReversalMemory {
  constructor(model, mapping, reference, config) {
    if (mapping?.schema !== 'gamma2-rate-timing-map-v1' || !mapping.groups?.length
      || mapping.groups.some(g => g.mbonType !== 'MBON12' || g.danType !== 'PPL103'
        || g.dan.length !== 1 || g.kcTypes?.length !== g.kc.length
        || g.kcTypes.some(type => !/^KCg-/.test(type)))
      || mapping.groups.flatMap(g=>g.edges).length > 2048
      || !reference || reference.length !== model.n
      || config?.referenceMode !== 'fixed-unstimulated-model'
      || ![config.tauKC,config.tauShort,config.tauLong,config.stepDuration].every(Number.isFinite)
      || config.tauKC <= 0 || config.tauShort <= 0 || config.tauLong <= config.tauShort
      || config.stepDuration <= 0 || config.stepDuration > 1)
      throw Error('Require scoped gamma2 map, reference and explicit numerical timing');
    super(model,mapping,config);
    this.config=Object.freeze({...this.config,tauKC:config.tauKC,tauShort:config.tauShort,
      tauLong:config.tauLong,stepDuration:config.stepDuration,referenceMode:config.referenceMode});
    this.kc=mapping.groups.flatMap(g=>g.kc);
    this.dan=mapping.groups.flatMap(g=>g.kc.map(()=>g.dan[0].index));
    this.referenceKC=Float64Array.from(this.kc,i=>reference[i]);
    this.referenceDAN=Float64Array.from(this.dan,i=>reference[i]);
    if (![...this.referenceKC,...this.referenceDAN].every(v=>Number.isFinite(v)&&v>=0))
      throw Error('Invalid local model reference');
    this.kcTrace=new Float64Array(this.edges.length);
    this.short=new Float64Array(this.edges.length);this.long=new Float64Array(this.edges.length);
    this.identity=digest({schema:'rate-timing-memory-v1',mapping,config:this.config,
      model:model.config,base:[...this.base],referenceKC:[...this.referenceKC],referenceDAN:[...this.referenceDAN]});
  }
  // Gains are held during the already computed neural frame, then applied once.
  // Right-endpoint rates are held for each declared model interval. This is an
  // explicit approximation, not within-step coupled neural/plastic dynamics.
  observeTrajectory({plasticityEnabled=true}={}) {
    const states=this.model.h,steps=this.model.steps;
    if(typeof plasticityEnabled!=='boolean' || !Number.isSafeInteger(steps) || steps<1 || steps>64
      || !Array.isArray(states) || states.length!==steps+1
      || states.some(s=>s.length!==this.model.n))throw Error('Invalid bounded neural trajectory');
    for(let t=1;t<=steps;t++)for(let i=0;i<this.edges.length;i++)
      if(![states[t][this.kc[i]],states[t][this.dan[i]]].every(v=>Number.isFinite(v)&&v>=0))
        throw Error('Nonfinite or negative local rate');
    if(!plasticityEnabled)return {events:this.events,changedEdges:0,scope:'All persistent memory and local traces held'};
    if(!Number.isSafeInteger(this.events+1))throw Error('Memory event count overflow');
    const nextGains=this.gains.slice(),nextKC=this.kcTrace.slice(),nextShort=this.short.slice(),nextLong=this.long.slice();
    let depressionDose=0,potentiationDose=0;
    for(let t=1;t<=steps;t++)for(let i=0;i<this.edges.length;i++){
      const next=stepRateTimingPlasticity({gain:nextGains[i],kcTrace:nextKC[i],short:nextShort[i],long:nextLong[i]},
        {kcRate:Math.min(1,Math.max(0,states[t][this.kc[i]]-this.referenceKC[i])/this.config.activityScale),
          danRate:Math.max(0,states[t][this.dan[i]]-this.referenceDAN[i])/this.config.activityScale,
          dt:this.config.stepDuration},this.config);
      nextGains[i]=next.state.gain;nextKC[i]=next.state.kcTrace;
      nextShort[i]=next.state.short;nextLong[i]=next.state.long;
      depressionDose+=next.depressionDose;potentiationDose+=next.potentiationDose;
    }
    if(!nextGains.every((g,i)=>Number.isFinite(Math.fround(this.base[i]*g))&&Math.fround(this.base[i]*g)>0))
      throw Error('Unrepresentable effective magnitude');
    const changedEdges=nextGains.reduce((n,g,i)=>n+(g!==this.gains[i]),0);
    this.gains.set(nextGains);this.kcTrace.set(nextKC);this.short.set(nextShort);this.long.set(nextLong);
    this.events++;this.apply();
    return {events:this.events,changedEdges,depressionDose,potentiationDose,
      scope:'Frame-held engineering gains; fixed-reference local rates; no biological validation'};
  }
  // Preserve the old API from accidental use: it would process only an endpoint.
  observe(){throw Error('Rate timing requires observeTrajectory and declared interval timing');}
  snapshot(){return {...super.snapshot(),schema:'rate-timing-memory-v1',kcTrace:[...this.kcTrace],
    short:[...this.short],long:[...this.long]};}
  restore(s){
    const valid=(a,upper)=>Array.isArray(a)&&a.length===this.edges.length&&a.every(v=>Number.isFinite(v)&&v>=0&&v<=upper);
    if(s.schema!=='rate-timing-memory-v1'||!valid(s.kcTrace,1)||!valid(s.short,Infinity)||!valid(s.long,Infinity))
      throw Error('Incompatible rate-timing checkpoint');
    if(!Array.isArray(s.gains)||s.gains.length!==this.edges.length
      ||!s.gains.every((g,i)=>Number.isFinite(Math.fround(this.base[i]*g))&&Math.fround(this.base[i]*g)>0))
      throw Error('Incompatible effective magnitudes');
    super.restore(s);this.kcTrace.set(s.kcTrace);this.short.set(s.short);this.long.set(s.long);
  }
}

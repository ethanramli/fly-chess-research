// Four-state reservoir/buffer hypothesis, not measured fly receptor dynamics.
// Khorsand/Soltani2017 Fig6d; adaptations in reservoir-proposal.md. No pattern/task identities enter here.
import { digest } from './mushroom-body.mjs';
import { LocalGatedMemory, stepLocalGated } from './local-gated-memory.mjs';
const SCHEMA='local-reservoir-memory-v1';

// Masses: strong/buffer, strong/reservoir, weak/buffer, weak/reservoir.
// One transition opportunity per held frame; this is not an exact continuous-time Markov integrator.
export function stepReservoir(input, states, config) {
  const local=stepLocalGated(input,config), drive=input.excess+input.deficit;
  const probability=-Math.expm1(-local.trace*config.eta*drive*input.dt);
  if(probability===0) return {gain:input.gain,trace:local.trace,states};
  const pd=probability*input.excess/drive, pu=probability*input.deficit/drive;
  const [s0,s1,w0,w1]=states, remain=1-probability;
  const next=[remain*s0+pd*s1, (1-pd)*s1+pu*(s0+w0),
    remain*w0+pu*w1, (1-pu)*w1+pd*(w0+s0)];
  const total=next.reduce((a,b)=>a+b,0);
  if(!Number.isFinite(total)||Math.abs(total-1)>1e-12||next.some(x=>!Number.isFinite(x)||x<0)) throw Error('Invalid reservoir probability mass');
  // Normalize rounding drift; transfers above conserve mass analytically.
  for(let i=0;i<4;i++) next[i]/=total;
  return {gain:config.minGain+(config.maxGain-config.minGain)*(next[0]+next[1]),trace:local.trace,states:next};
}

export class LocalReservoirMemory extends LocalGatedMemory {
  constructor(model,mapping,config={}) {
    super(model,mapping,config);
    this.states=new Float64Array(4*this.edges.length);
    for(let i=0;i<this.edges.length;i++) this.states[4*i]=1;
    this.identity=digest({schema:SCHEMA,parent:this.identity,topology:'reservoir-buffer-opposite-reservoir',initial:'strong-buffer'});
  }
  observe(rest,dt=1) {
    const h=this.model.h[this.model.steps],{activityScale:scale}=this.config;
    if(rest.length!==this.model.n||!Number.isFinite(dt)||dt<=0) throw Error('Invalid observation interval');
    for(const g of this.mapping.groups) for(const i of [...g.kc,...g.dan.map(d=>d.index)]) if(!Number.isFinite(h[i])||!Number.isFinite(rest[i])) throw Error('Nonfinite local activity');
    let offset=0,changed=0,pulsed=false;
    for(const g of this.mapping.groups) {
      let excess=0,deficit=0;
      for(const {index} of g.dan) { excess+=Math.max(0,h[index]-rest[index])/scale; deficit+=Math.max(0,rest[index]-h[index])/scale; }
      excess/=g.dan.length; deficit/=g.dan.length; pulsed ||= excess+deficit>0;
      for(let i=0;i<g.edges.length;i++,offset++) {
        const k=Math.min(1,Math.max(0,h[g.kc[i]]-rest[g.kc[i]])/scale),before=this.gains[offset];
        const next=stepReservoir({gain:before,trace:this.traces[offset],k,excess,deficit,dt},this.states.subarray(4*offset,4*offset+4),this.config);
        this.states.set(next.states,4*offset);this.traces[offset]=next.trace;
        if(next.gain!==before) {this.gains[offset]=next.gain;this.model.setMagnitude(this.edges[offset],this.base[offset]*next.gain);changed++;}
      }
    }
    this.time+=dt;if(pulsed)this.pulses++;
    return {changedEdges:changed,time:this.time,pulses:this.pulses,scope:'Local mean-field reservoir/buffer fixture'};
  }
  snapshot() {return {...super.snapshot(),schema:SCHEMA,states:[...this.states]};}
  restore(s) {
    if(s?.schema!==SCHEMA||s.identity!==this.identity||!Array.isArray(s.states)||s.states.length!==this.states.length||!s.states.every(v=>Number.isFinite(v)&&v>=0&&v<=1)) throw Error('Incompatible reservoir state');
    for(let i=0;i<this.edges.length;i++) {
      const p=s.states.slice(4*i,4*i+4),total=p.reduce((a,b)=>a+b,0);
      const gain=this.config.minGain+(this.config.maxGain-this.config.minGain)*(p[0]+p[1]);
      if(Math.abs(total-1)>1e-12||!Array.isArray(s.gains)||Math.abs(gain-s.gains[i])>1e-13) throw Error('State/gain probability mismatch');
    }
    super.restore({...s,schema:'local-gated-memory-v1'});this.states.set(s.states);
  }
}

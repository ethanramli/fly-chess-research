// Label-blind experimental input calibration. A numerical choice interface,
// not a physiological danger probability or a biologically validated decoder.
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const vector = v => Array.isArray(v) && v.length===2 && v.every(Number.isFinite);

export function calibrateGF(samples, { minRange=1e-7 }={}) {
  if (!Array.isArray(samples)||samples.length<2||samples.length>128||!samples.every(vector)||!Number.isFinite(minRange)||minRange<=0) throw Error('Invalid bounded calibration samples');
  const min=[0,1].map(i=>Math.min(...samples.map(v=>v[i]))), max=[0,1].map(i=>Math.max(...samples.map(v=>v[i])));
  const range=max.map((v,i)=>v-min[i]), usable=range.every(v=>Number.isFinite(v)&&v>=minRange);
  return Object.freeze({schema:'gf-input-range-v2',min:Object.freeze(min),max:Object.freeze(max),range:Object.freeze(range),
    sampleCount:samples.length,minRange,usable,sampleHash:hash(samples),
    provenance:'Naive responses to a fixed public board/action panel; no consequence labels or learned memory'});
}

export function readGF(raw, calibration) {
  if(!vector(raw)||calibration?.schema!=='gf-input-range-v2'||!vector(calibration.min)||!vector(calibration.max)||!vector(calibration.range)||
    !Number.isFinite(calibration.minRange)||calibration.minRange<=0||calibration.usable!==true||
    calibration.range.some((v,i)=>v<calibration.minRange||v!==calibration.max[i]-calibration.min[i])) throw Error('Unusable or invalid GF calibration');
  const normalized=raw.map((v,i)=>(v-calibration.min[i])/calibration.range[i]);
  if(!normalized.every(Number.isFinite))throw Error('Nonfinite normalized GF signal');
  const clipped=normalized.map(v=>Math.max(0,Math.min(1,v)));
  return {raw:[...raw],normalized,clipped,score:Math.max(...clipped),signedScore:Math.max(...normalized),
    outsidePanel:normalized.map(v=>v<0||v>1),meaning:'Fixed engineered GF action score; lower is preferred; no game-value claim'};
}

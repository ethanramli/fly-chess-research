import test from 'node:test';
import assert from 'node:assert/strict';
import { stepMetaplastic } from '../../src/neural-learning/local-metaplastic-memory.mjs';
import { LOCAL_GATED_DEFAULTS as C } from '../../src/neural-learning/local-gated-memory.mjs';
import { buildFixture,mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { makeRule,register } from '../../src/neural-learning/memory-assay-rule-local-metaplastic.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-phase-recorded.mjs';
import { auditRecordedEvents } from '../../src/neural-learning/memory-assay-phase-audit.mjs';
register(registerRule);
const input={gain:.6,trace:1,k:1,excess:.3,deficit:.2,dt:1};
const fx=()=>buildFixture({seed:1001,nKC:200,s:20,q:.25,relation:'conflicting',w:0,bg:0});

test('mean-field transition agrees with independently simulated microscopic transitions',()=>{
  const p=[.1,.2,.3,.4],rng=mulberry32(719),count=[0,0,0,0],N=300000;
  const event=1-Math.exp(-.25);
  for(let n=0;n<N;n++) {
    let state=0,x=rng();while(x>p[state]&&state<3)x-=p[state++];
    if(rng()<event) {
      const wantStrong=rng()<.4, strong=state<2, deep=state%2===1;
      if(wantStrong===strong) {if(!deep)state++;}
      else if(rng()<(deep?.5:1)) state=wantStrong?0:2;
    }
    count[state]++;
  }
  const r=stepMetaplastic(input,p,C);
  for(let i=0;i<4;i++)assert.ok(Math.abs(r.states[i]-count[i]/N)<.003);
});

test('coherent practice stores history at a saturated gain and reduces subsequent susceptibility',()=>{
  let p=[1,0,0,0],g=1;
  for(let i=0;i<24;i++){const r=stepMetaplastic({...input,gain:g,excess:0,deficit:.5},p,C);p=r.states;g=r.gain;}
  assert.equal(g,1);assert.ok(p[1]>.99);
  const old=stepMetaplastic({...input,gain:1,excess:.5,deficit:0},p,C);
  const fresh=stepMetaplastic({...input,gain:1,excess:.5,deficit:0},[1,0,0,0],C);
  assert.ok(old.gain>fresh.gain);
});

test('probability mass stays finite, normalized, bounded and reversible',()=>{
  let p=[1,0,0,0],gain=1;
  for(let i=0;i<400;i++) {
    const down=i<200,r=stepMetaplastic({...input,gain,excess:down?.5:0,deficit:down?0:.5},p,C);
    p=r.states;gain=r.gain;
    assert.ok(p.every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-14);
    assert.ok(gain>=.2&&gain<=1);
    if(i===199)assert.ok(gain<.200001);
  }
  assert.ok(gain>.999999);
});

test('unknown/no-signal and settled inactive observations preserve all efficacy probabilities',()=>{
  for(const o of [{...input,excess:0,deficit:0},{...input,k:0,trace:0}]) {
    const p=[.1,.2,.3,.4],r=stepMetaplastic(o,p,C);assert.deepEqual(r.states,p);assert.equal(r.gain,o.gain);
  }
});

test('persistence includes hidden state and invalid restore leaves the learner unchanged',()=>{
  const f=fx(),a=makeRule('meta',f),b=makeRule('meta',f),frame={kcH:f.images['A+'].h,danP:0,danR:1.5,dt:1};
  for(let i=0;i<12;i++)a.frame(frame);
  b.restore(a.snapshot());assert.equal(a.stateHash(),b.stateHash());
  a.frame({...frame,danP:1.5,danR:0});b.frame({...frame,danP:1.5,danR:0});assert.equal(a.stateHash(),b.stateHash());
  for(const change of [{states:[NaN]},{time:-1},{gains:Array(400).fill(1)},{identity:'wrong'}]){
    const before=b.stateHash();assert.throws(()=>b.restore({...b.snapshot(),...change}));assert.equal(b.stateHash(),before);
  }
});

test('all four own-choice arms replay with verified complete phase snapshots',()=>{
  const expected={ruleName:'local-metaplastic-v1',seeds:[1001],nKC:200,s:20,cell:{q:.25,relation:'conflicting',w:0,bg:0},temperature:.1,danDip:0};
  const rows=[],summaries=runCellSeed({...expected,seed:1001,writeRecord:r=>rows.push(r)});
  let i=0;const audit=auditRecordedEvents(()=>rows[i++]??null,expected);
  assert.deepEqual(audit.summaries,summaries);assert.equal(audit.checkedTrials,576);assert.equal(audit.unknownTrials,72);
  const tests=rows.filter(r=>r.kind==='test');assert.equal(tests.length,20);assert.ok(tests.every(r=>r.snapshot.states.length===1600));
  assert.ok(summaries.filter(r=>['absent','disabled'].includes(r.arm)).every(r=>r.initialGainsHash===r.finalGainsHash));
});

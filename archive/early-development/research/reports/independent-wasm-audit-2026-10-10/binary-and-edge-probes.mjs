import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {SparseTrainer as Production} from '../../../.codebase/src/supervised-baselines/trainer.mjs';
import {SparseTrainer as Oracle} from '../move-latency-wasm-2026-10-10/oracle-trainer.mjs';
const out=new URL('.',import.meta.url),bytes=readFileSync(new URL('generated-accumulator.wasm',out));
let p=8;const leb=()=>{let n=0,shift=0,b;do{b=bytes[p++];n+=(b&127)*2**shift;shift+=7;assert.ok(shift<=35);}while(b&128);return n;};
const names={2:'block',3:'loop',4:'if',11:'end',12:'br',13:'br_if',15:'return',32:'local.get',33:'local.set',40:'i32.load',42:'f32.load',43:'f64.load',57:'f64.store',65:'i32.const',75:'i32.gt_u',79:'i32.ge_u',106:'i32.add',108:'i32.mul',114:'i32.or',160:'f64.add',162:'f64.mul',187:'f64.promote_f32'};
const functions=[];
while(p<bytes.length){const id=bytes[p++],length=leb(),end=p+length;
  if(id===10){const n=leb();for(let f=0;f<n;f++){const size=leb(),finish=p+size,groups=leb(),locals=[];
    for(let i=0;i<groups;i++)locals.push({count:leb(),type:bytes[p++]});
    const instructions=[];
    while(p<finish){const offset=p,op=bytes[p++],name=names[op];assert.ok(name,`unrecognized ${op}`);
      const immediates=[];
      if([2,3,4].includes(op))immediates.push(bytes[p++]);
      if([12,13,32,33,65].includes(op))immediates.push(leb());
      if([40,42,43,57].includes(op))immediates.push(leb(),leb());
      instructions.push({offset,opcode:op.toString(16),name,immediates});
    }
    assert.equal(p,finish);const ops=instructions.map(i=>i.name);
    assert.equal(ops.filter(n=>n==='f64.mul').length,1);assert.equal(ops.filter(n=>n==='f64.add').length,1);
    assert.equal(ops.indexOf('f64.add'),ops.indexOf('f64.mul')+1);
    assert.equal(ops.filter(n=>n==='f64.promote_f32').length,f===0?3:0);
    functions.push({export:f===0?'sum32':'sum64',locals,instructions});
  }}
  p=end;
}
const errors=[];
for(const precision of ['float32','float64'])for(const [name,Type] of [['production',Production],['oracle',Oracle]]){
  const g={row:Int32Array.of(0,1,2),col:Int32Array.of(0,1),sign:Int8Array.of(1,-1),initial:Float32Array.of(1,1),input:Int32Array.of(0),output:Int32Array.of(0)};
  const m=new Type(g,{precision,inputDim:1,outputs:1});
  for(const v of [NaN,Infinity,-Infinity]){
    m.signedMagnitude[0]=v;assert.throws(()=>m.forward([0]),/Nonfinite recurrent/);
  }
  m.refreshSignedMagnitude();
  for(const v of [NaN,Infinity,-Infinity]){
    m.params.bias[0]=v;assert.throws(()=>m.forward([0]),/Nonfinite recurrent/);
  }
  m.params.bias[0]=.01;m.params.head[0]=Infinity;assert.throws(()=>m.forward([0]),/Nonfinite prediction/);
  errors.push({precision,name,invalidWeightsAndDriveRejected:true,invalidReadoutRejected:true});
}
writeFileSync(new URL('binary-disassembly.json',out),JSON.stringify({timestamp:new Date().toISOString(),functions,errors},null,2),{flag:'wx'});
console.log(JSON.stringify({functions:functions.map(f=>({export:f.export,instructions:f.instructions.length})),errors}));

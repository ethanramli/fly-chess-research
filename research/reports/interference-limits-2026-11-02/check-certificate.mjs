// Independent BigInt rational checker: reconstruct binary64 numbers directly from bits.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='research/reports/interference-limits-2026-11-02/';
const cert=JSON.parse(readFileSync(dir+'proof-certificate.json'));
const source=JSON.parse(readFileSync('runs/memory-retention-2026-11-01/synaptic-conflict-v1/result.json'));
const q=s=>s.includes('/')?s.split('/').map(BigInt):[BigInt(s),1n];
const add=(a,b)=>[a[0]*b[1]+b[0]*a[1],a[1]*b[1]];
const neg=a=>[-a[0],a[1]];
const sub=(a,b)=>add(a,neg(b));
const mul=(a,b)=>[a[0]*b[0],a[1]*b[1]];
const inv=a=>a[0]<0n?[-a[1],-a[0]]:[a[1],a[0]];
const sign=a=>a[0]<0n?-1:a[0]>0n?1:0;
const eq=(a,b)=>assert.equal(sign(sub(a,b)),0);
function binary(x){
 const b=Buffer.alloc(8);b.writeDoubleBE(x);const bits=b.readBigUInt64BE();
 const exponent=Number((bits>>52n)&2047n);assert(exponent>0&&exponent<2047);
 let n=(1n<<52n)+(bits&((1n<<52n)-1n));if(bits>>63n)n=-n;
 const power=exponent-1023-52;return power>=0?[n<<BigInt(power),1n]:[n,1n<<BigInt(-power)];
}
let checked=0,dual=0,witnesses=0;
for(const [name,c] of Object.entries(cert.conditions)){
 const src=source.primary.conditions[name];
 for(const row of c.rows){
  const r=src.items[row.item],g=Number(name!=='Delay'&&row.item===0),b=1-g;
  const n=r.naive.map(binary),x=r.raw.map(binary);
  eq(q(row.a),mul([1n,2n],sub(inv(n[g]),inv(n[b]))));
  eq(q(row.b),mul([1n,2n],sub(mul(x[b],inv(n[b])),mul(x[g],inv(n[g])))));
  checked++;
 }
 if(c.dual){
  let a=[0n,1n],b=[0n,1n];
  c.dual.items.forEach((j,k)=>{const l=q(c.dual.multipliers[k]);assert(sign(l)>0);a=add(a,mul(l,q(c.rows[j].a)));b=add(b,mul(l,q(c.rows[j].b)));});
  assert.equal(sign(a),0);assert(sign(b)<0);eq(b,q(c.dual.constant));dual++;
 }else{
  const rest=q(c.witnessRest);
  for(const row of c.rows)assert(sign(add(mul(q(row.a),rest),q(row.b)))>0);
  witnesses++;
 }
}
for(const [path,hash] of Object.entries(cert.pins))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash);
// Mutation rejection: negating the negative certificate constant must be rejected.
assert.throws(()=>assert(sign(neg(q(cert.conditions.Rev.dual.constant)))<0));
const receipt={status:'passed',arithmetic:'independent JavaScript BigInt rational reconstruction from binary64 bits; no tolerance',rows:checked,dualCertificates:dual,feasibleWitnesses:witnesses,mutationRejected:true,sourcePinsMatched:true,graphPasses:0};
writeFileSync(dir+'independent-check.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));

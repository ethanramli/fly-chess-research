import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
const dir='research/data/c01-open-defender-development-v1',sha=b=>createHash('sha256').update(b).digest('hex');
const c=JSON.parse(readFileSync(`${dir}/candidate.json`)),v=JSON.parse(readFileSync(`${dir}/verification.json`)),a=JSON.parse(readFileSync(`${dir}/audit.json`));
const pieceRows=fen=>{const b=new Chess(fen);return b.board().flat().filter(Boolean).map(p=>({square:p.square,color:p.color,type:p.type})).sort((x,y)=>x.color.localeCompare(y.color)||x.type.localeCompare(y.type)||x.square.localeCompare(y.square));};
const byId=new Map(c.positions.map(p=>[`${p.familyId}:${p.member}`,p]));
const rookOnly=[];
for(const family of ['e-file-open','d-file-mirror']){
  const x=pieceRows(byId.get(`${family}:defender-a`).fen),y=pieceRows(byId.get(`${family}:defender-b`).fen);
  const xs=new Set(x.map(p=>`${p.square}:${p.color}:${p.type}`)),ys=new Set(y.map(p=>`${p.square}:${p.color}:${p.type}`));
  const diff=[...x.filter(p=>!ys.has(`${p.square}:${p.color}:${p.type}`)),...y.filter(p=>!xs.has(`${p.square}:${p.color}:${p.type}`))];
  assert.equal(diff.length,2);assert(diff.every(p=>p.color==='b'&&p.type==='r'));rookOnly.push(family);
}
const mirror=s=>String.fromCharCode(104-(s.charCodeAt(0)-97))+s[1];
for(const member of ['defender-a','defender-b']){
  const left=pieceRows(byId.get(`e-file-open:${member}`).fen).map(p=>({...p,square:mirror(p.square)})).sort((x,y)=>x.color.localeCompare(y.color)||x.type.localeCompare(y.type)||x.square.localeCompare(y.square));
  assert.deepEqual(left,pieceRows(byId.get(`d-file-mirror:${member}`).fen));
}
const correction={schema:'c01-open-defender-family-normalization-v1',candidateSha256:sha(readFileSync(`${dir}/candidate.json`)),
  verificationSha256:sha(readFileSync(`${dir}/verification.json`)),independentAuditSha256:sha(readFileSync(`${dir}/audit.json`)),
  independentStructuralFamilyCount:1,structuralFamilyId:'open-defender-rook-ray-file-reflection',
  counterfactualPairs:rookOnly.length,eachPairChangesOnlyBlackRookSquare:true,fileReflectionVariants:2,
  interpretation:'The original v1 field `families:2` counts two geometrical layouts, not two independent structural families. Both layouts and both counterfactual pairs are one file-reflection family and remain exploratory training-only.',
  status:'classification correction; no new labels, split assignment, or learning evidence'};
writeFileSync(`${dir}/family-structure-correction.json`,JSON.stringify(correction,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(correction));

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const dir=join(root,'runs',process.argv[2],'r1%3Ainformative','attempt-001','block-02');
const rows=readFileSync(join(dir,'receipts.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const seen=new Set();
const walk=(v,path,out)=>{if(v&&typeof v==='object'){for(const [k,x] of Object.entries(v)){if(k==='factors'&&Array.isArray(x))out.push(path+'.'+k+'='+JSON.stringify(x.map(f=>+f.toFixed(4))));else if(k==='changedEdges')out.push(path+'.changedEdges='+x);else walk(x,path+'.'+k,out);}}};
for(const r of rows.filter(r=>r.kind!=='event-start').slice(0,40)){const out=[];walk(r.value,'',out);
  const key=out.join(' ');if(out.length&&!seen.has(key)){seen.add(key);console.log(r.kind,out.slice(0,6).join(' ').slice(0,300));}}


// One-off, researcher-approved 2026-10-24: prune intermediate G0 checkpoints to free disk.
// Keeps every non-checkpoint file (results, audits, receipts, protocols, sources, logs),
// the highest-numbered checkpoint in each folder, and any checkpoint named in a run's JSON
// records. Each deleted file is first hashed and written to manifest.jsonl.
import {readdirSync,statSync,readFileSync,rmSync,createReadStream,openSync,writeSync,closeSync,fsyncSync,existsSync} from 'node:fs';
import {join,relative,basename,dirname} from 'node:path';
import {createHash} from 'node:crypto';

const root=process.cwd(),runs=join(root,'runs'),out=join(root,'research/reports/g0-checkpoint-pruning-2026-10-24');
const CK=/^checkpoint-(\d+)\.json(\.gz)?$/;
const walk=(dir,acc=[])=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);
  if(e.isDirectory())walk(p,acc);else acc.push(p);}return acc;};
const g0=readdirSync(runs,{withFileTypes:true}).filter(d=>d.isDirectory()&&/g0/.test(d.name)).map(d=>join(runs,d.name)).sort();
const files=g0.flatMap(run=>walk(run));
const referenced=new Set();
for(const f of files)if(f.endsWith('.json')&&!CK.test(basename(f))&&statSync(f).size<=8*2**20)
  for(const m of readFileSync(f,'utf8').matchAll(/checkpoint-\d+\.json(?:\.gz)?/g))referenced.add(m[0]);
const byFolder=new Map();
for(const f of files)if(CK.test(basename(f)))(byFolder.get(dirname(f))??byFolder.set(dirname(f),[]).get(dirname(f))).push(f);
const keep=new Set(),remove=[];
for(const list of byFolder.values()){
  list.sort((a,b)=>Number(CK.exec(basename(a))[1])-Number(CK.exec(basename(b))[1]));
  for(const f of list){
    if(f===list.at(-1)||referenced.has(basename(f)))keep.add(f);else remove.push(f);
  }
}
if(process.argv.includes('--dry-run')){
  const gib=list=>+(list.reduce((s,f)=>s+statSync(f).size,0)/2**30).toFixed(2);
  console.log(JSON.stringify({runs:g0.length,folders:byFolder.size,referencedNames:referenced.size,
    keep:keep.size,keepGiB:gib([...keep]),remove:remove.length,removeGiB:gib(remove)}));
  process.exit(0);
}
const manifest=join(out,'manifest.jsonl');
if(existsSync(manifest))throw Error('Manifest exists; refusing to re-run over a previous pruning');
const fd=openSync(manifest,'wx');let bytes=0,count=0;
const sha=path=>new Promise((ok,fail)=>{const h=createHash('sha256');createReadStream(path).on('data',d=>h.update(d)).on('end',()=>ok(h.digest('hex'))).on('error',fail);});
for(const f of remove){
  const size=statSync(f).size,hash=await sha(f);
  writeSync(fd,JSON.stringify({path:relative(root,f).replaceAll('\\','/'),bytes:size,sha256:hash})+'\n');
  if(++count%5000===0){fsyncSync(fd);console.log(JSON.stringify({deleted:count,of:remove.length,freedGiB:+(bytes/2**30).toFixed(1)}));}
  rmSync(f);bytes+=size;
}
fsyncSync(fd);closeSync(fd);
const summary={schema:'g0-checkpoint-pruning-v1',date:'2026-10-24',approvedBy:'researcher (chat, 2026-10-24)',
  runs:g0.map(r=>relative(root,r).replaceAll('\\','/')),deletedFiles:count,freedBytes:bytes,
  keptCheckpoints:[...keep].map(f=>relative(root,f).replaceAll('\\','/')).sort(),referencedCheckpointNames:[...referenced].sort(),
  rule:'Delete checkpoint-N.json(.gz) except the highest N per folder and any name referenced by a run JSON record; all other files kept',
  consequence:'Intermediate states cannot be replayed again; existing independent audits, results and receipts remain'};
const summaryFd=openSync(join(out,'summary.json'),'wx');writeSync(summaryFd,JSON.stringify(summary,null,1)+'\n');fsyncSync(summaryFd);closeSync(summaryFd);
console.log(JSON.stringify({done:true,deletedFiles:count,freedGiB:+(bytes/2**30).toFixed(2),keptCheckpoints:keep.size}));

// Operational identity supplements the frozen physiological/receipt identity.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,copyFileSync,writeFileSync,openSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {createHash} from 'node:crypto';

const registrationPath=resolve('research/data/lesson-pause-control-v1/registration.json');
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const json=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
function atomic(path,data){
  const temporary=path+'.partial',fd=openSync(temporary,'wx');
  try{writeFileSync(fd,JSON.stringify(data)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(temporary,path);
}
export function verifyPauseSources(root=null){
  const registration=json(registrationPath);
  for(const [path,expected] of Object.entries(registration.sources)){
    assert.equal(sha(root?join(root,path):path),expected,'Pause execution source mismatch: '+path);
  }
  for(const change of registration.variants){
    let expected=readFileSync(root?join(root,change.canonical):change.canonical,'utf8');
    for(const edit of change.edits){
      assert.equal(expected.split(edit.anchor).length,2,'Ambiguous pause insertion');
      expected=expected.replace(edit.anchor,edit.replacement);
    }
    assert.equal(readFileSync(root?join(root,change.adapted):change.adapted,'utf8'),expected,'Undeclared runner edits');
  }
  return registration;
}
export function recordPauseExecution(args){
  const registration=verifyPauseSources(),out=resolve(args.out);
  const sourceRoot=join(out,'execution-sources');
  for(const path of Object.keys(registration.sources)){
    const target=join(sourceRoot,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(path,target);
  }
  copyFileSync(registrationPath,join(out,'pause-registration.json'));
  atomic(join(out,'execution.json'),{schema:1,registrationSha256:sha(registrationPath),
    runner:resolve(process.argv[1]),sources:registration.sources,
    resumedFrom:args.resume?{path:resolve(args.resume),sha256:sha(args.resume),
      executionSha256:existsSync(join(dirname(args.resume),'execution.json'))?sha(join(dirname(args.resume),'execution.json')):null}:null});
}
export function verifyPauseLineage(out){
  let current=resolve(out);const visited=new Set();
  // Bounded operational lineage; physiological receipt replay remains the frozen auditor's job.
  for(let n=0;n<128;n++){
    assert(!visited.has(current),'Cyclic pause lineage');visited.add(current);
    const metadataPath=join(current,'execution.json');
    if(!existsSync(metadataPath)){assert(n>0,'Missing operational execution identity');return;}
    const metadata=json(metadataPath),saved=join(current,'pause-registration.json');
    assert.equal(sha(saved),metadata.registrationSha256);
    assert.equal(metadata.registrationSha256,sha(registrationPath),'Unregistered pause execution');
    const registration=verifyPauseSources(join(current,'execution-sources'));
    assert.deepEqual(metadata.sources,registration.sources);
    if(!metadata.resumedFrom)return;
    assert.equal(sha(metadata.resumedFrom.path),metadata.resumedFrom.sha256,'Changed parent publication');
    if(metadata.resumedFrom.executionSha256)assert.equal(sha(join(dirname(metadata.resumedFrom.path),'execution.json')),metadata.resumedFrom.executionSha256);
    current=dirname(metadata.resumedFrom.path);
  }
  throw Error('Pause lineage exceeds 128 invocations; review required');
}
export function pauseAtLesson(args,state,publication){
  const requestPath=args['pause-file']??join(args.out,'pause-request.json');
  if(!existsSync(requestPath))return;
  const request=json(requestPath);
  assert.equal(request.schema,1);assert.equal(resolve(request.run),resolve(args.out));
  assert.equal(request.protocolHash,sha(args.protocol),'Pause request belongs to another protocol');
  assert.equal(state.pendingReceipt,null);assert.equal(state.session?.pending??null,null);
  atomic(join(args.out,'paused.json'),{schema:1,phase:'training',run:resolve(args.out),
    protocolHash:sha(args.protocol),checkpoint:resolve(publication),checkpointSha256:sha(publication),
    lessonsInStage:state.lesson,receiptCount:state.receiptCount,elapsedSeconds:process.uptime(),
    pausedAt:new Date().toISOString()});
  console.log(JSON.stringify({status:'Paused after saved lesson',paused:true}));process.exit(0);
}
export function pauseAudit(out,protocolPath,lessons){
  const requestPath=join(out,'pause-request.json');
  if(!existsSync(requestPath))return;
  const request=json(requestPath);assert.equal(request.schema,1);
  assert.equal(resolve(request.run),resolve(out));assert.equal(request.protocolHash,sha(protocolPath));
  atomic(join(out,'paused-audit.json'),{schema:1,phase:'audit',run:resolve(out),
    protocolHash:sha(protocolPath),resultSha256:sha(join(out,'result.json')),lessons,
    pausedAt:new Date().toISOString()});
  console.log(JSON.stringify({status:'Verification paused; training results saved',paused:true}));process.exit(0);
}

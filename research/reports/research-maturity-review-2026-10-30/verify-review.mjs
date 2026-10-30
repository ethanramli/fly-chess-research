// Bounded report validation. Reads report prose and selected source bytes, never sealed rows or graph data.
import {existsSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
const failures=[],sources=new Set(),checkedLinks=[];
const documents=readdirSync(here).filter(name=>name.endsWith('.md')&&name!=='commands.md');
for(const name of documents){
  const path=resolve(here,name),text=readFileSync(path,'utf8');
  for(const [,raw] of text.matchAll(/\]\(([^\s)]+)\)/g)){
    if(/^(?:https?:|#)/.test(raw))continue;
    const target=resolve(dirname(path),decodeURIComponent(raw.split('#')[0]));
    checkedLinks.push({from:name,target:relative(root,target).replaceAll('\\','/')});
    // This invocation publishes its own receipt after checking the prose.
    if(!existsSync(target)&&target!==resolve(here,'review-verification.json'))failures.push({from:name,target:raw});
    else if(existsSync(target)&&statSync(target).isFile()&&/\.(?:mjs|py)$/.test(target)&&!target.startsWith(here))sources.add(target);
  }
}
const comparator=JSON.parse(readFileSync(resolve(here,'training-shortcut-output.json'),'utf8'));
if(comparator.counts.boardCorrect!==24||comparator.counts.correct!==390||comparator.errors.length)failures.push('Comparator result mismatch');
const testBytes=readFileSync(resolve(here,'bounded-followup-tests.txt'));
const tests=testBytes.subarray(0,2).equals(Buffer.from([255,254]))?testBytes.subarray(2).toString('utf16le'):testBytes.toString('utf8');
if(!/# tests 22/.test(tests)||!/# pass 22/.test(tests)||!/# fail 0/.test(tests))failures.push('Bounded test result mismatch');
const register=readFileSync(resolve(here,'issue-register.md'),'utf8');
const ids=[...register.matchAll(/^\| (M\d+) \|/gm)].map(match=>match[1]);
if(ids.length!==40||new Set(ids).size!==40)failures.push('Issue register count mismatch');
for(const name of documents)if(/\b(?:in progress|not yet a completed review|Working assessment)\b/i.test(readFileSync(resolve(here,name),'utf8')))failures.push({staleDraftLabel:name});
const report={checkedAt:new Date().toISOString(),scope:'Report links, issue IDs, saved comparator/test arithmetic and selected source hashes at review closure; not executed-byte provenance for historical runs',
  documents:documents.length,localLinks:checkedLinks.length,issues:ids.length,failures,
  r15AuditPublishedAtCheck:existsSync(resolve(root,'runs/lichess-stage1-synthetic-v1-full-r15/audit.json')),
  sourceHashes:[...sources].sort().map(path=>({path:relative(root,path).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))};
writeFileSync(resolve(here,'review-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({documents:report.documents,localLinks:report.localLinks,issues:report.issues,failures,r15AuditPublishedAtCheck:report.r15AuditPublishedAtCheck,sourceHashes:report.sourceHashes.length}));
if(failures.length)process.exitCode=1;

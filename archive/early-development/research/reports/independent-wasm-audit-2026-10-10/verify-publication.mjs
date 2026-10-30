import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('.',import.meta.url),c=JSON.parse(readFileSync(new URL('completion.json',dir)));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const [p,h] of Object.entries(c.files))assert.equal(hash(new URL(p.replaceAll('\\','/'),dir)),h,p);
for(const [p,h] of Object.entries(c.sources))assert.equal(hash(p),h,p);
assert.equal(c.auditCompleted,true);assert.equal(c.implementationRepaired,false);
const result={timestamp:new Date().toISOString(),passed:true,originalCompletionSHA256:hash(new URL('completion.json',dir)),
  artifactHashesVerified:Object.keys(c.files).length,sourceHashesVerified:Object.keys(c.sources).length,
  additionalMistakeRecord:'publication-addendum.md',additionalMistakeRecordSHA256:hash(new URL('publication-addendum.md',dir)),
  verificationSourceSHA256:hash(new URL('verify-publication.mjs',dir)),scope:'Final read-only hash verification of all originally published audit artifacts and implementation sources; audit complete, implementation defects remain unresolved'};
writeFileSync(new URL('completion-verification.json',dir),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify(result));

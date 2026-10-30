// Validation-only Stage 1 smoke audit (2026-10-28, ledger L056-L057). For engineering smokes only:
// the same independent full neural replay as the registered audit (auditLichessCurriculumStageMatrix
// with the registration's pinned runtime factory), with the acceptance evaluator replaced by
// lichess-stage1-acceptance-evaluator-v3.mjs. That evaluator stops after the validation-only checkpoint
// selection and never opens the sealed final set. The result must belong to the given registration;
// only the evaluator reference differs, and the output records both evaluator hashes. Same resource
// guard and CPU pacing as runner v3. Usage (repo root):
//   node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-stage1-validation-only.mjs \
//     --registration PATH --result RUN/result.json --out NEW_DIR
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import os from 'node:os';
import {auditLichessCurriculumStageMatrix} from '../../src/puzzle-learning/lichess-curriculum-matrix-v2.mjs';

const EVALUATOR='.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v3.mjs';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const args=parseArgs({options:{registration:{type:'string'},result:{type:'string'},out:{type:'string'}}}).values;
assert(args.registration&&args.result&&args.out,'Usage: --registration PATH --result PATH --out NEW_DIR');
assert(process.execArgv.includes('--max-old-space-size=256'),'Launch with the pinned 256 MiB Node heap limit');
const registrationBytes=readFileSync(args.registration),registration=JSON.parse(registrationBytes);
const result=JSON.parse(readFileSync(args.result,'utf8'));
assert.equal(result.registrationSha256,sha256(registrationBytes),'Result belongs to another registration');
assert.equal(registration.stage,1);
const factoryPath=resolve(registration.runtimeFactory.path);
assert.equal(sha256(readFileSync(factoryPath)),registration.runtimeFactory.sha256,'Pinned runtime factory changed');
assert(!existsSync(args.out),'Use a fresh output directory');mkdirSync(args.out,{recursive:true});
const limits={rssMiB:2048,freeMiB:256};
const guard=()=>{const rss=process.memoryUsage().rss/2**20,free=os.freemem()/2**20;
  if(rss>limits.rssMiB||free<limits.freeMiB)throw Error(`resource-guard rssMiB=${rss.toFixed(1)} freeMiB=${free.toFixed(1)}`);};
const pace=async elapsedMs=>{let remaining=elapsedMs;while(remaining>0){guard();const d=Math.min(250,remaining);
  await new Promise(done=>setTimeout(done,d));remaining-=d;}guard();};   // duty 0.5: wait as long as the work took
const evaluatorRef={path:EVALUATOR,sha256:sha256(readFileSync(EVALUATOR))};
const swapped={...registration,stageAcceptanceEvaluator:evaluatorRef};
const factory=await import(pathToFileURL(factoryPath).href);guard();
const outputPath=join(args.out,'validation-audit.json');
const audit=await auditLichessCurriculumStageMatrix({resultPath:resolve(args.result),outputPath,
  createReplayArm:entry=>factory.createReplayArm({entry,registration,guard,pace}),
  deriveAcceptanceEvidence:input=>factory.deriveAcceptanceEvidence({...input,registration:swapped,trainingPhases:null,guard,pace}),guard,pace});
process.stdout.write(JSON.stringify({status:audit.status,stage:audit.stage,stageAccepted:audit.stageAccepted,output:outputPath,
  registeredEvaluator:registration.stageAcceptanceEvaluator,validationOnlyEvaluator:evaluatorRef,
  scope:'Engineering smoke: validation-only audit; the sealed final set was not opened'})+'\n');

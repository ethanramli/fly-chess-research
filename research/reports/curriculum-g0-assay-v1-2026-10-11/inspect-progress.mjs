// Read completed immutable publications only; never load the graph or alter the run.
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
const dir=process.argv[2]??'runs/curriculum-g0-assay-v1-resumed';
const file=readdirSync(dir).filter(f=>/^checkpoint-\d+\.json\.gz$/.test(f)).sort().at(-1);
const state=JSON.parse(gunzipSync(readFileSync(join(dir,file)),{maxOutputLength:16*2**20}).toString());
const completed=[];
for(const [arm,result] of Object.entries(state.arms))for(const [phase,r] of Object.entries(result.phases))
  completed.push({arm,phase,correct:r.correct,meanMargin:r.meanMargin});
console.log(JSON.stringify({checkpoint:file,terminal:existsSync(join(dir,'result.json')),replica:state.replica,
  phase:['acquisition','interference','reversal'][state.phase],condition:['informative','absent','shuffled','disabled'][state.arm],
  lesson:state.lesson,frame:state.session?.pending?.cursor,receipts:state.receiptCount,completed,phaseResults:state.results}));

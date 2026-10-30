// Equivalence check for runner v5 one-replica training: memory hashes at each stage checkpoint must equal the
// serial run's. Usage: node compare-checkpoints.cjs SERIAL_ATTEMPT_DIR PARALLEL_ATTEMPT_DIR
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const read=(d,f)=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(d,f)))).state;
const [serial,parallel]=process.argv.slice(2);
const files=fs.readdirSync(parallel).filter(f=>/^stage-checkpoint-\d+\.json\.gz$/.test(f)).sort();
let same=0;
for(const f of files){const a=read(serial,f),b=read(parallel,f);
  const row={checkpoint:f,initialMemory:a.initialMemorySha256===b.initialMemorySha256,memory:a.memorySha256===b.memorySha256,
    selectionPlan:a.block?.session?.selectionPlanIdentity===b.block?.session?.selectionPlanIdentity,identityLabel:a.identity===b.identity};
  if(row.initialMemory&&row.memory)same++;console.log(JSON.stringify(row));}
console.log(JSON.stringify({checkpoints:files.length,memoryIdentical:same,equivalent:files.length>0&&same===files.length}));

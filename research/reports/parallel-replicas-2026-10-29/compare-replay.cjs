// Equivalence check for matrix audit v2: a replica's split replay must equal the v1 audit's lineage audits.
// Usage: node compare-replay.cjs V1_AUDIT_JSON REPLAY_JSON
const fs=require('fs'),assert=require('assert');
const [v1Path,replayPath]=process.argv.slice(2),v1=JSON.parse(fs.readFileSync(v1Path,'utf8')),replay=JSON.parse(fs.readFileSync(replayPath,'utf8'));
const rows=Object.entries(replay.lineageAudits).map(([key,audit])=>{let equal=true;
  try{assert.deepStrictEqual(audit,v1.lineageAudits[key]);}catch{equal=false;}return {lineage:key,identical:equal};});
rows.forEach(r=>console.log(JSON.stringify(r)));
console.log(JSON.stringify({replica:replay.replica,lineages:rows.length,identical:rows.filter(r=>r.identical).length,equivalent:rows.length>0&&rows.every(r=>r.identical)}));

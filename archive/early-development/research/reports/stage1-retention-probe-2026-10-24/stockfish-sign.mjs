// Read-only, no-graph: in a retention-probe run, compare the delivered Stockfish
// pulse channel with the verified task outcome of the same event (PAM02 raises
// the cue's score, PPL103 lowers it), and check whether the two events of one
// lesson (failure move, success move on the same board) receive different signs.
// Usage: node research/reports/stage1-retention-probe-2026-10-24/stockfish-sign.mjs RUN_DIR
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

const run=process.argv[2]??'runs/stage1-retention-probe-v3-mover-value';
const counts={agree:0,oppose:0,none:0},byStatus={},lessons={sameChannel:0,differentChannel:0};
const currents=[];
for(const file of readdirSync(run).filter(name=>name.startsWith('probe-'))){
  const probe=JSON.parse(readFileSync(join(run,file),'utf8'));
  for(const lesson of probe.lessons){
    const pulses=lesson.events.map(event=>event.pulses.find(pulse=>pulse.phase==='stockfish'));
    lessons[pulses[0].channel===pulses[1].channel?'sameChannel':'differentChannel']++;
    lesson.events.forEach((event,index)=>{
      const channel=pulses[index].channel;currents.push(Number(pulses[index].current));
      const kind=channel===null?'none':(event.status==='success')===(channel==='PAM02')?'agree':'oppose';
      counts[kind]++;byStatus[`${event.status}:${kind}`]=(byStatus[`${event.status}:${kind}`]??0)+1;
    });
  }
}
currents.sort((a,b)=>a-b);
console.log(JSON.stringify({run,events:counts,byStatus,lessons,
  stockfishCurrent:{min:currents[0],median:currents[currents.length>>1],max:currents.at(-1),
    note:'current = 1.5*|delivered error|/2; 0.75 means |error| = 1, a saturated won/lost target'}}));

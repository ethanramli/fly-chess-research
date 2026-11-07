"""Read-only bounded monitor for foreground Python-action graph jobs; never restart."""
import argparse,json,time
from pathlib import Path
import curriculum
p=argparse.ArgumentParser();p.add_argument('--run',required=True);p.add_argument('--seconds',type=int,default=45);a=p.parse_args()
assert 0<=a.seconds<=50
run=Path(a.run);end=time.monotonic()+a.seconds;previous=None
while True:
 m=json.loads((run/'manifest.json').read_text());inv=curriculum.inventory()
 matches=[x for x in inv['processes'] if a.run.lower() in (x.get('command') or '').lower() and 'pilot.mjs' in (x.get('command') or '')]
 prog=json.loads((run/'progress.json').read_text()) if (run/'progress.json').exists() else None
 state='complete' if m.get('status')=='complete' and not matches else 'live' if len(matches)==1 else 'unknown'
 rec={'state':state,'processes':matches,'progress':prog,'freeMiB':inv['freeMiB']}
 mark=json.dumps({'state':state,'progress':prog},sort_keys=True)
 if mark!=previous:
  with Path('research/reports/overnight-eyes-reader-repair-2026-11-01/process-observations.jsonl').open('a') as f: f.write(json.dumps(rec)+'\n')
  print(json.dumps(rec),flush=True);previous=mark
 if state=='complete' or time.monotonic()>=end: break
 time.sleep(min(15,max(0,end-time.monotonic())))

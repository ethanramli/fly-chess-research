from pathlib import Path
import json,hashlib
R=Path('research/reports/overnight-eyes-reader-repair-2026-11-01')
s=(R/'audit-v2.mjs').read_text()
s=s.replace("        assert(/^[a-f0-9]{64}$/.test(r.graphSignIdentity));", "        const variant=JSON.parse(readFileSync(run+'/variant.json'));\n        assert.equal(r.graphSignIdentity,variant.graphSignIdentity); assert.equal(r.variant,variant.variant);")
(R/'audit-v2.mjs').write_text(s)
for v in ['released','curated']:
 c=json.loads(Path(f'python actions/overnight-mbon05-{v}-v1-step.json').read_text());c['name']+= '-audit-v2';c['state_file']=f'runs/python-actions/overnight-mbon05-{v}-audit-v2.json'
 c['pins']={str(R/'audit-v2.mjs'):hashlib.sha256((R/'audit-v2.mjs').read_bytes()).hexdigest()}
 c['jobs']={'audit':{'role':'check','argv':['node','--max-old-space-size=256',str(R/'audit-v2.mjs'),'--run',c['paths']['run'],'--out',c['paths']['run']+'/audit-v2.json']}}
 Path(f'python actions/overnight-mbon05-{v}-audit-v2-step.json').write_text(json.dumps(c,indent=2))
c['name']='overnight-full-reader';c['paths']['run']='runs/overnight-eyes-reader-2026-11-01/full-reader-v1';c['state_file']='runs/python-actions/overnight-full-reader.json';c['pins']={str(R/'check-full-reader.mjs'):hashlib.sha256((R/'check-full-reader.mjs').read_bytes()).hexdigest()};c['jobs']={'check':{'role':'check','argv':['node','--max-old-space-size=256',str(R/'check-full-reader.mjs'),c['paths']['run']]}}
Path('python actions/overnight-full-reader-step.json').write_text(json.dumps(c,indent=2))

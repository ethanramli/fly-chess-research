import json
from pathlib import Path
R=Path('research/reports/overnight-eyes-reader-repair-2026-11-01')
s=(R/'audit.mjs').read_text().replace('c.activity <= 6','c.activity <= 10')
(R/'audit-v2.mjs').write_text(s)
c=json.loads(Path('python actions/overnight-mbon05-released-v1-step.json').read_text())
c['name']='overnight-reader-software';c['pins']={};c['paths']['run']='runs/overnight-eyes-reader-2026-11-01/software';c['state_file']='runs/python-actions/overnight-reader-software.json'
c['jobs']={'regression':{'role':'check','argv':['npm','test']},'focused':{'role':'check','argv':['node','--max-old-space-size=256','--test','--test-concurrency=1',str(R/'adapter.test.mjs'),'.codebase/tests/neural-learning/neuron-reader.test.mjs','.codebase/tests/puzzle-learning/record-neuron-candidates.test.mjs']}}
Path('python actions/overnight-reader-software-step.json').write_text(json.dumps(c,indent=2))

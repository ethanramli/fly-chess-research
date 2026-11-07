"""Publish overnight closeout only from completed comparison and passing audits."""
from pathlib import Path
from datetime import datetime
import json,hashlib,os
R=Path('research/reports/overnight-eyes-reader-repair-2026-11-01');B=Path('runs/overnight-eyes-reader-2026-11-01')
data=json.loads((R/'comparison-results.json').read_text());raw=json.loads((B/'raw-score-audit-v1.json').read_text());assert raw['pass']
rows=[]
for v,d in data.items():
 s=d['summary'];assert d['audit']['status']=='audit-passed'
 rows.append(f"|{v}|{s['marks']['R4']['observed']['ratio']:.9f}|{', '.join(k for k,x in s['marks'].items() if not x['pass']) or 'none'}|{s['wall']:.2f}|{s['maxRssMiB']:.2f}|")
section='''
## Completed sign comparison and audits

[All phase/condition/association margins](comparison-results.md) and [machine-readable outcomes](comparison-results.json) preserve every negative result. Both variants use byte-identical stimuli. The unchanged R4 ratio threshold is 0.70; marks on one seed/two associations are descriptive applications of existing thresholds, not a cohort success.

|Variant|Delay retention ratio|Failed pilot marks|Wall seconds|Peak RSS MiB|
|---|---:|---|---:|---:|
'''+ '\n'.join(rows)+'''

[Raw-score audit](../../../runs/overnight-eyes-reader-2026-11-01/raw-score-audit-v1.json) regenerates each variant's naive calibration and exactly matches disabled-arm candidate rates. It separately recomputes 720 trial-score triples and 80 individual phase margins across original and restored traces (tolerance 1e-10). Local replay verifies every update frame in both variants (counts in each audit), original/restored state equality, all assigned consequence certificates, unknown-event omission and matched shuffle. The audits do not regenerate learned full-graph trajectories or validate physiological interpretation. Both auditors were authored here; separate arithmetic is not an independent human review.

The variant changes measured outcomes and margins but does not resolve target polarity. No accepted graph, physiological rule, production coefficient, version or scientific gate is promoted. Absent-feedback gains change under intrinsic dynamics in both variants; disabled gains remain fixed. This must not be described as all no-feedback parameters staying unchanged.

## Execution receipts and commands

Every launched graph process is terminal before closeout. [Invocation receipts](execution-receipts.json) preserve exact argv, PID and exit codes; [bounded birth/command observations](process-observations.jsonl) document serial ownership. Each run's manifest pins its graph/model/memory/input/source identities, and [new-source hashes](source-identities.json) identify the reviewable adapter/checks. Resource guards remain heap 256 MiB, RSS 2048 MiB, free system memory >=256 MiB, duty .5. Pacing is not an OS hard CPU cap; these timings are not a speed comparison.

The reusable registered commands are `fly.cmd --config CONFIG run JOB`:

|CONFIG (under `python actions/`)|JOB|
|---|---|
|`overnight-mbon05-released-v1-step.json`|`compare`|
|`overnight-mbon05-curated-v1-step.json`|`compare`|
|`overnight-mbon05-released-audit-v2-step.json`|`audit`|
|`overnight-mbon05-curated-audit-v2-step.json`|`audit`|
|`overnight-full-reader-step.json`|`check`|
|`overnight-raw-score-audit-step.json`|`audit`|
|`overnight-reader-software-step.json`|`focused` and `regression`|

Completed output directories are immutable; do not rerun those compare jobs into existing paths. The one-off static command was `node --max-old-space-size=256 .codebase/scripts/neural-learning/check-neuron-reader.mjs --out runs/overnight-eyes-reader-2026-11-01/reader-static-v1`. The overlay check was `node --max-old-space-size=256 research/reports/overnight-eyes-reader-repair-2026-11-01/check-overlay.mjs`. Fresh runs need new registrations and preserved pins, not silent restarts.
'''
p=R/'REPORT.md';s=p.read_text();s=s.replace('# Overnight report — working conclusion, pending curated publication and final audits','# Overnight Eyes / graph / neuron-reader report');s=s.replace('Complete results and independent raw-score audit linked below when terminal.','Complete results and separate raw-score audit are linked below.');s+=section+'\nClosed '+datetime.now().astimezone().isoformat()+'. Stopped under the evidence-backed completion/blocker conditions, within the approximately eight-hour ceiling.\n';p.write_text(s)
receipts=[]
for inv in sorted(Path('runs/python-actions').glob('20261101T15*')):
 c=inv/'config.json';done=inv/'completion.json'
 if c.exists() and json.loads(c.read_text()).get('name','').startswith('overnight-') and done.exists():
  receipts.append({'invocation':str(inv),'config':json.loads(c.read_text()),'completion':json.loads(done.read_text())})
(R/'execution-receipts.json').write_text(json.dumps(receipts,indent=2))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=list(R.glob('*.mjs'))+list(Path('python actions').glob('*overnight*.py'))+list(Path('python actions').glob('overnight-*-step.json'))
(R/'source-identities.json').write_text(json.dumps({str(p):sha(p) for p in files},indent=2))
print(json.dumps({'published':str(R/'REPORT.md'),'receipts':len(receipts)}))

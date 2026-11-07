"""Publish complete per-association sign-comparison tables; never select or restart a model."""
from pathlib import Path
import json,hashlib
R=Path('research/reports/overnight-eyes-reader-repair-2026-11-01');B=Path('runs/overnight-eyes-reader-2026-11-01')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
lines=['# MBON05 complete descriptive results','','Seed 4101; two arbitrary associations; engineering pilot only. Margins use the unchanged per-variant relative-response calibration. All phases, conditions and associations are below. A positive margin is a correct ranking, including the initial untrained other item; it is not proof of acquisition.','','|Variant|Control|Phase|Association 0 margin|Association 1 margin|','|---|---|---|---:|---:|']
result={}
for v in ['released','curated']:
 d=B/f'mbon05-{v}-v1';s=json.loads((d/'summary.json').read_text());audit=json.loads((d/'audit-v2.json').read_text());assert audit['status']=='audit-passed'
 rows=[json.loads(x) for x in (d/'records.jsonl').read_text().splitlines()]
 if v=='curated':lines+=['|Variant|Control|Phase|Association 0 margin|Association 1 margin|','|---|---|---|---:|---:|']
 for r in rows:
  for phase,items in r['tests'].items():lines.append(f"|{v}|{r['arm']}|{phase}|{items[0]['mNorm']:.9f}|{items[1]['mNorm']:.9f}|")
 result[v]={'summary':s,'rows':rows,'audit':audit,'stimuliSha256':sha(d/'stimuli.json')}
 lines+=['',f'## {v}', '',f"Wall {s['wall']:.2f} seconds; reported peak RSS {s['maxRssMiB']:.2f} MiB. Local audit jointPass={audit['jointPass']}. This is not a six-seed gate or biological pass.",'',f"[Raw summary](../../../{d.as_posix()}/summary.json), [all trial/frame receipts](../../../{d.as_posix()}), [separate replay](../../../{d.as_posix()}/audit-v2.json).",'']
assert result['released']['stimuliSha256']==result['curated']['stimuliSha256'],'Stimuli changed'
(R/'comparison-results.md').write_text('\n'.join(lines)+'\n');(R/'comparison-results.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'sameStimuli':True,'variants':{v:{'marks':{k:x['pass'] for k,x in d['summary']['marks'].items()},'wallSeconds':d['summary']['wall'],'maxRssMiB':d['summary']['maxRssMiB']} for v,d in result.items()}}))

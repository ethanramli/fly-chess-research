from pathlib import Path
import json,re
R=Path('research/reports/overnight-eyes-reader-repair-2026-11-01')
p=Path('runs/python-actions/20261101T150232-f2928744/stdout.txt')
s=p.read_text();fails=re.findall(r'^not ok \d+ - (.+)$',s,re.M)
old=json.loads(Path('research/reports/neuron-reader-build-2026-10-31/historical-failure-comparison.json').read_text())['failures']
norm=lambda x:x.replace('\\\\','/').replace('\\','/').replace('C:/Users/ethan/Documents/fly-chess-research/','')
res={'regression':{'tests':767,'pass':761,'fail':6,'exitCode':1,'stdout':str(p),'failures':fails,'sameHistoricalNames':sorted(map(norm,fails))==sorted(map(norm,old))},'focused':{'tests':13,'pass':13,'fail':0,'stdout':'runs/python-actions/20261101T150319-8e43b637/stdout.txt'}}
(R/'software-verification.json').write_text(json.dumps(res,indent=2));print(json.dumps(res))

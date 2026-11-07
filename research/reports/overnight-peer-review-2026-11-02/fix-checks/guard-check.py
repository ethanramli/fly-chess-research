# Peer-review fix check 2026-11-03: repeat primary-feedback-audit/check-guards.py on the fixed plan(); no process is launched.
import importlib.util, json, sys
from pathlib import Path
root = Path.cwd(); sys.path.insert(0, str(root / 'python actions'))
spec = importlib.util.spec_from_file_location('curriculum', root / 'python actions/curriculum.py')
actions = importlib.util.module_from_spec(spec); spec.loader.exec_module(actions)
registration = json.loads((root / 'python actions/long-term-memory-v1-live-pilot-v1-step.json').read_text())
registration['paused'] = True
registration['jobs']['compare']['refuse_existing'] = []  # fresh-run scenario, as in the review
actions.verify = lambda c: []
actions.local = lambda p: root / 'research/reports/overnight-peer-review-2026-11-02/fix-checks/nonexistent'
busy = {'freeMiB': 0, 'processes': [{'name': 'node.exe', 'pid': 123, 'command': 'node --max-old-space-size=256 .codebase/scripts/neural-learning/compare-long-term-memory-v1.mjs --cpu-duty 0.5'}]}
# The review's mock line had no path; a real launch line (as above) is what the process check sees.
result = actions.plan(registration, 'compare', busy)
assert not result['ready']
assert any('research paused' in b for b in result['blockers'])
assert any('less than 256 MiB' in b for b in result['blockers'])
assert any('PID123' in b for b in result['blockers'])
receipt = {'status': 'passed', 'readyDespitePausedAndBusy': False, 'blockers': result['blockers'],
           'scope': 'fixed plan(); mocked matching pins and fresh paths, as in the review; no process launched',
           'command': 'C:/Users/ethan/.venv-class/Scripts/python.exe research/reports/overnight-peer-review-2026-11-02/fix-checks/guard-check.py'}
(Path(__file__).parent / 'guard-check.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))

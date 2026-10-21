"""Freeze the independent checker and register explicit serial fallback commands."""
from pathlib import Path
import json
import subprocess

import curriculum as actions

ROOT = Path(__file__).resolve().parent.parent
PROTOCOL = 'research/data/training-latency-runtime-comparison-v2/protocol.json'
RUNNER = '.codebase/scripts/evaluation-and-performance/profile-g0-training-runtime-fixed.mjs'
AUDITOR = '.codebase/scripts/evaluation-and-performance/audit-training-runtime.mjs'
AUDIT_PROTOCOL = 'research/data/training-latency-runtime-audit-v1/protocol.json'
OUT = 'research/reports/training-latency-2026-10-19/runtime-comparison-v2'
CAMPAIGN = 'python actions/runtime-latency-campaign.json'
protocol = actions.read_json(ROOT / PROTOCOL)
sources = [AUDITOR, '.codebase/scripts/evaluation-and-performance/audit-training-latency.mjs',
           'python actions/run_runtime_latency.py', 'python actions/run_latency_campaign.py',
           'python actions/curriculum.py', 'python actions/prepare_runtime_latency_steps.py']
audit = {'schema': 'training-latency-runtime-audit-v1', 'trainingProtocolSha256': actions.digest(ROOT / PROTOCOL),
         'runner': RUNNER, 'neurons': 134209, 'sources': {path: actions.digest(ROOT / path) for path in sources}}
configs = []
for batch in protocol['batches']:
    path = f"python actions/runtime-latency-{batch['id']}.json"
    config = {'schema': 1, 'name': 'runtime-latency-v2-' + batch['id'], 'paused': False,
              'paths': {'protocol': PROTOCOL, 'runner': RUNNER, 'run': OUT + '/' + batch['id'],
                        'runtime': protocol['runtimes'][batch['variant']]['binary']},
              'state_file': f"runs/python-actions/runtime-latency-{batch['id']}-current.json",
              'pins': {'{protocol}': actions.digest(ROOT / PROTOCOL), '{runner}': actions.digest(ROOT / RUNNER)},
              'artifacts': {'report': '{run}/report.json'},
              'jobs': {'profile': {'role': 'train', 'argv': ['{runtime}', '--max-old-space-size=256', '{runner}',
                       '--protocol', '{protocol}', '--out', '{run}', '--variant', batch['variant'], '--round', str(batch['round']),
                       '--cpu-duty', '0.5'], 'requires': ['{protocol}', '{runner}'], 'fresh_output': '{run}'}}}
    configs.append((path, config, batch['id']))
audit_config_path = 'python actions/runtime-latency-audit.json'
audit_config = {'schema': 1, 'name': 'runtime-latency-independent-audit-v1', 'paused': False,
                'paths': {'protocol': PROTOCOL, 'runner': AUDITOR, 'run': OUT, 'auditProtocol': AUDIT_PROTOCOL},
                'state_file': 'runs/python-actions/runtime-latency-audit-current.json',
                'pins': {'{protocol}': actions.digest(ROOT / PROTOCOL), '{runner}': actions.digest(ROOT / AUDITOR)},
                'artifacts': {'audit': '{run}/timing-audit.json'},
                'jobs': {'audit': {'role': 'audit', 'argv': ['node', '--max-old-space-size=256', '{runner}', '--out', '{run}',
                          '--protocol', '{auditProtocol}', '--cpu-duty', '0.5'],
                          'requires': ['{run}/batch-index.json', '{run}/protocol.json'],
                          'refuse_existing': ['{run}/timing-audit.json']}}}
targets = [AUDIT_PROTOCOL, CAMPAIGN, audit_config_path, *[path for path, _, _ in configs]]
if any((ROOT / path).exists() for path in targets):
    raise ValueError('Preserve existing fallback preparation; choose a new registration version')
subprocess.run([protocol['runtimes']['json6']['binary'], '--check', str(ROOT / AUDITOR)],
               capture_output=True, check=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
for path, value in [(AUDIT_PROTOCOL, audit), *[(path, value) for path, value, _ in configs]]:
    (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
    with (ROOT / path).open('x') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')
audit_config['pins']['{auditProtocol}'] = actions.digest(ROOT / AUDIT_PROTOCOL)
with (ROOT / audit_config_path).open('x') as stream:
    json.dump(audit_config, stream, indent=2)
    stream.write('\n')
campaign = {'schema': 1, 'protocol': PROTOCOL, 'run': OUT,
            'prerequisite': 'research/reports/training-latency-2026-10-19/pipeline-v3/timing-audit.json',
            'profiles': [{'id': ident, 'config': path, 'sha256': actions.digest(ROOT / path)} for path, _, ident in configs],
            'audit': {'config': audit_config_path, 'sha256': actions.digest(ROOT / audit_config_path)},
            'sources': {path: actions.digest(ROOT / path) for path in [*sources, PROTOCOL, AUDIT_PROTOCOL]}}
with (ROOT / CAMPAIGN).open('x') as stream:
    json.dump(campaign, stream, indent=2)
    stream.write('\n')
print(json.dumps({'prepared': CAMPAIGN, 'batches': len(configs), 'graphLaunched': False,
                  'scope': 'Explicit fallback only; existing v3 campaign unchanged and no new queue started'}))

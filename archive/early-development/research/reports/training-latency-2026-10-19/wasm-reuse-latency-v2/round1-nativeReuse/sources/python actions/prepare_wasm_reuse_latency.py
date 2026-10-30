"""Register the compiled-classification ablation; preserve the failed JS trial."""
from pathlib import Path
import json
import hashlib

ROOT = Path(__file__).resolve().parent.parent
RUNNER = '.codebase/scripts/evaluation-and-performance/profile-wasm-reuse-latency.mjs'
AUDITOR = '.codebase/scripts/evaluation-and-performance/audit-wasm-reuse-latency.mjs'
DRIVER = 'python actions/run_wasm_reuse_latency.py'
PROTOCOL = 'research/data/wasm-reuse-latency-v2/protocol.json'
AUDIT_PROTOCOL = 'research/data/wasm-reuse-latency-audit-v2/protocol.json'
CAMPAIGN = 'python actions/wasm-reuse-latency-campaign-v2.json'
OUT = 'research/reports/training-latency-2026-10-19/wasm-reuse-latency-v2'
assert not any((ROOT / p).exists() for p in [RUNNER, AUDITOR, DRIVER, PROTOCOL, AUDIT_PROTOCOL, CAMPAIGN])


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(path, value):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8') as f:
        f.write(value if isinstance(value, str) else json.dumps(value, indent=2) + '\n')


runner = (ROOT / '.codebase/scripts/evaluation-and-performance/profile-exact-reuse-latency.mjs').read_text()
assert runner.count('trainer-reuse-candidate.mjs') == 1
runner = runner.replace('trainer-reuse-candidate.mjs', 'trainer-reuse-wasm-candidate.mjs')
runner = runner.replace('exact-reuse-latency-v1', 'wasm-reuse-latency-v2')
save(RUNNER, runner)
old_auditor = (ROOT / '.codebase/scripts/evaluation-and-performance/audit-exact-reuse-latency.mjs').read_text()
auditor = old_auditor.replace('exact-reuse-latency-v1', 'wasm-reuse-latency-v2').replace('exact-reuse-latency-audit-v1', 'wasm-reuse-latency-audit-v2')
# Existing four arithmetic fixtures cover the byte-identical calculation function.
assert auditor.split('async function main() {')[0] == old_auditor.split('async function main() {')[0]
save(AUDITOR, auditor)
driver = (ROOT / 'python actions/run_exact_reuse_latency.py').read_text()
assert driver.count('runtime-latency-campaign.json') == 0
driver = driver.replace('exact-reuse-latency-campaign.json', 'wasm-reuse-latency-campaign-v2.json')
driver = driver.replace("!= 2100", "!= 2184").replace('completed independently verified v3 comparison first', 'completed independently verified JS reuse comparison first')
save(DRIVER, driver)
old = json.loads((ROOT / 'research/data/exact-reuse-latency-v1/protocol.json').read_text())
sources = [RUNNER, AUDITOR, DRIVER, 'python actions/prepare_wasm_reuse_latency.py',
           '.codebase/src/runtime/sparse-accumulator-reuse-wasm-candidate.mjs',
           '.codebase/src/runtime/frame-reuse-cache-wasm-candidate.mjs',
           '.codebase/src/supervised-baselines/trainer-reuse-wasm-candidate.mjs',
           'python actions/prepare_wasm_reuse_candidate.py']
protocol = {**old, 'schema': 'wasm-reuse-latency-v2',
            'scope': 'Same Node26/native checkpoints; compiled exact dependency classification ablation, not whole curriculum',
            'sources': {**old['sources'], **{p: sha(ROOT / p) for p in sources}}}
save(PROTOCOL, protocol)
old_audit = json.loads((ROOT / 'research/data/exact-reuse-latency-audit-v1/protocol.json').read_text())
audit = {**old_audit, 'schema': 'wasm-reuse-latency-audit-v2', 'runner': RUNNER,
         'trainingProtocolSha256': sha(ROOT / PROTOCOL),
         'sources': {**old_audit['sources'], **{p: sha(ROOT / p) for p in sources}}}
save(AUDIT_PROTOCOL, audit)
profiles = []
for batch in protocol['batches']:
    old_path = ROOT / f"python actions/exact-reuse-latency-{batch['id']}.json"
    config = json.loads(old_path.read_text())
    path = f"python actions/wasm-reuse-latency-{batch['id']}-v2.json"
    config['name'] = 'wasm-reuse-v2-' + batch['id']
    config['paths'].update({'runner': RUNNER, 'protocol': PROTOCOL, 'run': OUT + '/' + batch['id']})
    config['state_file'] = f"runs/python-actions/wasm-reuse-latency-{batch['id']}-v2-current.json"
    config['pins'] = {'{runner}': sha(ROOT / RUNNER), '{protocol}': sha(ROOT / PROTOCOL)}
    config['jobs']['runner-syntax'] = {'role': 'check', 'argv': ['{runtime}', '--check', '{runner}']}
    save(path, config); profiles.append({'id': batch['id'], 'config': path, 'sha256': sha(ROOT / path)})
path = 'python actions/wasm-reuse-latency-audit-v2.json'
config = json.loads((ROOT / 'python actions/exact-reuse-latency-audit.json').read_text())
config['name'] = 'wasm-reuse-independent-audit-v2'
config['paths'].update({'runner': AUDITOR, 'protocol': PROTOCOL, 'auditProtocol': AUDIT_PROTOCOL, 'run': OUT})
config['state_file'] = 'runs/python-actions/wasm-reuse-latency-audit-v2-current.json'
config['pins'] = {'{runner}': sha(ROOT / AUDITOR), '{protocol}': sha(ROOT / PROTOCOL), '{auditProtocol}': sha(ROOT / AUDIT_PROTOCOL)}
save(path, config)
save(CAMPAIGN, {'schema': 1, 'protocol': PROTOCOL, 'run': OUT,
     'prerequisite': 'research/reports/training-latency-2026-10-19/exact-reuse-latency-v1/timing-audit.json',
     'profiles': profiles, 'audit': {'config': path, 'sha256': sha(ROOT / path)},
     'sources': {**{p: sha(ROOT / p) for p in sources},
                 PROTOCOL: sha(ROOT / PROTOCOL), AUDIT_PROTOCOL: sha(ROOT / AUDIT_PROTOCOL),
                 '.codebase/scripts/evaluation-and-performance/audit-exact-reuse-publications.mjs': sha(ROOT / '.codebase/scripts/evaluation-and-performance/audit-exact-reuse-publications.mjs'),
                 'python actions/curriculum.py': sha(ROOT / 'python actions/curriculum.py'),
                 'python actions/run_latency_campaign.py': sha(ROOT / 'python actions/run_latency_campaign.py')}})
print(json.dumps({'prepared': CAMPAIGN, 'runnerSha256': sha(ROOT / RUNNER), 'launched': False,
                  'arithmeticFunctionUnchanged': True, 'gates': protocol['gates']}))

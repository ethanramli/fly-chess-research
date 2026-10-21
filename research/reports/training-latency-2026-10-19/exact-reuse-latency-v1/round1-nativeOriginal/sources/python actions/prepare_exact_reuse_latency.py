"""Freeze a fresh ABBA ablation: same Node26/native persistence, only row reuse differs."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
RUNNER = '.codebase/scripts/evaluation-and-performance/profile-exact-reuse-latency.mjs'
HELPER = '.codebase/scripts/evaluation-and-performance/audit-exact-reuse-publications.mjs'
AUDITOR = '.codebase/scripts/evaluation-and-performance/audit-exact-reuse-latency.mjs'
DRIVER = 'python actions/run_exact_reuse_latency.py'
PROTOCOL = 'research/data/exact-reuse-latency-v1/protocol.json'
AUDIT_PROTOCOL = 'research/data/exact-reuse-latency-audit-v1/protocol.json'
CAMPAIGN = 'python actions/exact-reuse-latency-campaign.json'
OUT = 'research/reports/training-latency-2026-10-19/exact-reuse-latency-v1'
assert not any((ROOT / p).exists() for p in [RUNNER, HELPER, AUDITOR, DRIVER, PROTOCOL, AUDIT_PROTOCOL, CAMPAIGN])


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def replace(source, before, after):
    assert source.count(before) == 1, before
    return source.replace(before, after)


def labels(source):
    return source.replace('nativeZstd1', 'nativeReuse').replace('json6', 'nativeOriginal')


def save(path, value):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('x', encoding='utf-8') as stream:
        stream.write(value if isinstance(value, str) else json.dumps(value, indent=2) + '\n')


source = labels((ROOT / '.codebase/scripts/evaluation-and-performance/profile-g0-training-runtime-fixed.mjs').read_text(encoding='utf-8'))
source = source.replace('training-latency-runtime-comparison-v1', 'exact-reuse-latency-v1')
source = source.replace("variant === 'nativeOriginal'", 'false')  # Both persistence arms use native encoding.
source = source.replace('minPerConditionElapsedReduction: .4, minPooledElapsedReduction: .45',
                        'minPerConditionElapsedReduction: -.05, minPooledElapsedReduction: .05')
source = source.replace('minColdInvocationElapsedReduction: .45', 'minColdInvocationElapsedReduction: .05')
source = replace(source, "import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';",
                 "import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';\nimport {SparseTrainer as ReuseTrainer} from '../../src/supervised-baselines/trainer-reuse-candidate.mjs';")
source = replace(source, 'const model = new SparseTrainer(graph, p.model);',
                 "const Trainer = variant === 'nativeReuse' ? ReuseTrainer : SparseTrainer;\nconst model = new Trainer(graph, p.model);")
source = replace(source, "instrument(memory, 'snapshot', 'memorySnapshot');", """instrument(memory, 'snapshot', 'memorySnapshot');
if (model.frameReuseCache) {
  instrument(model.frameReuseCache, 'begin', 'reuseValidation');
  instrument(model.frameReuseCache, 'mask', 'reuseMask');
  instrument(model.frameReuseCache, 'commit', 'reuseReferenceCopy');
}""")
source = replace(source, "    const frame = await pace(() => timed('sessionStep', () => session.step()));", """    model.reuseSlot = session.pending.cursor;
    let frame;
    try {frame = await pace(() => timed('sessionStep', () => session.step()));}
    finally {model.reuseSlot = null;}""")
save(RUNNER, source)

old_helper = (ROOT / '.codebase/scripts/evaluation-and-performance/audit-training-latency.mjs').read_text(encoding='utf-8').split('async function main() {')[0]
helper = labels(old_helper)
helper = replace(helper, "beforeFiles = publications(baseline, '.json.gz')", "beforeFiles = publications(baseline, '.checkpoint')")
save(HELPER, helper)

auditor = labels((ROOT / '.codebase/scripts/evaluation-and-performance/audit-training-runtime.mjs').read_text(encoding='utf-8'))
auditor = auditor.replace("from './audit-training-latency.mjs'", "from './audit-exact-reuse-publications.mjs'")
auditor = auditor.replace('training-latency-runtime-comparison-v1', 'exact-reuse-latency-v1')
auditor = auditor.replace('training-latency-runtime-audit-v1', 'exact-reuse-latency-audit-v1')
auditor = auditor.replace('minPerConditionElapsedReduction: .4, minPooledElapsedReduction: .45',
                          'minPerConditionElapsedReduction: -.05, minPooledElapsedReduction: .05')
auditor = auditor.replace('minColdInvocationElapsedReduction: .45', 'minColdInvocationElapsedReduction: .05')
save(AUDITOR, auditor)

driver = (ROOT / 'python actions/run_runtime_latency.py').read_text(encoding='utf-8')
driver = replace(driver, "'python actions/runtime-latency-campaign.json'", "'python actions/exact-reuse-latency-campaign.json'")
save(DRIVER, driver)

old = json.loads((ROOT / 'research/data/training-latency-runtime-comparison-v2/protocol.json').read_text())
protocol = {**old, 'schema': 'exact-reuse-latency-v1',
            'scope': 'Same Node26/native checkpoints; isolated exact-row reuse ablation, not whole curriculum',
            'runtimes': {k: old['runtimes']['nativeZstd1'] for k in ['nativeOriginal', 'nativeReuse']},
            'batches': [{'id': f'round{r}-{v}', 'variant': v, 'round': r}
                        for r, v in [(0, 'nativeOriginal'), (0, 'nativeReuse'), (1, 'nativeReuse'), (1, 'nativeOriginal')]],
            'gates': {'minPerConditionElapsedReduction': -.05, 'minPooledElapsedReduction': .05,
                      'exactReceiptsAndStates': True, 'minColdInvocationElapsedReduction': .05}}
sources = [RUNNER, HELPER, AUDITOR, DRIVER, 'python actions/curriculum.py',
           'python actions/run_latency_campaign.py', 'python actions/prepare_exact_reuse_latency.py',
           '.codebase/src/runtime/frame-reuse-cache.mjs', '.codebase/src/runtime/sparse-accumulator-masked-candidate.mjs',
           '.codebase/src/supervised-baselines/trainer-reuse-candidate.mjs']
protocol['sources'] = {**old['sources'], **{p: sha(ROOT / p) for p in sources}}
save(PROTOCOL, protocol)
audit = {'schema': 'exact-reuse-latency-audit-v1', 'trainingProtocolSha256': sha(ROOT / PROTOCOL),
         'runner': RUNNER, 'neurons': 134209, 'sources': {p: sha(ROOT / p) for p in sources}}
save(AUDIT_PROTOCOL, audit)

configs = []
for batch in protocol['batches']:
    path = f"python actions/exact-reuse-latency-{batch['id']}.json"
    config = {'schema': 1, 'name': batch['id'], 'paused': False,
              'paths': {'runner': RUNNER, 'protocol': PROTOCOL, 'run': OUT + '/' + batch['id'],
                        'runtime': protocol['runtimes'][batch['variant']]['binary']},
              'state_file': f"runs/python-actions/exact-reuse-latency-{batch['id']}-current.json",
              'pins': {'{runner}': sha(ROOT / RUNNER), '{protocol}': sha(ROOT / PROTOCOL)},
              'artifacts': {'report': '{run}/report.json'},
              'jobs': {'profile': {'role': 'train', 'argv': ['{runtime}', '--max-old-space-size=256', '{runner}',
                       '--protocol', '{protocol}', '--out', '{run}', '--variant', batch['variant'],
                       '--round', str(batch['round']), '--cpu-duty', '0.5'],
                       'requires': ['{protocol}', '{runner}'], 'fresh_output': '{run}'}}}
    save(path, config); configs.append({'id': batch['id'], 'config': path, 'sha256': sha(ROOT / path)})
path = 'python actions/exact-reuse-latency-audit.json'
config = {'schema': 1, 'name': 'exact-reuse-independent-audit-v1', 'paused': False,
          'paths': {'runner': AUDITOR, 'protocol': PROTOCOL, 'auditProtocol': AUDIT_PROTOCOL, 'run': OUT,
                    'runtime': protocol['runtimes']['nativeOriginal']['binary']},
          'state_file': 'runs/python-actions/exact-reuse-latency-audit-current.json',
          'pins': {'{runner}': sha(ROOT / AUDITOR), '{protocol}': sha(ROOT / PROTOCOL), '{auditProtocol}': sha(ROOT / AUDIT_PROTOCOL)},
          'artifacts': {'audit': '{run}/timing-audit.json'},
          'jobs': {'audit': {'role': 'audit', 'argv': ['{runtime}', '--max-old-space-size=256', '{runner}',
                     '--out', '{run}', '--protocol', '{auditProtocol}', '--cpu-duty', '0.5'],
                     'requires': ['{run}/batch-index.json', '{run}/protocol.json'], 'refuse_existing': ['{run}/timing-audit.json']}}}
save(path, config)
save(CAMPAIGN, {'schema': 1, 'protocol': PROTOCOL, 'run': OUT,
     'prerequisite': 'research/reports/training-latency-2026-10-19/pipeline-v3/timing-audit.json',
     'profiles': configs, 'audit': {'config': path, 'sha256': sha(ROOT / path)},
     'sources': {p: sha(ROOT / p) for p in [*sources, PROTOCOL, AUDIT_PROTOCOL]}})
print(json.dumps({'prepared': CAMPAIGN, 'sourceSha256': sha(ROOT / RUNNER), 'launched': False,
                  'scope': protocol['scope'], 'gates': protocol['gates']}))

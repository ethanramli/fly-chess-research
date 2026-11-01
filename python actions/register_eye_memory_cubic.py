"""Pin the reviewed, fixed graph-memory development run; never launch or overwrite it."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
path = ROOT / 'python actions/eye-memory-cubic-v1-step.json'
assert not path.exists(), 'Preserve existing registration'
runner = '.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs'
spec = 'research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md'
run = 'runs/memory-retention-2026-11-01/eye-graph-memory-cubic-v1'
files = [runner, spec, '.codebase/scripts/neural-learning/audit-eye-memory.mjs',
         '.codebase/src/neural-learning/local-cubic-reservoir-memory.mjs',
         '.codebase/src/neural-learning/local-reservoir-memory.mjs',
         '.codebase/src/neural-learning/local-supralinear-reservoir-memory.mjs',
         '.codebase/src/neural-learning/local-gated-memory.mjs',
         '.codebase/tests/neural-learning/local-cubic-reservoir-memory.test.mjs',
         '.codebase/tests/neural-learning/eye-memory-audit.test.mjs',
         '.codebase/src/chess-input/eyes-v1.mjs', '.codebase/src/neural-learning/neuron-reader.mjs',
         '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv']
config = {
    'schema': 1, 'name': 'eye-memory-cubic-v1-development', 'paused': False,
    'paths': {'registration': path.relative_to(ROOT).as_posix(), 'run': run, 'protocol': spec},
    'pins': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in files},
    'state_file': 'runs/python-actions/current-eye-memory-cubic-v1.json',
    'resourceLimits': {'rssMiB': 2048, 'freeMiB': 256},
    'jobs': {
        'train': {'role': 'train', 'fresh_output': '{run}', 'argv': ['node', '--max-old-space-size=256', runner, '--out', '{run}', '--cpu-duty', '0.5']},
        'tests': {'role': 'check', 'argv': ['node', '--max-old-space-size=256', '--test', '--test-concurrency=1', files[7], files[8]]},
        'audit': {'role': 'check', 'requires': ['{run}/summary.json'], 'argv': ['node', '--max-old-space-size=256', files[2], '--run', '{run}', '--out', 'research/reports/memory-retention-continuation-2026-11-01/cubic-v1-audit.json']},
    },
    'artifacts': {'manifest': '{run}/manifest.json', 'summary': '{run}/summary.json'},
    'report_fields': [],
}
path.write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'registration': str(path.relative_to(ROOT)), 'pins': len(files), 'run': run}))

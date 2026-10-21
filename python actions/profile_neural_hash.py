"""Bounded paired offline state-hash pilot on the installed and cached runtimes."""
from pathlib import Path
import gzip
import hashlib
import json
import shutil
import statistics
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'research/reports/training-latency-2026-10-19/neural-hash-runtime-v1'
SCRIPT = ROOT / '.codebase/scripts/evaluation-and-performance/profile-neural-state-hash.mjs'
INPUTS = ROOT / 'research/reports/training-latency-2026-10-19/persistence-native/report.json'
RUNTIME = ROOT / 'research/data/training-latency-runtime-v1/runtime.json'


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


runtime = json.loads(RUNTIME.read_text())
runtimes = {'current': Path(shutil.which('node')), 'candidate': ROOT / runtime['binary']}
assert sha(runtimes['candidate']) == runtime['binarySha256']
inputs = json.loads(INPUTS.read_text())['inputs']
assert len(inputs) == 6
OUT.mkdir()
protocol = {'schema': 'neural-hash-runtime-v1', 'scope': 'Offline component only; concurrent audit; no graph, learning or overall speed claim',
            'inputs': inputs, 'rounds': 7, 'warmup': 1, 'duty': .5,
            'sources': {str(SCRIPT.relative_to(ROOT)): sha(SCRIPT), str(Path(__file__).relative_to(ROOT)): sha(Path(__file__))},
            'runtimeRegistrationSha256': sha(RUNTIME),
            'runtimes': {key: {'binary': str(path), 'sha256': sha(path)} for key, path in runtimes.items()},
            'gate': 'All canonical bytes identical; report observed timings including regressions'}
(OUT / 'protocol.json').write_text(json.dumps(protocol, indent=2) + '\n')
(OUT / 'source.mjs').write_bytes(SCRIPT.read_bytes())
samples, paired = [], []
try:
    for index, spec in enumerate(inputs):
        names = ['current', 'candidate'] if index % 2 == 0 else ['candidate', 'current']
        pair = {}
        for name in names:
            path = OUT / f"{spec['sequence']}-{name}.json"
            argv = [str(runtimes[name]), '--max-old-space-size=256', str(SCRIPT),
                    '--input', spec['path'], '--sha256', spec['sha256'], '--out', str(path), '--cpu-duty', '0.5']
            with path.with_suffix('.stdout.txt').open('w') as stdout, path.with_suffix('.stderr.txt').open('w') as stderr:
                subprocess.run(argv, cwd=ROOT, stdout=stdout, stderr=stderr, timeout=120, check=True,
                               creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            result = json.loads(path.read_text())
            assert result['node'] == ('v22.23.2' if name == 'current' else 'v26.12.0')
            assert result['sourceSha256'] == sha(SCRIPT) and result['inputSha256'] == spec['sha256']
            samples.append({'sequence': spec['sequence'], 'runtime': name, **result})
            pair[name] = result
        with gzip.open(str(OUT / f"{spec['sequence']}-current.json") + '.canonical.json.gz', 'rb') as stream:
            before = stream.read(16 * 2**20 + 1)
        with gzip.open(str(OUT / f"{spec['sequence']}-candidate.json") + '.canonical.json.gz', 'rb') as stream:
            after = stream.read(16 * 2**20 + 1)
        assert len(before) <= 16 * 2**20 and before == after
        assert pair['current']['canonicalSha256'] == pair['candidate']['canonicalSha256']
        paired.append({'sequence': spec['sequence'], 'currentMs': pair['current']['medianMs'],
                       'candidateMs': pair['candidate']['medianMs'],
                       'reduction': 1 - pair['candidate']['medianMs'] / pair['current']['medianMs']})
    report = {'scope': protocol['scope'], 'canonicalBytesIdentical': True, 'measuredHashes': 84,
              'paired': paired, 'medianReduction': statistics.median(row['reduction'] for row in paired),
              'peakRssMiB': max(row['peakRssMiB'] for row in samples), 'samples': samples,
              'protocolSha256': sha(OUT / 'protocol.json')}
    with (OUT / 'report.json').open('x') as stream:
        json.dump(report, stream, indent=2)
    print(json.dumps({key: report[key] for key in ('canonicalBytesIdentical', 'measuredHashes', 'paired', 'medianReduction', 'peakRssMiB', 'scope')}, separators=(',', ':')))
except (OSError, ValueError, AssertionError, subprocess.SubprocessError) as error:
    print(json.dumps({'error': str(error), 'preservedOutput': str(OUT)}))
    sys.exit(1)

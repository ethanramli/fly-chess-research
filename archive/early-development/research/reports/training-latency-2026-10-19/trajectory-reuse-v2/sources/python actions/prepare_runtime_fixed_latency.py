"""Preserve v1 and add the historical fixed-parameter identity gate before launch."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
old = ROOT / '.codebase/scripts/evaluation-and-performance/profile-g0-training-runtime.mjs'
new = ROOT / '.codebase/scripts/evaluation-and-performance/profile-g0-training-runtime-fixed.mjs'
output = ROOT / 'research/data/training-latency-runtime-comparison-v2'
assert not new.exists() and not (output / 'protocol.json').exists()
source = old.read_text()


def replace(before, after):
    global source
    assert source.count(before) == 1, before
    source = source.replace(before, after)


replace('const recorded = new Map();', 'const recorded = new Map(); let referenceFixed = null;')
replace('for await (const row of streamRows(registration.recordedReceipts)) if (needed.has(row.sequence)) recorded.set(row.sequence, row);',
        "for await (const row of streamRows(registration.recordedReceipts)) {\n"
        "  if (row.sequence === 0) {assert.equal(row.kind, 'baselines'); referenceFixed = row.fixed;}\n"
        "  if (needed.has(row.sequence)) recorded.set(row.sequence, row);\n}")
replace('const fixed = fixedStateHash(model, memory.edges), table = createG0Table();',
        "const fixed = fixedStateHash(model, memory.edges), table = createG0Table();\n"
        "assert(typeof referenceFixed === 'string' && /^[a-f0-9]{64}$/.test(referenceFixed));\n"
        "assert.equal(fixed, referenceFixed, 'Runtime changed historical fixed parameters');")
replace('samples, setupSeconds, graphSha256: mapping.inputs.graph, neurons: model.n,',
        'samples, setupSeconds, graphSha256: mapping.inputs.graph, neurons: model.n, fixedStateHash: fixed,')
reference = old.read_text()
begin, end = reference.index('function timed(name, fn)'), reference.index('const setupSeconds =')
assert reference[begin:end] == source[source.index('function timed(name, fn)'):source.index('const setupSeconds =')]
new.write_text(source, encoding='utf-8', newline='')
protocol = json.loads((ROOT / 'research/data/training-latency-runtime-comparison-v1/protocol.json').read_text())
subprocess.run([protocol['runtimes']['json6']['binary'], '--check', str(new)], check=True, capture_output=True,
               creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
with new.open('rb') as stream:
    protocol['sources'][new.relative_to(ROOT).as_posix()] = hashlib.file_digest(stream, 'sha256').hexdigest()
with Path(__file__).open('rb') as stream:
    protocol['sources'][Path(__file__).relative_to(ROOT).as_posix()] = hashlib.file_digest(stream, 'sha256').hexdigest()
protocol['historicalFixedParameterGate'] = 'receipt0.baselines.fixed'
output.mkdir(parents=True, exist_ok=True)
with (output / 'protocol.json').open('x') as stream:
    json.dump(protocol, stream, indent=2)
    stream.write('\n')
print(json.dumps({'protocol': str(output / 'protocol.json'), 'runner': str(new),
                  'timedFunctionsLiteralEqual': True, 'historicalFixedParameterGate': True, 'graphLaunched': False}))

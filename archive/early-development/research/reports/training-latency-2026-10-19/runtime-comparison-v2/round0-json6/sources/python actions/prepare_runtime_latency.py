"""Stage the mixed-runtime comparison from the frozen v3 lesson implementation."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
ORIGINAL = ROOT / '.codebase/scripts/evaluation-and-performance/profile-g0-training-pipeline.mjs'
RUNNER = ROOT / '.codebase/scripts/evaluation-and-performance/profile-g0-training-runtime.mjs'
OUT = ROOT / 'research/data/training-latency-runtime-comparison-v1'


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    if RUNNER.exists() or (OUT / 'protocol.json').exists():
        raise ValueError('Preserve existing staged sources/registration; choose a new version')
    original = ORIGINAL.read_text(encoding='utf-8')
    source = original

    def replace(before, after):
        nonlocal source
        if source.count(before) != 1:
            raise ValueError('Frozen v3 source no longer matches: ' + before[:100])
        source = source.replace(before, after)

    replace("protocol: {type: 'string'}, 'cpu-duty': {type: 'string'}",
            "protocol: {type: 'string'}, variant: {type: 'string'}, round: {type: 'string'}, 'cpu-duty': {type: 'string'}")
    replace("const registration = json(a.protocol), p = json(registration.baseProtocol), mapping = json(p.mappingPath);",
            "const registration = json(a.protocol), p = json(registration.baseProtocol), mapping = json(p.mappingPath);\n"
            "assert(['json6', 'nativeZstd1'].includes(a.variant) && ['0', '1'].includes(a.round));\n"
            "const variant = a.variant, round = Number(a.round);\n"
            "assert.equal(process.version, registration.runtimes[variant].node);\n"
            "assert.equal(process.versions.v8, registration.runtimes[variant].v8);")
    replace("assert.equal(registration.schema, 'training-latency-v1');",
            "assert.equal(registration.schema, 'training-latency-runtime-comparison-v1');")
    replace("exactReceiptsAndStates: true});", "exactReceiptsAndStates: true, minColdInvocationElapsedReduction: .45});")
    replace("assert.equal(await hash(p.annotationPath), mapping.inputs.annotations);",
            "assert.equal(await hash(p.annotationPath), mapping.inputs.annotations);\n"
            "assert.equal(await hash(process.execPath), registration.runtimes[variant].sha256);")
    start = source.index("for (const variant of ['json6', 'nativeZstd1']) await runUnit(")
    source = source[:start] + '''await runUnit(registration.units[0], variant, -1);
for (const unit of registration.units) samples.push(await runUnit(unit, variant, round));
assert.equal(samples.length, 12); assert.equal(presentations, 273);
const report = {schema: registration.schema, scope: registration.scope, variant, round,
  exactHistoricalReceipts: samples.every(sample => sample.exactHistoricalReceipts && sample.exactCheckpointState),
  samples, setupSeconds, graphSha256: mapping.inputs.graph, neurons: model.n,
  protocolHash, command: {argv: process.argv, execArgv: process.execArgv}, node: process.version,
  v8: process.versions.v8, runtimeSha256: registration.runtimes[variant].sha256,
  sources: registration.sources, presentations, peakRssMiB: peakRss / 2 ** 20,
  elapsedSeconds: (performance.now() - started) / 1000, cpu: process.cpuUsage(cpuStart),
  processUptimeSeconds: process.uptime(), processCpu: process.cpuUsage(),
  limitations: ['Fixed historical comparison identity is retained in replay checkpoints; actual runtime is separately pinned here.',
    'No cross-runtime scientific resume, G0, transfer or time-to-success claim.',
    'Nested timers overlap; two rounds do not establish stable tail latency.']};
writeFileSync(join(a.out, 'report.json'), JSON.stringify(report, null, 2) + '\\n');
console.log(JSON.stringify({variant, round, presentations, exact: report.exactHistoricalReceipts,
  elapsedSeconds: report.elapsedSeconds, processUptimeSeconds: report.processUptimeSeconds, report: join(a.out, 'report.json')}));
'''
    begin = original.index('function timed(name, fn)')
    end = original.index('const setupSeconds =')
    assert original[begin:end] == source[source.index('function timed(name, fn)'):source.index('const setupSeconds =')]
    base = json.loads((ROOT / 'research/data/training-latency-v3/protocol.json').read_text())
    runtime_path = ROOT / 'research/data/training-latency-runtime-v1/runtime.json'
    runtime = json.loads(runtime_path.read_text())
    current = Path(shutil.which('node'))
    candidate = ROOT / runtime['binary']
    assert sha(candidate) == runtime['binarySha256']
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'reference-v3-runner.mjs').write_bytes(ORIGINAL.read_bytes())
    RUNNER.write_text(source, encoding='utf-8', newline='')
    subprocess.run([str(current), '--check', str(RUNNER)], check=True, capture_output=True,
                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    paths = [base['baseProtocol'], base['recordedReceipts'], str(RUNNER.relative_to(ROOT)),
             '.codebase/src/runtime/checkpoint-codec.mjs', str(ORIGINAL.relative_to(ROOT)),
             str(Path(__file__).relative_to(ROOT)), str(runtime_path.relative_to(ROOT)),
             '.codebase/scripts/evaluation-and-performance/audit-training-latency.mjs']
    protocol = {**base, 'schema': 'training-latency-runtime-comparison-v1',
                'scope': 'Complete historical lesson comparison, Node22 JSON versus Node26 native; no whole-study, scientific resume or learning-quality improvement claim',
                'runtimes': {'json6': {'binary': str(current), 'sha256': sha(current), 'node': 'v22.23.2', 'v8': '12.4.254.21-node.56'},
                             'nativeZstd1': {'binary': str(candidate), 'sha256': sha(candidate), 'node': 'v26.12.0', 'v8': runtime['versions']['v8']}},
                'batches': [{'id': 'round0-json6', 'variant': 'json6', 'round': 0},
                            {'id': 'round0-nativeZstd1', 'variant': 'nativeZstd1', 'round': 0},
                            {'id': 'round1-nativeZstd1', 'variant': 'nativeZstd1', 'round': 1},
                            {'id': 'round1-json6', 'variant': 'json6', 'round': 1}],
                'expected': {'batches': 4, 'measuredSamples': 48, 'casesWithWarmup': 52, 'presentations': 1092,
                             'checkpointPairs': 1092, 'checkpoints': 2184, 'historicalReceipts': 546},
                'gates': {**base['gates'], 'minColdInvocationElapsedReduction': .45},
                'sources': {path: sha(ROOT / path) for path in paths}}
    with (OUT / 'protocol.json').open('x', encoding='utf-8') as stream:
        json.dump(protocol, stream, indent=2)
        stream.write('\n')
    print(json.dumps({'prepared': str(OUT / 'protocol.json'), 'runner': str(RUNNER),
                      'timedFunctionsLiteralEqual': True, 'order': 'ABBA', 'graphLaunched': False}))


if __name__ == '__main__':
    main()

"""Register all-phase causal-row observation without changing the neural engine."""
from pathlib import Path
import gzip
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
old = ROOT / '.codebase/scripts/evaluation-and-performance/profile-g0-training-runtime-fixed.mjs'
runner = ROOT / '.codebase/scripts/evaluation-and-performance/profile-trajectory-reuse.mjs'
assert not runner.exists(), 'Preserve the existing observer registration'
source = old.read_text(encoding='utf-8')


def replace(before, after):
    global source
    assert source.count(before) == 1, before
    source = source.replace(before, after)


replace("import {loadGraph}", "import {loadGraph, validateGraph}")
replace("const {values: a} = parseArgs", "import {captureTrajectory, compareTrajectory} from './trajectory-reuse-observer.mjs';\n\nconst {values: a} = parseArgs")
replace("assert(['json6', 'nativeZstd1'].includes(a.variant) && ['0', '1'].includes(a.round));",
        "assert(a.variant === 'nativeZstd1' && a.round === '0' && typeof global.gc === 'function');")
replace("assert.equal(registration.schema, 'training-latency-runtime-comparison-v1');", "assert.equal(registration.schema, 'training-trajectory-reuse-v1');")
replace('assert.equal(registration.rounds, 2); assert.equal(registration.units.length, 12);',
        'assert.equal(registration.rounds, 1); assert.equal(registration.units.length, 72);')
replace('assert.equal(registration.duty, .5); assert.equal(registration.maxPresentations, 1200);',
        'assert.equal(registration.duty, .5); assert.equal(registration.maxPresentations, 1512);')
replace("assert.deepEqual(registration.gates, {minPerConditionElapsedReduction: .4, minPooledElapsedReduction: .45, exactReceiptsAndStates: true, minColdInvocationElapsedReduction: .45});",
        "assert.deepEqual(registration.gates, {exactReceiptsAndStates: true, everyCausallyCleanOutputExact: true});")
replace('assert.equal(recorded.size, 252);', 'assert.equal(recorded.size, 1512);')
replace('const graph = loadGraph(p.graphPath); guard();', "const graph = p.fixture ? validateGraph(Object.fromEntries(Object.entries(p.fixtureGraph).map(([k,v]) =>\n  [k, k === 'initial' ? Float32Array.from(v) : k === 'sign' ? Int8Array.from(v) : Int32Array.from(v)]))) : loadGraph(p.graphPath); guard();")
replace('assert.equal(await hash(p.graphPath), mapping.inputs.graph);\nassert.equal(await hash(p.annotationPath), mapping.inputs.annotations);',
        'if (!p.fixture) {assert.equal(await hash(p.graphPath), mapping.inputs.graph);\nassert.equal(await hash(p.annotationPath), mapping.inputs.annotations);}')
replace('const samples = [];', '''const samples = [], observations = [];
let referenceStage = null, references = [], activeObservation = null;
const posts = mapping.groups.flatMap(group => group.mbon.map(cell => cell.index));
assert.equal(posts.length, memory.edges.length);
const fullForward = model.forward.bind(model);
model.forward = (...args) => {
  const prediction = fullForward(...args);
  if (activeObservation) {
    // Fixed-state hash is checked at both lesson boundaries. This observation
    // additionally verifies the complete derived signed-weight array each frame.
    for (let edge = 0; edge < model.signedMagnitude.length; edge++)
      assert(Object.is(model.signedMagnitude[edge], Math.fround(graph.sign[edge] * model.params.magnitude[edge])));
    const frame = activeObservation.frame;
    if (!references[frame]) references[frame] = captureTrajectory(model, memory.edges);
    else observations.push({...activeObservation,
      steps: compareTrajectory(model, references[frame], memory.edges, posts)});
  }
  return prediction;
};''')
replace('  const setupStart = performance.now();', '''  const setupStart = performance.now();
  if (referenceStage !== unit.stageId) {
    referenceStage = unit.stageId; references = []; global.gc(); guard();
  }
  assert.equal(fixedStateHash(model, memory.edges), fixed);''')
replace("    const frame = await pace(() => timed('sessionStep', () => session.step()));", """    activeObservation = {stageId: unit.stageId, lesson: unit.lesson, frame: session.pending.cursor};
    const frame = await pace(() => timed('sessionStep', () => session.step()));
    activeObservation = null;""")
replace('await runUnit(registration.units[0], variant, -1);\n', '')
replace('assert.equal(samples.length, 12); assert.equal(presentations, 273);',
        'assert.equal(samples.length, 72); assert.equal(presentations, 1512); assert.equal(observations.length, 912);')
replace('  samples, setupSeconds,', '  observations, samples, setupSeconds,')
replace("    'Nested timers overlap; two rounds do not establish stable tail latency.'", "    'Observation overhead is included; these timings are not a speed benchmark.',\n    'Equal row arguments are a feasibility condition, not a measured cache speedup.'")
runner.write_text(source, encoding='utf-8', newline='')


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_new(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8') as stream:
        json.dump(data, stream, indent=2)
        stream.write('\n')


base = json.loads((ROOT / 'research/data/training-latency-runtime-comparison-v2/protocol.json').read_text())
for suffix in ['', '-fixture']:
    evidence_path = ROOT / f'research/reports/training-latency-2026-10-19/neural-state-reuse{suffix}-v3/report.json'
    evidence = json.loads(evidence_path.read_text())
    assert evidence['stages'] == 24 and evidence['frames'] == 1368
    protocol_path = f'research/data/trajectory-reuse{suffix}-v1/protocol.json'
    out = f'research/reports/training-latency-2026-10-19/trajectory-reuse{suffix}-v1'
    base_protocol = 'research/data/g0-reversal-history-diagnostic-v1/protocol.json' if not suffix else 'runs/g0-history-fixture-v1-uninterrupted/protocol.json'
    receipts = 'runs/g0-reversal-history-diagnostic-v1-resumed2/receipts.jsonl' if not suffix else 'runs/g0-history-fixture-v1-uninterrupted/receipts.jsonl'
    units = []
    for row in evidence['rows']:
        if row['frame'] != 0:
            continue
        receipt_count = row['receipt'] - 1
        parent = None
        for index in reversed(evidence['indices']):
            sequence = 2 * receipt_count + 1 + index['offset']
            candidate = ROOT / index['directory'] / f'checkpoint-{sequence:06d}.json.gz'
            if not candidate.exists():
                continue
            state = json.loads(gzip.decompress(candidate.read_bytes()))
            if state['receiptCount'] == receipt_count and state['pendingReceipt'] is None:
                parent = candidate
                break
        assert parent is not None
        units.append({'stageId': row['stageId'], 'condition': row['condition'], 'lesson': row['lesson'],
                      'parent': parent.relative_to(ROOT).as_posix(), 'parentSha256': sha(parent),
                      'firstReceipt': receipt_count, 'receiptCount': 21})
    assert len(units) == 72
    protocol = {**base, 'schema': 'training-trajectory-reuse-v1', 'rounds': 1,
                'baseProtocol': base_protocol, 'recordedReceipts': receipts, 'units': units,
                'maxPresentations': 1512, 'scope': 'All-phase exact causal-row observation; no cache or speedup',
                'gates': {'exactReceiptsAndStates': True, 'everyCausallyCleanOutputExact': True},
                'sources': {**base['sources'], runner.relative_to(ROOT).as_posix(): sha(runner),
                            '.codebase/scripts/evaluation-and-performance/trajectory-reuse-observer.mjs': sha(ROOT / '.codebase/scripts/evaluation-and-performance/trajectory-reuse-observer.mjs'),
                            evidence_path.relative_to(ROOT).as_posix(): sha(evidence_path),
                            Path(__file__).relative_to(ROOT).as_posix(): sha(__file__)}}
    # Batch/timing fields belong to the previous campaign, not this observation.
    for key in ['batches', 'expected', 'historicalFixedParameterGate']:
        protocol.pop(key, None)
    write_new(ROOT / protocol_path, protocol)
    config = {'schema': 1, 'name': f'trajectory-reuse{suffix}-v1', 'paused': False,
              'paths': {'runner': runner.relative_to(ROOT).as_posix(), 'protocol': protocol_path,
                        'run': out, 'runtime': base['runtimes']['nativeZstd1']['binary']},
              'state_file': f'runs/python-actions/trajectory-reuse{suffix}-v1-current.json',
              'pins': {'{runner}': sha(runner), '{protocol}': sha(ROOT / protocol_path)},
              'artifacts': {'report': '{run}/report.json'},
              'jobs': {'profile': {'role': 'train', 'argv': ['{runtime}', '--expose-gc', '--max-old-space-size=256', '{runner}',
                         '--protocol', '{protocol}', '--out', '{run}', '--variant', 'nativeZstd1', '--round', '0', '--cpu-duty', '0.5'],
                         'requires': ['{protocol}', '{runner}'], 'fresh_output': '{run}'}}}
    write_new(ROOT / f'python actions/trajectory-reuse{suffix}-v1.json', config)
print(json.dumps({'prepared': runner.relative_to(ROOT).as_posix(), 'sourceSha256': sha(runner), 'launched': False}))

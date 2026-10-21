"""Preserve v1's report failure; fix fixture metadata and stream observations."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
old = ROOT / '.codebase/scripts/evaluation-and-performance/profile-trajectory-reuse.mjs'
new = ROOT / '.codebase/scripts/evaluation-and-performance/profile-trajectory-reuse-v2.mjs'
assert not new.exists()
source = old.read_text(encoding='utf-8')
replacements = {
    "assert.equal(registration.schema, 'training-trajectory-reuse-v1');":
        "assert.equal(registration.schema, 'training-trajectory-reuse-v2');",
    '  const setupStart = performance.now();':
        '  const setupStart = performance.now(), observationStart = observations.length;',
    '  observations, samples, setupSeconds, graphSha256: mapping.inputs.graph,':
        '  observations, samples, setupSeconds, graphSha256: p.fixture ? null : mapping.inputs.graph,',
}
for before, after in replacements.items():
    assert source.count(before) == 1, before
    source = source.replace(before, after)
before = "  console.log(JSON.stringify({unit: unit.stageId, lesson: unit.lesson, variant, round, elapsedMs, exact: true}));"
assert source.count(before) == 1
source = source.replace(before, """  for (const row of observations.slice(observationStart))
    writeFileSync(join(a.out, 'causal-observations.jsonl'), JSON.stringify(row) + '\\n', {flag: 'a'});
""" + before)
new.write_text(source, encoding='utf-8', newline='')


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


for suffix in ['', '-fixture']:
    protocol_path = ROOT / f'research/data/trajectory-reuse{suffix}-v2/protocol.json'
    protocol = json.loads((ROOT / f'research/data/trajectory-reuse{suffix}-v1/protocol.json').read_text())
    protocol['schema'] = 'training-trajectory-reuse-v2'
    protocol['sources'][new.relative_to(ROOT).as_posix()] = sha(new)
    protocol['sources'][Path(__file__).relative_to(ROOT).as_posix()] = sha(__file__)
    protocol_path.parent.mkdir(parents=True, exist_ok=True)
    with protocol_path.open('x', encoding='utf-8') as stream:
        json.dump(protocol, stream, indent=2)
        stream.write('\n')
    config = json.loads((ROOT / f'python actions/trajectory-reuse{suffix}-v1.json').read_text())
    config['name'] = f'trajectory-reuse{suffix}-v2'
    config['paths']['runner'] = new.relative_to(ROOT).as_posix()
    config['paths']['protocol'] = protocol_path.relative_to(ROOT).as_posix()
    config['paths']['run'] = config['paths']['run'].removesuffix('-v1') + '-v2'
    config['state_file'] = f'runs/python-actions/trajectory-reuse{suffix}-v2-current.json'
    config['pins']['{runner}'] = sha(new)
    config['pins']['{protocol}'] = sha(protocol_path)
    with (ROOT / f'python actions/trajectory-reuse{suffix}-v2.json').open('x', encoding='utf-8') as stream:
        json.dump(config, stream, indent=2)
        stream.write('\n')
print(json.dumps({'prepared': new.relative_to(ROOT).as_posix(), 'sourceSha256': sha(new), 'v1Preserved': True}))

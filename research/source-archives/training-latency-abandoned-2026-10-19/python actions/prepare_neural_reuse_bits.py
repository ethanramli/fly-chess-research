"""Preserve unlaunched v1 and add exact temporal Float32 bit-change observations."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
old = ROOT / '.codebase/scripts/evaluation-and-performance/analyze-neural-state-reuse.mjs'
new = ROOT / '.codebase/scripts/evaluation-and-performance/analyze-neural-state-reuse-bits.mjs'
assert not new.exists(), 'Preserve the existing staged analyzer'
source = old.read_text(encoding='utf-8')


def replace(before, after):
    global source
    assert source.count(before) == 1, before
    source = source.replace(before, after)


replace('  const unchangedChunks = {};', '''  const previous32 = previous instanceof Float32Array ? previous : Float32Array.from(previous);
  const current32 = current instanceof Float32Array ? current : Float32Array.from(current);
  const previousBits = new Uint32Array(previous32.buffer, previous32.byteOffset, previous32.length);
  const currentBits = new Uint32Array(current32.buffer, current32.byteOffset, current32.length);
  let changedFloat32Words = 0, changedFloat32Bytes = 0;
  for (let i = 0; i < currentBits.length; i++) {
    const xor = previousBits[i] ^ currentBits[i];
    if (xor !== 0) changedFloat32Words++;
    changedFloat32Bytes += Number((xor & 255) !== 0) + Number((xor & 65280) !== 0)
      + Number((xor & 16711680) !== 0) + Number((xor >>> 24) !== 0);
  }
  const unchangedChunks = {};''')
replace('return {changedNeurons: count, changedFraction: count / current.length, unchangedChunks};',
        'return {changedNeurons: count, changedFraction: count / current.length, unchangedChunks,\n'
        '    changedFloat32Words, changedFloat32ByteFraction: changedFloat32Bytes / (4 * current.length)};')
replace("  assert.equal(result.changedNeurons, 1); assert.equal(result.changedFraction, .2);",
        "  assert.equal(result.changedNeurons, 1); assert.equal(result.changedFraction, .2);\n"
        "  assert.equal(result.changedFloat32Words, 1); assert.equal(result.changedFloat32ByteFraction, .1);\n"
        "  assert.equal(compareStates([0], [-0], [1]).changedFloat32ByteFraction, .25);")
replace("const summarize = values => ({pairs: values.length, medianChangedFraction: median(values.map(row => row.changedFraction)),",
        "const summarize = values => ({pairs: values.length, medianChangedFraction: median(values.map(row => row.changedFraction)),\n"
        "    medianChangedFloat32ByteFraction: median(values.map(row => row.changedFloat32ByteFraction)),")
replace("'First/middle/last sampling is not every lesson.'",
        "'Float32 XOR-byte sparsity is not an observed compression ratio or speedup.', 'First/middle/last sampling is not every lesson.'")
new.write_text(source, encoding='utf-8', newline='')


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


for stem in ['neural-state-reuse', 'neural-state-reuse-fixture']:
    config = json.loads((ROOT / f'python actions/{stem}.json').read_text())
    config['name'] = config['name'].removesuffix('-v1') + '-v2'
    config['paths']['runner'] = new.relative_to(ROOT).as_posix()
    config['paths']['run'] = config['paths']['run'].removesuffix('-v1') + '-v2'
    config['state_file'] = f'runs/python-actions/{stem}-v2-current.json'
    config['pins']['{runner}'] = sha(new)
    config['pins'][old.relative_to(ROOT).as_posix()] = sha(old)
    config['pins'][Path(__file__).relative_to(ROOT).as_posix()] = sha(__file__)
    with (ROOT / f'python actions/{stem}-v2.json').open('x', encoding='utf-8') as stream:
        json.dump(config, stream, indent=2)
        stream.write('\n')
print(json.dumps({'prepared': str(new), 'sourceSha256': sha(new), 'v1Preserved': True,
                  'selectionUnchanged': '72 lessons across24 stages', 'launched': False}))

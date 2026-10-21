"""Preserve source bytes and stage the shared-memory candidate once; never run a graph."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parent.parent
target = root / 'research/reports/training-latency-2026-10-19/shared-wasm-v2'
sources = {'trainer': root / '.codebase/src/supervised-baselines/trainer.mjs',
           'accumulator': root / '.codebase/src/runtime/sparse-accumulator.mjs'}
original = {key: path.read_bytes() for key, path in sources.items()}
changed = {key: content.decode('utf-8') for key, content in original.items()}


def replace(key, before, after):
    if changed[key].count(before) != 1:
        raise ValueError(f'Source no longer matches preparation: {key}: {before}')
    changed[key] = changed[key].replace(before, after)


replace('trainer', "import { SparseAccumulator } from '../runtime/sparse-accumulator.mjs';",
        "import { SparseAccumulator } from './candidate-accumulator.mjs';")
replace('trainer', '    this.signedMagnitude = alloc(graph.col.length);',
        '    this.sparseAccumulator = new SparseAccumulator(graph, A, steps + 1);\n'
        '    this.signedMagnitude = this.sparseAccumulator.weight;')
replace('trainer', '    this.h = Array.from({ length: steps + 1 }, () => alloc(n));',
        '    this.h = this.sparseAccumulator.history;')
replace('trainer', '    this.drive = alloc(n); this.alpha = alloc(n);\n'
        '    this.sparseAccumulator = new SparseAccumulator(graph, A);',
        '    this.drive = this.sparseAccumulator.drive; this.alpha = alloc(n);')
replace('accumulator', '  constructor(graph, Type) {',
        '  constructor(graph, Type, historyCount = 0) {\n'
        '    if (!Number.isSafeInteger(historyCount) || historyCount < 0)\n'
        '      throw Error("Invalid accumulator history count");')
replace('accumulator', 'allocate(Type, e), allocate(Type, n), allocate(Type, n), allocate(Float64Array, n)];',
        'allocate(Type, e), allocate(Type, n), allocate(Type, n), allocate(Float64Array, n),\n'
        '      allocate(Type, n * historyCount)];')
replace('accumulator', '    [this.row, this.col, this.weight, this.previous, this.drive, this.result] = layout.map(',
        '    let histories;\n'
        '    [this.row, this.col, this.weight, this.previous, this.drive, this.result, histories] = layout.map(')
replace('accumulator', '    const instance = new WebAssembly.Instance(module, { env: { memory: this.memory } });',
        '    this.history = Array.from({ length: historyCount }, (_, i) => histories.subarray(i * n, (i + 1) * n));\n'
        '    const instance = new WebAssembly.Instance(module, { env: { memory: this.memory } });')
replace('accumulator', '    // ponytail: recopy each forward instead of adding cache invalidation to\n'
        '    // every loading/plasticity/update path. One bounded position at a time.\n'
        '    this.row.set(graph.row); this.col.set(graph.col);\n'
        '    this.weight.set(weight); this.drive.set(drive);',
        '    // ponytail: topology remains externally mutable; refresh it each forward.\n'
        '    // Trainer weights and drive already live here, so every writer stays current.\n'
        '    this.row.set(graph.row); this.col.set(graph.col);\n'
        '    if (weight !== this.weight) this.weight.set(weight);\n'
        '    if (drive !== this.drive) this.drive.set(drive);')
replace('accumulator', '    this.previous.set(previous);',
        '    // Only owned histories have proven disjointness from the result buffer.\n'
        '    const direct = this.history.includes(previous);\n'
        '    if (!direct) this.previous.set(previous);\n'
        '    const input = direct ? previous : this.previous;')
replace('accumulator', '      this.previous.byteOffset, this.drive.byteOffset, this.result.byteOffset, this.col.length))',
        '      input.byteOffset, this.drive.byteOffset, this.result.byteOffset, this.col.length))')

target.mkdir()
manifest = {'schema': 'shared-wasm-candidate-v1', 'scope': 'isolated candidate; no graph timing or adoption',
            'sources': {}, 'candidate': {},
            'invariants': ['identical kernel bytes and serial summation', 'all histories and activities retained',
                           'topology copied per forward', 'fixed memory and owned histories only bypass scratch copy']}
for key, path in sources.items():
    (target / f'oracle-{key}.mjs').write_bytes(original[key])
    manifest['sources'][path.relative_to(root).as_posix()] = hashlib.sha256(original[key]).hexdigest()
    candidate = target / f'candidate-{key}.mjs'
    candidate.write_bytes(changed[key].encode('utf-8'))
    manifest['candidate'][candidate.name] = hashlib.sha256(candidate.read_bytes()).hexdigest()
(target / 'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'prepared': str(target), 'sourceHashes': manifest['sources'], 'candidateHashes': manifest['candidate']}))

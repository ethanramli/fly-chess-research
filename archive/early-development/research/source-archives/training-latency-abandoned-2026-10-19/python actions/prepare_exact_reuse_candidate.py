"""Preserve the original trainer/kernel; prepare an isolated exact-row candidate."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
old_kernel = ROOT / '.codebase/src/runtime/sparse-accumulator.mjs'
new_kernel = ROOT / '.codebase/src/runtime/sparse-accumulator-masked-candidate.mjs'
old_trainer = ROOT / '.codebase/src/supervised-baselines/trainer.mjs'
new_trainer = ROOT / '.codebase/src/supervised-baselines/trainer-reuse-candidate.mjs'
assert not new_kernel.exists() and not new_trainer.exists()


def replace(source, before, after):
    assert source.count(before) == 1, before
    return source.replace(before, after)


kernel = old_kernel.read_text(encoding='utf-8')
kernel = replace(kernel, 'function body(width) {', 'function body(width, masked = false) {')
kernel = replace(kernel, '      ...address(5, 8, width), ...load, ...set(12),',
                 '''      // Mask is stored in the otherwise-unused result cells before a masked call.
      ...(masked ? [...address(6, 8, 8), 0x2b, 3, 0, 0x44, ...Array(8).fill(0), 0x62, 0x04, 0x40] : []),
      ...address(5, 8, width), ...load, ...set(12),''')
kernel = replace(kernel, '      ...address(6, 8, 8), ...get(12), 0x39, 3, 0,',
                 '      ...address(6, 8, 8), ...get(12), 0x39, 3, 0,\n      ...(masked ? [0x0b] : []),')
kernel = replace(kernel, '...section(3, [2, 0, 0]),', '...section(3, [4, 0, 0, 0, 0]),')
kernel = replace(kernel, "...section(7, [2, ...name('sum32'), 0, 0, ...name('sum64'), 0, 1]),",
                 "...section(7, [4, ...name('sum32'), 0, 0, ...name('sum64'), 0, 1, ...name('masked32'), 0, 2, ...name('masked64'), 0, 3]),")
kernel = replace(kernel, '...section(10, [2, ...body(4), ...body(8)]),',
                 '...section(10, [4, ...body(4), ...body(8), ...body(4, true), ...body(8, true)]),')
kernel = replace(kernel, "    this.kernel = instance.exports[Type === Float32Array ? 'sum32' : 'sum64'];",
                 "    this.kernel = instance.exports[Type === Float32Array ? 'sum32' : 'sum64'];\n    this.maskedKernel = instance.exports[Type === Float32Array ? 'masked32' : 'masked64'];")
kernel = replace(kernel, '  accumulate(previous) {', '  accumulate(previous, mask = null) {')
kernel = replace(kernel, '    this.previous.set(previous);', '''    this.previous.set(previous);
    if (mask !== null) {
      if (mask.length !== this.result.length) throw Error('Invalid exact-row mask');
      for (let i = 0; i < mask.length; i++) this.result[i] = mask[i] ? 1 : 0;
    }
    const kernel = mask === null ? this.kernel : this.maskedKernel;''')
kernel = replace(kernel, '    if (this.kernel(this.drive.length,', '    if (kernel(this.drive.length,')
new_kernel.write_text(kernel, encoding='utf-8', newline='')

trainer = old_trainer.read_text(encoding='utf-8')
trainer = replace(trainer, "import { SparseAccumulator } from '../runtime/sparse-accumulator.mjs';",
                  "import { SparseAccumulator } from '../runtime/sparse-accumulator-masked-candidate.mjs';\nimport {FrameReuseCache} from '../runtime/frame-reuse-cache.mjs';")
trainer = replace(trainer, '    this.prediction = alloc(outputs); this.count = 0;',
                  '    this.prediction = alloc(outputs); this.count = 0;\n    this.frameReuseCache = new FrameReuseCache(); this.reuseSlot = null;')
trainer = replace(trainer, '    this.sparseAccumulator.prepare(signedMagnitude, this.drive);',
                  '    this.sparseAccumulator.prepare(signedMagnitude, this.drive);\n    this.frameReuseCache.begin(this, this.reuseSlot);')
trainer = replace(trainer, '      const recurrentSum = this.sparseAccumulator.accumulate(prev);',
                  '      const mask = this.frameReuseCache.mask(this, t);\n      const recurrentSum = this.sparseAccumulator.accumulate(prev, mask);')
trainer = replace(trainer, '        const z = recurrentSum[j];',
                  '''        if (mask !== null && !mask[j]) {this.frameReuseCache.copyRow(t, j, next, act); continue;}
        const z = recurrentSum[j];''')
trainer = replace(trainer, '    return this.prediction;', '    this.frameReuseCache.commit(this);\n    return this.prediction;')
trainer = replace(trainer, 'return [...new Set(arrays.map(a => a.buffer))].reduce((s, b) => s + b.byteLength, 0);',
                  'return [...new Set(arrays.map(a => a.buffer))].reduce((s, b) => s + b.byteLength, 0) + this.frameReuseCache.allocatedBytes;')
new_trainer.write_text(trainer, encoding='utf-8', newline='')
print(json.dumps({'prepared': [p.relative_to(ROOT).as_posix() for p in [new_kernel, new_trainer]],
                  'sourceSha256': {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                                   for p in [old_kernel, old_trainer, new_kernel, new_trainer]},
                  'tested': False, 'adopted': False}))

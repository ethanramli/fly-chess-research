"""Preserve prior unlaunched analyses; compare corresponding frames across reset lessons."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
old = ROOT / '.codebase/scripts/evaluation-and-performance/analyze-neural-state-reuse-bits.mjs'
new = ROOT / '.codebase/scripts/evaluation-and-performance/analyze-neural-state-reuse-cross-lesson.mjs'
assert not new.exists(), 'Preserve existing prepared analysis'
source = old.read_text(encoding='utf-8')


def replace(before, after):
    global source
    assert source.count(before) == 1, before
    source = source.replace(before, after)


replace('condition: stage.condition.id, lesson}',
        'condition: stage.condition.id, lesson, publicInputHash: digest(stage.slots[lesson].experience.publicInput)}')
replace('  const rows = [], inputs = [];',
        '  const rows = [], inputs = [], crossRows = []; let referenceStage = null, referenceFrames = [], referenceCase = null;')
replace('    const frames = wanted.get(key(selectedCase)); assert.equal(frames.length, 19);',
        '''    const frames = wanted.get(key(selectedCase)); assert.equal(frames.length, 19);
    if (referenceStage !== selectedCase.stageId) {
      referenceStage = selectedCase.stageId; referenceFrames = []; referenceCase = selectedCase;
    }''')
replace('      previous = Float32Array.from(values); await pace(before);',
        '''      const current = Float32Array.from(values);
      if (selectedCase.lesson === referenceCase.lesson) referenceFrames[index] = current;
      else crossRows.push({...selectedCase, referenceLesson: referenceCase.lesson, frame: index,
        samePublicInput: selectedCase.publicInputHash === referenceCase.publicInputHash,
        ...compareStates(referenceFrames[index], current)});
      previous = current; await pace(before);''')
replace('    rows, inputs, peakRssMiB:',
        '''    crossLessonSameFrame: {pairs: crossRows.length, summary: summarize(crossRows),
      perPhase: Object.fromEntries(['acquisition', 'interference', 'reversal'].map(phase =>
        [phase, summarize(crossRows.filter(row => row.phase === phase))])),
      perInputMatch: Object.fromEntries([true, false].map(match => {
        const selected = crossRows.filter(row => row.samePublicInput === match);
        return [String(match), selected.length ? summarize(selected) : null];
      }))}, crossRows, rows, inputs, peakRssMiB:''')
replace("      'First/middle/last sampling is not every lesson.'", "      'First/middle/last sampling is not every lesson.'") if False else None
replace("'Final-frame stability does not prove intermediate histories or incoming causal rows can be skipped.',",
        "'Final-frame stability does not prove intermediate histories or incoming causal rows can be skipped.',\n"
        "      'Cross-lesson equal outputs do not prove unchanged dependencies, weights or complete stimulation histories.',")
replace('  assert.equal(rows.length, 1368); assert.equal(comparable.length, 1296);',
        '  assert.equal(rows.length, 1368); assert.equal(comparable.length, 1296); assert.equal(crossRows.length, 912);')
replace('summary: report.summary, perPhase: report.perPhase, peakRssMiB:',
        'summary: report.summary, perPhase: report.perPhase, crossLessonSameFrame: report.crossLessonSameFrame, peakRssMiB:')
new.write_text(source, encoding='utf-8', newline='')


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


for stem in ['neural-state-reuse', 'neural-state-reuse-fixture']:
    config = json.loads((ROOT / f'python actions/{stem}-v2.json').read_text())
    config['name'] = config['name'].removesuffix('-v2') + '-v3'
    config['paths']['runner'] = new.relative_to(ROOT).as_posix()
    config['paths']['run'] = config['paths']['run'].removesuffix('-v2') + '-v3'
    config['state_file'] = f'runs/python-actions/{stem}-v3-current.json'
    config['pins']['{runner}'] = sha(new)
    config['pins'][old.relative_to(ROOT).as_posix()] = sha(old)
    config['pins'][Path(__file__).relative_to(ROOT).as_posix()] = sha(__file__)
    with (ROOT / f'python actions/{stem}-v3.json').open('x', encoding='utf-8') as stream:
        json.dump(config, stream, indent=2)
        stream.write('\n')
print(json.dumps({'prepared': str(new), 'sourceSha256': sha(new), 'priorVersionsPreserved': True,
                  'crossLessonPairs': 912, 'referenceMemoryBytes': 19 * 134209 * 4, 'launched': False}))

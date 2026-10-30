"""Prepare isolated derived-state candidate and pinned checks; never launch experiments."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
REPORT = 'research/reports/training-latency-2026-10-19/derived-checkpoints-v1'
G0 = '.codebase/src/neural-learning/curriculum-g0-derived-candidate.mjs'
RUNNER = '.codebase/scripts/neural-learning/run-g0-history-derived-candidate.mjs'


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Expected one frozen source anchor: {old[:100]}')
    return text.replace(old, new)


def prepare():
    source = (ROOT / '.codebase/src/neural-learning/curriculum-g0.mjs').read_text(encoding='utf-8')
    source = replace_once(source,
        "import {TemporalFeedbackSession} from '../puzzle-learning/temporal-feedback-session.mjs';",
        "import {DerivedTemporalFeedbackSession as TemporalFeedbackSession} from '../puzzle-learning/derived-temporal-feedback-session-candidate.mjs';")
    (ROOT / G0).write_text(source, encoding='utf-8', newline='')

    source = (ROOT / '.codebase/scripts/neural-learning/run-g0-reversal-history-diagnostic.mjs').read_text(encoding='utf-8')
    source = replace_once(source, "from '../../src/neural-learning/curriculum-g0.mjs';",
                          "from '../../src/neural-learning/curriculum-g0-derived-candidate.mjs';")
    source = replace_once(source, "import {gzipSync,gunzipSync} from 'node:zlib';",
        "import {encodeDerivedCheckpoint,decodeDerivedCheckpoint} from '../../src/runtime/derived-checkpoint-codec-candidate.mjs';")
    source = replace_once(source,
        "const json=path=>{const bytes=readFileSync(path);return JSON.parse((path.endsWith('.gz')?gunzipSync(bytes,{maxOutputLength:16*2**20}):bytes).toString('utf8').replace(/^\\uFEFF/,''));};",
        "const json=path=>{const bytes=readFileSync(path);return path.endsWith('.checkpoint')?decodeDerivedCheckpoint(bytes):JSON.parse(bytes.toString('utf8').replace(/^\\uFEFF/,''));};")
    source = replace_once(source, "assert.equal(p.schema,'g0-reversal-history-diagnostic-v1');",
                          "assert.equal(p.schema,'g0-history-derived-engineering-v1');")
    source = replace_once(source, 'let peakRss=0,presentations=0;',
                          'let peakRss=0,presentations=0,recoveryPresentations=0,recoverySeconds=0;')
    source = replace_once(source, "state.sequence++;const bytes=JSON.stringify(state)+'\\n';assert(Buffer.byteLength(bytes)<=16*2**20);",
                          'state.sequence++;const bytes=encodeDerivedCheckpoint(state);')
    source = replace_once(source, ".padStart(6,'0')}.json.gz`", ".padStart(6,'0')}.checkpoint`")
    source = replace_once(source, 'writeFileSync(fd,gzipSync(bytes))', 'writeFileSync(fd,bytes)')
    source = replace_once(source, 'acknowledge();save();guard();',
        "// Active session recovery must validate its derived state before acknowledging any receipt.\nif(state.session===null){acknowledge();save();}else assert(state.stageStarted,'Orphaned session');\nguard();")
    source = replace_once(source,
        "if(state.stageStarted){assert(state.session,'Missing entered-stage state');session.restore(state.session);}",
        """if(state.stageStarted){
    assert(state.session,'Missing entered-stage state');const recoveryStarted=performance.now();
    await session.restore(state.session,{pace:async fn=>{const value=await pace(fn);recoveryPresentations++;return value;}});
    recoverySeconds+=(performance.now()-recoveryStarted)/1000;
    acknowledge();save();
  }""")
    source = replace_once(source, 'invocation:{presentations,peakRssMiB:',
                          'invocation:{presentations,recoveryPresentations,recoverySeconds,peakRssMiB:')
    (ROOT / RUNNER).write_text(source, encoding='utf-8', newline='')
    directory = ROOT / REPORT
    directory.mkdir(parents=True, exist_ok=True)
    paths = [G0, RUNNER,
        '.codebase/src/puzzle-learning/derived-temporal-feedback-session-candidate.mjs',
        '.codebase/src/neural-learning/derived-neural-episode-candidate.mjs',
        '.codebase/src/runtime/derived-checkpoint-codec-candidate.mjs',
        '.codebase/src/puzzle-learning/temporal-feedback-session.mjs',
        '.codebase/src/neural-learning/neural-episode.mjs',
        '.codebase/src/neural-learning/curriculum-g0.mjs',
        '.codebase/scripts/neural-learning/run-g0-reversal-history-diagnostic.mjs',
        REPORT + '/equivalence.test.mjs', 'python actions/prepare_derived_checkpoint_candidate.py']
    pins = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in paths}
    (directory / 'source-manifest.json').write_text(json.dumps({'schema': 1, 'sources': pins}, indent=2)+'\n', encoding='utf-8')
    config = {'schema': 1, 'name': 'derived-checkpoint-candidate-v1', 'paused': False,
        'paths': {'runtime': str(ROOT / '.cache/latency-runtimes/v26.12.0/node.exe'), 'run': REPORT},
        'state_file': 'runs/python-actions/derived-checkpoint-checks-v1-current.json', 'pins': pins, 'artifacts': {},
        'jobs': {
            'exact-check': {'role': 'check', 'argv': ['{runtime}', '--max-old-space-size=256', '--test',
                '--test-reporter=tap', '--test-concurrency=1', REPORT+'/equivalence.test.mjs']},
            'runner-syntax': {'role': 'check', 'argv': ['{runtime}', '--check', RUNNER]},
            'math-regression': {'role': 'check', 'argv': ['npm.cmd', 'test']}}}
    (ROOT / 'python actions/derived-checkpoint-checks-v1.json').write_text(json.dumps(config, indent=2)+'\n', encoding='utf-8')
    return {'prepared': [G0, RUNNER, REPORT+'/source-manifest.json'], 'tested': False, 'adopted': False}


if __name__ == '__main__':
    print(json.dumps(prepare()))

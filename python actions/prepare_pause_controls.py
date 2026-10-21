"""Prepare explicitly registered operational copies; frozen sources stay intact."""
import hashlib
import json
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUNNER = '.codebase/scripts/neural-learning/run-g0-reversal-history-replication.mjs'
AUDITOR = 'research/data/g0-reversal-history-replication-v1/audit.mjs'
ADAPTED_RUNNER = '.codebase/scripts/neural-learning/run-g0-history-with-pause.mjs'
ADAPTED_AUDITOR = 'research/data/lesson-pause-control-v1/audit.mjs'
HELPER = '.codebase/scripts/runtime/lesson-pause-control.mjs'
VARIANTS = [
    {'canonical': RUNNER, 'adapted': ADAPTED_RUNNER, 'edits': [
        {'anchor': "import assert from 'node:assert/strict';", 'replacement': "import assert from 'node:assert/strict';\nimport {recordPauseExecution,pauseAtLesson} from '../runtime/lesson-pause-control.mjs';"},
        {'anchor': "'interrupt-after-pending':{type:'string'}", 'replacement': "'interrupt-after-pending':{type:'string'},'pause-file':{type:'string'}"},
        {'anchor': 'acknowledge();save();guard();', 'replacement': 'acknowledge();save();guard();\nrecordPauseExecution(a);'},
        {'anchor': "    publish('lesson',{stageId:stage.id,lesson:state.lesson-1,receipt});", 'replacement': "    publish('lesson',{stageId:stage.id,lesson:state.lesson-1,receipt});\n    pauseAtLesson(a,state,lastCheckpoint);"},
    ]},
    {'canonical': AUDITOR, 'adapted': ADAPTED_AUDITOR, 'edits': [
        {'anchor': "import assert from 'node:assert/strict';", 'replacement': "import assert from 'node:assert/strict';\nimport {verifyPauseLineage,pauseAudit} from '../../../.codebase/scripts/runtime/lesson-pause-control.mjs';"},
        {'anchor': 'let peakRss=0,presentations=0,frames=0,lessons=0;', 'replacement': 'verifyPauseLineage(out);\nlet peakRss=0,presentations=0,frames=0,lessons=0;'},
        {'anchor': 'assert.deepEqual(session.finish(),r.receipt);lessonIndex++;lessons++;', 'replacement': "assert.deepEqual(session.finish(),r.receipt);lessonIndex++;lessons++;\n    pauseAudit(out,join(out,'protocol.json'),lessons);"},
    ]},
]


def prepare():
    for variant in VARIANTS:
        text = (ROOT / variant['canonical']).read_bytes().decode('utf-8')
        for edit in variant['edits']:
            if text.count(edit['anchor']) != 1:
                raise ValueError('Pause insertion is not unique: ' + edit['anchor'])
            text = text.replace(edit['anchor'], edit['replacement'])
        target = ROOT / variant['adapted']
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text.encode('utf-8'))
    sources = {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
               for path in (RUNNER, AUDITOR, ADAPTED_RUNNER, ADAPTED_AUDITOR, HELPER)}
    registration = {'schema': 'lesson-pause-control-v1', 'created': '2026-10-20',
                    'scope': 'Explicit operational source variant: save/stop after a completed lesson; canonical neural/protocol/receipt identity remains for exact recovery. Actual execution source identity is separately archived and verified. No model, feedback, exposure or gate change.',
                    'variants': VARIANTS, 'sources': sources,
                    'recovery': 'Same saved physiological identity; complete new execution identity recorded in every run. Independent numerical replay plus operational-source and parent-publication verification required.'}
    target = ROOT / 'research/data/lesson-pause-control-v1/registration.json'
    target.write_text(json.dumps(registration, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'prepared': True, 'registration': str(target), 'sources': len(sources)}))


def configure():
    path = ROOT / 'python actions/curriculum-step.json'
    original = path.read_bytes()
    config = json.loads(original.decode('utf-8-sig'))
    archive = ROOT / 'research/data/lesson-pause-control-v1/previous-step-config.json'
    if not archive.exists():
        archive.write_bytes(original)
    config['paths'].update({'canonicalRunner': RUNNER, 'canonicalAuditor': AUDITOR,
                            'runner': ADAPTED_RUNNER, 'auditor': ADAPTED_AUDITOR,
                            'pauseRegistration': 'research/data/lesson-pause-control-v1/registration.json'})
    for key in ('runner', 'auditor', 'canonicalRunner', 'canonicalAuditor', 'pauseRegistration'):
        config['pins']['{' + key + '}'] = hashlib.sha256((ROOT / config['paths'][key]).read_bytes()).hexdigest()
    config['pins'][HELPER] = hashlib.sha256((ROOT / HELPER).read_bytes()).hexdigest()
    config['pause_control'] = {'registration': config['paths']['pauseRegistration'],
                               'supported_executables': [ADAPTED_RUNNER, ADAPTED_AUDITOR]}
    for name in ('train', 'resume'):
        argv = config['jobs'][name]['argv']
        if '--pause-file' not in argv:
            argv[-2:-2] = ['--pause-file', '{run}/pause-request.json']
    protocol = json.loads((ROOT / config['paths']['protocol']).read_text(encoding='utf-8-sig'))
    stages = []
    for phase, branch, lessons, label in (
        ('acquisition', 'prefix', 32, 'Learning associations'),
        ('interference', 'prefix', 16, 'Remembering while learning other associations'),
        ('reversal', 'retained', 32, 'Adapting to changed feedback'),
        ('reversal', 'reset', 32, 'Fresh-start comparison')):
        for condition in protocol['conditions']:
            teaching = {'informative': 'teaching', 'absent': 'no teaching comparison',
                        'disabled': 'learning switched off', 'shuffled': 'shuffled feedback comparison'}[condition['kind']]
            stages.append({'phase': phase, 'branch': branch, 'condition': condition['id'],
                           'lessons': lessons, 'label': label + ' / ' + teaching})
    config['reporting'] = {'title': 'Learning, remembering and adapting (association study)',
                           'stages': stages, 'history': ['runs/g0-reversal-history-diagnostic-v1-resumed2']}
    for name, script in [('control-tests', 'python actions/test_fly_controls.py'),
                         ('control-integration', 'python actions/verify_pause_controls.py')]:
        config['jobs'][name] = {'role': 'check', 'argv': [r'C:\Users\ethan\.venv-class\Scripts\python.exe', script]}
    path.write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'configured': True, 'frozenProtocolChanged': False, 'priorConfig': str(archive)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--configure', action='store_true')
    args = parser.parse_args()
    prepare()
    if args.configure:
        configure()

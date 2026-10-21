"""Bounded six-neuron pause/resume prefix equivalence and independent replay."""
import json
import shutil
import subprocess
import time
from datetime import datetime, timezone

import curriculum as api
import fly_controls

ROOT = api.ROOT
output = ROOT / 'runs/python-actions' / ('lesson-pause-prefix-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S'))
output.mkdir(parents=True, exist_ok=False)
protocol = api.read_json(ROOT / 'research/data/g0-reversal-history-replication-v1/protocol.json')
small = api.read_json(ROOT / 'runs/g0-history-fixture-v1-uninterrupted/protocol.json')
for key in ('model', 'memory', 'timing', 'encoder', 'readout', 'mappingPath', 'fixtureGraph'):
    protocol[key] = small[key]
protocol['fixture'] = True
protocol['scope'] = 'Six-neuron prefix software recovery verification; no full audit or research claim.'
protocol['sources'][protocol['mappingPath']] = api.digest(ROOT / protocol['mappingPath'])
protocol_path = output / 'fixture-protocol.json'
api.atomic_json(protocol_path, protocol)
log_index = 0


def run_script(script, run, resume=None, request_pause=False, interrupt=None, expected_exit=0, arguments=None):
    global log_index
    log_index += 1
    argv = ['node', '--max-old-space-size=256', str(script)]
    if arguments is None:
        argv += ['--protocol', str(protocol_path), '--out', str(run)]
        if resume:
            argv += ['--resume', str(resume)]
        if interrupt is not None:
            argv += ['--interrupt-after-pending', str(interrupt)]
        argv += ['--cpu-duty', '0.5']
    else:
        argv += arguments
    stdout, stderr = output / f'{log_index}-stdout.txt', output / f'{log_index}-stderr.txt'
    api.atomic_json(output / f'{log_index}-command.json', {'argv': argv, 'expectedExit': expected_exit})
    with stdout.open('wb') as out, stderr.open('wb') as err:
        child = subprocess.Popen(argv, cwd=ROOT, stdout=out, stderr=err,
                                 creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    deadline, requested = time.monotonic() + 120, False
    try:
        while child.poll() is None:
            if request_pause and (run / 'execution.json').exists() and not requested:
                api.atomic_json(run / 'pause-request.json', {'schema': 1, 'run': str(run),
                                'protocolHash': api.digest(protocol_path)})
                requested = True
            if time.monotonic() >= deadline:
                raise TimeoutError('Bounded six-neuron prefix verification expired')
            time.sleep(0.02)
        if child.returncode != expected_exit:
            raise RuntimeError(f'Fixture exited {child.returncode}, expected {expected_exit}; inspect {stderr}')
        if request_pause and not requested:
            raise RuntimeError('Fixture ended before pause was requested')
    finally:
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=5)


try:
    canonical, paused, resumed = output / 'canonical-prefix', output / 'paused', output / 'resumed'
    original = '.codebase/scripts/neural-learning/run-g0-reversal-history-replication.mjs'
    adapted = '.codebase/scripts/neural-learning/run-g0-history-with-pause.mjs'
    before = api.digest(ROOT / original)
    run_script(original, canonical, interrupt=60, expected_exit=75)
    run_script(adapted, paused, request_pause=True)
    receipt = fly_controls.pause_receipt(paused, api)
    if not receipt or receipt['lessonsInStage'] < 1 or (paused / 'result.json').exists():
        raise AssertionError('Pause did not stop after a complete saved lesson')
    run_script(adapted, resumed, resume=api.local(receipt['checkpoint']), request_pause=True)
    resumed_receipt = fly_controls.pause_receipt(resumed, api)
    actual = api.read_json(api.local(resumed_receipt['checkpoint']))
    reference = None
    for path in canonical.glob('checkpoint-*.json.gz'):
        candidate = api.read_json(path)
        if candidate['receiptCount'] == actual['receiptCount'] and candidate['pendingReceipt'] is None:
            reference = candidate
            break
    if reference is None or actual['lesson'] <= receipt['lessonsInStage']:
        raise AssertionError('Resumed run failed to advance to the next lesson')
    exact = ['identity', 'stage', 'stageStarted', 'lesson', 'session', 'memories', 'baselines',
             'results', 'replicaResponses', 'receiptCount', 'chainHash', 'logBytes', 'pendingReceipt']
    for key in exact:
        if reference[key] != actual[key]:
            raise AssertionError('Pause/resume changed ' + key)
    replay = output / 'independent-prefix-replay'
    replay.mkdir()
    shutil.copytree(canonical / 'sources', replay / 'sources')
    shutil.copyfile(protocol_path, replay / 'protocol.json')
    api.atomic_json(replay / 'prefix-reference.json', reference)
    with (canonical / 'receipts.jsonl').open('rb') as source, (replay / 'receipts.jsonl').open('wb') as dest:
        for _ in range(actual['receiptCount']):
            dest.write(next(source))
    if (replay / 'receipts.jsonl').read_bytes() != (resumed / 'receipts.jsonl').read_bytes():
        raise AssertionError('Receipt prefix was duplicated or changed')
    auditor = ROOT / 'research/data/g0-reversal-history-replication-v1/audit.mjs'
    text = auditor.read_text(encoding='utf-8')
    text = text.replace("result=json(join(out,'result.json'))", "result=json(join(out,'prefix-reference.json'))")
    marker = 'assert.equal(session,null);assert.equal(stageIndex,24);'
    if text.count(marker) != 1:
        raise AssertionError('Frozen auditor prefix boundary changed')
    text = text.split(marker)[0] + "\nassert.equal(sequence,result.receiptCount);assert.equal(chainHash,result.chainHash);assert.deepEqual(session.snapshot(),result.session);assert.equal(lessons,result.lesson);console.log(JSON.stringify({prefixReplayPassed:true,lessons,receipts:sequence}));\n"
    harness = output / 'independent-prefix-replay.mjs'
    harness.write_text('// Software-only bounded prefix harness derived from the frozen auditor.\n' + text, encoding='utf-8')
    run_script(harness, replay, arguments=[str(replay), '--cpu-duty', '0.5'])
    audit_fixture = output / 'audit-stop-fixture'
    audit_fixture.mkdir()
    shutil.copyfile(protocol_path, audit_fixture / 'protocol.json')
    api.atomic_json(audit_fixture / 'result.json', {'fixture': True, 'scope': 'operational audit-stop test only'})
    api.atomic_json(audit_fixture / 'pause-request.json', {'schema': 1, 'run': str(audit_fixture),
                    'protocolHash': api.digest(protocol_path)})
    helper = (ROOT / '.codebase/scripts/runtime/lesson-pause-control.mjs').as_uri()
    audit_stop = output / 'audit-stop.mjs'
    audit_stop.write_text('import {pauseAudit} from ' + json.dumps(helper) + ';\npauseAudit(' +
                         json.dumps(str(audit_fixture)) + ',' + json.dumps(str(protocol_path)) + ',2);\n', encoding='utf-8')
    result_hash = api.digest(audit_fixture / 'result.json')
    run_script(audit_stop, audit_fixture, arguments=[])
    if not fly_controls.pause_receipt(audit_fixture, api) or api.digest(audit_fixture / 'result.json') != result_hash:
        raise AssertionError('Audit pause did not preserve the saved training result')
    fly_controls.archive_pause_request(audit_fixture, api)
    if (audit_fixture / 'pause-request.json').exists() or not list((audit_fixture / 'pause-history').iterdir()):
        raise AssertionError('Audit resume did not preserve and clear the previous request')
    if api.digest(ROOT / original) != before:
        raise AssertionError('Frozen source changed')
    summary = {'passed': True, 'exactFields': exact, 'lessons': actual['lesson'], 'receipts': actual['receiptCount'],
               'pauseAndResume': True, 'independentPrefixReplay': True, 'auditStopAcknowledged': True,
               'frozenSourceUnchanged': True, 'prefixHarnessSha256': api.digest(harness),
               'scope': 'Six-neuron prefix and operational audit-stop verification only; not a full curriculum audit or power-loss test'}
    api.atomic_json(output / 'verification.json', summary)
    print(json.dumps(summary))
except Exception as error:
    api.atomic_json(output / 'failure.json', {'error': str(error)})
    print(json.dumps({'passed': False, 'error': str(error), 'evidence': str(output)}))
    raise SystemExit(1)

"""Human terminal reporting and cooperative pause; no graph is loaded here."""
import hashlib
import json
import os
from pathlib import Path
import time
from datetime import datetime, timezone


def campaign_location(config, api):
    identifier = hashlib.sha256(str(Path(config['_path']).resolve()).encode()).hexdigest()[:16]
    return identifier, api.local(f'runs/python-actions/babysit-{identifier}.json')


def current_run(config, api):
    _, path = campaign_location(config, api)
    if path.exists():
        saved = api.read_json(path)
        if saved.get('configHash') != config['_hash']:
            raise ValueError('The run registration changed. Review the saved run before continuing.')
        return api.local(saved['currentRun'])
    return api.local(config['paths']['run'])


def pause_receipt(run, api):
    for name in ('paused-audit.json', 'paused.json'):
        path = run / name
        if not path.exists():
            continue
        receipt = api.read_json(path)
        if receipt.get('schema') != 1 or api.local(receipt['run']) != run:
            raise ValueError('Pause confirmation does not belong to this run')
        if receipt.get('protocolHash') != api.digest(run / 'protocol.json'):
            raise ValueError('Pause confirmation has a different protocol')
        if receipt['phase'] == 'training':
            checkpoint = api.local(receipt['checkpoint'])
            if checkpoint.parent != run or api.digest(checkpoint) != receipt['checkpointSha256']:
                raise ValueError('Saved progress changed after pause')
            data = api.read_json(checkpoint)
            if data.get('pendingReceipt') is not None or (data.get('session') or {}).get('pending') is not None:
                raise ValueError('Pause did not finish saving the lesson')
        elif receipt['phase'] in ('audit', 'between-jobs'):
            if api.digest(run / 'result.json') != receipt['resultSha256']:
                raise ValueError('Saved training result changed after pause')
        else:
            raise ValueError('Unknown pause confirmation')
        return receipt
    return None


def pause_between_jobs(run, api):
    if not (run / 'pause-request.json').exists():
        return False
    request = api.read_json(run / 'pause-request.json')
    if (request.get('schema') != 1 or api.local(request['run']) != run
            or request.get('protocolHash') != api.digest(run / 'protocol.json')):
        raise ValueError('Pause request does not belong to this registered run')
    api.atomic_json(run / 'paused.json', {
        'schema': 1, 'phase': 'between-jobs', 'run': str(run),
        'protocolHash': api.digest(run / 'protocol.json'),
        'resultSha256': api.digest(run / 'result.json'),
        'pausedAt': datetime.now(timezone.utc).isoformat(),
    })
    return True


def archive_pause_request(run, api, expected_request_hash=None):
    # Explicit babysit re-invocation resumes an audit without replaying its old pause request.
    if expected_request_hash is not None:
        request = run / 'pause-request.json'
        if not request.exists() or api.digest(request) != expected_request_hash:
            return
    for name in ('pause-request.json', 'paused-audit.json', 'paused.json'):
        path = run / name
        if path.exists():
            target = run / 'pause-history' / (str(time.time_ns()) + '-' + name)
            target.parent.mkdir(parents=True, exist_ok=True)
            os.replace(path, target)


def pause(config, api, wait_seconds=120):
    run = current_run(config, api)
    handle_path = api.state_path(config)
    live = api.inventory()
    if not handle_path.exists():
        print('No tracked curriculum is running. Saved progress is unchanged.')
        return 0
    handle = api.read_json(handle_path)
    if api.local(handle['run']) != run:
        raise ValueError('Tracked process belongs to another run; nothing was stopped')
    state, _ = api.matching_process(handle, live)
    if state == 'missing':
        if any(p['name'].lower() == 'node.exe' and
               (not p.get('command') or api.GRAPH_COMMAND.search(p['command'])) for p in live['processes']):
            raise ValueError('Another or unknown curriculum process is present; nothing was stopped')
        print('Curriculum is already stopped. Saved progress is available for fly babysit.')
        return 0
    if state != 'live':
        raise ValueError('Could not verify the running curriculum; nothing was stopped')
    supported = config.get('pause_control', {}).get('supported_executables', [])
    argv = handle.get('argv', [])
    if not any(path in argv or str(api.local(path)) in argv for path in supported):
        raise ValueError('This older running process has no lesson pause support; it was left running')
    api.atomic_json(run / 'pause-request.json', {
        'schema': 1, 'run': str(run), 'protocolHash': api.digest(run / 'protocol.json'),
        'requestedAt': datetime.now(timezone.utc).isoformat(),
    })
    print('Finishing the current lesson and saving...', flush=True)
    deadline = time.monotonic() + wait_seconds
    while True:
        handle = api.read_json(handle_path)
        if api.local(handle['run']) != run:
            raise ValueError('Tracked curriculum changed while pausing; inspect fly report')
        state, _ = api.matching_process(handle, api.inventory())
        receipt = pause_receipt(run, api)
        if state == 'missing' and receipt:
            print('PAUSED - progress saved. Safe to close. Resume with fly babysit.')
            return 0
        if state not in ('live', 'missing'):
            raise ValueError('Could not confirm the curriculum stopped; pause request is preserved')
        if state == 'missing' and (run / 'audit.json').is_file():
            print('FINISHED - training and verification are saved.')
            return 0
        if time.monotonic() >= deadline:
            print('Pause requested; still waiting for the lesson to finish. Check fly report.')
            return 0
        time.sleep(1)


def comparison_identity(protocol):
    # Full numerical/task identity is deliberately conservative; a changed seed is not improvement.
    ignored = {'created', 'registrationPeakRssMiB', 'parentDiagnostic', 'parentFailureAudit',
               'preflight', 'scope', 'approximations'}
    return json.dumps({k: v for k, v in protocol.items() if k not in ignored}, sort_keys=True)


def metrics(rows, protocol):
    values = {}
    names = {('acquisition', 'prefix'): 'Learning correct associations',
             ('interference', 'prefix'): 'Remembering after interference',
             ('reversal', 'retained'): 'Adapting when feedback changes',
             ('reversal', 'reset'): 'Fresh-start comparison'}
    for row in rows:
        if row.get('condition') != 'informative':
            continue
        key = (row.get('phase'), row.get('branch'))
        contexts = row.get('contextRows', [])
        if not contexts or key not in names:
            continue
        score = 100 * row['correct'] / len(contexts)
        values[names[key]] = (score, '%')
        controls = [r for r in rows if (r.get('phase'), r.get('branch')) == key and r.get('condition') != 'informative']
        expected = len(protocol.get('conditions', [])) - 1
        if expected > 0 and len(controls) == expected and all(r.get('contextRows') for r in controls):
            best = max(100 * r['correct'] / len(r['contextRows']) for r in controls)
            values[names[key] + ': lead over controls'] = (score - best, 'pp')
    return values


def trend(current, previous):
    if not current or set(current) != set(previous):
        return 'Not enough comparable data'
    deltas = [current[key][0] - previous[key][0] for key in current]
    up, down = any(n > 1e-8 for n in deltas), any(n < -1e-8 for n in deltas)
    if up and down:
        return 'Mixed - some measures improved, others declined'
    if up:
        return 'Looking positive'
    if down:
        return 'Showing regression'
    return 'No measured change'


def audited_evaluation(run, api):
    if not all((run / name).is_file() for name in ('result.json', 'audit.json', 'protocol.json')):
        return None
    result, audit = api.read_json(run / 'result.json'), api.read_json(run / 'audit.json')
    protocol = api.read_json(run / 'protocol.json')
    if not (audit.get('passed') is True and audit.get('fullNeuralReplay') is True
            and audit.get('receipts') == result.get('receiptCount')
            and result.get('identity', {}).get('protocolHash') == api.digest(run / 'protocol.json')):
        return None
    return result, protocol


def report(config, api):
    run = current_run(config, api)
    protocol = api.read_json(run / 'protocol.json') if (run / 'protocol.json').exists() else api.read_json(api.local(config['paths']['protocol']))
    reporting = config.get('reporting', {})
    stages = reporting.get('stages', [])
    saved = api.latest_checkpoint(run) if run.is_dir() else None
    final = (run / 'result.json').is_file()
    data = api.read_json(run / 'result.json') if final else api.read_json(saved) if saved else {}
    rows = data.get('stageResults', data.get('results', []))
    stage_index, lesson = data.get('stage', len(rows)), data.get('lesson', 0)
    total = sum(s['lessons'] for s in stages)
    complete = total if final else sum(s['lessons'] for s in stages[:stage_index]) + lesson
    completed = audited_evaluation(run, api)
    previous = None
    history = []
    for path in reporting.get('history', []):
        candidate = api.local(path)
        if candidate != run and (candidate / 'audit.json').is_file():
            history.append(candidate)
    for candidate in sorted(history, key=lambda p: (p / 'audit.json').stat().st_mtime, reverse=True):
        evaluation = audited_evaluation(candidate, api)
        if evaluation and comparison_identity(evaluation[1]) == comparison_identity(protocol):
            previous = evaluation
            break
    current_metrics = metrics(rows, protocol)
    previous_metrics = metrics(previous[0].get('stageResults', []), previous[1]) if previous else {}
    label = trend(current_metrics, previous_metrics) if completed and previous else 'Not enough comparable data'
    state, process = 'Stopped', None
    inspection_error = None
    try:
        live = api.inventory()
        if api.state_path(config).is_file():
            handle = api.read_json(api.state_path(config))
            if api.local(handle['run']) == run:
                observed, process = api.matching_process(handle, live)
                if observed == 'live':
                    state = 'Verifying results' if handle.get('role') == 'audit' else 'Training'
                    if (run / 'pause-request.json').exists():
                        state = 'Pausing - finishing the current lesson'
                elif observed not in ('missing',):
                    state = 'Run status unknown'
        if not process and pause_receipt(run, api):
            state = 'Paused - saved'
        elif not process and completed:
            state = 'Finished - independently verified'
        elif not process and final:
            state = 'Training finished - verification pending'
    except (OSError, ValueError, RuntimeError) as error:
        inspection_error = str(error)
        state = 'Run status unknown'
    print('+------------------------------------------------------------------+')
    print('|                         FLY CURRICULUM                           |')
    print('+------------------------------------------------------------------+')
    print('Status : ' + state)
    print('Study  : ' + reporting.get('title', config.get('name', 'Registered curriculum')))
    if total:
        ratio = min(1, max(0, complete / total))
        bars = int(28 * ratio)
        print(f'Lessons: [{"#" * bars}{"." * (28-bars)}] {ratio:.1%}  ({complete}/{total})')
        print('         Work completed in this study; not a measure of reasoning.')
        print(f'         {max(0, total-complete)} lessons remaining')
    if stages and stage_index < len(stages):
        print('Now    : ' + stages[stage_index]['label'])
    print('\nPERFORMANCE  |  ' + label)
    print('Evidence: ' + ('Independently verified' if completed else 'Preliminary - independent verification pending'))
    if not current_metrics:
        print('No completed skill measurements yet. Training activity is being saved.')
    for name, (value, unit) in current_metrics.items():
        old = previous_metrics.get(name) if completed else None
        if old:
            delta = value - old[0]
            print(f'  {name}\n    {old[0]:.1f}{unit} -> {value:.1f}{unit}   {delta:+.1f} percentage points')
        else:
            print(f'  {name}: {value:.1f}{unit}')
    if not completed or not previous:
        print('Change since last time: waiting for a completed, comparable evaluation.')
    if process:
        print(f'\nMemory in use: {process["workingSetMiB"]:.0f} MB')
        if process.get('created'):
            elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(process['created'].replace('Z', '+00:00'))).total_seconds()
            print(f'This session: {int(elapsed//3600)}h {int(elapsed%3600//60)}m elapsed')
    elif final and data.get('invocation', {}).get('elapsedSeconds') is not None:
        elapsed = data['invocation']['elapsedSeconds']
        print(f'\nLast training session: {int(elapsed//3600)}h {int(elapsed%3600//60)}m')
    else:
        receipt = pause_receipt(run, api)
        if receipt and receipt.get('elapsedSeconds') is not None:
            elapsed = receipt['elapsedSeconds']
            print(f'\nLast session: {int(elapsed//3600)}h {int(elapsed%3600//60)}m')
        else:
            print('\nSession time: unavailable for the earlier interruption')
    if inspection_error:
        print('Could not confirm process state; no activity was started or stopped.')
    print('\nCommands: fly babysit  |  fly pause  |  fly report')

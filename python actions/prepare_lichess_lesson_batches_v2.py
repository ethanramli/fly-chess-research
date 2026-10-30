"""Serial registered teacher-preparation chunks; no neural model or stage promotion."""
import argparse
import json
from pathlib import Path
import sys

import curriculum as actions


def checked_chunk(entry, config):
    pinned = {actions.local(actions.expand(config, path)): expected for path, expected in config.get('pins', {}).items()}
    manifest_path = actions.local(entry['manifest'])
    if actions.digest(manifest_path) != entry['manifestSha256']:
        raise ValueError('Changed completed chunk manifest')
    manifest = actions.read_json(manifest_path)
    body = manifest_path.parent / 'lessons.jsonl'
    if (manifest.get('schema') != 'lichess-prepared-lessons-v1'
            or manifest.get('neuralEventsDelivered') != 0 or manifest.get('graphLaunchAuthorized') is not False
            or manifest['counts']['rejected'] != 0
            or manifest['counts']['prepared'] != manifest['counts']['sourceRows']
            or actions.digest(body) != manifest['outputSha256']):
        raise ValueError('Incomplete or changed prepared chunk')
    argv = actions.resolve_command(config, config['jobs'][entry['job']])
    argument = lambda flag: argv[argv.index(flag) + 1]
    if (manifest['input']['sha256'] != actions.digest(argument('--rows'))
            or manifest['split'] != argument('--split')
            or manifest['selection']['startRow'] != int(argument('--start-row'))
            or manifest['selection']['rowLimit'] != int(argument('--row-limit'))
            or manifest['counts']['sourceRows'] != int(argument('--row-limit'))):
        raise ValueError('Prepared chunk differs from registered source range')
    for path, expected in manifest['sources'].items():
        source = actions.local(path)
        if actions.digest(source) != expected or source in pinned and pinned[source] != expected:
            raise ValueError('Changed preparation source: ' + path)
    for path, expected in manifest['sourceGames'].items():
        source = actions.local(path)
        if actions.digest(source) != expected or source in pinned and pinned[source] != expected:
            raise ValueError('Changed source game: ' + path)
    return manifest


def run(config_path, out, resume=None, stop_after=None):
    base = actions.load_config(config_path)
    order = base['preparation']['order']
    if (not isinstance(order, list) or not 1 <= len(order) <= 128 or len(set(order)) != len(order)
            or any(base['jobs'][job]['role'] != 'check' for job in order)):
        raise ValueError('Require bounded registered check-only preparation order')
    for job in order:
        argv = actions.resolve_command(base, base['jobs'][job])
        if (len(argv) < 3 or Path(argv[2]).resolve() != actions.local('.codebase/scripts/data/prepare-lichess-lessons-v2.mjs')
                or '--rows' not in argv or '--start-row' not in argv or '--row-limit' not in argv):
            raise ValueError('Batch action supports the registered CSV teacher producer only')
    pins = actions.verify(base)
    if any(p['actual'] != p['expected'] for p in pins):
        raise ValueError('Batch input/source pin mismatch')
    out = actions.local(out)
    if out.exists():
        raise ValueError('Preserve existing batch attempt; require a fresh output directory')
    if stop_after is not None and not 1 <= stop_after <= len(order):
        raise ValueError('Invalid bounded stop count')
    state = {'schema': 'lichess-preparation-batches-v1', 'configSha256': base['_hash'],
             'completed': [], 'pending': None, 'phase': 'ready', 'parentState': None}
    if resume:
        source = actions.local(resume)
        state = actions.read_json(source)
        if state.get('schema') != 'lichess-preparation-batches-v1' or state.get('configSha256') != base['_hash']:
            raise ValueError('Recovery registration differs')
        if state['phase'] in ('failed', 'complete'):
            raise ValueError('Failed or completed attempts require review, not automatic replay')
        if state['phase'] == 'preparing' and state['pending'] is None:
            raise ValueError('Uncertain prior launch without child receipt; inspect before recovery')
        if [entry['job'] for entry in state['completed']] != order[:len(state['completed'])]:
            raise ValueError('Invalid completed chunk sequence')
        for entry in state['completed']:
            checked_chunk(entry, base)
        if state['pending']:
            process_state, _ = actions.matching_process(state['pending'], actions.inventory())
            if process_state != 'missing':
                raise ValueError('Prior preparation process is live or ownership is unknown')
        state['parentState'] = {'path': str(source), 'sha256': actions.digest(source)}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.mkdir()
    payload = {key: value for key, value in base.items() if key not in ('_path', '_hash')}
    payload['paths'] = {**payload['paths'], 'run': str(out)}
    runtime_path = out / 'runtime-config.json'
    actions.atomic_json(runtime_path, payload)
    config = actions.load_config(runtime_path)
    state_path = out / 'checkpoint.json'
    state['pending'] = None
    actions.atomic_json(state_path, state)
    for job in order[len(state['completed']):]:
        if actions.digest(base['_path']) != base['_hash'] or any(p['actual'] != p['expected'] for p in actions.verify(base)):
            raise ValueError('Registration or input changed during preparation')
        state['phase'] = 'preparing'
        actions.atomic_json(state_path, state)
        def started(handle):
            state['pending'] = handle
            actions.atomic_json(state_path, state)
        try:
            result = actions.execute(config, job, foreground=True, on_started=started)
        except Exception as error:
            state['phase'] = 'failed'
            state['failure'] = {'error': str(error), 'job': job}
            actions.atomic_json(state_path, state)
            raise
        if result['exitCode'] != 0:
            state['phase'] = 'failed'
            state['failure'] = result
            actions.atomic_json(state_path, state)
            actions.emit({'checkpoint': 'preparation-failed', 'job': job, 'state': str(state_path), 'logs': result['logs']})
            return result['exitCode'] or 1
        try:
            target = actions.local(actions.expand(config, config['jobs'][job]['fresh_output'])) / 'manifest.json'
            entry = {'job': job, 'manifest': str(target), 'manifestSha256': actions.digest(target)}
            manifest = checked_chunk(entry, config)
        except Exception as error:
            state['phase'] = 'failed'
            state['failure'] = {'error': str(error), 'job': job}
            actions.atomic_json(state_path, state)
            raise
        entry['counts'] = manifest['counts']
        state['completed'].append(entry)
        state['pending'] = None
        state['phase'] = 'ready'
        actions.atomic_json(state_path, state)
        actions.emit({'checkpoint': 'chunk-complete', 'job': job, 'completed': len(state['completed']),
                      'total': len(order), 'counts': entry['counts']})
        if stop_after is not None and len(state['completed']) >= stop_after and len(state['completed']) < len(order):
            state['phase'] = 'bounded-stop'
            actions.atomic_json(state_path, state)
            return 0
    state['phase'] = 'complete'
    actions.atomic_json(state_path, state)
    actions.atomic_json(out/'manifest.json', {**state, 'neuralEventsDelivered': 0,
        'graphLaunchAuthorized': False, 'independentLessonAuditPassed': False,
        'scope': 'Complete registered teacher-preparation chunks; requires independent CSV lesson audit and family registration before learning.'})
    actions.emit({'checkpoint': 'preparation-complete', 'chunks': len(order), 'manifest': str(out/'manifest.json')})
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--resume')
    parser.add_argument('--stop-after-chunks', type=int)
    args = parser.parse_args()
    return run(args.config, args.out, args.resume, args.stop_after_chunks)


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        actions.emit({'actionError': str(error), 'scope': 'No automatic retry or neural teaching'})
        raise SystemExit(2)

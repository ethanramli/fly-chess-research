"""Wait for the existing audit, then run the pinned exclusive latency comparison and its audit once."""
import argparse
import json
from pathlib import Path
import subprocess
import time

import curriculum as actions

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / 'python actions/training-latency-step.json'


def wait(handle, deadline, interval, label):
    previous = None
    while True:
        live = actions.inventory()
        state, row = actions.matching_process(handle, live)
        milestone = actions.progress(handle['stdout'])
        fingerprint = (state, json.dumps(milestone, sort_keys=True))
        if fingerprint != previous:
            actions.emit({'phase': label, 'state': state, 'pid': handle['pid'], 'progress': milestone,
                          'freeMiB': live['freeMiB'], 'workingSetMiB': row.get('workingSetMiB') if row else None})
            previous = fingerprint
        if state == 'missing':
            return
        if state != 'live':
            raise RuntimeError(f'{label}: process identity unknown; preserve handle and do not launch')
        if row['workingSetMiB'] > 768:
            raise RuntimeError(f'{label}: RSS guard exceeded; process left untouched')
        if time.monotonic() >= deadline:
            raise TimeoutError(f'{label}: observation window ended while process remains live; no restart or termination')
        time.sleep(min(interval, max(0, deadline - time.monotonic())))


def require(path, fields):
    data = actions.read_json(path)
    for field in fields:
        if data.get(field) is not True:
            raise RuntimeError(f'Publication does not prove {field}: {path}')
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wait-seconds', type=int, default=14400)
    parser.add_argument('--interval', type=int, default=30)
    args = parser.parse_args()
    if not 1 <= args.wait_seconds <= 21600 or not 1 <= args.interval <= 60:
        raise ValueError('Bound wait to1-21600 seconds and polling to1-60 seconds')
    deadline = time.monotonic() + args.wait_seconds
    # Pin the exact already owned audit handle; never resume or replace its process.
    existing = actions.read_json(ROOT / 'runs/python-actions/current.json')
    if existing.get('job') != 'audit' or existing.get('run') != str(ROOT / 'runs/g0-reversal-history-diagnostic-v1-resumed2'):
        raise RuntimeError('Unexpected curriculum owner/run; no graph launch')
    actions.emit({'phase': 'reserved-window', 'waitingForPid': existing['pid'],
                  'configSha256': actions.digest(CONFIG), 'campaignSha256': actions.digest(__file__),
                  'scope': 'User paused curriculum scheduling; finish current audit first'})
    wait(existing, deadline, args.interval, 'curriculum-audit')
    require(existing['artifacts']['audit'], ['passed', 'fullNeuralReplay'])

    for job, artifact, required in [('profile', 'report', []), ('timing-audit', 'timing-audit', ['integrityPassed'])]:
        config = actions.load_config(CONFIG)
        prepared = actions.plan(config, job)
        if not prepared['ready']:
            raise RuntimeError('; '.join(prepared['blockers']))
        launched = actions.execute(config, job)
        actions.emit({'phase': job, **launched})
        handle = actions.read_json(actions.state_path(config))
        wait(handle, deadline, args.interval, job)
        path = actions.local(actions.expand(config, config['artifacts'][artifact]))
        require(path, required)
    result = actions.read_json(actions.local(actions.expand(config, config['artifacts']['timing-audit'])))
    actions.emit({'phase': 'complete', 'integrityPassed': result['integrityPassed'], 'timingPassed': result['timingPassed'],
                  'gates': result['gates'], 'perCondition': result['perCondition'], 'pooledReduction': result['pooledReduction'],
                  'scope': 'Comparison and independent disk audit only; production adoption remains separate'})


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError, TimeoutError, subprocess.SubprocessError) as error:
        actions.emit({'campaignError': str(error), 'scope': 'No automatic retry, restart, process termination or adoption'})
        raise SystemExit(1)

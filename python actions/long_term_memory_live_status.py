"""Bounded read-only observation of the registered live memory comparison."""
import argparse
from datetime import datetime
import json
from pathlib import Path
import time

import curriculum


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--seconds', type=int, default=0)
    args = parser.parse_args()
    assert 0 <= args.seconds <= 50
    deadline, previous = time.monotonic() + args.seconds, None
    while True:
        path = args.run / 'manifest.json'
        manifest = json.loads(path.read_text()) if path.exists() else {}
        progress_path = args.run / 'progress.json'
        progress = json.loads(progress_path.read_text()) if progress_path.exists() else None
        inventory = curriculum.inventory()
        process = next((p for p in inventory['processes'] if p['pid'] == manifest.get('pid')), None)
        identity = False
        if process and process.get('created') and manifest.get('processCreatedApprox'):
            born = datetime.fromisoformat(process['created'].replace('Z', '+00:00'))
            expected = datetime.fromisoformat(manifest['processCreatedApprox'].replace('Z', '+00:00'))
            identity = abs((born - expected).total_seconds()) < 2
        terminal = manifest.get('status') in ['complete', 'failed']
        state = manifest['status'] if terminal else 'live' if identity else 'ownership-unknown'
        result = {'state': state, 'progress': progress, 'process': process if identity else None,
                  'freeMiB': inventory['freeMiB'], 'error': manifest.get('error'), 'automaticRestart': False}
        fingerprint = (state, json.dumps(progress, sort_keys=True))
        if fingerprint != previous:
            print(json.dumps({'scope': result}, separators=(',', ':')), flush=True)
            previous = fingerprint
        if terminal or time.monotonic() >= deadline:
            return
        time.sleep(min(10, max(0, deadline - time.monotonic())))


if __name__ == '__main__':
    main()

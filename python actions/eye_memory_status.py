"""Bounded read-only monitoring for the pinned eye-memory run; never starts/retries work."""
import argparse
import json
from pathlib import Path
import re
import time
import curriculum

parser = argparse.ArgumentParser()
parser.add_argument('--config', default='python actions/eye-memory-cubic-v1-recovery1-step.json')
parser.add_argument('--seconds', type=int, default=0)
args = parser.parse_args()
if not 0 <= args.seconds <= 55:
    parser.error('--seconds must be 0..55')
config = curriculum.load_config(curriculum.local(args.config))
run = curriculum.local(config['paths']['run'])
deadline = time.monotonic() + args.seconds
previous = None
while True:
    status = curriculum.status(config)
    result = {k: status.get(k) for k in ('state', 'pid', 'workingSetMiB', 'freeMiB', 'stderrBytes', 'resourceGuardExceeded')}
    for name in ('progress', 'completed'):
        path = run / (name + '.json')
        if path.exists():
            result[name] = curriculum.read_json(path)
    snapshots = list(run.glob('snapshot-*.json'))
    if snapshots:
        result['lastPublishedSnapshot'] = max(snapshots, key=lambda p: p.stat().st_mtime_ns).name
    summary = run / 'summary.json'
    if summary.exists():
        s = curriculum.read_json(summary)
        result['result'] = {'marks': {k: v['pass'] for k, v in s['marks'].items()}, 'wall': s['wall'], 'peakRssMiB': s['maxRssMiB']}
    log = curriculum.ROOT / 'research/reports/memory-retention-continuation-2026-11-01/regression-tests.txt'
    if log.exists():
        data = log.read_bytes()
        text = data.decode('utf-16' if data.startswith(b'\xff\xfe') else 'utf-8-sig', errors='replace')
        counts = dict(re.findall(r'^# (tests|pass|fail|duration_ms) (\S+)', text, re.M))
        result['regression'] = counts
    milestone = (result['state'], result.get('completed'), result.get('result'), result.get('lastPublishedSnapshot'),
                 result.get('progress', {}).get('seed'), result.get('progress', {}).get('arm'),
                 result.get('progress', {}).get('context', {}).get('phase'), result['stderrBytes'],
                 result['resourceGuardExceeded'])
    if milestone != previous or time.monotonic() >= deadline:
        print(json.dumps(result, separators=(',', ':')), flush=True)
        previous = milestone
    if status['state'] != 'live' or time.monotonic() >= deadline:
        break
    time.sleep(min(10, deadline - time.monotonic()))

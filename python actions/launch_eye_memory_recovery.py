"""Launch one registered continuation using the existing Windows breakaway helper."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys
import time
from uuid import uuid4
import curriculum

parser = argparse.ArgumentParser()
parser.add_argument('--config', default='python actions/eye-memory-cubic-v1-recovery1-step.json')
args = parser.parse_args()
config = curriculum.load_config(curriculum.local(args.config))
assert not curriculum.state_path(config).exists(), 'Preserve existing launch handle; never auto-relaunch'
assert not curriculum.local(config['paths']['run']).exists(), 'Require a fresh recovery output'
prepared = curriculum.plan(config, 'train')
assert prepared['ready'], prepared['blockers']
directory = curriculum.local('runs/python-actions/detached')
directory.mkdir(parents=True, exist_ok=True)
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + uuid4().hex[:8]
log = directory / ('eye-memory-recovery-' + stamp + '.log')
receipt = directory / ('eye-memory-recovery-' + stamp + '.json')
argv = [str(Path(curriculum.__file__).resolve()), '--config', str(curriculum.local(args.config)), 'start', 'train']
assert all('"' not in x and '\n' not in x for x in [sys.executable, *argv, str(log)])
# The generic babysit expects result.json; this assay publishes summary.json, so detach its registered start directly.
command = 'cmd.exe /d /s /c ""{}" {} >> "{}" 2>&1"'.format(sys.executable, subprocess.list2cmdline(argv), log)
record = {'schema': 1, 'config': args.config, 'configHash': config['_hash'], 'command': command, 'log': str(log), 'status': 'launch-intent'}
curriculum.atomic_json(receipt, record)
pid = curriculum.launch_detached(command)
record.update(launcherPid=pid, status='launcher-started')
curriculum.atomic_json(receipt, record)
deadline = time.monotonic() + 10
while not curriculum.state_path(config).exists() and time.monotonic() < deadline:
    time.sleep(.1)
assert curriculum.state_path(config).exists(), 'No owned handle published; inspect detached log, do not relaunch'
handle = curriculum.read_json(curriculum.state_path(config))
assert handle['argv'] == prepared['argv']
observed = curriculum.status(config)
assert observed['state'] == 'live', observed
outside = curriculum.process_in_any_job(handle['pid'])
record.update(pid=handle['pid'], inAnyJob=outside, status='live' if outside is False else 'job-membership-unverified')
curriculum.atomic_json(receipt, record)
assert outside is False, 'Process still in a job or membership unknown; preserve handle and investigate'
print(json.dumps({'state': 'live', 'pid': handle['pid'], 'inAnyJob': outside, 'run': config['paths']['run'], 'receipt': str(receipt), 'logs': {'launcher': str(log), 'stdout': handle['stdout'], 'stderr': handle['stderr']}}))

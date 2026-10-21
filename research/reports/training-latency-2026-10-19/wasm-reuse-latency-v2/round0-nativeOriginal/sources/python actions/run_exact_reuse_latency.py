"""Explicit serial runtime fallback after v3 integrity passes; never restart or adopt."""
from pathlib import Path
import argparse
import json
import shutil
import subprocess
import time

import curriculum as actions
from run_latency_campaign import wait, require

ROOT = Path(__file__).resolve().parent.parent
CAMPAIGN = ROOT / 'python actions/exact-reuse-latency-campaign.json'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wait-seconds', type=int, default=14400)
    args = parser.parse_args()
    if not 1 <= args.wait_seconds <= 21600:
        raise ValueError('Observation deadline must be bounded')
    campaign = actions.read_json(CAMPAIGN)
    for path, expected in campaign['sources'].items():
        if actions.digest(actions.local(path)) != expected:
            raise ValueError('Campaign source pin mismatch: ' + path)
    prerequisite = actions.read_json(actions.local(campaign['prerequisite']))
    if prerequisite.get('integrityPassed') is not True or prerequisite.get('checkpointsInspected') != 2100:
        raise ValueError('Require the completed independently verified v3 comparison first')
    for entry in [*campaign['profiles'], campaign['audit']]:
        if actions.digest(actions.local(entry['config'])) != entry['sha256']:
            raise ValueError('Registered step configuration changed: ' + entry['config'])
    first_config = actions.load_config(actions.local(campaign['profiles'][0]['config']))
    ready = actions.plan(first_config, 'profile')
    if not ready['ready']:
        raise ValueError('; '.join(ready['blockers']))
    root = actions.local(campaign['run'])
    root.mkdir()
    shutil.copyfile(actions.local(campaign['protocol']), root / 'protocol.json')
    shutil.copyfile(CAMPAIGN, root / 'campaign.json')
    shutil.copyfile(__file__, root / 'campaign-source.py')
    deadline = time.monotonic() + args.wait_seconds
    index = {'protocolSha256': actions.digest(root / 'protocol.json'), 'batches': []}
    actions.atomic_json(root / 'batch-index.json', index)
    for entry in campaign['profiles']:
        config = actions.load_config(actions.local(entry['config']))
        launched = actions.execute(config, 'profile')
        actions.emit({'phase': entry['id'], **launched})
        handle = actions.read_json(actions.state_path(config))
        wait(handle, deadline, 30, entry['id'])
        report_path = actions.local(actions.expand(config, config['artifacts']['report']))
        report = require(report_path, ['exactHistoricalReceipts'])
        if report.get('presentations') != 273:
            raise ValueError('Incomplete batch publication: ' + entry['id'])
        index['batches'].append({'id': entry['id'], 'handle': handle, 'report': str(report_path),
                                 'processUptimeSeconds': report['processUptimeSeconds']})
        actions.atomic_json(root / 'batch-index.json', index)
    config = actions.load_config(actions.local(campaign['audit']['config']))
    launched = actions.execute(config, 'audit')
    actions.emit({'phase': 'independent-audit', **launched})
    wait(actions.read_json(actions.state_path(config)), deadline, 30, 'independent-audit')
    result = require(root / 'timing-audit.json', ['integrityPassed'])
    actions.emit({'phase': 'complete', **{key: result[key] for key in ('integrityPassed', 'timingPassed',
                  'perCondition', 'pooledReduction', 'coldInvocationReduction', 'variants')},
                  'scope': 'Historical complete-lesson benchmark and cold process accounting; no automatic adoption'})


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, AssertionError, RuntimeError, TimeoutError, subprocess.SubprocessError) as error:
        actions.emit({'campaignError': str(error), 'scope': 'Preserve all outputs/handles; no automatic retry, restart, termination or adoption'})
        raise SystemExit(1)

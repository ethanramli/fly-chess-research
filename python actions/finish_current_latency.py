"""Observe the already-started v3 profile, then run its registered independent audit once."""
import json
import time

import curriculum as actions
from run_latency_campaign import CONFIG, wait, require


def main():
    config = actions.load_config(CONFIG)
    handle = actions.read_json(actions.state_path(config))
    if handle['job'] != 'profile' or handle['configHash'] != config['_hash']:
        raise ValueError('Unexpected profile handle; preserve it without launching')
    deadline = time.monotonic() + 14400
    wait(handle, deadline, 30, 'existing-profile')
    report = actions.local(actions.expand(config, config['artifacts']['report']))
    require(report, [])
    launched = actions.execute(config, 'timing-audit')
    actions.emit({'phase': 'independent-audit', **launched})
    wait(actions.read_json(actions.state_path(config)), deadline, 30, 'independent-audit')
    result = require(actions.local(actions.expand(config, config['artifacts']['timing-audit'])), ['integrityPassed'])
    actions.emit({'phase': 'complete', **{key: result[key] for key in
                  ('integrityPassed', 'timingPassed', 'gates', 'perCondition', 'pooledReduction')},
                  'scope': 'Historical teaching lessons only; no automatic adoption or curriculum audit claim'})


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError, TimeoutError) as error:
        actions.emit({'campaignError': str(error), 'scope': 'Preserve processes and artifacts; no retry or restart'})
        raise SystemExit(1)

"""Three exact repetitions of the accepted frozen benchmark, using curriculum actions."""
import argparse
import copy
import json
from pathlib import Path
import shutil
import statistics
import subprocess
import time

import curriculum as actions
from run_latency_campaign import wait, require

ROOT = Path(__file__).resolve().parents[1]
REG = ROOT / 'research/data/training-latency-repeatability-v1/registration.json'
OUT = 'research/reports/training-latency-2026-10-19/repeatability-v1'
ORIGINAL = ROOT / 'python actions/runtime-latency-campaign.json'


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def prepare():
    if REG.parent.exists():
        raise ValueError('Registration already exists; do not overwrite or silently prepare again')
    original = actions.read_json(ORIGINAL)
    accepted = require(ROOT / 'research/reports/training-latency-2026-10-19/runtime-comparison-v2/timing-audit.json',
                       ['integrityPassed', 'timingPassed'])
    registration = {'schema': 1, 'output': OUT, 'originalCampaignSha256': actions.digest(ORIGINAL),
        'referencePooledReduction': accepted['pooledReduction'], 'absoluteTolerance': .05,
        'consistencyDefinition': 'All three independently valid repetitions within five percentage points of the historical pooled reduction; report all timings and failures.',
        'noRetries': True, 'noImplementationChanges': True, 'trials': []}
    for trial in range(1, 4):
        run = f'{OUT}/trial{trial}'
        campaign = copy.deepcopy(original)
        campaign['run'] = run
        campaign['sources']['python actions/repeat_training_latency.py'] = actions.digest(__file__)
        for entry in [*campaign['profiles'], campaign['audit']]:
            config = copy.deepcopy(actions.read_json(actions.local(entry['config'])))
            is_audit = entry is campaign['audit']
            label = 'audit' if is_audit else entry['id']
            config['name'] = f'latency-repeatability-v1-trial{trial}-{label}'
            config['paths']['run'] = run if is_audit else f'{run}/{label}'
            config['state_file'] = f'runs/python-actions/latency-repeatability-v1-trial{trial}-{label}-current.json'
            path = REG.parent / f'trial{trial}-{label}.json'
            write(path, config)
            entry['config'] = path.relative_to(ROOT).as_posix()
            entry['sha256'] = actions.digest(path)
        path = REG.parent / f'trial{trial}-campaign.json'
        write(path, campaign)
        registration['trials'].append({'trial': trial, 'campaign': path.relative_to(ROOT).as_posix(),
                                       'sha256': actions.digest(path)})
    registration['sourceSha256'] = actions.digest(__file__)
    write(REG, registration)
    actions.emit({'prepared': str(REG.relative_to(ROOT)), 'trials': 3, 'serialTimedBatches': 12,
                  'independentAudits': 3, 'referenceReduction': registration['referencePooledReduction'],
                  'absoluteTolerance': registration['absoluteTolerance'], 'started': False})


def run(seconds):
    registration = actions.read_json(REG)
    if actions.digest(__file__) != registration['sourceSha256'] or actions.digest(ORIGINAL) != registration['originalCampaignSha256']:
        raise ValueError('Repeatability registration source mismatch')
    # Validate every prospective command/config/source before the first launch.
    campaigns = []
    for trial in registration['trials']:
        path = actions.local(trial['campaign'])
        if actions.digest(path) != trial['sha256']:
            raise ValueError('Changed registered campaign: ' + str(path))
        campaign = actions.read_json(path)
        for path, expected in campaign['sources'].items():
            if actions.digest(actions.local(path)) != expected:
                raise ValueError('Changed registered source: ' + path)
        for entry in [*campaign['profiles'], campaign['audit']]:
            if actions.digest(actions.local(entry['config'])) != entry['sha256']:
                raise ValueError('Changed registered command: ' + entry['config'])
        require(actions.local(campaign['prerequisite']), ['integrityPassed'])
        campaigns.append((trial['trial'], campaign))
    ready = actions.plan(actions.load_config(actions.local(campaigns[0][1]['profiles'][0]['config'])), 'profile')
    if not ready['ready']:
        raise ValueError('; '.join(ready['blockers']))
    root = ROOT / registration['output']
    root.mkdir(parents=True, exist_ok=False)
    shutil.copyfile(REG, root / 'registration.json')
    shutil.copyfile(__file__, root / 'action-source.py')
    deadline = time.monotonic() + seconds
    results = []
    for number, campaign in campaigns:
        directory = actions.local(campaign['run'])
        directory.mkdir()
        shutil.copyfile(actions.local(campaign['protocol']), directory / 'protocol.json')
        write(directory / 'campaign.json', campaign)
        index = {'protocolSha256': actions.digest(directory / 'protocol.json'), 'batches': []}
        actions.atomic_json(directory / 'batch-index.json', index)
        for entry in campaign['profiles']:
            config = actions.load_config(actions.local(entry['config']))
            launched = actions.execute(config, 'profile')
            label = f'trial{number}/{entry["id"]}'
            actions.emit({'phase': label, **launched})
            handle = actions.read_json(actions.state_path(config))
            wait(handle, deadline, 30, label)
            report_path = actions.local(actions.expand(config, config['artifacts']['report']))
            report = require(report_path, ['exactHistoricalReceipts'])
            if report.get('presentations') != 273:
                raise ValueError('Incomplete matched batch: ' + label)
            index['batches'].append({'id': entry['id'], 'handle': handle, 'report': str(report_path),
                                     'processUptimeSeconds': report['processUptimeSeconds']})
            actions.atomic_json(directory / 'batch-index.json', index)
            actions.emit({'phase': label, 'terminalReport': True,
                          'measuredSeconds': sum(row['elapsedMs'] for row in report['samples']) / 1000})
        config = actions.load_config(actions.local(campaign['audit']['config']))
        actions.emit({'phase': f'trial{number}/audit', **actions.execute(config, 'audit')})
        wait(actions.read_json(actions.state_path(config)), deadline, 30, f'trial{number}/audit')
        audit = require(directory / 'timing-audit.json', ['integrityPassed'])
        result = {'trial': number, 'integrityPassed': audit['integrityPassed'], 'timingPassed': audit['timingPassed'],
            'beforeSeconds': audit['variants']['json6']['measuredSeconds'],
            'afterSeconds': audit['variants']['nativeZstd1']['measuredSeconds'],
            'pooledReduction': audit['pooledReduction'], 'coldInvocationReduction': audit['coldInvocationReduction'],
            'perCondition': audit['perCondition'], 'audit': str((directory / 'timing-audit.json').relative_to(ROOT))}
        results.append(result)
        actions.atomic_json(root / 'trial-results.json', results)
        actions.emit({'phase': 'trial-complete', **result})
    reductions = [r['pooledReduction'] for r in results]
    summary = {'completedTrials': 3, 'trials': results, 'referenceReduction': registration['referencePooledReduction'],
        'absoluteTolerance': registration['absoluteTolerance'], 'meanReduction': statistics.mean(reductions),
        'medianReduction': statistics.median(reductions), 'minReduction': min(reductions), 'maxReduction': max(reductions),
        'sampleStandardDeviation': statistics.stdev(reductions),
        'consistentWithinDeclaredBand': all(r['timingPassed'] and abs(r['pooledReduction'] - registration['referencePooledReduction'])
                                          <= registration['absoluteTolerance'] for r in results),
        'scope': 'Three repetitions of the selected-lesson benchmark, not whole-curriculum speed or new optimization.'}
    actions.atomic_json(root / 'summary.json', summary)
    actions.emit(summary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--prepare', action='store_true')
    modes.add_argument('--run', action='store_true')
    parser.add_argument('--wait-seconds', type=int, default=21600)
    args = parser.parse_args()
    if not 1 <= args.wait_seconds <= 21600:
        raise ValueError('Observation window must be bounded to1-21600 seconds')
    if args.prepare:
        prepare()
    else:
        run(args.wait_seconds)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, AssertionError, RuntimeError, TimeoutError, subprocess.SubprocessError) as error:
        actions.emit({'repeatabilityError': str(error), 'scope': 'Preserve handles and evidence; no retry, restart, kill or automatic adoption.'})
        raise SystemExit(1)

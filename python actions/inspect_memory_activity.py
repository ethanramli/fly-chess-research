"""Read existing local receipts; never run a graph or allocate learner memory."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import statistics
import time

import curriculum

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / 'research/reports/memory-interference-diagnosis-2026-11-01/activity-reliability-spec.md'


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def atomic(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + '.partial')
    temporary.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def step(trace, states, k, dan, dt, config):
    target = max(0., min(1., (k - config['theta']) / (1 - config['theta'])))
    trace = target + (trace - target) * math.exp(-dt / config['tauE'])
    drive = dan['excess'] + dan['deficit']
    if drive == 0 or trace == 0:
        return trace, states[:]
    base = trace * config['eta'] * drive * dt
    p, px = -math.expm1(-base), -math.expm1(-base * (drive / .25) ** 2)
    pd, pu = p * dan['excess'] / drive, p * dan['deficit'] / drive
    xd, xu = px * dan['excess'] / drive, px * dan['deficit'] / drive
    a, b, c, d = states
    result = [(1 - p) * a + xd * b, (1 - xd) * b + pu * (a + c),
              (1 - p) * c + xu * d, (1 - xu) * d + pd * (c + a)]
    total = sum(result)
    assert abs(total - 1) <= 1e-12 and all(v >= 0 and math.isfinite(v) for v in result)
    return trace, [v / total for v in result]


def self_test():
    config = dict(theta=.2, tauE=.5, eta=2)
    trace, states = step(.7, [.2, .3, .1, .4], 0, dict(excess=0, deficit=0), 4, config)
    assert abs(trace - .7 * math.exp(-8)) < 1e-15 and states == [.2, .3, .1, .4]
    trace, states = step(0, [1, 0, 0, 0], .9, dict(excess=.5, deficit=0), 1, config)
    assert trace > 0 and states[0] < 1 and states[3] > 0
    print(json.dumps(dict(status='self-test-passed', checks=2)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path)
    parser.add_argument('--diagnostic', type=Path)
    parser.add_argument('--audit', type=Path)
    parser.add_argument('--out', type=Path)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    assert all((args.run, args.diagnostic, args.audit, args.out))
    run, diagnostic, out = args.run.resolve(), args.diagnostic.resolve(), args.out.resolve()
    assert out.is_relative_to(ROOT) and not out.exists()
    audit, manifest, result = load(args.audit), load(diagnostic / 'manifest.json'), load(diagnostic / 'result.json')
    assert audit['status'] == 'audit-passed' and manifest['status'] == result['status'] == 'complete'
    assert manifest['resultSha256'] == sha(diagnostic / 'result.json')
    for key, file in [('records', 'records.jsonl'), ('summary', 'summary.json')]:
        assert audit['sources'][key] == sha(run / file)
    for file, expected in manifest['pins'].items():
        assert sha(ROOT / file) == expected, f'Changed diagnostic input: {file}'
    files = [SPEC, Path(__file__), args.audit, diagnostic / 'manifest.json', diagnostic / 'result.json', run / 'frames-4102-informative.jsonl']
    files += [run / f'snapshot-4102-informative-{p}.json' for p in ['T2', 'T3', 'Delay', 'Rev']]
    pins = {str(p.resolve()): sha(p) for p in files}
    started = time.monotonic()

    def guard(measure=False):
        assert time.monotonic() - started < 60, 'Elapsed guard'
        if measure:
            observed = curriculum.inventory()
            own = next(p for p in observed['processes'] if p['pid'] == os.getpid())
            assert own['workingSetMiB'] <= 2048 and observed['freeMiB'] >= 256, 'Memory guard'
            return dict(rssMiB=own['workingSetMiB'], freeMiB=observed['freeMiB'])

    resources = [guard(True)]
    out.mkdir(parents=True)
    published = dict(schema='existing-memory-activity-v1', status='running', pins=pins, limits=dict(wallSeconds=60, rssMiB=2048, freeMiB=256))
    atomic(out / 'manifest.json', published)
    try:
        source = run / 'frames-4102-informative.jsonl'
        old, reversal = set(), set()
        with source.open(encoding='utf-8') as stream:
            header = json.loads(next(stream))
            for line in stream:
                guard(); row = json.loads(line)
                if row['kind'] != 'frame':
                    continue
                if row['context']['phase'] == 'B3' and row['context']['step'] == 'choice' and row['dt'] == 1:
                    old.update(k for k, _ in row['ks'])
                if row['context']['phase'] == 'REV':
                    reversal.update(k for k, _ in row['ks'])
        groups, config = header['mapping']['groups'], header['config']
        selected, ordinal = [], 0
        for group, g in enumerate(groups):
            for kc, edge in zip(g['kc'], g['edges'], strict=True):
                if kc in old & reversal:
                    selected.append(dict(slot=ordinal, group=group, kc=kc, edge=edge, mbon=g['mbonType'], dan=g['danType']))
                ordinal += 1
        assert len(selected) == result['primary']['countByCategory']['shared'] == 6
        saved = {p: load(run / f'snapshot-4102-informative-{p}.json')['snapshot'] for p in ['T2', 'T3', 'Delay', 'Rev']}
        states, active_phase, last_trial, choices = {}, None, None, {}
        measurements, endpoint_errors, rows_written = {}, {}, 0
        with source.open(encoding='utf-8') as stream, (out / 'edge-observations.jsonl').open('x', encoding='utf-8') as receipts:
            for line in stream:
                guard(); row = json.loads(line)
                if row['kind'] == 'trial':
                    last_trial = row
                if row['kind'] != 'frame' or row['context']['phase'] not in ['B3', 'REV']:
                    continue
                phase, context = row['context']['phase'], row['context']
                if phase != active_phase:
                    active_phase = phase; initial = saved['T2' if phase == 'B3' else 'Delay']
                    states = {s['slot']: dict(trace=initial['traces'][s['slot']], states=initial['states'][4*s['slot']:4*s['slot']+4], gain=initial['gains'][s['slot']]) for s in selected}
                activity = dict(row['ks'])
                assert len(activity) == len(row['ks']) and all(config['theta'] < k <= 1 for k in activity.values())
                is_choice = context['step'] == 'choice' and row['dt'] == 1
                candidate = context.get('chosen')
                if is_choice:
                    key = (phase, context['trial']); candidate = choices.get(key, 0)
                    assert candidate < 2; choices[key] = candidate + 1
                valence = last_trial['valence'] if context['step'] == 'feedback' and last_trial['context']['trial'] == context['trial'] else None
                gap = row['dt'] == 4 and not activity
                stage = 'gap' if gap else 'teacher' if valence else context['step']
                for s in selected:
                    local = states[s['slot']]; k = activity.get(s['kc'])
                    trace, mass = step(local['trace'], local['states'], k if k is not None else 0., row['ds'][s['group']], row['dt'], config)
                    gain = config['minGain'] + (config['maxGain'] - config['minGain']) * (mass[0] + mass[1])
                    rank = 1 + sum(v > k for v in activity.values()) if k is not None else None
                    record = dict(phase=phase, trial=context['trial'], frame=row['frame'], candidate=candidate, stage=stage, slot=s['slot'], kc=s['kc'], group=s['group'], mbon=s['mbon'], dan=s['dan'], normalizedK=k, censoredAtOrBelowTheta=k is None, activeKcs=len(activity), activityRank=rank, eligibility=trace, danDrive=row['ds'][s['group']], teacher=valence, unknown=bool(last_trial and last_trial['context']['trial'] == context['trial'] and last_trial['unknown']), gainBefore=local['gain'], gainAfter=gain, gainChange=gain-local['gain'])
                    receipts.write(json.dumps(record, separators=(',', ':')) + '\n'); rows_written += 1
                    states[s['slot']] = dict(trace=trace, states=mass, gain=gain)
                    if is_choice or valence:
                        bucket = measurements.setdefault((s['slot'], phase, 'choice' if is_choice else 'teacher', candidate), [])
                        bucket.append(record)
                if context['step'] == 'feedback' and gap and context['trial'] % 24 == 0:
                    end = saved['T3' if phase == 'B3' else 'Rev']
                    errors = []
                    for s in selected:
                        i, x = s['slot'], states[s['slot']]
                        errors += [abs(x['trace'] - end['traces'][i]), abs(x['gain'] - end['gains'][i])]
                        errors += [abs(x['states'][j] - end['states'][4*i+j]) for j in range(4)]
                    assert max(errors) <= 1e-12, 'Selected local endpoint mismatch'
                    endpoint_errors[phase] = max(errors)
        assert set(endpoint_errors) == {'B3', 'REV'} and all(v == 2 for v in choices.values()) and len(choices) == 48
        summaries = []
        for (slot, phase, stage, candidate), records in measurements.items():
            observed = [r['normalizedK'] for r in records if r['normalizedK'] is not None]
            ranks = [r['activityRank'] / r['activeKcs'] for r in records if r['activityRank'] is not None]
            summaries.append(dict(slot=slot, phase=phase, stage=stage, candidate=candidate, presentations=len(records), active=len(observed), activeFraction=len(observed)/len(records), observedKMin=min(observed) if observed else None, observedKMedian=statistics.median(observed) if observed else None, observedKMax=max(observed) if observed else None, rankFractionMedian=statistics.median(ranks) if ranks else None, signedGainChange=sum(r['gainChange'] for r in records)))
        resources.append(guard(True))
        for p, expected in pins.items():
            assert sha(p) == expected, f'Input changed: {p}'
        result = dict(schema=published['schema'], status='complete', scope='existing censored local-rate observations; no biological firing-rate or trial-reliability claim', selectedEdges=selected, uniquePresynapticKcs=len({s['kc'] for s in selected}), endpointErrors=endpoint_errors, rows=rows_written, summary=summaries, resources=resources, elapsedSeconds=time.monotonic()-started, graphPasses=0, teachingEvents=0, learnerUpdates=0)
        atomic(out / 'result.json', result)
        atomic(out / 'manifest.json', {**published, 'status': 'complete', 'resultSha256': sha(out / 'result.json'), 'observationsSha256': sha(out / 'edge-observations.jsonl')})
        print(json.dumps(dict(status='complete', rows=rows_written, selectedEdges=len(selected), uniqueKcs=result['uniquePresynapticKcs'], endpointErrors=endpoint_errors, out=str(out))))
    except Exception as exc:
        atomic(out / 'manifest.json', {**published, 'status': 'failed', 'error': str(exc)})
        raise


if __name__ == '__main__':
    main()

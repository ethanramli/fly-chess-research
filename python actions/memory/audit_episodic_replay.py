"""Independent scalar dictionary replay; imports no JavaScript learner/producer."""
import argparse
from collections import OrderedDict
import copy
import hashlib
import json
import os
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum

ROOT = Path(__file__).resolve().parents[2]


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def digest(value):
    return hashlib.sha256(json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def rng(seed):
    mask = 2**32 - 1
    while True:
        seed = (seed + 0x6d2b79f5) & mask
        t = ((seed ^ (seed >> 15)) * (seed | 1)) & mask
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & mask)) & mask)) & mask
        yield ((t ^ (t >> 14)) & mask) / 2**32


def cue(features):
    return tuple(sorted((x['index'], x['current']) for x in features))


def pairs(key):
    return [list(x) for x in key]


def query(table, key):
    return {'known': True, **table[key][-1]} if key in table else {'known': False, 'value': 0}


def state(table, capacity, sequence, last):
    body = {'schema': 'episodic-consequence-memory-v1',
            'config': {'capacity': capacity, 'dimensions': 134209, 'maxFeatures': 64, 'versions': 2},
            'sequence': sequence, 'lastEvent': last,
            'entries': [{'cue': pairs(k), 'events': v} for k, v in table.items()]}
    return {**body, 'checksum': digest(body)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    assert not args.out.exists()
    started, cpu = time.monotonic(), time.process_time()
    resources = []

    def guard():
        assert time.monotonic() - started <= 180, 'Elapsed guard'
        inventory = curriculum.inventory()
        own = next(p for p in inventory['processes'] if p['pid'] == os.getpid())
        assert own['workingSetMiB'] <= 2048 and inventory['freeMiB'] >= 256
        resources.append({'rssMiB': own['workingSetMiB'], 'freeMiB': inventory['freeMiB']})
        delay = (time.process_time() - cpu) / .5 - (time.monotonic() - started)
        if delay > 0:
            time.sleep(min(delay, 1))

    run = args.run.resolve()
    manifest_path, result_path = run / 'manifest.json', run / 'result.json'
    manifest = json.loads(manifest_path.read_text())
    result = json.loads(result_path.read_text())
    assert manifest['status'] == result['status'] == 'complete'
    assert result['graphPasses'] == manifest['graphPasses'] == 0
    assert manifest['resultSha256'] == sha(result_path)
    assert manifest['receiptsSha256'] == sha(run / 'receipts.jsonl')
    registration_path = ROOT / 'python actions/memory/engineered-episodic-memory-v1-step.json'
    assert manifest['registrationSha256'] == sha(registration_path)
    registration = json.loads(registration_path.read_text())
    assert manifest['pins'] == registration['pins']
    pins = {ROOT / p: h for p, h in manifest['pins'].items()}
    pins.update({manifest_path: sha(manifest_path), result_path: sha(result_path), run / 'receipts.jsonl': sha(run / 'receipts.jsonl')})
    for path, expected in pins.items():
        assert sha(path) == expected, str(path)
    guard()
    conditions = [('informative', c) for c in [2, 4, 8, 128]] + [(a, 128) for a in ['absent', 'shuffled', 'disabled']]
    receipt_count, evaluation_count, accepted_count = 0, 0, 0
    checked_files, reconstructed_rows = {}, []
    with (run / 'receipts.jsonl').open() as receipts:
        for seed in range(4101, 4107):
            source = ROOT / registration['paths']['source'] / f'frames-{seed}-informative.jsonl'
            blocks = OrderedDict()
            with source.open() as stream:
                for line in stream:
                    row = json.loads(line)
                    if row['kind'] == 'start':
                        assert row['seed'] == seed and row['arm'] == 'informative'
                        items = row['items']
                    if row['kind'] == 'trial' and not row['unknown']:
                        blocks.setdefault(row['context']['phase'], []).append(1 if row['valence'] == 'reward' else -1)
            shuffled = {}
            for phase, values in blocks.items():
                values = values.copy()
                random = rng((seed ^ 0x5eeda11 ^ sum(map(ord, phase))) & (2**32 - 1))
                for i in range(len(values) - 1, 0, -1):
                    j = int(next(random) * (i + 1))
                    values[i], values[j] = values[j], values[i]
                shuffled[phase] = values
            tables = {c: OrderedDict() for c in conditions}
            last_sequences = {c: 0 for c in conditions}
            last_events = {c: None for c in conditions}
            counters = {c: {'accepted': 0, 'evictions': 0, 'tests': {}} for c in conditions}
            cursors, trials = {}, 0
            with source.open() as stream:
                for line in stream:
                    r = json.loads(line)
                    if r['kind'] == 'trial':
                        trials += 1
                        phase, item, chosen = r['context']['phase'], r['context']['item'], r['choice']
                        assert r['context']['trial'] == trials and r['unknown'] == (trials % 8 == 0)
                        assert phase == f'B{item}' or phase == 'REV' and item == 0
                        fixture, certificate = items[item], r['certificate']
                        good = 1 if phase == 'REV' else 0
                        assert certificate == {'criterion': 'assigned-action-association-v1',
                            'scope': 'arbitrary association only; no chess consequence', 'fen': fixture['fen'],
                            'moves': fixture['moves'], 'chosenMove': fixture['moves'][chosen],
                            'known': not r['unknown'], 'goodMove': fixture['moves'][good]}
                        observed = 1 if chosen == good else -1
                        assert r['good'] == good and r['valence'] == (None if r['unknown'] else 'reward' if observed == 1 else 'punish')
                        cursor = cursors.get(phase, 0)
                        for condition in conditions:
                            arm, capacity = condition
                            actual = json.loads(next(receipts))
                            assert {k: actual[k] for k in ['seed', 'arm', 'capacity', 'trial', 'phase', 'item', 'choice', 'unknown']} == {
                                'seed': seed, 'arm': arm, 'capacity': capacity, 'trial': trials,
                                'phase': phase, 'item': item, 'choice': chosen, 'unknown': r['unknown']}
                            table = tables[condition]
                            assert actual['before'] == [query(table, cue(c)) for c in fixture['images']]
                            status = 'verified' if not r['unknown'] and arm in ['informative', 'shuffled'] else 'unknown'
                            value = shuffled[phase][cursor] if arm == 'shuffled' and not r['unknown'] else observed
                            assert actual['feedback'] == {'status': status, 'sequence': trials, 'value': value, 'evidenceHash': digest(certificate)}
                            if status == 'verified':
                                key = cue(fixture['images'][chosen])
                                history = table.pop(key, [])
                                evicted = None
                                if len(table) == capacity:
                                    old_key, _ = table.popitem(last=False)
                                    evicted = digest(pairs(old_key)); counters[condition]['evictions'] += 1
                                event = {'sequence': trials, 'value': value, 'evidenceHash': digest(certificate)}
                                table[key] = (history + [event])[-2:]
                                last_sequences[condition] = trials
                                last_events[condition] = digest({'cue': pairs(key), **event})
                                assert actual['receipt'] == {'accepted': True, 'cueHash': digest(pairs(key)), 'sequence': trials, 'evicted': evicted}
                                counters[condition]['accepted'] += 1; accepted_count += 1
                            else:
                                assert actual['receipt'] == {'accepted': False, 'reason': 'unknown'}
                            expected = state(table, capacity, last_sequences[condition], last_events[condition])
                            assert actual['stateChecksum'] == expected['checksum']
                            receipt_count += 1
                        if not r['unknown']:
                            cursors[phase] = cursor + 1
                        if trials % 24 == 0:
                            guard()
                    if r['kind'] == 'test':
                        for condition in conditions:
                            arm, capacity = condition
                            expected_results = []
                            for item, fixture in enumerate(items):
                                candidates = [query(tables[condition], cue(c)) for c in fixture['images']]
                                good = 1 if r['name'] == 'Rev' and item == 0 else 0
                                margin = candidates[good]['value'] - candidates[1 - good]['value']
                                expected_results.append({'item': item, 'candidates': candidates, 'margin': margin, 'correct': margin > 0})
                            path = run / f'snapshot-{seed}-{arm}-{capacity}-{r["name"]}.json'
                            publication = json.loads(path.read_text())
                            assert publication == {'seed': seed, 'arm': arm, 'capacity': capacity, 'phase': r['name'],
                                'results': expected_results, 'state': state(tables[condition], capacity, last_sequences[condition], last_events[condition])}
                            checked_files[str(path.relative_to(ROOT))] = sha(path)
                            counters[condition]['tests'][r['name']] = expected_results
                            evaluation_count += 4
            assert trials == 120
            for condition, counter in counters.items():
                arm, capacity = condition
                reconstructed_rows.append({'seed': seed, 'arm': arm, 'capacity': capacity, **counter,
                    'jointRecallPass': all(all(x['correct'] for x in counter['tests'][p]) for p in ['T3', 'Delay', 'Rev']),
                    'finalState': state(tables[condition], capacity, last_sequences[condition], last_events[condition])['checksum']})
        assert not receipts.read(), 'Extra receipts'
    assert reconstructed_rows == result['rows']
    primary = [r for r in reconstructed_rows if r['arm'] == 'informative' and r['capacity'] == 128]
    assert result['primaryEngineeringPass'] == all(r['jointRecallPass'] for r in primary)
    # A rehashed prediction corruption is still rejected by independent reconstruction.
    wrong = copy.deepcopy(reconstructed_rows)
    wrong[0]['tests']['Rev'][0]['candidates'][0]['value'] += .5
    assert wrong != reconstructed_rows
    for path, expected in pins.items():
        assert sha(path) == expected, str(path)
    for path, expected in checked_files.items():
        assert sha(ROOT / path) == expected
    guard()
    output = {'status': 'passed', 'scope': 'independent Python exact-cue replay of source synthetic certificates, every trial prediction/commit/state and every seed/item; no graph or reasoning replication',
              'receipts': receipt_count, 'acceptedEvents': accepted_count, 'itemEvaluations': evaluation_count,
              'snapshotFiles': len(checked_files), 'primaryEngineeringPass': result['primaryEngineeringPass'],
              'pins': {str(p.relative_to(ROOT)): h for p, h in pins.items()}, 'snapshotHashes': checked_files,
              'auditorSha256': sha(Path(__file__)), 'resources': resources, 'elapsedSeconds': time.monotonic() - started}
    temp = args.out.with_suffix('.partial')
    temp.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8'); temp.replace(args.out)
    print(json.dumps({k: output[k] for k in ['status', 'receipts', 'acceptedEvents', 'itemEvaluations', 'snapshotFiles', 'primaryEngineeringPass', 'elapsedSeconds']}))


if __name__ == '__main__':
    main()

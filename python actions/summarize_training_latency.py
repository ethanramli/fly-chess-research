"""Report matched total elapsed and graph simulation times after independent verification."""
import argparse
import curriculum as actions


def totals(samples):
    result = {}
    for variant in ('json6', 'nativeZstd1'):
        rows = [row for row in samples if row['variant'] == variant]
        assert rows
        phases = ('forward', 'sleep', 'checkpointPublication')
        for row in rows:
            assert row['round'] >= 0 and row['elapsedMs'] > 0
            assert row['phases']['forward']['count'] == 21
            assert row['phases']['checkpointPublication']['count'] == 42
        result[variant] = {
            'lessons': len(rows), 'neuralPresentations': 21 * len(rows),
            'elapsedSeconds': sum(row['elapsedMs'] for row in rows) / 1000,
            'cpuSeconds': sum(row['cpuUs'] for row in rows) / 1e6,
            **{name + 'Seconds': sum(row['phases'][name]['ms'] for row in rows) / 1000 for name in phases},
        }
    before, after = (result[name] for name in ('json6', 'nativeZstd1'))
    assert before['lessons'] == after['lessons']
    before_keys = {(r['stageId'], r['lesson'], r['round']) for r in samples if r['variant'] == 'json6'}
    after_keys = {(r['stageId'], r['lesson'], r['round']) for r in samples if r['variant'] == 'nativeZstd1'}
    assert before_keys == after_keys and len(before_keys) == before['lessons']
    return {'variants': result, 'elapsedReduction': 1 - after['elapsedSeconds'] / before['elapsedSeconds'],
            'simulationReduction': 1 - after['forwardSeconds'] / before['forwardSeconds']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run')
    parser.add_argument('--self-check', action='store_true')
    args = parser.parse_args()
    if args.self_check:
        samples = [dict(variant=variant, stageId='example', lesson=0, round=0, elapsedMs=elapsed,
                        cpuUs=elapsed * 500, phases={
                            'forward': {'count': 21, 'ms': elapsed / 4},
                            'sleep': {'count': 21, 'ms': elapsed / 2},
                            'checkpointPublication': {'count': 42, 'ms': elapsed / 8}})
                   for variant, elapsed in [('json6', 1000), ('nativeZstd1', 500)]]
        result = totals(samples)
        assert result['elapsedReduction'] == result['simulationReduction'] == .5
        assert result['variants']['json6']['elapsedSeconds'] == 1
        assert result['variants']['nativeZstd1']['forwardSeconds'] == .125
        actions.emit({'selfCheck': 'passed', 'scope': 'Unit conversion, matched counts and separate timers'})
        return
    if not args.run:
        raise ValueError('Provide --run with the independently audited comparison directory')
    root = actions.local(args.run)
    audit = actions.read_json(root / 'timing-audit.json')
    assert audit['integrityPassed'] is True
    protocol = actions.read_json(root / 'protocol.json')
    if (root / 'batch-index.json').exists():
        reports = [actions.read_json(root / batch['id'] / 'report.json') for batch in protocol['batches']]
        samples = [row for report in reports for row in report['samples']]
        cold = {variant: sum(r['processUptimeSeconds'] for r in reports if r['variant'] == variant)
                for variant in ('json6', 'nativeZstd1')}
        setup = {variant: sum(r['setupSeconds'] for r in reports if r['variant'] == variant)
                 for variant in ('json6', 'nativeZstd1')}
    else:
        report = actions.read_json(root / 'report.json')
        samples, cold = report['samples'], None
        setup = {'sharedProcessSetupSeconds': report['setupSeconds']}
    result = {**totals(samples), 'coldInvocationSeconds': cold, 'setup': setup,
              'timingContext': actions.read_json(root / 'timing-context.json')
                  if (root / 'timing-context.json').exists() else None,
              'protocolSha256': actions.digest(root / 'protocol.json'),
              'auditSha256': actions.digest(root / 'timing-audit.json'), 'sourceSha256': actions.digest(__file__),
              'scope': protocol['scope'],
              'limitations': ['Elapsed totals cover measured matched lessons, including their original pacing and durable evidence.',
                              'Simulation-only forward time excludes hashing, persistence, sleep and setup.',
                              'Phase timers can nest; do not add arbitrary phases.',
                              'Cold invocation includes warmup, setup and checks when separate runtime batches exist.',
                              'These lesson samples are not an observed duration for the entire curriculum.']}
    assert abs(result['elapsedReduction'] - audit['pooledReduction']) < 1e-12
    target = root / 'total-times.json'
    assert not target.exists(), 'Preserve the existing timing summary'
    actions.atomic_json(target, result)
    actions.emit(result)


if __name__ == '__main__':
    main()

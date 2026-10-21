"""Pin complete historical lessons for the training latency comparison; no graph execution."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'research/data/training-latency-v1'
ORIGINAL = ROOT / 'runs/g0-reversal-history-diagnostic-v1'


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    if OUT.exists():
        raise ValueError('Preserve existing registration; use a new version for changes')
    # The first six complete acquisition stages precede the original interruption.
    with (ORIGINAL / 'receipts.jsonl').open(encoding='utf-8') as stream:
        rows = [json.loads(line) for line in stream]
    units = []
    for row in rows:
        if row['kind'] != 'lesson-start' or not row['stageId'].startswith('acquisition:prefix:') or row['lesson'] not in (0, 1):
            continue
        path = ORIGINAL / f"checkpoint-{2 * row['sequence'] + 1:06}.json.gz"
        with gzip.open(path, 'rt', encoding='utf-8') as stream:
            state = json.load(stream)
        assert state['receiptCount'] == row['sequence'] and state['pendingReceipt'] is None
        assert state['chainHash'] == row['previousChainHash']
        assert state['session']['pending'] is None and not state['session']['episode']['active']
        expected = rows[row['sequence']:row['sequence'] + 21]
        assert len(expected) == 21 and expected[-1]['kind'] == 'lesson'
        assert all(r.get('stageId') == row['stageId'] and r.get('lesson') == row['lesson'] for r in expected)
        units.append({'stageId': row['stageId'], 'condition': row['options']['condition'], 'lesson': row['lesson'],
                      'parent': path.relative_to(ROOT).as_posix(), 'parentSha256': digest(path),
                      'firstReceipt': row['sequence'], 'receiptCount': 21})
    assert len(units) == 12 and len({u['stageId'] for u in units}) == 6
    paths = ['research/data/g0-reversal-history-diagnostic-v1/protocol.json',
             'runs/g0-reversal-history-diagnostic-v1/receipts.jsonl',
             '.codebase/scripts/evaluation-and-performance/profile-g0-training-pipeline.mjs',
             '.codebase/src/runtime/checkpoint-codec.mjs', 'python actions/prepare_training_latency.py']
    manifest = {'schema': 'training-latency-v1', 'baseProtocol': paths[0], 'recordedReceipts': paths[1],
                'rounds': 2, 'duty': 0.5, 'maxPresentations': 1200, 'units': units,
                'sources': {path: digest(ROOT / path) for path in paths},
                'gates': {'minPerConditionElapsedReduction': 0.40, 'minPooledElapsedReduction': 0.45,
                          'exactReceiptsAndStates': True},
                'scope': 'Historical complete-lesson engineering replay; no G0, transfer or time-to-success claim'}
    OUT.mkdir(parents=True)
    (OUT / 'protocol.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'prepared': str(OUT / 'protocol.json'), 'units': len(units),
                      'graphLaunched': False, 'scope': manifest['scope']}, separators=(',', ':')))


if __name__ == '__main__':
    main()

"""Read-only input-overlap diagnosis; no graph passes, new codes or learned weights."""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--run', required=True)
parser.add_argument('--out', required=True)
args = parser.parse_args()
run, out = Path(args.run), Path(args.out)
if out.exists():
    parser.error('Preserve existing analysis; use a new --out file')
published = json.loads((run / 'completed.json').read_text())['records']
lines = (run / 'records.jsonl').read_text().splitlines()
assert len(lines) >= published
records = [json.loads(line) for line in lines[:published]]
results = []
for row in records:
    if row['arm'] != 'informative':
        continue
    with (run / f"frames-{row['seed']}-informative.jsonl").open() as f:
        header = json.loads(f.readline())
    items = header['items']
    codes = [[{c['index'] for c in code} for code in item['images']] for item in items]
    for j in range(1, len(items)):
        same = len(codes[0][0] & codes[j][0]) + len(codes[0][1] & codes[j][1])
        opposite = len(codes[0][0] & codes[j][1]) + len(codes[0][1] & codes[j][0])
        reduced = [[{c['index'] for c in code[:5]} for code in item['images']] for item in [items[0], items[j]]]
        same5 = len(reduced[0][0] & reduced[1][0]) + len(reduced[0][1] & reduced[1][1])
        opposite5 = len(reduced[0][0] & reduced[1][1]) + len(reduced[0][1] & reduced[1][0])
        before, after = row['tests']['Delay'][j]['mNorm'], row['tests']['Rev'][j]['mNorm']
        results.append({'seed': row['seed'], 'item': j, 'sameContingencyShared': same, 'opposingContingencyShared': opposite,
                        'netOverlap20': same - opposite, 'netOverlapTop5': same5 - opposite5,
                        'marginBefore': before, 'marginAfter': after, 'marginChange': after - before,
                        'keptCorrect': after > 0})
report = {'scope': 'post-hoc input-support description, not causal proof or a neural test of five-winner codes',
          'publishedRecords': published, 'informativeSeeds': len(results) // 3, 'comparisons': results}
out.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, separators=(',', ':')))

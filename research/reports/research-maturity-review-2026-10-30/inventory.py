"""Metadata inventory only. Never reads graph, dataset, receipt or sealed-row content."""
from collections import Counter
import csv
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
BASES = ['documentation', '.codebase/src', '.codebase/scripts', '.codebase/tests',
         'research/project', 'research/journal', 'research/literature', 'research/reports']
counts = Counter()
entries = []
for base in BASES:
    for directory, folders, files in os.walk(ROOT / base):
        folders[:] = [d for d in folders if d not in ['node_modules', '.git', '__pycache__', '.venv']]
        for name in files:
            path = Path(directory) / name
            suffix = path.suffix.lower()
            counts[(base, suffix)] += 1
            if suffix in ['.md', '.mjs', '.py']:
                entries.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size,
                                'kind': suffix, 'reviewed': False})
with (OUT / 'inventory.csv').open('w', newline='', encoding='utf-8') as stream:
    writer = csv.DictWriter(stream, fieldnames=['path', 'bytes', 'kind', 'reviewed'])
    writer.writeheader()
    writer.writerows(entries)
summary = {'scope': 'metadata only; inventoried is not reviewed', 'eligibleTextFiles': len(entries),
           'counts': [{'base': base, 'suffix': suffix, 'count': count}
                      for (base, suffix), count in sorted(counts.items())]}
(OUT / 'inventory-summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'eligibleTextFiles': len(entries), 'totalFiles': sum(counts.values()),
                  'roots': {base: sum(n for (b, _), n in counts.items() if b == base) for base in BASES}}))

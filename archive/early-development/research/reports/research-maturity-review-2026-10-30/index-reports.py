"""Index report-summary prose; never opens raw datasets, final rows or receipt outputs."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
reports = ROOT / 'research/reports'
index = []
pattern = re.compile(r'gate.failed|not established|not proven|not proved|unproved|invalid|defect|mistake|correction|failed|accepted|passed|terminal', re.I)
for path in sorted(reports.glob('*/README.md')):
    if path.parent == OUT:
        continue
    data = path.read_bytes()
    if len(data) > 500_000:
        continue
    encoding = 'utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig'
    try:
        text = data.decode(encoding)
    except UnicodeDecodeError:
        encoding = 'cp1252'  # record a fallback for historical Windows-authored notes
        text = data.decode(encoding)
    lines = text.splitlines()
    extracts = [{'line': i + 1, 'text': line[:1400]} for i, line in enumerate(lines)
                if pattern.search(line) and not line.startswith('```')]
    index.append({'path': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(data).hexdigest(),
                  'encoding': encoding, 'lines': len(lines), 'headings': [line for line in lines if line.startswith('#')],
                  'matchingLines': extracts})
(OUT / 'report-summary-index.json').write_text(json.dumps(index, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({'indexedSummaryDocuments': len(index), 'indexedLines': sum(x['lines'] for x in index),
                  'coverage': 'Automated text index, not a claim of substantive review of every line'}))
for item in index:
    print(item['path'])

"""Render the preserved replay comparison without a server or external assets."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
run = ROOT / 'runs/memory-retention-2026-11-01/engineered-episodic-memory-v1'
result = json.loads((run / 'result.json').read_text())
audit = json.loads((HERE / 'replay-audit-v1.json').read_text())
assert result['status'] == 'complete' and audit['status'] == 'passed'
groups = [('informative', c) for c in [2, 4, 8, 128]] + [(a, 128) for a in ['absent', 'shuffled', 'disabled']]
bars = []
for arm, capacity in groups:
    rows = [r for r in result['rows'] if r['arm'] == arm and r['capacity'] == capacity]
    count = sum(r['jointRecallPass'] for r in rows)
    bars.append(f'<div class="row"><span>{arm.capitalize()} · {capacity} addresses</span><div class="track"><div class="bar" style="width:{100*count/6}%"></div></div><strong>{count}/6</strong></div>')
cells = []
for seed in range(4101, 4107):
    r = next(r for r in result['rows'] if r['seed'] == seed and r['arm'] == 'informative' and r['capacity'] == 128)
    cells.append('<tr><td>' + str(seed) + '</td>' + ''.join(f'<td>{sum(x["correct"] for x in r["tests"][p])}/4</td>' for p in ['T3', 'Delay', 'Rev']) + '</tr>')
html = '''<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:var(--font-sans,system-ui);color:var(--foreground);margin:0;line-height:1.45}h3{font-size:17px;margin:16px 0 8px}p{font-size:13px;color:var(--muted-foreground);margin:8px 0 16px}.row{display:grid;grid-template-columns:185px 1fr 32px;align-items:center;gap:12px;font-size:12px;margin:10px 0}.track{height:17px;background:var(--secondary);border-radius:3px}.bar{height:17px;background:var(--chart-1);border-radius:3px}table{border-collapse:collapse;font-size:13px;width:100%}td,th{text-align:left;padding:6px;border-bottom:1px solid var(--border)}@media(max-width:450px){.row{grid-template-columns:145px 1fr 28px;gap:7px}}
</style></head><body><h3>Engineering replay: joint recall and reversal</h3><p>Seeds passing every item after acquisition, delay and reversal. Exact stored cues; original choices replayed. No graph execution or reasoning claim.</p>''' + ''.join(bars) + '''<h3>Primary condition: every seed and item</h3><table><thead><tr><th>Seed</th><th>Acquisition</th><th>Delay</th><th>Reversal</th></tr></thead><tbody>''' + ''.join(cells) + '''</tbody></table><p>Capacity 128. Each cell counts correct rankings across four associations. Independent Python replay checks all trial updates and snapshots. Delay has no decay; shuffled controls preserve within-block feedback counts.</p></body></html>'''
(HERE / 'results.html').write_text(html, encoding='utf-8')
print(json.dumps({'status': 'rendered', 'path': str(HERE / 'results.html')}))

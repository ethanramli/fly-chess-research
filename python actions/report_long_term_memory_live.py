"""Publish compact metrics and a self-contained chart after the live audit passes."""
import argparse
import hashlib
import json
from pathlib import Path


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--audit', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    assert not args.out.exists()
    summary = json.loads((args.run / 'summary.json').read_text())
    manifest = json.loads((args.run / 'manifest.json').read_text())
    audit = json.loads(args.audit.read_text())
    assert summary['status'] == manifest['status'] == 'complete' and audit['status'] == 'passed'
    assert sha(args.run / 'summary.json') == manifest['summarySha256']
    data = []
    for row in summary['rows']:
        component_counts = {'neural': {}, 'lookup': {}}
        for phase in ['T3', 'Delay', 'Rev']:
            for component in component_counts:
                correct = 0
                for item, observation in enumerate(row['tests'][phase]):
                    good = 1 if phase == 'Rev' and item == 0 else 0
                    values = [max(-1, min(1, c['neuralValue'] / .32)) if component == 'neural' else c['recalled']['value'] for c in observation['candidates']]
                    correct += values[good] > values[1-good]
                component_counts[component][phase] = correct
        data.append({'system': row['system'], 'arm': row['arm'], 'jointPass': row['jointPass'],
            'correctByPhase': {phase: sum(x['correct'] for x in row['tests'][phase]) for phase in ['T3', 'Delay', 'Rev']},
            'neuralCorrectByPhase': component_counts['neural'], 'lookupCorrectByPhase': component_counts['lookup'],
            'onlineCorrect': {phase: x['correct'] for phase, x in row['online'].items()},
            'externalEntries': row['externalEntries'], 'neuralUnchanged': row['neuralUnchanged'],
            'lookupMatchesAtFinalTest': sum(c['recalled']['known'] for item in row['tests']['Rev'] for c in item['candidates'])})
    body = {'scope': summary['scope'], 'seed': 4102, 'rows': data, 'forwards': summary['forwards'],
        'elapsedSeconds': summary['elapsedSeconds'],
        'peakObservedRssMiB': max(x['rssMiB'] for x in summary['resources']),
        'minimumObservedFreeMiB': min(x['freeMiB'] for x in summary['resources']),
        'auditSha256': sha(args.audit), 'summarySha256': manifest['summarySha256']}
    labels = {'fly-memory': 'Fly + memory', 'memory-only': 'Memory-only readout', 'fly-only': 'Fly-only readout'}
    phases = ['T3', 'Delay', 'Rev']
    bars = []
    for row in data:
        label = labels[row['system']] if row['arm'] == 'informative' else 'Combined · ' + row['arm']
        bars.append('<div class="group"><div class="label">' + label + '</div>' + ''.join(
            '<div class="barrow"><span>' + title + '</span><div class="track"><div class="bar" style="width:' + str(25*row['correctByPhase'][phase])
            + '%;background:var(--chart-' + str(i+1) + ')"></div></div><b>' + str(row['correctByPhase'][phase]) + '/4</b></div>'
            for i, (phase, title) in enumerate(zip(phases, ['Acquired', 'After delay', 'After reversal']))) + '</div>')
    paths, legend = [], []
    blocks = ['B0', 'B1', 'B2', 'B3', 'REV']
    for i, row in enumerate(data[:3]):
        points = ' '.join(f'{55+130*j},{190-160*row["onlineCorrect"][block]/24:.2f}' for j, block in enumerate(blocks))
        paths.append(f'<polyline points="{points}" fill="none" stroke="var(--chart-{i+1})" stroke-width="2.5"/>')
        paths.extend(f'<circle cx="{55+130*j}" cy="{190-160*row["onlineCorrect"][block]/24:.2f}" r="4" fill="var(--chart-{i+1})"/>' for j, block in enumerate(blocks))
        legend.append(f'<span style="color:var(--chart-{i+1})">{labels[row["system"]]}</span>')
    chart = '<svg viewBox="0 0 640 230" role="img" aria-label="Correct live choices per 24-trial block">' + ''.join(
        f'<line x1="45" x2="600" y1="{190-160*y/24}" y2="{190-160*y/24}" stroke="var(--border)"/><text x="8" y="{195-160*y/24}">{y}/24</text>' for y in [0, 12, 24]) + ''.join(paths) + ''.join(
        f'<text x="{42+130*j}" y="218">{block}</text>' for j, block in enumerate(blocks)) + '</svg>'
    html = '''<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;color:var(--foreground);font-family:var(--font-sans,system-ui);line-height:1.45}h3{font-size:17px;margin:16px 0 8px}p{font-size:13px;color:var(--muted-foreground)}.group{margin:16px 0}.label{font-size:13px;font-weight:600;margin:6px 0}.barrow{display:grid;grid-template-columns:95px 1fr 32px;gap:9px;align-items:center;font-size:12px;margin:5px 0}.track{height:12px;background:var(--secondary);border-radius:3px}.bar{height:12px;border-radius:3px}svg{width:100%;height:240px}svg text{fill:var(--muted-foreground);font:12px var(--font-sans,system-ui)}.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12px}
</style></head><body><h3>Live integration pilot · development seed 4102</h3><p>Each controller chooses its own actions. Four arbitrary associations; 24 trials per block; 16 noisy delay frames. Same graph-derived cues and 553 graph forwards per condition. This is not a reasoning test.</p><h3>Correct live choices during learning</h3><div class="legend">''' + ''.join(legend) + '</div>' + chart + '<h3>Read-only association rankings</h3>' + ''.join(bars) + '''<p>Controls apply to the combined system. Memory-only uses an unused shadow graph to match forward count. A matching lookup baseline does not establish a neural advantage. Audit reconstructs recorded local updates and policy arithmetic; it does not regenerate graph responses.</p></body></html>'''
    args.out.mkdir(parents=True)
    (args.out / 'metrics.json').write_text(json.dumps(body, indent=2) + '\n', encoding='utf-8')
    (args.out / 'results.html').write_text(html, encoding='utf-8')
    print(json.dumps({'scope': {'status': 'report-published', 'seed': 4102, 'systems': data[:3], 'metrics': str(args.out / 'metrics.json')}}))


if __name__ == '__main__':
    main()

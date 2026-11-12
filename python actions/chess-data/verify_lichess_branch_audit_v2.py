"""Actual training-pair audit checks; preserve each forged input and raw output."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import shutil

p = argparse.ArgumentParser()
p.add_argument('--config', required=True)
p.add_argument('--out', required=True)
a = p.parse_args()
base = json.loads(Path(a.config).read_text(encoding='utf-8-sig'))
output = Path(a.out).resolve()
assert not output.exists()
output.mkdir(parents=True)
original = Path(base['paths']['run'])
manifest = json.loads((original / 'manifest.json').read_text())
families = [json.loads(s) for s in (original / 'families.jsonl').read_text().splitlines()]
assert len(families) == 2, 'This check is registered for the two actual emitted training families'
sha = lambda b: hashlib.sha256(b).hexdigest()
node = shutil.which('node')
assert node

def unchanged(f):
    pass

def wrong_game(f):
    f['source']['gameId'] = 'xxxxxxxx'

def wrong_branch(f):
    f['variants'][1]['branch'][1] = 'a1a1'

def wrong_status(f):
    v = f['variants'][1]
    next(c for c in v['candidates'] if c['move'] == v['winner'])['status'] = 'failure'

results = []
for name, mutation in [('valid', unchanged), ('wrong-game', wrong_game),
                       ('illegal-branch', wrong_branch), ('forged-outcome', wrong_status)]:
    folder = output / name
    folder.mkdir()
    changed = json.loads(json.dumps(families))
    mutation(changed[0])
    body = ''.join(json.dumps(f, separators=(',', ':')) + '\n' for f in changed).encode()
    m = dict(manifest, outputSha256=sha(body), outputBytes=len(body))
    (folder / 'families.jsonl').write_bytes(body)
    (folder / 'manifest.json').write_text(json.dumps(m), encoding='utf-8')
    config = json.loads(json.dumps(base))
    config['paths']['run'] = str(folder)
    # Rehash forged output: rejection must rely on semantic/provenance replay.
    for old in [original / 'manifest.json', original / 'families.jsonl']:
        config['pins'].pop(str(old), None)
    for path in [folder / 'manifest.json', folder / 'families.jsonl']:
        config['pins'][str(path)] = sha(path.read_bytes())
    cfg = folder / 'config.json'
    cfg.write_text(json.dumps(config), encoding='utf-8')
    report = folder / 'audit.json'
    with (folder / 'stdout.txt').open('wb') as stdout, (folder / 'stderr.txt').open('wb') as stderr:
        proc = subprocess.run([node, '--max-old-space-size=256',
            '.codebase/scripts/data/audit-lichess-branch-contrasts.mjs',
            '--config', str(cfg), '--out', str(report)], stdout=stdout, stderr=stderr, timeout=300)
    ok = proc.returncode == 0 and report.exists()
    assert ok == (name == 'valid'), (name, proc.returncode, folder)
    if ok:
        receipt = json.loads(report.read_text())
        assert receipt['passed'] and len(receipt['verified']) == len(families)
    else:
        assert not report.exists(), 'Failed replay published an audit'
    results.append({'case': name, 'passed': True, 'exitCode': proc.returncode})
(output / 'result.json').write_text(json.dumps({'passed': True, 'checks': results}, indent=2), encoding='utf-8')
print(json.dumps({'passed': True, 'checks': len(results), 'scope': 'Actual source-pair provenance and semantic replay, not neural efficacy.'}))

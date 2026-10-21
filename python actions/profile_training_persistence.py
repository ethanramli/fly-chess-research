"""Bounded offline checkpoint benchmark; raw receipts stay in the output directory."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', required=True)
args = parser.parse_args()
out = (ROOT / args.out).resolve()
if not out.is_relative_to(ROOT) or out.exists():
    raise SystemExit('Output must be a fresh workspace directory')
# The Node benchmark creates this directory, so capture logs in sibling files.
out.parent.mkdir(parents=True, exist_ok=True)
argv = ['node', '--max-old-space-size=256', '.codebase/scripts/evaluation-and-performance/profile-training-persistence.mjs',
        '--run', 'runs/g0-reversal-history-diagnostic-v1-resumed2', '--out', args.out, '--cpu-duty', '0.5']
with Path(str(out) + '.stdout.txt').open('w') as stdout, Path(str(out) + '.stderr.txt').open('w') as stderr:
    result = subprocess.run(argv, cwd=ROOT, stdout=stdout, stderr=stderr,
                            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
report = out / 'report.json'
summary = {'exitCode': result.returncode, 'report': str(report), 'stderr': str(out) + '.stderr.txt'}
if report.exists():
    data = json.loads(report.read_text())
    summary.update(summary=data['summary'], peakRssMiB=data['peakRssMiB'], scope=data['scope'])
print(json.dumps(summary, separators=(',', ':')))
sys.exit(result.returncode)

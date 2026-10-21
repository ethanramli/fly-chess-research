"""Cache a pinned portable official runtime; never change PATH or launch a graph."""
from pathlib import Path
from urllib.request import urlopen
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
VERSION = 'v26.12.0'
BASE = f'https://nodejs.org/download/release/{VERSION}/'
cache = ROOT / '.cache/latency-runtimes' / VERSION
record = ROOT / 'research/data/training-latency-runtime-v1'
cache.mkdir(parents=True, exist_ok=True)
record.mkdir(parents=True, exist_ok=True)


def fetch(url, limit):
    with urlopen(url, timeout=30) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError(f'Response exceeds bound: {url}')
    return data


index = json.loads(fetch('https://nodejs.org/download/release/index.json', 2**20))
release = next(row for row in index if row['version'] == VERSION)
assert release['date'] == '2026-10-14' and release['v8'] == '14.6.202.34'
checksums = fetch(BASE + 'SHASUMS256.txt', 2**20)
matches = [line.split()[0] for line in checksums.decode().splitlines() if line.split()[-1] == 'win-x64/node.exe']
assert len(matches) == 1
expected = matches[0]
binary = cache / 'node.exe'
if not binary.exists():
    partial = cache / 'node.exe.partial'
    digest, size = hashlib.sha256(), 0
    with urlopen(BASE + 'win-x64/node.exe', timeout=30) as response, partial.open('xb') as stream:
        while chunk := response.read(2**20):
            size += len(chunk)
            if size > 160 * 2**20:
                raise ValueError('Runtime binary exceeds download bound; partial preserved')
            digest.update(chunk)
            stream.write(chunk)
    if digest.hexdigest() != expected:
        raise ValueError('Runtime checksum mismatch; partial preserved')
    partial.rename(binary)
with binary.open('rb') as stream:
    assert hashlib.file_digest(stream, 'sha256').hexdigest() == expected
license_bytes = fetch(f'https://raw.githubusercontent.com/nodejs/node/{VERSION}/LICENSE', 2**20)
license_path = cache / 'LICENSE'
if not license_path.exists():
    license_path.write_bytes(license_bytes)
assert license_path.read_bytes() == license_bytes
argv = [str(binary), '--max-old-space-size=256', '-p',
        'JSON.stringify({versions:process.versions,startupRssMiB:process.memoryUsage().rss/2**20})']
started = subprocess.run(argv, capture_output=True, text=True, timeout=30,
                         creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0), check=True)
runtime = json.loads(started.stdout)
assert runtime['versions']['node'] == VERSION[1:] and runtime['startupRssMiB'] < 768
metadata = {'schema': 'training-latency-runtime-v1', 'release': release, 'binary': str(binary.relative_to(ROOT)),
            'binarySha256': expected, 'binaryBytes': binary.stat().st_size,
            'downloadUrl': BASE + 'win-x64/node.exe', 'checksumUrl': BASE + 'SHASUMS256.txt',
            'licensePath': str(license_path.relative_to(ROOT)), 'licenseSha256': hashlib.sha256(license_bytes).hexdigest(),
            'startupCommand': argv, **runtime,
            'scope': 'Portable candidate only; no PATH change, graph, timing gain or adoption'}
for path, data in [(record / 'SHASUMS256.txt', checksums),
                   (record / 'runtime.json', (json.dumps(metadata, indent=2) + '\n').encode())]:
    if path.exists():
        raise ValueError(f'Preserve existing registration: {path}')
    path.write_bytes(data)
print(json.dumps(metadata, separators=(',', ':')))

"""Bounded standard-library multi-frame Zstandard extraction for source curation."""
import argparse
from compression import zstd
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import time
from curriculum import atomic_json


def extract_archive(archive, destination, receipt, expected_sha256, max_bytes=4 * 1024**3, max_seconds=3600):
    source, target, receipt = Path(archive).resolve(), Path(destination).resolve(), Path(receipt).resolve()
    partial = Path(str(target) + '.partial')
    if source.parent != target.parent or target.parent != (Path.cwd() / '.cache').resolve():
        raise ValueError('Extraction outside intended cache')
    if any(p.exists() for p in (target, partial, receipt)):
        raise ValueError('Preserve existing extraction/publication')
    if not 1 <= max_bytes <= 4 * 1024**3 or not 1 <= max_seconds <= 3600:
        raise ValueError('Invalid extraction limits')
    started, cpu_started = time.monotonic(), time.process_time()
    with source.open('rb') as stream:
        compressed_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    if compressed_hash != expected_sha256:
        raise ValueError('Archive hash mismatch')
    output_hash, count = hashlib.sha256(), 0
    with zstd.open(source, 'rb', options={zstd.DecompressionParameter.window_log_max: 27}) as reader, partial.open('xb') as writer:
        while chunk := reader.read(1024 * 1024):
            count += len(chunk)
            if count > max_bytes or time.monotonic() - started > max_seconds:
                raise ValueError('Extraction byte/time bound')
            if shutil.disk_usage(target.parent).free < 256 * 1024**2:
                raise ValueError('Extraction free-disk guard')
            writer.write(chunk); output_hash.update(chunk)
            time.sleep(max(0, 2 * (time.process_time() - cpu_started) - (time.monotonic() - started)))
        writer.flush(); os.fsync(writer.fileno())
    if not count:
        raise ValueError('Empty decoded archive')
    value = {'schema': 'lichess-archive-extraction-v1', 'status': 'verified-awaiting-publication',
             'archive': str(source), 'archiveSha256': compressed_hash, 'path': str(target),
             'bytes': count, 'sha256': output_hash.hexdigest(), 'python': sys.version,
             'elapsedSeconds': time.monotonic() - started, 'cpuSeconds': time.process_time() - cpu_started,
             'bounds': {'windowLogMax': 27, 'readBytes': 1024**2, 'maxOutputBytes': max_bytes,
                        'maxSeconds': max_seconds, 'cpuDuty': 0.5, 'minFreeDiskMiB': 256},
             'scope': 'Complete multi-frame decoding and byte hashes only; no puzzle labels, neural teaching or transfer.'}
    atomic_json(receipt, value)
    os.rename(partial, target)
    value['status'] = 'published'; atomic_json(receipt, value)
    return value


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('archive', 'destination', 'receipt', 'expected-sha256'):
        parser.add_argument('--' + name, required=True)
    try:
        result = extract_archive(**vars(parser.parse_args()))
        print(json.dumps({k: result[k] for k in ('status', 'bytes', 'sha256', 'elapsedSeconds')}))
    except (OSError, ValueError, EOFError, zstd.ZstdError) as error:
        parser.exit(1, str(error) + '\n')

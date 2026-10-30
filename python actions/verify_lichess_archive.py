"""Publish one completed registered Lichess download; no extraction or graph work."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import time


def verify_and_publish(registration, completion, config, headers, destination, receipt):
    root = Path.cwd().resolve()
    reg = json.loads(Path(registration).read_text(encoding='utf-8-sig'))
    done = json.loads(Path(completion).read_text(encoding='utf-8-sig'))
    if done['exitCode'] != 0 or hashlib.sha256(Path(config).read_bytes()).hexdigest() != done['configHash']:
        raise ValueError('Download is incomplete or its config changed')
    header = Path(headers).read_text(encoding='utf-8-sig')
    expected_range = f"bytes {reg['parentBytes']}-{reg['expectedBytes'] - 1}/{reg['expectedBytes']}"
    etag = re.search(r'(?im)^ETag:\s*(.*?)\s*$', header)
    content_range = re.search(r'(?im)^Content-Range:\s*(.*?)\s*$', header)
    if ('206 Partial Content' not in header or not etag or etag.group(1) != reg['expectedEtag']
            or not content_range or content_range.group(1) != expected_range):
        raise ValueError('Download range or ETag mismatch')
    source, target, receipt = (root / reg['output']).resolve(), Path(destination).resolve(), Path(receipt).resolve()
    if source.parent != target.parent or target.parent != (root / '.cache').resolve():
        raise ValueError('Publication outside intended cache')
    if target.exists() or receipt.exists() or receipt.with_suffix(receipt.suffix + '.partial').exists():
        raise ValueError('Existing publication requires reconciliation, not overwrite')
    if source.stat().st_size != reg['expectedBytes'] or source.stat().st_size > reg['maxDownloadBytes']:
        raise ValueError('Download length mismatch')
    if not 0 < reg['parentBytes'] < reg['expectedBytes']:
        raise ValueError('Invalid resume offset')
    frames = []
    with source.open('rb') as stream:
        for _ in range(16):
            offset = stream.tell()
            magic = int.from_bytes(stream.read(4), 'little')
            if magic == 0xFD2FB528:
                frames.append({'compressedFrameOffset': offset})
                break
            if not 0x184D2A50 <= magic <= 0x184D2A5F:
                raise ValueError('No recognized Zstandard frame')
            size = int.from_bytes(stream.read(4), 'little')
            if stream.tell() + size > min(65536, reg['expectedBytes']):
                raise ValueError('Leading metadata exceeds framing inspection bound')
            frames.append({'skippableFrameOffset': offset, 'bytes': size})
            stream.seek(size, 1)
        else:
            raise ValueError('Too many leading metadata frames')
    whole, prefix, remaining, started = hashlib.sha256(), hashlib.sha256(), reg['parentBytes'], time.monotonic()
    with source.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            whole.update(chunk)
            if remaining:
                take = min(remaining, len(chunk)); prefix.update(chunk[:take]); remaining -= take
    if remaining or prefix.hexdigest() != reg['parentSha256']:
        raise ValueError('Resumed prefix changed')
    value = {'schema': 'lichess-archive-verification-v1', 'status': 'verified-awaiting-publication',
             'source': reg['source'], 'license': reg['license'], 'etag': reg['expectedEtag'],
             'bytes': source.stat().st_size, 'sha256': whole.hexdigest(), 'prefixSha256': prefix.hexdigest(),
             'prefixBytes': reg['parentBytes'], 'downloadCompletion': str(completion),
             'from': str(source.relative_to(root)), 'path': str(target.relative_to(root)),
             'leadingFrames': frames, 'hashElapsedSeconds': time.monotonic() - started,
             'scope': 'Transfer, resume prefix, SHA256 and leading framing only; full decompression, tasks and families remain unchecked.'}

    def publish_receipt():
        pending = receipt.with_suffix(receipt.suffix + '.partial')
        with pending.open('x', encoding='utf-8') as stream:
            stream.write(json.dumps(value, indent=2) + '\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(pending, receipt)

    publish_receipt()
    os.rename(source, target)
    value['status'] = 'published'
    publish_receipt()
    return value


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ('registration', 'completion', 'config', 'headers', 'destination', 'receipt'):
        parser.add_argument('--' + field, required=True)
    try:
        result = verify_and_publish(**vars(parser.parse_args()))
        print(json.dumps({k: result[k] for k in ('status', 'bytes', 'sha256', 'path')}))
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, str(error) + '\n')

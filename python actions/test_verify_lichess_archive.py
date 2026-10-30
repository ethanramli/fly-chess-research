"""Bounded framing/publication fixtures, not compressed-corpus or neural tests."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from compression import zstd
from unittest.mock import patch

from verify_lichess_archive import verify_and_publish
from extract_lichess_archive import extract_archive


class ArchivePublicationTests(unittest.TestCase):
    def setUp(self):
        self.previous = Path.cwd()
        self.temporary = tempfile.TemporaryDirectory(prefix='flychess-archive-')
        self.root = Path(self.temporary.name).resolve()
        self.assertEqual(self.root.parent, Path(tempfile.gettempdir()).resolve())
        os.chdir(self.root)
        (self.root / '.cache').mkdir()
        # Legal leading magic/metadata only; no claim of a real compressed body.
        self.payload = bytes.fromhex('502a4d1804000000') + b'meta' + bytes.fromhex('28b52ffd') + b'fixture-body'
        self.configure(self.payload)

    def tearDown(self):
        os.chdir(self.previous)
        self.temporary.cleanup()

    def configure(self, payload):
        self.payload = payload
        Path('.cache/source.partial.zst').write_bytes(payload)
        Path('config.json').write_text('{}')
        self.reg = {'output': '.cache/source.partial.zst', 'source': 'https://database.lichess.org/lichess_db_puzzle.csv.zst',
                    'license': 'CC0-1.0', 'expectedBytes': len(payload), 'maxDownloadBytes': 1000,
                    'parentBytes': 10, 'parentSha256': hashlib.sha256(payload[:10]).hexdigest(), 'expectedEtag': '"fixture"'}
        Path('registration.json').write_text(json.dumps(self.reg))
        Path('completion.json').write_text(json.dumps({'exitCode': 0, 'configHash': hashlib.sha256(b'{}').hexdigest()}))
        Path('headers.txt').write_text(f'HTTP/1.1 206 Partial Content\nETag: "fixture"\nContent-Range: bytes 10-{len(payload)-1}/{len(payload)}\n')

    def run_publication(self):
        return verify_and_publish('registration.json', 'completion.json', 'config.json', 'headers.txt',
                                  '.cache/complete.zst', 'receipt.json')

    def test_skippable_frame_then_ordinary_frame_publishes_same_bytes(self):
        result = self.run_publication()
        self.assertEqual(result['status'], 'published')
        self.assertEqual(result['leadingFrames'][-1]['compressedFrameOffset'], 12)
        self.assertEqual(Path('.cache/complete.zst').read_bytes(), self.payload)
        self.assertEqual(result['sha256'], hashlib.sha256(self.payload).hexdigest())
        self.assertFalse(Path('.cache/source.partial.zst').exists())

    def test_ordinary_first_frame_is_supported(self):
        self.configure(bytes.fromhex('28b52ffd') + b'fixture-body')
        self.assertEqual(self.run_publication()['leadingFrames'], [{'compressedFrameOffset': 0}])

    def test_bad_prefix_rejects_without_publication(self):
        payload = bytearray(self.payload); payload[8] ^= 1
        Path('.cache/source.partial.zst').write_bytes(payload)
        with self.assertRaisesRegex(ValueError, 'prefix changed'):
            self.run_publication()
        self.assertFalse(Path('receipt.json').exists())

    def test_changed_header_or_incomplete_download_is_rejected(self):
        Path('headers.txt').write_text('HTTP/1.1 206 Partial Content\nETag: "different"\n')
        with self.assertRaisesRegex(ValueError, 'ETag mismatch'):
            self.run_publication()
        self.configure(self.payload)
        Path('completion.json').write_text(json.dumps({'exitCode': 28, 'configHash': ''}))
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            self.run_publication()

    def test_unknown_magic_and_existing_partial_receipt_are_preserved(self):
        Path('.cache/source.partial.zst').write_bytes(b'HTML' + self.payload[4:])
        with self.assertRaisesRegex(ValueError, 'Zstandard frame'):
            self.run_publication()
        self.configure(self.payload)
        Path('receipt.json.partial').write_text('preserve')
        with self.assertRaisesRegex(ValueError, 'reconciliation'):
            self.run_publication()
        self.assertEqual(Path('receipt.json.partial').read_text(), 'preserve')

    def test_rename_failure_leaves_verified_receipt_for_reconciliation(self):
        with patch('verify_lichess_archive.os.rename', side_effect=OSError('injected rename failure')):
            with self.assertRaisesRegex(OSError, 'rename failure'):
                self.run_publication()
        self.assertEqual(json.loads(Path('receipt.json').read_text())['status'], 'verified-awaiting-publication')
        self.assertTrue(Path('.cache/source.partial.zst').exists())
        with self.assertRaisesRegex(ValueError, 'reconciliation'):
            self.run_publication()

    def test_extraction_reads_all_frames_and_skippable_metadata(self):
        body=b'header\nfirst\nsecond\n'
        compressed=bytes.fromhex('502a4d1804000000')+b'meta'+zstd.compress(body[:7])+zstd.compress(body[7:])
        Path('.cache/fixture.zst').write_bytes(compressed)
        result=extract_archive('.cache/fixture.zst','.cache/decoded.csv','decoded.json',hashlib.sha256(compressed).hexdigest())
        self.assertEqual(Path('.cache/decoded.csv').read_bytes(),body)
        self.assertEqual(result['sha256'],hashlib.sha256(body).hexdigest())

    def test_truncated_extraction_or_output_bound_never_publishes(self):
        compressed=zstd.compress(b'fixture-content')[:-2]
        Path('.cache/truncated.zst').write_bytes(compressed)
        with self.assertRaises((EOFError,zstd.ZstdError)):
            extract_archive('.cache/truncated.zst','.cache/bad.csv','bad.json',hashlib.sha256(compressed).hexdigest())
        self.assertFalse(Path('.cache/bad.csv').exists());self.assertFalse(Path('bad.json').exists())
        complete=zstd.compress(b'longer-than-five-bytes');Path('.cache/bounded.zst').write_bytes(complete)
        with self.assertRaisesRegex(ValueError,'byte/time bound'):
            extract_archive('.cache/bounded.zst','.cache/bounded.csv','bounded.json',hashlib.sha256(complete).hexdigest(),max_bytes=5)
        self.assertFalse(Path('.cache/bounded.csv').exists())


if __name__ == '__main__':
    unittest.main()

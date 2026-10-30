"""One offline publication/access check; no network, real games or graph."""
import contextlib
from email.message import Message
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
from unittest.mock import patch
from uuid import uuid4

import fetch_lichess_game_pgns as fetcher


def main():
    parent = Path(__file__).resolve().parent.parent / 'runs/python-actions/pgn-publication-checks'
    parent.mkdir(parents=True, exist_ok=True)
    root = parent / uuid4().hex
    root.mkdir()
    rows = root / 'rows.jsonl'
    rows.write_text(json.dumps({'schema':'lichess-puzzle-source-row-v1',
        'source':{'gameId':'abcd1234','gameUrl':'https://lichess.org/abcd1234'}})+'\n')
    pgn = b'[Event "synthetic"]\n[Site "https://lichess.org/abcd1234"]\n[GameId "abcd1234"]\n\n1. f3 e5 2. g4 Qh4# 0-1\n'
    class Response(io.BytesIO):
        status = 200
        headers = Message()
        headers['Content-Type'] = 'application/x-chess-pgn'
        def geturl(self):
            return fetcher.ENDPOINT
    out = root / 'published'
    with patch.object(sys, 'argv', ['fetcher','--rows',str(rows),'--split','development','--out',str(out)]), \
            patch.object(fetcher, 'urlopen', return_value=Response(pgn)), contextlib.redirect_stdout(io.StringIO()):
        fetcher.main()
    # A fresh managed child must be able to consume the published directory.
    child = subprocess.run([sys.executable,'-c',
        "import json,sys;from pathlib import Path;p=Path(sys.argv[1]);"
        "print(json.loads((p/'manifest.json').read_text())['status']);"
        "assert (p/'abcd1234.pgn').read_bytes()==(p/'response.pgn').read_bytes()",str(out)],
        capture_output=True,text=True,timeout=10)
    assert child.returncode == 0, child.stderr
    assert child.stdout.strip() == 'complete-response-id-coverage-verified'
    manifest = json.loads((out/'manifest.json').read_text())
    assert manifest['games']['abcd1234.pgn'] == hashlib.sha256(pgn).hexdigest()
    assert not list(root.glob('published.partial-*'))
    assert root.resolve().is_relative_to(parent.resolve())
    shutil.rmtree(root)
    print(json.dumps({'tests':1,'passed':1,'scope':'Synthetic offline atomic publication and fresh managed-reader access; no network or graph'}))


if __name__ == '__main__':
    main()

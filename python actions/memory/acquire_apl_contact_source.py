"""Bounded generation-pinned public acquisition, with explicit append-only resume."""
import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT/'research/reports/apl-locality-feasibility-2026-11-01'
DEST = ROOT/'.cache/flywire-783-locality/synapse_coordinates-generation-1733428450553759.csv.gz'
GENERATION = '1733428450553759'
SIZE = 316819225
MD5 = '9ca493e2314cc03aaf8b03e80f1643e8'
URL = 'https://storage.googleapis.com/flywire-data/codex/data/fafb/783/synapse_coordinates.csv.gz?generation='+GENERATION
PREFIX = REPORT/'source-evidence/buhmann-synapse-coordinates-65536-byte-prefix.gz'


def atomic(path, obj):
    part = path.with_suffix(path.suffix+'.partial')
    part.write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8'); part.replace(path)


def response_valid(status, headers, offset):
    assert headers['x-goog-generation'] == GENERATION
    assert headers['ETag'].strip('"') == MD5
    assert int(headers['Content-Length']) == SIZE-offset
    if offset:
        assert status == 206 and headers['Content-Range'] == f'bytes {offset}-{SIZE-1}/{SIZE}'
    else:
        assert status == 200


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resume',action='store_true'); parser.add_argument('--self-test',action='store_true')
    args=parser.parse_args()
    if args.self_test:
        headers={'x-goog-generation':GENERATION,'ETag':MD5,'Content-Length':str(SIZE-65536),'Content-Range':f'bytes 65536-{SIZE-1}/{SIZE}'}
        response_valid(206,headers,65536)
        try: response_valid(200,headers,65536)
        except AssertionError: pass
        else: raise AssertionError('A range-ignoring response must be rejected')
        print(json.dumps({'status':'self-test-passed','checks':2})); return
    assert not DEST.exists(),'Completed artifact already exists'
    partial=DEST.with_name(DEST.name+'.partial'); DEST.parent.mkdir(parents=True,exist_ok=True)
    assert partial.exists() == args.resume,'Require explicit resume for an existing partial; never silently restart'
    prefix=PREFIX.read_bytes(); assert len(prefix)==65536
    start=time.monotonic(); offset=partial.stat().st_size if partial.exists() else 0
    assert 0 <= offset <= SIZE
    sha,md5=hashlib.sha256(),hashlib.md5()
    if offset:
        with partial.open('rb') as stream:
            assert stream.read(min(offset,len(prefix)))==prefix[:min(offset,len(prefix))]
            stream.seek(0)
            while chunk:=stream.read(1<<20): sha.update(chunk);md5.update(chunk)
    attempt=REPORT/f'contact-acquisition-{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")}.json'
    receipt={'schema':'apl-contact-acquisition-v1','status':'running','url':URL,'generation':GENERATION,'size':SIZE,'md5':MD5,
             'resume':args.resume,'initialBytes':offset,'receivedBytes':offset,'rawPath':str(DEST),'sourcePrefixSha256':hashlib.sha256(prefix).hexdigest(),
             'argv':__import__('sys').argv,'limits':{'wallSeconds':180,'rssMiB':2048,'freeMiB':256,'socketSeconds':20},'resources':[]}

    def guard(measure=False):
        assert time.monotonic()-start <= 180,'Elapsed guard'
        if measure:
            inventory=curriculum.inventory();own=next(p for p in inventory['processes'] if p['pid']==os.getpid())
            assert own['workingSetMiB']<=2048 and inventory['freeMiB']>=256,'Memory guard'
            receipt['resources'].append({'rssMiB':own['workingSetMiB'],'freeMiB':inventory['freeMiB']})
    atomic(attempt,receipt)
    try:
        guard(True)
        headers={'Accept-Encoding':'identity','If-Match':'"'+MD5+'"'}
        if offset:headers['Range']=f'bytes={offset}-'
        request=urllib.request.Request(URL,headers=headers)
        if offset<SIZE:
            with urllib.request.urlopen(request,timeout=20) as response:
                response_valid(response.status,response.headers,offset)
                receipt['responseHeaders']=dict(response.headers)
                with partial.open('ab' if offset else 'xb') as out:
                    while chunk:=response.read(1<<20):
                        guard()
                        if offset==0:assert chunk[:len(prefix)]==prefix
                        assert offset+len(chunk)<=SIZE
                        out.write(chunk);sha.update(chunk);md5.update(chunk);offset+=len(chunk)
                        if offset//(32<<20)!=(offset-len(chunk))//(32<<20):
                            guard(True);receipt['receivedBytes']=offset;atomic(attempt,receipt)
                    out.flush();os.fsync(out.fileno())
        assert offset==SIZE and md5.hexdigest()==MD5,'Incomplete or changed body'
        decompressed=0
        with gzip.open(partial,'rb') as stream:
            while chunk:=stream.read(1<<20):decompressed+=len(chunk);guard()
        guard(True);partial.replace(DEST)
        receipt.update(status='complete',receivedBytes=offset,sha256=sha.hexdigest(),actualMd5=md5.hexdigest(),gzipCrcEof=True,decompressedBytes=decompressed,elapsedSeconds=time.monotonic()-start)
        atomic(attempt,receipt);atomic(DEST.with_suffix(DEST.suffix+'.receipt.json'),receipt)
        print(json.dumps({'status':'complete','bytes':offset,'sha256':sha.hexdigest(),'receipt':str(attempt),'elapsedSeconds':receipt['elapsedSeconds']}))
    except Exception as exc:
        receipt.update(status='failed',receivedBytes=offset,error=str(exc),elapsedSeconds=time.monotonic()-start)
        atomic(attempt,receipt);raise


if __name__=='__main__':main()

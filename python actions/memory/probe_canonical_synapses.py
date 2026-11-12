"""Bounded Arrow range reader for one public canonical source sample."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import time
import urllib.request

import pyarrow as pa
import pyarrow.ipc as ipc
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum

ROOT=Path(__file__).resolve().parents[2]
URL='https://zenodo.org/api/records/10676866/files/flywire_synapses_783.feather/content'
SIZE=9492998242


class RangeReader(io.RawIOBase):
    def __init__(self):
        super().__init__();self.position=0;self.requests=[];self.transferred=0;self.started=time.monotonic();self.resources=[]
    def guard(self):
        assert time.monotonic()-self.started<=90,'Elapsed bound'
        observed=curriculum.inventory();own=next(p for p in observed['processes'] if p['pid']==os.getpid())
        assert own['workingSetMiB']<=2048 and observed['freeMiB']>=256,'Memory bound'
        self.resources.append({'rssMiB':own['workingSetMiB'],'freeMiB':observed['freeMiB']})
    def readable(self):return True
    def seekable(self):return True
    def tell(self):return self.position
    def seek(self,offset,whence=0):
        target=offset if whence==0 else self.position+offset if whence==1 else SIZE+offset
        assert 0<=target<=SIZE;self.position=target;return target
    def read(self,n=-1):
        assert 0<=n<=8*2**20,'Single-read bound'
        n=min(n,SIZE-self.position)
        if not n:return b''
        assert self.transferred+n<=32*2**20 and len(self.requests)<24 and time.monotonic()-self.started<=90,'Probe bound'
        self.guard()
        start,end=self.position,self.position+n-1
        request=urllib.request.Request(URL,headers={'Range':f'bytes={start}-{end}','Accept-Encoding':'identity'})
        with urllib.request.urlopen(request,timeout=20) as response:
            assert response.status==206 and response.headers['Content-Range']==f'bytes {start}-{end}/{SIZE}','Range response mismatch'
            data=response.read(n+1);assert len(data)==n
            self.requests.append({'start':start,'end':end,'bytes':n,'sha256':hashlib.sha256(data).hexdigest(),'headers':dict(response.headers)})
        self.position+=n;self.transferred+=n;return data
    def readinto(self,b):
        data=self.read(len(b));b[:len(data)]=data;return len(data)


def atomic(p,x):
    part=p.with_suffix(p.suffix+'.partial');part.write_text(json.dumps(x,indent=2)+'\n',encoding='utf-8');part.replace(p)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--out',type=Path);parser.add_argument('--self-test',action='store_true');args=parser.parse_args()
    if args.self_test:
        reader=RangeReader();assert reader.seek(-10,2)==SIZE-10 and reader.tell()==SIZE-10
        for operation in [lambda:reader.seek(-1),lambda:reader.read(-1),lambda:reader.read(SIZE)]:
            try:operation()
            except AssertionError:pass
            else:raise AssertionError('Invalid/unbounded read must fail before network access')
        assert not reader.requests
        print(json.dumps({'status':'self-test-passed','checks':4}));return 0
    assert args.out
    out=args.out.resolve();assert out.is_relative_to(ROOT) and not out.exists();out.mkdir(parents=True)
    reader=RangeReader();result={'schema':'canonical-contact-range-probe-v1','status':'running','url':URL,'sourceBytes':SIZE,'fullSourceMd5MetadataOnly':'f8f1b97c9d4b0ea9b4c8b287f6b99091','pyarrow':pa.__version__,'graphPasses':0}
    atomic(out/'result.json',result)
    try:
        source=ipc.open_file(reader,options=ipc.IpcReadOptions(use_threads=False))
        result.update(schemaFields=[{'name':f.name,'type':str(f.type)} for f in source.schema],recordBatches=source.num_record_batches)
        atomic(out/'result.json',result)
        names=source.schema.names
        selected=[i for i,n in enumerate(names) if any(k in n for k in ['root_id','position','cleft_score']) or n=='id']
        assert selected,'No canonical endpoint columns found'
        reader.seek(0)
        projected=ipc.open_file(reader,options=ipc.IpcReadOptions(use_threads=False,included_fields=selected))
        batch=projected.get_batch(0)
        assert batch.num_rows<=1000000
        with pa.OSFile(str(out/'first-batch.feather'),'wb') as sink:
            with ipc.new_file(sink,batch.schema) as writer:writer.write_batch(batch)
        result.update(status='complete',sampleBatch=0,sampleRows=batch.num_rows,sampleFields=batch.schema.names,sampleSha256=hashlib.sha256((out/'first-batch.feather').read_bytes()).hexdigest())
        reader.guard()
    except Exception as exc:
        result.update(status='probe-bound-or-access-failed',error=str(exc))
    finally:
        result.update(requests=reader.requests,transferredBytes=reader.transferred,elapsedSeconds=time.monotonic()-reader.started,fullFileChecksumVerified=False,resources=reader.resources)
        atomic(out/'result.json',result)
        print(json.dumps({k:v for k,v in result.items() if k not in ['requests','schemaFields']}))
    return 0 if result['status']=='complete' else 1


if __name__=='__main__':raise SystemExit(main())

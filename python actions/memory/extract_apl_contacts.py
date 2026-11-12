"""Stream all retained APL/KC contacts from the completed public lite export."""
import argparse
from collections import Counter
import csv
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'.cache/flywire-783-locality/synapse_coordinates-generation-1733428450553759.csv.gz'
INVENTORY=ROOT/'runs/memory-retention-2026-11-01/apl-locality-static-v2'
REPORT=ROOT/'research/reports/apl-locality-feasibility-2026-11-01'


def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()


def atomic(p,x):
    partial=p.with_suffix(p.suffix+'.partial');partial.write_text(json.dumps(x,indent=2)+'\n',encoding='utf-8');partial.replace(p)


def contact(row):
    pre,post=row['pre_root_id'],row['post_root_id']
    assert pre.isdigit() and post.isdigit() and len(pre)==len(post)==18
    assert all(math.isfinite(float(row[k])) for k in ['x','y','z'])
    return pre,post


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--out',type=Path);parser.add_argument('--self-test',action='store_true');a=parser.parse_args()
    if a.self_test:
        row={'pre_root_id':'720575940613583001','post_root_id':'720575940624547622','x':'-1.25','y':'4','z':'0'}
        assert contact(row)==('720575940613583001','720575940624547622') and row['x']=='-1.25'
        print(json.dumps({'status':'self-test-passed','checks':1}));return
    assert a.out;out=a.out.resolve();assert out.is_relative_to(ROOT) and not out.exists()
    receipt=json.loads(SOURCE.with_suffix(SOURCE.suffix+'.receipt.json').read_text());assert receipt['status']=='complete' and receipt['gzipCrcEof']
    assert receipt['generation']=='1733428450553759' and receipt['sha256']==sha(SOURCE)=='dfcb423d9f685d56c81160e50ca158c9ab589871cb01922af2a5b8c4442216b1'
    inventory=json.loads((INVENTORY/'result.json').read_text());assert inventory['status']=='complete' and inventory['retainedPairs']==10343
    expected={};directions={}
    for line in (INVENTORY/'retained-kc-apl-edges.jsonl').open():
        r=json.loads(line);pair=r['preRoot'],r['postRoot'];assert pair not in expected;expected[pair]=r['synapseCount'];directions[pair]=r['direction']
    apl={r['root'] for r in inventory['apl']}
    files=[SOURCE,SOURCE.with_suffix(SOURCE.suffix+'.receipt.json'),INVENTORY/'manifest.json',INVENTORY/'result.json',INVENTORY/'retained-kc-apl-edges.jsonl',REPORT/'contact-subset-spec.md',Path(__file__),ROOT/'python actions/curriculum.py']
    pins={p.relative_to(ROOT).as_posix():sha(p) for p in files};start=time.monotonic();resources=[]
    def guard(measure=False):
        assert time.monotonic()-start<=180,'Elapsed guard'
        if measure:
            state=curriculum.inventory();own=next(p for p in state['processes'] if p['pid']==os.getpid())
            assert own['workingSetMiB']<=2048 and state['freeMiB']>=256,'Memory guard'
            resources.append({'rssMiB':own['workingSetMiB'],'freeMiB':state['freeMiB']})
    guard(True);out.mkdir(parents=True)
    manifest={'schema':'apl-contact-subset-v1','status':'running','pins':pins,'limits':{'wallSeconds':180,'rssMiB':2048,'freeMiB':256},'graphPasses':0}
    atomic(out/'manifest.json',manifest)
    try:
        observed=Counter();seen=selected=involving=0;by_direction=Counter();by_apl=Counter()
        with gzip.open(SOURCE,'rt',encoding='utf-8-sig',newline='') as stream,(out/'contacts.csv').open('x',encoding='utf-8',newline='') as target:
            reader=csv.DictReader(stream);assert reader.fieldnames==['pre_root_id','post_root_id','x','y','z']
            writer=csv.writer(target);writer.writerow(['source_row','pre_root_id','post_root_id','x','y','z'])
            for row in reader:
                seen+=1
                if seen%1000000==0:guard()
                pair=row['pre_root_id'],row['post_root_id']
                if pair[0] not in apl and pair[1] not in apl:continue
                involving+=1
                if pair not in expected:continue
                contact(row);observed[pair]+=1;selected+=1;by_direction[directions[pair]]+=1;by_apl[pair[0] if pair[0] in apl else pair[1]]+=1
                writer.writerow([seen,*pair,row['x'],row['y'],row['z']])
        mismatches=[{'preRoot':p,'postRoot':q,'expected':n,'observed':observed[(p,q)]} for (p,q),n in expected.items() if n!=observed[(p,q)]]
        guard(True)
        for p,h in pins.items():assert sha(ROOT/p)==h,f'Input changed {p}'
        result={'schema':manifest['schema'],'status':'complete','countCompatibility':not mismatches,'sourceRows':seen,'aplInvolvingRows':involving,'selectedRows':selected,
                'expectedPairs':len(expected),'pairsWithRows':len(observed),'expectedTotal':sum(expected.values()),'mismatches':mismatches,'byDirection':dict(by_direction),'byApl':dict(by_apl),
                'coordinateSemantics':'literal lite-export xyz; APL-side pre/post/center and units not independently established here','graphPasses':0,'learnerUpdates':0,'resources':resources,'elapsedSeconds':time.monotonic()-start}
        atomic(out/'result.json',result);atomic(out/'manifest.json',{**manifest,'status':'complete','resultSha256':sha(out/'result.json'),'contactsSha256':sha(out/'contacts.csv')})
        print(json.dumps({'status':'complete','countCompatibility':not mismatches,'selectedRows':selected,'expectedPairs':len(expected),'mismatchedPairs':len(mismatches),'out':str(out),'elapsedSeconds':result['elapsedSeconds']}))
        return 0 if not mismatches else 1
    except Exception as exc:atomic(out/'manifest.json',{**manifest,'status':'failed','error':str(exc)});raise


if __name__=='__main__':raise SystemExit(main())

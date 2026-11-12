"""Same registered root decoding/count checks, using bounded Arrow CSV batches."""
import argparse
from collections import Counter
import csv
import gzip
import json
import os
from pathlib import Path
import sys
import time

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.csv as pacsv
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum
from extract_apl_contacts_v2 import ROOT,SOURCE,INVENTORY,REPORT,sha,atomic,contact,expand_roots

FIELDS=['pre_root_id','post_root_id','x','y','z']


def fill_roots(column,previous):
    filled=pc.fill_null_forward(column)
    if previous is not None:filled=pc.fill_null(filled,previous)
    assert filled.null_count==0,'Unresolved compact root identifier'
    assert pc.all(pc.match_substring_regex(filled,'^[0-9]+$')).as_py(),'Noninteger root marker'
    return filled,filled[-1].as_py()


def batches(block_size=1<<20):
    previous=[None,None]
    convert=pacsv.ConvertOptions(column_types={k:pa.string() for k in FIELDS},strings_can_be_null=True,null_values=[''])
    with pacsv.open_csv(str(SOURCE),read_options=pacsv.ReadOptions(block_size=block_size,use_threads=False),convert_options=convert) as reader:
        assert reader.schema.names==FIELDS
        for batch in reader:
            columns=list(batch.columns)
            for j in [0,1]:columns[j],previous[j]=fill_roots(columns[j],previous[j])
            yield pa.Table.from_arrays(columns,names=FIELDS)


def self_test():
    a,previous=fill_roots(pa.array(['720575940613583001',None]),None)
    assert a.to_pylist()==['720575940613583001']*2
    b,previous=fill_roots(pa.array([None,'720575940624547622',None]),previous)
    assert b.to_pylist()==['720575940613583001','720575940624547622','720575940624547622']
    try:fill_roots(pa.array([None],type=pa.string()),None)
    except AssertionError:pass
    else:raise AssertionError('Initial empty identifier must fail')
    expected=[];previous=(None,None)
    with gzip.open(SOURCE,'rt',encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f):
            previous=expand_roots(r,previous);r['pre_root_id'],r['post_root_id']=previous
            expected.append(tuple(r[k] for k in FIELDS))
            if len(expected)==10000:break
    actual=[]
    for batch in batches(block_size=4096):
        actual.extend(tuple(r[k] for k in FIELDS) for r in batch.to_pylist())
        if len(actual)>=10000:break
    assert actual[:10000]==expected and len(expected)==10000
    print(json.dumps({'status':'self-test-passed','syntheticChecks':3,'realRowsExactlyMatched':10000}))


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--out',type=Path);parser.add_argument('--self-test',action='store_true');a=parser.parse_args()
    if a.self_test:self_test();return 0
    assert a.out;out=a.out.resolve();assert out.is_relative_to(ROOT) and not out.exists()
    receipt=json.loads(SOURCE.with_suffix(SOURCE.suffix+'.receipt.json').read_text());assert receipt['status']=='complete' and receipt['gzipCrcEof']
    assert sha(SOURCE)==receipt['sha256']=='dfcb423d9f685d56c81160e50ca158c9ab589871cb01922af2a5b8c4442216b1'
    inventory=json.loads((INVENTORY/'result.json').read_text());assert inventory['status']=='complete' and inventory['retainedPairs']==10343
    expected,directions={},{}
    for line in (INVENTORY/'retained-kc-apl-edges.jsonl').open():
        r=json.loads(line);pair=r['preRoot'],r['postRoot'];assert pair not in expected;expected[pair]=r['synapseCount'];directions[pair]=r['direction']
    apl={r['root'] for r in inventory['apl']};apl_array=pa.array(sorted(apl))
    files=[SOURCE,SOURCE.with_suffix(SOURCE.suffix+'.receipt.json'),INVENTORY/'manifest.json',INVENTORY/'result.json',INVENTORY/'retained-kc-apl-edges.jsonl',REPORT/'contact-subset-v3-spec.md',Path(__file__),ROOT/'python actions/memory/extract_apl_contacts_v2.py',ROOT/'python actions/curriculum.py']
    pins={p.relative_to(ROOT).as_posix():sha(p) for p in files};started=time.monotonic();resources=[]
    def guard(measure=False):
        assert time.monotonic()-started<=180,'Elapsed guard'
        if measure:
            state=curriculum.inventory();own=next(p for p in state['processes'] if p['pid']==os.getpid())
            assert own['workingSetMiB']<=2048 and state['freeMiB']>=256,'Memory guard'
            resources.append({'rssMiB':own['workingSetMiB'],'freeMiB':state['freeMiB']})
    guard(True);out.mkdir(parents=True)
    manifest={'schema':'apl-contact-subset-v3','status':'running','pins':pins,'pyarrow':pa.__version__,'limits':{'wallSeconds':180,'rssMiB':2048,'freeMiB':256},'graphPasses':0}
    atomic(out/'manifest.json',manifest)
    try:
        observed=Counter();seen=selected=involving=0;by_direction=Counter();by_apl=Counter()
        with (out/'contacts.csv').open('x',encoding='utf-8',newline='') as target:
            writer=csv.writer(target);writer.writerow(['source_row',*FIELDS])
            for ordinal,batch in enumerate(batches()):
                guard()
                if ordinal%200==0:guard(True)
                mask=pc.or_(pc.is_in(batch.column(0),value_set=apl_array),pc.is_in(batch.column(1),value_set=apl_array))
                indices=pc.indices_nonzero(mask).to_pylist();subset=batch.filter(mask).to_pylist();involving+=len(subset)
                for index,row in zip(indices,subset,strict=True):
                    pair=row['pre_root_id'],row['post_root_id']
                    if pair not in expected:continue
                    contact(row);observed[pair]+=1;selected+=1;by_direction[directions[pair]]+=1;by_apl[pair[0] if pair[0] in apl else pair[1]]+=1
                    writer.writerow([seen+index+1,*pair,row['x'],row['y'],row['z']])
                seen+=batch.num_rows
        mismatches=[{'preRoot':p,'postRoot':q,'expected':n,'observed':observed[(p,q)]} for (p,q),n in expected.items() if n!=observed[(p,q)]]
        guard(True)
        for p,h in pins.items():assert sha(ROOT/p)==h,f'Input changed {p}'
        result={'schema':manifest['schema'],'status':'complete','countCompatibility':not mismatches,'sourceRows':seen,'aplInvolvingRows':involving,'selectedRows':selected,'expectedTotal':sum(expected.values()),
                'expectedPairs':len(expected),'pairsWithRows':len(observed),'mismatches':mismatches,'byDirection':dict(by_direction),'byApl':dict(by_apl),
                'decodingHypothesis':'same independent forward-fill as preserved v2; exact first-10000-row equivalence tested','coordinateSemantics':'literal lite-export xyz; APL-side point semantics remain unresolved',
                'graphPasses':0,'learnerUpdates':0,'resources':resources,'elapsedSeconds':time.monotonic()-started}
        atomic(out/'result.json',result);atomic(out/'manifest.json',{**manifest,'status':'complete','resultSha256':sha(out/'result.json'),'contactsSha256':sha(out/'contacts.csv')})
        print(json.dumps({'status':'complete','countCompatibility':not mismatches,'selectedRows':selected,'mismatchedPairs':len(mismatches),'out':str(out),'elapsedSeconds':result['elapsedSeconds']}))
        return 0 if not mismatches else 1
    except Exception as exc:atomic(out/'manifest.json',{**manifest,'status':'failed','error':str(exc)});raise


if __name__=='__main__':raise SystemExit(main())

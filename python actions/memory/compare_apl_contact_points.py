"""Compare a preselected canonical first batch with the complete lite APL subset."""
import argparse
from collections import Counter,defaultdict
import csv
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import statistics
import time

import pyarrow.ipc as ipc
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'runs/memory-retention-2026-11-01'
REPORT=ROOT/'research/reports/apl-locality-feasibility-2026-11-01'


def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()


def atomic(p,x):
    t=p.with_suffix(p.suffix+'.partial');t.write_text(json.dumps(x,indent=2)+'\n',encoding='utf-8');t.replace(p)


def points(r):
    pre=tuple(r[f'pre_pt_position_{k}'] for k in 'xyz');post=tuple(r[f'post_pt_position_{k}'] for k in 'xyz')
    return {'pre':pre,'post':post,'midpoint':tuple((a+b)/2 for a,b in zip(pre,post,strict=True))}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path);p.add_argument('--self-test',action='store_true');a=p.parse_args()
    if a.self_test:
        r={f'{side}_pt_position_{k}':v for side,vs in [('pre',[2,4,6]),('post',[4,8,12])] for k,v in zip('xyz',vs)}
        assert points(r)=={'pre':(2,4,6),'post':(4,8,12),'midpoint':(3,6,9)}
        assert len(set(points(r).values()))==3;print(json.dumps({'status':'self-test-passed','checks':2}));return 0
    assert a.out;out=a.out.resolve();assert out.is_relative_to(ROOT) and not out.exists()
    subset=BASE/'apl-contact-subset-v3';sample=BASE/'canonical-synapse-probe-v1'
    result=json.loads((subset/'result.json').read_text());manifest=json.loads((subset/'manifest.json').read_text())
    probe=json.loads((sample/'result.json').read_text());assert result['countCompatibility'] and manifest['status']==probe['status']=='complete'
    assert manifest['contactsSha256']==sha(subset/'contacts.csv') and probe['sampleSha256']==sha(sample/'first-batch.feather')
    files=[subset/'result.json',subset/'manifest.json',subset/'contacts.csv',sample/'result.json',sample/'first-batch.feather',BASE/'apl-locality-static-v2/retained-kc-apl-edges.jsonl',REPORT/'canonical-point-comparison-spec.md',Path(__file__)]
    pins={f.relative_to(ROOT).as_posix():sha(f) for f in files};start=time.monotonic();resources=[]
    def guard():
        assert time.monotonic()-start<=60
        state=curriculum.inventory();own=next(x for x in state['processes'] if x['pid']==os.getpid())
        assert own['workingSetMiB']<=2048 and state['freeMiB']>=256;resources.append({'rssMiB':own['workingSetMiB'],'freeMiB':state['freeMiB']})
    guard();out.mkdir(parents=True)
    m={'schema':'apl-point-semantics-v1','status':'running','pins':pins,'graphPasses':0};atomic(out/'manifest.json',m)
    try:
        pairs={}
        for line in (BASE/'apl-locality-static-v2/retained-kc-apl-edges.jsonl').open():
            r=json.loads(line);pairs[r['preRoot'],r['postRoot']]=r['direction']
        batch=ipc.open_file(str(sample/'first-batch.feather')).get_batch(0);assert batch.num_rows==65536
        apl={720575940613583001,720575940624547622};all_apl=[];records=[]
        for r in batch.to_pylist():
            if r['pre_pt_root_id'] not in apl and r['post_pt_root_id'] not in apl:continue
            all_apl.append(r);pair=str(r['pre_pt_root_id']),str(r['post_pt_root_id'])
            if pair in pairs:records.append((pair,r))
        wanted={pair for pair,_ in records};lookup=defaultdict(lambda:defaultdict(list))
        with (subset/'contacts.csv').open(newline='') as f:
            for r in csv.DictReader(f):
                pair=r['pre_root_id'],r['post_root_id']
                if pair in wanted:lookup[pair][tuple(float(r[k]) for k in 'xyz')].append(int(r['source_row']))
        observed=[];counts=Counter();displacements=[]
        for pair,r in records:
            candidates=points(r);matches={name:lookup[pair].get(point,[]) for name,point in candidates.items()}
            labels=[k for k,v in matches.items() if v]
            for label in labels:counts[label]+=1
            if not labels:counts['none']+=1
            if len(labels)>1:counts['multiple']+=1
            delta=math.dist(candidates['pre'],candidates['post']);displacements.append(delta)
            observed.append({'synapseId':str(r['id']),'preRoot':pair[0],'postRoot':pair[1],'direction':pairs[pair],'cleftScore':r['cleft_score'],
                             'canonicalPointsNm':candidates,'matchedSourceRows':matches,'matchedDefinitions':labels,'endpointSeparationNm':delta})
        guard()
        for f,h in pins.items():assert sha(ROOT/f)==h,f'Input changed {f}'
        final={'schema':m['schema'],'status':'complete','scope':'fixed canonical first-batch comparison only; no claim of full-file checksum or exact APL-side geometry',
               'canonicalBatchRows':batch.num_rows,'allAplRows':len(all_apl),'retainedPairRows':len(records),'pairs':len(wanted),'matchCounts':dict(counts),'records':observed,
               'endpointSeparationNm':{'min':min(displacements),'median':statistics.median(displacements),'max':max(displacements)} if displacements else None,
               'resources':resources,'elapsedSeconds':time.monotonic()-start,'graphPasses':0,'learnerUpdates':0}
        atomic(out/'result.json',final);atomic(out/'manifest.json',{**m,'status':'complete','resultSha256':sha(out/'result.json')})
        print(json.dumps({k:v for k,v in final.items() if k not in ['records','resources']}))
    except Exception as e:atomic(out/'manifest.json',{**m,'status':'failed','error':str(e)});raise


if __name__=='__main__':raise SystemExit(main())

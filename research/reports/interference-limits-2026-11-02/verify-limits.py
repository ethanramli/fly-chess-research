"""Stored evidence only. Exact binary64 rationals; no graph or training imports."""
import hashlib
import json
import ast
import bisect
import struct
import zipfile
from fractions import Fraction as Q
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SOURCE = ROOT / 'runs/memory-retention-2026-11-01/synaptic-conflict-v1'


def interval(rows, margin):
    lower = max(((margin-b)/a, j) for j,a,b in rows if a > 0)
    upper = min(((margin-b)/a, j) for j,a,b in rows if a < 0)
    return lower, upper


def main():
    d = json.loads((SOURCE/'result.json').read_text())
    observations = [json.loads(l) for l in (SOURCE/'graph-observations.jsonl').read_text().splitlines()]
    results = {}
    for name, c in d['primary']['conditions'].items():
        rows = []
        for r in c['items']:
            j = r['item']; good = int(name != 'Delay' and j == 0); bad = 1-good
            x = list(map(Q, r['raw'])); n = list(map(Q, r['naive']))
            assert all(v > 0 for v in n)
            for candidate in range(2):
                obs = next(o for o in observations if o['condition']==name and o['item']==j and o['candidate']==candidate)
                assert obs['raw'] == r['raw'][candidate]
            a = (1/n[good]-1/n[bad])/2
            b = (x[bad]/n[bad]-x[good]/n[good])/2
            assert abs(float(a*Q(c['currentRest'])+b)-r['currentRestMargin']) < 1e-12
            rows.append((j,a,b))
        low, high = interval(rows, Q(0))
        record = dict(rows=[dict(item=j,a=str(a),b=str(b)) for j,a,b in rows], zeroMargin=dict(lower=str(low[0]),lowerItem=low[1],upper=str(high[0]),upperItem=high[1],feasible=low[0]<high[0]))
        if low[0] < high[0]:
            witness=(low[0]+high[0])/2
            assert all(a*witness+b > 0 for _,a,b in rows)
            record['witnessRest']=str(witness)
            record['witnessMargins']=[float(a*witness+b) for _,a,b in rows]
        else:
            # Normalize opposite-slope inequalities so their rest coefficient cancels.
            _,ap,bp=rows[low[1]]; _,an,bn=rows[high[1]]
            lp=1/ap; ln=-1/an
            constant=lp*bp+ln*bn
            assert lp>0 and ln>0 and lp*ap+ln*an==0 and constant<0
            record['dual']=dict(items=[low[1],high[1]],multipliers=[str(lp),str(ln)],constant=str(constant))
        # Explicit prospective uniform-margin diagnostic, not an enacted experiment gate.
        lm,um=interval(rows,Q(3,20))
        record['uniform015']=dict(feasible=lm[0]<=um[0],lower=str(lm[0]),upper=str(um[0]))
        results[name]=record
    # No exact collision in observed input stimulation or scalar response within these eight candidates.
    run=ROOT/'runs/memory-retention-2026-11-01/eye-graph-memory-cubic-v1-recovery1'
    with (run/'frames-4102-informative.jsonl').open() as f: h=json.loads(next(f))
    images=[json.dumps(sorted(im,key=lambda x:x['index']),sort_keys=True) for item in h['items'] for im in item['images']]
    assert len(images)==len(set(images))==8
    cells=json.loads((OUT/'cell-evidence.json').read_text())
    manifest=json.loads((SOURCE/'manifest.json').read_text())
    for p, expected in cells['pins'].items():
        assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==expected
        if p in manifest['pins']:
            assert expected==manifest['pins'][p]
    assert hashlib.sha256((SOURCE/'result.json').read_bytes()).hexdigest()==manifest['resultSha256']
    # Independent stdlib NPZ decoding for the six edge identities (no NumPy).
    def member(z, name, code):
        raw=z.read(name+'.npy'); assert raw[:6]==b'\x93NUMPY'
        start=10 if raw[6]==1 else 12
        length=struct.unpack_from('<H' if start==10 else '<I',raw,8)[0]
        header=ast.literal_eval(raw[start:start+length].decode('ascii'))
        assert not header['fortran_order']
        return [x[0] for x in struct.iter_unpack('<'+code,raw[start+length:])]
    with zipfile.ZipFile(ROOT/'.cache/full.npz') as z:
        roots=member(z,'root_ids','q'); ptr=member(z,'csr_indptr','i')
        col=member(z,'csr_indices','i'); signs=member(z,'sign','b'); counts=member(z,'syn_count','f')
    for c in cells['cells']+cells['contacts']:
        e=c['edge']; post=bisect.bisect_right(ptr,e)-1
        assert c['pre']['index']==col[e] and c['post']['index']==post
        assert c['pre']['root']==str(roots[col[e]]) and c['post']['root']==str(roots[post])
        assert c['sign']==signs[e] and c['retainedSynCount']==counts[e]
    table=['|Slot / graph edge|KC root (index)|MBON root (index)|Sign / retained contacts|Gain T2 → T3 → Delay → Rev|','|---|---|---|---|---|']
    for c in cells['cells']:
        assert c['pre']['hemibrain_type']=='KCg-d' and c['post']['hemibrain_type']=='MBON05'
        gains=[c['snapshots'][p]['gain'] for p in ['T2','T3','Delay','Rev']]
        table.append(f"|{c['slot']} / {c['edge']}|{c['pre']['root']} ({c['pre']['index']})|{c['post']['root']} ({c['post']['index']})|+1 / {c['retainedSynCount']}|"+' → '.join(f'{v:.9f}' for v in gains)+'|')
    (OUT/'cell-table.md').write_text('\n'.join(table)+'\n',encoding='utf-8')
    pins={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [SOURCE/'result.json',SOURCE/'graph-observations.jsonl',OUT/'cell-evidence.json',Path(__file__)]}
    result=dict(schema='fixed-response-baseline-certificate-v1',precision='Exact rational values of parsed IEEE754 binary64 source numbers; zero proof tolerance. Cross-check saved margins at 1e-12 only.',pins=pins,conditions=results,distinctStimulations=8,independentlyDecodedEdges=18,sourceManifestMatched=True,graphPasses=0,trainingUpdates=0)
    (OUT/'proof-certificate.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:dict(feasible=v['zeroMargin']['feasible'],lower=float(Q(v['zeroMargin']['lower'])),upper=float(Q(v['zeroMargin']['upper'])),witnessMargins=v.get('witnessMargins')) for k,v in results.items()}))


if __name__ == '__main__':
    main()

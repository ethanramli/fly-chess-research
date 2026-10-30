"""Compare completed preparation chunks with preserved earlier publications."""
import argparse
from pathlib import Path
import curriculum as actions


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before',required=True)
    parser.add_argument('--after',required=True)
    parser.add_argument('--out',required=True)
    args=parser.parse_args()
    before=actions.local(args.before)
    after=actions.local(args.after)
    out=actions.local(args.out)
    if out.exists():
        raise ValueError('Preserve previous equivalence report')
    old=actions.read_json(before)
    new=actions.read_json(after)
    assert old['schema']==new['schema']=='lichess-preparation-batches-v1'
    assert new['phase']=='complete' and new['neuralEventsDelivered']==0
    assert 1<=len(old['completed'])<=len(new['completed'])<=128
    lookup={e['job']:e for e in new['completed']}
    checked=[]
    for entry in old['completed']:
        other=lookup[entry['job']]
        left,right=actions.local(entry['manifest']),actions.local(other['manifest'])
        assert actions.digest(left)==entry['manifestSha256']
        assert actions.digest(right)==other['manifestSha256']
        m,n=actions.read_json(left),actions.read_json(right)
        assert m['input']==n['input'] and m['selection']==n['selection'] and m['split']==n['split']
        assert m['counts']==n['counts'] and m['neuralEventsDelivered']==n['neuralEventsDelivered']==0
        x,y=left.parent/'lessons.jsonl',right.parent/'lessons.jsonl'
        assert actions.digest(x)==m['outputSha256']==n['outputSha256']==actions.digest(y)
        with x.open('rb') as f,y.open('rb') as g:
            while True:
                a,b=f.read(65536),g.read(65536)
                assert a==b,'Changed lesson bytes'
                if not a:
                    break
        checked.append({'job':entry['job'],'rows':m['counts']['prepared'],'outputSha256':m['outputSha256']})
    report={'schema':'lichess-lesson-equivalence-v1','passed':True,
        'before':{'path':str(before),'sha256':actions.digest(before)},
        'after':{'path':str(after),'sha256':actions.digest(after)},'checkedChunks':checked,
        'rows':sum(e['rows'] for e in checked),'finalSplitInspected':False,
        'scope':'Exact unchanged completed lesson bytes on overlapping prior rows; independent full-package audit still required. No neural/throughput result.'}
    actions.atomic_json(out,report)
    actions.emit({'passed':True,'chunks':len(checked),'rows':report['rows'],'report':str(out)})


if __name__=='__main__':
    main()

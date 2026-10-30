"""Offline independent-audit checks on synthetic source packages; no graph/network."""
import contextlib
import io
import json
from pathlib import Path
import shutil
import subprocess
from uuid import uuid4

import curriculum as actions
import prepare_lichess_lesson_batches as batches


def main():
    parent=actions.ROOT/'runs/python-actions/csv-audit-checks'
    parent.mkdir(parents=True,exist_ok=True)
    root=parent/uuid4().hex
    root.mkdir()
    corpus=root/'corpus'
    corpus.mkdir()
    games=root/'games'
    games.mkdir()
    config={'schema':1,'paused':False,'paths':{'run':str(root/'placeholder'),
        'sourceManifest':str(corpus/'manifest.json'),'sourceAudit':str(root/'source-audit.json')},
        'pins':{},'state_file':str(root/'current.json'),'jobs':{},'artifacts':{},
        'preparation':{'order':['train','validation']}}
    outputs={}
    producer='.codebase/scripts/data/prepare-lichess-lessons.mjs'
    for split,game in [('train','abcd1234'),('validation','efgh5678')]:
        folder=games/split
        folder.mkdir()
        pgn=f'[GameId "{game}"]\n[Site "https://lichess.org/{game}"]\n\n1. e4 e5 2. Qh5 a6 *\n'
        (folder/(game+'.pgn')).write_text(pgn,encoding='utf-8')
        (folder/'response.pgn').write_text(pgn,encoding='utf-8')
        row={'schema':'lichess-puzzle-source-row-v1','puzzleId':split,
            'source':{'gameId':game,'gameUrl':f'https://lichess.org/{game}/black#4','puzzlePly':4},
            'initialFen':'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
            'setupMove':'a7a6','solverFen':'rnbqkbnr/1ppp1ppp/p7/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3',
            'solverColor':'w','solutionMoves':['h5e5']}
        rows=corpus/(split+'.jsonl')
        rows.write_text(json.dumps(row)+'\n',encoding='utf-8')
        outputs[split+'.jsonl']=actions.digest(rows)
        actions.atomic_json(folder/'manifest.json',{'sourceSplit':split,
            'sourceRows':{'sha256':actions.digest(rows)},'status':'complete-response-id-coverage-verified',
            'api':{'requestIds':[game],'responseSha256':actions.digest(folder/'response.pgn')},
            'games':{game+'.pgn':actions.digest(folder/(game+'.pgn'))}})
        config['jobs'][split]={'role':'check','argv':['node','--max-old-space-size=256',producer,
            '--rows',str(rows),'--games',str(folder),'--split',split,'--out','{run}/'+split,
            '--start-row','0','--row-limit','1','--cpu-duty','0.5','--max-seconds','30'],
            'fresh_output':'{run}/'+split}
    # Upstream source audit is a fixture assertion here; its real CSV audit is separately tested.
    actions.atomic_json(corpus/'manifest.json',{'outputs':outputs})
    source_auditor=actions.ROOT/'.codebase/scripts/data/audit-lichess-source-candidates.mjs'
    actions.atomic_json(root/'source-audit.json',{'schema':'lichess-source-candidate-audit-v1',
        'sourceChecksPassed':True,'manifestSha256':actions.digest(corpus/'manifest.json'),
        'finalSplitInspected':False,'checkedSplits':{'train':1,'validation':1},
        'auditor':{'path':str(source_auditor),'sha256':actions.digest(source_auditor)}})
    config['pins']={producer:actions.digest(actions.ROOT/producer)}
    path=root/'config.json'
    actions.atomic_json(path,config)
    with contextlib.redirect_stdout(io.StringIO()):
        assert batches.run(path,root/'prepared')==0
    auditor=actions.ROOT/'.codebase/scripts/data/audit-lichess-csv-lessons.mjs'
    argv=[shutil.which('node'),'--max-old-space-size=256',str(auditor),'--config',str(path),
        '--batches',str(root/'prepared'),'--corpus',str(corpus),'--source-audit',str(root/'source-audit.json'),
        '--games-root',str(games),'--max-seconds','60','--out',str(root/'audit.json')]
    def audit(ok):
        result=subprocess.run(argv,cwd=actions.ROOT,capture_output=True,text=True)
        assert (result.returncode==0)==ok,result.stdout+result.stderr
        assert (root/'audit.json').exists()==ok
    audit(True)
    report=actions.read_json(root/'audit.json')
    assert report['totals']['train']['rows']==1 and report['totals']['validation']['rows']==1
    assert report['sourceHistoryVerified'] and not report['eligibleForNeuralTeaching']
    (root/'audit.json').unlink()
    packpath=root/'prepared/manifest.json'
    pack=actions.read_json(packpath)
    entry=pack['completed'][0]
    manifest=Path(entry['manifest'])
    original_manifest=manifest.read_bytes()
    records=manifest.parent/'lessons.jsonl'
    original_records=records.read_bytes()
    def mutate(change):
        record=json.loads(original_records)
        change(record)
        records.write_text(json.dumps(record)+'\n',encoding='utf-8')
        m=json.loads(original_manifest)
        m['outputBytes']=records.stat().st_size
        m['outputSha256']=actions.digest(records)
        actions.atomic_json(manifest,m)
        entry['manifestSha256']=actions.digest(manifest)
        actions.atomic_json(packpath,pack)
        audit(False)
    mutate(lambda r:r['history'].__setitem__('setupPly',2))
    mutate(lambda r:r['lesson']['candidates'][0].__setitem__('status','success'))
    mutate(lambda r:r['lesson']['context'].__setitem__('fen',
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'))
    records.write_bytes(original_records)
    manifest.write_bytes(original_manifest)
    # Explicit train-only data has no exported validation games or PGN manifest.
    (corpus/'validation.jsonl').write_text('',encoding='utf-8')
    outputs['validation.jsonl']=actions.digest(corpus/'validation.jsonl')
    actions.atomic_json(corpus/'manifest.json',{'outputs':outputs,'curator':{'onlySplit':'train','requireMatchedCaptures':True}})
    upstream=actions.read_json(root/'source-audit.json')
    upstream['manifestSha256']=actions.digest(corpus/'manifest.json')
    upstream['checkedSplits']['validation']=0
    actions.atomic_json(root/'source-audit.json',upstream)
    (games/'validation/manifest.json').unlink()
    config['preparation']['order']=['train']
    del config['jobs']['validation']
    actions.atomic_json(path,config)
    with contextlib.redirect_stdout(io.StringIO()):
        assert batches.run(path,root/'train-only')==0
    argv[argv.index('--batches')+1]=str(root/'train-only')
    audit(True)
    report=actions.read_json(root/'audit.json')
    assert report['totals']['validation']=={'rows':0,'eligible':0,'unknownActions':0}
    assert report['totals']['train']['rows']==1 and not report['eligibleForNeuralTeaching']
    (root/'audit.json').unlink()
    actions.atomic_json(corpus/'manifest.json',{'outputs':outputs})
    upstream['manifestSha256']=actions.digest(corpus/'manifest.json')
    actions.atomic_json(root/'source-audit.json',upstream)
    audit(False)
    # A fully consistent legal history with no retained capture must fail the
    # declared comparison, even if the fixture's upstream source assertion lies.
    trainrow=json.loads((corpus/'train.jsonl').read_text())
    trainrow.update(setupMove='b8c6',solverFen='r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3',solutionMoves=['h5f7'])
    (corpus/'train.jsonl').write_text(json.dumps(trainrow)+'\n',encoding='utf-8')
    game=trainrow['source']['gameId'];folder=games/'train'
    pgn=f'[GameId "{game}"]\n[Site "https://lichess.org/{game}"]\n\n1. e4 e5 2. Qh5 Nc6 *\n'
    for name in [game+'.pgn','response.pgn']:(folder/name).write_text(pgn,encoding='utf-8')
    gm=actions.read_json(folder/'manifest.json')
    gm['sourceRows']['sha256']=actions.digest(corpus/'train.jsonl')
    gm['games'][game+'.pgn']=actions.digest(folder/(game+'.pgn'))
    gm['api']['responseSha256']=actions.digest(folder/'response.pgn')
    actions.atomic_json(folder/'manifest.json',gm)
    outputs['train.jsonl']=actions.digest(corpus/'train.jsonl')
    actions.atomic_json(corpus/'manifest.json',{'outputs':outputs,'curator':{'onlySplit':'train','requireMatchedCaptures':True}})
    upstream['manifestSha256']=actions.digest(corpus/'manifest.json')
    actions.atomic_json(root/'source-audit.json',upstream)
    with contextlib.redirect_stdout(io.StringIO()):
        assert batches.run(path,root/'nonmatching')==0
    argv[argv.index('--batches')+1]=str(root/'nonmatching')
    audit(False)
    assert root.resolve().is_relative_to(parent.resolve())
    shutil.rmtree(root)
    print(json.dumps({'tests':7,'passed':7,'scope':'Synthetic full/train-only CSV audits, rehashed history/consequence/FEN rejection, undeclared empty split and full-history matched-capture enforcement; no graph/network'}))


if __name__=='__main__':
    main()

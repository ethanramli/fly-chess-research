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
        pgn=f'[GameId "{game}"]\n[Site "https://lichess.org/{game}"]\n\n1. f3 e5 2. g4 *\n'
        (folder/(game+'.pgn')).write_text(pgn,encoding='utf-8')
        (folder/'response.pgn').write_text(pgn,encoding='utf-8')
        row={'schema':'lichess-puzzle-source-row-v1','puzzleId':split,
            'source':{'gameId':game,'gameUrl':f'https://lichess.org/{game}/white#1','puzzlePly':1},
            'initialFen':'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'setupMove':'f2f3','solverFen':'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
            'solverColor':'b','solutionMoves':['e7e5']}
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
    for job in config['jobs'].values():
        job['argv'].append('--stage1-only')
    actions.atomic_json(path,config)
    with contextlib.redirect_stdout(io.StringIO()):
        assert batches.run(path,root/'excluded')==0
    argv[argv.index('--batches')+1]=str(root/'excluded')
    audit(True)
    report=actions.read_json(root/'audit.json')
    assert report['totals']['train']=={'rows':1,'eligible':0,'unknownActions':0}
    (root/'audit.json').unlink()
    packpath=root/'excluded/manifest.json'
    pack=actions.read_json(packpath)
    entry=pack['completed'][0]
    manifest=Path(entry['manifest'])
    original_manifest=manifest.read_bytes()
    records=manifest.parent/'lessons.jsonl'
    original_records=records.read_bytes()
    mutate(lambda r:r['lesson'].__setitem__('pieceCount',6))
    assert root.resolve().is_relative_to(parent.resolve())
    shutil.rmtree(root)
    print(json.dumps({'tests':6,'passed':6,'scope':'Synthetic CSV audit acceptance and rehashed wrong history, consequence, displayed-FEN and piece-limit rejection; explicit domain exclusions; no graph/network'}))


if __name__=='__main__':
    main()

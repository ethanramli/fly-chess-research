"""Offline range/recovery/ownership checks; synthetic source records, no graph."""
import contextlib
import io
import json
import os
from pathlib import Path
import shutil
from uuid import uuid4

import curriculum as actions
import prepare_lichess_lesson_batches as batches


def main():
    parent = actions.ROOT/'runs/python-actions/lesson-batch-checks'
    parent.mkdir(parents=True,exist_ok=True)
    root = parent/uuid4().hex
    root.mkdir()
    games = root/'games'
    games.mkdir()
    (games/'abcd1234.pgn').write_text('1. f3 e5 2. g4')
    row = {'schema':'lichess-puzzle-source-row-v1',
           'source':{'gameId':'abcd1234','gameUrl':'https://lichess.org/abcd1234/white#1','puzzlePly':1},
           'initialFen':'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
           'setupMove':'f2f3','solverFen':'rnbqkbnr/pppppppp/8/8/8/5P2/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
           'solverColor':'b','solutionMoves':['e7e5']}
    rows = root/'rows.jsonl'
    rows.write_text(''.join(json.dumps({**row,'puzzleId':name})+'\n' for name in ['fixtureA','fixtureB']))
    producer='.codebase/scripts/data/prepare-lichess-lessons.mjs'
    config={'schema':1,'paused':False,'paths':{'run':str(root/'placeholder'),'rows':str(rows),'games':str(games)},
            'pins':{producer:actions.digest(actions.ROOT/producer),'{rows}':actions.digest(rows)},
            'state_file':str(root/'current.json'),'jobs':{},'artifacts':{},'preparation':{'order':['first','second']}}
    for index,name in enumerate(config['preparation']['order']):
        config['jobs'][name]={'role':'check','argv':['node','--max-old-space-size=256',producer,
            '--rows','{rows}','--games','{games}','--split','development','--out','{run}/'+name,
            '--start-row',str(index),'--row-limit','1','--cpu-duty','0.5','--max-seconds','30'],
            'fresh_output':'{run}/'+name}
    path=root/'config.json'
    actions.atomic_json(path,config)
    with contextlib.redirect_stdout(io.StringIO()):
        assert batches.run(path,root/'attempt1',stop_after=1)==0
    checkpoint=root/'attempt1/checkpoint.json'
    saved=actions.read_json(checkpoint)
    first=Path(saved['completed'][0]['manifest'])
    original=first.read_bytes()
    timestamp=first.stat().st_mtime_ns
    owner=next(p for p in actions.inventory()['processes'] if p['pid']==os.getpid())
    actions.atomic_json(checkpoint,{**saved,'phase':'preparing','pending':owner})
    try:
        batches.run(path,root/'blocked',checkpoint)
        raise AssertionError('Live owned preparation should block recovery')
    except ValueError as error:
        assert 'live or ownership is unknown' in str(error),str(error)
    assert not (root/'blocked').exists()
    actions.atomic_json(checkpoint,saved)
    with contextlib.redirect_stdout(io.StringIO()):
        assert batches.run(path,root/'attempt2',checkpoint)==0
    complete=actions.read_json(root/'attempt2/manifest.json')
    assert first.stat().st_mtime_ns==timestamp and first.read_bytes()==original
    assert [e['job'] for e in complete['completed']]==['first','second']
    ids=[]
    for entry in complete['completed']:
        m=actions.read_json(entry['manifest'])
        assert m['counts']['sourceRows']==1
        body=Path(entry['manifest']).parent/'lessons.jsonl'
        ids.extend(json.loads(line)['lesson']['puzzleId'] for line in body.read_text().splitlines())
    assert ids==['fixtureA','fixtureB']
    assert complete['graphLaunchAuthorized'] is False and complete['independentLessonAuditPassed'] is False
    first.write_bytes(original+b' ')
    try:
        batches.run(path,root/'tampered',checkpoint)
        raise AssertionError('Changed cached chunk must be rejected')
    except ValueError as error:
        assert 'Changed completed chunk manifest' in str(error),str(error)
    assert not (root/'tampered').exists()
    assert root.resolve().is_relative_to(parent.resolve())
    shutil.rmtree(root)
    print(json.dumps({'tests':3,'passed':3,'scope':'Synthetic chunk ranges, new-directory recovery/cache integrity and live-owner rejection; no network or graph'}))


if __name__=='__main__':
    main()

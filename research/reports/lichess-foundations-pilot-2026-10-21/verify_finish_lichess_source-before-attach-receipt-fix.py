"""Offline source-handoff mechanics; mocked process/audit, no engine or graph."""
import contextlib
import io
from pathlib import Path
import shutil
from unittest.mock import patch
from uuid import uuid4
import curriculum as actions
import finish_lichess_source as finish


def main():
    parent=actions.ROOT/'runs/python-actions/source-finish-checks';parent.mkdir(parents=True,exist_ok=True)
    root=parent/uuid4().hex;root.mkdir();run=root/'source';run.mkdir()
    (run/'manifest.json').write_text('{}')
    config={'schema':1,'name':'source-handoff-fixture','paused':False,'paths':{'run':str(run)},'pins':{},
        'state_file':str(root/'current.json'),'jobs':{
            'curate':{'role':'check','argv':['node','--max-old-space-size=256','.codebase/scripts/data/curate-lichess-puzzles.mjs']},
            'audit-source':{'role':'check','argv':['node','--max-old-space-size=256','.codebase/scripts/data/audit-lichess-source-candidates.mjs']}},
        'artifacts':{'sourceAudit':str(root/'audit.json')}}
    basepath=root/'base.json';actions.atomic_json(basepath,config);base=actions.load_config(basepath)
    observerpath=root/'observer.json';config['state_file']=str(root/'observer-state.json');actions.atomic_json(observerpath,config)
    observer=actions.load_config(observerpath)
    invocation=root/'invocation';invocation.mkdir()
    for file in ['stdout.txt','stderr.txt']:(invocation/file).write_text('')
    handle={'job':'curate','role':'check','run':str(run),'pid':123,'argv':actions.resolve_command(base,base['jobs']['curate']),
        'configHash':base['_hash'],'stdout':str(invocation/'stdout.txt'),'stderr':str(invocation/'stderr.txt'),'exitCode':None}
    handlepath=invocation/'handle.json';actions.atomic_json(handlepath,handle)
    actions.atomic_json(actions.state_path(observer),{**handle,'configHash':observer['_hash']})
    completion=invocation/'completion.json'
    def call(name):return finish.finish(basepath,observerpath,handlepath,root/name,wait_seconds=1,interval=1)
    def execute(*_args,**_kwargs):
        actions.atomic_json(root/'audit.json',{'sourceChecksPassed':True,'manifestSha256':actions.digest(run/'manifest.json'),
            'finalSplitInspected':False,'eligibleForNeuralTeaching':False,'checkedSplits':{'train':1,'validation':0}})
        return {'exitCode':0,'logs':{'stdout':'fixture','stderr':'fixture'}}
    def live_then_complete(*_args):
        actions.atomic_json(completion,{**handle,'exitCode':0});return {'state':'live'}
    with contextlib.redirect_stdout(io.StringIO()):
        with patch.object(actions,'status',side_effect=live_then_complete),patch.object(actions,'execute',side_effect=execute) as start,patch.object(finish.time,'sleep'):
            assert call('success')==0;assert start.call_count==1
        assert actions.read_json(root/'success/state.json')['phase']=='complete'
        actions.atomic_json(completion,{**handle,'exitCode':1})
        with patch.object(actions,'execute') as start:
            assert call('failed-source')==1;start.assert_not_called()
        actions.atomic_json(completion,{**handle,'exitCode':0,'pid':124})
        with patch.object(actions,'execute') as start:
            try:call('wrong-invocation');raise AssertionError('Wrong receipt accepted')
            except ValueError as error:assert 'another invocation' in str(error)
            start.assert_not_called()
        completion.unlink()
        with patch.object(actions,'status',return_value={'state':'unknown'}),patch.object(actions,'execute') as start:
            try:call('unknown-owner');raise AssertionError('Unknown owner accepted')
            except ValueError as error:assert 'ownership unknown' in str(error)
            start.assert_not_called()
        with patch.object(finish.time,'monotonic',side_effect=[0,2]),patch.object(actions,'execute') as start:
            assert call('timeout')==2;start.assert_not_called()
    assert actions.read_json(root/'timeout/state.json')['phase']=='observation-expired'
    assert actions.read_json(handlepath)==handle
    assert root.resolve().is_relative_to(parent.resolve());shutil.rmtree(root)
    actions.emit({'tests':5,'passed':5,'scope':'Mocked clean/failing/forged source completion, unknown ownership and bounded wait; no actual source audit, restart or graph.'})


if __name__=='__main__':main()

"""Observe an already attached source job, then run its registered data audit once."""
import argparse
import json
from pathlib import Path
import time

import curriculum as actions


def finish(config_path,observer_path,source_handle,out,wait_seconds=7200,interval=30):
    if not 1<=wait_seconds<=7500 or not 1<=interval<=60:
        raise ValueError('Invalid bounded observation window')
    base=actions.load_config(config_path)
    observer=actions.load_config(observer_path)
    original=actions.read_json(actions.local(source_handle))
    attached=actions.read_json(actions.state_path(observer))
    expected=actions.resolve_command(base,base['jobs']['curate'])
    if (base['paused'] or observer['paused'] or original['argv']!=expected
            or attached['argv']!=expected or original['pid']!=attached['pid']
            or original['configHash']!=base['_hash'] or attached['configHash']!=observer['_hash']
            or actions.local(base['paths']['run'])!=actions.local(observer['paths']['run'])):
        raise ValueError('Source/observer registration mismatch')
    audit=base['jobs']['audit-source']
    audit_argv=actions.resolve_command(base,audit)
    if (audit['role']!='check' or Path(audit_argv[2]).resolve()!=actions.local('.codebase/scripts/data/audit-lichess-source-candidates.mjs')):
        raise ValueError('Only the existing independent source-data audit is permitted')
    out=actions.local(out)
    out.mkdir(parents=True,exist_ok=False)
    state={'schema':'lichess-source-completion-v1','phase':'waiting','sourcePid':original['pid'],
        'sourceRun':str(actions.local(base['paths']['run'])),'configSha256':base['_hash'],
        'observerSha256':observer['_hash'],'sourceHandleSha256':actions.digest(source_handle),
        'graphLaunchAuthorized':False,'neuralEventsDelivered':0}
    def save(phase,**fields):
        state.update(phase=phase,**fields)
        actions.atomic_json(out/'state.json',state)
        actions.emit({'phase':phase,**fields,'graphLaunchAuthorized':False})
    completion=actions.local(source_handle).parent/'completion.json'
    started=time.monotonic();missing_since=None;previous=None
    save('waiting',scope='No source restart; audit only after acknowledged clean completion.')
    try:
        while not completion.exists():
            if actions.digest(base['_path'])!=base['_hash'] or actions.digest(observer['_path'])!=observer['_hash']:
                raise ValueError('Observation registration changed')
            if time.monotonic()-started>=wait_seconds:
                save('observation-expired',scope='Source job left untouched; no audit or restart.')
                return 2
            sample=actions.status(observer)
            if sample['state'] not in ('live','missing'):
                raise ValueError('Source ownership unknown or changed: '+sample['state'])
            if sample['state']=='missing':
                missing_since=missing_since or time.monotonic()
                if time.monotonic()-missing_since>=30:
                    raise ValueError('Source process missing without acknowledged completion')
            else:
                missing_since=None
            progress=None
            for line in reversed(actions.tail(original['stdout'],8192).splitlines()):
                try:row=json.loads(line)
                except ValueError:continue
                if isinstance(row,dict) and row.get('progress')=='source-scan':
                    progress={k:row[k] for k in ('linesRead','sourceRows','legalLines','rejected','elapsedSeconds') if k in row}
                    break
            if progress!=previous:
                save('waiting',progress=progress);previous=progress
            time.sleep(min(interval,max(0.01,wait_seconds-(time.monotonic()-started))))
        receipt=actions.read_json(completion)
        if any(receipt[k]!=original[k] for k in ('pid','argv','configHash','run','job','role')):
            raise ValueError('Completion receipt belongs to another invocation')
        state['completionSha256']=actions.digest(completion)
        if receipt['exitCode']!=0:
            save('source-failed',exitCode=receipt['exitCode'],scope='Failed source output preserved; no audit or restart.')
            return receipt['exitCode'] or 2
        manifest=actions.local(base['paths']['run'])/'manifest.json'
        if not manifest.is_file():
            raise ValueError('Clean exit has no complete source manifest')
        state['manifestSha256']=actions.digest(manifest)
        save('auditing',scope='Starting only the unchanged registered independent source audit.')
        result=actions.execute(base,'audit-source',foreground=True)
        state['auditInvocation']=result
        if result['exitCode']!=0:
            save('audit-failed',exitCode=result['exitCode'],logs=result['logs'])
            return result['exitCode'] or 2
        path=actions.local(actions.expand(base,base['artifacts']['sourceAudit']))
        report=actions.read_json(path)
        if (report.get('sourceChecksPassed') is not True or report['manifestSha256']!=state['manifestSha256']
                or report.get('finalSplitInspected') is not False or report.get('eligibleForNeuralTeaching') is not False):
            raise ValueError('Independent source audit binding/scope failed')
        save('complete',sourceAuditSha256=actions.digest(path),checkedSplits=report['checkedSplits'],
            scope='Candidate provenance only; no PGN fetch, graph, training, family or reasoning acceptance.')
        return 0
    except Exception as error:
        save('stopped',error=str(error),scope='No automatic retry/restart; preserve source and audit evidence.')
        raise


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for key in ('config','observer','source-handle','out'):p.add_argument('--'+key,required=True)
    p.add_argument('--wait-seconds',type=int,default=7200)
    p.add_argument('--interval',type=int,default=30)
    args=p.parse_args()
    try:
        raise SystemExit(finish(args.config,args.observer,args.source_handle,args.out,args.wait_seconds,args.interval))
    except (OSError,ValueError,KeyError,RuntimeError) as error:
        actions.emit({'actionError':str(error),'scope':'No source restart or neural event'})
        raise SystemExit(2)

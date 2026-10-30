"""Compact read-only status of a serial teacher-preparation checkpoint."""
import argparse
from pathlib import Path

import curriculum as actions


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checkpoint',required=True)
    args=parser.parse_args()
    path=actions.local(args.checkpoint)
    if path.stat().st_size>16*1024*1024:
        raise ValueError('Oversized preparation checkpoint')
    state=actions.read_json(path)
    if state.get('schema')!='lichess-preparation-batches-v1':
        raise ValueError('Unsupported preparation checkpoint')
    pending=state.get('pending')
    live=actions.inventory() if pending else None
    owner,process=actions.matching_process(pending,live) if pending else (None,None)
    completed=state['completed']
    if not isinstance(completed,list) or len(completed)>128:
        raise ValueError('Invalid completed chunk bound')
    actions.emit({'phase':state['phase'],'completedChunks':len(completed),
        'preparedRows':sum(e['counts']['prepared'] for e in completed),
        'producerDomainEligible':sum(e['counts']['stage1DomainEligible'] for e in completed),
        'pendingJob':pending.get('job') if pending else None,'owner':owner,
        'pid':pending.get('pid') if pending else None,
        'cpuSeconds':process.get('cpuSeconds') if process else None,
        'workingSetMiB':process.get('workingSetMiB') if process else None,
        'stderrTail':actions.tail(pending['stderr'],1024) if pending else None,
        'failure':state.get('failure'),'completeManifestExists':(path.parent/'manifest.json').is_file(),
        'scope':'Observed owner and preparation publications only; no independent audit, teaching permission or learning result.'})


if __name__=='__main__':
    try:
        main()
    except (OSError,ValueError,KeyError,TypeError) as error:
        actions.emit({'actionError':str(error),'scope':'Read-only; no restart'})
        raise SystemExit(2)

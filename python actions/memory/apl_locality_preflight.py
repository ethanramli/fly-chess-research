"""Inventory retained APL/KC anatomy without running the neural graph."""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path
import sys
import os
import time
from collections import Counter

import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'research/reports/apl-locality-feasibility-2026-11-01'
GRAPH = ROOT / '.cache/full.npz'
ANNOTATIONS = ROOT / '.cache/flywire-annotations-v2.1.0.tsv'
CODEX = ROOT / '.cache/flywire-codex-783-verify'


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def atomic(path, value):
    temporary = path.with_suffix(path.suffix + '.partial')
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    temporary.replace(path)


def post_indices(ptr, edges):
    return np.searchsorted(ptr, edges, side='right') - 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        ptr = np.array([0, 0, 2, 2, 3], dtype=np.int32)
        assert post_indices(ptr, np.array([0, 1, 2])).tolist() == [1, 1, 3]
        print(json.dumps({'status': 'self-test-passed', 'checks': 1}))
        return
    assert args.out
    out = args.out.resolve()
    assert out.is_relative_to(ROOT) and not out.exists(), 'Require fresh workspace output'
    files = [GRAPH, ANNOTATIONS, CODEX/'classification.csv.gz', CODEX/'consolidated_cell_types.csv.gz', CODEX/'connections.csv.gz',
             ROOT/'.cache/upstream/provenance.json', ROOT/'research/literature/cesp99-retina-2026-10-28/flychess/connectome/load.py',
             REPORT/'static-preflight-spec.md', Path(__file__), ROOT/'python actions/curriculum.py']
    pins = {str(p.relative_to(ROOT)): digest(p) for p in files}
    assert pins['.cache/full.npz'] == '4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2'
    started, resources = time.monotonic(), []

    def guard(measure=False):
        assert time.monotonic() - started <= 180, 'Elapsed guard'
        if measure:
            state = curriculum.inventory()
            own = next(p for p in state['processes'] if p['pid'] == os.getpid())
            assert own['workingSetMiB'] <= 2048 and state['freeMiB'] >= 256, 'Memory guard'
            resources.append({'rssMiB': own['workingSetMiB'], 'freeMiB': state['freeMiB']})

    guard(True); out.mkdir(parents=True)
    manifest = {'schema': 'apl-locality-static-v1', 'status': 'running', 'pins': pins, 'numpy': np.__version__,
                'limits': {'wallSeconds': 180, 'rssMiB': 2048, 'freeMiB': 256}, 'graphPasses': 0}
    atomic(out/'manifest.json', manifest)
    try:
        with np.load(GRAPH, allow_pickle=False) as z:
            members = z.files
            roots, ptr, pre, weights, signs, positions = [z[k] for k in ['root_ids', 'csr_indptr', 'csr_indices', 'syn_count', 'sign', 'position']]
        root_to_index = {str(int(r)): i for i, r in enumerate(roots)}
        assert len(root_to_index) == len(roots) and len(ptr) == len(roots)+1
        annotations = {}
        with ANNOTATIONS.open(encoding='utf-8', newline='') as stream:
            for row in csv.DictReader(stream, delimiter='\t'):
                if row['root_id'] in root_to_index and (row['cell_class'] == 'Kenyon_Cell' or row['hemibrain_type'] == 'APL'):
                    assert row['root_id'] not in annotations
                    annotations[row['root_id']] = row
        apl = sorted(root_to_index[r] for r, a in annotations.items() if a['hemibrain_type'] == 'APL')
        assert len(apl) == 2
        kc = {root_to_index[r] for r, a in annotations.items() if a['cell_class'] == 'Kenyon_Cell'}
        edges = set(np.flatnonzero(np.isin(pre, apl)).tolist())
        for i in apl:
            edges.update(range(int(ptr[i]), int(ptr[i+1])))
        edges = np.array(sorted(edges), dtype=np.int32)
        posts = post_indices(ptr, edges)
        retained, expected = [], {}
        for e, post in zip(edges.tolist(), posts.tolist(), strict=True):
            source = int(pre[e])
            if not ((source in apl and post in kc) or (source in kc and post in apl)):
                continue
            pre_root, post_root = str(int(roots[source])), str(int(roots[post]))
            assert int(signs[e]) == (-1 if source in apl else 1), 'Do not alter unexpected signs'
            pair = (pre_root, post_root)
            assert pair not in expected
            expected[pair] = int(weights[e])
            assert float(weights[e]) == expected[pair]
            retained.append({'edge': e, 'preIndex': source, 'postIndex': post, 'preRoot': pre_root, 'postRoot': post_root,
                             'direction': 'APL-to-KC' if source in apl else 'KC-to-APL', 'synapseCount': expected[pair], 'sign': int(signs[e]),
                             'kcType': annotations[post_root if source in apl else pre_root]['hemibrain_type']})
        guard(True)
        observed = Counter()
        source_rows = 0
        with gzip.open(CODEX/'connections.csv.gz', 'rt', encoding='utf-8-sig', newline='') as stream:
            for row in csv.DictReader(stream):
                source_rows += 1
                if source_rows % 100000 == 0: guard()
                pair = row['pre_root_id'], row['post_root_id']
                if pair in expected: observed[pair] += int(row['syn_count'])
        mismatches = [{'preRoot': a, 'postRoot': b, 'graph': n, 'source': observed[(a,b)]} for (a,b), n in expected.items() if observed[(a,b)] != n]
        assert not mismatches, 'Aggregate source mismatch'
        primary_types, classification = {}, {}
        relevant = {str(int(roots[i])) for i in apl}
        for filename, target in [('consolidated_cell_types.csv.gz', primary_types), ('classification.csv.gz', classification)]:
            with gzip.open(CODEX/filename, 'rt', encoding='utf-8-sig', newline='') as stream:
                for row in csv.DictReader(stream):
                    if row['root_id'] in relevant: target[row['root_id']] = row
            assert set(target) == relevant
        neurons = []
        for i in apl:
            root = str(int(roots[i])); row = annotations[root]
            p = positions[i]
            neurons.append({'index': i, 'root': root, 'annotationType': row['hemibrain_type'], 'side': row['side'], 'knownNt': row['known_nt'],
                            'codexPrimaryType': primary_types[root], 'codexClassification': classification[root],
                            'perNeuronPositionNm': [float(x) if np.isfinite(x) else None for x in p],
                            'inputKcEdges': sum(r['postIndex']==i for r in retained), 'outputKcEdges': sum(r['preIndex']==i for r in retained)})
        with (out/'retained-kc-apl-edges.jsonl').open('x', encoding='utf-8') as stream:
            for row in retained: stream.write(json.dumps(row, separators=(',', ':'))+'\n')
        guard(True)
        for p,h in pins.items(): assert digest(ROOT/p) == h, f'Input changed {p}'
        result = {'schema': manifest['schema'], 'status': 'complete', 'scope': 'static aggregate connectivity only; no subcellular distances, neural propagation, plasticity or memory result',
                  'graphNodes': len(roots), 'graphEdges': len(pre), 'archiveMembers': members, 'perNeuronPositionShape': list(positions.shape),
                  'apl': neurons, 'retainedPairs': len(retained), 'sourceRowsRead': source_rows, 'sourcePairsMatched': len(expected), 'mismatches': mismatches,
                  'byDirection': dict(Counter(r['direction'] for r in retained)), 'resources': resources, 'elapsedSeconds': time.monotonic()-started, 'graphPasses': 0,
                  'geometryInputsStillRequired': ['same-release APL skeleton in physical units', 'pre/post synaptic contact positions and count conventions', 'audited contact-to-arbor mapping and retained-root-pair coverage']}
        atomic(out/'result.json', result)
        atomic(out/'manifest.json', {**manifest, 'status':'complete','resultSha256':digest(out/'result.json'),'edgesSha256':digest(out/'retained-kc-apl-edges.jsonl')})
        print(json.dumps({'status':'complete','retainedPairs':len(retained),'sourcePairsMatched':len(expected),'apl':neurons,'out':str(out),'elapsedSeconds':result['elapsedSeconds']}))
    except Exception as exc:
        atomic(out/'manifest.json', {**manifest,'status':'failed','error':str(exc)})
        raise


if __name__ == '__main__':
    main()

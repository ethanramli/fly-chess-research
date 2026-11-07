"""Compile frozen APL contact projections into subdivided parent trees.

Offline and bounded: reads preserved attachment projections, the pinned graph, annotations and skeletons.
No graph propagation, learning, downloads, contact extraction or old main() call.
Not implemented: the second-nearest-branch alternate projection (no package for that geometry).
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

import curriculum
from apl_contact_geometry import Skeleton

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'runs/memory-retention-2026-11-01'
REPORT = ROOT / 'research/reports/apl-locality-feasibility-2026-11-01'
SCHEMA = 'fly-apl-sites-v1-package'
MANIFEST_SCHEMA = 'fly-apl-sites-v1-compile'
VOLUME, CHAPTER = '2', 'To Learn; Evidence for Learning'
GEOMETRIES = ('midpoint', 'canonical-stress')
HEADER = ['source_row', 'pre_root_id', 'post_root_id', 'apl_root', 'skeleton_edge', 'fraction', 'residual_nm']
MAP_HEADER = ['source_row', 'apl_root', 'apl_slot', 'direction', 'pre_root_id', 'post_root_id', 'graph_edge', 'kc_node_index',
              'skeleton_edge', 'fraction', 'residual_nm', 'tree_site', 'midpoint_skeleton_edge', 'midpoint_fraction', 'geometry_source']
KEYS = ('parent', 'lengthNm', 'inputSite', 'inputKC', 'inputEdge', 'outputSite', 'outputKC', 'outputEdge')
SCOPE = ('Numerical APL-side contact sites on frozen v783 skeletons. No graph propagation, learning, '
         'exact-anatomy claim, or second-branch stress geometry.')
NOT_IMPLEMENTED = ['second-nearest-branch alternate projection: not compiled, no package produced']
PROVENANCE = {'sourceAttachment': 'apl-contact-attachment-v1 read as preserved output; its contact extraction and main() were not rerun',
              'pinnedIdentities': 'graph, annotations, skeletons, projections and result are checked against pins; helper-code hashes are recorded only',
              'graphPasses': 0}

PRODUCTION = {
    'graph': ROOT / '.cache/full.npz',
    'annotations': ROOT / '.cache/flywire-annotations-v2.1.0.tsv',
    'projections': BASE / 'apl-contact-attachment-v1/projections.csv',
    'attachmentManifest': BASE / 'apl-contact-attachment-v1/manifest.json',
    'attachmentResult': BASE / 'apl-contact-attachment-v1/result.json',
    'apls': [
        {'root': '720575940613583001', 'side': 'right', 'skeleton': REPORT / 'source-evidence/apl-right-720575940613583001.precomputed'},
        {'root': '720575940624547622', 'side': 'left', 'skeleton': REPORT / 'source-evidence/apl-left-720575940624547622.precomputed'},
    ],
    'pins': {
        'graph': '4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2',
        'annotations': '30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6',
        'skeleton:720575940613583001': '7c4257602da0b3cda3c23192ffb26f70623bb5a84dd3919ec44dc10e9fb7bcfc',
        'skeleton:720575940624547622': '8d7822018308ffa96361171d2eab49909f9611142197712d5a23da1925e82399',
        'projections': '248d50122a87c415e60530754d0e5a8b53a235c10a9fbe475035c6598f799949',
        'attachmentResult': 'ba6d5347d0ba178e7dda846b6b2862e53ea52f889a727ddf2660216af618f460',
    },
    'expectedPairs': 10343, 'expectedContacts': 215419, 'expectedCanonical': 126,
}


class CompileError(ValueError):
    pass


def need(condition, message):
    if not condition:
        raise CompileError(message)


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def jsonable(value):
    if isinstance(value, np.generic):
        return value.item()
    raise TypeError(f'not JSON serialisable: {type(value).__name__}')


def write_json(path, value):
    partial = path.with_name(path.name + '.partial')
    partial.write_text(json.dumps(value, indent=2, allow_nan=False, default=jsonable) + '\n', encoding='utf-8')
    partial.replace(path)


def publish(partial):
    # Atomic on one filesystem; a failed run leaves the .partial file in place.
    return Path(partial).replace(Path(partial).with_suffix(''))


def emit(stream, record):
    stream.write(json.dumps(record, sort_keys=True, allow_nan=False, default=jsonable, separators=(',', ':')) + '\n')


def observe_process():
    state = curriculum.inventory()
    own = next((p for p in state['processes'] if p['pid'] == os.getpid()), {})
    return own.get('workingSetMiB'), state['freeMiB']


def dependencies():
    here = Path(__file__).resolve().parent
    return {'python': sys.version.split()[0], 'numpy': np.__version__, 'compiler': sha(Path(__file__)),
            'skeletonReader': sha(here / 'apl_contact_geometry.py'), 'inventoryObserver': sha(here / 'curriculum.py')}


def canonical_int(text, label):
    try:
        value = int(text)
    except (TypeError, ValueError):
        raise CompileError(f'{label} is not an integer: {text!r}') from None
    need(str(value) == text, f'{label} is not canonical: {text!r}')
    return value


def to_float(text, label):
    try:
        value = float(text)
    except (TypeError, ValueError):
        raise CompileError(f'{label} is not a number: {text!r}') from None
    need(math.isfinite(value), f'{label} is not finite: {text!r}')
    return value


def build_tree(vertices, edges, edge_ids, fractions):
    """Subdivided tree rooted at skeleton vertex 0, parents before children, lengths in nm (float64).

    Every skeleton edge is cut at each distinct interior fraction (fraction measured from edges[k,0]).
    Fractions 0 and 1 reuse the original vertices; identical (edge, fraction) pairs share one node.
    """
    vertices = np.asarray(vertices, dtype=np.float64)
    edges = np.asarray(edges, dtype=np.int64).reshape(-1, 2)
    n, m = len(vertices), len(edges)
    need(n >= 1 and bool(np.isfinite(vertices).all()), 'skeleton vertices are empty or nonfinite')
    need(m == n - 1, f'skeleton is not a tree: {n} vertices, {m} edges')
    need(m == 0 or (int(edges.min()) >= 0 and int(edges.max()) < n), 'skeleton edge endpoint out of range')
    edge_ids = np.asarray(edge_ids, dtype=np.int64)
    fractions = np.asarray(fractions, dtype=np.float64)
    need(bool(np.isfinite(fractions).all()) and bool(((fractions >= 0) & (fractions <= 1)).all()),
         'fraction outside [0,1] or nonfinite')
    need(bool(((edge_ids >= 0) & (edge_ids < m)).all()), 'skeleton edge out of range')
    a, b = edges[:, 0], edges[:, 1]
    length = np.sqrt(((vertices[b] - vertices[a]) ** 2).sum(axis=1))

    interior = np.flatnonzero((fractions > 0) & (fractions < 1))
    order = interior[np.lexsort((fractions[interior], edge_ids[interior]))]
    ke, kf = edge_ids[order], fractions[order]
    new = np.ones(len(order), dtype=bool)
    new[1:] = (ke[1:] != ke[:-1]) | (kf[1:] != kf[:-1])
    S = int(new.sum())
    need(n + S < 2 ** 31 - 1, 'too many tree nodes for int32 indices')
    uid = np.cumsum(new, dtype=np.int64) - 1
    site_node = np.where(fractions <= 0, a[edge_ids], b[edge_ids]).astype(np.int64)
    site_node[order] = n + uid
    U_edge, U_frac = ke[new], kf[new]

    # Chain links: previous node on the same edge (or the start vertex) to each interior node, then the last node to the end vertex.
    same = np.zeros(S, dtype=bool)
    same[1:] = U_edge[1:] == U_edge[:-1]
    prev_node = np.where(same, n + np.arange(S, dtype=np.int64) - 1, a[U_edge])
    prev_frac = np.zeros(S)
    prev_frac[1:] = U_frac[:-1]
    prev_frac[~same] = 0.0
    link = (U_frac - prev_frac) * length[U_edge]
    last = np.full(m, -1, dtype=np.int64)
    np.maximum.at(last, U_edge, np.arange(S, dtype=np.int64))
    has = last >= 0
    last_node = a.copy()
    last_node[has] = n + last[has]
    last_frac = np.zeros(m)
    last_frac[has] = U_frac[last[has]]
    tail = (1.0 - last_frac) * length
    N = n + S
    left = np.concatenate([prev_node, last_node])
    right = np.concatenate([n + np.arange(S, dtype=np.int64), b])
    weight = np.concatenate([link, tail])

    # ponytail: plain-list BFS is fine for ~1e5 nodes per APL; numpy CSR holds the adjacency.
    src = np.concatenate([left, right])
    perm = np.argsort(src, kind='stable')
    indptr = np.zeros(N + 1, dtype=np.int64)
    indptr[1:] = np.cumsum(np.bincount(src, minlength=N))
    neighbour = np.concatenate([right, left])[perm].tolist()
    edge_length = np.concatenate([weight, weight])[perm].tolist()
    indptr = indptr.tolist()
    parent, plen, queue = [-2] * N, [0.0] * N, [0]
    parent[0] = -1
    for u in queue:
        for j in range(indptr[u], indptr[u + 1]):
            v = neighbour[j]
            if parent[v] == -2:
                parent[v] = u
                plen[v] = edge_length[j]
                queue.append(v)
    need(len(queue) == N, 'skeleton is disconnected')

    ids = np.asarray(queue, dtype=np.int64)
    pos = np.empty(N, dtype=np.int64)
    pos[ids] = np.arange(N, dtype=np.int64)
    par = np.asarray(parent, dtype=np.int64)[ids]
    parent_new = np.where(par >= 0, pos[np.maximum(par, 0)], -1)
    need(int(parent_new[0]) == -1 and bool((parent_new[1:] < np.arange(1, N)).all()), 'tree is not parent-ordered')
    length64 = np.asarray(plen, dtype=np.float64)[ids]
    total, tree_total = float(length.sum()), float(length64.sum())
    need(abs(tree_total - total) <= 1e-9 * max(1.0, total), 'subdivided lengths do not reconcile with the skeleton')
    return {'parent': parent_new.astype(np.int32), 'length64': length64, 'lengthNm': length64.astype(np.float32),
            'site': pos[site_node].astype(np.int32), 'nodes': N, 'subdivisionSites': S,
            'skeletonLengthSumNm': total, 'treeLengthSumNm': tree_total}


def load_graph(graph_path, annotations_path, apls, expected_pairs):
    """Retained ordered KC/APL pairs of the pinned graph, with annotated KC indices.

    Two APL numberings, kept apart: pairs['apl'] is the APL slot (position in the declared list, names the a{slot}_ arrays);
    apl_nodes[slot] is that APL's neuron index in the graph (written as package apls[].index).
    """
    with np.load(graph_path, allow_pickle=False) as archive:
        roots, ptr, col, syn, sign = [archive[key] for key in ('root_ids', 'csr_indptr', 'csr_indices', 'syn_count', 'sign')]
    n = len(roots)
    ptr = ptr.astype(np.int64)
    need(roots.ndim == 1 and roots.dtype == np.int64, 'root_ids must be one-dimensional int64')
    need(ptr.ndim == 1 and len(ptr) == n + 1 and int(ptr[0]) == 0 and int(ptr[-1]) == len(col) and bool((np.diff(ptr) >= 0).all()),
         'invalid CSR offsets')
    need(len(syn) == len(col) == len(sign), 'edge arrays disagree in length')
    need(n < 2 ** 31 - 1 and len(col) < 2 ** 31 - 1, 'graph too large for int32 indices')
    need(len(col) == 0 or (int(col.min()) >= 0 and int(col.max()) < n), 'CSR index out of range')
    need(bool((np.abs(sign.astype(np.int64)) == 1).all()), 'sign must be +1 or -1')
    names = [str(int(r)) for r in roots]
    index = {name: i for i, name in enumerate(names)}
    need(len(index) == n, 'duplicate root IDs in graph')

    annotated = {}
    with annotations_path.open(encoding='utf-8', newline='') as stream:
        for row in csv.DictReader(stream, delimiter='\t'):
            if row['root_id'] in index and (row['cell_class'] == 'Kenyon_Cell' or row['hemibrain_type'] == 'APL'):
                need(row['root_id'] not in annotated, f"duplicate annotation for root {row['root_id']}")
                annotated[row['root_id']] = row
    kc = np.array(sorted(index[r] for r, row in annotated.items() if row['cell_class'] == 'Kenyon_Cell'), dtype=np.int64)
    declared = [spec['root'] for spec in apls]
    need({r for r, row in annotated.items() if row['hemibrain_type'] == 'APL'} == set(declared),
         'annotated APL roots differ from the declared APL roots')
    apl_nodes = []
    for spec in apls:
        need(annotated[spec['root']]['side'] == spec['side'], f"APL {spec['root']} annotated side differs from {spec['side']}")
        apl_nodes.append(index[spec['root']])
    is_apl, is_kc = np.zeros(n, dtype=bool), np.zeros(n, dtype=bool)
    is_apl[apl_nodes] = True
    is_kc[kc] = True
    need(not (is_apl & is_kc).any(), 'an APL root is annotated as Kenyon_Cell')

    # Edges whose post row is an APL, plus edges whose pre is an APL; then keep only KC/APL pairs.
    candidates = np.unique(np.concatenate([np.arange(ptr[i], ptr[i + 1], dtype=np.int64) for i in apl_nodes]
                                          + [np.flatnonzero(is_apl[col]).astype(np.int64)]))
    pre = col[candidates].astype(np.int64)
    post = np.searchsorted(ptr, candidates, side='right').astype(np.int64) - 1
    keep = (is_apl[pre] & is_kc[post]) | (is_kc[pre] & is_apl[post])
    edge, pre, post = candidates[keep], pre[keep], post[keep]
    need(len(edge) > 0, 'no retained KC/APL edges')
    output = is_apl[pre]
    need(bool(np.array_equal(sign[edge].astype(np.int64), np.where(output, -1, 1))),
         'retained KC/APL sign differs from the fixed convention (APL->KC -1, KC->APL +1)')
    syn_edge = syn[edge].astype(np.int64)
    need(bool((syn_edge >= 1).all()), 'retained KC/APL edge has no anatomical contacts')
    need(len(np.unique(pre * n + post)) == len(edge), 'duplicate retained ordered pair')
    need(expected_pairs is None or len(edge) == expected_pairs, f'retained pairs {len(edge)} != expected {expected_pairs}')
    node_apl = {node: k for k, node in enumerate(apl_nodes)}
    apl_slot = np.array([node_apl[x] for x in np.where(output, pre, post).tolist()], dtype=np.int64)
    lookup = {(names[p], names[q]): j for j, (p, q) in enumerate(zip(pre.tolist(), post.tolist()))}
    return {'names': names, 'kc': kc, 'apl_nodes': apl_nodes, 'lookup': lookup,
            'pairs': {'edge': edge, 'pre': pre, 'post': post, 'syn': syn_edge, 'output': output, 'apl': apl_slot}}


def read_projections(path, graph, apl_roots, edge_counts, total, tick):
    """One array entry per physical contact; rejects any row not bound to a retained pair."""
    source = np.zeros(total, dtype=np.int64)
    pair, edge = np.zeros(total, dtype=np.int64), np.zeros(total, dtype=np.int64)
    frac, resid = np.zeros(total), np.zeros(total)
    apl_of_pair = graph['pairs']['apl']
    count = 0
    with path.open(newline='', encoding='utf-8') as stream:
        reader = csv.reader(stream)
        need(next(reader, None) == HEADER, 'projection header differs from the contract')
        for row in reader:
            need(count < total, f'projection file has more rows than the retained syn_count total {total}')
            need(len(row) == 7, f'projection row {count + 2} has {len(row)} fields')
            j = graph['lookup'].get((row[1], row[2]))
            need(j is not None, f'row {row[0]}: root pair {row[1]}->{row[2]} is not a retained KC/APL pair')
            k = int(apl_of_pair[j])
            need(row[3] == apl_roots[k], f'row {row[0]}: apl_root {row[3]} differs from the pair APL {apl_roots[k]}')
            edge_id = canonical_int(row[4], 'skeleton_edge')
            need(0 <= edge_id < edge_counts[k], f'row {row[0]}: skeleton_edge {edge_id} outside APL {apl_roots[k]}')
            value = to_float(row[5], 'fraction')
            need(0 <= value <= 1, f'row {row[0]}: fraction {value} outside [0,1]')
            residual = to_float(row[6], 'residual_nm')
            need(residual >= 0, f'row {row[0]}: residual_nm {residual} is negative')
            source[count] = canonical_int(row[0], 'source_row')
            pair[count], edge[count], frac[count], resid[count] = j, edge_id, value, residual
            count += 1
            if count % 8192 == 0:
                tick()
    need(count == total, f'missing contacts: {count} rows for {total} retained syn_count contacts')
    need(len(np.unique(source)) == total, 'duplicate source_row in projections')
    return source, pair, edge, frac, resid


def apply_canonical(sample, graph, apl_roots, edge_counts, source, pair, edge, frac, resid, replaced, expected):
    """Replace the midpoint APL-side site of each sampled contact; every other contact is untouched."""
    need(isinstance(sample, list) and len(sample) == expected, f'canonical sample has {len(sample) if isinstance(sample, list) else "no"} records, expected {expected}')
    order = np.argsort(source, kind='stable')
    sorted_source = source[order]
    seen, records = set(), []
    for record in sample:
        sr = record['sourceRow']
        need(type(sr) is int, f'canonical sourceRow is not an integer: {sr!r}')
        need(sr not in seen, f'duplicate canonical sourceRow {sr}')
        seen.add(sr)
        pos = int(np.searchsorted(sorted_source, sr))
        need(pos < len(sorted_source) and int(sorted_source[pos]) == sr, f'canonical sourceRow {sr} is absent from projections')
        i = int(order[pos])
        j = int(pair[i])
        k = int(graph['pairs']['apl'][j])
        output = bool(graph['pairs']['output'][j])
        need(record['aplRoot'] == apl_roots[k], f'canonical {sr}: aplRoot {record["aplRoot"]} differs from the row binding')
        need(record['direction'] == ('APL-to-KC' if output else 'KC-to-APL'), f'canonical {sr}: direction differs from the row binding')
        mid_edge, mid_t, mid_r = record['midpointProjection']
        need(int(mid_edge) == int(edge[i]) and abs(mid_t - frac[i]) <= 1e-9 and abs(mid_r - resid[i]) <= 1e-9,
             f'canonical {sr}: midpoint differs from its projection row')
        new_edge, new_t, new_r = record['aplSideProjection']
        need(type(new_edge) is int and 0 <= new_edge < edge_counts[k], f'canonical {sr}: APL-side edge {new_edge!r} invalid')
        need(isinstance(new_t, (int, float)) and math.isfinite(new_t) and 0 <= new_t <= 1, f'canonical {sr}: APL-side fraction invalid')
        need(isinstance(new_r, (int, float)) and math.isfinite(new_r) and new_r >= 0, f'canonical {sr}: APL-side residual invalid')
        records.append({'sourceRow': sr, 'aplRoot': apl_roots[k], 'direction': record['direction'],
                        'fromSkeletonEdge': int(edge[i]), 'fromFraction': float(frac[i]),
                        'toSkeletonEdge': new_edge, 'toFraction': float(new_t), 'toResidualNm': float(new_r)})
        edge[i], frac[i], resid[i] = new_edge, float(new_t), float(new_r)
        replaced[i] = True
    return records


def compile_package(out, inputs, geometry, limits, observe=observe_process):
    need(geometry in GEOMETRIES, f'unknown geometry {geometry!r}')
    out = Path(out)
    if out.exists():
        raise FileExistsError(f'refusing existing output directory: {out}')
    started, cpu_started, started_at, resources = time.monotonic(), time.process_time(), utc_now(), []

    def guard(measure=False):
        need(time.monotonic() - started <= limits['wallSeconds'], 'wall-clock guard exceeded')
        if measure:
            rss, free = observe()
            need(rss is not None and rss <= limits['rssMiB'] and free >= limits['freeMiB'],
                 f'memory guard: rss={rss} MiB, free={free} MiB')
            resources.append({'rssMiB': rss, 'freeMiB': free})

    def tick():
        guard()
        while (time.process_time() - cpu_started) / limits['cpuDuty'] > time.monotonic() - started:
            time.sleep(0.05)
            guard()

    files = {'graph': inputs['graph'], 'annotations': inputs['annotations'], 'projections': inputs['projections'],
             'attachmentManifest': inputs['attachmentManifest'], 'attachmentResult': inputs['attachmentResult'],
             **{f"skeleton:{spec['root']}": spec['skeleton'] for spec in inputs['apls']}}
    pins = {key: sha(path) for key, path in files.items()}
    for key, digest in inputs['pins'].items():
        need(pins.get(key) == digest, f'pinned identity mismatch: {key}')

    out.mkdir(parents=True)
    manifest = {'schema': MANIFEST_SCHEMA, 'status': 'running', 'volume': VOLUME, 'chapter': CHAPTER, 'geometry': geometry,
                'pid': os.getpid(), 'argv': sys.argv, 'startedAt': started_at, 'pins': pins, 'limits': limits,
                'dependencies': dependencies(), 'graphPasses': 0, 'learnerUpdates': 0}
    write_json(out / 'manifest.json', manifest)
    try:
        attachment = json.loads(inputs['attachmentManifest'].read_text(encoding='utf-8'))
        need(attachment.get('status') == 'complete', 'attachment manifest is not complete')
        need(attachment.get('projectionsSha256') == pins['projections'], 'projections differ from the attachment manifest')
        need(attachment.get('resultSha256') == pins['attachmentResult'], 'result differs from the attachment manifest')
        skeletons = [Skeleton.read(spec['skeleton']) for spec in inputs['apls']]
        apl_roots = [spec['root'] for spec in inputs['apls']]
        edge_counts = [len(sk.e) for sk in skeletons]
        graph = load_graph(inputs['graph'], inputs['annotations'], inputs['apls'], inputs['expectedPairs'])
        pairs = graph['pairs']
        total = int(pairs['syn'].sum())
        need(inputs['expectedContacts'] is None or total == inputs['expectedContacts'],
             f"contacts {total} differ from expected {inputs['expectedContacts']}")
        guard(True)
        source, pair, edge, frac, resid = read_projections(inputs['projections'], graph, apl_roots, edge_counts, total, tick)
        counts = np.bincount(pair, minlength=len(pairs['syn']))
        mismatch = np.flatnonzero(counts != pairs['syn'])
        if mismatch.size:
            j = int(mismatch[0])
            raise CompileError(f"contact count mismatch {graph['names'][int(pairs['pre'][j])]}->{graph['names'][int(pairs['post'][j])]}: "
                               f'rows {int(counts[j])}, graph syn_count {int(pairs["syn"][j])}')
        guard(True)
        mid_edge, mid_frac = edge.copy(), frac.copy()
        replaced = np.zeros(total, dtype=bool)
        records_path = out / 'records.jsonl.partial'
        with records_path.open('w', encoding='utf-8', newline='\n') as stream:
            for j in range(len(pairs['syn'])):
                emit(stream, {'kind': 'pair', 'apl': apl_roots[int(pairs['apl'][j])], 'direction': 'output' if pairs['output'][j] else 'input',
                              'preRoot': graph['names'][int(pairs['pre'][j])], 'postRoot': graph['names'][int(pairs['post'][j])],
                              'graphEdge': int(pairs['edge'][j]), 'synCount': int(pairs['syn'][j]), 'contacts': int(counts[j])})
            if geometry == 'canonical-stress':
                sample = json.loads(inputs['attachmentResult'].read_text(encoding='utf-8'))['canonicalSample']
                for record in apply_canonical(sample, graph, apl_roots, edge_counts, source, pair, edge, frac, resid,
                                              replaced, inputs['expectedCanonical']):
                    emit(stream, {'kind': 'canonical-replacement', **record})
            order = np.argsort(source, kind='stable')
            row_apl = pairs['apl'][pair]
            site = np.full(total, -1, dtype=np.int64)
            arrays, apl_summaries = {'kc_indices': graph['kc'].astype(np.int32)}, []
            for k, sk in enumerate(skeletons):
                rows = order[row_apl[order] == k]
                tree = build_tree(sk.v, sk.e, edge[rows], frac[rows])
                site[rows] = tree['site']
                output = pairs['output'][pair[rows]]
                ins, outs = rows[~output], rows[output]
                prefix = f'a{k}_'
                arrays[prefix + 'parent'] = tree['parent']
                arrays[prefix + 'lengthNm'] = tree['lengthNm']
                for kind, part, kc_side in (('input', ins, pairs['pre']), ('output', outs, pairs['post'])):
                    j = pair[part]
                    arrays[f'{prefix}{kind}Site'] = site[part].astype(np.int32)
                    arrays[f'{prefix}{kind}KC'] = kc_side[j].astype(np.int32)
                    arrays[f'{prefix}{kind}Edge'] = pairs['edge'][j].astype(np.int32)
                item = {'slot': k, 'index': graph['apl_nodes'][k], 'rootId': apl_roots[k], 'side': inputs['apls'][k]['side'], 'nodes': tree['nodes'],
                        'subdivisionSites': tree['subdivisionSites'], 'inputs': len(ins), 'outputs': len(outs),
                        'skeletonLengthSumNm': tree['skeletonLengthSumNm'], 'treeLengthSumNm': tree['treeLengthSumNm'],
                        'float32MaxAbsErrorNm': float(np.abs(tree['lengthNm'].astype(np.float64) - tree['length64']).max(initial=0.0))}
                apl_summaries.append(item)
                emit(stream, {'kind': 'apl-tree', **item})
                tick()
        need(bool((site >= 0).all()), 'a contact has no tree site')
        guard(True)
        after = {key: sha(path) for key, path in files.items()}
        need(after == pins, 'an input changed during compilation')
        records_path = publish(records_path)

        sites_path = publish(_write_npz(out / 'sites.npz.partial', arrays))
        map_partial = out / 'source-row-map.csv.partial'
        with map_partial.open('w', newline='', encoding='utf-8') as stream:
            writer = csv.writer(stream)
            writer.writerow(MAP_HEADER)
            for i in order.tolist():
                j = int(pair[i])
                k = int(pairs['apl'][j])
                output = bool(pairs['output'][j])
                writer.writerow([int(source[i]), apl_roots[k], k, 'output' if output else 'input',
                                 graph['names'][int(pairs['pre'][j])], graph['names'][int(pairs['post'][j])],
                                 int(pairs['edge'][j]), int(pairs['post'][j] if output else pairs['pre'][j]),
                                 int(edge[i]), float(frac[i]), float(resid[i]), int(site[i]),
                                 int(mid_edge[i]), float(mid_frac[i]), 'canonical-sample' if replaced[i] else 'midpoint'])
        map_path = publish(map_partial)

        elapsed = time.monotonic() - started
        output_mask = pairs['output'][pair]
        cardinalities = {'contacts': total, 'retainedPairs': len(pairs['syn']), 'retainedKc': len(graph['kc']),
                         'inputs': int((~output_mask).sum()), 'outputs': int(output_mask.sum()),
                         'subdivisionSites': sum(item['subdivisionSites'] for item in apl_summaries),
                         'treeNodes': sum(item['nodes'] for item in apl_summaries), 'canonicalReplaced': int(replaced.sum())}
        summary = {'schema': MANIFEST_SCHEMA, 'status': 'complete', 'volume': VOLUME, 'chapter': CHAPTER, 'geometry': geometry,
                   'scope': SCOPE, 'geometryCoverage': {'implemented': [geometry], 'notImplemented': NOT_IMPLEMENTED},
                   'units': 'nm', 'cardinalities': cardinalities, 'apls': apl_summaries, 'pins': pins,
                   'dependencies': dependencies(), 'provenance': PROVENANCE, 'resources': resources,
                   'elapsedSeconds': elapsed, 'cpuSeconds': time.process_time() - cpu_started, 'graphPasses': 0, 'learnerUpdates': 0,
                   'sitesSha256': sha(sites_path), 'sourceRowMapSha256': sha(map_path), 'recordsSha256': sha(records_path)}
        write_json(out / 'summary.json', summary)
        package = {'schema': SCHEMA, 'status': 'complete', 'volume': VOLUME, 'chapter': CHAPTER, 'geometry': geometry, 'units': 'nm',
                   'lengthEncoding': 'float64 subdivision arithmetic, stored as float32 (relative error <= 2**-24 per entry)',
                   'scope': SCOPE, 'geometryCoverage': summary['geometryCoverage'], 'pins': pins,
                   'sitesFile': 'sites.npz', 'sitesSha256': summary['sitesSha256'],
                   'sourceRowMap': {'file': 'source-row-map.csv', 'sha256': summary['sourceRowMapSha256'], 'rows': total},
                   'kcIndicesArray': 'kc_indices', 'kcIndices': len(graph['kc']), 'cardinalities': cardinalities,
                   'apls': [{'slot': k, 'index': graph['apl_nodes'][k], 'rootId': apl_roots[k], 'side': spec['side'], 'nodes': item['nodes'],
                             'inputs': item['inputs'], 'outputs': item['outputs'],
                             'arrays': {key: f'a{k}_{key}' for key in KEYS}}
                            for k, (spec, item) in enumerate(zip(inputs['apls'], apl_summaries))]}
        write_json(out / 'package.json', package)
        write_json(out / 'manifest.json', {**manifest, 'status': 'complete', 'endedAt': utc_now(), 'elapsedSeconds': elapsed,
                                           'packageSha256': sha(out / 'package.json'), 'summarySha256': sha(out / 'summary.json')})
        return summary
    except BaseException as exc:
        write_json(out / 'manifest.json', {**manifest, 'status': 'failed', 'endedAt': utc_now(), 'error': str(exc)})
        raise


def _write_npz(path, arrays):
    with path.open('wb') as stream:
        np.savez(stream, **arrays)
    return path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--geometry', choices=GEOMETRIES, default='midpoint')
    parser.add_argument('--cpu-duty', type=float, default=1.0)
    parser.add_argument('--wall-seconds', type=float, default=3600.0)
    parser.add_argument('--rss-mib', type=float, default=2048.0)
    parser.add_argument('--free-mib', type=float, default=256.0)
    args = parser.parse_args(argv)
    out = args.out.resolve()
    need(out.is_relative_to(ROOT), 'output must be inside the repository')
    need(0 < args.cpu_duty <= 1 and args.wall_seconds > 0, 'cpu duty must be in (0,1] and wall seconds positive')
    limits = {'wallSeconds': args.wall_seconds, 'rssMiB': args.rss_mib, 'freeMiB': args.free_mib, 'cpuDuty': args.cpu_duty}
    summary = compile_package(out, PRODUCTION, args.geometry, limits)
    print(json.dumps({'status': summary['status'], 'geometry': summary['geometry'], 'out': str(out),
                      'cardinalities': summary['cardinalities'], 'elapsedSeconds': summary['elapsedSeconds']}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

"""Independent brute-force sample attachment and tree-path arithmetic audit."""
import argparse
import csv
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import struct
import time

import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import curriculum

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / 'runs/memory-retention-2026-11-01/apl-contact-attachment-v1'
REPORT = ROOT / 'research/reports/apl-locality-feasibility-2026-11-01'


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    assert not args.out.exists()
    started, cpu = time.monotonic(), time.process_time()
    resources = []

    def guard():
        assert time.monotonic() - started < 180, 'Elapsed guard'
        inventory = curriculum.inventory()
        own = next(p for p in inventory['processes'] if p['pid'] == os.getpid())
        assert own['workingSetMiB'] <= 2048 and inventory['freeMiB'] >= 256
        resources.append({'rssMiB': own['workingSetMiB'], 'freeMiB': inventory['freeMiB']})

    manifest = json.loads((RUN / 'manifest.json').read_text())
    result = json.loads((RUN / 'result.json').read_text())
    assert manifest['status'] == result['status'] == 'complete'
    pins = {ROOT / p: h for p, h in manifest['pins'].items()}
    pins.update({RUN / 'result.json': manifest['resultSha256'], RUN / 'projections.csv': manifest['projectionsSha256']})
    for path, expected in pins.items():
        assert digest(path) == expected, str(path)
    guard()
    trees = {}
    for root, side in [('720575940613583001', 'right'), ('720575940624547622', 'left')]:
        raw = (REPORT / f'source-evidence/apl-{side}-{root}.precomputed').read_bytes()
        n, m = struct.unpack_from('<II', raw)
        assert len(raw) == 8 + 16 * n + 8 * m and m == n - 1
        vertices = np.frombuffer(raw, '<f4', 3 * n, 8).reshape(n, 3).astype(float)
        edges = np.frombuffer(raw, '<u4', 2 * m, 8 + 12 * n).reshape(m, 2)
        start = vertices[edges[:, 0]]
        delta = vertices[edges[:, 1]] - start
        lengths = np.linalg.norm(delta, axis=1)
        adjacency = [[] for _ in range(n)]
        for (a, b), length in zip(edges, lengths):
            adjacency[a].append((int(b), float(length)))
            adjacency[b].append((int(a), float(length)))
        parent, depth = {0: None}, {0: 0.0}
        stack = [0]
        while stack:
            a = stack.pop()
            for b, length in adjacency[a]:
                if b == parent[a]:
                    continue
                assert b not in parent, 'Cycle'
                parent[b], depth[b] = a, depth[a] + length
                stack.append(b)
        assert len(parent) == n
        trees[root] = (start, delta, lengths, edges, parent, depth)
        guard()
    points = json.loads((ROOT / 'runs/memory-retention-2026-11-01/apl-point-semantics-v1/result.json').read_text())
    canonical = {r['synapseId']: r for r in points['records']}
    checked = []
    for index, row in enumerate(result['canonicalSample']):
        start, delta, lengths, edges, parent, depth = trees[row['aplRoot']]
        source = canonical[row['synapseId']]
        pre, post = (np.array(source['canonicalPointsNm'][k]) for k in ['pre', 'post'])
        projections = []
        for point, stored in [((pre + post) / 2, row['midpointProjection']),
                              (pre if row['direction'] == 'APL-to-KC' else post, row['aplSideProjection'])]:
            den = lengths ** 2
            fraction = np.clip(np.divide(np.einsum('ij,ij->i', point - start, delta), den,
                                        out=np.zeros(len(den)), where=den > 0), 0, 1)
            distances = np.linalg.norm(point - start - fraction[:, None] * delta, axis=1)
            best = int(np.argmin(distances))
            assert math.isclose(distances[best], stored[2], abs_tol=1e-6)
            # Equal residuals can tie at a shared vertex; compare projected coordinates.
            assert np.linalg.norm(start[best] + fraction[best] * delta[best] -
                                  (start[stored[0]] + stored[1] * delta[stored[0]])) < 1e-5
            projections.append((best, float(fraction[best])))

        def distance(a, b):
            ancestors = set()
            u = a
            while u is not None:
                ancestors.add(u)
                u = parent[u]
            u = b
            while u not in ancestors:
                u = parent[u]
            return depth[a] + depth[b] - 2 * depth[u]

        (e, t), (f, u) = projections
        path = abs(t - u) * lengths[e] if e == f else min(
            x + y + distance(int(a), int(b))
            for a, x in zip(edges[e], [t * lengths[e], (1 - t) * lengths[e]])
            for b, y in zip(edges[f], [u * lengths[f], (1 - u) * lengths[f]]))
        assert math.isclose(path, row['cablePathDifferenceNm'], abs_tol=1e-6)
        checked.append({'synapseId': row['synapseId'], 'sourceRow': row['sourceRow'], 'pathNm': float(path)})
        if index % 8 == 0:
            delay = (time.process_time() - cpu) / .5 - (time.monotonic() - started)
            if delay > 0:
                time.sleep(min(delay, 5))
            guard()
    residuals = {root: [] for root in trees}
    with (RUN / 'projections.csv').open(newline='') as stream:
        for row in csv.DictReader(stream):
            residuals[row['apl_root']].append(float(row['residual_nm']))
    for root, values in residuals.items():
        expected = result['residualsByApl'][root]
        assert len(values) == expected['count']
        for label, value in [('min', min(values)), ('median', np.median(values)),
                             ('p95', np.quantile(values, .95)), ('p99', np.quantile(values, .99)), ('max', max(values))]:
            assert math.isclose(value, expected[label], abs_tol=1e-6)
        assert expected['atMostNm'] == {str(r): sum(v <= r for v in values) for r in [100, 250, 500, 1000, 5000]}
    for path, expected in pins.items():
        assert digest(path) == expected, str(path)
    guard()
    output = {'status': 'passed', 'scope': '252 brute-force projections, 126 independent tree paths; all CSV residual summaries; no full projection recomputation or biological validation',
              'checked': checked, 'pins': {p.relative_to(ROOT).as_posix(): h for p, h in pins.items()},
              'auditorSha256': digest(Path(__file__)), 'elapsedSeconds': time.monotonic() - started,
              'resources': resources, 'graphPasses': 0, 'learnerUpdates': 0}
    temporary = args.out.with_suffix('.partial')
    temporary.write_text(json.dumps(output, indent=2) + '\n')
    temporary.replace(args.out)
    print(json.dumps({k: output[k] for k in ['status', 'scope', 'elapsedSeconds']}))


if __name__ == '__main__':
    main()

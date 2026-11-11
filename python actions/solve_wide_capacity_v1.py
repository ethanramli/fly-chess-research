"""Exact-capacity gate for revision 4 (journal item 27): surrogate solve for the widened mask. Oracle, not learning.

Linear surrogate: score_m(x) = s_m - k_m * sum_e v_e * base_e * r_{e,m} * x_e, x_e = 1 - g_e in [-0.8, 0.8], where v_e =
valence(type of the edge's MBON cell) / cells of that type, and k_m is fitted per move from the all-gains-0.9 scores.
Candidate gains come from solve() in solve_oracle_lp_v1.py; the exact network verifies them (probe-wide-capacity-v1 verify).
Usage (repo root): python "python actions/solve_wide_capacity_v1.py" DUMP.json OUT_GAINS.json
"""
import csv
import json
import sys

import numpy as np

sys.path.insert(0, 'python actions')
from solve_oracle_lp_v1 import solve  # noqa: E402

VALENCE = {'MBON11': 1, 'MBON12': 1, 'MBON02': 1, 'MBON05': -1, 'MBON01': -1, 'MBON15': -1}


def main(dump_path, out_path):
    D = json.load(open(dump_path, encoding='utf-8'))
    g = np.load('.cache/full.npz')
    indptr, roots = g['csr_indptr'], g['root_ids']
    edges = np.array(D['maskEdges'])
    post = np.searchsorted(indptr, edges, side='right') - 1  # row = postsynaptic cell
    index = {int(r): i for i, r in enumerate(roots)}
    typ = {}
    with open('.cache/flywire-annotations-v2.1.0.tsv', encoding='utf-8') as f:
        for rec in csv.DictReader(f, delimiter='\t'):
            i = index.get(int(rec['root_id']))
            if i is not None and rec['hemibrain_type'] in VALENCE:
                typ[i] = rec['hemibrain_type']
    cells = D['cellsPerType']
    v = np.array([VALENCE[typ[p]] / cells[typ[p]] for p in post])
    s, s09 = np.array(D['scores']), np.array(D['scores09'])
    base, R = np.array(D['base']), np.array(D['rates'])
    drive = R @ (v * base)
    k = np.where(np.abs(drive) > 0, (s09 - s) / (-0.1 * np.where(np.abs(drive) > 0, drive, 1)), 0.0)
    A = -k[:, None] * (v * base)[None, :] * R  # d score_m / d x_e
    moves = D['moves']
    safe = [m for m, u in enumerate(moves) if D['outcomes'][u]]
    fail = [m for m, u in enumerate(moves) if not D['outcomes'][u]]
    results = []
    for i in safe:
        upper, lower, x = solve(s[i] - s[fail], A[i][None, :] - A[fail], iters=6000)
        results.append({'safe': moves[i], 'upperBound': float(upper), 'lowerBound': float(lower), 'x': x})
    best = max(results, key=lambda r: r['lowerBound'])
    gains = np.clip(1 - best['x'], 0.2, 1.8).tolist()
    json.dump({'schema': 'wide-capacity-gains-v1', 'note': 'oracle construction, not learning', 'board': D['boardId'],
               'safe': best['safe'], 'predictedMargin': best['lowerBound'], 'gains': gains,
               'perSafe': [{a: b for a, b in r.items() if a != 'x'} for r in results], 'k': k.tolist()},
              open(out_path, 'w', encoding='utf-8'), indent=1)
    for r in results:
        print(f"{D['boardId']} safe={r['safe']} surrogate upper={r['upperBound']:.3e} best found={r['lowerBound']:.3e}")


if __name__ == '__main__':
    main(*sys.argv[1:3])

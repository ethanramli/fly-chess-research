"""Feasibility screen for a widened (incentive-circuit) plastic mask (journal item 26). Oracle question, not learning.

Mask: every positive-sign KC->MBON edge onto the six incentive-circuit MBON types (Gkanias et al. 2022, Table 1;
types from the pinned FBbt ontology). Readout proxy: score(move) = sum over MBON cells of valence * mean-normalised
KC drive, drive = sum_e base_e * g_e * r_kc(move). Attraction +1 (MBON11, MBON12, MBON02), avoidance -1 (MBON05, MBON01, MBON15).
base_e = 0.9 * log1p(initial_e) / sum_row log1p(initial) (SparseTrainer row normalisation, recurrentScale 0.9).
Non-KC inputs and network dynamics are ignored: this is a necessary-capacity screen, not an exact test.
For each board: max over g in [0.2, 1.8] of min over failing moves of score(best safe) - score(fail).
Usage: python incentive_mask_screen_v1.py ALL_KC.json
"""
import csv
import json
import sys

import numpy as np

from solve_oracle_lp_v1 import solve

VALENCE = {'MBON11': 1, 'MBON12': 1, 'MBON02': 1, 'MBON05': -1, 'MBON01': -1, 'MBON15': -1}


def main(path):
    g = np.load('.cache/full.npz')
    row, col, sign, initial, roots = g['csr_indptr'], g['csr_indices'], g['sign'], g['syn_count'], g['root_ids']  # row = postsynaptic (graph.mjs loadGraph)
    index = {int(r): i for i, r in enumerate(roots)}
    kc_order, types = [], {}
    with open('.cache/flywire-annotations-v2.1.0.tsv', encoding='utf-8') as f:
        for rec in csv.DictReader(f, delimiter='\t'):
            i = index.get(int(rec['root_id']))
            if i is None:
                continue
            if rec['cell_class'] == 'Kenyon_Cell':
                kc_order.append(i)
            if rec['hemibrain_type'] in VALENCE:
                types[i] = rec['hemibrain_type']
    kc_pos = {k: p for p, k in enumerate(kc_order)}
    lw = np.log1p(initial.astype(np.float64))
    # per mask edge: (kc position, valence * base / cells of that type)
    count = {t: sum(1 for v in types.values() if v == t) for t in VALENCE}
    edges = []
    for j, t in types.items():
        denom = lw[row[j]:row[j + 1]].sum()
        for e in range(row[j], row[j + 1]):
            if sign[e] == 1 and col[e] in kc_pos:
                edges.append((kc_pos[col[e]], VALENCE[t] * 0.9 * lw[e] / denom / count[t]))
    P = np.array([p for p, _ in edges]); W = np.array([w for _, w in edges])
    print(json.dumps({'mbonCells': count, 'maskEdges': len(edges)}))
    D = json.load(open(path, encoding='utf-8'))
    for d in D['dumps']:
        R = np.array(d['allKc'])[:, P] * W[None, :]  # per move, per mask edge: valence-weighted drive at gain 1
        s0 = R.sum(axis=1)
        safe = [m for m, u in enumerate(d['moves']) if d['outcomes'][u]]
        fail = [m for m, u in enumerate(d['moves']) if not d['outcomes'][u]]
        best = (-np.inf, None, None)
        for i in safe:
            dvec = s0[i] - s0[fail]
            C = -(R[i][None, :] - R[fail])  # x = 1 - g; score change = -sum R x
            upper, lower, _ = solve(dvec, C, iters=4000)
            if lower > best[0]:
                best = (lower, upper, d['moves'][i])
        scale = np.abs(s0).max() or 1.0
        print(json.dumps({'theta': d['theta'], 'board': d['boardId'], 'bestMarginRel': best[0] / scale, 'upperRel': best[1] / scale, 'safe': best[2]}))


if __name__ == '__main__':
    main(sys.argv[1])

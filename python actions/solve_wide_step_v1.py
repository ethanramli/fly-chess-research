"""Sequential trust-region step for the widened-mask capacity question (journal item 29). Oracle, not learning.

Around current gains g0: score_m(g0 + y) ~= s_m + sum_e A[m,e] y_e, A[m,e] = kappa_m v_e base_e r_{e,m},
kappa_m fitted from scores at 0.9 * g0. Box: max(0.2 - g0, -delta) <= y <= min(1.8 - g0, delta).
max_y min_j (d_j + c_j . y) = min over lambda in the simplex of lambda.d + sum_e max(l_e w_e, u_e w_e), w = sum_j lambda_j c_j.
Usage (repo root): python "python actions/solve_wide_step_v1.py" DUMP.json OUT_GAINS.json [delta]
"""
import csv
import json
import sys

import numpy as np

VALENCE = {'MBON11': 1, 'MBON12': 1, 'MBON02': 1, 'MBON05': -1, 'MBON01': -1, 'MBON15': -1}


def solve_box(d, C, lo, hi, iters=6000):
    lam = np.full(len(d), 1.0 / len(d))
    best = (-np.inf, None)
    for t in range(1, iters + 1):
        w = lam @ C
        y = np.where(w > 0, hi, lo)
        margins = d + C @ y
        if margins.min() > best[0]:
            best = (margins.min(), y)
        lam = lam * np.exp(-margins / (np.abs(margins).max() + 1e-30) / np.sqrt(t))
        lam /= lam.sum()
    return best


def main(dump_path, out_path, delta=0.2):
    D = json.load(open(dump_path, encoding='utf-8'))
    g = np.load('.cache/full.npz')
    edges = np.array(D['maskEdges'])
    post = np.searchsorted(g['csr_indptr'], edges, side='right') - 1
    index = {int(r): i for i, r in enumerate(g['root_ids'])}
    typ = {}
    with open('.cache/flywire-annotations-v2.1.0.tsv', encoding='utf-8') as f:
        for rec in csv.DictReader(f, delimiter='\t'):
            i = index.get(int(rec['root_id']))
            if i is not None and rec['hemibrain_type'] in VALENCE:
                typ[i] = rec['hemibrain_type']
    v = np.array([VALENCE[typ[p]] / D['cellsPerType'][typ[p]] for p in post])
    g0 = np.array(D['gains0'], dtype=float)
    s, s09, base, R = np.array(D['scores']), np.array(D['scores09']), np.array(D['base']), np.array(D['rates'])
    drive = R @ (v * base * g0)
    kappa = np.where(np.abs(drive) > 0, (s09 - s) / (-0.1 * np.where(np.abs(drive) > 0, drive, 1)), 0.0)
    A = kappa[:, None] * (v * base)[None, :] * R
    lo, hi = np.maximum(0.2 - g0, -delta), np.minimum(1.8 - g0, delta)
    moves = D['moves']
    safe = [m for m, u in enumerate(moves) if D['outcomes'][u]]
    fail = [m for m, u in enumerate(moves) if not D['outcomes'][u]]
    best = (-np.inf, None, None)
    for i in safe:
        val, y = solve_box(s[i] - s[fail], A[i][None, :] - A[fail], lo, hi)
        if val > best[0]:
            best = (val, y, moves[i])
    gains = np.clip(g0 + best[1], 0.2, 1.8).tolist()
    json.dump({'schema': 'wide-step-gains-v1', 'note': 'oracle construction, not learning', 'board': D['boardId'],
               'safe': best[2], 'predictedMargin': float(best[0]), 'delta': delta, 'gains': gains},
              open(out_path, 'w', encoding='utf-8'))
    print(f"{D['boardId']} step: safe={best[2]} predicted margin={best[0]:.3e}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], *(float(x) for x in sys.argv[3:4]))

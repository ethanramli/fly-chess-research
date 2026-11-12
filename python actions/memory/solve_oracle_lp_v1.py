"""Multi-rival oracle bound for fly connections memory v1 (journal item 24). Oracle construction, not learning.

Linearized model from probe-oracle-lp-v1 dump: with x_e = 1 - g_e in [-0.8, 0.8] (gains in [0.2, 1.8]),
score_m(x) ~= s_m + k_m * sum_e base_e * r_{e,m} * x_e, with k_m fitted from the all-gains-0.9 ranking.
For each safe move i: V_i = max_x min_j (d_j + c_j . x) over failing moves j, d_j = s_i - s_j, c_j = k_i b r_i - k_j b r_j.
Minimax duality on the symmetric box: V_i = min over lambda in the simplex of lambda.d + 0.8 * |sum_j lambda_j c_j|_1.
Any lambda gives an upper bound (certified for the linear model); x = 0.8 * sign(sum lambda c) gives a lower bound.
Usage: python solve_oracle_lp_v1.py DUMP.json OUT_GAINS.json
"""
import json
import sys

import numpy as np


def solve(d, C, iters=20000):
    J = len(d)
    lam = np.full(J, 1.0 / J)
    best_upper, best_x, best_lower = np.inf, None, -np.inf
    for t in range(1, iters + 1):
        v = lam @ C
        upper = lam @ d + 0.8 * np.abs(v).sum()
        x = 0.8 * np.sign(v)
        margins = d + C @ x
        lower = margins.min()
        best_upper = min(best_upper, upper)
        if lower > best_lower:
            best_lower, best_x = lower, x
        grad = d + C @ x  # supergradient of the dual objective in lambda (x is its maximizer)
        step = 1.0 / np.sqrt(t) / (np.abs(grad).max() + 1e-30)
        lam = lam * np.exp(-step * grad)
        lam /= lam.sum()
    return best_upper, best_lower, best_x


def main(dump_path, out_path):
    D = json.load(open(dump_path, encoding='utf-8'))
    moves, s, s09 = D['moves'], np.array(D['scores']), np.array(D['scores09'])
    base, R = np.array(D['base']), np.array(D['rates'])  # R: moves x edges
    drive = R @ base
    k = np.where(drive > 0, (s09 - s) / (0.1 * np.where(drive > 0, drive, 1)), 0.0)
    A = k[:, None] * base[None, :] * R  # A[m, e] = d score_m / d x_e (linear model)
    safe = [m for m, u in enumerate(moves) if D['outcomes'][u]]
    fail = [m for m, u in enumerate(moves) if not D['outcomes'][u]]
    results = []
    for i in safe:
        d = s[i] - s[fail]
        C = A[i][None, :] - A[fail]
        upper, lower, x = solve(d, C)
        results.append({'safe': moves[i], 'upperBound': float(upper), 'lowerBound': float(lower), 'x': x})
    best = max(results, key=lambda r: r['lowerBound'])
    gains = np.clip(1 - best['x'], 0.2, 1.8).tolist()  # 1 - 0.8 rounds to 0.19999999999999996
    json.dump({'schema': 'oracle-lp-gains-v1', 'note': 'oracle construction, not learning', 'board': D['boardId'],
               'bias': D['bias'], 'safe': best['safe'], 'predictedMargin': best['lowerBound'], 'gains': gains,
               'perSafe': [{k2: v for k2, v in r.items() if k2 != 'x'} for r in results],
               'linearFit': {'k': k.tolist()}}, open(out_path, 'w', encoding='utf-8'), indent=1)
    for r in results:
        print(f"{D['boardId']} safe={r['safe']} linear upper bound={r['upperBound']:.3e} best found={r['lowerBound']:.3e}")


if __name__ == '__main__':
    main(*sys.argv[1:3])
